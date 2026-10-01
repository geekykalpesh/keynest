import * as crypto from 'crypto';

/**
 * Derives a strong 256-bit key from the password using scrypt.
 * Uses N=16384, r=8, p=1 which are standard moderate/high security parameters for scrypt.
 */
export async function deriveKey(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 32, { N: 16384, r: 8, p: 1 }, (err, derivedKey) => {
      if (err) {
        reject(err);
      } else {
        resolve(derivedKey);
      }
    });
  });
}
