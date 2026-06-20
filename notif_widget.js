;(function(){
  if(document.getElementById("notif-bell-wrap")) return

  const SB_URL = "https://iqeiszkoifxgygoqvbem.supabase.co"
  const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxZWlzemtvaWZ4Z3lnb3F2YmVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyMTEzODIsImV4cCI6MjA5NDc4NzM4Mn0.qxt70TPbARPcMc8HhHx2A2QnfBvJLCrnrH4m36IcENs"

  /* ── Auth helpers ── */
  function getToken(){
    // Intentar varias claves posibles de Supabase v2
    const claves = [
      "sb-iqeiszkoifxgygoqvbem-auth-token",
      "supabase.auth.token"
    ]
    for(const clave of claves){
      try {
        const raw = localStorage.getItem(clave)
        if(!raw) continue
        const parsed = JSON.parse(raw)
        const token = parsed?.access_token || parsed?.currentSession?.access_token || null
        if(token) return token
      } catch(e){}
    }
    // Escanear todas las claves buscando un token de Supabase
    try {
      for(let i = 0; i < localStorage.length; i++){
        const k = localStorage.key(i)
        if(!k || !k.includes("supabase") && !k.includes("sb-")) continue
        const raw = localStorage.getItem(k)
        if(!raw) continue
        const parsed = JSON.parse(raw)
        const token = parsed?.access_token || null
        if(token) return token
      }
    } catch(e){}
    return null
  }
  function getUserId(){
    const t = getToken(); if(!t) return null
    try { return JSON.parse(atob(t.split(".")[1])).sub || null } catch(e){ return null }
  }

  // Montar campana siempre — verificar auth después (Supabase puede no estar listo aún)
  let userId = getUserId()

  function hdrs(){
    return {
      "apikey": SB_KEY,
      "Authorization": `Bearer ${getToken()}`,
      "Content-Type": "application/json"
    }
  }

  /* ══════ CSS ══════ */
  const css = `
  #notif-bell-wrap {
    position: relative; display: inline-flex; align-items: center;
  }
  #notif-bell {
    position: relative; cursor: pointer; padding: 5px 8px;
    color: #94a3b8; font-size: 17px;
    display: flex; align-items: center; transition: color .2s;
  }
  #notif-bell:hover { color: #2563eb; }
  #notif-badge {
    position: absolute; top: 1px; right: 1px;
    background: #ef4444; color: white; font-size: 9px; font-weight: 800;
    min-width: 15px; height: 15px; border-radius: 20px; padding: 0 3px;
    display: flex; align-items: center; justify-content: center;
    border: 2px solid white; pointer-events: none; line-height: 1;
    animation: nw-pulse 1.5s ease-in-out infinite;
  }
  @keyframes nw-pulse {
    0%,100% { transform: scale(1); }
    50% { transform: scale(1.15); }
  }
  #notif-panel {
    position: absolute; top: calc(100% + 10px); right: -10px;
    width: 330px; background: white; border-radius: 16px;
    box-shadow: 0 12px 40px rgba(0,0,0,.18);
    border: 1px solid #e2e8f0; overflow: hidden;
    display: none; z-index: 6000;
    animation: nw-aparecer .18s ease;
  }
  @keyframes nw-aparecer {
    from { opacity:0; transform: translateY(-6px); }
    to   { opacity:1; transform: translateY(0); }
  }
  #notif-panel.abierto { display: block; }
  .nw-header {
    padding: 14px 16px 12px; border-bottom: 1px solid #e2e8f0;
    display: flex; align-items: center; justify-content: space-between;
    background: #f8fafc;
  }
  .nw-header strong { font-size: 14px; color: #1e293b; font-weight: 800; }
  .nw-marcar { font-size: 12px; color: #2563eb; cursor: pointer; font-weight: 600; padding: 3px 8px; border-radius: 6px; }
  .nw-marcar:hover { background: #eff6ff; }
  .nw-lista { max-height: 380px; overflow-y: auto; }
  .nw-lista::-webkit-scrollbar { width: 4px; }
  .nw-lista::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 4px; }
  .nw-separador {
    padding: 6px 14px 4px; font-size: 11px; font-weight: 700;
    color: #94a3b8; text-transform: uppercase; letter-spacing: .05em;
    background: #f8fafc; border-bottom: 1px solid #f1f5f9;
  }
  .nw-item {
    padding: 12px 14px; border-bottom: 1px solid #f1f5f9;
    display: flex; gap: 11px; align-items: flex-start;
    cursor: default; transition: background .15s;
  }
  .nw-item.nw-url { cursor: pointer; }
  .nw-item.nw-url:hover { background: #f8fafc; }
  .nw-item.nw-nueva { background: #eff6ff; border-left: 3px solid #2563eb; }
  .nw-item.nw-nueva.nw-url:hover { background: #dbeafe; }
  .nw-ico {
    width: 36px; height: 36px; border-radius: 10px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center; font-size: 17px;
  }
  .nw-body { flex: 1; min-width: 0; }
  .nw-body strong { font-size: 13px; color: #1e293b; display: block; margin-bottom: 2px; line-height: 1.35; }
  .nw-body p { font-size: 12px; color: #64748b; margin: 0 0 3px; line-height: 1.4; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .nw-meta { display: flex; align-items: center; gap: 6px; }
  .nw-body time { font-size: 11px; color: #94a3b8; }
  .nw-nueva-dot { width: 7px; height: 7px; border-radius: 50%; background: #2563eb; flex-shrink: 0; }
  .nw-vacia {
    padding: 36px 16px; text-align: center; color: #94a3b8;
  }
  .nw-vacia i { font-size: 32px; display: block; margin-bottom: 10px; opacity: .4; }
  .nw-vacia p { margin: 0; font-size: 13px; }
  .nw-footer {
    padding: 10px 16px; border-top: 1px solid #e2e8f0; text-align: center;
    background: #f8fafc;
  }
  .nw-footer a { font-size: 12px; color: #2563eb; font-weight: 600; text-decoration: none; }
  .nw-footer a:hover { text-decoration: underline; }
  @media(max-width: 400px){
    #notif-panel { width: calc(100vw - 24px); right: -50px; }
  }
  /* ── Overrides para navbar unificada oscura ── */
  .tnav-right #notif-bell-wrap { display:inline-flex; align-items:center; }
  .tnav-right #notif-bell { color: rgba(255,255,255,.82); border-radius:8px; }
  .tnav-right #notif-bell:hover { color:white; background:rgba(255,255,255,.18); }
  .tnav-right #notif-badge { border-color: #1e3a8a; }
  `
  const styleEl = document.createElement("style")
  styleEl.textContent = css
  document.head.appendChild(styleEl)

  /* ══════ HTML ══════ */
  const wrap = document.createElement("div")
  wrap.id = "notif-bell-wrap"
  wrap.innerHTML = `
    <div id="notif-bell" onclick="window._nwToggle(event)" title="Notificaciones">
      <i class="fa-solid fa-bell"></i>
      <span id="notif-badge" style="display:none;">0</span>
    </div>
    <div id="notif-panel">
      <div class="nw-header">
        <strong><i class="fa-solid fa-bell" style="color:#2563eb;font-size:13px;margin-right:5px;"></i>Notificaciones</strong>
        <span class="nw-marcar" onclick="window._nwMarcarTodo(event)">Marcar todo leído</span>
      </div>
      <div class="nw-lista" id="nw-lista">
        <div class="nw-vacia">
          <i class="fa-solid fa-bell-slash"></i>
          <p>Sin notificaciones por ahora</p>
        </div>
      </div>
      <div class="nw-footer">
        <a href="/notificaciones.html">Ver todas las notificaciones</a>
      </div>
    </div>`

  /* ── Soporte para navbar unificada (tnav-right), anchor fijo y nav clásico ── */
  function montarBell(){
    const anchor   = document.getElementById("notif-bell-anchor")
    const tnavRight = document.querySelector(".tnav-right")
    const legacyNav = document.querySelector(".topbar nav")
    if(!anchor && !tnavRight && !legacyNav){ setTimeout(montarBell, 150); return }

    if(anchor){
      anchor.replaceWith(wrap)
    } else if(tnavRight){
      const prodeBtn = tnavRight.querySelector(".btn-prode")
      if(prodeBtn) tnavRight.insertBefore(wrap, prodeBtn)
      else tnavRight.appendChild(wrap)
    } else {
      legacyNav.insertBefore(wrap, legacyNav.firstChild)
    }
  }

  if(document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", montarBell)
  else
    montarBell()

  // Cerrar al clickear afuera
  document.addEventListener("click", e => {
    if(!wrap.contains(e.target)){
      document.getElementById("notif-panel")?.classList.remove("abierto")
    }
  })

  /* ══════ Lógica ══════ */
  let _notifs = []

  window._nwToggle = function(e){
    if(e) e.stopPropagation()
    const panel = document.getElementById("notif-panel")
    const abrir = !panel.classList.contains("abierto")
    panel.classList.toggle("abierto", abrir)
    if(abrir) cargar(true)
  }

  window._nwMarcarTodo = function(e){
    if(e) e.stopPropagation()
    const ids = _notifs.filter(n => !n.leida).map(n => n.id)
    if(ids.length) patchLeidas(ids)
  }

  window._nwClick = function(id, url){
    // marcar esa notif como leída
    patchLeidas([id])
    if(url) window.location.href = url
  }

  async function cargar(marcarAlAbrir = false){
    try {
      const res = await fetch(
        `${SB_URL}/rest/v1/notificaciones?usuario_id=eq.${userId}&order=created_at.desc&limit=25`,
        { headers: hdrs() }
      )
      if(!res.ok) return
      _notifs = await res.json()
      render()
      if(marcarAlAbrir){
        const ids = _notifs.filter(n => !n.leida).map(n => n.id)
        if(ids.length) patchLeidas(ids)
      }
    } catch(e){}
  }

  async function patchLeidas(ids){
    try {
      await fetch(
        `${SB_URL}/rest/v1/notificaciones?id=in.(${ids.join(",")})`,
        { method: "PATCH", headers: { ...hdrs(), "Prefer": "return=minimal" }, body: JSON.stringify({ leida: true }) }
      )
      _notifs.forEach(n => { if(ids.includes(n.id)) n.leida = true })
      render()
    } catch(e){}
  }

  function render(){
    const lista = document.getElementById("nw-lista")
    const badge = document.getElementById("notif-badge")
    if(!lista || !badge) return

    const noLeidas = _notifs.filter(n => !n.leida).length
    badge.style.display = noLeidas > 0 ? "flex" : "none"
    badge.textContent   = noLeidas > 9 ? "9+" : noLeidas

    if(!_notifs.length){
      lista.innerHTML = `<div class="nw-vacia"><i class="fa-solid fa-bell-slash"></i><p>Sin notificaciones por ahora</p></div>`
      return
    }

    const ICONOS = {
      review:   { ico: "⭐", bg: "#fef9c3" },
      pedido:   { ico: "📋", bg: "#eff6ff" },
      mensaje:  { ico: "💬", bg: "#dbeafe" },
      sistema:  { ico: "📣", bg: "#f0fdf4" },
      pago:     { ico: "💰", bg: "#dcfce7" },
      contacto: { ico: "👤", bg: "#fce7f3" },
      alerta:   { ico: "⚠️", bg: "#fef3c7" },
    }

    const nuevas    = _notifs.filter(n => !n.leida)
    const anteriores = _notifs.filter(n => n.leida)

    function renderItem(n) {
      const ic  = ICONOS[n.tipo] || { ico: "🔔", bg: "#f1f5f9" }
      const cls = `nw-item ${n.leida ? "" : "nw-nueva"} ${n.url ? "nw-url" : ""}`
      const onclick = `onclick="window._nwClick('${n.id}','${n.url || ''}')" `
      return `<div class="${cls}" ${onclick}>
        <div class="nw-ico" style="background:${ic.bg};">${ic.ico}</div>
        <div class="nw-body">
          <strong>${n.titulo}</strong>
          ${n.cuerpo ? `<p>${n.cuerpo}</p>` : ""}
          <div class="nw-meta">
            ${!n.leida ? '<span class="nw-nueva-dot"></span>' : ''}
            <time>${hace(n.created_at)}</time>
          </div>
        </div>
      </div>`
    }

    let html = ""
    if (nuevas.length) {
      html += `<div class="nw-separador">🔵 Nuevas (${nuevas.length})</div>`
      html += nuevas.map(renderItem).join("")
    }
    if (anteriores.length) {
      html += `<div class="nw-separador">Anteriores</div>`
      html += anteriores.map(renderItem).join("")
    }
    lista.innerHTML = html
  }

  function hace(iso){
    const d = (Date.now() - new Date(iso).getTime()) / 1000
    if(d < 60)    return "Ahora mismo"
    if(d < 3600)  return `Hace ${Math.floor(d/60)} min`
    if(d < 86400) return `Hace ${Math.floor(d/3600)} h`
    if(d < 604800)return `Hace ${Math.floor(d/86400)} días`
    return new Date(iso).toLocaleDateString("es-AR", { day:"numeric", month:"short" })
  }

  /* ── Notificación del sistema al recibir nuevas notificaciones ── */
  let _ultimoConteo = -1  // -1 = aún no inicializado (distinguible de 0 notificaciones)
  function notificarSiHayNuevas(notifs){
    const noLeidas = notifs.filter(n => !n.leida)
    if(_ultimoConteo === -1){
      // Primera carga: guardamos la línea base sin disparar alerta
      _ultimoConteo = noLeidas.length
      return
    }
    if(noLeidas.length > _ultimoConteo){
      // Pedir permiso si todavía no se preguntó
      if(Notification.permission === 'default') Notification.requestPermission()
      if(Notification.permission === 'granted'){
        const ultima = noLeidas[0]
        try {
          new Notification(ultima.titulo || 'Trabajos Cerca', {
            body: ultima.cuerpo || '',
            icon: '/icon-192.png',
            badge: '/icon-192.png',
            tag: 'tc-notif-' + ultima.id
          })
        } catch(e){}
      }
    }
    _ultimoConteo = noLeidas.length
  }

  async function cargarConNotif(){
    try {
      const res = await fetch(
        `${SB_URL}/rest/v1/notificaciones?usuario_id=eq.${userId}&order=created_at.desc&limit=25`,
        { headers: hdrs() }
      )
      if(!res.ok) return
      const data = await res.json()
      notificarSiHayNuevas(data)
      _notifs = data
      render()
    } catch(e){}
  }

  /* Carga inicial + polling cada 30s
     Si userId no estaba disponible al inicio, reintenta hasta que Supabase inicialice */
  let _intervalo = null
  async function arrancar(){
    if(!userId){
      userId = getUserId()
      if(!userId) return  // todavía no disponible, esperar el próximo intento
    }
    cargarConNotif()
    chequearMensajes()
    chequearAdmin()
    if(_intervalo) clearInterval(_intervalo)
    _intervalo = setInterval(() => cargarConNotif(), 30000)
    setInterval(() => chequearMensajes(), 15000)
  }

  // Intentar ahora; si userId es null, reintentar cada 500ms hasta 5 segundos
  arrancar()
  const _retry = setInterval(() => {
    if(userId){ clearInterval(_retry); return }
    arrancar()
  }, 500)
  setTimeout(() => clearInterval(_retry), 5000)

  /* ── Badge + notificación de mensajes no leídos ── */
  let _ultimoConteoMensajes = -1  // -1 = aún no inicializado
  async function chequearMensajes(){
    try {
      const res = await fetch(
        `${SB_URL}/rest/v1/conversaciones?or=(usuario1_id.eq.${userId},usuario2_id.eq.${userId})&select=usuario1_id,usuario2_id,no_leidos_u1,no_leidos_u2`,
        { headers: hdrs() }
      )
      if(!res.ok) return
      const convs = await res.json()
      let total = 0
      convs.forEach(c => {
        if(c.usuario1_id === userId) total += (c.no_leidos_u1 || 0)
        else total += (c.no_leidos_u2 || 0)
      })

      // Disparar notificación si llegaron mensajes nuevos (no en la primera carga)
      if(_ultimoConteoMensajes >= 0 && total > _ultimoConteoMensajes){
        if(Notification.permission === 'default') Notification.requestPermission()
        if(Notification.permission === 'granted'){
          try {
            new Notification('Nuevo mensaje — Trabajos Cerca', {
              body: 'Tenés mensajes sin leer',
              icon: '/icon-192.png',
              badge: '/icon-192.png',
              tag: 'tc-msg'
            })
          } catch(e){}
        }
      }
      _ultimoConteoMensajes = total

      // Actualizar badge en el link de mensajes del nav
      const msgLinks = document.querySelectorAll('a[href="/mensajes.html"]')
      msgLinks.forEach(link => {
        let badge = link.querySelector(".msg-nav-badge")
        if(total > 0){
          if(!badge){
            badge = document.createElement("span")
            badge.className = "msg-nav-badge"
            badge.style.cssText = "background:#ef4444;color:white;font-size:9px;font-weight:800;min-width:14px;height:14px;border-radius:20px;padding:0 3px;display:inline-flex;align-items:center;justify-content:center;margin-left:3px;line-height:1;"
            link.appendChild(badge)
          }
          badge.textContent = total > 9 ? "9+" : total
        } else if(badge){
          badge.remove()
        }
      })
    } catch(e){}
  }

  /* ── Ícono admin (solo si es admin) ── */
  async function chequearAdmin(){
    try {
      const res = await fetch(
        `${SB_URL}/rest/v1/perfiles?id=eq.${userId}&select=admin`,
        { headers: hdrs() }
      )
      if(!res.ok) return
      const data = await res.json()
      if(!data?.[0]?.admin) return

      // Ya es admin → agregar ícono al nav
      const adminLink = document.createElement("a")
      adminLink.href  = "/admin.html"
      adminLink.title = "Panel admin"
      adminLink.innerHTML = `<i class="fa-solid fa-shield-halved" style="color:#7c3aed;"></i> <span style="color:#7c3aed;font-weight:700;">Admin</span>`
      adminLink.style.cssText = "display:inline-flex;align-items:center;gap:5px;"

      // Resaltar si ya estamos en admin.html
      if(location.pathname === "/admin.html"){
        adminLink.style.color = "#7c3aed"
        adminLink.style.fontWeight = "700"
      }

      // Insertar antes de la campana
      nav.insertBefore(adminLink, wrap)
    } catch(e){}
  }

})()
