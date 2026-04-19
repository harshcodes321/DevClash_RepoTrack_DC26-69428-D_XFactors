import ast
import re
from pathlib import Path
from typing import Optional

# Try tree-sitter imports
try:
    import tree_sitter_python as tspython
    import tree_sitter_javascript as tsjavascript
    from tree_sitter import Language, Parser as TSParser
    PY_LANGUAGE = Language(tspython.language())
    JS_LANGUAGE = Language(tsjavascript.language())
    TS_AVAILABLE = True
except Exception:
    TS_AVAILABLE = False

# No hardcoded extensions - we extract from all files that pass UTF-8 strict boundary.

SKIP_DIRS = {
    "node_modules", ".git", "__pycache__", ".venv", "venv",
    "dist", "build", ".next", "coverage", ".pytest_cache",
    "migrations", "vendor", ".idea", ".vscode"
}


def should_skip(path: Path) -> bool:
    for part in path.parts:
        if part in SKIP_DIRS:
            return True
    return False


def parse_python_imports(content: str, file_path: str) -> list[str]:
    """Extract import targets from Python source."""
    imports = []
    try:
        tree = ast.parse(content)
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    imports.append(alias.name.split(".")[0])
            elif isinstance(node, ast.ImportFrom):
                if node.module:
                    imports.append(node.module.split(".")[0])
    except SyntaxError:
        pass
    return imports


def parse_js_imports(content: str) -> list[str]:
    """Extract import/require targets from JS/TS source using regex."""
    imports = []
    # ES6 imports
    for m in re.finditer(r'import\s+.*?\s+from\s+[\'"]([^\'"]+)[\'"]', content):
        imports.append(m.group(1))
    # require()
    for m in re.finditer(r'require\s*\(\s*[\'"]([^\'"]+)[\'"]\s*\)', content):
        imports.append(m.group(1))
    return imports


def parse_dart_imports(content: str) -> list[str]:
    """Extract import targets from Dart/Flutter source."""
    imports = []
    for m in re.finditer(r'import\s+[\'"]([^\'"]+)[\'"]', content):
        imports.append(m.group(1))
    return imports


def get_functions_classes(content: str, ext: str) -> dict:
    """Extract function/class names from code."""
    functions = []
    classes = []

    if ext == ".py":
        try:
            tree = ast.parse(content)
            for node in ast.walk(tree):
                if isinstance(node, ast.FunctionDef) or isinstance(node, ast.AsyncFunctionDef):
                    if not node.name.startswith("_"):
                        functions.append(node.name)
                elif isinstance(node, ast.ClassDef):
                    classes.append(node.name)
        except SyntaxError:
            pass
    elif ext in {".js", ".ts", ".jsx", ".tsx"}:
        # Regex-based extraction for JS/TS (handles function declarations and arrow components)
        for m in re.finditer(r'(?:function\s+(\w+)|const\s+(\w+)\s*=\s*(?:async\s*)?(?:\([^\)]*\)|\w+)\s*=>)', content):
            name = m.group(1) or m.group(2)
            if name:
                functions.append(name)
        for m in re.finditer(r'class\s+(\w+)', content):
            classes.append(m.group(1))
    elif ext == ".dart":
        # Extract Dart classes
        for m in re.finditer(r'class\s+(\w+)', content):
            classes.append(m.group(1))
        # Extract Dart functions & methods
        for m in re.finditer(r'(?:void|int|String|bool|Widget|List|Map|Set|Future|var|Dynamic)\s+(\w+)\s*\(', content):
            functions.append(m.group(1))

    return {"functions": functions[:20], "classes": classes[:10]}


def parse_file(file_path: Path, repo_root: Path) -> Optional[dict]:
    """Parse a single file and return its metadata."""
    if should_skip(file_path):
        return None

    try:
        # Skip overly large files to preserve memory (e.g., > 1MB)
        if file_path.stat().st_size > 1_000_000:
            return None
        # Use strict UTF-8 decoding. If it fails, it's likely a binary file (e.g., PNG, EXE), so we skip it.
        content = file_path.read_text(encoding="utf-8")
    except Exception:
        return None

    if not content.strip():
        return None

    ext = file_path.suffix.lower()
    rel_path = str(file_path.relative_to(repo_root)).replace("\\", "/")

    # Extract imports
    if ext == ".py":
        raw_imports = parse_python_imports(content, rel_path)
    elif ext in {".js", ".ts", ".jsx", ".tsx"}:
        raw_imports = parse_js_imports(content)
    elif ext == ".dart":
        raw_imports = parse_dart_imports(content)
    else:
        raw_imports = []

    # Resolve relative imports to file paths
    resolved_imports = []
    for imp in raw_imports:
        if imp.startswith("."):
            # Relative import
            resolved_imports.append(imp)
        else:
            resolved_imports.append(imp)

    symbols = get_functions_classes(content, ext)
    line_count = len(content.splitlines())

    return {
        "path": rel_path,
        "ext": ext,
        "size": len(content),
        "lines": line_count,
        "imports": raw_imports,
        "raw_imports": resolved_imports,
        "functions": symbols["functions"],
        "classes": symbols["classes"],
        "content_preview": content[:500],
        "full_content": content[:3000],  # For AI summarization
    }


def scan_repository(repo_root: Path) -> list[dict]:
    """Scan all files in a repo and return parsed metadata."""
    files = []
    for file_path in repo_root.rglob("*"):
        if file_path.is_file():
            parsed = parse_file(file_path, repo_root)
            if parsed:
                files.append(parsed)
    return files


def get_file_tree(repo_root: Path) -> dict:
    """Build a nested dictionary representing the overall directory structure."""
    def build_tree(current_dir: Path) -> list:
        tree = []
        try:
            # Sort: folders first, then files, both alphabetically
            paths = sorted(current_dir.iterdir(), key=lambda x: (x.is_file(), x.name.lower()))
            for path in paths:
                if should_skip(path):
                    continue
                if path.is_dir():
                    children = build_tree(path)
                    if children or not should_skip(path): # include empty dirs if not skipped
                        tree.append({
                            "name": path.name,
                            "type": "directory",
                            "children": children
                        })
                else:
                    tree.append({
                        "name": path.name,
                        "type": "file",
                        "path": str(path.relative_to(repo_root)).replace("\\", "/")
                    })
        except Exception:
            pass
        return tree

    return {
        "name": repo_root.name,
        "type": "directory",
        "children": build_tree(repo_root)
    }
