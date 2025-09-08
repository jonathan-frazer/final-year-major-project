from fastapi import FastAPI, UploadFile, File, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import google.generativeai as genai
import yaml
import os
import time
from typing import Optional, List, Dict, Literal
from datetime import datetime
from dotenv import load_dotenv
import json
import re

# Load environment variables from .env file
load_dotenv()
with open("config.yaml", "r") as f:
    config = yaml.safe_load(f)

# Get API key from environment variable
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise ValueError("GEMINI_API_KEY environment variable not found. Please set it in your .env file.")

# Configure Gemini
genai.configure(api_key=api_key)
model = genai.GenerativeModel(config["model_name"])

app = FastAPI(title="AI Header Commenter API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this properly for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class CodeRequest(BaseModel):
    content: str
    filename: str
    language: Optional[str] = None

class HeaderComment(BaseModel):
    purpose: str
    example: str
    related_classes: str

class HeaderResponse(BaseModel):
    success: bool
    original_content: str
    header_comment: HeaderComment
    modified_content: str
    language: str
    filename: str

def detect_language(filename: str) -> str:
    """Detect programming language from file extension"""
    ext = filename.lower().split('.')[-1]
    language_map = {
        'py': 'Python',
        'java': 'Java',
        'cpp': 'C++',
        'c': 'C',
        'cs': 'C#',
        'js': 'JavaScript',
        'ts': 'TypeScript',
        'php': 'PHP'
    }
    return language_map.get(ext, 'Unknown')

def get_comment_syntax(language: str) -> tuple[str, str]:
    """Get comment syntax for the given language"""
    syntax_map = {
        'Python': ('"""', '"""'),      # Triple quotes for multiline
        'Java': ('/*', '*/'),          # C-style multiline comments
        'C++': ('/*', '*/'),           # C-style multiline comments
        'C': ('/*', '*/'),             # C-style multiline comments
        'C#': ('/*', '*/'),            # C-style multiline comments
        'JavaScript': ('/*', '*/'),    # C-style multiline comments
        'TypeScript': ('/*', '*/'),    # C-style multiline comments
        'PHP': ('/*', '*/')            # C-style multiline comments
    }
    return syntax_map.get(language, ('/*', '*/'))

def generate_header_comment(code_content: str, filename: str, language: str) -> HeaderComment:
    """Generate AI header comment using structured output"""
    
    # Create the structured prompt
    prompt = f"""Analyze this {language} code and generate a structured header comment.
    
    Code to analyze:
    ```{language}
    {code_content[:1500]}  # Limit to first 1500 chars to avoid token limits
    ```
    
    Generate a JSON response with the following structure:
    {{
        "purpose": "Brief description of what the code does",
        "example": "Multiline usage example. Use \\n for line breaks to show multiple lines of code or usage patterns. If not applicable, use 'N/A'",
        "related_classes": "List of classes as comma-separated string or 'N/A' if none"
    }}
    
    IMPORTANT: 
    - For related_classes, if there are multiple classes, format them as a comma-separated string like "Class1, Class2, Class3". Do NOT use arrays or lists.
    - For examples, you can use \\n to create multiline examples that show proper usage patterns.
    
    Focus on being concise and accurate. Do not include any code in the response, only the JSON structure.
    """
    
    try:
        # Use Gemini's structured output
        response = model.generate_content(prompt)
        
        # Try to parse the response as JSON
        try:
            # Clean the response text to extract JSON
            response_text = response.text.strip()
            
            # Find JSON content between ```json and ``` or just parse the whole response
            if "```json" in response_text:
                json_start = response_text.find("```json") + 7
                json_end = response_text.find("```", json_start)
                if json_end != -1:
                    json_content = response_text[json_start:json_end].strip()
                else:
                    json_content = response_text[json_start:].strip()
            else:
                json_content = response_text
            
            # Parse the JSON and create HeaderComment object
            parsed_data = json.loads(json_content)
            
            # Ensure related_classes is a string (convert list to comma-separated string if needed)
            if 'related_classes' in parsed_data and isinstance(parsed_data['related_classes'], list):
                parsed_data['related_classes'] = ', '.join(parsed_data['related_classes'])
            
            return HeaderComment(**parsed_data)
            
        except (json.JSONDecodeError, KeyError) as e:
            # Fallback: create a basic header if JSON parsing fails
            return HeaderComment(
                purpose=f"Code analysis failed: {str(e)}",
                example="N/A",
                related_classes="N/A"
            )
            
    except Exception as e:
        return HeaderComment(
            purpose=f"Header comment generation failed: {str(e)}",
            example="N/A",
            related_classes="N/A"
        )

def format_header_comment(header: HeaderComment, language: str) -> str:
    """Format the header comment with proper syntax for the language"""
    comment_start, comment_end = get_comment_syntax(language)
    
    # Create the multiline header comment
    header_lines = [
        f"PURPOSE: {header.purpose}",
        f"EXAMPLE: {header.example.replace('\\n', '\n')}",  # Convert \n to actual line breaks
        f"RELATED CLASSES: {header.related_classes}"
    ]
    
    # Format as multiline comment
    multiline_header = f"{comment_start}\n" + '\n'.join(header_lines) + f"\n{comment_end}"
    
    # Add NeuroDoc as a separate single-line comment below
    if language == 'Python':
        neurodoc_comment = "# NeuroDoc"
    else:
        neurodoc_comment = "// NeuroDoc"
    
    return f"{multiline_header}\n{neurodoc_comment}"

@app.post("/api/generate-header", response_model=HeaderResponse)
async def generate_header(request: CodeRequest) -> HeaderResponse:
    """Generate AI header comment for a code file"""
    try:
        # Detect language if not provided
        if not request.language:
            request.language = detect_language(request.filename)
        
        # Generate structured header comment
        header_comment = generate_header_comment(request.content, request.filename, request.language)
        
        # Format the header with proper comment syntax
        formatted_header = format_header_comment(header_comment, request.language)
        
        # Return the modified content with header above the code
        modified_content = f"{formatted_header}\n\n{request.content}"
        
        return HeaderResponse(
            success=True,
            original_content=request.content,
            header_comment=header_comment,
            modified_content=modified_content,
            language=request.language,
            filename=request.filename
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating header: {str(e)}")

@app.get("/")
async def root():
    """Health check endpoint"""
    return {"message": "AI Code Header Generator API", "status": "running"}

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "AI Code Header Generator"}

# ---------------- GraphRAG Integration ----------------
# Optional GraphRAG integration: keep this import guarded so the API can
# start and serve core endpoints even if Neo4j/GraphRAG dependencies
# are not installed or reachable.
try:
    from graphrag_service import GraphService
    _graph_service = GraphService()
except Exception as _e:
    _graph_service = None


class ChangeItem(BaseModel):
    path: str
    status: Literal["added", "modified", "deleted"]
    mode: Optional[Literal["full", "patch"]] = "full"
    content: Optional[str] = None
    patch: Optional[str] = None


class SyncRequest(BaseModel):
    workspaceId: str
    changes: List[ChangeItem]
    replace: Optional[bool] = False


class SyncResponse(BaseModel):
    success: bool
    counts: Dict[str, int]


class RagRequest(BaseModel):
    question: str
    workspaceId: Optional[str] = None


class RagResponse(BaseModel):
    success: bool
    answer: str


@app.get("/api/graph/status")
async def graph_status():
    if _graph_service is None:
        raise HTTPException(status_code=500, detail="Graph service not initialized.")
    try:
        with _graph_service.writer.driver.session() as s:
            c_files = s.run("MATCH (n:File) RETURN count(n) AS c").single()["c"]
            c_classes = s.run("MATCH (n:Class) RETURN count(n) AS c").single()["c"]
            c_funcs = s.run("MATCH (n:Function) RETURN count(n) AS c").single()["c"]
        return {"files": c_files, "classes": c_classes, "functions": c_funcs}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/graph/manifest")
async def graph_manifest(workspaceId: str = Query(...)):
    if _graph_service is None:
        raise HTTPException(status_code=500, detail="Graph service not initialized.")
    return {"manifest": _graph_service.compute_manifest(workspaceId)}


@app.get("/api/graph/file")
async def graph_file(workspaceId: str = Query(...), path: str = Query(...)):
    if _graph_service is None:
        raise HTTPException(status_code=500, detail="Graph service not initialized.")
    content = _graph_service.get_file_content(workspaceId, path)
    return {"content": content}


@app.post("/api/graph/sync", response_model=SyncResponse)
async def sync_graph(req: SyncRequest) -> SyncResponse:
    if _graph_service is None:
        raise HTTPException(status_code=500, detail="Graph service not initialized.")
    try:
        # Optional full replacement if extension switches to a different workspace
        replace = False
        try:
            # Backwards-compatible: SyncRequest may not have 'replace'
            replace = bool(getattr(req, 'replace', False))  # type: ignore
        except Exception:
            replace = False
        if replace:
            try:
                _graph_service.clear_all()
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Failed to clear graph: {e}")
        counts = _graph_service.apply_changes(req.workspaceId, [c.model_dump() for c in req.changes])
        return SyncResponse(success=True, counts=counts)
    except RuntimeError as e:
        if str(e) == "NEO4J_UNAVAILABLE":
            raise HTTPException(status_code=503, detail="Neo4j is not reachable at NEO4J_URI. Start Neo4j and retry.")
        raise


@app.post("/api/graph/rag", response_model=RagResponse)
async def rag(req: RagRequest) -> RagResponse:
    if _graph_service is None:
        raise HTTPException(status_code=500, detail="Graph service not initialized.")
    try:
        ans = _graph_service.rag_answer(req.question, getattr(req, 'workspaceId', None))
        return RagResponse(success=True, answer=ans)
    except RuntimeError as e:
        if str(e) == "NEO4J_UNAVAILABLE":
            raise HTTPException(status_code=503, detail="Neo4j is not reachable at NEO4J_URI. Start Neo4j and retry.")
        raise

if __name__ == "__main__":
    # Import uvicorn only when running this module directly to avoid
    # forcing the dependency at import time (e.g., when used by another
    # process/ASGI server or during tests).
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
