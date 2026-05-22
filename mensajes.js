import { supabase } from "./supabase.js"

let usuarioActual = null
let convActivaId   = null
let otroUsuarioId  = null
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

  // ¿viene con ?conv=ID en la URL? (redirigido desde perfil)
  const params = new URLSearchParams(location.search)
  const convParam = params.get("conv")

  await cargarConversaciones(convParam)

  // Actualizar cada 8 segundos
  pollingTimer = setInterval(() => {
    cargarConversaciones(null, true)
    if(convActivaId) pollarMensajes()
  }, 8000)
}

/* ══════════════════════════════════════
   CONVERSACIONES
══════════════════════════════════════ */
async function cargarConversaciones(abrirConvId = null, silencioso = false){
  const lista = document.getElementById("listaConv")

  if(!silencioso){
    lista.innerHTML = `<div style="text-align:center;padding:30px;color:#94a3b8;">
      <i class="fa-solid fa-spinner fa-spin"></i>
    </div>`
  }

  const { data: convs, error } = await supabase
    .from("conversaciones")
    .select(`
      id,
      usuario1_id,
      usuario2_id,
      ultimo_mensaje,
      ultimo_mensaje_at,
      no_leidos_u1,
      no_leidos_u2,
      perfiles_u1:perfiles!conversaciones_usuario1_id_fkey(id,nombre,apellido,nombre_empresa,mostrar_como,foto),
      perfiles_u2:perfiles!conversaciones_usuario2_id_fkey(id,nombre,apellido,nombre_empresa,mostrar_como,foto)
    `)
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

  renderConversaciones(convs, silencioso)

  // Abrir conversación indicada por URL
  if(abrirConvId){
    const conv = convs.find(c => c.id === abrirConvId)
    if(conv) abrirConversacion(conv)
  }
}

function renderConversaciones(convs, silencioso){
  const lista = document.getElementById("listaConv")
  const prevScrollTop = lista.scrollTop

  lista.innerHTML = convs.map(conv => {
    const esU1 = conv.usuario1_id === usuarioActual
    const otro = esU1 ? conv.perfiles_u2 : conv.perfiles_u1
    const noLeidos = esU1 ? (conv.no_leidos_u1 || 0) : (conv.no_leidos_u2 || 0)

    const nombre = nombrePerfilCorto(otro)
    const avatar = otro?.foto
      ? `<img src="${otro.foto}" class="conv-avatar" alt="${nombre}">`
      : `<div class="conv-avatar-ph"><i class="fa-solid fa-user"></i></div>`

    const tiempo = conv.ultimo_mensaje_at ? tiempoCorto(conv.ultimo_mensaje_at) : ""
    const preview = escHtml(conv.ultimo_mensaje || "")

    const activa = convActivaId === conv.id ? " activa" : ""
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
window._abrirConv = async function(convId){
  // Buscar datos de la conversación
  const { data: conv } = await supabase
    .from("conversaciones")
    .select(`
      id, usuario1_id, usuario2_id,
      perfiles_u1:perfiles!conversaciones_usuario1_id_fkey(id,nombre,apellido,nombre_empresa,mostrar_como,foto),
      perfiles_u2:perfiles!conversaciones_usuario2_id_fkey(id,nombre,apellido,nombre_empresa,mostrar_como,foto)
    `)
    .eq("id", convId)
    .single()

  if(!conv) return
  abrirConversacion(conv)
}

async function abrirConversacion(conv){
  convActivaId = conv.id
  const esU1 = conv.usuario1_id === usuarioActual
  const otro = esU1 ? conv.perfiles_u2 : conv.perfiles_u1
  otroUsuarioId = otro?.id

  const nombre = nombrePerfilCorto(otro)
  const avatar = otro?.foto
    ? `<img src="${otro.foto}" class="conv-avatar" alt="${nombre}">`
    : `<div class="conv-avatar-ph"><i class="fa-solid fa-user"></i></div>`

  // Construir panel de chat
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
    </div>
  `

  // Resaltar conversación activa en la lista
  document.querySelectorAll(".conv-item").forEach(el => el.classList.remove("activa"))
  document.querySelectorAll(".conv-item").forEach(el => {
    if(el.getAttribute("onclick")?.includes(conv.id)) el.classList.add("activa")
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

  // Scroll al fondo
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

  if(!msgs) return
  renderMensajes(msgs)

  // Marcar como leídos los nuevos
  const { data: conv } = await supabase
    .from("conversaciones")
    .select("usuario1_id,no_leidos_u1,no_leidos_u2")
    .eq("id", convActivaId)
    .single()

  if(conv){
    const esU1 = conv.usuario1_id === usuarioActual
    await marcarLeidos(convActivaId, esU1)
  }
}

window._enviarMensaje = async function(){
  const txt = document.getElementById("txtMensaje")
  if(!txt) return
  const texto = txt.value.trim()
  if(!texto) return

  txt.value = ""
  txt.style.height = "auto"

  // Insertar mensaje
  const { error } = await supabase.from("mensajes").insert({
    conversacion_id: convActivaId,
    emisor_id: usuarioActual,
    texto
  })

  if(error){ console.error("Error al enviar:", error); return }

  // Actualizar último mensaje en la conversación
  await supabase.from("conversaciones")
    .update({
      ultimo_mensaje: texto.substring(0, 80),
      ultimo_mensaje_at: new Date().toISOString()
    })
    .eq("id", convActivaId)

  // Incrementar no_leidos del otro usuario
  const { data: convData } = await supabase
    .from("conversaciones")
    .select("usuario1_id,no_leidos_u1,no_leidos_u2")
    .eq("id", convActivaId)
    .single()

  if(convData){
    const esU1 = convData.usuario1_id === usuarioActual
    const campo = esU1 ? "no_leidos_u2" : "no_leidos_u1"
    const actual = esU1 ? (convData.no_leidos_u2 || 0) : (convData.no_leidos_u1 || 0)
    await supabase.from("conversaciones")
      .update({ [campo]: actual + 1 })
      .eq("id", convActivaId)
  }

  // Notificación al receptor
  supabase.from("notificaciones").insert({
    usuario_id: otroUsuarioId,
    tipo: "mensaje",
    titulo: "Nuevo mensaje",
    cuerpo: texto.substring(0, 80),
    url: `/mensajes.html?conv=${convActivaId}`
  }).catch(()=>{})

  // Recargar mensajes
  await cargarMensajes()
  cargarConversaciones(null, true)
}

async function marcarLeidos(convId, esU1){
  const campo = esU1 ? "no_leidos_u1" : "no_leidos_u2"
  await supabase.from("conversaciones")
    .update({ [campo]: 0 })
    .eq("id", convId)

  // Refrescar lista sin scroll
  cargarConversaciones(null, true)
}

/* ══════════════════════════════════════
   INICIAR CONVERSACIÓN (desde perfil / buscador)
   Llama: window.iniciarConversacion(profesionalId)
══════════════════════════════════════ */
window.iniciarConversacion = async function(profesionalId){
  const { data: authData } = await supabase.auth.getUser()
  if(!authData?.user){
    window.location.href = "/login.html"
    return
  }
  const uid = authData.user.id

  if(uid === profesionalId){
    alert("No podés enviarte un mensaje a vos mismo.")
    return
  }

  // Buscar conversación existente
  const { data: existente } = await supabase
    .from("conversaciones")
    .select("id")
    .or(
      `and(usuario1_id.eq.${uid},usuario2_id.eq.${profesionalId}),and(usuario1_id.eq.${profesionalId},usuario2_id.eq.${uid})`
    )
    .maybeSingle()

  if(existente){
    window.location.href = `/mensajes.html?conv=${existente.id}`
    return
  }

  // Crear nueva conversación
  const { data: nueva, error } = await supabase
    .from("conversaciones")
    .insert({
      usuario1_id: uid,
      usuario2_id: profesionalId,
      ultimo_mensaje: "",
      ultimo_mensaje_at: new Date().toISOString(),
      no_leidos_u1: 0,
      no_leidos_u2: 0
    })
    .select("id")
    .single()

  if(error || !nueva){ console.error("Error creando conv:", error); return }

  window.location.href = `/mensajes.html?conv=${nueva.id}`
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
  const fecha = new Date(iso)
  return `${fecha.getDate()}/${fecha.getMonth()+1}`
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
