# AI Code Documentation Generator (NeuroDoc)

NeuroDoc generates AI-powered header comments and provides GraphRAG-based, workspace-scoped code understanding.

## Project Overview

- Neo4j Database: To store the Classes, Methods and files as a knowledge graph
- FastAPI Backend: REST API for AI-powered header generation
- VS Code Extension: integrates AI docs and GraphRAG into your workflow

### VS Code Commands

- NeuroDoc: Sync Graph — auto full-replace for new workspaces; incremental otherwise
- NeuroDoc: Run GraphRAG — writes to `NeuroDoc.md` at the workspace root
- Generate AI Header (Entire Workspace)
- Generate AI Header (Current Folder)
- Generate AI Header (Current File)

Notes:

- Graph sync is per-workspace and tags nodes with `workspaceId`
- RAG retrieval is filtered by workspace to avoid cross-project leakage

GraphRAG is integrated for workspace-scoped analysis using Neo4j and vector search.

## Installation

### 1) Neo4j (Enterprise) via Docker

- Ensure Docker Desktop is running.
- Start Neo4j and create vector indexes:

```
powershell -ExecutionPolicy Bypass -File "Neo4j Database/start_neo4j.ps1"
```

This will:

- Load `.env` (root or `FastAPI Backend/.env`) for `NEO4J_URI`, `NEO4J_USERNAME`, `NEO4J_PASSWORD`, `EMBEDDING_BACKEND`
- Start/attach to `neo4j-graphrag` on ports 7474/7687
- Create vector indexes `function_embedding` and `class_embedding` (1536 for `openai`, 384 for `local`)

### 2) Backend (.venv)

```
cd "FastAPI Backend"
.\venv\Scripts\Activate
python -m pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload //OR python main.py
```

Configure `FastAPI Backend/.env`:

```
EMBEDDING_BACKEND=openai   # or local
OPENAI_API_KEY=sk-...
NEO4J_URI=bolt://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your_password
GEMINI_API_KEY=...
```

Tune GraphRAG in `FastAPI Backend/config.yaml`:

```
graphrag:
  top_k: 8
  fallback_top_k: 5
  request_timeout_seconds: 60
  max_context_tokens: 8192
  prelude_enabled: true
  workspace_scope: true
```

### 3) VS Code Extension

```
cd "VS Code Extension"
npm install
npm run compile
F5 to launch the extension host
```

## How the Flow Works

### 1) Graph Sync (build the knowledge graph)

- Triggered by the VS Code command “NeuroDoc: Sync Graph” (or programmatically via `POST /api/graph/sync`).
- The extension sends a set of file changes (added/modified/deleted), optionally as a patch. The backend mirrors these into a workspace-scoped mirror folder outside your project tree, so reload watchers don’t interfere.
- Each touched file is parsed to extract:
  - Imports/libraries → creates `Library` nodes and `(:File)-[:IMPORTS]->(:Library)` edges
  - Classes/methods and top-level functions → creates `File`, `Class`, and `Function` nodes and `(:File)-[:CONTAINS]->(:Class|:Function)` edges
  - Basic call hints → creates `(:Function)-[:CALLS]->(:Function)` edges (heuristic text matching within function bodies)
- Embeddings are generated for `Class` and `Function` nodes using the configured backend:
  - `EMBEDDING_BACKEND=local` → SentenceTransformer `all-MiniLM-L6-v2` (dim=384)
  - `EMBEDDING_BACKEND=openai` → OpenAI `text-embedding-3-small` (dim=1536)
- Embeddings are cached to a JSON cache on disk and written to Neo4j. Vector indexes are created:
  - `function_embedding` for `:Function(embedding)`
  - `class_embedding` for `:Class(embedding)`
- Uniqueness constraints scope nodes by workspace to avoid cross-project collisions.
- Optional full replace: if `replace=true` is provided in the sync request, the backend clears existing graph content before upserting.

Related endpoints:

- `GET /api/graph/status` → counts of files/classes/functions
- `GET /api/graph/manifest` → server-side workspace file manifest with hashes
- `GET /api/graph/file` → fetch server-side content of a mirrored file

### 2) GraphRAG Querying (optimize the query, then retrieve)

- Triggered by the VS Code command “NeuroDoc: Run GraphRAG” (or `POST /api/graph/rag`).
- Before retrieval, the backend builds a compact graph digest (workspace-scoped): languages present, most-used libraries, likely entry points, high-degree functions.
- Query Optimizer step:
  - The user’s question is rewritten into a focused retrieval query using LLM structured output when available.
  - Primary path: LangChain `with_structured_output` on `ChatOpenAI` to produce a `RewriteSpec` (focused query + short rationale).
  - Fallback path: OpenAI Responses API with a JSON schema to obtain `rewritten_query`.
  - Heuristic fallback: if LLMs are unavailable, a concise reformulation is produced, optionally annotated with the graph digest.
- Retrieval and answer generation:
  - If the external `neo4j_graphrag` stack is not available, a lightweight fallback runs a vector query directly against Neo4j’s `function_embedding` index and returns the top matching functions (debug info optionally included).
  - If available, the system instantiates `OpenAILLM` + `VectorRetriever` and runs `GraphRAG.search(rewritten_query)`. A workspace-scoped prelude is added to keep retrieval within the active workspace.
  - Output is a concise answer synthesized from the retrieved code nodes.

Configuration knobs (see `FastAPI Backend/config.yaml`):

- `graphrag.top_k`, `graphrag.fallback_top_k`, `graphrag.request_timeout_seconds`, `graphrag.max_context_tokens`, `graphrag.prelude_enabled`, `graphrag.workspace_scope`

Environment variables (see `.env`):

- `EMBEDDING_BACKEND` (`local` or `openai`), `OPENAI_API_KEY`, `NEO4J_URI`, `NEO4J_USERNAME`, `NEO4J_PASSWORD`, `GEMINI_API_KEY`

## Supported Languages

| Language   | Extension | Comment Style                     |
| ---------- | --------- | --------------------------------- |
| Python     | `.py`     | `"""Multiline"""` + `# NeuroDoc`  |
| Java       | `.java`   | `/* Multiline */` + `// NeuroDoc` |
| C++        | `.cpp`    | `/* Multiline */` + `// NeuroDoc` |
| C#         | `.cs`     | `/* Multiline */` + `// NeuroDoc` |
| JavaScript | `.js`     | `/* Multiline */` + `// NeuroDoc` |
| TypeScript | `.ts`     | `/* Multiline */` + `// NeuroDoc` |
