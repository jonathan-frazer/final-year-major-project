# FastAPI Backend - AI Code Header Generator

A simple FastAPI backend that generates AI-powered header comments for code files using Google Gemini 2.0 Flash.

## Features

- **Simple REST API**: Single endpoint to generate header comments
- **Multi-language Support**: Automatically detects programming language from file extension
- **AI-Powered**: Uses Google Gemini 2.0 Flash for intelligent comment generation
- **CORS Enabled**: Ready for frontend integration
- **Async Processing**: Fast and efficient request handling

## Setup

1. **Install Dependencies**:

   ```bash
   pip install -r requirements.txt
   ```

2. **Configure API Key**:

   - Copy `config.yaml.example` to `config.yaml`
   - Add your Google Gemini API key to `config.yaml`
   - Or set environment variable: `GEMINI_API_KEY=your_key_here`

3. **Run the Server**:

   ```bash
   python main.py
   ```

   Or with uvicorn directly:

   ```bash
   uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```

## API Endpoints

### POST `/api/generate-header`

Generates an AI header comment for a code file.

**Request Body**:

```json
{
  "content": "your code content here",
  "filename": "example.py",
  "language": "Python" // Optional, auto-detected if not provided
}
```

**Response**:

```json
{
  "success": true,
  "original_content": "your code content here",
  "header_comment": {
    "purpose": "Calculate Fibonacci numbers recursively",
    "example": "calculate_fibonacci(10) returns the 10th Fibonacci number",
    "related_classes": "N/A",
    "author": "AI Generated",
    "created": "2024-01-15"
  },
  "modified_content": "\"\"\"\nPURPOSE: Calculate Fibonacci numbers recursively\nEXAMPLE: calculate_fibonacci(10) returns the 10th Fibonacci number\n\n# For a list of numbers:\nnumbers = [1, 2, 3, 4, 5]\nresult = [calculate_fibonacci(n) for n in numbers]\nRELATED CLASSES: N/A\nAUTHOR: AI Generated\nCREATED: 2024-01-15\n\"\"\"\n# NeuroDoc\n\nyour code content here",
  "language": "Python",
  "filename": "example.py"
}
```

**Header Format:**
The AI generates comprehensive headers using structured output with:

- **PURPOSE**: Brief description of what the file does
- **EXAMPLE**: Usage example or "N/A" if not applicable
- **RELATED CLASSES**: List of classes or "N/A" if none
- **AUTHOR**: "AI Generated"
- **CREATED**: Current date
- **NeuroDoc**: Special identifier embedded within the comment syntax

**Structured Generation:**
The API uses Gemini's structured output capabilities with proper Pydantic models to ensure consistent, well-formatted headers that are properly placed above your code without syntax errors.

**Response Model:**
The API returns a validated `HeaderResponse` object with proper type checking and automatic JSON serialization.

### GET `/`

Health check endpoint.

### GET `/health`

Detailed health check.

## Supported Languages

**Main Object-Oriented Programming Languages:**

- **Python** (`.py`) - Object-oriented scripting language
- **Java** (`.java`) - Enterprise OOP language
- **C++** (`.cpp`) - Object-oriented C extension
- **C** (`.c`) - Procedural programming language
- **C#** (`.cs`) - Microsoft's OOP language
- **JavaScript** (`.js`) - Web programming language
- **TypeScript** (`.ts`) - Typed JavaScript
- **PHP** (`.php`) - Server-side web language

_Note: Focused on core programming languages for better AI analysis and documentation quality._

## Usage Example

```bash
curl -X POST "http://localhost:8000/api/generate-header" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "def hello_world():\n    print(\"Hello, World!\")",
    "filename": "hello.py"
  }'
```

## Development

- **Auto-reload**: Use `uvicorn main:app --reload` for development
- **API Documentation**: Visit `http://localhost:8000/docs` for interactive API docs
- **Alternative docs**: Visit `http://localhost:8000/redoc` for ReDoc format

## Error Handling

The API returns appropriate HTTP status codes:

- `200`: Success
- `500`: Internal server error (LLM failure, etc.)
- `422`: Validation error (invalid request body)

## Security Notes

- In production, restrict CORS origins to your VS Code extension domain
- Store API keys securely (environment variables recommended)
- Consider rate limiting for production use
