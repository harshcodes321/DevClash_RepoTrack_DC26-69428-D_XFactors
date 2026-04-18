import json
import aiosqlite
from pathlib import Path

DB_PATH = Path(__file__).parent.parent / "navigator.db"


async def init_db():
    """Initialize the SQLite database."""
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS analyses (
                repo_id TEXT PRIMARY KEY,
                url TEXT NOT NULL,
                status TEXT DEFAULT 'pending',
                graph_data TEXT,
                summaries TEXT,
                overall_summary TEXT,
                error TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        try:
            await db.execute("ALTER TABLE analyses ADD COLUMN overall_summary TEXT")
        except:
            pass # Column already exists
        await db.commit()


async def create_analysis(repo_id: str, url: str):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "INSERT OR REPLACE INTO analyses (repo_id, url, status) VALUES (?, ?, 'cloning')",
            (repo_id, url)
        )
        await db.commit()


async def update_status(repo_id: str, status: str, error: str = None):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "UPDATE analyses SET status=?, error=?, updated_at=CURRENT_TIMESTAMP WHERE repo_id=?",
            (status, error, repo_id)
        )
        await db.commit()


async def save_graph(repo_id: str, graph_data: dict):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "UPDATE analyses SET graph_data=?, status='graph_ready', updated_at=CURRENT_TIMESTAMP WHERE repo_id=?",
            (json.dumps(graph_data), repo_id)
        )
        await db.commit()


async def save_overall_summary(repo_id: str, summary: str):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "UPDATE analyses SET overall_summary=?, updated_at=CURRENT_TIMESTAMP WHERE repo_id=?",
            (summary, repo_id)
        )
        await db.commit()

async def save_summaries(repo_id: str, summaries: dict):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "UPDATE analyses SET summaries=?, status='complete', updated_at=CURRENT_TIMESTAMP WHERE repo_id=?",
            (json.dumps(summaries), repo_id)
        )
        await db.commit()


async def get_analysis(repo_id: str) -> dict | None:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT * FROM analyses WHERE repo_id=?", (repo_id,)
        ) as cursor:
            row = await cursor.fetchone()
            if not row:
                return None
            result = dict(row)
            if result.get("graph_data"):
                result["graph_data"] = json.loads(result["graph_data"])
            if result.get("summaries"):
                result["summaries"] = json.loads(result["summaries"])
            return result


async def get_all_analyses() -> list[dict]:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT repo_id, url, status, created_at, updated_at FROM analyses ORDER BY updated_at DESC"
        ) as cursor:
            rows = await cursor.fetchall()
            return [dict(r) for r in rows]
