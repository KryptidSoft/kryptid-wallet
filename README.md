# Kryptid Wallet (Multi-Chain Modular Edition)

Purely functional, client-side, non-custodial wallet for Bitcoin, Ethereum, Litecoin, Dogecoin, Binance Smart Chain, TRON, Toncoin, and Solana. Developed with zero cloud dependencies and no Node.js build pipelines using Notepad++ and PowerShell. Built on a data-driven, polymorphic architecture that categorizes assets into cryptographic families (UTXO, EVM, TRON, TON, SOL) to eliminate code duplication and scale infinitely without UI modifications.

---

## 🚀 CURRENT ARCHITECTURE & COMPONENT STATUS

* **index.html**: English interface built on a state-reactive model using `.crypto-card` blocks. Features strict production CSP and an optimized, integrated `#vault-status-message` inline display layer.
* **main.js (Root)**: Core cryptographic engine (CryptoVault). Manages multi-chain BIP-44 path derivation, Bech32 formatting, and localized PBKDF2/AES-256 secure storage engine using dynamic parameter extraction to shield local ledgers from automated extraction scanners.
* **js/app.js**: UI event controller. Intercepts card clicks to dynamically swap forms, placeholders, and values with active network pre-checks for swap execution.
* **js/security.js**: Active memory defense (SecurityLayer). Enforces input masks, disables external data extraction (copy/cut/drag), and wipes the OS clipboard instantly after paste events.
* **js/utxo-vault.js**: UTXO layer (KryptidBitcoinEngine). Parameters and signing engine for BTC, LTC, and DOGE with RAM-isolated key mapping and raw Hex compilation for Esplora broadcast.
* **js/ton-vault.js**: TON layer (KryptidTONEngine). Non-custodial signer managing v4R2 client wallet construction, Ed25519 nacl public key calculation, and Base64url formatting.
* **js/solana-vault.js**: Solana layer (KryptidSolanaEngine). Keypair generation via Ed25519, native SOL transfers signing, and an integrated non-blocking SPL Token Scanner.
* **js/blockchain.js**: Network service layer (BlockchainService) holding the master database (`KryptidNetworkRegistry`). Agregates fiat values and drives the multi-chain Swap Routing Engine with an embedded 0.2% referrer fee.
* **js/wallet-engine.js**: Multi-chain validation layer (WalletEngine). Runs precise RegExp checks across address types, acting as a structural cross-contamination firewall.

---

## 🛑 REUSE AND CODING RULES FOR FUTURE AI ASSISTANTS

1. **NEVER DUPLICATE UI OR EVENT LOGIC**: The interface and networks layer are strictly polymorphic. New assets must be registered solely as configuration entries in `KryptidNetworkRegistry`.
2. **MAINTAIN OFFLINE NETWORK ISOLATION**: Address derivation, seed generation, and transaction signing must execute 100% in RAM with zero cloud calls. Network checks must only gate high-level external swap APIs.
3. **DO NOT ALTER MULTI-SEGMENT CONCAT SEQUENCE**: API connections use explicit multi-segment string concatenation to shield network paths from backend terminal mapping errors.
4. **NO STATE FRAMEWORKS OR BUILD TOOLS**: The architecture must remain vanilla JavaScript, low-level, and zero-dependency. Do not introduce npm compilation pipelines, webpack, React, or Vue.

---

## 📦 DESKTOP PACKAGING & COMPILATION (.exe)

* **Runtime Isolation**: Runs on NW.js with strict `"node": false` configuration to achieve optimal memory security.
* **V8 Binary Protection**: Production kernels (`main.js` and `js/wallet-engine.js`) must be compiled via `nwjc.exe` into unreadable V8 binary snapshots (`main.bin` / `wallet-engine.bin`) to shield commercial logic and developer addresses from reverse engineering.

