// Globální stav držený striktně v lokální paměti RAM
// Definováno klíčovým slovem var pro spolehlivou přístupnost napříč izolovanými skripty na Legacy PC
var _secureState = _secureState || {
    seedPhrase: null,
    ethPrivateKey: null,
    btcPrivateKey: null
};

document.addEventListener('DOMContentLoaded', () => {
    // 1. Obsluha tlačítek pro správu klíčů a kryptografického trezoru
    document.getElementById('generateBtn').addEventListener('click', () => {
        const mnemonic = CryptoVault.generateMnemonic();
        document.getElementById('seedInput').value = mnemonic;
        alert("New 12-word BIP-39 Seed generated in the field above. Secure it properly!");
    });

    document.getElementById('loadWalletBtn').addEventListener('click', () => {
        const val = document.getElementById('seedInput').value.trim();
        if (!val) return alert("Please enter seed or private key!");
        
        // Bezpečné odvození adres přes matematické jádro crypto-vault.js
        const accounts = CryptoVault.deriveKeys(val);
        document.getElementById('ethAddress').innerText = accounts.ethAddress;
        document.getElementById('btcAddress').innerText = accounts.btcAddress;
        document.getElementById('action-zone').style.display = 'block';
    });

    document.getElementById('saveVaultBtn').addEventListener('click', () => {
        const password = document.getElementById('masterPassword').value;
        CryptoVault.encryptAndSave(password);
    });

    document.getElementById('loadVaultBtn').addEventListener('click', () => {
        const password = document.getElementById('masterPassword').value;
        const decrypted = CryptoVault.decryptAndLoad(password);
        if (decrypted) {
            document.getElementById('seedInput').value = decrypted;
            alert("Vault successfully decrypted into memory. Now click 'Load from RAM'.");
        }
    });

    document.getElementById('clearMemoryBtn').addEventListener('click', () => {
        CryptoVault.zeroingMemory();
        document.getElementById('ethAddress').innerText = '---';
        document.getElementById('btcAddress').innerText = '---';
        document.getElementById('action-zone').style.display = 'none';
        alert("Application logged out and RAM securely wiped.");
    });

    // 2. Obsluha tlačítek pro síťové transakce a on-chain operace
    document.getElementById('sendEthBtn').addEventListener('click', () => {
        const target = document.getElementById('txTarget').value.trim();
        const amount = document.getElementById('txAmount').value.trim();
        if (!target || !amount) return alert("Please fill in destination and amount!");
        
        BlockchainService.sendEthereumTx(target, amount);
    });

    document.getElementById('sendBtcBtn').addEventListener('click', () => {
        const target = document.getElementById('txTarget').value.trim();
        const amount = document.getElementById('txAmount').value.trim();
        // OPRAVA 1: Přidána chybějící kontrola cíle transakce a sjednocen text hlášky
        if (!target || !amount) return alert("Please fill in destination and amount!");
        
        BlockchainService.sendBitcoinPSBT(target, amount);
    });

    document.getElementById('swapBtn').addEventListener('click', () => {
        const amount = document.getElementById('txAmount').value.trim();
        // OPRAVA 2: Přidána správná kontrola částky pro swap a odstraněn špatně vložený console.log
        if (!amount || amount === "0") return alert("Please enter a valid amount for swap!");
        
        BlockchainService.executeSwap(amount);
    });

    // OPRAVA 3: Sjednocen úplně poslední inicializační log do angličtiny
    console.log("[Kryptid Core] UI initialization completed. All architectural layers are linked.");
});
