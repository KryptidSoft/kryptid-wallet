const SecurityLayer = {
    init() {
        const inputs = [document.getElementById('seedInput'), document.getElementById('masterPassword')];
        
        inputs.forEach(input => {
            if (!input) return;
            
            // Ochrana před Keyloggery a sítěmi
            input.setAttribute('type', 'password');
            input.setAttribute('autocomplete', 'off');
            input.setAttribute('autocorrect', 'off');
            input.setAttribute('spellcheck', 'false');

            // Zakázání odchodu citlivých dat ven
            input.addEventListener('copy', (e) => e.preventDefault());
            input.addEventListener('cut', (e) => e.preventDefault());

            // BEZPEČNÁ OPRAVA: Schránka se vymaže okamžitě po úspěšném vložení textu do políčka
            input.addEventListener('paste', () => {
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    setTimeout(() => {
                        navigator.clipboard.writeText("");
                        console.log("[Kryptid Security] Clipboard wiped immediately after successful paste.");
                    }, 1);
                }
            });
        });
    }
};

document.addEventListener('DOMContentLoaded', SecurityLayer.init);
