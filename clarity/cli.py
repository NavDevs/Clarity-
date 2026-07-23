import typer
from rich.console import Console

app = typer.Typer(help="Clarity CLI: Audit env secrets and explain public repos.")
console = Console()

@app.command()
def check(dir_path: str = typer.Argument(".", help="Directory to check")):
    """Audit missing/misconfigured .env variables."""
    from clarity.audit.checker import check_env_vars
    success, missing = check_env_vars(dir_path)
    if success:
        console.print("All required .env variables are present.", style="green")
    else:
        console.print(f"Missing required .env variables: {', '.join(missing)}", style="red")

@app.command()
def scan(dir_path: str = typer.Argument(".", help="Directory to scan")):
    """Detect hardcoded secrets in source code."""
    from clarity.audit.scanner import scan_directory
    secrets = scan_directory(dir_path)
    
    if not secrets:
        console.print("No hardcoded secrets detected.", style="green")
    else:
        console.print(f"Detected {len(secrets)} hardcoded secrets:", style="red")
        for filepath, line_num, match in secrets:
            console.print(f"  [yellow]{filepath}:{line_num}[/yellow] -> [red]{match}[/red]")

@app.command()
def explain(
    repo: str = typer.Option(..., "--repo", help="GitHub repo URL"),
    diagram: bool = typer.Option(False, "--diagram", help="Generate animated diagram")
):
    """Explain a public GitHub repo and generate an animated diagram."""
    from clarity.explain.fetcher import fetch_repo, cleanup_repo
    from clarity.explain.stack_detector import detect_stack
    from clarity.explain.structure_mapper import classify_folders
    from clarity.explain.pipeline_tracer import trace_python_pipeline
    from clarity.explain.summarizer import generate_summary
    from clarity.explain.diagram_gen import generate_diagram_data
    import json
    import os
    import shutil
    from pathlib import Path
    import webbrowser

    console.print(f"Fetching repository: {repo}...", style="cyan")
    try:
        repo_path = fetch_repo(repo)
    except Exception as e:
        console.print(f"Error fetching repo: {e}", style="red")
        return

    try:
        console.print("Analyzing stack...", style="cyan")
        stack_data = detect_stack(repo_path)
        
        console.print("Mapping structure...", style="cyan")
        structure_data = classify_folders(repo_path)
        
        console.print("Tracing pipeline...", style="cyan")
        pipeline_data = trace_python_pipeline(repo_path)
        
        console.print("Generating summary...", style="cyan")
        summary_text = generate_summary(stack_data, structure_data, pipeline_data)
        
        console.print("\n[bold]Project Summary:[/bold]")
        console.print(summary_text)

        if diagram:
            console.print("Generating diagram dashboard...", style="cyan")
            diagram_data = generate_diagram_data(stack_data, pipeline_data)
            
            # Prepare output directory
            out_dir = Path("clarity_dashboard")
            out_dir.mkdir(exist_ok=True)
            
            # Copy web assets
            web_dir = Path(__file__).parent / "explain" / "web"
            shutil.copy(web_dir / "styles.css", out_dir / "styles.css")
            shutil.copy(web_dir / "animate.js", out_dir / "animate.js")
            
            stats_data = {
                "file_count": structure_data["root"].get("file_count", 0),
                "folder_depth": structure_data["root"].get("max_depth", 0),
                "entry_points": len(pipeline_data.keys())
            }
            
            # Inject data into template
            template = (web_dir / "template.html").read_text(encoding="utf-8")
            
            injection = f"""<script id="injectedData">
        window.CLARITY_DATA = {{
            summary: {json.dumps(summary_text)},
            stack: {json.dumps(stack_data)},
            diagram: {json.dumps(diagram_data)},
            stats: {json.dumps(stats_data)}
        }};
    </script>"""
            
            # Fallback for generic replacement
            import re
            html_output = re.sub(r'<script id="injectedData">.*?</script>', injection, template, flags=re.DOTALL)
            
            index_path = out_dir / "index.html"
            index_path.write_text(html_output, encoding="utf-8")
            
            console.print(f"Opening dashboard from {index_path.absolute()}...", style="green")
            webbrowser.open(index_path.absolute().as_uri())

    finally:
        cleanup_repo(repo_path)

if __name__ == "__main__":
    app()
