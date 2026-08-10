const KryptidBitcoinEngine = {
    async sendTransaction(privateKeyHex, fromAddress, targetAddress, amountSats) {
        if (!privateKeyHex || !fromAddress || !targetAddress || amountSats <= 0) {
            throw new Error("Invalid parameters passed to KryptidBitcoinEngine.");
        }
        const s1 = "https";
        const s2 = "blockstream.info/api/address/";
        const utxoUrl = s1 + "://" + s2 + fromAddress + "/utxo";
        const response = await fetch(utxoUrl);
        const utxos = await response.json();
        if (!utxos || utxos.length === 0) {
            throw new Error("No spendable UTXOs found on this Bitcoin address.");
        }
        const network = bitcoin.networks.bitcoin;
        const txb = new bitcoin.TransactionBuilder(network);
        const feeSats = 2500; 
        let totalInputSats = 0;
        let inputCount = 0;
        for (const utxo of utxos) {
            txb.addInput(utxo.txid, utxo.vout);
            totalInputSats += utxo.value;
            inputCount++;
            if (totalInputSats >= (amountSats + feeSats)) break;
        }
        if (totalInputSats < (amountSats + feeSats)) {
            throw new Error(`Insufficient funds. Need ${amountSats + feeSats} sats.`);
        }
        txb.addOutput(targetAddress, amountSats);
        const changeSats = totalInputSats - amountSats - feeSats;
        if (changeSats > 546) {
            txb.addOutput(fromAddress, changeSats);
        }
        const keyPair = bitcoin.ECPair.fromPrivateKey(bitcoin.Buffer.Buffer.from(privateKeyHex, 'hex'), { network });
        for (let i = 0; i < inputCount; i++) {
            txb.sign(i, keyPair);
        }
        const txHex = txb.build().toHex();
        const broadcastUrl = "https://blockstream.info";
        const broadcastResponse = await fetch(broadcastUrl, {
            method: 'POST',
            body: txHex
        });
        if (!broadcastResponse.ok) {
            const errText = await broadcastResponse.text();
            throw new Error(`Blockstream broadcast rejected: ${errText}`);
        }
        return await broadcastResponse.text();
    }
};
