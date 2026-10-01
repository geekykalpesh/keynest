import * as vscode from 'vscode';
import { VaultManager } from './VaultManager';
import { Secret } from '../models/Secret';
import { Project } from '../models/Project';
import { Environment } from '../models/Environment';

export class VaultImporter {
  public static async importFromJson(vaultManager: VaultManager): Promise<void> {
    if (vaultManager.isLocked || !vaultManager.vault) {
      vscode.window.showErrorMessage('Vault must be unlocked to import.');
      return;
    }

    const uris = await vscode.window.showOpenDialog({
      canSelectMany: false,
      filters: { 'JSON Files': ['json'] },
      openLabel: 'Import Vault',
      title: 'Import KeyNest Vault'
    });

    if (!uris || uris.length === 0) {
      return;
    }

    try {
      const data = await vscode.workspace.fs.readFile(uris[0]);
      const jsonStr = Buffer.from(data).toString('utf8');
      const importedVault = JSON.parse(jsonStr);

      if (importedVault.secrets) {
        for (const [id, secret] of Object.entries(importedVault.secrets)) {
          vaultManager.vault.secrets[id] = secret as unknown as Secret;
        }
      }
      if (importedVault.projects) {
        for (const [id, project] of Object.entries(importedVault.projects)) {
          vaultManager.vault.projects[id] = project as unknown as Project;
        }
      }
      if (importedVault.environments) {
        for (const [id, env] of Object.entries(importedVault.environments)) {
          vaultManager.vault.environments[id] = env as unknown as Environment;
        }
      }
      
      await vaultManager.saveVault();
      vscode.window.showInformationMessage('Successfully imported secrets and merged into vault.');
    } catch (e) {
      vscode.window.showErrorMessage('Failed to import vault. Invalid JSON format.');
    }
  }
}
