@echo off
title Kryptid Wallet Launcher
:: Tento univerz ln¡ skript automaticky najde Microsoft Edge a bezpecne spust¡ penezenku v aplikovan‚m rezimu z jak‚koliv slozky
set "SCRIPT_DIR=%~dp0"
set "INDEX_PATH=file:///%SCRIPT_DIR%index.html"

if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" (
    start "" "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" --app="%INDEX_PATH%" --no-first-run --disable-extensions
) else if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
    start "" "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" --app="%INDEX_PATH%" --no-first-run --disable-extensions
) else (
    :: Fallback: Pokud v syst‚mu nenajde Edge, spust¡ soubor ve vychoz¡m prohl¡zeci uzivatele
    start "" "%SCRIPT_DIR%index.html"
)
exit
