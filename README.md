# Kryptid Wallet (Multi-Chain Modular Edition)

Purely functional, client-side, non-custodial wallet for Bitcoin, Ethereum, Litecoin, Dogecoin, Binance Smart Chain, TRON, Toncoin, and Solana. Developed with zero cloud dependencies and no Node.js building tools using Notepad++ and PowerShell. Built on a data-driven, polymorphic architecture that categorizes assets into cryptographic families (UTXO, EVM, TRON, TON, SOL) to eliminate code duplication and scale infinitely without UI modifications.

---

## 🚀 CURRENT ARCHITECTURE & COMPONENT STATUS

* **index.html**: Production interface in English. Built on a state-reactive model using `.crypto-card` blocks with `data-coin` attributes. Features a strict production Content Security Policy (CSP) expanded for Web3 RPC endpoints and a centralized transaction form (`#action-zone`).
* **main.js (Root)**: Core cryptographic engine (CryptoVault). Manages dynamic multi-chain derivation via BIP-44 path segregation, low-level Bech32 formatting, and PBKDF2/AES-256 local ledger encryption for `localStorage`.
* **js/app.js**: Core UI connection and event controller layer. Intercepts card clicks to dynamically swap form titles, placeholders, and button values. Features active visibility filters and online-state network pre-checks for swap execution.
* **js/security.js**: Active memory defense mechanism (SecurityLayer). Isolates password/seed fields, enforces input field masks, disables malicious data extraction (copy/cut/drag), and clears the system clipboard instantly after successful paste events.
* **js/utxo-vault.js**: Universal UTXO cryptographical layer (KryptidBitcoinEngine). Parameterized signing engine for BTC, LTC, and DOGE with centralized network parameters, RAM-isolated key mapping, and raw Hex compilation for Esplora API broadcast.
* **js/ton-vault.js**: Cryptographic layer for the TON ecosystem (KryptidTONEngine). Non-custodial signer managing v4R2 client wallet construction, Ed25519 nacl public key calculation, and Base64url non-bounceable formatting.
* **js/solana-vault.js**: Cryptographic tracking engine for Solana (KryptidSolanaEngine). Generates keypairs via Ed25519, signs native SOL transfers with live RPC blockhashes, and features a background non-blocking SPL Token Scanner integrated with Jupiter registry.
* **js/blockchain.js**: Network service layer (BlockchainService) holding the master database (`KryptidNetworkRegistry`). Agregates fiat values (11 currencies + XAU) and drives the multi-chain Swap Routing Engine (1inch, Jupiter, SunSwap) with an embedded, local 0.2% referrer fee reduction logic.
* **js/wallet-engine.js**: Multi-chain validation layer (WalletEngine). Runs precise RegExp validation across all address types and acts as a catastrophic cross-contamination firewall preventing cross-family asset signing errors.

---

## 🛑 REUSE AND CODING RULES FOR FUTURE AI ASSISTANTS

1. **NEVER DUPLICATE UI OR EVENT LOGIC**: The interface (`#action-zone`) and networks layer (`BlockchainService`) are strictly polymorphic. New assets must be registered solely as configuration entries in `KryptidNetworkRegistry`. Standalone per-coin buttons or hardcoded listeners are strictly forbidden.
2. **MAINTAIN OFFLINE NETWORK ISOLATION**: Address derivation, seed generation, and transaction signing must execute 100% in RAM with zero cloud calls. Active network checks (`navigator.onLine`) must only gates high-level external swap APIs.
3. **DO NOT ALTER MULTI-SEGMENT CONCAT SEQUENCE**: API connections use explicit multi-segment string concatenation to shield network paths from backend terminal mapping errors. Leave these string structures untouched.
4. **NO STATE FRAMEWORKS OR BUILD TOOLS**: The architecture must remain vanilla JavaScript, low-level, and zero-dependency. Do not introduce npm compilation pipelines, webpack, React, or Vue.

---

## 📦 DESKTOP PACKAGING & COMPILATION (.exe)

* **Runtime Isolation**: The standalone desktop app runs on the NW.js (Node-Webkit) framework with strict `"node": false` configuration to achieve optimal memory security.
* **V8 Binary Protection**: Production distribution must be compiled via `nwjc.exe` to transform core logicial kernels (`main.js` and `js/wallet-engine.js`) into unreadable binary V8 snapshots (`main.bin` / `wallet-engine.bin`), completely shielding the commercial 0.2% fee logic and developer addresses from reverse engineering.
* **Asset Integrity**: All core cryptographical vendor libraries must remain locally embedded inside the vendor subdirectory to enforce absolute offline capability.
