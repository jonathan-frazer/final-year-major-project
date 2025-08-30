import * as path from 'path';
import * as fs from 'fs';
import { IGNORED_EXTENSIONS, IGNORED_DIRECTORIES, COMMENT_SYNTAX_MAP, AI_HEADER_IDENTIFIER } from './constants';

/**
 * Recursively gets all files in a directory
 * @param dirPath The directory path to scan
 * @returns Promise<string[]> Array of file paths
 */
export async function getAllFiles(dirPath: string): Promise<string[]> {
  const files: string[] = [];
  
  try {
    const items = await fs.promises.readdir(dirPath);
    
    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      const stat = await fs.promises.stat(fullPath);
      
      if (stat.isDirectory()) {
        if (!IGNORED_DIRECTORIES.includes(item)) {
          const subFiles = await getAllFiles(fullPath);
          files.push(...subFiles);
        }
      } else {
        files.push(fullPath);
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dirPath}:`, error);
  }
  
  return files;
}

/**
 * Checks if a file is a supported code file
 * @param filePath The file path to check
 * @returns boolean True if the file is a supported code file
 */
export function isCodeFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return !IGNORED_EXTENSIONS.includes(ext) && COMMENT_SYNTAX_MAP.hasOwnProperty(ext);
}

/**
 * Checks if a file already has an AI-generated header comment
 * @param content The file content to check
 * @param filename The filename (for logging purposes)
 * @returns boolean True if the file has an AI-generated header
 */
export function hasHeaderComment(content: string, filename: string): boolean {
  // Look for the AI header identifier in the first few lines
  const lines = content.split('\n');
  const searchLines = Math.min(20, lines.length); // Check first 20 lines
  
  for (let i = 0; i < searchLines; i++) {
    const line = lines[i].trim();
    // Check if the line contains the identifier in a single-line comment
    if (line.includes(AI_HEADER_IDENTIFIER) && (line.startsWith('#') || line.startsWith('//'))) {
      return true; // File already has AI-generated header
    }
  }
  
  return false; // No AI-generated header found
}
