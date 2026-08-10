var _secureState = _secureState || { seedPhrase: null, ethPrivateKey: null, btcPrivateKey: null };

// Helper functions to show and hide validation errors in the user interface
function showTxError(message) {
    const errorDiv = document.getElementById('txError');
    if (errorDiv) {
        errorDiv.innerText = message;
        errorDiv.style.display = 'block';
    } else {
        alert(message); // Fallback if error container is missing in HTML
    }
}

function clearTxError() {
    const errorDiv = document.getElementById('txError');
    if (errorDiv) {
        errorDiv.style.display = 'none';
        errorDiv.innerText = '';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    
    // Button: Generate a completely new seed phrase
    document.getElementById('generateBtn').addEventListener('click', () => {
        const mnemonic = CryptoVault.generateMnemonic();
        document.getElementById('seedInput').value = mnemonic;
        alert("New 12-word BIP-39 Seed generated in the field above. Secure it properly!");
    });

    // Button: Derive cryptographic keys from RAM into the application layout
    document.getElementById('loadWalletBtn').addEventListener('click', async () => {
        let val = document.getElementById('seedInput').value.trim();
        if (!val) return alert("Please enter seed or private key!");
        clearTxError();

        // INTEGROVANÁ KONTROLA SEEDU PROTI PŘEKLEPŮM
        if (val.includes(' ') || val.split(/[\s,.\-_]+/).length > 1) {
            let cleanText = val.toLowerCase()
                               .replace(/[.,\-_#@*+/\\()\[\]{}!?:;0-9]/g, ' ')
                               .replace(/\s+/g, ' ')
                               .trim();
            const words = cleanText.split(' ');
            if (words.length !== 12 && words.length !== 24) {
                return showTxError(`Validation Error: Seed phrase must contain exactly 12 or 24 words. Detected ${words.length} words.`);
            }
            try {
                const dictResponse = await fetch('js/vendor/bip39-words.txt');
                if (dictResponse.ok) {
                    const dictText = await dictResponse.text();
                    const validBipWords = dictText.split(/\r?\n/).map(w => w.trim()).filter(w => w.length > 0);
                    for (let word of words) {
                        if (!validBipWords.includes(word)) {
                            return showTxError(`Critical Typos Detected: The word "${word}" does not exist in the official BIP-39 standard dictionary! Please fix your spelling.`);
                        }
                    }
                }
            } catch (err) { console.warn("Validation skipped:", err.message); }
            val = words.join(' ');
            document.getElementById('seedInput').value = val;
        }

        const accounts = CryptoVault.deriveKeys(val);
        document.getElementById('ethAddress').innerText = accounts.ethAddress;
        document.getElementById('btcAddress').innerText = accounts.btcAddress;
        
        // AUTOMATIC DYNAMIC TRANSACTION HISTORY ROUTING VIA CLICK
        const btcLink = document.getElementById('btcHistoryLink');
        const ethLink = document.getElementById('ethHistoryLink');
        
        if (btcLink) {
            btcLink.onclick = () => { window.open("https://blockstream.info" + accounts.btcAddress, "_blank"); };
        }
        if (ethLink) {
            ethLink.onclick = () => { window.open("https://etherscan.io" + accounts.ethAddress, "_blank"); };
        }
        
        // Securely isolate the private key inside memory state for signing operations
        if (accounts.btcPrivateKey) {
            _secureState.btcPrivateKey = accounts.btcPrivateKey;
        }
        
        document.getElementById('action-zone').style.display = 'block';
        clearTxError();

        // Core execution: Triggers client-side physical balance verification
        await BlockchainService.fetchAndDisplayBalances();
    });

    // Button: Encrypt local client cache using the user-defined master password
    document.getElementById('saveVaultBtn').addEventListener('click', () => {
        const password = document.getElementById('masterPassword').value;
        if (!password) return alert("Please enter a Master Password first!");
        CryptoVault.encryptAndSave(password);
    });

    // Button: Decrypt stored backup archive back into application memory
    document.getElementById('loadVaultBtn').addEventListener('click', () => {
        const password = document.getElementById('masterPassword').value;
        if (!password) return alert("Please enter your Master Password!");
        
        const decrypted = CryptoVault.decryptAndLoad(password);
        if (decrypted) {
            document.getElementById('seedInput').value = decrypted;
            alert("Vault successfully decrypted into memory. Now click 'Load from RAM'.");
        }
    });

    // Button: Absolute memory cleanup and operational state wipe
    document.getElementById('clearMemoryBtn').addEventListener('click', () => {
        CryptoVault.zeroingMemory();
        _secureState = { seedPhrase: null, ethPrivateKey: null, btcPrivateKey: null }; // Reset client architecture state
        document.getElementById('ethAddress').innerText = '---';
        document.getElementById('btcAddress').innerText = '---';
        document.getElementById('btcBalance').innerText = '0.00000000 BTC';
        document.getElementById('ethBalance').innerText = '0.0000 ETH';
        
        // Dynamic fallback reset for the multi-currency labels
        const currencySelect = document.getElementById('currencySelect');
        const activeTicker = currencySelect ? currencySelect.value : "USD";
        document.getElementById('btcFiat').innerText = `(0.00 ${activeTicker})`;
        document.getElementById('ethFiat').innerText = `(0.00 ${activeTicker})`;
        
        document.getElementById('seedInput').value = '';
        document.getElementById('masterPassword').value = '';
        document.getElementById('action-zone').style.display = 'none';
        clearTxError();
        alert("Application logged out and RAM securely wiped.");
    });

    // Button: Validates and executes an production Ethereum mainnet transaction
    document.getElementById('sendEthBtn').addEventListener('click', () => {
        clearTxError();
        const target = document.getElementById('txTarget').value.trim();
        const amount = document.getElementById('txAmount').value.trim();
        
        // Form validations and validation bounds checks
        if (!target || !amount) return showTxError("Validation Error: Destination address and amount are required fields!");
        if (parseFloat(amount) <= 0) return showTxError("Validation Error: Amount must be strictly greater than 0!");

        // Anti-collision address safeguards
        if (target.startsWith('bc1')) {
            return showTxError("Critical Protection: You are trying to transmit Ethereum assets to a native Bitcoin network address! Operation halted.");
        }
        
        const ethRegex = /^0x[a-fA-F0-9]{40}$/;
        if (!ethRegex.test(target)) {
            return showTxError("Validation Error: Invalid Ethereum destination format. Address must begin with '0x' and contain exactly 40 hex characters.");
        }

        console.log("[Kryptid] EVM parameters validated. Passing execution sequence to Ankr Mainnet RPC node...");
        BlockchainService.sendEthereumTx(target, amount);
    });

    // Button: Validates and signs an production Bitcoin transaction locally
    document.getElementById('sendBtcBtn').addEventListener('click', async () => {
        clearTxError();
        const target = document.getElementById('txTarget').value.trim();
        const amountStr = document.getElementById('txAmount').value.trim();
        
        // Form validations and validation bounds checks
        if (!target || !amountStr) return showTxError("Validation Error: Destination address and amount are required fields!");
        const amountBtc = parseFloat(amountStr);
        if (amountBtc <= 0) return showTxError("Validation Error: Amount must be strictly greater than 0!");

        // Anti-collision address safeguards
        if (target.startsWith('0x')) {
            return showTxError("Critical Protection: You are trying to transmit Bitcoin assets to an Ethereum network address! Operation halted.");
        }
        if (!target.startsWith('bc1')) {
            return showTxError("Validation Error: Unsupported target format. Only native SegWit addresses beginning with 'bc1' are acceptable.");
        }

        // State validation bounds checks
        if (!_secureState.btcPrivateKey) {
            return showTxError("Execution Failure: Cryptographic private key is missing from isolated memory space. Please re-load your credentials.");
        }

        const amountSats = Math.round(amountBtc * 100000000);
        const fromAddress = document.getElementById('btcAddress').innerText;

        console.log("[Kryptid] UTXO parameters validated. Initializing localized secp256k1 cryptographic engine...");
        try {
            await KryptidBitcoinEngine.sendTransaction(_secureState.btcPrivateKey, fromAddress, target, amountSats);
            alert("Bitcoin transaction signed locally in RAM and broadcasted to network successfully.");
        } catch (err) {
            showTxError(`Network Broadcast Exception: ${err.message}`);
        }
    });

    // Button: Routes token swapping routing parameters to the 1inch aggregator V6 portal
    document.getElementById('swapBtn').addEventListener('click', () => {
        clearTxError();
        const amount = document.getElementById('txAmount').value.trim();
        if (!amount || amount === "0" || parseFloat(amount) <= 0) {
            return alert("Please enter a valid amount for swap!");
        }
        BlockchainService.executeSwap(amount);
    });

    // Pojistný zámek, který zabrání nekonečnému zacyklení a pádu prohlížeče
    let isFetching = false;

    // Change Event: Automatically recalculate fiat values without re-logging whenever the currency switch is triggered
    document.getElementById('currencySelect').addEventListener('change', async () => {
        // Pokud už stahování dat běží, nepustíme kód dál a kruh se přeruší
        if (isFetching) return;
        
        try {
            isFetching = true; // Zamkneme proces
            console.log("[Kryptid] Fiat configuration modified by user. Fetching active parameters...");
            // OPRAVENO: Voláme stahování dat HNED, bez ohledu na to, zda je peněženka prázdná nebo načtená
            await BlockchainService.fetchAndDisplayBalances();
        } catch (err) {
            console.error("[Kryptid] Fetch error:", err.message);
        } finally {
            isFetching = false; // Po kompletním dokončení zámek zase odemkneme
        }
    });
});
