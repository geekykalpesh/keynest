import * as vscode from 'vscode';
import { Vault } from '../models/Vault';
import { Secret } from '../models/Secret';
import { Project } from '../models/Project';
import { Environment } from '../models/Environment';
import { LocalStorage } from '../storage/LocalStorage';
import { CryptoManager, VaultEncryptionContext } from '../crypto/CryptoManager';

export class VaultManager {
  private _vault: Vault | null = null;
  private _isLocked: boolean = true;
  private _encryptionContext: VaultEncryptionContext | null = null;
  private _storage: LocalStorage;
  private readonly VAULT_FILENAME = 'vault.dvault';

  constructor(context: vscode.ExtensionContext) {
    this._storage = new LocalStorage(context);
  }

  public get isLocked(): boolean {
    return this._isLocked;
  }

  public get vault(): Vault | null {
    return this._vault;
  }

  public async hasExistingVault(): Promise<boolean> {
    return await this._storage.fileExists(this.VAULT_FILENAME);
  }

  public async createVault(password: string): Promise<boolean> {
    this._encryptionContext = await CryptoManager.createEncryptionContext(password);
    this._vault = {
      secrets: {},
      projects: {},
      environments: {},
      metadata: {
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    };
    this._isLocked = false;
    await this.saveVault();
    vscode.window.showInformationMessage('KeyNest Vault created securely.');
    return true;
  }

  private _failedAttempts: number = 0;
  private _lockoutTime: number = 0;

  public async unlockVault(password: string): Promise<boolean> {
    if (Date.now() < this._lockoutTime) {
      const waitSeconds = Math.ceil((this._lockoutTime - Date.now()) / 1000);
      vscode.window.showErrorMessage(`Too many failed attempts. Try again in ${waitSeconds} seconds.`);
      return false;
    }

    try {
      await new Promise(resolve => setTimeout(resolve, 500));

      const data = await this._storage.readFile(this.VAULT_FILENAME);
      const dataBuffer = Buffer.from(data);
      
      const salt = CryptoManager.extractSalt(dataBuffer);
      const key = await CryptoManager.deriveKeyFromExistingSalt(password, salt);
      const context = { key, salt };
      
      const json = CryptoManager.decryptVault(context, dataBuffer);
      
      this._vault = JSON.parse(json) as Vault;
      this._encryptionContext = context;
      this._isLocked = false;
      this._failedAttempts = 0;
      
      vscode.window.showInformationMessage('KeyNest Vault unlocked securely.');
      return true;
    } catch (e) {
      this._failedAttempts++;
      if (this._failedAttempts >= 3) {
        const penalty = Math.min(1000 * Math.pow(2, this._failedAttempts - 3), 60000);
        this._lockoutTime = Date.now() + penalty;
      }
      console.error(e);
      vscode.window.showErrorMessage('Failed to unlock vault. Incorrect password or corrupted file.');
      return false;
    }
  }

  public lockVault(): void {
    this._vault = null;
    if (this._encryptionContext) {
      this._encryptionContext.key.fill(0);
      this._encryptionContext.salt.fill(0);
      this._encryptionContext = null;
    }
    this._isLocked = true;
    vscode.window.showInformationMessage('KeyNest Vault locked.');
  }

  public async saveVault(): Promise<void> {
    if (!this._vault || !this._encryptionContext) {
      throw new Error('Vault is locked or encryption context is missing.');
    }
    
    this._vault.metadata.updatedAt = new Date().toISOString();
    const json = JSON.stringify(this._vault);
    
    const encryptedData = CryptoManager.encryptVault(this._encryptionContext, json);
    
    await this._storage.saveFile(this.VAULT_FILENAME, encryptedData);
  }

  public exportEncryptedBlob(): Buffer {
    if (!this._vault || !this._encryptionContext) {
      throw new Error('Vault is locked or encryption context is missing.');
    }
    const json = JSON.stringify(this._vault);
    return CryptoManager.encryptVault(this._encryptionContext, json);
  }

  public generateId(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  public async addSecret(secret: Secret): Promise<void> {
    if (!this._vault) {
      throw new Error('Vault is locked.');
    }
    this._vault.secrets[secret.id] = secret;
    await this.saveVault();
  }

  public async updateSecret(secret: Secret): Promise<void> {
    if (!this._vault) {
      throw new Error('Vault is locked.');
    }
    if (!this._vault.secrets[secret.id]) {
      throw new Error('Secret not found.');
    }
    this._vault.secrets[secret.id] = secret;
    await this.saveVault();
  }

  public async deleteSecret(id: string): Promise<void> {
    if (!this._vault) {
      throw new Error('Vault is locked.');
    }
    delete this._vault.secrets[id];
    await this.saveVault();
  }

  public getSecret(id: string): Secret | undefined {
    if (!this._vault) {
      return undefined;
    }
    return this._vault.secrets[id];
  }

  public getAllSecrets(): Secret[] {
    if (!this._vault) {
      return [];
    }
    return Object.values(this._vault.secrets);
  }

  public searchSecrets(query: string): Secret[] {
    if (!this._vault) {
      return [];
    }
    const lowerQuery = query.toLowerCase();
    return Object.values(this._vault.secrets).filter(secret => {
      if (secret.name.toLowerCase().includes(lowerQuery)) {
        return true;
      }
      if (secret.type.toLowerCase().includes(lowerQuery)) {
        return true;
      }
      if (secret.tags.some(tag => tag.toLowerCase().includes(lowerQuery))) {
        return true;
      }
      return false;
    });
  }

  public async addProject(project: Project): Promise<void> {
    if (!this._vault) {
      throw new Error('Vault is locked.');
    }
    this._vault.projects[project.id] = project;
    await this.saveVault();
  }

  public getProjects(): Project[] {
    if (!this._vault) {
      return [];
    }
    return Object.values(this._vault.projects);
  }

  public async addEnvironment(env: Environment): Promise<void> {
    if (!this._vault) {
      throw new Error('Vault is locked.');
    }
    this._vault.environments[env.id] = env;
    await this.saveVault();
  }

  public getEnvironments(): Environment[] {
    if (!this._vault) {
      return [];
    }
    return Object.values(this._vault.environments);
  }
}
