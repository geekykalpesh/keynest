import * as vscode from 'vscode';
import { Secret } from '../models/Secret';
import { ClipboardManager } from '../clipboard/ClipboardManager';
import { VaultManager } from '../vault/VaultManager';

export class SecretDetailPanel {
  public static currentPanel: SecretDetailPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];
  private _secret: Secret;

  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    secret: Secret,
    private _clipboardManager: ClipboardManager,
    private _vaultManager: VaultManager
  ) {
    this._panel = panel;
    this._secret = secret;
    this._update();
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    
    this._panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case 'copy': {
            const fieldToCopy = this._secret.fields.find(f => f.name === message.fieldName);
            if (fieldToCopy) {
              await this._clipboardManager.copyToClipboard(fieldToCopy.value, 30);
            }
            return;
          }
          case 'delete':
            await this._vaultManager.deleteSecret(this._secret.id);
            vscode.window.showInformationMessage(`Deleted secret ${this._secret.name}`);
            this.dispose();
            // Optional: We can tell provider to update sidebar, but typical flow triggers a command
            vscode.commands.executeCommand('keynest.refreshSidebar'); 
            return;
        }
      },
      null,
      this._disposables
    );
  }

  public static createOrShow(
    extensionUri: vscode.Uri, 
    secret: Secret, 
    clipboardManager: ClipboardManager,
    vaultManager: VaultManager
  ) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    if (SecretDetailPanel.currentPanel) {
      SecretDetailPanel.currentPanel._secret = secret;
      SecretDetailPanel.currentPanel._update();
      SecretDetailPanel.currentPanel._panel.reveal(column);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'keynestSecretDetail',
      `Secret: ${secret.name}`,
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [extensionUri]
      }
    );

    SecretDetailPanel.currentPanel = new SecretDetailPanel(panel, extensionUri, secret, clipboardManager, vaultManager);
  }

  public dispose() {
    SecretDetailPanel.currentPanel = undefined;
    this._panel.dispose();
    while (this._disposables.length) {
      const x = this._disposables.pop();
      if (x) {
        x.dispose();
      }
    }
  }

  private _update() {
    this._panel.title = `Secret: ${this._secret.name}`;
    this._panel.webview.html = this._getHtmlForWebview();
  }

  private _getHtmlForWebview() {
    const nonce = getNonce();
    
    let fieldsHtml = '';
    for (const field of this._secret.fields) {
      fieldsHtml += `
        <div class="field">
            <div class="field-name">${field.name}</div>
            <div class="field-value-container">
                <input type="${field.isSensitive ? 'password' : 'text'}" class="field-value" value="${field.value}" readonly id="input-${field.name}" />
                <div class="field-actions">
                    ${field.isSensitive ? `<button class="btn btn-reveal" onclick="toggleReveal('${field.name}')">👁 Reveal</button>` : ''}
                    <button class="btn btn-copy" onclick="copyField('${field.name}')">📋 Copy</button>
                </div>
            </div>
        </div>
      `;
    }

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
    <title>${this._secret.name}</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            padding: 20px;
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            max-width: 800px;
        }
        h2 {
            border-bottom: 1px solid var(--vscode-panel-border);
            padding-bottom: 10px;
        }
        .meta-info {
            margin-bottom: 30px;
            color: var(--vscode-descriptionForeground);
            font-size: 12px;
        }
        .field {
            margin-bottom: 20px;
        }
        .field-name {
            font-weight: 600;
            margin-bottom: 8px;
            font-size: 13px;
        }
        .field-value-container {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .field-value {
            flex: 1;
            padding: 8px 10px;
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            border-radius: 3px;
            font-family: var(--vscode-editor-font-family);
        }
        .btn {
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: none;
            padding: 8px 12px;
            cursor: pointer;
            border-radius: 3px;
            display: flex;
            align-items: center;
            gap: 6px;
            transition: all 0.15s ease-in-out;
        }
        .btn:hover {
            background-color: var(--vscode-button-secondaryHoverBackground);
        }
        .btn:active {
            transform: scale(0.97);
        }
        .danger-btn {
            background-color: var(--vscode-errorForeground);
            color: white;
            margin-top: 40px;
        }
    </style>
</head>
<body>
    <h2>${this._secret.name}</h2>
    <div class="meta-info">
        Type: ${this._secret.type} <br/>
        Created: ${new Date(this._secret.createdAt).toLocaleString()}
    </div>
    
    <div class="fields-container">
        ${fieldsHtml}
    </div>
    
    <button class="btn danger-btn" onclick="deleteSecret()">🗑 Delete Secret</button>

    <script nonce="${nonce}">
        const vscode = acquireVsCodeApi();

        function toggleReveal(fieldName) {
            const input = document.getElementById('input-' + fieldName);
            if (input.type === 'password') {
                input.type = 'text';
            } else {
                input.type = 'password';
            }
        }

        function copyField(fieldName) {
            vscode.postMessage({ command: 'copy', fieldName });
        }

        function deleteSecret() {
            vscode.postMessage({ command: 'delete' });
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
