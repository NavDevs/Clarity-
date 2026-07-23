from pathlib import Path
from clarity.explain.stack_detector import detect_stack

def test_detect_stack_python(tmp_path: Path):
    req_file = tmp_path / "requirements.txt"
    req_file.write_text("fastapi>=0.68.0\npydantic\nsqlalchemy\nredis\nopenai==1.0.0")
    
    stack = detect_stack(tmp_path)
    assert "Python" in stack["backend"]
    assert "Fastapi" in stack["backend"]
    assert "Pydantic" in stack["validation"]
    assert "Sqlalchemy" in stack["database"]
    assert "Redis" in stack["infra"]
    assert "Openai" in stack["ai"]

def test_detect_stack_node(tmp_path: Path):
    pkg_file = tmp_path / "package.json"
    pkg_file.write_text('{"dependencies": {"react": "18", "express": "4", "mongoose": "6", "zod": "3"}}')
    
    stack = detect_stack(tmp_path)
    assert "React" in stack["frontend"]
    assert "Express" in stack["backend"]
    assert "Mongoose" in stack["database"]
    assert "Zod" in stack["validation"]
