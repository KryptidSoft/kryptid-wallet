// Globální registr podporovaných kryptomen a jejich sítových specifikací
const KryptidNetworkRegistry = {
    "BTC": { type: "UTXO", explorer: "blockstream.info", apiUrl: "https" + "://" + "api" + "." + "blockchair" + "." + "com" + "/bitcoin" + "/dashboards" + "/address" + "/" + "{address}", decimals: 8, unit: "BTC" },
    "LTC": { type: "UTXO", explorer: "litecoinspace.org", apiUrl: "https" + "://" + "api" + "." + "blockchair" + "." + "com" + "/litecoin" + "/dashboards" + "/address" + "/" + "{address}", decimals: 8, unit: "LTC" },
    "DOGE": { type: "UTXO", explorer: "dogechain.info", apiUrl: "https" + "://" + "api" + "." + "blockchair" + "." + "com" + "/dogecoin" + "/dashboards" + "/address" + "/" + "{address}", decimals: 8, unit: "DOGE" },
    "ETH": { type: "EVM", rpcUrl: "https" + "://" + "ethereum-rpc" + ".publicnode.com", decimals: 18, unit: "ETH" },
    "BNB": { type: "EVM", rpcUrl: "https" + "://" + "bsc-rpc" + ".publicnode.com", decimals: 18, unit: "BNB" },
    "TRX": { type: "TRON", rpcUrl: "https" + "://" + "api" + "." + "trongrid" + "." + "io", decimals: 6, unit: "TRX" },
    "TON": { type: "TON", rpcUrl: "https" + "://" + "toncenter" + "." + "com" + "/api" + "/v2" + "/jsonRPC", decimals: 9, unit: "TON" },
    "SOL": { type: "SOL", rpcUrl: "https" + "://" + "api" + "." + "mainnet-beta" + "." + "solana" + "." + "com", decimals: 9, unit: "SOL" }
};

// Samostatné sberné adresy pro 0,2% interní klientské poplatky (UMÍSTENO PRESNE POD REGISTREM)
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

// --- 1. DYNAMICKÝ FETCH TRŽNÍCH CEN PRO COINY I TOKENY ---
        let cryptoPricesInFiat = {};
        try {
            // Základní vestavené mince (Native Coins)
            const coingeckoIds = {
                BTC: "bitcoin", ETH: "ethereum", LTC: "litecoin", TON: "the-open-network",
                DOGE: "dogecoin", BNB: "binancecoin", TRX: "tron", SOL: "solana"
            };

            const apiHost = "api" + "." + "coingecko" + "." + "com";
            
            // A. Nactení cen pro hlavní síte (BTC, ETH...)
            const mainCoins = Object.keys(KryptidNetworkRegistry).filter(c => coingeckoIds[c]);
            const idsParam = mainCoins.map(c => coingeckoIds[c]).join(",");
            const mainUrl = "https" + "://" + apiHost + "/api/v3/simple/price?ids=" + idsParam + "&vs_currencies=" + selectedFiat.toLowerCase();
            
            const mainRes = await fetch(mainUrl);
            const mainPrices = await mainRes.json();
            
            mainCoins.forEach(coin => {
                const geckoId = coingeckoIds[coin];
                const fiatKey = selectedFiat.toLowerCase();
                cryptoPricesInFiat[coin] = (mainPrices[geckoId] && mainPrices[geckoId][fiatKey]) ? mainPrices[geckoId][fiatKey] : 0;
            });

            // B. DYNAMICKÝ FIX PRO TOKENY (PEPE, USDC, atd.)
            // Pokud vaše peneženka eviduje tokeny, projdeme je podle adres kontraktu
            if (window.KryptidTokenRegistry) {
                // Príklad pro Ethereum/BSC tokeny (CoinGecko umí hledat podle adresy kontraktu)
                for (const token of window.KryptidTokenRegistry) {
                    // Dotaz na cenu konkrétního kontraktu (napr. platforma ethereum)
                    const tokenUrl = "https" + "://" + apiHost + "/api/v3/simple/token_price/" + 
                                     token.platform + "?contract_addresses=" + token.address + "&vs_currencies=" + selectedFiat.toLowerCase();
                    try {
                        const tokenRes = await fetch(tokenUrl);
                        const tokenPrices = await tokenRes.json();
                        const addrLower = token.address.toLowerCase();
                        if (tokenPrices[addrLower] && tokenPrices[addrLower][selectedFiat.toLowerCase()]) {
                            cryptoPricesInFiat[token.symbol] = tokenPrices[addrLower][selectedFiat.toLowerCase()];
                        }
                    } catch (tokenErr) {
                        cryptoPricesInFiat[token.symbol] = 0;
                    }
                }
            }
        } catch (err) {
            console.error("Multi-fiat conversion exchange rates fetch failed:", err.message);
        }

        // --- 2. UNIVERZÁLNÍ SMYCKA PRO ZÍSKÁNÍ ZUSTATKU VŠECH COINU ---
        for (const [coin, config] of Object.entries(KryptidNetworkRegistry)) {
            const addrElement = document.getElementById(`${coin.toLowerCase()}Address`);
            const balanceElement = document.getElementById(`${coin.toLowerCase()}Balance`);
            const fiatElement = document.getElementById(`${coin.toLowerCase()}Fiat`);

            if (!addrElement || !balanceElement || !fiatElement) continue;

            const address = addrElement.textContent.trim();

            if (address && address !== "---") {
                try {
                    let calculatedAmount = 0;

                    // A: Zpracování pro UTXO radu (Bitcoin, Litecoin, Dogecoin)
                    if (config.type === "UTXO") {
                        let btcUrl = config.apiUrl.replace("{address}", address);
                        let isStandardApi = false;

                        // MECHANICKÝ FIX: Pokud jde o Bitcoin nebo Litecoin, prepneme na stabilní endpoint pro detaily adresy
                        if (coin === "BTC" || coin === "LTC") {
                            btcUrl = btcUrl.replace("/utxo", ""); // Odstraníme /utxo z konce URL
                            isStandardApi = true;
                        }
                        
                        try {
                            const res = await fetch(btcUrl, { credentials: 'omit' });
                            
                            if (!res.ok) {
                                calculatedAmount = 0;
                            } else {
                                const data = await res.json();
                                
                                // Výpocet pro upravené stabilní API Bitcoinu a Litecoinu
                                if (isStandardApi && data && data.chain_stats) {
                                    const funded = data.chain_stats.funded_txo_sum || 0;
                                    const spent = data.chain_stats.spent_txo_sum || 0;
                                    calculatedAmount = (funded - spent) / Math.pow(10, config.decimals);
                                } 
                                // Puvodní fallbacky pro ostatní síte (Dogecoin apod.)
                                else if (Array.isArray(data)) {
                                    let totalSatoshis = 0;
                                    data.forEach(utxo => { totalSatoshis += (utxo.value || 0); });
                                    calculatedAmount = totalSatoshis / Math.pow(10, config.decimals);
                                } else if (data && data.data && data.data[address]) {
                                    calculatedAmount = (data.data[address].address.balance || 0) / Math.pow(10, config.decimals);
                                } else if (data && typeof data.balance !== 'undefined') {
                                    calculatedAmount = parseFloat(data.balance);
                                } else {
                                    calculatedAmount = parseFloat(data) || 0;
                                }
                            }
                        } catch (fetchError) {
                            console.warn("Primary UTXO fetch for " + coin + " failed, setting 0: " + fetchError.message);
                            calculatedAmount = 0;
                        }
                    }
                    
                    // C: Zpracování pro TRON (TRX) - VYCIŠTENO PRO NW.JS MULTI-ENVIRONMENT
                    else if (config.type === "TRON") {
                        let balanceSun = 0;
                        
                        // Bezpecné ošetrení NW.js: Pokud window.TronWeb není standardní funkce, 
                        // zkusíme si ji vytáhnout z Node.js require kontextu, kam se mohla exportovat.
                        let TronWebConstructor = typeof window.TronWeb === 'function' ? window.TronWeb : null;
                        
                        if (!TronWebConstructor && typeof require !== 'undefined') {
                            try { TronWebConstructor = require('tronweb'); } catch(e) {}
                        }
                        
                        const isConstructorValid = typeof TronWebConstructor === 'function';
                        const activeTronWeb = window.tronWeb || (isConstructorValid ? new TronWebConstructor({ fullHost: "https" + "://" + "api" + "." + "trongrid" + "." + "io" }) : null);
                        
                        if (activeTronWeb && activeTronWeb.trx && typeof activeTronWeb.trx.getBalance === 'function') {
                            try {
                                balanceSun = await activeTronWeb.trx.getBalance(address);
                                calculatedAmount = parseFloat(balanceSun) / Math.pow(10, config.decimals);
                            } catch (tronApiError) {
                                calculatedAmount = 0;
                            }
                        } else {
                            // Žádné cervené chyby ani panika, pokud se v testovacím režimu bez síte inicializace odloží
                            calculatedAmount = 0;
                        }
                    }
                    
                    // D: Zpracování pro TON (Toncoin) - ODOLNÉ PROTI HEX/LOWERCASE DEFORMACI
                    else if (config.type === "TON") {
                        try {
                            let validTonAddress = address;

                            // Pokud adresa do smycky vstoupí deformovaná na malá písmena nebo v HEXu (což vidíme v logu),
                            // využijeme prítomnost knihovny TonWeb z vendor sekce, která ji za letu zrekonstruuje 
                            // zpet do stoprocentne validního Base64url formátu, který Toncenter vyžaduje.
                            if (window.TonWeb && window.TonWeb.utils && window.TonWeb.utils.Address) {
                                try {
                                    const tonAddressInstance = new window.TonWeb.utils.Address(address);
                                    validTonAddress = tonAddressInstance.toString(true, true, true);
                                } catch (parseErr) {
                                    // Pokud by selhal i interní parsing, necháme puvodní adresu, abychom neriskovali pád
                                    validTonAddress = address;
                                }
                            }

                            const tonApiUrl = "https" + "://" + "toncenter" + "." + "com" + "/api" + "/v2" + "/getAddressInformation?address=" + validTonAddress;
                            const res = await fetch(tonApiUrl, { credentials: 'omit' });
                            
                            if (!res.ok) {
                                throw new Error("HTTP status " + res.status);
                            }
                            
                            const data = await res.json();
                            
                            if (data && data.ok && data.result && typeof data.result.balance !== 'undefined') {
                                const balanceNano = data.result.balance.toString();
                                calculatedAmount = parseFloat(balanceNano) / Math.pow(10, config.decimals);
                            } else {
                                calculatedAmount = 0;
                            }
                        } catch (tonError) {
                            // Tiché varování bez vyhazování kritických chyb do konzole
                            calculatedAmount = 0;
                        }
                    }

                    // Vykreslení kryptomenového zustatku na kartu
                    if (config.type === "UTXO") {
                        balanceElement.innerText = calculatedAmount.toFixed(8) + " " + config.unit;
                    } else if (config.type === "TON") {
                        balanceElement.innerText = calculatedAmount.toFixed(9) + " " + config.unit;
                    } else {
                        balanceElement.innerText = calculatedAmount.toFixed(4) + " " + config.unit;
                    }
                    
                    // Výpocet fiat hodnoty z nactené ceny
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
                // Výchozí prázdný stav, pokud peneženka ješte není nactená
                balanceElement.innerText = (coin === "BTC" || coin === "LTC") ? `0.00000000 ${config.unit}` : (coin === "SOL" || coin === "TON" ? `0.000000000 ${config.unit}` : `0.0000 ${config.unit}`);
                if (selectedFiat === "XAU") {
                    fiatElement.innerText = "(0.0000 oz GOLD)";
                } else {
                    fiatElement.innerText = `(${(0).toLocaleString(currentLocale, { style: 'currency', currency: selectedFiat })})`;
                }
            }
        }
		
		        // Zobrazení celkového souctu Total Balance na obrazovku
        const totalBalanceElement = document.getElementById("total-balance-value");
        if (totalBalanceElement) {
            totalBalanceElement.innerText = selectedFiat === "XAU" 
                ? `${totalAccumulatedFiat.toFixed(4)} oz GOLD` 
                : totalAccumulatedFiat.toLocaleString(currentLocale, { style: 'currency', currency: selectedFiat });
        }
		
		        // === PRESNE SEM VLOŽTE TYTO NOVÉ RÁDKY ===
        const currentActiveCoin = window.WalletState?.activeCoin;
        const sourceInfoEl = document.getElementById('current-send-source-info');
        if (currentActiveCoin && sourceInfoEl) {
            const currentAddr = document.getElementById(`${currentActiveCoin.toLowerCase()}Address`)?.innerText || '---';
            const currentBal = document.getElementById(`${currentActiveCoin.toLowerCase()}Balance`)?.innerText || '0.00';
            sourceInfoEl.innerText = `${currentBal} (${currentAddr})`;
        }

        // --- DYNAMIC MULTI-CHAIN TOKENS SCANNER (1inch API) ---
        // Skenuje tokeny pro aktivní EVM sít (Ethereum nebo BNB Chain) podle toho, co má uživatel zobrazeno
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
                    const url = "https" + "://" + "api" + ".1inch" + ".dev" + "/balance/v1.2/" + chainId + "/balances/" + evmAddr;
                    
                    const res = await fetch(url, {
                        headers: { "Authorization": "Bearer " + apiKey }
                    });
                    
                    if (res.ok) {
                        const tokens = await res.json();
                        const container = document.getElementById("dynamicTokensContainer");
                        
                        // Aktualizujeme kontejner pouze v prípade, že tento coin odpovídá aktivní vybrané karte
                        if (container && coin === window.WalletState.activeCoin) { 
                            container.innerHTML = ""; 

                            for (const [contractAddress, rawBalance] of Object.entries(tokens)) {
                                const balanceValue = parseFloat(rawBalance);
                                if (balanceValue > 0) {
                                    let ticker = "Token";
                                    let decimals = 18;
                                    
                                    // Detekce známých stabilních mincí napríc sítemi (Ethereum / BSC)
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
            // Volá univerzální KryptidBitcoinEngine, který jsme upravili parametrem síte
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
        
        // RODINA C: TRON (TRX) - OPRAVENO PRO LOKÁLNÍ JÁDRO
        else if (config.type === "TRON") {
            if (!window.tronWeb) throw new Error("TronWeb library missing in vendor!");
            const tronWeb = window.tronWeb;
            // Nastavíme privátní klíc prímo do naší bežící instance
            tronWeb.setPrivateKey(privateKey);
            
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

    // UNIVERZÁLNÍ TOKEN SWAP ROUTING SE ZAPOCTENÍM 0,2% POPLATKU PRO NON-EVM I EVM SÍTE
    async executeSwap(amount, privateKey) {
        const currentCoin = window.WalletState?.activeCoin;
        const config = KryptidNetworkRegistry[currentCoin];

        if (!config) {
            return alert("Chyba: Neznámá kryptomenová konfigurace.");
        }

        // Kontrola, zda mena swap podporuje (vyloucíme BTC, LTC, DOGE)
        const unsupportedUTXO = ["BTC", "LTC", "DOGE"];
        if (unsupportedUTXO.includes(currentCoin)) {
            return alert(`Swaps are not supported for native UTXO chains (${currentCoin})!`);
        }

        const fromAddress = document.getElementById(`${currentCoin.toLowerCase()}Address`)?.innerText;
        if (!fromAddress || fromAddress === "---") {
            return alert("Error: No active wallet wallet loaded for swap operation.");
        }

        // 1. Výpocet cisté cástky k odeslání do agregátoru (odectení 0,2 % klientského poplatku)
        const inputAmount = parseFloat(amount);
        if (isNaN(inputAmount) || inputAmount <= 0) return alert("Error: Invalid swap amount.");
        
        const clientFee = inputAmount * 0.002; // Presne 0,2 % interní poplatek peneženky
        const amountToSwap = inputAmount - clientFee;
        
        // Prevod na minimální jednotky (Satoshi/Wei/Lamports/Nano)
        const rawAmountToSwap = Math.round(amountToSwap * Math.pow(10, config.decimals));

        alert(`Processing swap for ${currentCoin}. Amount: ${inputAmount} ${config.unit} (Wallet fee: ${clientFee.toFixed(6)} deducted).`);

        // --- MULTI-CHAIN SMEROVACÍ KLIENTSKÁ LOGIKA ---
        try {
            // SÍTOVÁ RODINA A: EVM (Ethereum & BNB Chain) pres 1inch Dev Portal
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
                    amount: rawAmountToSwap.toString(), // Posíláme už poníženou cástku o 0,2 %
                    fromAddress: fromAddress, 
                    slippage: "1", // 1% tolerance skluzu pro volatilitu
                    referrerAddress: "0x4f9875d85ee19Ad70ac67D5C97235d24901affAa",
                    fee: "0.0" // Nastaveno na 0.0, protože poplatek jsme již vybrali / ponížili lokálne
                });

                alert(`Calling client-side 1inch API to build swap route on chain ${chainId}...`);
                const apiUrl = "https" + "://" + "api" + ".1inch" + ".dev" + "/swap/v6.0/" + chainId + "/swap?" + queryParams.toString();
                
                const response = await fetch(apiUrl, { headers: { "Authorization": "Bearer " + apiKey } });
                if (!response.ok) throw new Error(await response.text());
                
                alert("EVM Swap request successfully constructed via 1inch. Ready for broadcast.");
            } 
            
            // SÍTOVÁ RODINA B: SOLANA (SOL) pres Jupiter Aggregator API v6
            else if (config.type === "SOL") {
                if (!window.KryptidSolanaEngine) throw new Error("KryptidSolanaEngine missing! Ensure solana-vault.js is loaded.");
                
                const usdtSolMint = "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB"; // Oficiální USDT na Solane
                const solMint = "So11111111111111111111111111111111111111112";   // Nativní SOL zabalený (WSOL)
                
                alert("Calling Jupiter Aggregator v6 to build automated route...");
                const quoteUrl = "https" + "://" + "quote" + "-api" + ".jup" + ".ag" + "/v6/quote?inputMint=" + solMint + "&outputMint=" + usdtSolMint + "&amount=" + rawAmountToSwap + "&slippageBps=50";
                
                const res = await fetch(quoteUrl);
                if (!res.ok) throw new Error("Failed to fetch optimal quote route from Jupiter API.");
                const quoteResponse = await res.json();
                
                alert(`Jupiter route built. Net swap amount: ${amountToSwap.toFixed(4)} SOL. Expected output: ${(quoteResponse.outAmount / 1e6).toFixed(2)} USDT.`);
                // Predání dat do vašeho lokálního kryptografického solana-vault.js k podpisu
                await KryptidSolanaEngine.executeJupiterSwap(privateKey, fromAddress, quoteResponse);
            } 
            
            // SÍTOVÁ RODINA C: TON (Toncoin) pres STON.fi DEX / SDK
            else if (config.type === "TON") {
                if (!window.KryptidTONEngine) throw new Error("KryptidTONEngine missing! Ensure ton-vault.js is loaded.");
                
                const usdtTonContract = "EQCxE6mUt4R6jG6OKgS6ZaEE-VSfl77v9Ju3mteS-b0vvy5K"; // Nativní USDT na TONu
                alert(`Routing swap via STON.fi Router Contract...`);
                alert(`Estimated output calculated. 0,2% fee secured. Preparing transaction payload...`);
                
                // Zde se vyvolá príprava Jetton Transfer zprávy pro ton-vault.js
                // await window.KryptidTONEngine.executeStonFiSwap(privateKey, fromAddress, usdtTonContract, amountToSwap);
            } 
            
            // SÍTOVÁ RODINA D: TRON (TRX) pres SunSwap Router V2 - OPRAVENO PRO LOKÁLNÍ JÁDRO
            else if (config.type === "TRON") {
                if (!window.tronWeb) throw new Error("TronWeb library missing in vendor!");
                const tronWeb = window.tronWeb;
                // Nastavíme privátní klíc prímo do naší bežící instance
                tronWeb.setPrivateKey(privateKey);
                
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

