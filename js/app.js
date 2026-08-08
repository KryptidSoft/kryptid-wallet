document.addEventListener('DOMContentLoaded', () => {
    // Registrace tlačítek správy klíčů
    document.getElementById('generateBtn').addEventListener('click', () => {
        const mnemonic = CryptoVault.generateMnemonic();
        document.getElementById('seedInput').value = mnemonic;
        alert("V horním poli byl vygenerován nový 12slovný BIP-39 Seed. Uschovejte jej!");
    });

    document.getElementById('loadWalletBtn').addEventListener('click', () => {
        const val = document.getElementById('seedInput').value.trim();
        if (!val) return alert("Zadejte seed nebo privátní klíč!");
        
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
            alert("Trezor byl úspěšně dešifrován do paměti. Nyní klikněte na tlačítko 'Načíst z RAM'.");
        }
    });

    document.getElementById('clearMemoryBtn').addEventListener('click', () => {
        CryptoVault.zeroingMemory();
        document.getElementById('ethAddress').innerText = '---';
        document.getElementById('btcAddress').innerText = '---';
        document.getElementById('action-zone').style.display = 'none';
        alert("Aplikace byla odhlášena a RAM bezpečně vymazána.");
    });

    // Registrace tlačítek síťových transakcí
    document.getElementById('sendEthBtn').addEventListener('click', () => {
        BlockchainService.sendEthereumTx(document.getElementById('txTarget').value, document.getElementById('txAmount').value);
    });

    document.getElementById('sendBtcBtn').addEventListener('click', () => {
        BlockchainService.sendBitcoinPSBT(document.getElementById('txTarget').value, document.getElementById('txAmount').value);
    });

    document.getElementById('swapBtn').addEventListener('click', () => {
        BlockchainService.executeSwap(document.getElementById('txAmount').value);
    });
});
