### Kryptid Wallet (Multi-Chain Edition)

Purely functional, client-side, non-custodial wallet for Ethereum and Bitcoin. Developed with zero cloud dependencies and no Node.js using Notepad++ and PowerShell. 

### 🚀 CURRENT ARCHITECTURE & COMPONENT STATUS

* **index.html**: Production user interface in English. Contains a prominent visual legal Disclaimer, an alphabetical multi-fiat dropdown (11 currencies + physical gold XAU), a secure input field for the oneInchKey, and a strict production Content Security Policy (CSP).
* **app.js (Root)**: Core cryptographic engine (CryptoVault). Manages Bech32 encoding calculation, BIP-39 mnemonic generation via window.crypto, key derivation via Ethers, and PBKDF2/AES-256 local ledger encryption for localStorage.
* **js/app.js**: Core connection and UI event controller layer. Manages frontend logic, wallet initialization, forms validation bounds checks, and button event listeners.
* **js/security.js**: Active memory defense mechanism (SecurityLayer). Enforces password input field masks, disables malicious data extraction (blocks copy and cut events), and utilizes a safe microscopic timeout to erase sensitive credentials from the system clipboard instantly after a successful paste event.
* **js/crypto-vault.js**: Kryptid Bitcoin Engine execution layer (KryptidBitcoinEngine). Upgraded to production-grade network routing using the locally embedded browser UMD library (bitcoin.min.js). Resolves active UTXOs from the Blockstream API in RAM, signs SegWit transactions locally using isolated private keys, and broadcasts raw transaction Hex strings directly to the production network.
* **js/blockchain.js**: Signed network service (BlockchainService). Configured with verified mainnet RPC endpoints (rpc.ankr.com/eth) and exchange APIs (min-api.cryptocompare.com) utilizing custom string concat sequences to protect variables. Manages dynamic multi-fiat value formatting and multi-currency token swaps via authenticated oneInchKey headers.

### 🛑 REUSE AND CODING RULES FOR FUTURE AI ASSISTANTS

1. **DO NOT ALTER OR ROLLBACK ENCODING/VARIABLES**: Network links in js/blockchain.js utilize a specific multi-segment string concat sequence (+ operator strings) to bypass terminal formatting anomalies. **Leave them untouched.**
2. **DO NOT MIX CRYPTOGRAPHIC CORE WITH EXTENSION FILES**: The root app.js is the standalone CryptoVault mathematical layer. The file js/crypto-vault.js is strictly reserved for the localized KryptidBitcoinEngine transaction builder. Do not copy or duplicate their functions across each other.
3. **DO NOT INTRODUCE BUILD TOOLS**: Keep the architecture purely frontend-driven. No npm, no Webpack, no compilation. Everything must run directly out of the folder from pure browser files.

### 📝 FUTURE IMPLEMENTATION SPECIFICATIONS (NEXT ROADMAP)

### 📌 GUIDELINES FOR POINT 5: Desktop Packaging (.exe executable app via Electron / Tauri)

* **Architecture**: The desktop wrapper must be configured *offline-first*.
* **Implementation**: When the user requests a desktop build, the future AI assistant must provide a standard, zero-dependency script structure that packages the existing index.html, css/, and js/ folders into a localized environment using either an isolated custom native web-view shell or Electron without breaking the internal localStorage encryption mechanisms.
* **Asset Integrity**: All vendor libraries (crypto-js.min.js, ethers.umd.min.js, secp256k1.min.js, bitcoin.min.js) must remain embedded locally inside the application bundle to enforce absolute client-side execution.