import * as http from 'http';
import * as vscode from 'vscode';
import { AIResponse } from './types';
import { API_BASE_URL, API_ENDPOINT } from './constants';

/**
 * Calls the AI API to generate header comments for file content
 * @param content The file content to process
 * @param filename The filename
 * @returns Promise<AIResponse | null> The AI response or null if failed
 */
export async function callAIApi(content: string, filename: string): Promise<AIResponse | null> {
  try {
    const requestBody = {
      content: content,
      filename: filename
    };

    const postData = JSON.stringify(requestBody);
    const url = new URL(`${API_BASE_URL}${API_ENDPOINT}`);
    
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    return new Promise((resolve, reject) => {
      const req = http.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
              const responseData = JSON.parse(data);
              resolve(responseData as AIResponse);
            } else {
              reject(new Error(`HTTP error! status: ${res.statusCode}`));
            }
          } catch (parseError) {
            reject(new Error(`Failed to parse response: ${parseError}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.write(postData);
      req.end();
    });

  } catch (error) {
    console.error('Error calling AI API:', error);
    
    // Show user-friendly error message
    if (error instanceof Error && error.message.includes('ECONNREFUSED')) {
      vscode.window.showErrorMessage(
        'Failed to connect to AI API. Make sure the FastAPI server is running on localhost:8000'
      );
    } else {
      vscode.window.showErrorMessage(`AI API Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    return null;
  }
}
