import os
import tempfile
import shutil
from git import Repo, GitCommandError
from pathlib import Path

def fetch_repo(url: str) -> Path:
    """
    Shallow clones a public GitHub repo to a temporary directory.
    Returns the path to the cloned repository.
    """
    temp_dir = Path(tempfile.mkdtemp(prefix="clarity_repo_"))
    
    try:
        # Clone only depth=1 to save time and space
        Repo.clone_from(url, temp_dir, depth=1)
        return temp_dir
    except GitCommandError as e:
        shutil.rmtree(temp_dir, ignore_errors=True)
        raise RuntimeError(f"Failed to fetch repository from {url}. Error: {e}")

def cleanup_repo(path: Path):
    """Removes the cloned repository."""
    if path.exists() and path.is_dir():
        # Handle windows readonly files issue during rmtree
        def on_rm_error(func, path, exc_info):
            import stat
            os.chmod(path, stat.S_IWRITE)
            func(path)
        shutil.rmtree(path, onerror=on_rm_error)
