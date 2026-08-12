const KryptidBitcoinEngine = {
    NETWORK_PARAMS: {
        'BTC': {
            network: { messagePrefix: '\x18Bitcoin Signed Message:\n', bech32: 'bc', pubKeyHash: 0x00, scriptHash: 0x05, wif: 0x80 },
            fee: 2500,
            dust: 546,
            apiUrl: "https://blockstream.info{address}/utxo",
            pushUrl: "https://blockstream.info"
        },
        'LTC': {
            network: { messagePrefix: '\x19Litecoin Signed Message:\n', bech32: 'ltc', pubKeyHash: 0x30, scriptHash: 0x32, wif: 0xb0 },
            fee: 5000, 
            dust: 5460,
            apiUrl: "https://litecoinspace.org{address}/utxo",
            pushUrl: "https://litecoinspace.org"
        },
        'DOGE': {
            network: { messagePrefix: '\x19Dogecoin Signed Message:\n', pubKeyHash: 0x1e, scriptHash: 0x16, wif: 0x9e },
            fee: 100000000, 
            dust: 1000000,
            apiUrl: "https://tokenview.io{address}/utxo",
            pushUrl: "https://tokenview.io"
        }
    },

    async sendTransaction(coin, privateKeyHex, fromAddress, targetAddress, amountSats) {
        if (!privateKeyHex || !fromAddress || !targetAddress || amountSats <= 0) {
            throw new Error(`Invalid parameters passed to Kryptid${coin}Engine.`);
        }

        const cfg = this.NETWORK_PARAMS[coin] || this.NETWORK_PARAMS['BTC'];
        const network = cfg.network;

        // 2. Bezpečné načtení URL adresy pro UTXO s lokální zálohou
        let utxoTemplate = cfg.apiUrl;
        if (typeof KryptidNetworkRegistry !== 'undefined' && KryptidNetworkRegistry[coin] && KryptidNetworkRegistry[coin].apiUrl) {
            utxoTemplate = KryptidNetworkRegistry[coin].apiUrl;
        }
        
        const utxoUrl = utxoTemplate.replace("{address}", fromAddress);
        const response = await fetch(utxoUrl);
        const utxos = await response.json();
        
        if (!utxos || utxos.length === 0) {
            throw new Error(`No spendable UTXOs found on this ${coin} address.`);
        }

        // 3. Klientský TransactionBuilder
        const txb = new bitcoin.TransactionBuilder(network);
        let totalInputSats = 0;
        let inputCount = 0;

        for (const utxo of utxos) {
            txb.addInput(utxo.txid, utxo.vout);
            totalInputSats += utxo.value;
            inputCount++;
            if (totalInputSats >= (amountSats + cfg.fee)) break;
        }

        if (totalInputSats < (amountSats + cfg.fee)) {
            throw new Error(`Insufficient funds. Need ${amountSats + cfg.fee} satoshis.`);
        }

        txb.addOutput(targetAddress, amountSats);
        
        const changeSats = totalInputSats - amountSats - cfg.fee;
        if (changeSats > cfg.dust) {
            txb.addOutput(fromAddress, changeSats);
        }

        // 4. Lokální podpis v izolované paměti RAM
        const keyPair = bitcoin.ECPair.fromPrivateKey(
            bitcoin.Buffer.Buffer.from(privateKeyHex, 'hex'), 
            { network }
        );

        for (let i = 0; i < inputCount; i++) {
            txb.sign(i, keyPair);
        }

        const txHex = txb.build().toHex();

        // 5. OPRAVENÉ ODESÍLÁNÍ NA PŘESNÉ API ENDPOINTY
        const broadcastUrl = cfg.pushUrl;

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
