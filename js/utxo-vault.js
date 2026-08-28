const KryptidBitcoinEngine = {
    NETWORK_PARAMS: {
        'BTC': {
            network: { messagePrefix: '\x18Bitcoin Signed Message:\n', bech32: 'bc', pubKeyHash: 0x00, scriptHash: 0x05, wif: 0x80 },
            fee: 2500,
            dust: 546,
            pushUrl: "https" + "://" + "blockstream" + ".info" + "/api/tx"
        },
        'LTC': {
            network: { messagePrefix: '\x19Litecoin Signed Message:\n', bech32: 'ltc', pubKeyHash: 0x30, scriptHash: 0x32, wif: 0xb0 },
            fee: 5000, 
            dust: 5460,
            pushUrl: "https" + "://" + "litecoinspace" + ".org" + "/api/tx"
        },
        'DOGE': {
            network: { messagePrefix: '\x19Dogecoin Signed Message:\n', pubKeyHash: 0x1e, scriptHash: 0x16, wif: 0x9e },
            fee: 100000000, 
            dust: 1000000,
            pushUrl: "https" + "://" + "doge" + ".blockbook" + ".binance" + ".com" + "/api/v2/sendtx"
        }
    },

    async sendTransaction(coin, privateKeyHex, fromAddress, targetAddress, amountSats) {
        if (!privateKeyHex || !fromAddress || !targetAddress || amountSats <= 0) {
            throw new Error(`Invalid parameters passed to Kryptid${coin}Engine.`);
        }

        const cfg = this.NETWORK_PARAMS[coin] || this.NETWORK_PARAMS['BTC'];
        const network = cfg.network;

        // 1. Bezpečné načtení URL adresy z globálního blockchain registru
        if (typeof KryptidNetworkRegistry === 'undefined' || !KryptidNetworkRegistry[coin]) {
            throw new Error(`Global configuration for ${coin} is missing.`);
        }
        
        const utxoUrl = KryptidNetworkRegistry[coin].apiUrl.replace("{address}", fromAddress);
        const response = await fetch(utxoUrl);
        const utxos = await response.json();
        
        if (!utxos || utxos.length === 0) {
            throw new Error(`No spendable UTXOs found on this ${coin} address.`);
        }

        // 2. Klientský TransactionBuilder
        const txb = new bitcoin.TransactionBuilder(network);
        let totalInputSats = 0;
        let inputCount = 0;
        const inputValues = []; // Ukládáme si hodnoty pro SegWit podpis

        for (const utxo of utxos) {
            // Dogecoin vrací hodnoty v textu, převedeme na Satoshis, pokud je potřeba
            const utxoValue = typeof utxo.value === 'string' ? parseInt(utxo.value) : utxo.value;
            
            txb.addInput(utxo.txid, utxo.vout);
            totalInputSats += utxoValue;
            inputValues.push(utxoValue);
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

        // 3. Lokální podpis v izolované paměti RAM
        const keyPair = bitcoin.ECPair.fromPrivateKey(
            bitcoin.Buffer.Buffer.from(privateKeyHex, 'hex'), 
            { network }
        );

        // Generování SegWit scriptPubKey pro správný podpis bc1 / ltc1 adres
        let p2wpkhScript = null;
        if (coin === 'BTC' || coin === 'LTC') {
            const pkh = bitcoin.crypto.hash160(keyPair.getPublicKey());
            p2wpkhScript = bitcoin.script.witnessPubKeyHash.output.encode(pkh);
        }

        for (let i = 0; i < inputCount; i++) {
            if (coin === 'BTC' || coin === 'LTC') {
                // NEPRŮSTŘELNÝ SEGWIT PODPIS S HODNOTOU A SCRIPTEM
                txb.sign(i, keyPair, null, null, inputValues[i], p2wpkhScript);
            } else {
                // KLASICKÝ LEGACY PODPIS PRO DOGECOIN
                txb.sign(i, keyPair);
            }
        }

        const txHex = txb.build().toHex();

        // 4. ODESÍLÁNÍ NA SPRÁVNÉ API ENDPOINTY (/api/tx nebo sendtx)
        const broadcastResponse = await fetch(cfg.pushUrl, {
            method: 'POST',
            body: coin === 'DOGE' ? txHex : txHex // Některá API preferují surový text, což fetch pobere
        });

        if (!broadcastResponse.ok) {
            const errText = await broadcastResponse.text();
            throw new Error(`${coin} network broadcast rejected: ${errText}`);
        }

        return await broadcastResponse.text();
    }
};
