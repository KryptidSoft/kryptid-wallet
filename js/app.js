var _secureState = _secureState || { seedPhrase: null, ethPrivateKey: null, btcPrivateKey: null };

// Pomocné funkce pro zobrazení a skrytí chyb přímo v uživatelském rozhraní (UI)
function showTxError(message) {
    const errorDiv = document.getElementById('txError');
    if (errorDiv) {
        errorDiv.innerText = message;
        errorDiv.style.display = 'block';
    } else {
        alert(message); // Fallback pokud div v HTML neexistuje
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
    
    // Tlačítko: Generování nového seedu
    document.getElementById('generateBtn').addEventListener('click', () => {
        const mnemonic = CryptoVault.generateMnemonic();
        document.getElementById('seedInput').value = mnemonic;
        alert("New 12-word BIP-39 Seed generated in the field above. Secure it properly!");
    });

    // Tlačítko: Načtení peněženky z RAM do rozhraní
    document.getElementById('loadWalletBtn').addEventListener('click', () => {
        const val = document.getElementById('seedInput').value.trim();
        if (!val) return alert("Please enter seed or private key!");
        
        const accounts = CryptoVault.deriveKeys(val);
        document.getElementById('ethAddress').innerText = accounts.ethAddress;
        document.getElementById('btcAddress').innerText = accounts.btcAddress;
        
        // Bezpečné uložení privátního klíče do izolovaného stavu pro reálný podpis transakcí
        if (accounts.btcPrivateKey) {
            _secureState.btcPrivateKey = accounts.btcPrivateKey;
        }
        
        document.getElementById('action-zone').style.display = 'block';
        clearTxError();
    });

    // Tlačítko: Zašifrování LocalStorage přes Master Password
    document.getElementById('saveVaultBtn').addEventListener('click', () => {
        const password = document.getElementById('masterPassword').value;
        if (!password) return alert("Please enter a Master Password first!");
        CryptoVault.encryptAndSave(password);
    });

    // Tlačítko: Dešifrování LocalStorage do paměti
    document.getElementById('loadVaultBtn').addEventListener('click', () => {
        const password = document.getElementById('masterPassword').value;
        if (!password) return alert("Please enter your Master Password!");
        
        const decrypted = CryptoVault.decryptAndLoad(password);
        if (decrypted) {
            document.getElementById('seedInput').value = decrypted;
            alert("Vault successfully decrypted into memory. Now click 'Load from RAM'.");
        }
    });

    // Tlačítko: Kompletní smazání RAM a odhlášení
    document.getElementById('clearMemoryBtn').addEventListener('click', () => {
        CryptoVault.zeroingMemory();
        _secureState = { seedPhrase: null, ethPrivateKey: null, btcPrivateKey: null }; // Vyčištění stavu aplikace
        document.getElementById('ethAddress').innerText = '---';
        document.getElementById('btcAddress').innerText = '---';
        document.getElementById('seedInput').value = '';
        document.getElementById('masterPassword').value = '';
        document.getElementById('action-zone').style.display = 'none';
        clearTxError();
        alert("Application logged out and RAM securely wiped.");
    });

    // Tlačítko: REÁLNÉ ODESLÁNÍ ETH S INTEGRACÍ VALIDACÍ CHYB
    document.getElementById('sendEthBtn').addEventListener('click', () => {
        clearTxError();
        const target = document.getElementById('txTarget').value.trim();
        const amount = document.getElementById('txAmount').value.trim();
        
        // 1. Základní kontrola polí
        if (!target || !amount) return showTxError("Chyba: Vyplňte cílovou adresu a částku!");
        if (parseFloat(amount) <= 0) return showTxError("Chyba: Částka musí být vyšší než 0!");

        // 2. Klientská ochrana proti záměně adres (EVM vs Bitcoin)
        if (target.startsWith('bc1')) {
            return showTxError("Kritická chyba: Pokoušíte se poslat Ethereum na Bitcoin adresu! Transakce byla zablokována.");
        }
        
        // Formátová kontrola Ethereum adresy (40 hex znaků s 0x)
        const ethRegex = /^0x[a-fA-F0-9]{40}$/;
        if (!ethRegex.test(target)) {
            return showTxError("Chyba: Neplatný formát Ethereum adresy. Musí začínat na '0x' a mít 40 znaků.");
        }

        console.log("[Kryptid] Validace ETH úspěšná. Odesílám síťový požadavek...");
        BlockchainService.sendEthereumTx(target, amount);
    });

    // Tlačítko: REÁLNÉ ODESLÁNÍ BITCOINU (PROPOJENÍ NA SEPC256K1 ENGINE S VALIDACÍ)
    document.getElementById('sendBtcBtn').addEventListener('click', async () => {
        clearTxError();
        const target = document.getElementById('txTarget').value.trim();
        const amountStr = document.getElementById('txAmount').value.trim();
        
        // 1. Základní kontrola polí
        if (!target || !amountStr) return showTxError("Chyba: Vyplňte cílovou adresu a částku!");
        const amountBtc = parseFloat(amountStr);
        if (amountBtc <= 0) return showTxError("Chyba: Částka musí být vyšší než 0!");

        // 2. Klientská ochrana proti záměně adres (Bitcoin vs EVM)
        if (target.startsWith('0x')) {
            return showTxError("Kritická chyba: Pokoušíte se poslat Bitcoin na Ethereum adresu! Transakce byla zablokována.");
        }
        if (!target.startsWith('bc1')) {
            return showTxError("Chyba: Neplatná adresa. Podporovány jsou pouze nativní Bitcoin SegWit adresy začínající na 'bc1'.");
        }

        // 3. Kontrola přítomnosti privátního klíče v zabezpečeném stavu RAM
        if (!_secureState.btcPrivateKey) {
            return showTxError("Chyba: V paměti RAM nebyl nalezen privátní klíč. Načtěte peněženku znovu.");
        }

        // Převod zadaného BTC množství na satoshi jednotky (1 BTC = 100 000 000 satoshi)
        const amountSats = Math.round(amountBtc * 100000000);
        const fromAddress = document.getElementById('btcAddress').innerText;

        console.log("[Kryptid] Validace BTC úspěšná. Inicializuji KryptidBitcoinEngine...");
        try {
            // Volání ostrého podpisového enginu, který stahuje UTXO a podepisuje transakci offline v RAM
            await KryptidBitcoinEngine.sendTransaction(_secureState.btcPrivateKey, fromAddress, target, amountSats);
            alert("Bitcoin transakce byla úspěšně podepsána a odeslána do sítě!");
        } catch (err) {
            showTxError(`Chyba podpisu/sítě: ${err.message}`);
        }
    });

    // Tlačítko: Směna tokenů přes 1inch Router
    document.getElementById('swapBtn').addEventListener('click', () => {
        clearTxError();
        const amount = document.getElementById('txAmount').value.trim();
        if (!amount || amount === "0" || parseFloat(amount) <= 0) {
            return alert("Please enter a valid amount for swap!");
        }
        BlockchainService.executeSwap(amount);
    });

    console.log("[Kryptid Core] UI initialization completed. All architectural layers are linked.");
});
