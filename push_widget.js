;(function(){
  /* ══════════════════════════════════════════════
     Trabajos Cerca — Push Widget
     Registra el SW, pide permiso y guarda la
     suscripción en Supabase para recibir pushes
     aunque la app esté cerrada.
  ══════════════════════════════════════════════ */

  // ── REEMPLAZÁ ESTO con tu clave pública VAPID ──
  const VAPID_PUBLIC = 'BEgk1g9JbG1eJhxf9qyjOV9QMEVNvpOhCcTBcqvl0SSQ1sFcxj25-sZz85Ktu00igsl-KrWIC7zVp__jWP6UJ6E'
  // ────────────────────────────────────────────────

  const SB_URL = "https://iqeiszkoifxgygoqvbem.supabase.co"
  const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxZWlzemtvaWZ4Z3lnb3F2YmVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyMTEzODIsImV4cCI6MjA5NDc4NzM4Mn0.qxt70TPbARPcMc8HhHx2A2QnfBvJLCrnrH4m36IcENs"

  /* ── Helpers de auth ── */
  function getToken(){
    try { return JSON.parse(localStorage.getItem("sb-iqeiszkoifxgygoqvbem-auth-token"))?.access_token || null }
    catch(e){ return null }
  }
  function getUserId(){
    const t = getToken(); if(!t) return null
    try { return JSON.parse(atob(t.split(".")[1])).sub || null } catch(e){ return null }
  }

  /* ── Checks previos ── */
  if(VAPID_PUBLIC === '__VAPID_PUBLIC_KEY__') return   // aún no configurado
  if(!('serviceWorker' in navigator))        return   // browser no soporta SW
  if(!('PushManager' in window))             return   // browser no soporta Push

  const userId = getUserId()
  if(!userId) return  // no logueado

  /* ── Init ── */
  async function init(){
    try {
      // 1. Registrar Service Worker
      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
      await navigator.serviceWorker.ready

      // 2. Ver si ya tiene suscripción activa
      const subExistente = await reg.pushManager.getSubscription()
      if(subExistente){
        // Sincronizar con Supabase por si cambió el endpoint
        await guardarSubscription(subExistente)
        return
      }

      // 3. Pedir permiso de notificaciones (solo si nunca se preguntó)
      if(Notification.permission === 'denied') return

      // Esperar un poco para no interrumpir la carga de la página
      await new Promise(r => setTimeout(r, 4000))

      const permiso = await Notification.requestPermission()
      if(permiso !== 'granted') return

      // 4. Suscribir al servidor de push
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC)
      })

      await guardarSubscription(sub)

    } catch(err){
      console.warn('[PushWidget] No disponible:', err.message)
    }
  }

  /* ── Guardar suscripción en Supabase ── */
  async function guardarSubscription(sub){
    const token = getToken()
    if(!token) return
    try {
      await fetch(`${SB_URL}/rest/v1/push_subscriptions`, {
        method: 'POST',
        headers: {
          'apikey':       SB_KEY,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Prefer':       'resolution=merge-duplicates'
        },
        body: JSON.stringify({
          usuario_id:   userId,
          endpoint:     sub.endpoint,
          subscription: sub.toJSON()
        })
      })
    } catch(e){}
  }

  /* ── Convertir VAPID key de base64url a Uint8Array ── */
  function urlBase64ToUint8Array(base64String){
    const padding = '='.repeat((4 - base64String.length % 4) % 4)
    const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
    const raw     = window.atob(base64)
    return Uint8Array.from([...raw].map(c => c.charCodeAt(0)))
  }

  /* ── Arrancar después de que cargue la página ── */
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }

})()
