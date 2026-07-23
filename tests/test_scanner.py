from pathlib import Path
from clarity.audit.scanner import scan_directory, scan_file_for_secrets

def test_scan_file_for_secrets(tmp_path: Path):
    test_file = tmp_path / "config.py"
    test_file.write_text("def get_key():\n    api_key = 'my_fake_api_key_for_testing_purposes'\n    return api_key\n")
    
    secrets = scan_file_for_secrets(test_file)
    assert len(secrets) == 1
    assert secrets[0][0] == 2 # line number

def test_scan_directory(tmp_path: Path):
    # Fake secret in python file
    (tmp_path / "app.py").write_text("SECRET_KEY = 'super_secret_key_123456'")
    # Ignored directory
    git_dir = tmp_path / ".git"
    git_dir.mkdir()
    (git_dir / "config").write_text("API_KEY='1234567890123456789'")
    
    secrets = scan_directory(str(tmp_path))
    assert len(secrets) == 1
    assert "app.py" in secrets[0][0]
    assert secrets[0][1] == 1
