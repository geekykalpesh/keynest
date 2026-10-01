import * as vscode from 'vscode';
import { VaultManager } from './VaultManager';

export class VaultExporter {
  public static async exportToJson(vaultManager: VaultManager): Promise<void> {
    if (vaultManager.isLocked || !vaultManager.vault) {
      vscode.window.showErrorMessage('Vault must be unlocked to export.');
      return;
    }

    const uri = await vscode.window.showSaveDialog({
      filters: { 'JSON Files': ['json'] },
      saveLabel: 'Export Vault',
      title: 'Export KeyNest Vault'
    });

    if (!uri) {
      return;
    }

    const data = JSON.stringify(vaultManager.vault, null, 2);
    await vscode.workspace.fs.writeFile(uri, Buffer.from(data, 'utf8'));
    vscode.window.showInformationMessage('Vault successfully exported to JSON.');
  }

  public static async exportEncrypted(vaultManager: VaultManager): Promise<void> {
    if (vaultManager.isLocked) {
      vscode.window.showErrorMessage('Vault must be unlocked to export encrypted blob.');
      return;
    }

    const uri = await vscode.window.showSaveDialog({
      filters: { 'KeyNest Vault': ['dvault'] },
      saveLabel: 'Export Encrypted Vault',
      title: 'Export KeyNest Vault (Encrypted)'
    });

    if (!uri) {
      return;
    }

    try {
      const vaultData = vaultManager.exportEncryptedBlob();
      await vscode.workspace.fs.writeFile(uri, vaultData);
      vscode.window.showInformationMessage('Vault successfully exported as an encrypted backup.');
    } catch (e) {
      vscode.window.showErrorMessage('Failed to export encrypted backup.');
    }
  }
}
