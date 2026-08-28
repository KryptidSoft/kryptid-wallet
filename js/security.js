const SecurityLayer = {
    init() {
        // We select the sensitive inputs for local memory protection
        const inputs = document.querySelectorAll('input[type="password"], #seedInput, #masterPassword, #masterPasswordUnlock');
        
        inputs.forEach(input => {
            if (!input) return;
            
            // REMOVED: Inforcing type='password' which was breaking our HTML toggle switches!
            input.setAttribute('autocomplete', 'off');
            input.setAttribute('autocorrect', 'off');
            input.setAttribute('spellcheck', 'false');

            // Prevent unauthorized clipboard data draining
            input.addEventListener('copy', (e) => {
                e.preventDefault();
            });
            input.addEventListener('cut', (e) => {
                e.preventDefault();
            });

            // REMOVED: Aggressive clipboard wiping on paste that was frustrating users
        });

        // Block unsafe drag and drop actions into sensitive fields
        document.querySelectorAll('#seedInput, [id*="Password"]').forEach(zone => {
            zone.addEventListener('drop', (e) => e.preventDefault());
        });

        // GENIUS FORENSIC PROTECTION: Blurs the application screen on Android/Desktop task switcher
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
