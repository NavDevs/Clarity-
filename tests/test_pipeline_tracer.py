from pathlib import Path
from clarity.explain.pipeline_tracer import trace_python_pipeline

def test_trace_python_pipeline(tmp_path: Path):
    app_py = tmp_path / "app.py"
    app_py.write_text("import requests\nfrom utils import helper\nhelper()\n")
    
    graph = trace_python_pipeline(tmp_path)
    assert "app.py" in graph
    assert "requests" in graph["app.py"]
    assert "utils" in graph["app.py"]
