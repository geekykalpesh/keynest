import * as vscode from 'vscode';
import { KeyNestViewProvider } from './views/KeyNestViewProvider';
import { VaultManager } from './vault/VaultManager';
import { ClipboardManager } from './clipboard/ClipboardManager';
import { SecretDetailPanel } from './views/SecretDetailPanel';
import { VaultImporter } from './vault/VaultImporter';
import { VaultExporter } from './vault/VaultExporter';

export function activate(context: vscode.ExtensionContext) {
  const vaultManager = new VaultManager(context);
  const provider = new KeyNestViewProvider(context.extensionUri, vaultManager);
  const clipboardManager = new ClipboardManager();

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(KeyNestViewProvider.viewType, provider)
  );

  const openVaultCmd = vscode.commands.registerCommand('keynest.openVault', async () => {
    const exists = await vaultManager.hasExistingVault();
    const password = await vscode.window.showInputBox({
      prompt: exists ? 'Enter Master Password to unlock KeyNest Vault' : 'Create Master Password (Min 8 chars, 1 Number)',
      password: true,
      ignoreFocusOut: true,
    });

    if (!password) {
      return;
    }

    if (!exists) {
      if (password.length < 8) {
        vscode.window.showErrorMessage('Password must be at least 8 characters long.');
        return;
      }
      if (!/\\d/.test(password)) {
        vscode.window.showErrorMessage('Password must contain at least one number.');
        return;
      }
    }

    if (exists) {
      await vaultManager.unlockVault(password);
    } else {
      await vaultManager.createVault(password);
    }
    
    provider.updateWebviewState();
  });
  
  const lockVaultCmd = vscode.commands.registerCommand('keynest.lockVault', () => {
    vaultManager.lockVault();
    provider.updateWebviewState();
  });

  const addSecretCmd = vscode.commands.registerCommand('keynest.addSecret', async () => {
    if (vaultManager.isLocked) {
      vscode.window.showErrorMessage('Please unlock the vault first.');
      return;
    }
    
    const name = await vscode.window.showInputBox({ prompt: 'Secret Name (e.g. OpenAI Production)' });
    if (!name) {
      return;
    }
    
    const value = await vscode.window.showInputBox({ prompt: 'Secret Value', password: true });
    if (!value) {
      return;
    }

    const secret = {
      id: vaultManager.generateId(),
      name,
      type: 'Generic',
      tags: [],
      fields: [
        { name: 'Value', value: value, isSensitive: true }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      favorite: false
    };

    await vaultManager.addSecret(secret);
    vscode.window.showInformationMessage(`Secret "${name}" added securely.`);
    provider.updateWebviewState();
  });

  const searchSecretsCmd = vscode.commands.registerCommand('keynest.searchSecrets', () => {
    vscode.window.showInformationMessage('Search Secrets command triggered');
  });

  const addProjectCmd = vscode.commands.registerCommand('keynest.addProject', async () => {
    if (vaultManager.isLocked) {
      return;
    }
    const name = await vscode.window.showInputBox({ prompt: 'Project Name (e.g. My Startup)' });
    if (!name) {
      return;
    }
    
    await vaultManager.addProject({
      id: vaultManager.generateId(),
      name,
      createdAt: new Date().toISOString()
    });
    vscode.window.showInformationMessage(`Project "${name}" added.`);
    provider.updateWebviewState();
  });

  const addEnvCmd = vscode.commands.registerCommand('keynest.addEnvironment', async () => {
    if (vaultManager.isLocked) {
      return;
    }
    const name = await vscode.window.showInputBox({ prompt: 'Environment Name (e.g. Production)' });
    if (!name) {
      return;
    }
    
    await vaultManager.addEnvironment({
      id: vaultManager.generateId(),
      name
    });
    vscode.window.showInformationMessage(`Environment "${name}" added.`);
    provider.updateWebviewState();
  });

  const openSecretCmd = vscode.commands.registerCommand('keynest.openSecret', (id: string) => {
    const secret = vaultManager.getSecret(id);
    if (secret) {
      SecretDetailPanel.createOrShow(context.extensionUri, secret, clipboardManager, vaultManager);
    }
  });

  const refreshSidebarCmd = vscode.commands.registerCommand('keynest.refreshSidebar', () => {
    provider.updateWebviewState();
  });

  const importCmd = vscode.commands.registerCommand('keynest.import', async () => {
    await VaultImporter.importFromJson(vaultManager);
    provider.updateWebviewState();
  });

  const exportCmd = vscode.commands.registerCommand('keynest.export', async () => {
    const choice = await vscode.window.showQuickPick([
      { label: 'JSON (Plaintext)', description: 'Export all secrets unencrypted' },
      { label: 'Encrypted Backup', description: 'Export as secure .dvault format' }
    ]);
    if (choice?.label === 'JSON (Plaintext)') {
      await VaultExporter.exportToJson(vaultManager);
    } else if (choice?.label === 'Encrypted Backup') {
      await VaultExporter.exportEncrypted(vaultManager);
    }
  });

  context.subscriptions.push(
    openVaultCmd, 
    lockVaultCmd, 
    addSecretCmd, 
    searchSecretsCmd, 
    openSecretCmd,
    refreshSidebarCmd,
    addProjectCmd,
    addEnvCmd,
    importCmd,
    exportCmd
  );
}

export function deactivate() {}
