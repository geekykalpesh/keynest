# KeyNest Security Architecture

This document strictly defines the security guarantees and cryptographic implementations actively enforced within KeyNest.

## 1. Local-First & Zero Telemetry
KeyNest is strictly offline. There are no network requests, analytics, cloud syncs, or accounts. 

## 2. Cryptographic Implementations
- **Algorithm**: `AES-256-GCM` (Authenticated Encryption with Associated Data).
- **Key Derivation Function**: Node.js native `scrypt` (N=16384, r=8, p=1).
- **CSPRNG**: `crypto.randomBytes()` is used for both the 32-byte Salts and the 12-byte Nonces.

### Vault Storage Format (.dvault)
The binary file strictly follows this schema:
`[MAGIC (7 bytes: 'KEYNEST')] [VERSION (1 byte)] [SALT (32 bytes)] [NONCE (12 bytes)] [AUTH_TAG (16 bytes)] [CIPHERTEXT]`

## 3. Session Security & Memory Management
- **Master Passwords Are Never Stored**: Passwords never touch the disk. They are solely used to derive the `VaultEncryptionContext`.
- **Memory Zeroing**: When the vault is locked, the active AES `key` and `salt` buffers are explicitly overwritten using `Buffer.fill(0)` prior to garbage collection, vastly reducing memory-scraping vectors.

## 4. Threat Mitigations
- **Brute-Force Guessing**: The `unlockVault` routine strictly enforces a 500ms artificial delay. Attempting 3 consecutive wrong passwords triggers an exponential lockout penalty (up to 60 seconds) that blocks further authentication.
- **Clipboard Leaks**: The `ClipboardManager` runs an automated 30-second sweep. It securely verifies if the user's active clipboard still exactly matches the previously copied credential before purging it, ensuring safe sweeps.

## 5. Module Audits
The KeyNest architecture was constructed to purely utilize VS Code Webviews and standard Node.js crypto primitives (`crypto`), intentionally avoiding native `node-gyp` modules to maximize cross-platform stability while adhering closely to high-security bounds.
