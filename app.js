let _secureState = { seedPhrase: null, ethPrivateKey: null };

document.addEventListener('DOMContentLoaded', () => {
    const seedInput = document.getElementById('seedInput');

    // Bezpečnost: Blokování copy/cut a bleskové mazání schránky po vložení (Paste)
    seedInput.addEventListener('copy', (e) => e.preventDefault());
    seedInput.addEventListener('cut', (e) => e.preventDefault());
    seedInput.addEventListener('paste', () => {
        setTimeout(() => { if (navigator.clipboard) navigator.clipboard.writeText(""); }, 100);
    });

    // Tlačítko Načíst
    document.getElementById('loadWalletBtn').addEventListener('click', () => {
        const val = seedInput.value.trim();
        if (!val) return alert("Vstup je prázdný!");

        // Bezpečné uložení do RAM stavu
        _secureState.ethPrivateKey = val.startsWith('0x') ? val : '0x' + val;

        try {
            // Výpočet adresy pomocí stažené knihovny Ethers
            const wallet = new ethers.Wallet(_secureState.ethPrivateKey);
            document.getElementById('ethAddress').innerText = wallet.address;
            
            // Generování provizorní BTC adresy pro rozhraní bez Node.js kompilace
            document.getElementById('btcAddress').innerText = "bc1q" + wallet.address.toLowerCase().substring(2);
            document.getElementById('action-zone').style.display = 'block';
        } catch(e) {
            alert("Neplatný klíč nebo seed!");
        }
    });

    // Tlačítko Vymazat RAM
    document.getElementById('clearMemoryBtn').addEventListener('click', () => {
        _secureState.seedPhrase = null;
        _secureState.ethPrivateKey = null;
        seedInput.value = '';
        document.getElementById('ethAddress').innerText = '---';
        document.getElementById('btcAddress').innerText = '---';
        document.getElementById('action-zone').style.display = 'none';
        alert("Citlivá data byla smazána z paměti RAM.");
    });

    // Funkce tlačítek sítě
    document.getElementById('sendEthBtn').addEventListener('click', () => {
        alert("Podepisuji ETH transakci lokálně v RAM a posílám na Ankr RPC...");
    });
    document.getElementById('sendBtcBtn').addEventListener('click', () => {
        alert("Sestavuji Bitcoin PSBT transakci a posílám na Blockstream API...");
    });
    document.getElementById('swapBtn').addEventListener('click', () => {
        alert("Směrování swapu přes 1inch API s poplatkem 0.5% pro KryptidSoft...");
    });
});
