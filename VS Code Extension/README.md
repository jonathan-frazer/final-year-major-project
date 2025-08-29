# AI Header Commenter

A VS Code extension that generates AI-powered header comments for code files using a custom REST API powered by Google Gemini 2.0 Flash.

## Features

- **AI-Powered Documentation**: Uses Google Gemini 2.0 Flash to generate intelligent, contextual header comments
- **Multi-language Support**: Automatically detects file extensions and applies the correct comment syntax
- **Workspace-wide Processing**: Processes all code files in your current workspace
- **Smart Filtering**: Skips non-code files and ignored directories
- **Progress Tracking**: Shows real-time progress while processing files
- **Smart Duplicate Prevention**: Only skips files with AI-generated headers (NeuroDoc identifier), preserves user comments
- **Custom API Integration**: Connects to your FastAPI backend for AI processing

## How It Works

The extension:

1. **Scans your workspace** for all code files
2. **Filters out non-code files** and ignored directories
3. **Calls your AI API** for each code file to generate intelligent header comments
4. **Applies appropriate comment syntax** based on file extension
5. **Updates files** with AI-generated documentation
6. **Skips files** that already have AI-generated headers (identified by NeuroDoc identifier)

## Prerequisites

Before using this extension, you need:

1. **FastAPI Backend Running**: The extension connects to `http://localhost:8000`
2. **Google Gemini API Key**: Configured in your FastAPI backend
3. **Code Files**: Open a workspace with code files to process

## Usage

### Workspace-wide Processing

1. **Open a workspace** in VS Code with code files
2. **Press `Ctrl+Shift+P`** (or `Cmd+Shift+P` on Mac) to open the command palette
3. **Type "Call AI Documentor (Workspace)"** and select the command
4. **Wait for processing** - the extension will show progress for each file
5. **Review results** - see how many files were successfully processed

### Single File Processing

1. **Open a code file** in VS Code
2. **Press `Ctrl+Shift+P`** (or `Cmd+Shift+P` on Mac) to open the command palette
3. **Type "Generate AI Header for Current File"** and select the command
4. **Wait for processing** - the extension will analyze and add a header to the current file
5. **Review the generated header** above your code

## Supported File Types

**Main Object-Oriented Programming Languages:**

- **Python** (`.py`): `"""Multiline comment with \n support"""` + `# NeuroDoc`
- **Java** (`.java`): `/* Multiline comment with \n support */` + `// NeuroDoc`
- **C++** (`.cpp`): `/* Multiline comment with \n support */` + `// NeuroDoc`
- **C** (`.c`): `/* Multiline comment with \n support */` + `// NeuroDoc`
- **C#** (`.cs`): `/* Multiline comment with \n support */` + `// NeuroDoc`
- **JavaScript** (`.js`): `/* Multiline comment with \n support */` + `// NeuroDoc`
- **TypeScript** (`.ts`): `/* Multiline comment with \n support */` + `// NeuroDoc`
- **PHP** (`.php`): `/* Multiline comment with \n support */` + `// NeuroDoc`

_Note: Focused on core programming languages for optimal AI analysis and documentation quality. Other file types are automatically ignored._

## Special Identifier

The extension uses a special identifier **NeuroDoc** embedded within the comment syntax to identify AI-generated headers. This ensures:

- **Smart Detection**: Only skips files that already have AI-generated headers
- **User Comment Preservation**: User-added comments are never overwritten
- **Reliable Processing**: Clear identification of which files have been processed
- **Clean Format**: Identifier is contained within the comment bounds, not as a separate line

## API Integration

The extension connects to your FastAPI backend at `http://localhost:8000/api/generate-header` with:

**Request Format:**

```json
{
  "content": "your code content",
  "filename": "example.py"
}
```

**Response Format:**

```json
{
  "success": true,
  "modified_content": "# AI generated comment\nyour code content",
  "language": "Python",
  "filename": "example.py"
}
```

## Ignored Files and Directories

The extension automatically ignores:

- Binary files (`.exe`, `.dll`, `.so`, etc.)
- Media files (`.jpg`, `.mp3`, `.mp4`, etc.)
- Archive files (`.zip`, `.tar`, `.rar`, etc.)
- Build directories (`node_modules`, `.git`, `dist`, `build`, etc.)

## Installation

### From Source

1. Clone this repository
2. Run `npm install` to install dependencies
3. Run `npm run compile` to build the extension
4. Press `F5` in VS Code to run the extension in a new Extension Development Host window

### Development

- `npm run compile` - Compile the TypeScript code
- `npm run watch` - Watch for changes and recompile automatically

## Configuration

The extension is configured to connect to:

- **API Base URL**: `http://localhost:8000`
- **Endpoint**: `/api/generate-header`

To change these settings, modify the constants in `src/extension.ts`:

```typescript
const API_BASE_URL = "http://localhost:8000";
const API_ENDPOINT = "/api/generate-header";
```

## Troubleshooting

### Common Issues

1. **"Failed to connect to AI API"**

   - Make sure your FastAPI backend is running on localhost:8000
   - Check that the server is accessible

2. **"No code files found"**

   - Ensure your workspace contains files with supported extensions
   - Check that files aren't in ignored directories

3. **"AI API Error"**
   - Verify your Gemini API key is valid
   - Check the FastAPI server logs for errors

### Debug Mode

Enable debug logging by opening the Developer Console in VS Code:

1. Press `Ctrl+Shift+P` → "Developer: Toggle Developer Tools"
2. Check the Console tab for detailed error messages

## Contributing

Feel free to submit issues and enhancement requests!

## License

This extension is part of a Major Project for college coursework.
