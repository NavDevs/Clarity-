import os
import re
from pathlib import Path
from typing import List, Tuple

# Common secret patterns
SECRET_PATTERNS = [
    r"(?i)api[_-]?key\s*=\s*['\"]?[a-zA-Z0-9_\-]{16,}['\"]?",
    r"(?i)secret[_-]?key\s*=\s*['\"]?[a-zA-Z0-9_\-]{16,}['\"]?",
    r"(?i)password\s*=\s*['\"]?[a-zA-Z0-9_\-]{8,}['\"]?",
    r"(?i)bearer\s+[a-zA-Z0-9_\-\.]{20,}",
    r"sk_live_[a-zA-Z0-9]{24}", # Stripe live key
    r"sk_test_[a-zA-Z0-9]{24}", # Stripe test key
]

def scan_file_for_secrets(file_path: Path) -> List[Tuple[int, str]]:
    """Scan a single file for hardcoded secrets. Returns list of (line_number, match)."""
    secrets_found = []
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            for line_num, line in enumerate(f, 1):
                for pattern in SECRET_PATTERNS:
                    match = re.search(pattern, line)
                    if match:
                        secrets_found.append((line_num, match.group(0)))
                        break # One secret per line is enough to flag
    except UnicodeDecodeError:
        pass # Ignore binary files
    return secrets_found

def scan_directory(dir_path: str = ".") -> List[Tuple[str, int, str]]:
    """
    Scan directory for secrets.
    Returns list of (file_path, line_number, matched_text)
    """
    base_path = Path(dir_path)
    all_secrets = []
    
    # Simple exclusion list
    exclude_dirs = {".git", "venv", "__pycache__", "node_modules", ".pytest_cache", "dist", "build"}
    exclude_extensions = {".pyc", ".png", ".jpg", ".pdf", ".lock", ".svg", ".ico"}
    exclude_files = {"readme.md", ".env.example", "package-lock.json", "yarn.lock"}
    
    for root, dirs, files in os.walk(base_path):
        dirs[:] = [d for d in dirs if d not in exclude_dirs]
        for file in files:
            path = Path(root) / file
            if path.suffix.lower() in exclude_extensions or path.name.lower() in exclude_files:
                continue
            
            secrets = scan_file_for_secrets(path)
            for line_num, match in secrets:
                all_secrets.append((str(path), line_num, match))
                
    return all_secrets
