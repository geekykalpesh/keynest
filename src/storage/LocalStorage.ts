import * as vscode from 'vscode';

export class LocalStorage {
  constructor(private context: vscode.ExtensionContext) {}

  public async saveFile(filename: string, data: Uint8Array): Promise<void> {
    const uri = vscode.Uri.joinPath(this.context.globalStorageUri, filename);
    await vscode.workspace.fs.writeFile(uri, data);
  }

  public async readFile(filename: string): Promise<Uint8Array> {
    const uri = vscode.Uri.joinPath(this.context.globalStorageUri, filename);
    return await vscode.workspace.fs.readFile(uri);
  }

  public async fileExists(filename: string): Promise<boolean> {
    const uri = vscode.Uri.joinPath(this.context.globalStorageUri, filename);
    try {
      await vscode.workspace.fs.stat(uri);
      return true;
    } catch {
      return false;
    }
  }
}
