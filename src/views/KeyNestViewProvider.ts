import * as vscode from 'vscode';
import { VaultManager } from '../vault/VaultManager';

export class KeyNestViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'keynest.sidebar';
  private _webviewView?: vscode.WebviewView;
  private _searchQuery: string = '';
  private _selectedProject: string = '';
  private _selectedEnvironment: string = '';

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly _vaultManager: VaultManager
  ) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._webviewView = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    webviewView.webview.onDidReceiveMessage((data) => {
      switch (data.command) {
        case 'addSecret':
          vscode.commands.executeCommand('keynest.addSecret');
          break;
        case 'search':
          this._searchQuery = data.text || '';
          this.updateWebviewState();
          break;
        case 'filterProject':
          this._selectedProject = data.value || '';
          this.updateWebviewState();
          break;
        case 'filterEnv':
          this._selectedEnvironment = data.value || '';
          this.updateWebviewState();
          break;
        case 'settings':
          vscode.window.showInformationMessage('Settings command triggered');
          break;
        case 'import':
          vscode.window.showInformationMessage('Import command triggered');
          break;
        case 'export':
          vscode.window.showInformationMessage('Export command triggered');
          break;
        case 'openVault':
          vscode.commands.executeCommand('keynest.openVault');
          break;
        case 'lockVault':
          vscode.commands.executeCommand('keynest.lockVault');
          break;
        case 'openSecret':
          vscode.commands.executeCommand('keynest.openSecret', data.id);
          break;
      }
    });
  }

  public updateWebviewState() {
    if (this._webviewView) {
      this._webviewView.webview.html = this._getHtmlForWebview(this._webviewView.webview);
    }
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    const nonce = getNonce();
    const isLocked = this._vaultManager.isLocked;

    const lockedHtml = `
      <div class="empty-state">
          <h3>🔐 KeyNest</h3>
          <p>Your vault is locked.</p>
          <button class="action-btn primary-btn" id="openVaultBtn">Unlock Vault</button>
      </div>
    `;

    let secretsHtml = '';
    if (!isLocked) {
      let secrets = this._searchQuery 
        ? this._vaultManager.searchSecrets(this._searchQuery)
        : this._vaultManager.getAllSecrets();
        
      if (this._selectedProject) {
        secrets = secrets.filter(s => s.projectId === this._selectedProject);
      }
      if (this._selectedEnvironment) {
        secrets = secrets.filter(s => s.environment === this._selectedEnvironment);
      }
      
      if (secrets.length === 0) {
        if (this._searchQuery) {
          secretsHtml = `
            <div class="empty-state">
                <p>No secrets found for "${this._searchQuery}".</p>
            </div>
          `;
        } else {
          secretsHtml = `
            <div class="empty-state">
                <h3>Your KeyNest is empty.</h3>
                <p>Store your first API key, password, database credential, or secret.</p>
            </div>
          `;
        }
      } else {
        const favorites = secrets.filter(s => s.favorite);
        const others = secrets.filter(s => !s.favorite);
        
        if (favorites.length > 0) {
          secretsHtml += `<div class="section-title">⭐ Favorites</div>`;
          favorites.forEach(s => {
            secretsHtml += `<div class="item" onclick="openSecret('${s.id}')">🔑 ${s.name}</div>`;
          });
        }
        
        if (others.length > 0) {
          secretsHtml += `<div class="section-title">🔑 Secrets</div>`;
          others.forEach(s => {
            secretsHtml += `<div class="item" onclick="openSecret('${s.id}')">🔑 ${s.name}</div>`;
          });
        }
      }
    }

    const projects = this._vaultManager.getProjects();
    const environments = this._vaultManager.getEnvironments();

    let projectOptions = `<option value="">All Projects</option>`;
    projects.forEach(p => {
      projectOptions += `<option value="${p.id}" ${this._selectedProject === p.id ? 'selected' : ''}>${p.name}</option>`;
    });

    let envOptions = `<option value="">All Environments</option>`;
    environments.forEach(e => {
      envOptions += `<option value="${e.id}" ${this._selectedEnvironment === e.id ? 'selected' : ''}>${e.name}</option>`;
    });

    const unlockedHtml = `
      <div class="search-container">
          <input type="text" class="search-box" placeholder="🔍 Search secrets..." id="searchInput" value="${this._searchQuery}" />
      </div>
      <div class="filters-container">
          <select id="projectFilter" class="filter-dropdown">${projectOptions}</select>
          <select id="envFilter" class="filter-dropdown">${envOptions}</select>
      </div>
      
      <div class="scroll-area" id="contentArea">
          ${secretsHtml}
      </div>
      
      <div class="footer">
          <button class="action-btn primary-btn" id="addSecretBtn">＋ Add Secret</button>
          <button class="action-btn" id="lockVaultBtn">🔒 Lock Vault</button>
          <button class="action-btn" id="importBtn">⇩ Import</button>
          <button class="action-btn" id="exportBtn">⇧ Export</button>
          <button class="action-btn" id="settingsBtn">⚙ Settings</button>
      </div>
    `;

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
    <title>KeyNest</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            padding: 0;
            margin: 0;
            color: var(--vscode-foreground);
            background-color: var(--vscode-sideBar-background);
            display: flex;
            flex-direction: column;
            height: 100vh;
            overflow: hidden;
        }
        .header {
            padding: 12px 16px;
            font-weight: bold;
            font-size: 14px;
            border-bottom: 1px solid var(--vscode-sideBarSectionHeader-border);
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .search-container {
            padding: 10px 16px;
            border-bottom: 1px solid var(--vscode-sideBarSectionHeader-border);
        }
        .search-box {
            width: 100%;
            padding: 6px 8px;
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            border-radius: 2px;
            box-sizing: border-box;
            outline: none;
        }
        .search-box:focus {
            border-color: var(--vscode-focusBorder);
        }
        .filters-container {
            padding: 8px 16px;
            display: flex;
            gap: 8px;
            border-bottom: 1px solid var(--vscode-sideBarSectionHeader-border);
        }
        .filter-dropdown {
            flex: 1;
            padding: 4px;
            background-color: var(--vscode-dropdown-background);
            color: var(--vscode-dropdown-foreground);
            border: 1px solid var(--vscode-dropdown-border);
            border-radius: 2px;
            outline: none;
        }
        .scroll-area {
            flex: 1;
            overflow-y: auto;
            padding: 10px 0;
        }
        .section-title {
            padding: 4px 16px;
            font-size: 11px;
            text-transform: uppercase;
            color: var(--vscode-sideBarTitle-foreground);
            font-weight: 600;
            margin-top: 10px;
            display: flex;
            align-items: center;
            gap: 6px;
        }
        .item {
            padding: 6px 16px 6px 30px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 8px;
            transition: background-color 0.1s ease-in-out;
        }
        .item:hover {
            background-color: var(--vscode-list-hoverBackground);
            color: var(--vscode-list-hoverForeground);
        }
        .footer {
            padding: 10px 16px;
            border-top: 1px solid var(--vscode-sideBarSectionHeader-border);
            display: flex;
            flex-direction: column;
            gap: 4px;
        }
        .action-btn {
            background: transparent;
            color: var(--vscode-foreground);
            border: none;
            padding: 6px 8px;
            cursor: pointer;
            text-align: left;
            border-radius: 3px;
            display: flex;
            align-items: center;
            gap: 8px;
            transition: background-color 0.15s ease-in-out, transform 0.05s ease;
        }
        .action-btn:hover {
            background-color: var(--vscode-list-hoverBackground);
        }
        .action-btn:active {
            transform: scale(0.98);
        }
        .primary-btn {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            text-align: center;
            justify-content: center;
        }
        .primary-btn:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        .empty-state {
            padding: 20px 16px;
            text-align: center;
            color: var(--vscode-descriptionForeground);
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 12px;
        }
        .empty-state h3 {
            margin: 0;
            color: var(--vscode-foreground);
        }
        .empty-state p {
            margin: 0;
            font-size: 12px;
            line-height: 1.4;
        }
    </style>
</head>
<body>
    <div class="header">
        🔐 KEYNEST
    </div>
    
    ${isLocked ? lockedHtml : unlockedHtml}

    <script nonce="${nonce}">
        const vscode = acquireVsCodeApi();

        const addSecretBtn = document.getElementById('addSecretBtn');
        if(addSecretBtn) {
            addSecretBtn.addEventListener('click', () => {
                vscode.postMessage({ command: 'addSecret' });
            });
        }

        const openVaultBtn = document.getElementById('openVaultBtn');
        if(openVaultBtn) {
            openVaultBtn.addEventListener('click', () => {
                vscode.postMessage({ command: 'openVault' });
            });
        }

        const lockVaultBtn = document.getElementById('lockVaultBtn');
        if(lockVaultBtn) {
            lockVaultBtn.addEventListener('click', () => {
                vscode.postMessage({ command: 'lockVault' });
            });
        }

        const importBtn = document.getElementById('importBtn');
        if(importBtn) {
            importBtn.addEventListener('click', () => {
                vscode.postMessage({ command: 'import' });
            });
        }

        const exportBtn = document.getElementById('exportBtn');
        if(exportBtn) {
            exportBtn.addEventListener('click', () => {
                vscode.postMessage({ command: 'export' });
            });
        }

        const settingsBtn = document.getElementById('settingsBtn');
        if(settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                vscode.postMessage({ command: 'settings' });
            });
        }

        const searchInput = document.getElementById('searchInput');
        if(searchInput) {
            searchInput.addEventListener('input', (e) => {
                vscode.postMessage({ command: 'search', text: e.target.value });
            });
            // Auto focus if not empty
            if (searchInput.value) {
                searchInput.focus();
            }
        }
        
        const projectFilter = document.getElementById('projectFilter');
        if(projectFilter) {
            projectFilter.addEventListener('change', (e) => {
                vscode.postMessage({ command: 'filterProject', value: e.target.value });
            });
        }

        const envFilter = document.getElementById('envFilter');
        if(envFilter) {
            envFilter.addEventListener('change', (e) => {
                vscode.postMessage({ command: 'filterEnv', value: e.target.value });
            });
        }
        
        function openSecret(id) {
            vscode.postMessage({ command: 'openSecret', id });
        }
    </script>
</body>
</html>`;
  }
}

function getNonce() {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
