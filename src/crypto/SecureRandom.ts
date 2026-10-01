import * as crypto from 'crypto';

export function generateSalt(length = 32): Buffer {
  return crypto.randomBytes(length);
}

export function generateNonce(length = 12): Buffer {
  // 12 bytes (96 bits) is the standard for GCM nonces
  return crypto.randomBytes(length);
}
