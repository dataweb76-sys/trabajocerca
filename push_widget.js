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

  /* ══════════════════════════════════════════
     BANNER DE ACTUALIZACIÓN DE LA APP
  ══════════════════════════════════════════ */
  function mostrarBannerUpdate(){
    if(document.getElementById('tc-update-banner')) return
    const banner = document.createElement('div')
    banner.id = 'tc-update-banner'
    banner.style.cssText = `
      position:fixed;bottom:0;left:0;right:0;z-index:99999;
      background:linear-gradient(135deg,#1d4ed8,#7c3aed);
      color:white;padding:13px 20px;
      display:flex;align-items:center;justify-content:space-between;gap:12px;
      box-shadow:0 -4px 20px rgba(0,0,0,.2);font-family:inherit;flex-wrap:wrap;
    `
    banner.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;flex:1;min-width:200px;">
        <span style="font-size:22px;">🆕</span>
        <div>
          <strong style="display:block;font-size:14px;">Nueva versión disponible</strong>
          <span style="font-size:12px;opacity:.85;">Actualizá para tener las últimas mejoras</span>
        </div>
      </div>
      <div style="display:flex;gap:8px;flex-shrink:0;">
        <button id="tc-update-btn" style="
          background:white;color:#1d4ed8;border:none;border-radius:9px;
          padding:9px 18px;font-size:13px;font-weight:800;cursor:pointer;font-family:inherit;">
          Actualizar ahora
        </button>
        <button onclick="document.getElementById('tc-update-banner').remove()" style="
          background:rgba(255,255,255,.15);color:white;border:none;border-radius:9px;
          padding:9px 12px;font-size:13px;cursor:pointer;font-family:inherit;">✕</button>
      </div>
    `
    document.body.appendChild(banner)
    document.getElementById('tc-update-btn').addEventListener('click', () => {
      navigator.serviceWorker.getRegistration().then(reg => {
        if(reg?.waiting){ reg.waiting.postMessage({ type: 'SKIP_WAITING' }) }
        else { location.reload() }
      })
    })
  }

  /* ── Escuchar actualizaciones del SW ── */
  if('serviceWorker' in navigator){
    navigator.serviceWorker.addEventListener('message', e => {
      if(e.data?.type === 'SW_UPDATED') mostrarBannerUpdate()
    })
    // También detectar si hay un SW esperando al registrar
    navigator.serviceWorker.getRegistration().then(reg => {
      if(reg?.waiting) mostrarBannerUpdate()
      if(reg) reg.addEventListener('updatefound', () => {
        const newSW = reg.installing
        newSW?.addEventListener('statechange', () => {
          if(newSW.state === 'installed' && navigator.serviceWorker.controller) mostrarBannerUpdate()
        })
      })
    })
  }

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
