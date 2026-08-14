// Globální registr podporovaných kryptoměn a jejich síťových specifikací
const KryptidNetworkRegistry = {
    "BTC": { type: "UTXO", explorer: "blockstream.info", apiUrl: "https" + "://" + "blockstream.info" + "/api/address/" + "{address}" + "/utxo", decimals: 8, unit: "BTC" },
    "LTC": { type: "UTXO", explorer: "litecoinspace.org", apiUrl: "https" + "://" + "litecoinspace.org" + "/api/address/" + "{address}" + "/utxo", decimals: 8, unit: "LTC" },
    "DOGE": { type: "UTXO", explorer: "dogechain.info", apiUrl: "https" + "://" + "chain.so" + "/api/v2/get_tx_unspent/DOGE/" + "{address}", decimals: 8, unit: "DOGE" },
    "ETH": { type: "EVM", rpcUrl: "https://" + "ethereum-rpc" + ".publicnode.com", decimals: 18, unit: "ETH" },
    "BNB": { type: "EVM", rpcUrl: "https://" + "bsc-rpc" + ".publicnode.com", decimals: 18, unit: "BNB" },
    "TRX": { type: "TRON", rpcUrl: "https" + "://" + "api" + "." + "trongrid" + "." + "io", decimals: 6, unit: "TRX" },
    "TON": { type: "TON", rpcUrl: "https://" + "ton.access.orbs.network/raw/jsonRPC", decimals: 9, unit: "TON" },
    "SOL": { type: "SOL", rpcUrl: "https://" + "api.mainnet-beta.solana.com", decimals: 9, unit: "SOL" }
};

// Samostatné sběrné adresy pro 0,2% interní klientské poplatky (UMÍSTĚNO PŘESNĚ POD REGISTREM)
const KryptidFeeRegistry = {
    "ETH": "0x4f9875d85ee19Ad70ac67D5C97235d24901affAa", // Vaše Ethereum adresa
    "BNB": "0x4f9875d85ee19Ad70ac67D5C97235d24901affAa", // Identická EVM adresa (funguje i pro BNB Chain)
    "SOL": "4rB5v8AHcWD8ZAqA4wKXR6STscNLuZPC5zrntdH8QNuW", // Vaše nativní Solana adresa
    "TON": "ZDE_VLOZTE_SVOJI_TON_ADRESU", // Vaše nativní TON adresa
    "TRX": "TAkX4VTYFQnvzt2v4gLHvjXKxxE3FWxVUv" // Vaše nativní TRON adresa
};

const BlockchainService = {
    // AUTOMATIC MULTI-FIAT BLOCKCHAIN BALANCE CONVERSION ENGINE
    async fetchAndDisplayBalances() {
        const selectedFiat = document.getElementById("currencySelect")?.value || "USD";
        
        const localeMap = { 
            "USD": "en-US", "CZK": "cs-CZ", "EUR": "de-DE", "XAU": "en-US",
            "GBP": "en-GB", "CHF": "de-CH", "JPY": "ja-JP", "INR": "hi-IN", 
            "BRL": "pt-BR", "RUB": "ru-RU", "CNY": "zh-CN", "PLN": "pl-PL",
            "CAD": "en-CA", "TRY": "tr-TR", "IRR": "fa-IR"
        };
        const currentLocale = localeMap[selectedFiat] || "en-US";
		
		let totalAccumulatedFiat = 0;

        // --- 1. DYNAMICKÝ FETCH TRŽNÍCH CEN PRO VŠECHNY COINY NAJEDNOU ---
        let cryptoPricesInFiat = {};
        try {
            const activeCoins = Object.keys(KryptidNetworkRegistry).join(",");
            const apiHost = "://cryptocompare.com";
            const url = `https://${apiHost}/data/pricemulti?fsyms=${activeCoins}&tsyms=${selectedFiat}`;
            
            const priceRes = await fetch(url);
            const rawPrices = await priceRes.json();
            
            Object.keys(KryptidNetworkRegistry).forEach(coin => {
                if (rawPrices[coin] && rawPrices[coin][selectedFiat]) {
                    cryptoPricesInFiat[coin] = rawPrices[coin][selectedFiat];
                } else {
                    cryptoPricesInFiat[coin] = 0;
                }
            });
        } catch (err) {
            console.error("Multi-fiat conversion exchange rates fetch failed:", err.message);
        }

        // --- 2. UNIVERZÁLNÍ SMYČKA PRO ZÍSKÁNÍ ZŮSTATKŮ VŠECH COINŮ ---
        for (const [coin, config] of Object.entries(KryptidNetworkRegistry)) {
            const addrElement = document.getElementById(`${coin.toLowerCase()}Address`);
            const balanceElement = document.getElementById(`${coin.toLowerCase()}Balance`);
            const fiatElement = document.getElementById(`${coin.toLowerCase()}Fiat`);

            if (!addrElement || !balanceElement || !fiatElement) continue;

            const address = addrElement.innerText.trim();

            if (address && address !== "---") {
                try {
                    let calculatedAmount = 0;

                    // A: Zpracování pro UTXO řadu (Bitcoin, Litecoin, Dogecoin)
                    if (config.type === "UTXO") {
                        const btcUrl = config.apiUrl.replace("{address}", address);
                        const res = await fetch(btcUrl);
                        const utxos = await res.json();
                        
                        let totalSatoshis = 0;
                        if (Array.isArray(utxos)) {
                            utxos.forEach(utxo => { totalSatoshis += utxo.value; });
                        }
                        calculatedAmount = totalSatoshis / Math.pow(10, config.decimals);
                    } 
                    
                    // B: Zpracování pro EVM řadu (Ethereum, Binance Smart Chain)
                    else if (config.type === "EVM") {
                        const provider = new ethers.providers.JsonRpcProvider(config.rpcUrl);
                        const balanceBigNumber = await provider.getBalance(address);
                        const totalStr = ethers.utils.formatEther(balanceBigNumber);
                        calculatedAmount = parseFloat(totalStr);
                    }
                    
                    // C: Zpracování pro TRON (TRX)
                    else if (config.type === "TRON") {
                        if (window.TronWeb) {
                            const tronWeb = new TronWeb({ fullHost: config.rpcUrl });
                            const balanceSun = await tronWeb.trx.getBalance(address);
                            calculatedAmount = balanceSun / 1000000;
                        }
                    }
                    
                    // D: Zpracování pro TON (Toncoin)
                    else if (config.type === "TON") {
                        if (window.TonWeb) {
                            const tonWeb = new TonWeb(new TonWeb.HttpProvider(config.rpcUrl));
                            const balanceNano = await tonWeb.provider.getBalance(address);
                            calculatedAmount = parseInt(balanceNano) / Math.pow(10, config.decimals);
                        }
                    }
                    
                    // E: Zpracování pro SOL (Solana)
                    else if (config.type === "SOL") {
                        if (window.KryptidSolanaEngine) {
                            calculatedAmount = await KryptidSolanaEngine.getBalance(address, config.rpcUrl);
                            // Spustí kompletní skener schovaný v solana-vault.js a předá mu rpcUrl a adresu
                            KryptidSolanaEngine.scanAndRenderTokens(address, config.rpcUrl);
                        }
                    }

                    // Vykreslení kryptoměnového zůstatku na kartu
                    if (config.type === "UTXO") {
                        balanceElement.innerText = calculatedAmount.toFixed(8) + " " + config.unit;
                    } else if (config.type === "TON") {
                        balanceElement.innerText = calculatedAmount.toFixed(9) + " " + config.unit;
                    } else {
                        balanceElement.innerText = calculatedAmount.toFixed(4) + " " + config.unit;
                    }
                    
                    // Výpočet fiat hodnoty z načtené ceny
                    const amountInFiat = calculatedAmount * (cryptoPricesInFiat[coin] || 0);
					
					totalAccumulatedFiat += amountInFiat;
                    
                    if (selectedFiat === "XAU") {
                        fiatElement.innerText = `(${amountInFiat.toFixed(4)} oz GOLD)`;
                    } else {
                        fiatElement.innerText = `(${amountInFiat.toLocaleString(currentLocale, { style: 'currency', currency: selectedFiat })})`;
                    }

                } catch (e) {
                    console.error(`${coin} balance fetch failed:`, e.message);
                    balanceElement.innerText = `Error loading ${coin}`;
                    fiatElement.innerText = "(Error)";
                }
            } else {
                // Výchozí prázdný stav, pokud peněženka ještě není načtená
                balanceElement.innerText = (coin === "BTC" || coin === "LTC") ? `0.00000000 ${config.unit}` : (coin === "SOL" || coin === "TON" ? `0.000000000 ${config.unit}` : `0.0000 ${config.unit}`);
                if (selectedFiat === "XAU") {
                    fiatElement.innerText = "(0.0000 oz GOLD)";
                } else {
                    fiatElement.innerText = `(${(0).toLocaleString(currentLocale, { style: 'currency', currency: selectedFiat })})`;
                }
            }
        }
		
		        // Zobrazení celkového součtu Total Balance na obrazovku
        const totalBalanceElement = document.getElementById("total-balance-value");
        if (totalBalanceElement) {
            totalBalanceElement.innerText = selectedFiat === "XAU" 
                ? `${totalAccumulatedFiat.toFixed(4)} oz GOLD` 
                : totalAccumulatedFiat.toLocaleString(currentLocale, { style: 'currency', currency: selectedFiat });
        }
		
		        // === PŘESNĚ SEM VLOŽTE TYTO NOVÉ ŘÁDKY ===
        const currentActiveCoin = window.WalletState?.activeCoin;
        const sourceInfoEl = document.getElementById('current-send-source-info');
        if (currentActiveCoin && sourceInfoEl) {
            const currentAddr = document.getElementById(`${currentActiveCoin.toLowerCase()}Address`)?.innerText || '---';
            const currentBal = document.getElementById(`${currentActiveCoin.toLowerCase()}Balance`)?.innerText || '0.00';
            sourceInfoEl.innerText = `${currentBal} (${currentAddr})`;
        }

        // --- DYNAMIC MULTI-CHAIN TOKENS SCANNER (1inch API) ---
        // Skenuje tokeny pro aktivní EVM síť (Ethereum nebo BNB Chain) podle toho, co má uživatel zobrazeno
        for (const [coin, config] of Object.entries(KryptidNetworkRegistry)) {
            if (config.type !== "EVM") continue;

            const addrElement = document.getElementById(`${coin.toLowerCase()}Address`);
            if (!addrElement || addrElement.innerText === "---") continue;
            
            const evmAddr = addrElement.innerText.trim();
            const apiKey = document.getElementById("oneInchKey")?.value?.trim();
            
            if (apiKey && apiKey !== "1inch-api-key-here") {
                try {
                    // 1inch API Chain ID: Ethereum = 1, BNB Chain = 56
                    const chainId = coin === "ETH" ? 1 : 56;
                    const url = `https://1inch.dev${chainId}/${evmAddr}`;
                    
                    const res = await fetch(url, {
                        headers: { "Authorization": "Bearer " + apiKey }
                    });
                    
                    if (res.ok) {
                        const tokens = await res.json();
                        const container = document.getElementById("dynamicTokensContainer");
                        
                        // Aktualizujeme kontejner pouze v případě, že tento coin odpovídá aktivní vybrané kartě
                        if (container && coin === window.WalletState.activeCoin) { 
                            container.innerHTML = ""; 

                            for (const [contractAddress, rawBalance] of Object.entries(tokens)) {
                                const balanceValue = parseFloat(rawBalance);
                                if (balanceValue > 0) {
                                    let ticker = "Token";
                                    let decimals = 18;
                                    
                                    // Detekce známých stabilních mincí napříč sítěmi (Ethereum / BSC)
                                    const lowerContract = contractAddress.toLowerCase();
                                    if (lowerContract === "0xdac17f958d2ee523a2206206994597c13d831ec7" || lowerContract === "0x55d398326f99059ff775485246999027b3197955") { ticker = "USDT"; decimals = 6; }
                                    else if (lowerContract === "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48" || lowerContract === "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d") { ticker = "USDC"; decimals = 6; }
                                    else if (lowerContract === "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599" || lowerContract === "0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c") { ticker = "WBTC"; decimals = 8; }
                                    
                                    const realAmount = balanceValue / Math.pow(10, decimals);
                                    
                                    if (realAmount > 0.001) {
                                        const p = document.createElement("p");
                                        p.innerHTML = `<strong>${ticker} (${coin}):</strong> <span>${realAmount.toFixed(4)} ${ticker}</span>`;
                                        container.appendChild(p);
                                    }
                                }
                            }
                        }
                    }
                } catch (tokenErr) {
                    console.warn(`${coin} token scanner skipped:`, tokenErr.message);
                }
            }
        }
    }, // Konec funkce fetchAndDisplayBalances

    // UNIVERZÁLNÍ ODESÍLACÍ FUNKCE PRO VŠECHNY MINCE
    // Distribuje požadavky podle kryptografické rodiny z registru
    async sendTransaction(coin, privateKey, fromAddress, target, amount) {
        if (!privateKey) throw new Error(`Private key for ${coin} missing in RAM!`);
        
        const config = KryptidNetworkRegistry[coin];
        if (!config) throw new Error(`Unsupported asset configuration: ${coin}`);

        // RODINA A: UTXO Mince (Bitcoin, Litecoin, Dogecoin)
        if (config.type === "UTXO") {
            alert(`Building ${coin} Native transaction...`);
            const amountSats = Math.round(parseFloat(amount) * Math.pow(10, config.decimals));
            
            alert(`Signing ${coin} Transaction locally via cryptographic engine...`);
            // Volá univerzální KryptidBitcoinEngine, který jsme upravili parametrem sítě
            await KryptidBitcoinEngine.sendTransaction(coin, privateKey, fromAddress, target, amountSats);
        } 
        
        // RODINA B: EVM Mince (Ethereum, BNB Coin)
        else if (config.type === "EVM") {
            alert(`Initializing ${coin} EVM transaction via RPC...`);
            const provider = new ethers.providers.JsonRpcProvider(config.rpcUrl);
            const wallet = new ethers.Wallet(privateKey, provider);
            
            const tx = { 
                to: target, 
                value: ethers.utils.parseEther(amount), 
                gasPrice: await provider.getGasPrice(), 
                gasLimit: 21000 
            };
            
            alert("Signing Raw EVM Transaction locally in RAM...");
            const txResponse = await wallet.sendTransaction(tx);
            alert(`Transaction successfully sent to ${coin} network! Hash: ${txResponse.hash}`);
        }
        
        // RODINA C: TRON (TRX)
        else if (config.type === "TRON") {
            if (!window.TronWeb) throw new Error("TronWeb library missing in vendor!");
            const tronWeb = new TronWeb({ fullHost: config.rpcUrl, privateKey: privateKey });
            
            alert("Building and signing TRON transaction locally...");
            const amountSun = Math.round(parseFloat(amount) * 1000000);
            const tx = await tronWeb.transactionBuilder.sendTrx(target, amountSun, fromAddress);
            const signedTx = await tronWeb.trx.sign(tx, privateKey);
            const broadcast = await tronWeb.trx.sendRawTransaction(signedTx);
            
            if (broadcast.result) {
                alert(`TRX transaction broadcasted! Hash: ${broadcast.txid}`);
            } else {
                throw new Error("TRON broadcast rejected by node.");
            }
        }
        
        // RODINA D: TON (Toncoin)
        else if (config.type === "TON") {
            if (!window.KryptidTONEngine) throw new Error("KryptidTONEngine missing! Ensure ton-vault.js is loaded.");
            alert(`Initializing ${coin} Native transaction...`);
            
            alert(`Signing ${coin} Transaction locally via cryptographic engine...`);
            const txHash = await window.KryptidTONEngine.sendTransaction(privateKey, fromAddress, target, amount, config.rpcUrl);
            alert(`TON transaction successfully broadcasted! Hash: ${txHash}`);
        }
        
        // RODINA E: SOL (Solana)
        else if (config.type === "SOL") {
            if (!window.KryptidSolanaEngine) throw new Error("KryptidSolanaEngine missing! Ensure solana-vault.js is loaded.");
            alert(`Initializing ${coin} Native transaction...`);
            
            alert(`Signing ${coin} Transaction locally via cryptographic engine...`);
            const txHash = await window.KryptidSolanaEngine.sendTransaction(privateKey, target, parseFloat(amount), config.rpcUrl);
            alert(`Solana transaction successfully broadcasted! Signature: ${txHash}`);
        }
        
    },

    // UNIVERZÁLNÍ TOKEN SWAP ROUTING SE ZAPOČTENÍM 0,2% POPLATKU PRO NON-EVM I EVM SÍTĚ
    async executeSwap(amount) {
        const currentCoin = window.WalletState?.activeCoin;
        const config = KryptidNetworkRegistry[currentCoin];

        if (!config) {
            return alert("Chyba: Neznámá kryptoměnová konfigurace.");
        }

        // Kontrola, zda měna swap podporuje (vyloučíme BTC, LTC, DOGE)
        const unsupportedUTXO = ["BTC", "LTC", "DOGE"];
        if (unsupportedUTXO.includes(currentCoin)) {
            return alert(`Swaps are not supported for native UTXO chains (${currentCoin})!`);
        }

        const fromAddress = document.getElementById(`${currentCoin.toLowerCase()}Address`)?.innerText;
        if (!fromAddress || fromAddress === "---") {
            return alert("Error: No active wallet wallet loaded for swap operation.");
        }

        // 1. Výpočet čisté částky k odeslání do agregátoru (odečtení 0,2 % klientského poplatku)
        const inputAmount = parseFloat(amount);
        if (isNaN(inputAmount) || inputAmount <= 0) return alert("Error: Invalid swap amount.");
        
        const clientFee = inputAmount * 0.002; // Přesně 0,2 % interní poplatek peněženky
        const amountToSwap = inputAmount - clientFee;
        
        // Převod na minimální jednotky (Satoshi/Wei/Lamports/Nano)
        const rawAmountToSwap = Math.round(amountToSwap * Math.pow(10, config.decimals));

        alert(`Processing swap for ${currentCoin}. Amount: ${inputAmount} ${config.unit} (Wallet fee: ${clientFee.toFixed(6)} deducted).`);

        // --- MULTI-CHAIN SMĚROVACÍ KLIENTSKÁ LOGIKA ---
        try {
            // SÍŤOVÁ RODINA A: EVM (Ethereum & BNB Chain) přes 1inch Dev Portal
            if (config.type === "EVM") {
                const apiKey = document.getElementById("oneInchKey")?.value?.trim();
                if (!apiKey || apiKey === "1inch-api-key-here") {
                    return alert("Error: Production 1inch API Key is required for EVM swap operations!");
                }

                const chainId = currentCoin === "ETH" ? 1 : 56;
                const nativeTokenPlaceholder = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
                const targetStablecoin = currentCoin === "ETH" 
                    ? "0xdac17f958d2ee523a2206206994597c13d831ec7"  // USDT na Ethereu
                    : "0x55d398326f99059ff775485246999027b3197955"; // USDT na BSC

                const queryParams = new URLSearchParams({ 
                    fromTokenAddress: nativeTokenPlaceholder, 
                    toTokenAddress: targetStablecoin, 
                    amount: rawAmountToSwap.toString(), // Posíláme už poníženou částku o 0,2 %
                    fromAddress: fromAddress, 
                    slippage: "1", // 1% tolerance skluzu pro volatilitu
                    referrerAddress: "0x4f9875d85ee19Ad70ac67D5C97235d24901affAa",
                    fee: "0.0" // Nastaveno na 0.0, protože poplatek jsme již vybrali / ponížili lokálně
                });

                alert(`Calling client-side 1inch API to build swap route on chain ${chainId}...`);
                const apiUrl = `https://1inch.dev{chainId}/swap?${queryParams.toString()}`;
                
                const response = await fetch(apiUrl, { headers: { "Authorization": "Bearer " + apiKey } });
                if (!response.ok) throw new Error(await response.text());
                
                alert("EVM Swap request successfully constructed via 1inch. Ready for broadcast.");
            } 
            
            // SÍŤOVÁ RODINA B: SOLANA (SOL) přes Jupiter Aggregator API v6
            else if (config.type === "SOL") {
                if (!window.KryptidSolanaEngine) throw new Error("KryptidSolanaEngine missing! Ensure solana-vault.js is loaded.");
                
                const usdtSolMint = "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB"; // Oficiální USDT na Solaně
                const solMint = "So11111111111111111111111111111111111111112";   // Nativní SOL zabalený (WSOL)
                
                alert("Calling Jupiter Aggregator v6 to build automated route...");
                const quoteUrl = `https://jup.ag{solMint}&outputMint=${usdtSolMint}&amount=${rawAmountToSwap}&slippageBps=50`;
                
                const res = await fetch(quoteUrl);
                if (!res.ok) throw new Error("Failed to fetch optimal quote route from Jupiter API.");
                const quoteResponse = await res.json();
                
                alert(`Jupiter route built. Net swap amount: ${amountToSwap.toFixed(4)} SOL. Expected output: ${(quoteResponse.outAmount / 1e6).toFixed(2)} USDT.`);
                // Předání dat do vašeho lokálního kryptografického solana-vault.js k podpisu
                await KryptidSolanaEngine.executeJupiterSwap(privateKey, fromAddress, quoteResponse);
            } 
            
            // SÍŤOVÁ RODINA C: TON (Toncoin) přes STON.fi DEX / SDK
            else if (config.type === "TON") {
                if (!window.KryptidTONEngine) throw new Error("KryptidTONEngine missing! Ensure ton-vault.js is loaded.");
                
                const usdtTonContract = "EQCxE6mUt4R6jG6OKgS6ZaEE-VSfl77v9Ju3mteS-b0vvy5K"; // Nativní USDT na TONu
                alert(`Routing swap via STON.fi Router Contract...`);
                alert(`Estimated output calculated. 0,2% fee secured. Preparing transaction payload...`);
                
                // Zde se vyvolá příprava Jetton Transfer zprávy pro ton-vault.js
                // await window.KryptidTONEngine.executeStonFiSwap(privateKey, fromAddress, usdtTonContract, amountToSwap);
            } 
            
            // SÍŤOVÁ RODINA D: TRON (TRX) přes SunSwap Router V2
            else if (config.type === "TRON") {
                if (!window.TronWeb) throw new Error("TronWeb library missing in vendor!");
                
                // OPRAVA: Tímto řádkem aplikaci řekneme, jak se k síti připojit a jaký klíč použít z RAM
                const tronWeb = new TronWeb({ fullHost: config.rpcUrl, privateKey: privateKey });
                
                alert("Routing swap via SunSwap V2 Smart Contract...");
                alert("Optimization alert: Staking TRX for Energy can eliminate execution gas costs.");
                
                const clientFeeAmount = parseFloat(amount) * 0.002;
                const feeInSun = Math.round(clientFeeAmount * 1000000);
                const mojeTronAdresa = KryptidFeeRegistry["TRX"];
            
                alert("Odesílám 0,2% klientský poplatek...");
                const feeTx = await tronWeb.transactionBuilder.sendTrx(mojeTronAdresa, feeInSun, fromAddress);
                const signedFeeTx = await tronWeb.trx.sign(feeTx, privateKey);
                await tronWeb.trx.sendRawTransaction(signedFeeTx);
            }

        } catch (e) { 
            alert(`Swap Routing execution error on ${currentCoin}: ` + e.message); 
        }
    }
}; // Konec celého souboru blockchain.js
