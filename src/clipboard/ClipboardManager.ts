import * as vscode from 'vscode';

export class ClipboardManager {
  private _clearTimeout: NodeJS.Timeout | null = null;
  private _lastCopiedText: string | null = null;
  
  public async copyToClipboard(text: string, timeoutSeconds: number = 30): Promise<void> {
    await vscode.env.clipboard.writeText(text);
    this._lastCopiedText = text;
    
    vscode.window.showInformationMessage('✓ Copied to clipboard');

    if (this._clearTimeout) {
      clearTimeout(this._clearTimeout);
    }

    // timeoutSeconds <= 0 means never clear
    if (timeoutSeconds > 0) {
      this._clearTimeout = setTimeout(async () => {
        try {
          // Only clear if the clipboard still contains the secret we copied
          const currentText = await vscode.env.clipboard.readText();
          if (currentText === this._lastCopiedText) {
            await vscode.env.clipboard.writeText('');
            console.log('Clipboard automatically cleared for security.');
          }
        } catch (e) {
          // Ignore clipboard read errors
        } finally {
          this._lastCopiedText = null;
        }
      }, timeoutSeconds * 1000);
    }
  }
}
