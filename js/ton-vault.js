/**
 * Kryptid Wallet - TON (Toncoin) Cryptographical Vault Engine
 * Purely client-side, non-custodial cryptographic signing layer.
 */

window.KryptidTONEngine = {
    /**
     * Odvodí privátní klíč a adresu pro TON z bitové reprezentace master seedu.
     * Používá oficiální doporučenou BIP-44 cestu pro Toncoin: m/44'/607'/0'/0'/0'
     */
    async deriveKeys(masterSeedHex) {
        if (!window.TonWeb) {
            console.error("TonWeb library is missing from vendor!");
            return null;
        }

        try {
            // Převod hexadecimálního master seedu na bity pro kryptografické operace
            const seedBuffer = ethers.utils.arrayify("0x" + masterSeedHex);
            
            // Odvození klíče pomocí standardní BIP-44 cesty pro TON (Coin typ 607)
            const hdNode = ethers.utils.HDNode.fromSeed(seedBuffer);
            const tonNode = hdNode.derivePath("m/44'/607'/0'/0'/0'");
            
            // TON vyžaduje 32-bajtový soukromý klíč (Ed25519 seed)
            const privateKeyBytes = ethers.utils.arrayify(tonNode.privateKey).slice(0, 32);
            
            // Vygenerování páru klíčů pomocí Ed25519 (zprostředkováno přes TonWeb/nativní crypto)
            const keyPair = await TonWeb.utils.nacl.sign.keyPair.fromSeed(privateKeyBytes);
            
            // Vytvoření standardní peněženky verze v4R2 (momentální Web3 standard pro TON)
            const tonweb = new TonWeb();
            const WalletClass = tonweb.wallet.all['v4r2'];
            const wallet = new WalletClass(tonweb.provider, {
                publicKey: keyPair.publicKey
            });
            
            // Získání uživatelské adresy v non-bounceable, user-friendly Base64url formátu
            const address = await wallet.getAddress();
            const nonBounceableAddress = address.toString(true, true, true);

            return {
                privateKey: TonWeb.utils.bytesToHex(keyPair.secretKey),
                address: nonBounceableAddress
            };
        } catch (err) {
            console.error("TON key derivation failed:", err.message);
            return null;
        }
    },

    /**
     * Sestaví, lokálně podepíše a odešle nativní TON transakci do sítě.
     * Vše probíhá izolovaně v paměti RAM bez úniku privátních klíčů.
     */
    async sendTransaction(privateKeyHex, fromAddress, targetAddress, amount, rpcUrl) {
        if (!window.TonWeb) throw new Error("TonWeb library missing in vendor!");

        const tonweb = new TonWeb(new TonWeb.HttpProvider(rpcUrl));
        const secretKey = TonWeb.utils.hexToBytes(privateKeyHex);
        const publicKey = secretKey.slice(32, 64); // Ed25519 veřejný klíč je druhá polovina secretKey

        // Inicializace peněženky v4R2 pro odeslání
        const WalletClass = tonweb.wallet.all['v4r2'];
        const wallet = new WalletClass(tonweb.provider, { publicKey: publicKey });

        // Načtení aktuálního sekvenčního čísla (seqno) z blockchainu kvůli ochraně proti replay útokům
        let seqno = 0;
        try {
            const remoteSeqno = await wallet.methods.seqno().call();
            if (remoteSeqno !== undefined && remoteSeqno !== null) {
                seqno = parseInt(remoteSeqno);
            }
        } catch (seqnoErr) {
            console.warn("TON wallet contract not deployed yet, defaulting seqno to 0:", seqnoErr.message);
            seqno = 0;
        }

        // Převod částky na NanoTON (1 TON = 1,000,000,000 NanoTON)
        const amountNano = tonweb.utils.toNano(amount.toString());

        // Sestavení a lokální podpis transakce
        const transfer = wallet.methods.transfer({
            secretKey: secretKey,
            toAddress: targetAddress,
            amount: amountNano,
            seqno: seqno,
            payload: '', // Volitelná textová zpráva (komentář) zůstává prázdná
            sendMode: 3  // Standardní sendMode: poplatky se odečtou ze zbývajícího zůstatku
        });

        // Odeslání podepsaného balíčku (external message) do sítě přes RPC uzel
        const result = await transfer.send();
        
        if (result && result['@type'] === 'ok') {
            // TON nevrací hash okamžitě, vygenerujeme predikovaný hash zprávy jako identifikátor transakce
            const query = await transfer.getQuery();
            const cellHash = await query.hash();
            return TonWeb.utils.bytesToHex(cellHash);
        } else {
            throw new Error("TON network node rejected the transaction broadcast.");
        }
    }
};
