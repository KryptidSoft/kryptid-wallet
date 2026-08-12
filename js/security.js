const SecurityLayer = {
    init() {
        // DYNAMICKÝ SELEKTOR: Najde všechna heslová pole a specifické textové vstupy pro seed
        const inputs = document.querySelectorAll('input[type="password"], #seedInput, #masterPassword, #masterPasswordUnlock');
        
        inputs.forEach(input => {
            if (!input) return;
            
            // Ochrana před Keyloggery, doplňky a našeptávači OS
            input.setAttribute('type', 'password');
            input.setAttribute('autocomplete', 'off');
            input.setAttribute('autocorrect', 'off');
            input.setAttribute('spellcheck', 'false');

            // Absolutní zákaz kopírování citlivých dat VEN z aplikace
            input.addEventListener('copy', (e) => {
                e.preventDefault();
                console.warn("[Kryptid Security] Copy operations are strictly blocked inside cryptographic zones.");
            });
            input.addEventListener('cut', (e) => {
                e.preventDefault();
                console.warn("[Kryptid Security] Cut operations are strictly blocked inside cryptographic zones.");
            });

            // BEZPEČNÁ OPRAVA: Schránka operačního systému se vymaže ihned po vložení (anti-clipboard malware)
            input.addEventListener('paste', () => {
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    setTimeout(() => {
                        navigator.clipboard.writeText("");
                        console.log("[Kryptid Security] OS Clipboard wiped immediately after successful paste.");
                    }, 1);
                }
            });
        });

        // DODATEČNÁ FUNKCE: Ochrana proti pokusům o drag & drop citlivých textů do aplikace
        document.querySelectorAll('#seedInput, [id*="Password"]').forEach(zone => {
            zone.addEventListener('drop', (e) => e.preventDefault());
        });
    }
};

document.addEventListener('DOMContentLoaded', SecurityLayer.init);
