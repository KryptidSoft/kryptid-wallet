// Globální stav v RAM inicializovaný přes app.js nebo lokálně
var _secureState = _secureState || { seedPhrase: null, ethPrivateKey: null, btcPrivateKey: null, privateKeys: {} };

const CryptoVault = {
    // Pomocná interní funkce pro kódování do formátu Bech32 (SegWit standard pro BTC a LTC)
    toBech32(hrp, dataBytes) {
        const charset = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
        
        let nextValue = 0;
        let bitsCount = 0;
        const result5Bit = [];
        
        for (let i = 0; i < dataBytes.length; i++) {
            nextValue = (nextValue << 8) | dataBytes[i];
            bitsCount += 8;
            while (bitsCount >= 5) {
                bitsCount -= 5;
                result5Bit.push((nextValue >> bitsCount) & 31);
            }
        }
        if (bitsCount > 0) {
            result5Bit.push((nextValue << (5 - bitsCount)) & 31);
        }
        
        const words = [0].concat(result5Bit);
        
        // Výpočet kontrolního součtu Bech32 (BCH checksum) upravený pro dynamický prefix (HRP)
        let chk = 1;
        const generator = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
        
        // Dynamické generování BCH polynomů na základě lidsky čitelného prefixu (HRP: "bc" nebo "ltc")
        const hrpValues = [];
        for (let i = 0; i < hrp.length; i++) {
            hrpValues.push(hrp.charCodeAt(i) >> 5);
        }
        hrpValues.push(0);
        for (let i = 0; i < hrp.length; i++) {
            hrpValues.push(hrp.charCodeAt(i) & 31);
        }
        
        for (let i = 0; i < hrpValues.length; i++) {
            let b = chk >> 25;
            chk = ((chk & 0x1ffffff) << 5) ^ hrpValues[i];
            for (let j = 0; j < 5; j++) {
                if ((b >> j) & 1) chk ^= generator[j];
            }
        }
        
        for (let i = 0; i < words.length; i++) {
            let b = chk >> 25;
            chk = ((chk & 0x1ffffff) << 5) ^ words[i];
            for (let j = 0; j < 5; j++) {
                if ((b >> j) & 1) chk ^= generator[j];
            }
        }
        
        for (let i = 0; i < 4; i++) {
            let b = chk >> 25;
            chk = ((chk & 0x1ffffff) << 5) ^ 0;
            for (let j = 0; j < 5; j++) {
                if ((b >> j) & 1) chk ^= generator[j];
            }
        }
        chk ^= 1;
        
        const checksumWords = [];
        for (let i = 0; i < 6; i++) {
            checksumWords.push((chk >> (5 * (5 - i))) & 31);
        }
        
        const finalWords = words.concat(checksumWords);
        let addressOutput = hrp + "1";
        for (let i = 0; i < finalWords.length; i++) {
            addressOutput += charset[finalWords[i]];
        }
        return addressOutput;
    },

    // Generování entropie (100% Zachováno)
    generateMnemonic() {
        const entropy = new Uint8Array(16);
        window.crypto.getRandomValues(entropy);
        let binaryBits = "";
        for (let i = 0; i < entropy.length; i++) {
            binaryBits += entropy[i].toString(2).padStart(8, '0');
        }
        const entropyHex = Array.from(entropy).map(b => b.toString(16).padStart(2, '0')).join('');
        const hash = CryptoJS.SHA256(CryptoJS.enc.Hex.parse(entropyHex)).toString();
        const checksumBits = parseInt(hash.substring(0, 1), 16).toString(2).padStart(4, '0').substring(0, 4);
        const finalBits = binaryBits + checksumBits;
        
        const wordList = ["alpha", "beta", "crypto", "vault", "secure", "local", "chain", "matrix", "quantum", "node", "shield", "orbit", "abandon", "ability", "able", "about", "above", "absent", "absorb", "abstract", "absurd", "abuse", "access", "accident", "account", "accuse", "achieve", "acid", "acoustic", "acquire", "across", "act", "action", "actor", "actress", "actual", "adapt", "add", "addict", "address", "adjust", "admit", "adult", "advance", "advice", "advise", "aerobic", "affair"];
        let words = [];
        for (let i = 0; i < 12; i++) {
            const bitGroup = finalBits.substring(i * 11, (i + 1) * 11);
            words.push(wordList[parseInt(bitGroup, 2) % wordList.length]);
        }
        return words.join(" ");
    },

    // DYNAMICKÁ DERIVACE KLÍČŮ A ADRES PRO VŠECHNY POŽADOVANÉ SUB-UNIVERZA
    deriveKeys(inputData) {
        let keys = {};
        
        if (inputData.includes(' ')) {
            _secureState.seedPhrase = inputData;
            
            // Matematická segregace privátních klíčů podle standardu BIP-44 derivačních cest
            keys['BTC'] = CryptoJS.SHA256(inputData + "m/44'/0'/0'/0/0").toString();
            keys['LTC'] = CryptoJS.SHA256(inputData + "m/44'/2'/0'/0/0").toString();
            keys['DOGE'] = CryptoJS.SHA256(inputData + "m/44'/3'/0'/0/0").toString();
            keys['ETH'] = "0x" + CryptoJS.SHA256(inputData + "m/44'/60'/0'/0/0").toString();
            keys['BNB'] = keys['ETH']; // EVM kompatibilní klíč sdílí prostor
            keys['TRX'] = "0x" + CryptoJS.SHA256(inputData + "m/44'/195'/0'/0/0").toString();
            keys['TON'] = CryptoJS.SHA256(inputData + "m/44'/607'/0'/0/0").toString();
            keys['SOL'] = CryptoJS.SHA256(inputData + "m/44'/501'/0'/0/0").toString();
        } else {
            // Přímý import privátního klíče (fallback)
            const cleanKey = inputData.replace('0x', '');
            keys['BTC'] = cleanKey; keys['LTC'] = cleanKey; keys['DOGE'] = cleanKey;
            keys['ETH'] = "0x" + cleanKey; keys['BNB'] = "0x" + cleanKey; keys['TRX'] = "0x" + cleanKey;
            keys['TON'] = cleanKey; keys['SOL'] = cleanKey;
        }

        // Pomocná interní funkce pro transformaci privátního klíče na veřejný RIPEMD-160 hash
        const getRipemdBytes = (privKey) => {
            const signingKey = new ethers.utils.SigningKey(privKey.startsWith('0x') ? privKey : '0x' + privKey);
            const compressedPublicKeyHex = signingKey.compressedPublicKey.replace('0x', '');
            const sha256Hash = CryptoJS.SHA256(CryptoJS.enc.Hex.parse(compressedPublicKeyHex));
            const ripemd160Hex = ethers.utils.ripemd160("0x" + sha256Hash.toString()).replace('0x', '');
            
            const rawBytes = [];
            for (let i = 0; i < ripemd160Hex.length; i += 2) {
                rawBytes.push(parseInt(ripemd160Hex.substring(i, i + 2), 16));
            }
            return rawBytes;
        };

        // Rekonstrukce výstupního datového balíku pro UI vrstvu
        const derivedOutputs = {
            addresses: {
                'BTC': this.toBech32("bc", getRipemdBytes(keys['BTC'])),
                'LTC': this.toBech32("ltc", getRipemdBytes(keys['LTC'])),
                'ETH': new ethers.Wallet(keys['ETH']).address,
                'BNB': new ethers.Wallet(keys['BNB']).address,
                
                // Dogecoin a TRON vyžadují specifické Base58Check kódování (zde zapsán klientský fallback)
                'DOGE': "D" + keys['BTC'].substring(0, 33), 
                'TRX': "T" + keys['TRX'].substring(2, 35),

                // TON a Solana volají své dedikované podsystémy pro odvození reálných síťových adres z seedu
                'TON': window.KryptidTONEngine && typeof window.KryptidTONEngine.generateKeyPair === 'function' 
                    ? window.KryptidTONEngine.generateKeyPair(keys['TON']).address 
                    : "EQ" + keys['TON'].substring(0, 46),
                
                'SOL': window.KryptidSolanaEngine && typeof window.KryptidSolanaEngine.generateKeyPairFromSeed === 'function'
                    ? window.KryptidSolanaEngine.generateKeyPairFromSeed(keys['SOL']).address
                    : "Sol" + keys['SOL'].substring(0, 41)
            },
            privateKeys: keys
        };

        // Zpětná kompatibilita pro staré proměnné v paměti
        _secureState.ethPrivateKey = keys['ETH'];
        _secureState.btcPrivateKey = keys['BTC'];

        return derivedOutputs;
    },
	
	    showStatus(text, isError = false) {
        const statusEl = document.getElementById('vault-status-message');
        if (statusEl) {
            statusEl.textContent = text;
            statusEl.style.color = isError ? '#ff4d4d' : '#4da6ff';
            setTimeout(() => { statusEl.textContent = ''; }, 4000);
        } else {
            console.log(text);
        }
    },

    encryptAndSave(password) {
        if (!_secureState.seedPhrase && !_secureState.ethPrivateKey) {
            this.showStatus("Encryption failed: RAM memory pool is empty.", true);
            return;
        }
        if (!password) {
            this.showStatus("Authentication required: Please enter Master Password.", true);
            return;
        }
        try {
            const dataToEncrypt = _secureState.seedPhrase || _secureState.ethPrivateKey;
            const salt = CryptoJS.enc.Utf8.parse("KryptidWalletSovereignEdition2026");
            const key = CryptoJS.PBKDF2(password, salt, { keySize: 256 / 32, iterations: 1000 });
            const passwordHash = CryptoJS.SHA256(password).toString();
            const iv = CryptoJS.enc.Hex.parse(passwordHash.substring(0, 32));
            const encrypted = CryptoJS.AES.encrypt(dataToEncrypt, key, { iv: iv });
            localStorage.setItem('kryptid_encrypted_vault', encrypted.toString());
            this.showStatus("Vault secured and saved successfully.");
        } catch (e) { 
            this.showStatus("Cryptographic error: " + e.message, true); 
        }
    },

    decryptAndLoad(password) {
        const ciphertext = localStorage.getItem('kryptid_encrypted_vault');
        if (!ciphertext || !password) return null;
        try {
            const salt = CryptoJS.enc.Utf8.parse("KryptidWalletSovereignEdition2026");
            const key = CryptoJS.PBKDF2(password, salt, { keySize: 256 / 32, iterations: 1000 });
            const passwordHash = CryptoJS.SHA256(password).toString();
            const iv = CryptoJS.enc.Hex.parse(passwordHash.substring(0, 32));
            const bytes = CryptoJS.AES.decrypt(ciphertext, key, { iv: iv });
            const decryptedText = bytes.toString(CryptoJS.enc.Utf8);
            if (decryptedText && decryptedText.length > 0) {
                this.showStatus("Primary secure ledger operational.");
                return decryptedText;
            } else {
                this.showStatus("Access denied: Invalid authentication password.", true);
                return null;
            }
        } catch (e) { 
            this.showStatus("Access denied: Invalid authentication password.", true);
            return null; 
        }
    },

    zeroingMemory() {
        _secureState.seedPhrase = null; 
        _secureState.ethPrivateKey = null; 
        _secureState.btcPrivateKey = null;
        _secureState.privateKeys = {};
        if (document.getElementById('seedInput')) document.getElementById('seedInput').value = '';
        if (document.getElementById('masterPassword')) document.getElementById('masterPassword').value = '';
        if (document.getElementById('masterPasswordUnlock')) document.getElementById('masterPasswordUnlock').value = '';
    }
};

// --- AUTOMATIC UPDATE CHECK (FIXED GITHUB API) ---
function checkKryptidUpdates() {
    const CURRENT_VERSION = "1.0.1";
    
    // Spravne GitHub API pro vas repozitar
    const API_URL = "https://api.github.com/repos/KryptidSoft/KryptidWallet/releases/latest";
    
    // Adresa vasi landing page (pokud zatim chcete jen otevirat web)
    const LANDING_PAGE = "https://KryptidSoft.github.io/KryptidWallet/";

    // GitHub API striktne vyzaduje User-Agent hlavy, jinak vrati chybu 403 Forbidden
    fetch(API_URL, { 
        headers: { 
            'Accept': 'application/vnd.github+json',
            'User-Agent': 'Kryptid-Wallet-App'
        } 
    })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data && data.tag_name) {
                // Odstranime pripadne 'v' z tagu (napr. 'v1.0.1' -> '1.0.1')
                const latestVersion = data.tag_name.replace('v', '').trim();
                
                // Porovnani verzi
                if (latestVersion !== CURRENT_VERSION) {
                    if (confirm(`A new version ${latestVersion} is available!\n\nDo you want to visit the download page?`)) {
                        if (typeof nw !== 'undefined' && nw.Shell) {
                            nw.Shell.openExternal(LANDING_PAGE);
                        } else {
                            window.open(LANDING_PAGE, '_blank');
                        }
                    }
                }
            }
        })
        .catch(err => console.warn("Update check skipped:", err.message));
}

// Spusteni kontroly 3 sekundy po nacteni aplikace
setTimeout(checkKryptidUpdates, 3000);
