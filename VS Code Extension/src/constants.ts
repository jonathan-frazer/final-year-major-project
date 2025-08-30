// File extension to comment syntax mapping
export const COMMENT_SYNTAX_MAP: { [key: string]: { start: string; end?: string } } = {
  // Main OOP Programming languages only
  '.py': { start: '#' },      // Python
  '.java': { start: '//' },   // Java
  '.cpp': { start: '//' },    // C++
  '.c': { start: '//' },      // C
  '.cs': { start: '//' },     // C#
  '.js': { start: '//' },     // JavaScript
  '.ts': { start: '//' },     // TypeScript
  '.php': { start: '//' }     // PHP
};

// File extensions to ignore (non-code files)
export const IGNORED_EXTENSIONS = [
  '.exe', '.dll', '.so', '.dylib', '.bin', '.obj', '.o',
  '.zip', '.tar', '.gz', '.rar', '.7z',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.ico',
  '.mp3', '.mp4', '.avi', '.mov', '.wav', '.flac',
  '.db', '.sqlite', '.mdb', '.accdb',
  '.log', '.tmp', '.temp', '.cache'
];

// Directories to ignore
export const IGNORED_DIRECTORIES = [
  'node_modules', '.git', '.vscode', 'dist', 'build', 'out',
  'target', 'bin', 'obj', '.vs', '.idea', '.cache','venv'
];

// API Configuration
export const API_BASE_URL = 'http://localhost:8000';
export const API_ENDPOINT = '/api/generate-header';

// AI Header identifier for detecting existing headers
export const AI_HEADER_IDENTIFIER = "NeuroDoc";
