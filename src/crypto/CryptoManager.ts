import { generateSalt, generateNonce } from './SecureRandom';
import { deriveKey } from './KeyDerivation';
import { encryptPayload, decryptPayload } from './Encryption';

const MAGIC_HEADER = Buffer.from('KEYNEST', 'utf8');
const VERSION = 1;

export interface VaultEncryptionContext {
  key: Buffer;
  salt: Buffer;
}

export class CryptoManager {
  
  public static async createEncryptionContext(password: string): Promise<VaultEncryptionContext> {
    const salt = generateSalt(32);
    const key = await deriveKey(password, salt);
    return { key, salt };
  }

  public static async deriveKeyFromExistingSalt(password: string, salt: Buffer): Promise<Buffer> {
    return await deriveKey(password, salt);
  }

  public static encryptVault(context: VaultEncryptionContext, plaintext: string): Buffer {
    const nonce = generateNonce(12);
    
    const { ciphertext, authTag } = encryptPayload(plaintext, context.key, nonce);
    
    const versionBuffer = Buffer.alloc(1);
    versionBuffer.writeUInt8(VERSION, 0);
    
    return Buffer.concat([
      MAGIC_HEADER,
      versionBuffer,
      context.salt,
      nonce,
      authTag,
      ciphertext
    ]);
  }

  public static extractSalt(data: Buffer): Buffer {
    if (data.length < 40) {
      throw new Error('Vault file too small');
    }
    const magic = data.subarray(0, 7);
    if (!magic.equals(MAGIC_HEADER)) {
      throw new Error('Invalid vault file format');
    }
    const version = data.readUInt8(7);
    if (version !== 1) {
      throw new Error(`Unsupported vault version: ${version}`);
    }
    return data.subarray(8, 40);
  }

  public static decryptVault(context: VaultEncryptionContext, data: Buffer): string {
    let offset = 40; // 7 (magic) + 1 (version) + 32 (salt)
    
    const nonce = data.subarray(offset, offset + 12);
    offset += 12;
    
    const authTag = data.subarray(offset, offset + 16);
    offset += 16;
    
    const ciphertext = data.subarray(offset);
    
    return decryptPayload(ciphertext, context.key, nonce, authTag);
  }
}
