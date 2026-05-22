import { supabase } from "./supabase.js"

let usuarioActual = null
let convActivaId   = null
let otroUsuarioId  = null
let _convsCache    = []   // cache con perfiles ya resueltos
let pollingTimer   = null

/* ══════════════════════════════════════
   INIT
══════════════════════════════════════ */
async function init(){
  const { data: authData } = await supabase.auth.getUser()
  if(!authData?.user){
    window.location.href = "/login.html"
    return
  }
  usuarioActual = authData.user.id

  const params = new URLSearchParams(location.search)
  const convParam = params.get("conv")

  await cargarConversaciones(convParam)

  pollingTimer = setInterval(() => {
    cargarConversaciones(null, true)
    if(convActivaId) pollarMensajes()
  }, 8000)
}

/* ══════════════════════════════════════
   CONVERSACIONES
   — fetch convs, luego perfiles por separado
══════════════════════════════════════ */
async function cargarConversaciones(abrirConvId = null, silencioso = false){
  const lista = document.getElementById("listaConv")

  if(!silencioso){
    lista.innerHTML = `<div style="text-align:center;padding:30px;color:#94a3b8;">
      <i class="fa-solid fa-spinner fa-spin"></i>
    </div>`
  }

  // 1. Traer conversaciones
  const { data: convs, error } = await supabase
    .from("conversaciones")
    .select("id,usuario1_id,usuario2_id,ultimo_mensaje,ultimo_mensaje_at,no_leidos_u1,no_leidos_u2")
    .or(`usuario1_id.eq.${usuarioActual},usuario2_id.eq.${usuarioActual}`)
    .order("ultimo_mensaje_at", { ascending: false })

  if(error || !convs?.length){
    if(!silencioso){
      lista.innerHTML = `<div style="text-align:center;padding:40px 16px;color:#94a3b8;">
        <i class="fa-solid fa-comments" style="font-size:32px;opacity:.4;display:block;margin-bottom:10px;"></i>
        <p style="font-size:13px;font-weight:600;margin:0;">Sin conversaciones aún</p>
        <p style="font-size:12px;margin:6px 0 0;">Iniciá una desde el perfil de un profesional</p>
      </div>`
    }
    return
  }

  // 2. Recopilar IDs del "otro" usuario en cada conv
  const otrosIds = [...new Set(
    convs.map(c => c.usuario1_id === usuarioActual ? c.usuario2_id : c.usuario1_id)
  )]

  // 3. Traer esos perfiles en una sola query
  const { data: perfiles } = await supabase
    .from("perfiles")
    .select("id,nombre,apellido,nombre_empresa,mostrar_como,foto")
    .in("id", otrosIds)

  const perfilesMap = {}
  perfiles?.forEach(p => { perfilesMap[p.id] = p })

  // 4. Enriquecer convs con el perfil del otro
  const convsEnriq = convs.map(c => ({
    ...c,
    otro: perfilesMap[c.usuario1_id === usuarioActual ? c.usuario2_id : c.usuario1_id] || null
  }))

  _convsCache = convsEnriq
  renderConversaciones(convsEnriq, silencioso)

  // Abrir conversación indicada por URL
  if(abrirConvId){
    const conv = convsEnriq.find(c => c.id === abrirConvId)
    if(conv) abrirConversacion(conv)
    else {
      // conv existe pero no aparece en la lista (puede ser nueva) — buscarla directo
      await abrirConvById(abrirConvId)
    }
  }
}

function renderConversaciones(convs, silencioso){
  const lista = document.getElementById("listaConv")
  const prevScrollTop = lista.scrollTop

  lista.innerHTML = convs.map(conv => {
    const noLeidos = conv.usuario1_id === usuarioActual
      ? (conv.no_leidos_u1 || 0)
      : (conv.no_leidos_u2 || 0)

    const nombre = nombrePerfilCorto(conv.otro)
    const avatar = conv.otro?.foto
      ? `<img src="${conv.otro.foto}" class="conv-avatar" alt="${nombre}">`
      : `<div class="conv-avatar-ph"><i class="fa-solid fa-user"></i></div>`

    const tiempo = conv.ultimo_mensaje_at ? tiempoCorto(conv.ultimo_mensaje_at) : ""
    const preview = escHtml(conv.ultimo_mensaje || "")
    const activa  = convActivaId === conv.id ? " activa" : ""
    const noLeida = noLeidos > 0 ? " no-leida" : ""

    return `<div class="conv-item${activa}${noLeida}" onclick="window._abrirConv('${conv.id}')">
      ${avatar}
      <div style="flex:1;min-width:0;">
        <div class="conv-nombre">${nombre}</div>
        <div class="conv-preview">${preview}</div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;">
        <span class="conv-tiempo">${tiempo}</span>
        ${noLeidos > 0 ? `<span class="conv-badge">${noLeidos > 9 ? "9+" : noLeidos}</span>` : ""}
      </div>
    </div>`
  }).join("")

  if(silencioso) lista.scrollTop = prevScrollTop
}

/* ══════════════════════════════════════
   ABRIR CONVERSACIÓN
══════════════════════════════════════ */
window._abrirConv = function(convId){
  const conv = _convsCache.find(c => c.id === convId)
  if(conv) abrirConversacion(conv)
  else abrirConvById(convId)
}

async function abrirConvById(convId){
  const { data: conv } = await supabase
    .from("conversaciones")
    .select("id,usuario1_id,usuario2_id,no_leidos_u1,no_leidos_u2")
    .eq("id", convId)
    .single()
  if(!conv) return

  const otroId = conv.usuario1_id === usuarioActual ? conv.usuario2_id : conv.usuario1_id
  const { data: perfil } = await supabase
    .from("perfiles")
    .select("id,nombre,apellido,nombre_empresa,mostrar_como,foto")
    .eq("id", otroId)
    .single()

  abrirConversacion({ ...conv, otro: perfil || null })
}

async function abrirConversacion(conv){
  convActivaId  = conv.id
  const esU1    = conv.usuario1_id === usuarioActual
  const otro    = conv.otro
  otroUsuarioId = otro?.id || (esU1 ? conv.usuario2_id : conv.usuario1_id)

  const nombre = nombrePerfilCorto(otro)
  const avatar = otro?.foto
    ? `<img src="${otro.foto}" class="conv-avatar" alt="${nombre}">`
    : `<div class="conv-avatar-ph"><i class="fa-solid fa-user"></i></div>`

  const panel = document.getElementById("chatPanel")
  panel.innerHTML = `
    <div class="chat-header">
      ${avatar}
      <div>
        <div style="font-weight:700;font-size:15px;color:#1e293b;">${nombre}</div>
        <a href="/perfil_publico.html?id=${otroUsuarioId}" style="font-size:12px;color:#2563eb;">Ver perfil</a>
      </div>
    </div>
    <div class="chat-mensajes" id="chatMensajes">
      <div style="text-align:center;padding:20px;color:#94a3b8;"><i class="fa-solid fa-spinner fa-spin"></i></div>
    </div>
    <div class="chat-input">
      <textarea id="txtMensaje" placeholder="Escribí tu mensaje..." rows="1"
        onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();window._enviarMensaje()}"
        oninput="this.style.height='auto';this.style.height=Math.min(this.scrollHeight,100)+'px'"></textarea>
      <button onclick="window._enviarMensaje()"
        style="background:#2563eb;color:white;border:none;border-radius:10px;padding:10px 14px;cursor:pointer;font-size:16px;align-self:flex-end;">
        <i class="fa-solid fa-paper-plane"></i>
      </button>
    </div>`

  // Resaltar activa
  document.querySelectorAll(".conv-item").forEach(el => {
    el.classList.toggle("activa", el.getAttribute("onclick")?.includes(conv.id))
  })

  await cargarMensajes()
  await marcarLeidos(conv.id, esU1)
}

/* ══════════════════════════════════════
   MENSAJES
══════════════════════════════════════ */
async function cargarMensajes(){
  if(!convActivaId) return
  const { data: msgs } = await supabase
    .from("mensajes")
    .select("id,emisor_id,texto,created_at")
    .eq("conversacion_id", convActivaId)
    .order("created_at", { ascending: true })
    .limit(100)
  renderMensajes(msgs || [])
}

function renderMensajes(msgs){
  const contenedor = document.getElementById("chatMensajes")
  if(!contenedor) return

  if(!msgs.length){
    contenedor.innerHTML = `<div style="text-align:center;padding:40px 16px;color:#94a3b8;font-size:13px;">
      <i class="fa-solid fa-comment-dots" style="font-size:28px;opacity:.4;display:block;margin-bottom:8px;"></i>
      Iniciá la conversación enviando un mensaje
    </div>`
    return
  }

  contenedor.innerHTML = msgs.map(m => {
    const propio = m.emisor_id === usuarioActual
    return `<div class="msg-burbuja ${propio ? "msg-propio" : "msg-otro"}">
      ${escHtml(m.texto)}
      <div class="msg-tiempo">${tiempoHora(m.created_at)}</div>
    </div>`
  }).join("")

  contenedor.scrollTop = contenedor.scrollHeight
}

async function pollarMensajes(){
  if(!convActivaId) return
  const { data: msgs } = await supabase
    .from("mensajes")
    .select("id,emisor_id,texto,created_at")
    .eq("conversacion_id", convActivaId)
    .order("created_at", { ascending: true })
    .limit(100)
  if(msgs) renderMensajes(msgs)
}

window._enviarMensaje = async function(){
  const txt = document.getElementById("txtMensaje")
  if(!txt) return
  const texto = txt.value.trim()
  if(!texto) return

  txt.value = ""
  txt.style.height = "auto"

  const { error } = await supabase.from("mensajes").insert({
    conversacion_id: convActivaId,
    emisor_id: usuarioActual,
    texto
  })
  if(error){ console.error("Error al enviar:", error); return }

  // Actualizar último mensaje
  await supabase.from("conversaciones")
    .update({ ultimo_mensaje: texto.substring(0,80), ultimo_mensaje_at: new Date().toISOString() })
    .eq("id", convActivaId)

  // Incrementar no_leidos del otro
  const { data: cd } = await supabase
    .from("conversaciones")
    .select("usuario1_id,no_leidos_u1,no_leidos_u2")
    .eq("id", convActivaId)
    .single()
  if(cd){
    const esU1  = cd.usuario1_id === usuarioActual
    const campo = esU1 ? "no_leidos_u2" : "no_leidos_u1"
    const actual = esU1 ? (cd.no_leidos_u2||0) : (cd.no_leidos_u1||0)
    await supabase.from("conversaciones").update({ [campo]: actual+1 }).eq("id", convActivaId)
  }

  // Notificación al receptor
  supabase.from("notificaciones").insert({
    usuario_id: otroUsuarioId,
    tipo: "mensaje",
    titulo: "Nuevo mensaje",
    cuerpo: texto.substring(0,80),
    url: `/mensajes.html?conv=${convActivaId}`
  }).catch(()=>{})

  await cargarMensajes()
  cargarConversaciones(null, true)
}

async function marcarLeidos(convId, esU1){
  const campo = esU1 ? "no_leidos_u1" : "no_leidos_u2"
  await supabase.from("conversaciones").update({ [campo]: 0 }).eq("id", convId)
  cargarConversaciones(null, true)
}

/* ══════════════════════════════════════
   HELPERS
══════════════════════════════════════ */
function nombrePerfilCorto(p){
  if(!p) return "Usuario"
  if(p.mostrar_como === "empresa" && p.nombre_empresa) return p.nombre_empresa
  return `${p.nombre||""} ${p.apellido||""}`.trim() || "Usuario"
}

function tiempoCorto(iso){
  const d = (Date.now() - new Date(iso).getTime()) / 1000
  if(d < 60)    return "ahora"
  if(d < 3600)  return `${Math.floor(d/60)}m`
  if(d < 86400) return `${Math.floor(d/3600)}h`
  const f = new Date(iso)
  return `${f.getDate()}/${f.getMonth()+1}`
}

function tiempoHora(iso){
  return new Date(iso).toLocaleTimeString("es-AR", { hour:"2-digit", minute:"2-digit" })
}

function escHtml(str){
  return String(str)
    .replace(/&/g,"&amp;")
    .replace(/</g,"&lt;")
    .replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;")
    .replace(/\n/g,"<br>")
}

init()
