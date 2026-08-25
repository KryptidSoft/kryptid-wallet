const SecurityLayer = {
    init() {
        const inputs = document.querySelectorAll('input[type="password"], #seedInput, #masterPassword, #masterPasswordUnlock');
        
        inputs.forEach(input => {
            if (!input) return;
            
            input.setAttribute('type', 'password');
            input.setAttribute('autocomplete', 'off');
            input.setAttribute('autocorrect', 'off');
            input.setAttribute('spellcheck', 'false');

            input.addEventListener('copy', (e) => {
                e.preventDefault();
            });
            input.addEventListener('cut', (e) => {
                e.preventDefault();
            });

            input.addEventListener('paste', () => {
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    setTimeout(() => {
                        navigator.clipboard.writeText("");
                    }, 1);
                }
            });
        });

        document.querySelectorAll('#seedInput, [id*="Password"]').forEach(zone => {
            zone.addEventListener('drop', (e) => e.preventDefault());
        });

        const overlay = document.createElement('div');
        overlay.id = 'security-blur-overlay';
        overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:#000;z-index:999999;display:none;align-items:center;justify-content:center;color:#fff;font-family:monospace;font-size:20px;';
        overlay.textContent = 'Kryptid Vault Secured';
        document.body.appendChild(overlay);

        window.addEventListener('blur', () => {
            overlay.style.display = 'flex';
        });

        window.addEventListener('focus', () => {
            overlay.style.display = 'none';
        });
    }
};

document.addEventListener('DOMContentLoaded', SecurityLayer.init);
