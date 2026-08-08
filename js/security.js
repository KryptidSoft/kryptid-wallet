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

            // OPRAVA: Okamžité vymazání schránky během události bez asynchronního timeoutu
            input.addEventListener('paste', () => {
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText("");
                }
            });
        });
    }
};

document.addEventListener('DOMContentLoaded', SecurityLayer.init);
