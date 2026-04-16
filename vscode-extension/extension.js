'use strict';

/**
 * TeamForge VS Code Extension — extension.js
 *
 * Functionality:
 * 1. On startup: display a status bar item "TeamForge: Connected ✓"
 * 2. On every file save: compute a diff against the last known version of the file,
 *    then POST the diff to the TeamForge backend webhook.
 * 3. Command `teamforge.setProjectId`: prompt user to enter a project ID.
 * 4. Command `teamforge.setToken`: prompt user to enter their JWT token.
 *
 * Configuration (settings.json):
 *   teamforge.apiUrl     — backend URL (default: http://localhost:8000)
 *   teamforge.projectId  — project to attribute saves to
 *   teamforge.token      — JWT auth token
 *   teamforge.authorName — display name for changelog entries
 */

const vscode = require('vscode');
const https = require('https');
const http = require('http');
const { execSync } = require('child_process');

// In-memory store of file contents to diff against (path -> content string)
const fileCache = new Map();

// Status bar item reference
let statusBarItem;

/**
 * Extension activation function — called once by VS Code on startup.
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  // ── Status Bar ────────────────────────────────────────────────────────────
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  statusBarItem.text = '$(zap) TeamForge: Active';
  statusBarItem.tooltip = 'TeamForge is tracking file saves for your project';
  statusBarItem.command = 'teamforge.setProjectId';
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  // ── Command: Set Project ID ───────────────────────────────────────────────
  const setProjectId = vscode.commands.registerCommand('teamforge.setProjectId', async () => {
    const input = await vscode.window.showInputBox({
      prompt: 'Enter your TeamForge Project ID',
      placeHolder: 'e.g. 42',
      value: String(getConfig().get('projectId') || ''),
    });
    if (input !== undefined) {
      await getConfig().update('projectId', parseInt(input, 10), vscode.ConfigurationTarget.Workspace);
      vscode.window.showInformationMessage(`TeamForge: Project ID set to ${input}`);
      updateStatusBar();
    }
  });
  context.subscriptions.push(setProjectId);

  // ── Command: Set Auth Token ───────────────────────────────────────────────
  const setToken = vscode.commands.registerCommand('teamforge.setToken', async () => {
    const input = await vscode.window.showInputBox({
      prompt: 'Paste your TeamForge JWT token',
      placeHolder: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      password: true,
    });
    if (input !== undefined) {
      await getConfig().update('token', input, vscode.ConfigurationTarget.Global);
      vscode.window.showInformationMessage('TeamForge: Auth token saved ✓');
      updateStatusBar();
    }
  });
  context.subscriptions.push(setToken);

  // ── File Save Listener ────────────────────────────────────────────────────
  const saveListener = vscode.workspace.onDidSaveTextDocument(async (document) => {
    const cfg = getConfig();
    const projectId = cfg.get('projectId');
    const token = cfg.get('token');

    if (!projectId || !token) {
      // Not configured — silently skip
      return;
    }

    const filePath = document.uri.fsPath;
    const newContent = document.getText();
    const oldContent = fileCache.get(filePath) || '';

    // Build a simple unified diff
    const diff = buildSimpleDiff(filePath, oldContent, newContent);

    // Cache the new content for the next save
    fileCache.set(filePath, newContent);

    if (!diff || diff.trim() === '') {
      // No changes (e.g. save without edits)
      return;
    }

    // Determine author
    const authorName = cfg.get('authorName') || getGitUserName() || 'VS Code User';

    // POST to backend
    const apiUrl = cfg.get('apiUrl') || 'http://localhost:8000';
    const payload = JSON.stringify({
      token,
      file_path: filePath,
      diff,
      project_id: projectId,
      author: authorName,
      timestamp: new Date().toISOString(),
    });

    try {
      await sendRequest(`${apiUrl}/webhooks/vscode`, payload);
      updateStatusBar('✓');
    } catch (err) {
      updateStatusBar('⚠');
      console.error('[TeamForge] Failed to send diff:', err.message);
    }
  });
  context.subscriptions.push(saveListener);

  // ── Preload open documents ────────────────────────────────────────────────
  vscode.workspace.textDocuments.forEach((doc) => {
    fileCache.set(doc.uri.fsPath, doc.getText());
  });

  vscode.workspace.onDidOpenTextDocument((doc) => {
    fileCache.set(doc.uri.fsPath, doc.getText());
  });

  updateStatusBar();
}

/**
 * Called when the extension is deactivated.
 */
function deactivate() {
  fileCache.clear();
  if (statusBarItem) statusBarItem.dispose();
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Return the workspace configuration section for 'teamforge'.
 */
function getConfig() {
  return vscode.workspace.getConfiguration('teamforge');
}

/**
 * Build a minimal unified-diff-style string from two content strings.
 * Not a git diff — just a simple line-by-line comparison for readability.
 *
 * @param {string} filePath
 * @param {string} oldContent
 * @param {string} newContent
 * @returns {string}
 */
function buildSimpleDiff(filePath, oldContent, newContent) {
  const oldLines = oldContent.split('\n');
  const newLines = newContent.split('\n');

  const header = `--- a/${filePath}\n+++ b/${filePath}\n`;
  const lines = [];

  const maxLen = Math.max(oldLines.length, newLines.length);
  for (let i = 0; i < maxLen; i++) {
    const oldLine = oldLines[i];
    const newLine = newLines[i];
    if (oldLine === undefined) {
      lines.push(`+${newLine}`);
    } else if (newLine === undefined) {
      lines.push(`-${oldLine}`);
    } else if (oldLine !== newLine) {
      lines.push(`-${oldLine}`);
      lines.push(`+${newLine}`);
    }
  }

  if (lines.length === 0) return '';
  return header + lines.join('\n');
}

/**
 * Attempt to get the user's git name from the repo config.
 * Returns null if git is unavailable.
 * @returns {string|null}
 */
function getGitUserName() {
  try {
    return execSync('git config user.name', { encoding: 'utf-8' }).trim();
  } catch {
    return null;
  }
}

/**
 * Update the status bar text with an optional suffix (e.g. ✓ or ⚠).
 * @param {string} [suffix]
 */
function updateStatusBar(suffix) {
  const cfg = getConfig();
  const projectId = cfg.get('projectId');
  const hasToken = !!cfg.get('token');

  if (projectId && hasToken) {
    statusBarItem.text = `$(zap) TeamForge: Project ${projectId}${suffix ? ' ' + suffix : ''}`;
    statusBarItem.backgroundColor = undefined;
  } else {
    statusBarItem.text = '$(warning) TeamForge: Setup needed';
    statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
  }
}

/**
 * Send an HTTP/HTTPS POST request with JSON payload.
 *
 * @param {string} urlStr  Full URL to POST to
 * @param {string} body    JSON-stringified body
 * @returns {Promise<string>}
 */
function sendRequest(urlStr, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const requester = url.protocol === 'https:' ? https : http;

    const req = requester.request(
      {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(data);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          }
        });
      }
    );

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

module.exports = { activate, deactivate };
