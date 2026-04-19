import networkx as nx
from pathlib import Path


ENTRY_POINT_NAMES = {
    "main.py", "app.py", "index.py", "server.py", "manage.py",
    "index.js", "app.js", "server.js", "main.js",
    "index.ts", "app.ts", "server.ts", "main.ts",
    "index.jsx", "app.jsx", "index.tsx", "app.tsx",
    "main.dart",
}


def build_graph(parsed_files: list[dict]) -> dict:
    """
    Build a dependency graph from parsed file metadata.
    Returns nodes and edges for React Flow.
    """
    G = nx.DiGraph()

    # Index files by path and by module name
    path_index = {}
    module_index = {}

    for f in parsed_files:
        path = f["path"]
        G.add_node(path, **{k: v for k, v in f.items() if k != "full_content"})
        path_index[path] = f

        # Index by filename stem for import resolution
        stem = Path(path).stem.lower()
        module_index[stem] = path

        # Also index by directory/stem
        parts = path.replace("\\", "/").split("/")
        if len(parts) > 1:
            module_index["/".join(parts[-2:])] = path
            module_index[parts[-2] + "/" + parts[-1]] = path

    # Add edges based on imports
    for f in parsed_files:
        src = f["path"]
        for imp in f.get("imports", []):
            # Try to resolve the import to an actual file
            target = resolve_import(imp, src, module_index, path_index)
            if target and target != src:
                G.add_edge(src, target)

    # Calculate centrality metrics
    try:
        betweenness = nx.betweenness_centrality(G)
        in_degree_centrality = nx.in_degree_centrality(G)
    except Exception:
        betweenness = {n: 0 for n in G.nodes()}
        in_degree_centrality = {n: 0 for n in G.nodes()}

    # Calculate importance score (0–1)
    max_between = max(betweenness.values()) if betweenness else 1
    max_indegree = max(in_degree_centrality.values()) if in_degree_centrality else 1

    nodes = []
    for node in G.nodes():
        data = G.nodes[node]
        filename = Path(node).name.lower()

        is_entry = filename in ENTRY_POINT_NAMES
        b_score = betweenness.get(node, 0)
        d_score = in_degree_centrality.get(node, 0)

        # Normalized importance: mix of betweenness + in-degree
        raw_importance = (
            0.6 * (b_score / max_between if max_between > 0 else 0) +
            0.4 * (d_score / max_indegree if max_indegree > 0 else 0)
        )

        # Boost entry points
        if is_entry:
            raw_importance = max(raw_importance, 0.6)

        NON_ORPHAN_PATTERN = {
            "package.json", "package-lock.json", "yarn.lock", "pnpm-lock.yaml",
            "tsconfig.json", "jsconfig.json", "requirements.txt", "pyproject.toml", 
            "pipfile", "pipfile.lock", "readme.md", "license", "makefile", "dockerfile",
            ".gitignore", ".dockerignore", ".eslintrc", ".eslintrc.json", ".eslintrc.js",
            ".prettierrc", "setup.py", "setup.cfg"
        }

        in_edges = list(G.predecessors(node))
        out_edges = list(G.successors(node))
        is_orphan = len(in_edges) == 0 and len(out_edges) == 0
        
        # Don't mark package, config, or documentation files as orphans
        if is_orphan and (
            filename in NON_ORPHAN_PATTERN or 
            filename.endswith(".config.js") or 
            filename.endswith(".config.ts") or 
            filename.endswith(".md")
        ):
            is_orphan = False

        nodes.append({
            "id": node,
            "label": Path(node).name,
            "path": node,
            "importance": round(raw_importance, 4),
            "is_entry": is_entry,
            "is_orphan": is_orphan,
            "in_degree": G.in_degree(node),
            "out_degree": G.out_degree(node),
            "dependencies": out_edges,       # files this file imports
            "dependents": in_edges,          # files that import this file
            "betweenness": round(b_score, 4),
            "functions": data.get("functions", []),
            "classes": data.get("classes", []),
            "lines": data.get("lines", 0),
            "ext": data.get("ext", ""),
            "full_content": path_index[node].get("full_content", ""),
        })

    edges = [{"source": u, "target": v} for u, v in G.edges()]

    # Compute onboarding path (topological sort from entry points)
    onboarding_path = compute_onboarding_path(G, nodes)

    # Find orphan files
    orphans = [n["id"] for n in nodes if n["is_orphan"]]

    # Top high-impact files
    high_impact = sorted(nodes, key=lambda x: x["importance"], reverse=True)[:10]

    return {
        "nodes": nodes,
        "edges": edges,
        "onboarding_path": onboarding_path,
        "orphans": orphans,
        "high_impact": [h["id"] for h in high_impact],
        "stats": {
            "total_files": len(nodes),
            "total_edges": len(edges),
            "orphan_count": len(orphans),
            "entry_points": [n["id"] for n in nodes if n["is_entry"]],
        }
    }


def resolve_import(import_str: str, src_file: str, module_index: dict, path_index: dict) -> str | None:
    """Try to resolve an import string to an actual file path."""
    # Normalize
    imp = import_str.replace("\\", "/").lower()

    # Direct path match
    if imp in path_index:
        return imp

    # Check by stem
    stem = imp.split("/")[-1].split(".")[0]
    if stem in module_index:
        return module_index[stem]

    # Try common extensions
    for ext in [".py", ".js", ".ts", ".jsx", ".tsx", ".dart"]:
        candidate = imp + ext
        if candidate in path_index:
            return candidate

    # Try as directory index
    for ext in [".py", ".js", ".ts", ".dart"]:
        candidate = imp + "/index" + ext
        if candidate in path_index:
            return candidate

    return None


def compute_onboarding_path(G: nx.DiGraph, nodes: list[dict]) -> list[str]:
    """Generate a recommended reading order for new developers."""
    try:
        # Try topological sort
        topo = list(nx.topological_sort(G))
        # Filter to meaningful files and sort by importance
        node_importance = {n["id"]: n["importance"] for n in nodes}
        entry_points = [n["id"] for n in nodes if n["is_entry"]]

        # Start with entry points, then high-importance files
        path = []
        seen = set()

        # Add entry points first
        for ep in entry_points:
            if ep not in seen:
                path.append(ep)
                seen.add(ep)

        # Add remaining in topological order, filtered by importance
        for node in topo:
            if node not in seen:
                imp = node_importance.get(node, 0)
                if imp > 0.1 or G.out_degree(node) > 0:
                    path.append(node)
                    seen.add(node)

        return path[:20]  # Top 20 files
    except nx.NetworkXUnfeasible:
        # Graph has cycles — fall back to importance sort
        return [n["id"] for n in sorted(nodes, key=lambda x: x["importance"], reverse=True)][:20]
