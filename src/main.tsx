// ===============================
// 🔹 Gestione Service Worker (PWA)
// ===============================
import { registerSW } from 'virtual:pwa-register'

const updateSW = registerSW({
  onNeedRefresh() {
    // ✅ popup visibile quando c'è un nuovo deploy
    const confirmed = window.confirm(
      'È disponibile una nuova versione di Montecarlo2013.\nVuoi aggiornare ora?'
    )
    if (confirmed) {
      updateSW(true)
    }
  },
  onOfflineReady() {
    console.log('App pronta per l\'uso offline')
  },
})
