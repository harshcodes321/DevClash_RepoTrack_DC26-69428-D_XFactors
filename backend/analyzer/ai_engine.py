import os
import json
import asyncio
from mistralai.client import Mistral
from pathlib import Path

def get_mistral_client():
    from dotenv import load_dotenv
    load_dotenv()
    api_key = os.getenv("MISTRAL_API_KEY", "")
    if not api_key:
        return None
    return Mistral(api_key=api_key)
SUMMARY_SYSTEM_PROMPT = """You are a senior software engineer analyzing a codebase.
Given a file path and its content, write a concise 1-2 sentence explanation of what this file does.
Be specific. Focus on purpose and responsibility. Use plain English that a new developer can understand.
Respond with just the summary, no preamble."""


NL_QUERY_SYSTEM_PROMPT = """You are a codebase search assistant.
Given a list of files and a natural language query, identify the most relevant files.
Return a JSON object: {"files": ["path/to/file1", "path/to/file2"], "explanation": "brief reason"}
Only return real file paths from the provided list. Return at most 5 files."""

REPO_SUMMARY_SYSTEM_PROMPT = """You are a senior software architect.
Given the README and top-level architecture of a repository, analyze the whole repository.
You must return the summary strictly in the following numbered format:

1) Detailed overview of the project
2) Features offered and problem solved through the project
3) The tech stack that is used

Respond with just the summary and nothing else."""

async def summarize_repository(repo_path: str, parsed_files: list[dict]) -> str:
    """Generate an AI summary for the whole repository based on README and top files."""
    client = get_mistral_client()
    if not client:
        return "⚠️ MISTRAL AI is not responding. Fallback: This is a software repository."

    readme_content = ""
    for f in parsed_files:
        if f["path"].lower() == "readme.md":
            readme_content = f.get("full_content", f.get("content_preview", ""))
            break

    top_files = [f["path"] for f in parsed_files[:20]]
    
    context = f"""Repository Path: {repo_path}
Top Files: {', '.join(top_files)}

README preview:
{readme_content[:3000]}"""

    try:
        resp = await client.chat.complete_async(
            model="mistral-small-latest",
            messages=[
                {"role": "system", "content": REPO_SUMMARY_SYSTEM_PROMPT},
                {"role": "user", "content": context}
            ],
            max_tokens=300,
            temperature=0.3,
        )
        return resp.choices[0].message.content.strip()
    except Exception as e:
        return f"Could not generate repository summary: {str(e)}"



async def summarize_file(file_path: str, content: str, functions: list, classes: list, overall_summary: str = "") -> str:
    """Generate an AI summary for a single file."""
    client = get_mistral_client()
    if not client:
        return generate_fallback_summary(file_path, functions, classes)

    repo_context = f"\nOverall Repository Context:\n{overall_summary}\n" if overall_summary else ""
    context = f"""{repo_context}
File: {file_path}
Functions: {', '.join(functions[:10]) if functions else 'none'}
Classes: {', '.join(classes[:5]) if classes else 'none'}

Content preview:
{content[:1500]}"""

    try:
        resp = await client.chat.complete_async(
            model="mistral-small-latest",
            messages=[
                {"role": "system", "content": SUMMARY_SYSTEM_PROMPT},
                {"role": "user", "content": context}
            ],
            max_tokens=150,
            temperature=0.3,
        )
        return resp.choices[0].message.content.strip()
    except Exception as e:
        return generate_fallback_summary(file_path, functions, classes)


async def batch_summarize(files: list[dict], overall_summary: str = "", max_concurrent: int = 5) -> dict[str, str]:
    """Summarize multiple files concurrently."""
    summaries = {}
    semaphore = asyncio.Semaphore(max_concurrent)

    async def summarize_with_limit(f: dict):
        async with semaphore:
            summary = await summarize_file(
                f["path"],
                f.get("full_content", f.get("content_preview", "")),
                f.get("functions", []),
                f.get("classes", []),
                overall_summary
            )
            summaries[f["path"]] = summary

    # Only summarize important files or limit to top 50
    await asyncio.gather(*[summarize_with_limit(f) for f in files[:50]])
    return summaries


async def natural_language_query(query: str, file_list: list[str], file_summaries: dict) -> dict:
    """Answer a natural language query about the codebase."""
    client = get_mistral_client()
    if not client:
        return keyword_search(query, file_list)

    # Build context from summaries
    file_context = "\n".join([
        f"- {path}: {file_summaries.get(path, 'No summary')}"
        for path in file_list[:100]
    ])

    prompt = f"""Files in this repository:
{file_context}

User query: "{query}"

Which files are most relevant? Return JSON."""

    try:
        resp = await client.chat.complete_async(
            model="mistral-small-latest",
            messages=[
                {"role": "system", "content": NL_QUERY_SYSTEM_PROMPT},
                {"role": "user", "content": prompt}
            ],
            max_tokens=300,
            temperature=0.2,
            response_format={"type": "json_object"},
        )
        result = json.loads(resp.choices[0].message.content)
        return result
    except Exception:
        return keyword_search(query, file_list)


def keyword_search(query: str, file_list: list[str]) -> dict:
    """Fallback keyword-based search."""
    keywords = query.lower().split()
    scored = []
    for path in file_list:
        path_lower = path.lower()
        score = sum(1 for kw in keywords if kw in path_lower)
        if score > 0:
            scored.append((path, score))
    scored.sort(key=lambda x: x[1], reverse=True)
    return {
        "files": [p for p, _ in scored[:5]],
        "explanation": f"Files matching keywords: {', '.join(keywords)}"
    }


def generate_fallback_summary(file_path: str, functions: list, classes: list) -> str:
    """Generate a basic summary without AI."""
    name = Path(file_path).stem
    ext = Path(file_path).suffix

    parts = []
    if classes:
        parts.append(f"Defines classes: {', '.join(classes[:3])}")
    if functions:
        parts.append(f"Contains functions: {', '.join(functions[:3])}")

    lang_map = {
        ".py": "Python", ".js": "JavaScript", ".ts": "TypeScript",
        ".jsx": "React JSX", ".tsx": "React TSX"
    }
    lang = lang_map.get(ext, "source")

    base = ""
    if parts:
        base = f"{lang} module '{name}'. {'. '.join(parts)}."
    else:
        base = f"{lang} module '{name}' — provides core functionality."
        
    return f"⚠️ MISTRAL AI is not responding (Check your API key in .env). ⚠️\n\nFallback Analysis:\n{base}"
