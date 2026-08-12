const KryptidBitcoinEngine = {
    // Kryptografické a síťové parametry pro jednotlivé blockchainy
    NETWORK_PARAMS: {
        'BTC': {
            network: { messagePrefix: '\x18Bitcoin Signed Message:\n', bech32: 'bc', pubKeyHash: 0x00, scriptHash: 0x05, wif: 0x80 },
            fee: 2500,
            dust: 546
        },
        'LTC': {
            network: { messagePrefix: '\x19Litecoin Signed Message:\n', bech32: 'ltc', pubKeyHash: 0x30, scriptHash: 0x32, wif: 0xb0 },
            fee: 5000, 
            dust: 5460
        },
        'DOGE': {
            network: { messagePrefix: '\x19Dogecoin Signed Message:\n', pubKeyHash: 0x1e, scriptHash: 0x16, wif: 0x9e },
            fee: 100000000, // Dogecoin vyžaduje fixní poplatek (1 DOGE) zapsaný v Satoshis
            dust: 1000000
        }
    },

    async sendTransaction(coin, privateKeyHex, fromAddress, targetAddress, amountSats) {
        if (!privateKeyHex || !fromAddress || !targetAddress || amountSats <= 0) {
            throw new Error(`Invalid parameters passed to Kryptid${coin}Engine.`);
        }

        // 1. Selekce síťové konfigurace na základě parametru mince
        const cfg = this.NETWORK_PARAMS[coin] || this.NETWORK_PARAMS['BTC'];
        const network = cfg.network;

        // 2. Sestavení URL adresy pro UTXO z globálního registru (načteno z blockchain.js)
        const networkConfig = KryptidNetworkRegistry[coin];
        if (!networkConfig) {
            throw new Error(`Network registry configuration missing for ${coin}`);
        }
        
        const utxoUrl = networkConfig.apiUrl.replace("{address}", fromAddress);
        const response = await fetch(utxoUrl);
        const utxos = await response.json();
        
        if (!utxos || utxos.length === 0) {
            throw new Error(`No spendable UTXOs found on this ${coin} address.`);
        }

        // 3. Inicializace klientského TransactionBuilderu se specifickými bajty sítě
        const txb = new bitcoin.TransactionBuilder(network);
        let totalInputSats = 0;
        let inputCount = 0;

        // Iterace a sčítání dostupných vstupů pro pokrytí částky a poplatku
        for (const utxo of utxos) {
            txb.addInput(utxo.txid, utxo.vout);
            totalInputSats += utxo.value;
            inputCount++;
            if (totalInputSats >= (amountSats + cfg.fee)) break;
        }

        if (totalInputSats < (amountSats + cfg.fee)) {
            
            throw new Error(`Insufficient funds. Need ${amountSats + cfg.fee} satoshis.`);
        }

        // 4. Definice výstupů - Cílová adresa
        txb.addOutput(targetAddress, amountSats);
        
        // Výpočet a odeslání drobné vratky (change) zpět na adresu odesílatele
        const changeSats = totalInputSats - amountSats - cfg.fee;
        if (changeSats > cfg.dust) {
            txb.addOutput(fromAddress, changeSats);
        }

        // 5. Lokální podepisování v izolované paměti RAM
        // Převedení hexadecimálního privátního klíče na bezpečný Buffer pro eliptickou křivku secp256k1
        const keyPair = bitcoin.ECPair.fromPrivateKey(
            bitcoin.Buffer.Buffer.from(privateKeyHex, 'hex'), 
            { network }
        );

        // Podpis každého vázaného vstupu v transakci
        for (let i = 0; i < inputCount; i++) {
            txb.sign(i, keyPair);
        }

        // Kompilace transakce do čistého hexadecimálního řetězce
        const txHex = txb.build().toHex();

        // 6. Volba správné vysílací brány podle typu sítě
        const broadcastUrl = coin === 'BTC' ? "https://blockstream.info" :
                             coin === 'LTC' ? "https://litecoinspace.org" :
                             "https://tokenview.io";

        const broadcastResponse = await fetch(broadcastUrl, {
            method: 'POST',
            body: txHex
        });

        if (!broadcastResponse.ok) {
            const errText = await broadcastResponse.text();
            throw new Error(`${coin} network broadcast rejected: ${errText}`);
        }

        return await broadcastResponse.text();
    }
};
