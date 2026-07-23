import ast
import re
from pathlib import Path
from typing import Dict, List, Set

def trace_pipeline(repo_path: Path) -> Dict[str, List[str]]:
    """
    Builds a simple call graph from Python or Node.js entry points.
    Returns dict mapping caller to list of callees.
    """
    call_graph = {}
    
    def process_python(file_path: Path):
        try:
            content = file_path.read_text(encoding="utf-8")
            tree = ast.parse(content)
        except Exception:
            return
            
        imports = set()
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    imports.add(alias.name.split('.')[0])
            elif isinstance(node, ast.ImportFrom):
                if node.module:
                    imports.add(node.module.split('.')[0])
                    
        if imports:
            call_graph[file_path.relative_to(repo_path).as_posix()] = list(imports)

    def process_node(file_path: Path):
        try:
            content = file_path.read_text(encoding="utf-8")
        except Exception:
            return
            
        imports = set()
        # require('pkg')
        for match in re.finditer(r"require\(['\"]([^'\"]+)['\"]\)", content):
            base_pkg = match.group(1).split('/')[0]
            if base_pkg not in ('.', '..', '@', '~'):
                imports.add(base_pkg)
        # from 'pkg' or import 'pkg'
        for match in re.finditer(r"(?:from|import)\s+['\"]([^'\"]+)['\"]", content):
            base_pkg = match.group(1).split('/')[0]
            if base_pkg not in ('.', '..', '@', '~'):
                imports.add(base_pkg)
            
        if imports:
            call_graph[file_path.relative_to(repo_path).as_posix()] = list(imports)

    for file_path in repo_path.rglob("*"):
        if "venv" in file_path.parts or ".git" in file_path.parts or "node_modules" in file_path.parts:
            continue
            
        if file_path.suffix == ".py" and file_path.name in ("main.py", "app.py", "cli.py", "__init__.py"):
            process_python(file_path)
        elif file_path.suffix in (".js", ".ts", ".jsx", ".tsx") and file_path.name in ("index.js", "server.js", "app.js", "main.js", "index.ts", "server.ts", "app.ts", "main.ts", "route.ts", "route.js", "page.tsx", "page.jsx", "layout.tsx", "layout.jsx", "middleware.ts", "middleware.js"):
            process_node(file_path)
                 
    return call_graph

