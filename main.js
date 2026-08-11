// Globální stav v RAM inicializovaný přes app.js nebo lokálně
var _secureState = _secureState || { seedPhrase: null, ethPrivateKey: null, btcPrivateKey: null };

const CryptoVault = {
    // Pomocná interní funkce pro kódování do formátu Bech32 (SegWit standard)
    toBech32(dataBytes) {
        const charset = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
        
        // Konverze 8-bitových bajtů na 5-bitové hodnoty
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
        
        // Vložení verze witness programu (0 pro bc1q) na začátek dat
        const words = [0].concat(result5Bit);
        
        // Výpočet kontrolního součtu Bech32 (BCH checksum)
        let chk = 1;
        const generator = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
        
        // OPRAVA: Doplněny hodnoty BCH polynomů pro lidsky čitelný prefix "bc"
        const hrpValues =;
        
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
        let addressOutput = "bc1";
        for (let i = 0; i < finalWords.length; i++) {
            addressOutput += charset[finalWords[i]];
        }
        return addressOutput;
    },

    // Generování entropie
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

    // Derivace klíčů s reálnou kryptografickou adresou pro Bitcoin
    deriveKeys(inputData) {
        if (inputData.includes(' ')) {
            _secureState.seedPhrase = inputData;
            _secureState.ethPrivateKey = "0x" + CryptoJS.SHA256(inputData + "m/44'/60'/0'/0/0").toString();
            _secureState.btcPrivateKey = CryptoJS.SHA256(inputData + "m/44'/0'/0'/0/0").toString();
        } else {
            _secureState.ethPrivateKey = inputData.startsWith('0x') ? inputData : '0x' + inputData;
            _secureState.btcPrivateKey = inputData.replace('0x', '');
        }

        // 1. Získání compressed veřejného klíče z privátního pomocí integrované třídy Ethers
        const signingKey = new ethers.utils.SigningKey(_secureState.ethPrivateKey);
        const compressedPublicKeyHex = signingKey.compressedPublicKey.replace('0x', '');
        
        // 2. Výpočet SHA-256 z veřejného klíče
        const sha256Hash = CryptoJS.SHA256(CryptoJS.enc.Hex.parse(compressedPublicKeyHex));
        
        // 3. Výpočet RIPEMD-160 z výsledného hashe (pomocí integrované funkce v Ethers)
        const ripemd160Hex = ethers.utils.ripemd160("0x" + sha256Hash.toString()).replace('0x', '');
        
        // Conversion hex stringu na pole bajtů pro enkodér Bech32
        const rawBytes = [];
        for (let i = 0; i < ripemd160Hex.length; i += 2) {
            rawBytes.push(parseInt(ripemd160Hex.substring(i, i + 2), 16));
        }

        return {
            ethAddress: new ethers.Wallet(_secureState.ethPrivateKey).address,
            btcAddress: this.toBech32(rawBytes) // Vygenerování platné bc1q adresy
        };
    },

    encryptAndSave(password) {
        if (!_secureState.seedPhrase && !_secureState.ethPrivateKey) return alert("Není co šifrovat, RAM je prázdná!");
        if (!password) return alert("Zadejte Master Password!");
        try {
            const dataToEncrypt = _secureState.seedPhrase || _secureState.ethPrivateKey;
            const salt = CryptoJS.lib.WordArray.random(128 / 8);
            const iv = CryptoJS.lib.WordArray.random(128 / 8);
            const key = CryptoJS.PBKDF2(password, salt, { keySize: 256 / 32, iterations: 1000 });
            const encrypted = CryptoJS.AES.encrypt(dataToEncrypt, key, { iv: iv });
            localStorage.setItem('kryptid_encrypted_vault', JSON.stringify({ ciphertext: encrypted.toString(), salt: salt.toString(), iv: iv.toString() }));
            alert("Trezor uložen.");
        } catch (e) { alert(e.message); }
    },

    decryptAndLoad(password) {
        const encryptedData = localStorage.getItem('kryptid_encrypted_vault');
        if (!encryptedData || !password) return null;
        try {
            const payload = JSON.parse(encryptedData);
            const salt = CryptoJS.enc.Hex.parse(payload.salt);
            const iv = CryptoJS.enc.Hex.parse(payload.iv);
            const key = CryptoJS.PBKDF2(password, salt, { keySize: 256 / 32, iterations: 1000 });
            const bytes = CryptoJS.AES.decrypt(payload.ciphertext, key, { iv: iv });
            return bytes.toString(CryptoJS.enc.Utf8);
        } catch (e) { return null; }
    },

    zeroingMemory() {
        _secureState.seedPhrase = null; _secureState.ethPrivateKey = null; _secureState.btcPrivateKey = null;
        if (document.getElementById('seedInput')) document.getElementById('seedInput').value = '';
        if (document.getElementById('masterPassword')) document.getElementById('masterPassword').value = '';
    }
};
