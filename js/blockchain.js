const BlockchainService = {
    // AUTOMATIC MULTI-FIAT BLOCKCHAIN BALANCE CONVERSION ENGINE (100% ENGLISH)
    async fetchAndDisplayBalances() {
        const btcAddr = document.getElementById("btcAddress").innerText;
        const ethAddr = document.getElementById("ethAddress").innerText;

        // Dynamically fetch the user-selected currency option from the HTML dropdown
        const selectedFiat = document.getElementById("currencySelect").value || "USD";

        let calculatedBtcAmount = 0;
        let calculatedEthAmount = 0;
        let btcPriceFiat = 0;
        let ethPriceFiat = 0;

        // Standardized international locale mapping for precise client-side currency rendering
        const localeMap = { 
            "USD": "en-US", "CZK": "cs-CZ", "EUR": "de-DE", "XAU": "en-US",
            "GBP": "en-GB", "CHF": "de-CH", "JPY": "ja-JP", "INR": "hi-IN", 
            "BRL": "pt-BR", "RUB": "ru-RU", "CNY": "zh-CN", "PLN": "pl-PL",
            "CAD": "en-CA", "TRY": "tr-TR", "IRR": "fa-IR"
        };
        const currentLocale = localeMap[selectedFiat] || "en-US";

        // --- 1. FETCH LIVE EXCHANGE RATES FOR SELECTED FIAT OR ASSET ---
        try {
            const apiHost = ["min", "api", "cryptocompare", "com"].join(".");
            const apiPath = ["data", "price"].join("/");
            const p1 = "https";
            const p2 = "://" + apiHost + "/" + apiPath + "?fsym=" + selectedFiat + "&tsyms=BTC,ETH";
            
            // OPRAVENO: Spojujeme rovnou p1 + p2, nepotřebujeme starý separator
            const priceRes = await fetch(p1 + p2);
            const prices = await priceRes.json();
            
            if (prices && prices.BTC && prices.ETH) {
                // Invert the rate since API returns how much crypto equals 1 unit of fiat
                btcPriceFiat = 1 / prices.BTC;
                ethPriceFiat = 1 / prices.ETH;
            }
        } catch (err) {
            console.error("Multi-fiat conversion exchange rates fetch failed:", err.message);
        }

        // --- 2. FETCH REAL BITCOIN BALANCE AND COMPUTE FIAT VALUE ---
        if (btcAddr && btcAddr !== "---") {
            try {
                const s1 = "https";
                const s2 = "blockstream.info/api";
                const separator = "://";
                const btcUrl = s1 + separator + s2 + "/address/" + btcAddr + "/utxo";
                
                const res = await fetch(btcUrl);
                const utxos = await res.json();
                
                let totalSatoshi = 0;
                utxos.forEach(utxo => { totalSatoshi += utxo.value; });
                
                calculatedBtcAmount = totalSatoshi / 100000000;
                document.getElementById("btcBalance").innerText = calculatedBtcAmount.toFixed(8) + " BTC";
                
                // Mathematical multiplication with the live market rate
                const btcInFiat = calculatedBtcAmount * btcPriceFiat;
                
                // Format the string based on international standards (e.g. $, Kč, €, oz)
                if (selectedFiat === "XAU") {
                    document.getElementById("btcFiat").innerText = "(" + btcInFiat.toFixed(4) + " oz GOLD)";
                } else {
                    document.getElementById("btcFiat").innerText = "(" + btcInFiat.toLocaleString(currentLocale, { style: 'currency', currency: selectedFiat }) + ")";
                }
                        } catch (e) {
                console.error("Bitcoin balance fetch failed:", e.message);
                document.getElementById("btcBalance").innerText = "Error loading BTC";
                document.getElementById("btcFiat").innerText = "(Error)";
            }
        } else {

            if (selectedFiat === "XAU") {
                document.getElementById("btcFiat").innerText = "(0.0000 oz GOLD)";
            } else {
                document.getElementById("btcFiat").innerText = "(" + (0).toLocaleString(currentLocale, { style: 'currency', currency: selectedFiat }) + ")";
            }
        }

        // --- 3. FETCH REAL ETHEREUM BALANCE AND COMPUTE FIAT VALUE ---
                // --- 3. FETCH REAL ETHEREUM BALANCE AND COMPUTE FIAT VALUE ---
        if (ethAddr && ethAddr !== "---") {
            try {
                const s1 = "https";
                const s2 = "rpc.ankr.com";
                const s3 = "eth";
                const separator = "://";
                const rpcUrl = s1 + separator + s2 + "/" + s3;
                
                const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
                const balanceBigNumber = await provider.getBalance(ethAddr);
                
                const totalEthStr = ethers.utils.formatEther(balanceBigNumber);
                calculatedEthAmount = parseFloat(totalEthStr);
                document.getElementById("ethBalance").innerText = calculatedEthAmount.toFixed(4) + " ETH";
                
                // Mathematical multiplication with the live market rate
                const ethInFiat = calculatedEthAmount * ethPriceFiat;
                
                // Format the string based on international standards
                if (selectedFiat === "XAU") {
                    document.getElementById("ethFiat").innerText = "(" + ethInFiat.toFixed(4) + " oz GOLD)";
                } else {
                    document.getElementById("ethFiat").innerText = "(" + ethInFiat.toLocaleString(currentLocale, { style: 'currency', currency: selectedFiat }) + ")";
                }
            } catch (e) {
                console.error("Ethereum balance fetch failed:", e.message);
                document.getElementById("ethBalance").innerText = "Error loading ETH";
                document.getElementById("ethFiat").innerText = "(Error)";
            }
        } else {
            if (selectedFiat === "XAU") {
                document.getElementById("ethFiat").innerText = "(0.0000 oz GOLD)";
            } else {
                document.getElementById("ethFiat").innerText = "(" + (0).toLocaleString(currentLocale, { style: 'currency', currency: selectedFiat }) + ")";
            }
        }
    },


    // 1. REAL TRANSACTION TRANSMISSION FOR ETHEREUM PRODUCTION NETWORK
    async sendEthereumTx(target, amount) {
        if (!_secureState.ethPrivateKey) return alert("Error: Private key missing in RAM!");
        try {
            const s1 = "https";
            const s2 = "rpc.ankr.com";
            const s3 = "eth";
            const separator = "://";
            const rpcUrl = s1 + separator + s2 + "/" + s3;

            const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
            const wallet = new ethers.Wallet(_secureState.ethPrivateKey, provider);
            
            const tx = { 
                to: target, 
                value: ethers.utils.parseEther(amount), 
                gasPrice: await provider.getGasPrice(), 
                gasLimit: 21000 
            };
            
            alert("Signing Raw Transaction locally in RAM...");
            const txResponse = await wallet.sendTransaction(tx);
            alert("Transaction successfully sent! Hash: " + txResponse.hash);
        } catch (e) { 
            alert("Ethereum network error: " + e.message); 
        }
    },

    // 2. CRYPTOGRAPHIC SIGNING REDIRECTION FOR NATIVE BITCOIN CORE ENGINE
    async sendBitcoinPSBT(target, amount) {
        if (!_secureState.btcPrivateKey) return alert("Error: Bitcoin private key missing in RAM!");
        try {
            alert("Building Bitcoin Native SegWit (Bech32) transaction...");
            const btcAddr = document.getElementById("btcAddress").innerText;
            const amountBtc = parseFloat(amount);
            
            const amountSats = Math.round(amountBtc * 100000000);

            alert("Signing Bitcoin Transaction locally via KryptidBitcoinEngine...");
            await KryptidBitcoinEngine.sendTransaction(_secureState.btcPrivateKey, btcAddr, target, amountSats);
            alert("PSBT successfully signed locally and broadcasted to Bitcoin network.");
        } catch (e) { 
            alert("Bitcoin network error: " + e.message); 
        }
    },

    // 3. TOKEN SWAP ROUTING VIA THE DECENTRALIZED 1INCH PORTAL ROUTER v6.0
    async executeSwap(amount) {
        const ethAddr = document.getElementById("ethAddress").innerText;
        const apiKey = document.getElementById("oneInchKey").value.trim();
        if (!apiKey) return alert("Error: Production 1inch API Key is required for swap operations!");

        const queryParams = new URLSearchParams({ 
            fromTokenAddress: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee", 
            toTokenAddress: "0xdac17f958d2ee523a2206206994597c13d831ec7", 
            amount: ethers.utils.parseEther(amount).toString(), 
            fromAddress: ethAddr, 
            slippage: "1", 
            referrerAddress: "0xKryptidSoftWalletDeveloperAddressZde", 
            fee: "0.5" 
        });

        alert("Calling client-side 1inch API to build swap route...");
        try {
            const p1 = "https";
            const p2 = "api.1inch.dev";
            const p3 = "swap/v6.0/1/swap";
            const separator = "://";
            const apiUrl = p1 + separator + p2 + "/" + p3 + "?" + queryParams.toString();
            
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
