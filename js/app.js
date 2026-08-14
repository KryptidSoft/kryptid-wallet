document.addEventListener('DOMContentLoaded', () => {
    
    // GLOBÁLNÍ STAV PENĚŽENKY (Data-Driven State)
    if (!window.WalletState) {
        window.WalletState = { activeCoin: 'BTC' };
    }

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

        // Inicializace objektu pro privátní klíče, pokud neexistuje
        if (!_secureState.privateKeys) {
            _secureState.privateKeys = {};
        }

        const accounts = CryptoVault.deriveKeys(validatedSeed);
        
        // DYNAMICKÉ MAPOVÁNÍ ADRES A BLOCK EXPLORERŮ (Žádný hardcoding)
        Object.keys(accounts.addresses).forEach(coin => {
            const coinLower = coin.toLowerCase();
            
            // Automaticky najde a vyplní element adresy (např. btcAddress, ltcAddress...)
            const addressElement = document.getElementById(`${coinLower}Address`);
            if (addressElement) {
                addressElement.innerText = accounts.addresses[coin];
            }
            
            // Automaticky naváže správný block explorer ze síťového registru
            const linkElement = document.getElementById(`${coinLower}HistoryLink`);
            if (linkElement && KryptidNetworkRegistry[coin]) {
                linkElement.onclick = () => { 
                    let baseUrl;
                    if (coin === 'BTC' || coin === 'LTC' || coin === 'DOGE') {
                        baseUrl = `https://${KryptidNetworkRegistry[coin].explorer}/address/`;
                    } else if (coin === 'SOL') {
                        baseUrl = `https://solscan.io`;
                    } else {
                        baseUrl = `https://${coin === 'ETH' ? 'etherscan.io' : 'bscscan.com'}/address/`;
                    }
                    window.open(baseUrl + accounts.addresses[coin], "_blank"); 
                };
            }
            
            // Bezpečné uložení privátního klíče do izolovaného stavu RAM
            if (accounts.privateKeys[coin]) {
                _secureState.privateKeys[coin] = accounts.privateKeys[coin];
            }
        });
        
        // Zpětná kompatibilita pro starší moduly, které hledají btcPrivateKey přímo v kořeni
        if (accounts.privateKeys['BTC']) {
            _secureState.btcPrivateKey = accounts.privateKeys['BTC'];
        }
        if (accounts.privateKeys['ETH']) {
            _secureState.ethPrivateKey = accounts.privateKeys['ETH'];
        }
        
        onboardingScreen.style.display = 'none';
        mainDashboard.style.display = 'block';
        document.getElementById('action-zone').style.display = 'block';
        clearTxError();

        // Spuštění univerzálního agregátoru zůstatků a cen
        await BlockchainService.fetchAndDisplayBalances();
    });

    // Button: Option A - Encrypt local client cache using the user-defined master password
    document.getElementById('saveVaultBtn').addEventListener('click', () => {
        const password = document.getElementById('masterPassword').value;
        if (!password) return alert("Please enter a Master Password first!");
        
        CryptoVault.encryptAndSave(password);
        
        // Complete state lockdown & memory wipe
        CryptoVault.zeroingMemory();
        _secureState = { seedPhrase: null, ethPrivateKey: null, btcPrivateKey: null, privateKeys: {} };
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
    // Button: Option B - Destructive Logout (Plně dynamické promazání RAM a UI cache)
    document.getElementById('clearMemoryBtn').addEventListener('click', () => {
        CryptoVault.zeroingMemory();
        
        // Vyčištění všech privátních klíčů najednou napříč všemi rodinami
        _secureState = { seedPhrase: null, ethPrivateKey: null, btcPrivateKey: null, privateKeys: {} };
        
        // Dynamicky najde všechny elementy adres, zůstatků a fiat hodnot a bezpečně je resetuje
        document.querySelectorAll('[id$="Balance"]').forEach(el => {
            const coin = el.id.replace('Balance', '').toUpperCase();
            if (coin === 'BTC' || coin === 'LTC') {
                el.innerText = `0.00000000 ${coin}`;
            } else if (coin === 'SOL' || coin === 'TON') {
                el.innerText = `0.000000000 ${coin}`;
            } else {
                el.innerText = `0.0000 ${coin}`;
            }
        });
        document.querySelectorAll('[id$="Fiat"]').forEach(el => el.innerText = '(0.00 USD)');
        
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

    // JEDINÉ UNIVERZÁLNÍ TLAČÍTKO PRO ODESÍLÁNÍ JAKÉKOLI MINCE
    const universalSendBtn = document.getElementById('universalSendBtn');
    if (universalSendBtn) {
        universalSendBtn.addEventListener('click', async () => {
            clearTxError();
            
            const currentCoin = window.WalletState.activeCoin; // Zjistí, zda posíláme BTC, ETH, LTC, DOGE, BNB, TRX
            const target = document.getElementById('txTarget').value.trim();
            const amountStr = document.getElementById('txAmount').value.trim();
            
            const addrElement = document.getElementById(`${currentCoin.toLowerCase()}Address`);
            const fromAddress = addrElement ? addrElement.textContent.trim() : "";
            
            // Získání privátního klíče z chráněného pole privátních klíčů v RAM
            const privateKey = _secureState.privateKeys ? _secureState.privateKeys[currentCoin] : null;

            // 1. Spuštění jednotné validace z wallet-engine.js podle typu rodiny/mince
            if (window.WalletEngine && typeof window.WalletEngine.validateTx === 'function') {
                if (!WalletEngine.validateTx(currentCoin, target, amountStr)) return;
            } else {
                // Zpětná kompatibilita pro původní samostatné validační funkce
                if (currentCoin === 'BTC' && !WalletEngine.validateBitcoinTx(target, amountStr)) return;
                if (currentCoin === 'ETH' && !WalletEngine.validateEthereumTx(target, amountStr)) return;
            }

            console.log(`[Kryptid] Initializing validation & signing sequence for ${currentCoin}...`);

            try {
                // OPRAVENO: Částku pro blockchain.js necháme jako desetinné číslo, 
                // protože blockchain.js si z registru sám vytáhne správné decimals a přepočítá satoshi!
                await BlockchainService.sendTransaction(currentCoin, privateKey, fromAddress, target, amountStr);
                
                // Vyčištění polí formuláře po úspěšném odeslání
                document.getElementById('txTarget').value = '';
                document.getElementById('txAmount').value = '';
                alert(`${currentCoin} transaction signed and broadcasted successfully.`);
            } catch (err) {
                showTxError(`Broadcast Error: ${err.message}`);
            }
        });
    }

// REAKTIVNÍ OŽIVENÍ KLIKÁNÍ NA KARTY MINCÍ V DASHBOARDU (S UX OPRAVOU)
    document.querySelectorAll('.crypto-card').forEach(card => {
        card.addEventListener('click', (e) => {
            // BEZPEČNOSTNÍ POJISTKA: Pokud uživatel kliknul na tlačítko [copy], chceme POUZE zkopírovat adresu.
            // Nechceme přepínat aktivní formulář ani čistit rozepsaná pole.
            if (e.target.classList.contains('copy-trigger')) {
                return; 
            }

            // 1. Odstranit aktivní vizuální zvýraznění ze všech karet a přidat ho na kliknutou
            document.querySelectorAll('.crypto-card').forEach(c => c.classList.remove('active-card'));
            card.classList.add('active-card');
            
            // 2. Aktualizovat globální stav peněženky
            const selectedCoin = card.getAttribute('data-coin');
            window.WalletState.activeCoin = selectedCoin;
            
            // 3. Dynamicky transformovat texty v odesílacím formuláři
            document.getElementById('actionZoneTitle').innerText = `Send Transaction / Swap (${selectedCoin})`;

            // === PŘESNĚ SEM VLOŽTE TYTO 3 NOVÉ ŘÁDKY ===
            const currentAddr = document.getElementById(`${selectedCoin.toLowerCase()}Address`)?.innerText || '---';
            const currentBal = document.getElementById(`${selectedCoin.toLowerCase()}Balance`)?.innerText || '0.00';
            document.getElementById('current-send-source-info').innerText = `${currentBal} (${currentAddr})`;

            if (universalSendBtn) universalSendBtn.innerText = `Send ${selectedCoin}`;
            
            // 4. DYNAMICKÝ UNIVERZÁLNÍ ENGLISH PLACEHOLDER PRO STOVKY MINCÍ
            // Vymaže nekonečné podmínky a automaticky detekuje rodinu z registru (blockchain.js)
            const txTargetInput = document.getElementById('txTarget');
            if (txTargetInput && KryptidNetworkRegistry[selectedCoin]) {
                const familyType = KryptidNetworkRegistry[selectedCoin].type;
                
                if (familyType === 'EVM') {
                    // Tento řádek obslouží ETH, BNB a všech 500+ ERC-20/BEP-20 tokenů na světě
                    txTargetInput.setAttribute('placeholder', `Enter recipient's 0x hex address for ${selectedCoin}...`);
                } else if (familyType === 'UTXO') {
                    // Obslouží BTC, LTC, DOGE a jakékoli budoucí UTXO forky
                    const sample = selectedCoin === 'BTC' ? 'bc1...' : selectedCoin === 'LTC' ? 'ltc1...' : 'standard format';
                    txTargetInput.setAttribute('placeholder', `Enter recipient's ${selectedCoin} address (${sample})...`);
                } else if (familyType === 'TRON') {
                    txTargetInput.setAttribute('placeholder', `Enter recipient's TRON format address starting with T...`);
                } else if (familyType === 'SOL') {
                    txTargetInput.setAttribute('placeholder', `Enter recipient's Base58 Solana address (e.g. 7xKX...)...`);
                }
            } else if (txTargetInput) {
                // Generický záložní placeholder pro ERC-20 altcoiny, které se načtou dynamicky do kontejneru
                txTargetInput.setAttribute('placeholder', `Enter recipient's 0x destination address for ${selectedCoin}...`);
            }

			// 5. Inteligentní zobrazení swapu pro VŠECHNY sítě, které máte v blockchain.js implementované
            const swapBtn = document.getElementById('swapBtn');
            if (swapBtn) {
                const supportedSwapCoins = ['ETH', 'BNB', 'TRX', 'SOL'];
                const isSwapSupported = supportedSwapCoins.includes(selectedCoin);
                swapBtn.style.display = isSwapSupported ? 'inline-block' : 'none';
            }

            
            // Vyčistit předchozí vstupy a chybové hlášky
            document.getElementById('txTarget').value = '';
            document.getElementById('txAmount').value = '';
            
            // ============================================================
            // JEDINÁ OPRAVA: Plynulé svezení uživatele přímo k formuláři
            // ============================================================
            const actionZone = document.getElementById('action-zone');
            if (actionZone) {
                actionZone.scrollIntoView({ behavior: 'smooth' });
            }

            clearTxError();
        });
    });

    // Button: Routes parameters to 1inch aggregator V6 portal (Zůstává zachován pro EVM)
    document.getElementById('swapBtn').addEventListener('click', () => {
        clearTxError();
		
        if (!navigator.onLine) {
            alert("The 0.2% internal token swap requires an active internet connection to fetch current rates and liquidity pool routing.");
            return;
        }
	
        const amount = document.getElementById('txAmount').value.trim();
        if (!amount || amount === "0" || parseFloat(amount) <= 0) return alert("Please enter valid amount!");
        
        // !!! TADY JE TA OPRAVA: Vytáhneme klíč z RAM podle aktivní mince !!!
        const currentCoin = window.WalletState.activeCoin;
        const privateKey = _secureState.privateKeys ? _secureState.privateKeys[currentCoin] : null;

        // !!! A TADY HO PŘEDÁME DO ZÁVORKY !!!
        BlockchainService.executeSwap(amount, privateKey);
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
