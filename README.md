# 🔐 KeyNest

**Your developer secrets, all in one nest.**

KeyNest is a beautiful, fast, local-first secrets vault built directly inside VS Code. It securely stores your API keys, database credentials, server passwords, and environment variables locally on your machine—never touching a cloud server.

## Features
- **Local-First & Offline**: 100% offline. Zero telemetry, zero cloud accounts.
- **Military-Grade Security**: AES-256-GCM authenticated encryption utilizing `scrypt` for robust Key Derivation.
- **Brute-Force Protection**: Rapid-guessing mitigation with exponential lockouts.
- **Auto-Clearing Clipboard**: Smart clipboard integration automatically zeroes out your copied secrets after 30 seconds.
- **Seamless UX**: Beautiful Codicon integration, dynamic filtering, and native keyboard shortcuts.

## Keyboard Shortcuts
- `Ctrl+Shift+Alt+O` / `Cmd+Shift+Alt+O` - Unlock Vault
- `Ctrl+Shift+Alt+L` / `Cmd+Shift+Alt+L` - Lock Vault
- `Ctrl+Shift+Alt+S` / `Cmd+Shift+Alt+S` - Add New Secret

## Privacy
Your master password is never stored. Active decryption keys and salts are wiped from memory (`Buffer.fill(0)`) the second the vault is locked. See [SECURITY.md](SECURITY.md) for a deep dive into the cryptography architecture.
