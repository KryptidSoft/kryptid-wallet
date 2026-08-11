var _secureState = _secureState || { seedPhrase: null, ethPrivateKey: null, btcPrivateKey: null };
function showTxError(m) { const d = document.getElementById('txError'); if (d) { d.innerText = m; d.style.display = 'block'; } else { alert(m); } }
function clearTxError() { const d = document.getElementById('txError'); if (d) { d.style.display = 'none'; d.innerText = ''; } }
const WalletEngine = {
    validateSeedPhrase: async function(v) {
        if (!v.includes(' ') && v.split(/[\s,.\-_]+/).length <= 1) return v;
        let c = v.toLowerCase().replace(/[.,\-_#@*+/\\()\[\]{}!?:;0-9]/g, ' ').replace(/\s+/g, ' ').trim();
        const w = c.split(' ');
        if (w.length !== 12 && w.length !== 24) { showTxError(`Error: Seed must be 12 or 24 words. Found: ${w.length}.`); return null; }
        try {
            const res = await fetch('js/vendor/bip39-words.txt');
            if (res.ok) {
                const txt = await res.text();
                const valid = txt.split(/\r?\n/).map(x => x.trim()).filter(x => x.length > 0);
                for (let word of w) { if (!valid.includes(word)) { showTxError(`Typo Error: "${word}" is not valid BIP-39!`); return null; } }
            }
        } catch (err) { console.warn("Linter skipped:", err.message); }
        return w.join(' ');
    },
    validateEthereumTx: function(t, a) {
        if (!t || !a) { showTxError("Error: Address and amount required!"); return false; }
        if (parseFloat(a) <= 0) { showTxError("Error: Amount must be > 0!"); return false; }
        if (t.startsWith('bc1')) { showTxError("Error: Cannot send ETH to BTC address!"); return false; }
        if (!/^0x[a-fA-F0-9]{40}$/.test(t)) { showTxError("Error: Invalid ETH address format."); return false; }
        return true;
    },
    validateBitcoinTx: function(t, a) {
        if (!t || !a) { showTxError("Error: Address and amount required!"); return false; }
        if (parseFloat(a) <= 0) { showTxError("Error: Amount must be > 0!"); return false; }
        if (t.startsWith('0x')) { showTxError("Error: Cannot send BTC to ETH address!"); return false; }
        if (!t.startsWith('bc1')) { showTxError("Error: Only native SegWit (bc1) supported."); return false; }
        if (!_secureState.btcPrivateKey) { showTxError("Error: Private key missing from RAM."); return false; }
        return true;
    }
};
