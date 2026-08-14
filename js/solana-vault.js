/**
 * KryptidSolanaEngine - Klientský podpis sítě Solana (SOL)
 * Kompatibilní s @solana/web3.js v prohlížeči
 */
const KryptidSolanaEngine = {
    // Solana derivační cesta podle BIP-44 (m/44'/501'/0'/0')
    DERIVATION_PATH: "m/44'/501'/0'/0'",

    /**
     * Vygeneruje Solana Keypair z hexadecimálního seedu (získaného z BIP-39)
     * @param {string} seedHex - 64 bajtový seed v hex formátu
     * @returns {Object} { address: string, privateKey: Uint8Array }
     */
    generateKeyPairFromSeed: function(seedHex) {
        try {
            // Solana Web3 vyžaduje pro generování z seedu přesně 32 nebo 64 bajtů.
            // Použijeme ed25519 odvození. Pokud vaše BIP39 knihovna v peněžence generuje 64B seed:
            const seedBuffer = Uint8Array.from(HeXTouint8Array(seedHex).slice(0, 32)); 
            
            // Vygenerování klíče pomocí Solana Web3 Keypair
            const keypair = solanaWeb3.Keypair.fromSeed(seedBuffer);
            
            return {
                address: keypair.publicKey.toBase58(),
                privateKey: keypair.secretKey // Obsahuje public i private klíč (64B)
            };
        } catch (error) {
            console.error("Chyba při generování Solana klíčů:", error);
            throw error;
        }
    },

    /**
     * Získá aktuální SOL zůstatek z RPC
     * @param {string} address - Solana adresa (Base58)
     * @param {string} rpcUrl - Endpoint
     * @returns {Promise<number>} Zůstatek v SOL
     */
    getBalance: async function(address, rpcUrl = "https://api.mainnet-beta.solana.com") {
        try {
            const connection = new solanaWeb3.Connection(rpcUrl, "confirmed");
            const publicKey = new solanaWeb3.PublicKey(address);
            const lamports = await connection.getBalance(publicKey);
            // 1 SOL = 1 000 000 000 Lamports
            return lamports / 1000000000;
        } catch (error) {
            console.error("Chyba načítání Solana zůstatku:", error);
            return 0;
        }
    },

    /**
     * Vytvoří, podepíše a odešle SOL transakci
     * @param {Uint8Array} secretKey - 64B secretKey z keypairu
     * @param {string} toAddress - Cílová Base58 adresa
     * @param {number} amountSol - Částka v SOL
     * @param {string} rpcUrl - Endpoint
     * @returns {Promise<string>} TxID (Signature)
     */
    sendTransaction: async function(secretKey, toAddress, amountSol, rpcUrl = "https://api.mainnet-beta.solana.com") {
        try {
            const connection = new solanaWeb3.Connection(rpcUrl, "confirmed");
            const fromKeypair = solanaWeb3.Keypair.fromSecretKey(secretKey);
            const toPublicKey = new solanaWeb3.PublicKey(toAddress);

            // 1. Získat nejnovější blockhash (místo nonce u ETH/BTC)
            const { blockhash } = await connection.getLatestBlockhash();

            // 2. Sestavit transakci (SystemProgram.transfer)
            const transaction = new solanaWeb3.Transaction({
                recentBlockhash: blockhash,
                feePayer: fromKeypair.publicKey
            }).add(
                solanaWeb3.SystemProgram.transfer({
                    fromPubkey: fromKeypair.publicKey,
                    toPubkey: toPublicKey,
                    lamports: amountSol * 1000000000
                })
            );

            // 3. Podepsat a odeslat v jednom kroku
            const signature = await connection.sendTransaction(transaction, [fromKeypair]);
            
            // 4. Potvrdit transakci
            await connection.confirmTransaction(signature, "confirmed");
            
            return signature;
        } catch (error) {
            console.error("Chyba při odesílání Solana transakce:", error);
            throw error;
        }
    },

    /**
     * Neprůstřelný globální dynamický skener tokenů na pozadí
     * Kompletně izolovaný v solana-vault.js, aby nespamoval blockchain.js
     * @param {string} address - Solana adresa (Base58)
     * @param {string} rpcUrl - Endpoint
     */
    scanAndRenderTokens: async function(address, rpcUrl = "https://api.mainnet-beta.solana.com") {
        try {
            const solContainer = document.getElementById("solTokensContainer");
            if (!solContainer) return;
            solContainer.innerHTML = ""; 

            const conn = new solanaWeb3.Connection(rpcUrl, "confirmed");
            const pubKey = new solanaWeb3.PublicKey(address);
            
            // 1. Vytáhnout všechny tokenové účty uživatele přímo ze sítě Solana
            const tokenAccounts = await conn.getParsedTokenAccountsByOwner(pubKey, {
                programId: new solanaWeb3.PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")
            });

            // Pokud uživatel nějaké tokeny má, stáhneme si aktuální globální seznam jmen od Jupiteru
            if (tokenAccounts.value.length > 0) {
                let jupiterRegistry = [];
                try {
                    // Oficiální, bezplatná a kompletní databáze všech Solanských tokenů
                    const jupRes = await fetch("https" + "://" + "token" + "." + "jup" + "." + "ag" + "/all");
                    if (jupRes.ok) {
                        jupiterRegistry = await jupRes.json();
                    }
                } catch (jupErr) {
                    console.warn("Metadata registry offline, using fallback:", jupErr.message);
                }

                // Projdeme každý token, který uživatel reálně vlastní
                tokenAccounts.value.forEach(accountInfo => {
                    const parsedData = accountInfo.account.data.parsed.info;
                    const tokenMint = parsedData.mint; // Unikátní adresa kontraktu tokenu
                    const rawAmount = parsedData.tokenAmount.uiAmount;
                    
                    if (rawAmount > 0) {
                        // Vyhledáme token v celosvětové databázi podle adresy kontraktu
                        const tokenMeta = jupiterRegistry.find(t => t.address === tokenMint);
                        
                        // JISTOTA VŠEHO: Pokud ho najdeme, vezmeme jeho reálný název. 
                        // Pokud je to nová mince, vypíšeme zkrácenou adresu kontraktu.
                        let tokenTicker = tokenMeta ? tokenMeta.symbol : `Unknown (${tokenMint.substring(0, 4)}...)`;
                        
                        const p = document.createElement("div");
                        p.style.margin = "4px 0";
                        p.style.display = "flex";
                        p.style.alignItems = "center";
                        p.style.gap = "6px";
                        
                        // Pokud má token v registru ikonu, dynamic ji vykreslíme vedle názvu
                        const imgHtml = tokenMeta && tokenMeta.logoURI 
                            ? `<img src="${tokenMeta.logoURI}" style="width:14px; height:14px; border-radius:50%;" onerror="this.style.display='none'">` 
                            : `•`;
                        
                        p.innerHTML = `${imgHtml} <strong>${tokenTicker}:</strong> <span>${rawAmount.toLocaleString(undefined, { maximumFractionDigits: 6 })}</span>`;
                        solContainer.appendChild(p);
                    }
                });
            }
        } catch (err) {
            console.warn("Solana token scanner hidden error:", err.message);
        }
    }
};

// Pomocná funkce
function HeXTouint8Array(hexString) {
    return new Uint8Array(hexString.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
}
