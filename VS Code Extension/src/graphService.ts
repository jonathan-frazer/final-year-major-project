import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as vscode from 'vscode';
import * as http from 'http';
import { API_BASE_URL } from './constants';

type ChangeItem = { path: string; status: 'added'|'modified'|'deleted'; mode?: 'full'|'patch'; content?: string; patch?: string };

function sha256(data: Buffer | string): string {
  const h = crypto.createHash('sha256');
  h.update(data);
  return h.digest('hex');
}

function workspaceIdFor(root: string): string {
  return sha256(root).slice(0, 16);
}

async function readAllFiles(root: string): Promise<string[]> {
  const out: string[] = [];
  async function walk(dir: string) {
    const entries = await fs.promises.readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        const name = e.name;
        if ([
          '.git','node_modules','.venv','venv','env','ENV','.python_packages',
          'dist','build','out','__pycache__','Lib','lib','site-packages','Include','Scripts','bin'
        ].includes(name)) continue;
        // Skip any directory path containing site-packages or dist-info
        const lowerFull = full.toLowerCase();
        if (lowerFull.includes('site-packages') || lowerFull.includes('dist-info')) continue;
        await walk(full);
      } else {
        const lower = full.toLowerCase();
        if (lower.includes('site-packages') || lower.includes('dist-info')) continue;
        out.push(full);
      }
    }
  }
  await walk(root);
  return out;
}

async function fetchJSON(urlStr: string, options?: { method?: 'GET'|'POST'; body?: string; headers?: Record<string,string> }): Promise<any> {
  const url = new URL(urlStr);
  const port = url.port ? parseInt(url.port, 10) : (url.protocol === 'https:' ? 443 : 80);
  const opts = {
    hostname: url.hostname,
    port,
    path: url.pathname + (url.search || ''),
    method: options?.method || 'GET',
    headers: options?.headers || {},
  } as any;
  return new Promise((resolve, reject) => {
    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', (c) => data += c);
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          try { resolve(data ? JSON.parse(data) : {}); } catch (e) { reject(e); }
        } else {
          reject(new Error(`HTTP ${res.statusCode}`));
        }
      });
    });
    req.on('error', reject);
    if (options?.body) req.write(options.body);
    req.end();
  });
}

async function fetchServerManifest(root: string): Promise<Record<string,string>> {
  const wsid = workspaceIdFor(root);
  const res = await fetchJSON(`${API_BASE_URL}/api/graph/manifest?workspaceId=${encodeURIComponent(wsid)}`);
  return (res && res.manifest) ? res.manifest as Record<string,string> : {};
}

async function fetchServerFile(root: string, rel: string): Promise<string> {
  const wsid = workspaceIdFor(root);
  const res = await fetchJSON(`${API_BASE_URL}/api/graph/file?workspaceId=${encodeURIComponent(wsid)}&path=${encodeURIComponent(rel)}`);
  return (res && typeof res.content === 'string') ? res.content : '';
}

export async function runRag(question: string): Promise<string> {
  const wsid = workspaceIdFor(vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '');
  const body = JSON.stringify({ question, workspaceId: wsid });
  const res = await fetchJSON(`${API_BASE_URL}/api/graph/rag`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body).toString() },
    body
  });
  return (res && res.answer) ? res.answer : '';
}

export async function syncGraph(root: string): Promise<{added:number;modified:number;deleted:number;upserts:number}> {
  const serverMan = await fetchServerManifest(root);
  const files = await readAllFiles(root);
  const localMap: Record<string,string> = {};
  const changes: ChangeItem[] = [];

  for (const abs of files) {
    const rel = path.relative(root, abs).replace(/\\/g,'/');
    if (rel === '.graphrag-manifest.json') continue;
    const buf = await fs.promises.readFile(abs);
    const text = buf.toString('utf-8');
    const hash = sha256(buf);
    localMap[rel] = hash;
    if (!(rel in serverMan)) {
      changes.push({ path: rel, status: 'added', mode: 'full', content: text });
    } else if (serverMan[rel] !== hash) {
      // Try to fetch server version and compute simple content fallback (we skip patch generation for now to reduce client complexity)
      changes.push({ path: rel, status: 'modified', mode: 'full', content: text });
    }
  }

  for (const rel of Object.keys(serverMan)) {
    if (!(rel in localMap)) {
      changes.push({ path: rel, status: 'deleted' });
    }
  }

  if (changes.length === 0) {
    vscode.window.showInformationMessage('Graph is up to date.');
    return {added:0,modified:0,deleted:0,upserts:0};
  }

  const wsid = workspaceIdFor(root);
  const doReplace = Object.keys(serverMan || {}).length === 0;
  const payload = JSON.stringify({ workspaceId: wsid, changes, replace: doReplace });
  const res = await fetchJSON(`${API_BASE_URL}/api/graph/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload).toString() },
    body: payload
  });
  return (res && res.counts) ? res.counts : {added:0,modified:0,deleted:0,upserts:0};
}


