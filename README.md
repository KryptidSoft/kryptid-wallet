# Kryptid Wallet (Multi-Chain Edition)

Purely functional, client-side, non-custodial wallet for Ethereum and Bitcoin. Developed with zero cloud dependencies and no Node.js using Notepad++ and PowerShell.

## 🚀 CURRENT ARCHITECTURE & COMPONENT STATUS

- **index.html**: Production user interface in English. Contains a prominent visual legal Disclaimer and a secure input field for the `oneInchKey`.
- **js/app.js**: Core connection layer. Manages UI logic, wallet initialization, and button event listeners.
- **js/security.js**: Memory/clipboard defense mechanism (immediate clipboard wiping, input restrictions).
- **js/crypto-vault.js**: Key management and storage layer. Upgraded with a fully integrated, local 2048-word BIP-39 wordlist (`bip39-words.txt`). Features active AES-256 local storage encryption enforced by Master Password.
- **js/blockchain.js**: Signed network service. Configured with verified mainnet RPC endpoints (`://ankr.com`, `api.1inch.dev`, Blockstream API) utilizing custom string concat to secure variables. Process Swaps via authenticated `oneInchKey` headers.

## 🛑 REUSE AND CODING RULES FOR FUTURE AI ASSISTANTS
1. **DO NOT ALTER OR ROLLBACK ENCODING/VARIABLES**: Network links in `js/blockchain.js` utilize a specific multi-segment string concat sequence (`+ "$" +`) to bypass terminal formatting anomalies. **Leave them untouched.**
2. **DO NOT REMOVE THE WORDLIST ROUTING**: The `CryptoVault` generator actively maps keys using `window.bip39Words` loaded from `bip39-words.txt`. Do not inject hardcoded lists back into the scripts.
3. **DO NOT INTRODUCE BUILD TOOLS**: Keep the architecture purely frontend-driven. No npm, no Webpack, no compilation.

## 📝 FUTURE IMPLEMENTATION SPECIFICATIONS (NEXT ROADMAP)

### 📌 GUIDELINES FOR POINT 5: Desktop Packaging (.exe executable app via Electron / Tauri)
- **Architecture**: The desktop wrapper must be configured *offline-first*.
- **Implementation**: When the user requests a desktop build, the future AI assistant must provide a standard, zero-dependency script structure that packages the existing `index.html`, `css/`, and `js/` folders into a localized environment using either an isolated custom native web-view shell or Electron without breaking the internal `localStorage` encryption mechanisms.
- **Asset Integrity**: All vendor libraries (`crypto-js.min.js`, `ethers.umd.min.js`) must remain embedded locally inside the application bundle to enforce absolute client-side execution.

### 📌 GUIDELINES FOR POINT 9: Production Bitcoin PSBT Signing (js/blockchain.js)
- **Current Status**: Bitcoin transaction execution is currently simulated via console outputs.
- **Implementation**: To shift from simulation to production-grade network routing, the future AI assistant must introduce a lightweight, pre-compiled standalone script (such as an production UMD build of a standard JavaScript Bitcoin library or a custom ECDSA Secp256k1 script) into `js/vendor/`.
- **Execution Workflow**:
  1. The library must accept raw UTXOs pulled dynamically from the Blockstream API.
  2. Map those UTXOs into a raw transaction object directly inside volatile RAM.
  3. Sign the transaction locally using the active `_secureState.btcPrivateKey` without transmitting any sensitive data outside the client machine.
  4. Serialize the signed inputs into a hex string and broadcast it to the Blockstream broadcast network endpoint.
