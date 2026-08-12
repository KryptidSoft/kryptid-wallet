var _secureState = _secureState || { seedPhrase: null, ethPrivateKey: null, btcPrivateKey: null, privateKeys: {} };

function showTxError(m) { 
    const d = document.getElementById('txError'); 
    if (d) { 
        d.innerText = m; 
        d.style.display = 'block'; 
    } else { 
        alert(m); 
    } 
}

function clearTxError() { 
    const d = document.getElementById('txError'); 
    if (d) { 
        d.style.display = 'none'; 
        d.innerText = ''; 
    } 
}

const WalletEngine = {
    // BIP-39 VALIDATOR & LINTER WORDS DICTIONARY (100% Zachován)
    validateSeedPhrase: async function(v) {
        if (!v.includes(' ') && v.split(/[\s,.\-_]+/).length <= 1) return v;
        let c = v.toLowerCase().replace(/[.,\-_#@*+/\\()\[\]{}!?:;0-9]/g, ' ').replace(/\s+/g, ' ').trim();
        const w = c.split(' ');
        if (w.length !== 12 && w.length !== 24) { 
            showTxError(`Error: Seed must be 12 or 24 words. Found: ${w.length}.`); 
            return null; 
        }
        try {
            const res = await fetch('js/vendor/bip39-words.txt');
            if (res.ok) {
                const txt = await res.text();
                const valid = txt.split(/\r?\n/).map(x => x.trim()).filter(x => x.length > 0);
                for (let word of w) { 
                    if (!valid.includes(word)) { 
                        showTxError(`Typo Error: "${word}" is not valid BIP-39!`); 
                        return null; 
                    } 
                }
            }
        } catch (err) { 
            console.warn("Linter skipped:", err.message); 
        }
        return w.join(' ');
    },

    // JEDNOTNÁ UNIVERZÁLNÍ VALIDACE TRANSAKCÍ PRO VŠECHNY MINCE A RODINY
    validateTx: function(coin, target, amount) {
        // 1. Základní kontrola přítomnosti dat
        if (!target || !amount) { 
            showTxError("Error: Recipient address and amount are required!"); 
            return false; 
        }
        if (parseFloat(amount) <= 0) { 
            showTxError("Error: Amount must be strictly greater than 0!"); 
            return false; 
        }

        // 2. Kontrola přítomnosti privátního klíče v RAM pro dané krypto univerzum
        const hasKey = _secureState.privateKeys && _secureState.privateKeys[coin];
        const hasLegacyKey = (coin === 'BTC' && _secureState.btcPrivateKey) || (coin === 'ETH' && _secureState.ethPrivateKey);
        
        if (!hasKey && !hasLegacyKey) {
            showTxError(`Error: Cryptographic private key for ${coin} is missing from RAM.`);
            return false;
        }

        // 3. KŘÍŽOVÁ KONTROLA FORMÁTŮ ADRES (Ochrana proti ztrátě prostředků)
        const targetClean = target.trim();

        // Pravidlo A: EVM rodina (Ethereum, Binance Smart Chain)
        if (coin === 'ETH' || coin === 'BNB') {
            if (!/^0x[a-fA-F0-9]{40}$/.test(targetClean)) {
                showTxError(`Error: Invalid ${coin} address. Must be a 40-character hex starting with 0x.`);
                return false;
            }
        }
        
        // Pravidlo B: Bitcoin (Nativní SegWit bech32)
        else if (coin === 'BTC') {
            if (!targetClean.startsWith('bc1')) {
                showTxError("Error: Invalid BTC address. Only native SegWit addresses starting with 'bc1' are supported.");
                return false;
            }
        }
        
        // Pravidlo C: Litecoin (Nativní SegWit nebo starší formáty L/M)
        else if (coin === 'LTC') {
            const isLtcSegwit = targetClean.startsWith('ltc1');
            const isLtcLegacy = /^[LM][a-km-zA-HJ-NP-Z1-9]{26,33}$/.test(targetClean);
            if (!isLtcSegwit && !isLtcLegacy) {
                showTxError("Error: Invalid Litecoin address format. Must start with 'L', 'M' or 'ltc1'.");
                return false;
            }
        }
        
        // Pravidlo D: Dogecoin (Adresy začínající na D nebo A)
        else if (coin === 'DOGE') {
            if (!/^[DA][a-km-zA-HJ-NP-Z1-9]{26,34}$/.test(targetClean)) {
                showTxError("Error: Invalid Dogecoin address format. Must start with 'D' or 'A'.");
                return false;
            }
        }
        
        // Pravidlo E: TRON (Adresy začínající na T)
        else if (coin === 'TRX') {
            if (!/^T[a-km-zA-HJ-NP-Z1-9]{33}$/.test(targetClean)) {
                showTxError("Error: Invalid TRON address format. Must start with a capital 'T'.");
                return false;
            }
        }

        // 4. BLOKOVÁNÍ KATASTROFÁLNÍCH ZÁMĚN (Uživatel vložil adresu z jiné rodiny)
        if (coin !== 'BTC' && targetClean.startsWith('bc1')) { showTxError(`Error: Cannot send ${coin} to a Bitcoin address!`); return false; }
        if (coin !== 'LTC' && targetClean.startsWith('ltc1')) { showTxError(`Error: Cannot send ${coin} to a Litecoin address!`); return false; }
        if (coin !== 'ETH' && coin !== 'BNB' && targetClean.startsWith('0x')) { showTxError(`Error: Cannot send ${coin} to an EVM address!`); return false; }

        return true;
    },

    // Zachování původních metod pro 100% zpětnou kompatibilitu se starým kódem
    validateEthereumTx: function(t, a) { return this.validateTx('ETH', t, a); },
    validateBitcoinTx: function(t, a) { return this.validateTx('BTC', t, a); }
};
