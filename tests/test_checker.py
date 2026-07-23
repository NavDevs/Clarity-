import os
from pathlib import Path
from clarity.audit.checker import check_env_vars

def test_check_env_vars(tmp_path: Path):
    # Create mock .env.example
    env_example = tmp_path / ".env.example"
    env_example.write_text("API_KEY=\nDB_HOST=localhost\nSECRET_KEY=\n")
    
    # Create mock .env with missing vars
    env_local = tmp_path / ".env"
    env_local.write_text("API_KEY=123\n")
    
    success, missing = check_env_vars(str(tmp_path))
    
    assert not success
    assert set(missing) == {"DB_HOST", "SECRET_KEY"}

def test_check_env_vars_success(tmp_path: Path):
    env_example = tmp_path / ".env.example"
    env_example.write_text("API_KEY=\n")
    
    env_local = tmp_path / ".env"
    env_local.write_text("API_KEY=123\n")
    
    success, missing = check_env_vars(str(tmp_path))
    
    assert success
    assert not missing
