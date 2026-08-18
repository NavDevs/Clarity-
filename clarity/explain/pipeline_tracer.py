import ast
import re
from pathlib import Path
from typing import Dict, List, Set

def trace_pipeline(repo_path: Path) -> Dict[str, Dict[str, List[str]]]:
    """
    Builds a call graph and extracts code logic (functions, classes) from entry points.
    Returns dict mapping caller file to dict of extracted logic.
    """
    call_graph = {}
    
    def process_python(file_path: Path):
        try:
            content = file_path.read_text(encoding="utf-8")
            tree = ast.parse(content)
        except Exception:
            return
            
        imports = set()
        functions = set()
        classes = set()
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    imports.add(alias.name.split('.')[0])
            elif isinstance(node, ast.ImportFrom):
                if node.module:
                    imports.add(node.module.split('.')[0])
            elif isinstance(node, ast.FunctionDef):
                functions.add(node.name)
            elif isinstance(node, ast.ClassDef):
                classes.add(node.name)
                    
        if imports or functions or classes:
            call_graph[file_path.relative_to(repo_path).as_posix()] = {
                "imports": list(imports),
                "functions": list(functions),
                "classes": list(classes)
            }

    def process_node(file_path: Path):
        try:
            content = file_path.read_text(encoding="utf-8")
        except Exception:
            return
            
        imports = set()
        functions = set()
        classes = set()
        
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
                
        # Functions and classes
        for match in re.finditer(r"(?:function|const|let)\s+([a-zA-Z0-9_]+)\s*=?\s*\(", content):
            functions.add(match.group(1))
        for match in re.finditer(r"class\s+([a-zA-Z0-9_]+)", content):
            classes.add(match.group(1))
            
        if imports or functions or classes:
            call_graph[file_path.relative_to(repo_path).as_posix()] = {
                "imports": list(imports),
                "functions": list(functions),
                "classes": list(classes)
            }

    def process_mobile(file_path: Path):
        try:
            content = file_path.read_text(encoding="utf-8")
        except Exception:
            return
            
        imports = set()
        functions = set()
        classes = set()
        
        for match in re.finditer(r"import\s+['\"]?([a-zA-Z0-9_\.\:]+)['\"]?", content):
            pkg = match.group(1).split('.')[0].split(':')[0]
            if pkg.lower() not in ('java', 'javax', 'kotlin', 'dart', 'swift', 'foundation', 'uikit', 'package'):
                imports.add(pkg)
                
        for match in re.finditer(r"(?:fun|func|void|String|int|bool|Widget)\s+([a-zA-Z0-9_]+)\s*\(", content):
            if match.group(1) not in ('if', 'for', 'while', 'switch'):
                functions.add(match.group(1))
        for match in re.finditer(r"class\s+([a-zA-Z0-9_]+)", content):
            classes.add(match.group(1))
                
        if imports or functions or classes:
            call_graph[file_path.relative_to(repo_path).as_posix()] = {
                "imports": list(imports),
                "functions": list(functions),
                "classes": list(classes)
            }

    for file_path in repo_path.rglob("*"):
        if "venv" in file_path.parts or ".git" in file_path.parts or "node_modules" in file_path.parts or "build" in file_path.parts:
            continue
            
        if file_path.suffix == ".py":
            process_python(file_path)
        elif file_path.suffix in (".js", ".ts", ".jsx", ".tsx"):
            process_node(file_path)
        elif file_path.suffix in (".dart", ".swift", ".kt", ".java"):
            process_mobile(file_path)
                 
    return call_graph

