from __future__ import annotations
import os
import re
import ast
import textwrap
import hashlib
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple, Set

from dotenv import load_dotenv
from neo4j import GraphDatabase

try:
    from sentence_transformers import SentenceTransformer  # type: ignore
except Exception:
    SentenceTransformer = None  # type: ignore

# Defer OpenAI import inside Embedder to avoid stale module-level state

try:
    from neo4j_graphrag.generation.graphrag import GraphRAG  # type: ignore
    from neo4j_graphrag.retrievers import VectorRetriever  # type: ignore
    from neo4j_graphrag.llm import OpenAILLM  # type: ignore
except Exception:
    GraphRAG = None  # type: ignore
    VectorRetriever = None  # type: ignore
    OpenAILLM = None  # type: ignore

try:
    from diff_match_patch import diff_match_patch  # type: ignore
except Exception:
    diff_match_patch = None  # type: ignore


load_dotenv()
EMBEDDING_BACKEND = os.getenv("EMBEDDING_BACKEND", "local")


@dataclass
class FunctionInfo:
    name: str
    qualname: str
    lineno: int
    docstring: str
    source: str
    file_path: str
    class_name: Optional[str] = None
    calls: Set[str] = field(default_factory=set)


@dataclass
class ClassInfo:
    name: str
    qualname: str
    lineno: int
    docstring: str
    source: str
    file_path: str
    methods: List[FunctionInfo] = field(default_factory=list)


@dataclass
class FileInfo:
    path: str
    language: str = "python"
    imports: Set[str] = field(default_factory=set)
    classes: List[ClassInfo] = field(default_factory=list)
    functions: List[FunctionInfo] = field(default_factory=list)


def _read_text(path: str) -> str:
    try:
        with open(path, "r", encoding="utf-8") as f:
            return f.read()
    except Exception:
        return ""


class _CallCollector(ast.NodeVisitor):
    def __init__(self):
        self.calls: Set[str] = set()

    def visit_Call(self, node: ast.Call):
        name = self._get_name(node.func)
        if name:
            self.calls.add(name)
        self.generic_visit(node)

    def _get_name(self, node) -> Optional[str]:
        if isinstance(node, ast.Name):
            return node.id
        if isinstance(node, ast.Attribute):
            parts = []
            while isinstance(node, ast.Attribute):
                parts.append(node.attr)
                node = node.value
            if isinstance(node, ast.Name):
                parts.append(node.id)
                return ".".join(reversed(parts))
        return None


class _ImportCollector(ast.NodeVisitor):
    def __init__(self):
        self.imports: Set[str] = set()

    def visit_Import(self, node: ast.Import):
        for n in node.names:
            self.imports.add(n.name.split(".")[0])

    def visit_ImportFrom(self, node: ast.ImportFrom):
        if node.module:
            self.imports.add(node.module.split(".")[0])


def _extract_brace_block(source_text: str, open_brace_index: int) -> str:
    if open_brace_index < 0 or open_brace_index >= len(source_text) or source_text[open_brace_index] != '{':
        return ""
    depth = 1
    i = open_brace_index + 1
    while i < len(source_text) and depth > 0:
        ch = source_text[i]
        if ch == '{':
            depth += 1
        elif ch == '}':
            depth -= 1
        i += 1
    if depth == 0:
        line_start = source_text.rfind('\n', 0, open_brace_index)
        line_start = 0 if line_start == -1 else line_start + 1
        return source_text[line_start:i]
    return ""


def parse_python_file(path: str, repo_root: str) -> FileInfo:
    src = _read_text(path)
    rel = os.path.relpath(path, repo_root)
    fi = FileInfo(path=rel)
    try:
        tree = ast.parse(src)
    except SyntaxError:
        return fi
    ic = _ImportCollector()
    ic.visit(tree)
    fi.imports = ic.imports

    def get_seg(node: ast.AST) -> str:
        try:
            lines = src.splitlines()
            start = node.lineno - 1
            end = getattr(node, "end_lineno", node.lineno)
            return "\n".join(lines[start:end])
        except Exception:
            return ""

    for node in tree.body:
        if isinstance(node, ast.ClassDef):
            cls_name = node.name
            qual = f"{rel.replace(os.sep, '.')}.{cls_name}"
            cls_info = ClassInfo(
                name=cls_name,
                qualname=qual,
                lineno=node.lineno,
                docstring=ast.get_docstring(node) or "",
                source=get_seg(node),
                file_path=rel,
            )
            for n in node.body:
                if isinstance(n, ast.FunctionDef):
                    fun_name = n.name
                    fun_qual = f"{qual}.{fun_name}"
                    cc = _CallCollector(); cc.visit(n)
                    cls_info.methods.append(FunctionInfo(
                        name=fun_name,
                        qualname=fun_qual,
                        lineno=n.lineno,
                        docstring=ast.get_docstring(n) or "",
                        source=get_seg(n),
                        file_path=rel,
                        class_name=cls_name,
                        calls=cc.calls,
                    ))
            fi.classes.append(cls_info)
        elif isinstance(node, ast.FunctionDef):
            fun_name = node.name
            fun_qual = f"{rel.replace(os.sep, '.')}.{fun_name}"
            cc = _CallCollector(); cc.visit(node)
            fi.functions.append(FunctionInfo(
                name=fun_name,
                qualname=fun_qual,
                lineno=node.lineno,
                docstring=ast.get_docstring(node) or "",
                source=get_seg(node),
                file_path=rel,
                calls=cc.calls,
            ))
    return fi


def _parse_js_like(path: str, repo_root: str) -> FileInfo:
    src = _read_text(path)
    rel = os.path.relpath(path, repo_root)
    language = "typescript" if path.endswith((".ts", ".tsx")) else "javascript"
    fi = FileInfo(path=rel, language=language)
    for m in re.finditer(r"^\s*import\s+[^;]*?from\s+['\"]([^'\"]+)['\"]", src, flags=re.MULTILINE):
        mod = m.group(1).split('/')[0]
        if mod and not mod.startswith('.'):
            fi.imports.add(mod)
    for m in re.finditer(r"require\(\s*['\"]([^'\"]+)['\"]\s*\)", src):
        mod = m.group(1).split('/')[0]
        if mod and not mod.startswith('.'):
            fi.imports.add(mod)
    for cm in re.finditer(r"^\s*class\s+([A-Za-z0-9_]+)\b", src, flags=re.MULTILINE):
        class_name = cm.group(1)
        qual = f"{rel.replace(os.sep, '.')}.{class_name}"
        fi.classes.append(ClassInfo(
            name=class_name,
            qualname=qual,
            lineno=src[:cm.start()].count('\n') + 1,
            docstring="",
            source="",
            file_path=rel,
        ))
    for fm in re.finditer(r"^\s*(export\s+)?function\s+([A-Za-z0-9_]+)\s*\(", src, flags=re.MULTILINE):
        fun_name = fm.group(2)
        fun_qual = f"{rel.replace(os.sep, '.')}.{fun_name}"
        brace_pos = src.find('{', fm.end())
        body = _extract_brace_block(src, brace_pos) if brace_pos != -1 else ""
        fi.functions.append(FunctionInfo(
            name=fun_name,
            qualname=fun_qual,
            lineno=src[:fm.start()].count('\n') + 1,
            docstring="",
            source=body or "",
            file_path=rel,
        ))
    for am in re.finditer(r"^\s*(export\s+)?const\s+([A-Za-z0-9_]+)\s*=\s*\([^)]*\)\s*=>\s*\{", src, flags=re.MULTILINE):
        fun_name = am.group(2)
        fun_qual = f"{rel.replace(os.sep, '.')}.{fun_name}"
        body = _extract_brace_block(src, am.end() - 1)
        fi.functions.append(FunctionInfo(
            name=fun_name,
            qualname=fun_qual,
            lineno=src[:am.start()].count('\n') + 1,
            docstring="",
            source=body or "",
            file_path=rel,
        ))
    return fi


def _parse_java(path: str, repo_root: str) -> FileInfo:
    src = _read_text(path)
    rel = os.path.relpath(path, repo_root)
    fi = FileInfo(path=rel, language="java")
    for m in re.finditer(r"^\s*import\s+([A-Za-z0-9_\.]+)", src, flags=re.MULTILINE):
        mod = m.group(1).split('.')[0]
        if mod:
            fi.imports.add(mod)
    for cm in re.finditer(r"^\s*(public|private|protected)?\s*(abstract\s+|final\s+)?class\s+([A-Za-z0-9_]+)\b", src, flags=re.MULTILINE):
        class_name = cm.group(3)
        qual = f"{rel.replace(os.sep, '.')}.{class_name}"
        fi.classes.append(ClassInfo(
            name=class_name,
            qualname=qual,
            lineno=src[:cm.start()].count('\n') + 1,
            docstring="",
            source="",
            file_path=rel,
        ))
    return fi


def _parse_csharp(path: str, repo_root: str) -> FileInfo:
    src = _read_text(path)
    rel = os.path.relpath(path, repo_root)
    fi = FileInfo(path=rel, language="csharp")
    for m in re.finditer(r"^\s*using\s+([A-Za-z0-9_\.]+)\s*;", src, flags=re.MULTILINE):
        mod = m.group(1).split('.')[0]
        if mod:
            fi.imports.add(mod)
    return fi


def _parse_cpp(path: str, repo_root: str) -> FileInfo:
    src = _read_text(path)
    rel = os.path.relpath(path, repo_root)
    fi = FileInfo(path=rel, language="cpp")
    for m in re.finditer(r"^\s*#\s*include\s*[<\"]([^>\"]+)[>\"]", src, flags=re.MULTILINE):
        mod = m.group(1).split('/')[0]
        if mod:
            fi.imports.add(mod)
    return fi


def parse_file(path: str, repo_root: str) -> FileInfo:
    if path.endswith('.py'):
        return parse_python_file(path, repo_root)
    if path.endswith('.java'):
        return _parse_java(path, repo_root)
    if path.endswith('.js') or path.endswith('.ts') or path.endswith('.tsx'):
        return _parse_js_like(path, repo_root)
    if path.endswith('.cs'):
        return _parse_csharp(path, repo_root)
    if path.endswith('.cpp') or path.endswith('.cc') or path.endswith('.cxx') or path.endswith('.hpp') or path.endswith('.hh') or path.endswith('.hxx') or path.endswith('.h'):
        return _parse_cpp(path, repo_root)
    return FileInfo(path=os.path.relpath(path, repo_root))


class Embedder:
    def __init__(self):
        self.backend = EMBEDDING_BACKEND
        if self.backend == "local":
            if SentenceTransformer is None:
                raise RuntimeError("sentence-transformers not installed; install or set EMBEDDING_BACKEND=openai")
            self.model = SentenceTransformer("all-MiniLM-L6-v2")
            self.dim = 384
        elif self.backend == "openai":
            # Import OpenAI client lazily to reflect current environment
            try:
                from openai import OpenAI  # type: ignore
            except Exception as e:
                raise RuntimeError("openai package not installed")
            if not os.getenv("OPENAI_API_KEY"):
                raise RuntimeError("OPENAI_API_KEY not set")
            self.model_name = "text-embedding-3-small"
            self.dim = 1536
        else:
            raise ValueError("EMBEDDING_BACKEND must be 'local' or 'openai'")

    def embed(self, texts: List[str]) -> List[List[float]]:
        if self.backend == "local":
            return self.model.encode(texts, show_progress_bar=False, normalize_embeddings=True).tolist()
        from openai import OpenAI  # type: ignore
        client = OpenAI()
        resp = client.embeddings.create(model=self.model_name, input=texts)
        return [d.embedding for d in resp.data]


class GraphRAGEmbedderAdapter:
    def __init__(self, base_embedder: Embedder):
        self._base = base_embedder

    def embed_query(self, text: str):
        return self._base.embed([text])[0]


class Neo4jWriter:
    def __init__(self, uri: str, user: str, pwd: str, embedder: Embedder):
        self.driver = GraphDatabase.driver(uri, auth=(user, pwd))
        self.embedder = embedder
        self.ensure_schema()

    def close(self):
        self.driver.close()

    def run(self, cypher: str, **params):
        with self.driver.session() as s:
            result = s.run(cypher, **params)
            out = list(result)
            try:
                result.consume()
            except Exception:
                pass
            return out

    def ensure_schema(self):
        self.run("""
        CREATE CONSTRAINT file_path_unique IF NOT EXISTS
        FOR (f:File) REQUIRE f.path IS UNIQUE
        """)
        self.run("""
        CREATE CONSTRAINT class_qual_unique IF NOT EXISTS
        FOR (c:Class) REQUIRE c.qualname IS UNIQUE
        """)
        self.run("""
        CREATE CONSTRAINT func_qual_unique IF NOT EXISTS
        FOR (f:Function) REQUIRE f.qualname IS UNIQUE
        """)
        self.run("""
        CREATE CONSTRAINT lib_name_unique IF NOT EXISTS
        FOR (l:Library) REQUIRE l.name IS UNIQUE
        """)
        self.run(textwrap.dedent(f"""
        CREATE VECTOR INDEX function_embedding IF NOT EXISTS
        FOR (n:Function) ON (n.embedding)
        OPTIONS {{ indexConfig: {{ `vector.dimensions`: {self.embedder.dim}, `vector.similarity_function`: 'cosine' }} }}
        """))
        self.run(textwrap.dedent(f"""
        CREATE VECTOR INDEX class_embedding IF NOT EXISTS
        FOR (n:Class) ON (n.embedding)
        OPTIONS {{ indexConfig: {{ `vector.dimensions`: {self.embedder.dim}, `vector.similarity_function`: 'cosine' }} }}
        """))
        try:
            self.run("CALL db.awaitIndexes(300)")
        except Exception:
            try:
                self.run("CALL db.awaitIndexes()")
            except Exception:
                pass

    def clear_file(self, rel_path: str, workspace_id: Optional[str] = None):
        self.run("""
        MATCH (f:File {path:$p})
        WHERE $wid IS NULL OR f.workspaceId = $wid
        OPTIONAL MATCH (f)-[:CONTAINS]->(n)
        DETACH DELETE n, f
        """, p=rel_path, wid=workspace_id)

    def upsert_file(self, fi: FileInfo, workspace_id: Optional[str]):
        self.run(
            """
            MERGE (f:File {path:$path})
            SET f.language = $lang, f.workspaceId = $wid
            """,
            path=fi.path, lang=fi.language, wid=workspace_id,
        )
        for lib in fi.imports:
            self.run("MERGE (l:Library {name:$name})", name=lib)
            self.run(
                """
                MATCH (f:File {path:$path}), (l:Library {name:$lib})
                MERGE (f)-[:IMPORTS]->(l)
                """,
                path=fi.path, lib=lib,
            )

    def _emb(self, text: str) -> List[float]:
        try:
            return self.embedder.embed([text])[0]
        except Exception:
            # Fallback to zero vector to avoid failing sync when embeddings backend is unavailable
            return [0.0] * getattr(self.embedder, 'dim', 384)

    def upsert_class(self, fi: FileInfo, ci: ClassInfo, workspace_id: Optional[str]):
        text = "\n\n".join([
            f"# Class: {ci.qualname}", ci.docstring or "", ci.source or "",
        ])
        emb = self._emb(text)
        self.run(
            """
            MERGE (c:Class {qualname:$qual})
            SET c.name=$name, c.docstring=$doc, c.source=$src, c.file_path=$fp, c.embedding=$emb, c.workspaceId=$wid
            WITH c
            MATCH (f:File {path:$fp})
            MERGE (f)-[:CONTAINS]->(c)
            """,
            qual=ci.qualname, name=ci.name, doc=ci.docstring, src=ci.source, fp=fi.path, emb=emb, wid=workspace_id,
        )

    def upsert_function(self, fi: FileInfo, fun: FunctionInfo, workspace_id: Optional[str]):
        sig_hint = f"def {fun.name}(...)"
        text = "\n\n".join([
            f"# Function: {fun.qualname}", fun.docstring or "", sig_hint, fun.source or "",
        ])
        emb = self._emb(text)
        self.run(
            """
            MERGE (fn:Function {qualname:$qual})
            SET fn.name=$name, fn.docstring=$doc, fn.source=$src, fn.file_path=$fp, fn.class_name=$cls, fn.embedding=$emb, fn.workspaceId=$wid
            WITH fn
            MATCH (f:File {path:$fp})
            MERGE (f)-[:CONTAINS]->(fn)
            """,
            qual=fun.qualname, name=fun.name, doc=fun.docstring, src=fun.source, fp=fi.path, cls=fun.class_name, emb=emb, wid=workspace_id,
        )
        if fun.class_name:
            self.run(
                """
                MATCH (c:Class {qualname:$cqual}), (fn:Function {qualname:$fqual})
                MERGE (c)-[:DECLARES]->(fn)
                """,
                cqual=f"{fi.path.replace(os.sep, '.')}.{fun.class_name}", fqual=fun.qualname,
            )

    def link_calls(self, workspace_id: Optional[str]):
        # Delete only relationships within the same workspace to avoid cross-workspace links
        if workspace_id is None:
            self.run(
                """
                MATCH (a:Function)-[r:CALLS]->(b:Function)
                WHERE a.workspaceId IS NULL AND b.workspaceId IS NULL
                DELETE r
                """,
            )
        else:
            self.run(
                """
                MATCH (a:Function {workspaceId:$wid})-[r:CALLS]->(b:Function {workspaceId:$wid})
                DELETE r
                """,
                wid=workspace_id,
            )
        self.run(
            """
            MATCH (callee:Function)
            WHERE $wid IS NULL OR callee.workspaceId = $wid
            WITH collect({name: callee.name, q: callee.qualname}) AS targets
            UNWIND targets AS t
            MATCH (caller:Function)
            WHERE (($wid IS NULL OR caller.workspaceId = $wid) AND caller.source CONTAINS (t.name + "("))
            WITH caller, t
            MATCH (callee:Function {qualname:t.q})
            MERGE (caller)-[:CALLS]->(callee)
            """,
            wid=workspace_id,
        )


class GraphService:
    def __init__(self):
        self.uri = os.getenv("NEO4J_URI", "bolt://localhost:7687")
        self.user = os.getenv("NEO4J_USERNAME", "neo4j")
        self.pwd = os.getenv("NEO4J_PASSWORD", "neo4j")
        self.embedder: Optional[Embedder] = None
        self.writer: Optional[Neo4jWriter] = None
        self.workspaces_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "server_workspaces"))
        os.makedirs(self.workspaces_root, exist_ok=True)
        # Load tunables from config.yaml if present
        self.conf = {
            "graphrag": {
                "top_k": 8,
                "fallback_top_k": 5,
                "request_timeout_seconds": 60,
                "max_context_tokens": 8192,
                "prelude_enabled": True,
                "workspace_scope": True,
            }
        }
        try:
            import yaml  # type: ignore
            with open(os.path.join(os.path.dirname(__file__), "config.yaml"), "r", encoding="utf-8") as f:
                data = yaml.safe_load(f) or {}
                if isinstance(data, dict) and "graphrag" in data:
                    self.conf["graphrag"].update(data["graphrag"] or {})
        except Exception:
            pass

    def _ensure_embedder(self) -> None:
        if self.embedder is None:
            self.embedder = Embedder()

    def _ensure_writer(self) -> None:
        if self.writer is None:
            self._ensure_embedder()
            self.writer = Neo4jWriter(self.uri, self.user, self.pwd, self.embedder)

    def _ws_dir(self, workspace_id: str) -> str:
        d = os.path.join(self.workspaces_root, workspace_id)
        os.makedirs(d, exist_ok=True)
        return d

    def clear_workspace(self, workspace_id: str) -> None:
        # Remove all files in server mirror and clear graph nodes
        root = self._ws_dir(workspace_id)
        for dirpath, _, filenames in os.walk(root):
            for fn in filenames:
                try:
                    os.remove(os.path.join(dirpath, fn))
                except Exception:
                    pass
        self._ensure_writer()
        # Delete all nodes for this workspace's files
        self.writer.run("""
        MATCH (f:File) WHERE f.path STARTS WITH ''
        WITH collect(f.path) AS fps
        // We don't encode workspace id into node; safest is full reset between projects if requested
        """)

    def clear_all(self) -> None:
        # Hard reset graph (useful when switching projects)
        self._ensure_writer()
        self.writer.run("MATCH (n) DETACH DELETE n")

    def compute_manifest(self, workspace_id: str) -> Dict[str, str]:
        root = self._ws_dir(workspace_id)
        out: Dict[str, str] = {}
        for dirpath, _, filenames in os.walk(root):
            for fn in filenames:
                p = os.path.join(dirpath, fn)
                rel = os.path.relpath(p, root).replace("\\", "/")
                try:
                    with open(p, "rb") as f:
                        out[rel] = hashlib.sha256(f.read()).hexdigest()
                except Exception:
                    continue
        return out

    def get_file_content(self, workspace_id: str, rel_path: str) -> str:
        root = self._ws_dir(workspace_id)
        rel = rel_path.replace("\\", "/").lstrip("./")
        p = os.path.join(root, rel)
        try:
            with open(p, "r", encoding="utf-8") as f:
                return f.read()
        except Exception:
            return ""

    def _write_text(self, abs_path: str, content: str) -> None:
        dir_path = os.path.dirname(abs_path)
        if dir_path and not os.path.exists(dir_path):
            os.makedirs(dir_path, exist_ok=True)
        with open(abs_path, "w", encoding="utf-8") as f:
            f.write(content)

    def apply_changes(self, workspace_id: str, changes: List[Dict[str, str]]) -> Dict[str, int]:
        root = self._ws_dir(workspace_id)
        added = modified = deleted = upserts = 0
        touched: List[str] = []
        dmp = diff_match_patch() if diff_match_patch else None
        ignore_dirs = {
            "node_modules", ".git", ".venv", "venv", "env", "ENV", 
            "Lib", "lib", "site-packages", "dist", "build", "out", "__pycache__", ".python_packages"
        }

        for ch in changes:
            rel = ch["path"].replace("\\", "/").lstrip("./")
            abs_path = os.path.join(root, rel)
            status = ch["status"]
            mode = ch.get("mode", "full")

            # Backend-side guard: skip venv/vendor/artifact paths
            rel_norm = f"/{rel}/"
            if any(f"/{seg}/" in rel_norm for seg in ignore_dirs):
                continue

            if status in ("added", "modified"):
                if mode == "patch" and dmp is not None:
                    base = self.get_file_content(workspace_id, rel)
                    patch_text = ch.get("patch", "")
                    try:
                        patches = dmp.patch_fromText(patch_text)
                        new_text, results = dmp.patch_apply(patches, base)
                        if not all(results):
                            content = ch.get("content", "")
                            self._write_text(abs_path, content)
                        else:
                            self._write_text(abs_path, new_text)
                    except Exception:
                        content = ch.get("content", "")
                        self._write_text(abs_path, content)
                else:
                    content = ch.get("content", "")
                    self._write_text(abs_path, content)

                touched.append(abs_path)
                if status == "added":
                    added += 1
                else:
                    modified += 1

            elif status == "deleted":
                try:
                    if os.path.exists(abs_path):
                        os.remove(abs_path)
                except Exception:
                    pass
                # delete from graph too
                self._ensure_writer()
                self.writer.clear_file(rel, workspace_id)
                deleted += 1

        if touched:
            self._ensure_writer()
        for p in touched:
            fi = parse_file(p, root)
            self.writer.upsert_file(fi, workspace_id)
            for c in fi.classes:
                self.writer.upsert_class(fi, c, workspace_id)
            for fn in fi.functions:
                self.writer.upsert_function(fi, fn, workspace_id)
            # Fallback: if no functions parsed, create pseudo functions from classes for RAG visibility
            if not fi.functions and fi.classes:
                for c in fi.classes:
                    pseudo_fun = FunctionInfo(
                        name=c.name,
                        qualname=c.qualname + ".__class__",
                        lineno=c.lineno,
                        docstring=c.docstring,
                        source=c.source,
                        file_path=fi.path,
                        class_name=None,
                        calls=set(),
                    )
                    self.writer.upsert_function(fi, pseudo_fun, workspace_id)
            upserts += 1

        if touched or deleted:
            self.writer.link_calls(workspace_id)

        return {"added": added, "modified": modified, "deleted": deleted, "upserts": upserts}

    def rag_answer(self, question: str, workspace_id: Optional[str] = None) -> str:
        self._ensure_writer()
        if GraphRAG is None or VectorRetriever is None or OpenAILLM is None:
            try:
                self._ensure_embedder()
                vec = self.embedder.embed([question])[0]
                with self.writer.driver.session() as s:
                    res = s.run(
                        """
                        WITH $v AS q
                        MATCH (fn:Function) WHERE fn.embedding IS NOT NULL AND ($wid IS NULL OR fn.workspaceId = $wid)
                        CALL db.index.vector.queryNodes('function_embedding', $k, q) YIELD node, score
                        WITH node, score WHERE ($wid IS NULL OR node.workspaceId = $wid)
                        RETURN node.qualname AS q, score
                        """,
                        v=vec, wid=workspace_id, k=int(self.conf["graphrag"].get("fallback_top_k", 5)),
                    )
                    rows = [f"{r['q']} (score={r['score']:.4f})" for r in res]
                return "Top functions:\n" + "\n".join(rows)
            except Exception:
                return "GraphRAG not available and no vector index reachable."

        with self.writer.driver.session() as s:
            c = s.run("MATCH (n:Function) WHERE n.embedding IS NOT NULL AND ($wid IS NULL OR n.workspaceId = $wid) RETURN count(n) AS c", wid=workspace_id).single()["c"]
            if not c:
                return "No functions with embeddings found."

        llm = OpenAILLM(model_name="gpt-4o-mini")
        retriever = VectorRetriever(self.writer.driver, index_name="function_embedding", embedder=GraphRAGEmbedderAdapter(self.embedder))
        rag = GraphRAG(llm=llm, retriever=retriever)
        # Provide a workspace-scoped prelude to steer retrieval (optional)
        prelude_enabled = bool(self.conf["graphrag"].get("prelude_enabled", True))
        prelude = ""
        if prelude_enabled and workspace_id:
            prelude = f"Only use functions where workspaceId={workspace_id}.\n"
        # Best-effort: apply top_k to retriever if supported (VectorRetriever top_k param not exposed here, rely on index query default)
        result = rag.search(f"{prelude}{question}")
        return getattr(result, "answer", str(result))


