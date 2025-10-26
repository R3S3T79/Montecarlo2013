#!/bin/bash
# ======================================
# MONTECARLO DEV RESET (versione con porta automatica)
# ======================================

echo "======================================"
echo " MONTECARLO DEV RESET"
echo "======================================"
echo

# 🔹 Rileva automaticamente il nome della cartella
PROJ_NAME=$(basename "$PWD")

# Imposta la porta in base al progetto
if [[ "$PROJ_NAME" == "Montecarlo2013B" ]]; then
  PORT=5176
else
  PORT=5173
fi

echo "[INFO] Progetto: $PROJ_NAME"
echo "[INFO] Porta impostata: $PORT"
echo

# 1️⃣ Termina vite/node in esecuzione
echo "[1/4] Terminazione processi vite/node..."
pkill -f vite &>/dev/null
pkill -f node &>/dev/null
sleep 1

# 2️⃣ Rimuove la cache vite
echo "[2/4] Pulizia cache di Vite..."
if [ -d "node_modules/.vite" ]; then
  rm -rf node_modules/.vite
  echo " Cache vite rimossa."
else
  echo " Nessuna cache vite trovata."
fi

# 3️⃣ Rimuove eventuale build dist
echo "[3/4] Pulizia cartella dist..."
if [ -d "dist" ]; then
  rm -rf dist
  echo " Cartella dist rimossa."
else
  echo " Nessuna cartella dist trovata."
fi

# 4️⃣ Info service worker
echo "[4/4] Controllo service worker..."
echo " Se l'app e' PWA, apri DevTools > Application > Service Workers > Unregister"
echo " Oppure esegui in console:"
echo " navigator.serviceWorker.getRegistrations().then(r => r.forEach(x => x.unregister()))"
echo

# 🚀 Avvio vite con porta corretta
echo "======================================"
echo " Avvio server vite sulla porta $PORT"
echo "======================================"
npm run dev -- --port $PORT
