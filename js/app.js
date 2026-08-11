document.addEventListener('DOMContentLoaded', () => {
    
    // UI NAVIGATION ELEMENTS
    const onboardingScreen = document.getElementById('onboarding-screen');
    const mainDashboard = document.getElementById('main-wallet-dashboard');
    const seedCreateSubzone = document.getElementById('seed-create-subzone');
    const seedImportSubzone = document.getElementById('seed-import-subzone');
    const vaultSubzone = document.getElementById('vault-setup-subzone');
    const backBtn = document.getElementById('backToRoutesBtn');

    // Routing Logic: Clean transition based on onboarding choice
    document.getElementById('routeCreateBtn').addEventListener('click', () => {
        seedCreateSubzone.style.display = 'block';
        seedImportSubzone.style.display = 'none';
        vaultSubzone.style.display = 'none';
        backBtn.style.display = 'inline-block';
    });

    document.getElementById('routeImportBtn').addEventListener('click', () => {
        seedCreateSubzone.style.display = 'none';
        seedImportSubzone.style.display = 'block';
        vaultSubzone.style.display = 'none';
        backBtn.style.display = 'inline-block';
    });

    document.getElementById('routeVaultBtn').addEventListener('click', () => {
        seedCreateSubzone.style.display = 'none';
        seedImportSubzone.style.display = 'none';
        vaultSubzone.style.display = 'block';
        backBtn.style.display = 'inline-block';
    });

    if (backBtn) {
        backBtn.addEventListener('click', () => {
            seedCreateSubzone.style.display = 'none';
            seedImportSubzone.style.display = 'none';
            vaultSubzone.style.display = 'none';
            backBtn.style.display = 'none';
        });
    }

    // Button: Generate a completely new seed phrase
    document.getElementById('generateBtn').addEventListener('click', () => {
        const mnemonic = CryptoVault.generateMnemonic();
        seedImportSubzone.style.display = 'block';
        document.getElementById('seedInput').value = mnemonic;
        alert("New BIP-39 Seed generated in the field below. Secure it properly!");
    });

    // Button: Derive cryptographic keys from RAM into the application layout
    document.getElementById('loadWalletBtn').addEventListener('click', async () => {
        let val = document.getElementById('seedInput').value.trim();
        if (!val) return alert("Please enter seed or private key!");
        clearTxError();

        // Odkaz na externí validátor z nového js/wallet-engine.js
        const validatedSeed = await WalletEngine.validateSeedPhrase(val);
        if (!validatedSeed) return;

        const accounts = CryptoVault.deriveKeys(validatedSeed);
        document.getElementById('ethAddress').innerText = accounts.ethAddress;
        document.getElementById('btcAddress').innerText = accounts.btcAddress;
        
        // Funkční block explorery se správnými cesty a lomítky
        const btcLink = document.getElementById('btcHistoryLink');
        const ethLink = document.getElementById('ethHistoryLink');
        
        if (btcLink) {
            btcLink.onclick = () => { window.open("https://blockstream.info" + accounts.btcAddress, "_blank"); };
        }
        if (ethLink) {
            ethLink.onclick = () => { window.open("https://etherscan.io" + accounts.ethAddress, "_blank"); };
        }
        
        if (accounts.btcPrivateKey) {
            _secureState.btcPrivateKey = accounts.btcPrivateKey;
        }
        
        onboardingScreen.style.display = 'none';
        mainDashboard.style.display = 'block';
        document.getElementById('action-zone').style.display = 'block';
        clearTxError();

        await BlockchainService.fetchAndDisplayBalances();
    });
    // Button: Option A - Encrypt local client cache using the user-defined master password
    document.getElementById('saveVaultBtn').addEventListener('click', () => {
        const password = document.getElementById('masterPassword').value;
        if (!password) return alert("Please enter a Master Password first!");
        
        CryptoVault.encryptAndSave(password);
        
        // Complete state lockdown
        CryptoVault.zeroingMemory();
        _secureState = { seedPhrase: null, ethPrivateKey: null, btcPrivateKey: null };
        document.getElementById('seedInput').value = '';
        document.getElementById('masterPassword').value = '';
        
        mainDashboard.style.display = 'none';
        seedCreateSubzone.style.display = 'none';
        seedImportSubzone.style.display = 'none';
        vaultSubzone.style.display = 'none';
        backBtn.style.display = 'none';
        onboardingScreen.style.display = 'block';
        
        clearTxError();
        alert("Wallet securely locked with your password. RAM wiped.");
    });

    // Button: Decrypt stored backup archive back into application memory (Přihlášení z minula)
    document.getElementById('loadVaultBtn').addEventListener('click', () => {
        const password = document.getElementById('masterPasswordUnlock').value;
        if (!password) return alert("Please enter your Master Password!");
        
        const decrypted = CryptoVault.decryptAndLoad(password);
        if (decrypted) {
            document.getElementById('seedInput').value = decrypted;
            document.getElementById('loadWalletBtn').click();
            document.getElementById('masterPasswordUnlock').value = '';
        }
    });

    // Button: Option B - Destructive Logout (Wipe RAM & Cache completely)
    document.getElementById('clearMemoryBtn').addEventListener('click', () => {
        CryptoVault.zeroingMemory();
        _secureState = { seedPhrase: null, ethPrivateKey: null, btcPrivateKey: null };
        
        document.getElementById('ethAddress').innerText = '---';
        document.getElementById('btcAddress').innerText = '---';
        document.getElementById('btcBalance').innerText = '0.00000000 BTC';
        document.getElementById('ethBalance').innerText = '0.0000 ETH';
        
        const currencySelect = document.getElementById('currencySelect');
        const activeTicker = currencySelect ? currencySelect.value : "USD";
        document.getElementById('btcFiat').innerText = `(0.00 ${activeTicker})`;
        document.getElementById('ethFiat').innerText = `(0.00 ${activeTicker})`;
        
        document.getElementById('seedInput').value = '';
        document.getElementById('masterPasswordUnlock').value = '';
        document.getElementById('action-zone').style.display = 'none';
        
        mainDashboard.style.display = 'none';
        seedCreateSubzone.style.display = 'none';
        seedImportSubzone.style.display = 'none';
        vaultSubzone.style.display = 'none';
        backBtn.style.display = 'none';
        onboardingScreen.style.display = 'block';
        
        clearTxError();
        alert("Session terminated. RAM and volatile states have been securely wiped.");
    });

    // Button: Executes Ethereum mainnet transaction with validation layer
    document.getElementById('sendEthBtn').addEventListener('click', () => {
        clearTxError();
        const target = document.getElementById('txTarget').value.trim();
        const amount = document.getElementById('txAmount').value.trim();
        
        if (!WalletEngine.validateEthereumTx(target, amount)) return;

        console.log("[Kryptid] EVM parameters validated. Passing execution sequence to Ankr Mainnet RPC node...");
        BlockchainService.sendEthereumTx(target, amount);
    });

    // Button: Signs and executes a Bitcoin transaction locally via secp256k1
    document.getElementById('sendBtcBtn').addEventListener('click', async () => {
        clearTxError();
        const target = document.getElementById('txTarget').value.trim();
        const amountStr = document.getElementById('txAmount').value.trim();
        
        if (!WalletEngine.validateBitcoinTx(target, amountStr)) return;

        const amountSats = Math.round(parseFloat(amountStr) * 100000000);
        const fromAddress = document.getElementById('btcAddress').textContent;

        console.log("[Kryptid] UTXO parameters validated. Initializing localized secp256k1 cryptographic engine...");
        try {
            await KryptidBitcoinEngine.sendTransaction(_secureState.btcPrivateKey, fromAddress, target, amountSats);
            alert("Bitcoin transaction signed and broadcasted successfully.");
        } catch (err) {
            showTxError(`Broadcast Error: ${err.message}`);
        }
    });

    // Button: Routes parameters to 1inch aggregator V6 portal
    document.getElementById('swapBtn').addEventListener('click', () => {
        clearTxError();
        const amount = document.getElementById('txAmount').value.trim();
        if (!amount || amount === "0" || parseFloat(amount) <= 0) return alert("Please enter valid amount!");
        BlockchainService.executeSwap(amount);
    });

    let isFetching = false;
    document.getElementById('currencySelect').addEventListener('change', async () => {
        if (isFetching) return;
        try {
            isFetching = true;
            await BlockchainService.fetchAndDisplayBalances();
        } catch (e) {
            console.error(e.message);
        } finally {
            isFetching = false;
        }
    });

    // AUTOMATICKÝ GENERÁTOR TEXTOVÝCH TLAČÍTEK [copy] PRO VŠECHNY ADRESY
    function injectCopyButtons() {
        const addressElements = document.querySelectorAll('#btcAddress, #ethAddress, .altcoins-wrapper .address-value, [id$="Address"]');
        addressElements.forEach(el => {
            if (el.nextElementSibling && el.nextElementSibling.classList.contains('copy-trigger')) return;
            
            const btn = document.createElement('button');
            btn.className = 'copy-trigger';
            btn.innerText = '[copy]';
            
            btn.addEventListener('click', (e) => {
                const txt = el.textContent;
                if (txt && txt !== "---") {
                    navigator.clipboard.writeText(txt).then(() => {
                        e.target.innerText = "[copied]";
                        setTimeout(() => { e.target.innerText = "[copy]"; }, 1000);
                    });
                }
            });
            el.parentNode.insertBefore(btn, el.nextSibling);
        });
    }

    injectCopyButtons();
    const tokenContainer = document.getElementById('dynamicTokensContainer');
    if (tokenContainer) {
        const observer = new MutationObserver(injectCopyButtons);
        observer.observe(tokenContainer, { childList: true, subtree: true });
    }
});
