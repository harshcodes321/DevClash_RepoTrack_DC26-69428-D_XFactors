import asyncio
import os
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from analyzer import (
    init_db, create_analysis, update_status, save_graph, save_summaries,
    get_analysis, get_all_analyses, clone_repo, scan_repository, get_file_tree,
    build_graph, batch_summarize, natural_language_query,
    summarize_repository, save_overall_summary
)
from analyzer.cloner import repo_id_from_url

load_dotenv()

# ─── Lifespan ────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield

app = FastAPI(title="Repo Architecture Navigator API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Models ───────────────────────────────────────────────────────────────────

class AnalyzeRequest(BaseModel):
    url: str

class SearchRequest(BaseModel):
    repo_id: str
    query: str

# ─── Background Task ─────────────────────────────────────────────────────────

async def run_analysis(repo_id: str, url: str):
    """Full analysis pipeline — runs in background."""
    try:
        # 1. Clone
        await update_status(repo_id, "cloning")
        _, repo_path = clone_repo(url)

        # 2. Parse
        await update_status(repo_id, "parsing")
        parsed_files = scan_repository(repo_path)

        if not parsed_files:
            await update_status(repo_id, "error", "No supported source files found.")
            return

        # 3. Build graph & fetch file tree
        await update_status(repo_id, "building_graph")
        graph_data = build_graph(parsed_files)
        
        file_tree = get_file_tree(repo_path)
        graph_data["file_tree"] = file_tree
        
        await save_graph(repo_id, graph_data)

        # 4. AI overall summary
        overall_summary = ""
        try:
            await update_status(repo_id, "summarizing_repo")
            overall_summary = await summarize_repository(repo_path, parsed_files)
            await save_overall_summary(repo_id, overall_summary)
        except Exception as e:
            print(f"Overall summary failed: {e}")

        # 5. AI file summaries
        await update_status(repo_id, "summarizing")
        # Prioritize high-impact files for summarization
        high_impact_ids = set(graph_data.get("high_impact", []))
        priority_files = [f for f in parsed_files if f["path"] in high_impact_ids]
        other_files = [f for f in parsed_files if f["path"] not in high_impact_ids]
        ordered_files = priority_files + other_files

        summaries = await batch_summarize(ordered_files, overall_summary, max_concurrent=5)
        await save_summaries(repo_id, summaries)

    except Exception as e:
        await update_status(repo_id, "error", str(e))


# ─── Routes ───────────────────────────────────────────────────────────────────

@app.get("/")
async def root():
    return {"message": "Repo Architecture Navigator API", "status": "running"}


@app.post("/api/analyze")
async def analyze_repo(req: AnalyzeRequest, background_tasks: BackgroundTasks):
    """Accept a GitHub URL and start analysis in background."""
    url = req.url.strip().rstrip("/")

    # Normalize URL
    if not url.startswith("http"):
        raise HTTPException(status_code=400, detail="Invalid URL")

    repo_id = repo_id_from_url(url)

    # Check if already analyzed
    existing = await get_analysis(repo_id)
    if existing and existing["status"] == "complete":
        return {"repo_id": repo_id, "status": "complete", "cached": True}

    # Start fresh analysis
    await create_analysis(repo_id, url)
    background_tasks.add_task(run_analysis, repo_id, url)

    return {"repo_id": repo_id, "status": "started"}


@app.get("/api/status/{repo_id}")
async def get_status(repo_id: str):
    """Poll analysis status."""
    analysis = await get_analysis(repo_id)
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return {
        "repo_id": repo_id,
        "status": analysis["status"],
        "error": analysis.get("error"),
    }


@app.get("/api/graph/{repo_id}")
async def get_graph(repo_id: str):
    """Return the full graph data + summaries."""
    analysis = await get_analysis(repo_id)
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")

    if analysis["status"] not in ("complete", "graph_ready", "summarizing"):
        raise HTTPException(status_code=202, detail=f"Analysis in progress: {analysis['status']}")

    graph_data = analysis.get("graph_data", {})
    summaries = analysis.get("summaries", {})

    # Merge summaries into nodes
    nodes = graph_data.get("nodes", [])
    for node in nodes:
        node["summary"] = summaries.get(node["id"], "")

    return {
        **graph_data,
        "nodes": nodes,
        "overall_summary": analysis.get("overall_summary", ""),
        "status": analysis["status"],
    }


@app.get("/api/file/{repo_id}")
async def get_file_details(repo_id: str, path: str):
    """Get details for a specific file."""
    analysis = await get_analysis(repo_id)
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")

    graph_data = analysis.get("graph_data", {})
    summaries = analysis.get("summaries", {})
    nodes = graph_data.get("nodes", [])

    node = next((n for n in nodes if n["id"] == path), None)
    if not node:
        raise HTTPException(status_code=404, detail="File not found")

    node["summary"] = summaries.get(path, "")
    return node


@app.post("/api/search")
async def search_codebase(req: SearchRequest):
    """Natural language search across the codebase."""
    analysis = await get_analysis(req.repo_id)
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")

    graph_data = analysis.get("graph_data", {})
    summaries = analysis.get("summaries", {})
    file_list = [n["id"] for n in graph_data.get("nodes", [])]

    result = await natural_language_query(req.query, file_list, summaries)
    return result


@app.get("/api/history")
async def get_history():
    """List all previously analyzed repos."""
    return await get_all_analyses()


@app.delete("/api/analysis/{repo_id}")
async def delete_analysis(repo_id: str):
    """Remove a cached analysis."""
    from analyzer.cloner import cleanup_repo
    cleanup_repo(repo_id)
    return {"deleted": repo_id}
