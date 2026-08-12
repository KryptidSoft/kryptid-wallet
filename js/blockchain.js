// Globální registr podporovaných kryptoměn a jejich síťových specifikací
const KryptidNetworkRegistry = {
    "BTC": { type: "UTXO", explorer: "blockstream.info", apiUrl: "https://blockstream.info{address}/utxo", decimals: 8, unit: "BTC" },
    "LTC": { type: "UTXO", explorer: "litecoinspace.org", apiUrl: "https://litecoinspace.org{address}/utxo", decimals: 8, unit: "LTC" },
    "DOGE": { type: "UTXO", explorer: "dogechain.info", apiUrl: "https://tokenview.io{address}/utxo", decimals: 8, unit: "DOGE" },
    "ETH": { type: "EVM", rpcUrl: "https://ankr.com", decimals: 18, unit: "ETH" },
    "BNB": { type: "EVM", rpcUrl: "https://ankr.com", decimals: 18, unit: "BNB" },
    "TRX": { type: "TRON", rpcUrl: "https://trongrid.io", decimals: 6, unit: "TRX" }
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

                    // Vykreslení kryptoměnového zůstatku na kartu
                    if (config.type === "UTXO") {
                        balanceElement.innerText = calculatedAmount.toFixed(8) + " " + config.unit;
                    } else {
                        balanceElement.innerText = calculatedAmount.toFixed(4) + " " + config.unit;
                    }
                    
                    // Výpočet fiat hodnoty z načtené ceny
                    const amountInFiat = calculatedAmount * (cryptoPricesInFiat[coin] || 0);
                    
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
                balanceElement.innerText = coin === "BTC" || coin === "LTC" ? `0.00000000 ${config.unit}` : `0.0000 ${config.unit}`;
                if (selectedFiat === "XAU") {
                    fiatElement.innerText = "(0.0000 oz GOLD)";
                } else {
                    fiatElement.innerText = `(${(0).toLocaleString(currentLocale, { style: 'currency', currency: selectedFiat })})`;
                }
            }
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
    },

    // TOKEN SWAP ROUTING VIA THE DECENTRALIZED 1INCH PORTAL ROUTER v6.0
    async executeSwap(amount) {
        const currentCoin = window.WalletState.activeCoin;
        if (KryptidNetworkRegistry[currentCoin].type !== "EVM") {
            return alert("Swaps are currently only supported on EVM compatible chains (ETH, BNB)!");
        }

        const ethAddr = document.getElementById(`${currentCoin.toLowerCase()}Address`).innerText;
        const apiKey = document.getElementById("oneInchKey").value.trim();
        if (!apiKey) return alert("Error: Production 1inch API Key is required for swap operations!");

        // Nastavení parametrů podle aktivní EVM sítě (Ethereum Mainnet vs BSC)
        const chainId = currentCoin === "ETH" ? 1 : 56;
        const nativeTokenPlaceholder = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
        const targetStablecoin = currentCoin === "ETH" 
            ? "0xdac17f958d2ee523a2206206994597c13d831ec7" // USDT na Ethereu
            : "0x55d398326f99059ff775485246999027b3197955"; // USDT na BSC

        const queryParams = new URLSearchParams({ 
            fromTokenAddress: nativeTokenPlaceholder, 
            toTokenAddress: targetStablecoin, 
            amount: ethers.utils.parseEther(amount).toString(), 
            fromAddress: ethAddr, 
            slippage: "1", 
            referrerAddress: "0x4f9875d85ee19Ad70ac67D5C97235d24901affAa", // Váš fee broker link
            fee: "0.2" // Váš fixní poplatek 0,2 % ze swapu
        });

        alert(`Calling client-side 1inch API to build swap route on chain ${chainId}...`);
        try {
            const apiUrl = `https://1inch.dev${chainId}/swap?${queryParams.toString()}`;
            
            const response = await fetch(apiUrl, {
                headers: { "Authorization": "Bearer " + apiKey }
            });
            
            if (!response.ok) {
                const errText = await response.text();
                throw new Error(errText);
            }
            
            alert("Swap request successfully processed on client level.");
        } catch (e) { 
            alert("1inch Routing execution status: " + e.message); 
        }
    }
};
