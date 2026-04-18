import os
import shutil
import hashlib
import tempfile
from pathlib import Path
import git

REPOS_DIR = Path(tempfile.gettempdir()) / "repo_navigator_repos"
REPOS_DIR.mkdir(exist_ok=True)


def repo_id_from_url(url: str) -> str:
    """Generate a unique ID for a repo URL."""
    return hashlib.md5(url.encode()).hexdigest()[:12]


def clone_repo(url: str) -> tuple[str, Path]:
    """Clone a GitHub repo and return (repo_id, local_path)."""
    repo_id = repo_id_from_url(url)
    repo_path = REPOS_DIR / repo_id

    if repo_path.exists():
        # Already cloned — pull latest
        try:
            repo = git.Repo(repo_path)
            origin = repo.remotes.origin
            origin.pull()
        except Exception:
            shutil.rmtree(repo_path, ignore_errors=True)
            git.Repo.clone_from(url, repo_path, depth=1)
    else:
        git.Repo.clone_from(url, repo_path, depth=1)

    return repo_id, repo_path


def cleanup_repo(repo_id: str):
    """Remove a cloned repo."""
    repo_path = REPOS_DIR / repo_id
    if repo_path.exists():
        shutil.rmtree(repo_path, ignore_errors=True)
