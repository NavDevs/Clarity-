import os
import re
from pathlib import Path
from typing import List, Tuple

def parse_env_file(file_path: Path) -> set:
    """Parse an env file and return a set of variable names."""
    if not file_path.exists():
        return set()
    
    vars = set()
    with open(file_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            
            # Match VAR_NAME=...
            match = re.match(r"^([A-Za-z0-9_]+)=", line)
            if match:
                vars.add(match.group(1))
    return vars

def check_env_vars(dir_path: str = ".") -> Tuple[str, List[str]]:
    """
    Compare .env and .env.example.
    Returns (status, list_of_missing_vars)
    status can be 'NO_EXAMPLE', 'SUCCESS', or 'MISSING'
    """
    base_path = Path(dir_path)
    env_example = base_path / ".env.example"
    env_local = base_path / ".env"
    
    if not env_example.exists():
        return "NO_EXAMPLE", []
        
    example_vars = parse_env_file(env_example)
    local_vars = parse_env_file(env_local)
    
    missing = [var for var in example_vars if var not in local_vars]
    
    if len(missing) == 0:
        return "SUCCESS", []
    
    return "MISSING", missing
