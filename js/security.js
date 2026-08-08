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

            // Povolení vložení s bleskovým promazáním systémové schránky (100ms)
            input.addEventListener('paste', () => {
                setTimeout(() => {
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                        navigator.clipboard.writeText("");
                    }
                }, 100);
            });
        });
    }
};

document.addEventListener('DOMContentLoaded', SecurityLayer.init);
