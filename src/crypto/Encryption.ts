import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';

export function encryptPayload(plaintext: string, key: Buffer, nonce: Buffer): { ciphertext: Buffer, authTag: Buffer } {
  const cipher = crypto.createCipheriv(ALGORITHM, key, nonce);
  
  let ciphertext = cipher.update(plaintext, 'utf8');
  ciphertext = Buffer.concat([ciphertext, cipher.final()]);
  
  const authTag = cipher.getAuthTag();
  return { ciphertext, authTag };
}

export function decryptPayload(ciphertext: Buffer, key: Buffer, nonce: Buffer, authTag: Buffer): string {
  const decipher = crypto.createDecipheriv(ALGORITHM, key, nonce);
  decipher.setAuthTag(authTag);
  
  let plaintext = decipher.update(ciphertext, undefined, 'utf8');
  plaintext += decipher.final('utf8');
  
  return plaintext;
}
