@echo off
echo ======================================
echo  MONTECARLO DEV RESET - Windows Script
echo ======================================
echo.

:: Chiude vite se è in esecuzione
taskkill /IM node.exe /F >nul 2>&1

:: Pulisce la cache di Vite
echo 🧹 Rimozione cache Vite...
rmdir /s /q node_modules\.vite

:: Pulisce la build
echo 🧹 Rimozione cartella dist...
rmdir /s /q dist

:: Cancella cache service worker dal browser
echo ⚙️  Disattivazione service worker nel browser...
echo Apri DevTools > Application > Service Workers > Unregister (manuale)
echo oppure esegui questo comando nella console:
echo navigator.serviceWorker.getRegistrations().then(r => r.forEach(x => x.unregister()))
echo.

:: Riavvia vite
echo 🚀 Avvio ambiente di sviluppo pulito...
npm run dev
pause
