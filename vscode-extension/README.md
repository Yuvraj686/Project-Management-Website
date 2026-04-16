# TeamForge VS Code Extension

Track file saves and automatically log AI-summarised code changes to TeamForge.

## Features

- **Auto-tracking**: Every file save sends a diff to the TeamForge backend
- **AI Summaries**: Gemini generates a plain-English summary of each change
- **Status Bar**: Shows connection state with project ID and last sync status
- **Commands**: Set project ID and auth token without leaving VS Code

## Installation

### From Source

1. Install dependencies:
   ```bash
   cd vscode-extension
   npm install
   ```

2. Press `F5` in VS Code to launch an Extension Development Host.

### Package as .vsix

```bash
cd vscode-extension
npm run package
code --install-extension teamforge-1.0.0.vsix
```

## Configuration

Open VS Code settings (`Ctrl+,`) and search for "TeamForge":

| Setting | Description | Default |
|---------|-------------|---------|
| `teamforge.apiUrl` | Backend API URL | `http://localhost:8000` |
| `teamforge.projectId` | Project ID to link this workspace to | (none) |
| `teamforge.token` | JWT auth token from TeamForge | (none) |
| `teamforge.authorName` | Your display name in changelog | git username |

### Quick Setup Commands

- **`TeamForge: Set Project ID`** — Ctrl+Shift+P → run this command
- **`TeamForge: Set Auth Token`** — Ctrl+Shift+P → run this command

## Status Bar

The status bar item shows:
- `⚡ TeamForge: Project 42 ✓` — connected and syncing
- `⚡ TeamForge: Project 42 ⚠` — last sync failed
- `⚠ TeamForge: Setup needed` — project ID or token missing

## How It Works

1. Extension activates on VS Code startup
2. Caches the content of all open files in memory
3. On each file save, computes a line-by-line diff against the cached version
4. POSTs the diff to `{apiUrl}/webhooks/vscode`
5. Backend AI service (Gemini) summarises the diff
6. Summary appears in the TeamForge Changelog page
