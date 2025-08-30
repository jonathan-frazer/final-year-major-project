import * as path from 'path';
import * as fs from 'fs';
import { hasHeaderComment } from './utils';
import { callAIApi } from './apiService';

/**
 * Processes a single file with AI to add header comments
 * @param filePath The path to the file to process
 * @returns Promise<boolean> True if successful, false otherwise
 */
export async function processFileWithAI(filePath: string): Promise<boolean> {
  try {
    // Read file content
    const content = await fs.promises.readFile(filePath, 'utf-8');
    const filename = path.basename(filePath);
    
    // Check if file already has a header comment
    if (hasHeaderComment(content, filename)) {
      console.log(`File ${filename} already has a header comment, skipping...`);
      return true;
    }

    // Call AI API
    const aiResponse = await callAIApi(content, filename);
    
    if (aiResponse && aiResponse.success) {
      // Write the modified content back to the file
      await fs.promises.writeFile(filePath, aiResponse.modified_content, 'utf-8');
      console.log(`Successfully added AI header to ${filename}`);
      return true;
    } else {
      console.error(`AI API failed for ${filename}:`, aiResponse);
      return false;
    }

  } catch (error) {
    console.error(`Error processing file ${filePath}:`, error);
    return false;
  }
}
