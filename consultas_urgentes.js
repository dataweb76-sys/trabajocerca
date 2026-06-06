/* consultas_urgentes.js */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const SB_URL = "https://iqeiszkoifxgygoqvbem.supabase.co"
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxZWlzemtvaWZ4Z3lnb3F2YmVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyMTEzODIsImV4cCI6MjA5NDc4NzM4Mn0.qxt70TPbARPcMc8HhHx2A2QnfBvJLCrnrH4m36IcENs"
const supabase = createClient(SB_URL, SB_KEY)

const params   = new URLSearchParams(location.search)
const CAT      = (params.get("categoria") || "").trim()
const tiposLabel = { oficio:"Oficio", profesion:"Profesión", emprendimiento:"Emprendimiento" }

let _consulta_activa = null   // para modal ayudar
let _user            = null

/* ── AUTH ── */
async function initAuth(){
  const { data } = await supabase.auth.getSession()
  _user = data.session?.user || null
  if(_user && document.getElementById("ayNombre")){
    const { data: p } = await supabase.from("perfiles").select("nombre,apellido").eq("id",_user.id).maybeSingle()
    if(p) document.getElementById("ayNombre").value = `${p.nombre||""} ${p.apellido||""}`.trim()
  }
}

/* ── INIT ── */
async function init(){
  await initAuth()

  // Personalizar hero
  if(CAT){
    document.getElementById("heroCatBadge").style.display = "inline-flex"
    document.getElementById("heroCatNombre").textContent  = CAT
    document.getElementById("heroTitulo").textContent = `No encontramos ${CAT} cerca tuyo`
    document.getElementById("heroDesc").textContent   = `Dejá tu consulta urgente y la comunidad te ayuda a encontrar un ${CAT} rápidamente.`
    document.getElementById("btnNuevaConsulta").innerHTML =
      `<i class="fa-solid fa-bolt"></i> Necesito con urgencia un ${CAT}`
    // Pre-llenar el campo categoría del form
    document.getElementById("crCategoria").value = CAT
  }

  document.getElementById("btnNuevaConsulta").onclick = () => abrirModal("modalCrear")

  await cargarConsultas()
}

/* ── CARGAR CONSULTAS ── */
function tiempoRestante(createdAt){
  const expira = new Date(new Date(createdAt).getTime() + 48*3600*1000)
  const diff   = expira - Date.now()
  if(diff <= 0) return { label:"Expirada", color:"#94a3b8", urgente:false }
  const h = Math.floor(diff/3600000)
  const m = Math.floor((diff%3600000)/60000)
  if(h < 6)  return { label:`⚠️ Vence en ${h}h ${m}m`, color:"#dc2626", urgente:true }
  if(h < 24) return { label:`⏱ Vence en ${h}h`, color:"#f59e0b", urgente:false }
  return { label:`⏱ Vence en ${h}h`, color:"#64748b", urgente:false }
}

async function cargarConsultas(){
  const cont = document.getElementById("listaConsultas")
  const hace48h = new Date(Date.now() - 48*3600*1000).toISOString()

  let q = supabase
    .from("consultas_urgentes")
    .select("*, ayudas_consulta(count)")
    .eq("activo", true)
    .gt("created_at", hace48h)
    .order("created_at", { ascending: false })
    .limit(50)

  if(CAT) q = q.ilike("categoria", `%${CAT}%`)

  const { data, error } = await q

  if(error || !data?.length){
    cont.innerHTML = `
      <div style="text-align:center;padding:30px 20px;color:#94a3b8;">
        <i class="fa-solid fa-circle-check" style="font-size:40px;color:#16a34a;opacity:.5;display:block;margin-bottom:12px;"></i>
        <p style="font-size:15px;margin:0 0 6px;color:#475569;">Todavía no hay consultas${CAT ? ` para <strong>${CAT}</strong>` : ""}.</p>
        <p style="font-size:13px;margin:0;">¡Sé el primero en publicar lo que necesitás!</p>
      </div>`
    return
  }

  cont.innerHTML = `
    <p style="color:#64748b;font-size:13px;margin:0 0 14px;">
      <strong>${data.length}</strong> consulta${data.length!==1?"s":""} activa${data.length!==1?"s":""}
      ${CAT ? ` · categoría: <strong>${CAT}</strong>` : ""}
    </p>`

  data.forEach(c => {
    const ayudasCount = c.ayudas_consulta?.[0]?.count || 0
    const fechaStr    = new Date(c.created_at).toLocaleDateString("es-AR",{day:"2-digit",month:"short"})
    const tipoLabel   = tiposLabel[c.tipo] || c.tipo || ""
    const { label: tiempoLabel, color: tiempoColor } = tiempoRestante(c.created_at)
    const esOwner     = c.usuario_id === _user?.id

    const card = document.createElement("div")
    card.className = "cu-card"
    card.id = `cu-card-${c.id}`
    card.innerHTML = `
      <div class="cu-card-header">
        <div class="cu-avatar"><i class="fa-solid fa-user"></i></div>
        <div style="flex:1;min-width:0;">
          <p class="cu-nombre">${c.nombre || "Anónimo"}</p>
          <p class="cu-meta">${fechaStr}${tipoLabel ? ` · ${tipoLabel}` : ""}</p>
        </div>
        ${ayudasCount > 0 ? `<span class="cu-ayudas-count"><i class="fa-solid fa-hands-helping"></i> ${ayudasCount} ${ayudasCount===1?"ayuda":"ayudas"}</span>` : ""}
      </div>
      <div class="cu-categoria-tag">
        <i class="fa-solid fa-magnifying-glass"></i>
        Busca: <strong>${c.categoria || "N/E"}</strong>
      </div>
      <div class="cu-necesita">${c.necesita || "Sin descripción."}</div>
      <p class="cu-location"><i class="fa-solid fa-location-dot"></i> ${[c.ciudad, c.provincia].filter(Boolean).join(", ") || "Sin ubicación"}</p>
      <p style="margin:4px 0 10px;font-size:11px;font-weight:700;color:${tiempoColor};">${tiempoLabel}</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        ${esOwner ? `
          <a href="/perfil.html#mis-consultas"
            style="display:inline-flex;align-items:center;gap:7px;background:linear-gradient(135deg,#1d4ed8,#1e40af);color:white;padding:9px 16px;border-radius:10px;font-size:13px;font-weight:700;text-decoration:none;">
            <i class="fa-solid fa-lightbulb"></i>
            ${ayudasCount > 0 ? `Ver ${ayudasCount} solución${ayudasCount!==1?"es":""}` : "Ver soluciones"}
          </a>
          <button onclick="marcarResuelta('${c.id}','${(c.categoria||"").replace(/'/g,"\\'")}',this)"
            style="display:inline-flex;align-items:center;gap:6px;background:#f0fdf4;color:#16a34a;border:1.5px solid #bbf7d0;padding:9px 14px;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;">
            <i class="fa-solid fa-circle-check"></i> Ya lo encontré
          </button>` : `
          <button class="btn-ayudar" onclick="abrirAyudar(${JSON.stringify(c).replace(/"/g,"&quot;")})">
            <i class="fa-solid fa-hands-helping"></i> Ayudar a encontrar
          </button>`}
        <button class="btn-compartir-cu" onclick="compartirConsultaDirecta(${JSON.stringify(c).replace(/"/g,"&quot;")})">
          <i class="fa-solid fa-share-nodes"></i> Compartir
        </button>
      </div>
    `
    cont.appendChild(card)
  })
}

/* ── ABRIR / CERRAR MODALES ── */
window.abrirModal = function(id){
  document.getElementById(id).classList.add("abierto")
  document.body.style.overflow = "hidden"
}
window.cerrarModal = function(id){
  document.getElementById(id).classList.remove("abierto")
  document.body.style.overflow = ""
}
// Cerrar al click fuera
document.querySelectorAll(".cu-overlay").forEach(o => {
  o.addEventListener("click", e => { if(e.target === o) cerrarModal(o.id) })
})

/* ── CREAR CONSULTA ── */
window.enviarConsulta = async function(){
  const msg = document.getElementById("msgCrear")
  const nombre   = document.getElementById("crNombre").value.trim()
  const telefono = document.getElementById("crTelefono").value.trim()
  const tipo     = document.getElementById("crTipo").value
  const categoria= document.getElementById("crCategoria").value.trim()
  const provincia= document.getElementById("crProvincia").value.trim()
  const ciudad   = document.getElementById("crCiudad").value.trim()
  const necesita = document.getElementById("crNecesita").value.trim()

  if(!nombre || !telefono || !tipo || !categoria || !provincia || !ciudad || !necesita){
    msg.innerHTML = `<div class="alerta alerta-err" style="font-size:13px;padding:8px;">Completá todos los campos obligatorios.</div>`
    return
  }

  msg.innerHTML = `<div style="font-size:13px;color:#64748b;"><i class="fa-solid fa-spinner fa-spin"></i> Enviando...</div>`

  const payload = {
    nombre, telefono, tipo, categoria, provincia, ciudad, necesita,
    activo: true,
    usuario_id: _user?.id || null
  }

  const { error } = await supabase.from("consultas_urgentes").insert(payload)
  if(error){
    msg.innerHTML = `<div class="alerta alerta-err" style="font-size:13px;padding:8px;">${error.message}</div>`
    return
  }

  cerrarModal("modalCrear")
  // Limpiar form
  ;["crNombre","crTelefono","crCategoria","crProvincia","crCiudad","crNecesita"].forEach(id => {
    document.getElementById(id).value = ""
  })
  document.getElementById("crTipo").value = ""

  // Recargar lista
  document.getElementById("listaConsultas").innerHTML = `<div style="text-align:center;padding:30px;color:#94a3b8;"><i class="fa-solid fa-spinner fa-spin" style="font-size:24px;"></i></div>`
  await cargarConsultas()

  // Modal de éxito con mensaje personalizado
  mostrarModalExito(categoria)
}

/* ── ABRIR MODAL AYUDAR ── */
window.abrirAyudar = function(consulta){
  _consulta_activa = consulta
  document.getElementById("ayudarInfoConsulta").innerHTML =
    `<strong>${consulta.nombre}</strong> busca un <strong>${consulta.categoria}</strong>
     en <strong>${consulta.ciudad || consulta.provincia || "su zona"}</strong>.
     <br><span style="font-style:italic;">"${(consulta.necesita||"").substring(0,100)}${consulta.necesita?.length>100?"...":""}"</span>`
  document.getElementById("msgAyudar").innerHTML = ""
  document.getElementById("ayContacto").value = ""
  document.getElementById("ayComentario").value = ""
  abrirModal("modalAyudar")
}

/* ── ENVIAR AYUDA ── */
window.enviarAyuda = async function(){
  const msg = document.getElementById("msgAyudar")
  if(!_consulta_activa) return

  const nombre   = document.getElementById("ayNombre").value.trim()
  const contacto = document.getElementById("ayContacto").value.trim().replace(/\D/g,"")
  const coment   = document.getElementById("ayComentario").value.trim()

  if(!contacto){
    msg.innerHTML = `<div class="alerta alerta-err" style="font-size:13px;padding:8px;">Ingresá el número de WhatsApp de quien puede ayudar.</div>`
    return
  }
  if(!nombre){
    msg.innerHTML = `<div class="alerta alerta-err" style="font-size:13px;padding:8px;">Ingresá tu nombre.</div>`
    return
  }

  msg.innerHTML = `<div style="font-size:13px;color:#64748b;"><i class="fa-solid fa-spinner fa-spin"></i> Enviando...</div>`

  const { error } = await supabase.from("ayudas_consulta").insert({
    consulta_id:    _consulta_activa.id,
    ayudante_id:    _user?.id || null,
    ayudante_nombre: nombre,
    comentario:     coment,
    contacto_numero: contacto
  })

  if(error){
    msg.innerHTML = `<div class="alerta alerta-err" style="font-size:13px;padding:8px;">${error.message}</div>`
    return
  }

  // Notificar al solicitante (fire and forget — no await para no bloquear)
  if(_consulta_activa.usuario_id){
    supabase.from("notificaciones").insert({
      usuario_id: _consulta_activa.usuario_id,
      tipo:       "ayuda_consulta",
      titulo:     `💡 ${nombre} te ayudó a encontrar un ${_consulta_activa.categoria}`,
      cuerpo:     `Te dejó el número ${contacto} para que lo contactes por WhatsApp. Entrá a tu perfil para verlo.`,
      url:        `/perfil.html#mis-consultas`
    }).then(()=>{}).catch(()=>{})
  }

  cerrarModal("modalAyudar")
  mostrarToast("🙌 ¡Gracias! Tu ayuda fue enviada al solicitante.")

  // Actualizar contador en la card
  const card = document.getElementById(`cu-card-${_consulta_activa.id}`)
  if(card){
    const countEl = card.querySelector(".cu-ayudas-count")
    if(countEl){
      const prev = parseInt(countEl.textContent) || 0
      const n = prev + 1
      countEl.innerHTML = `<i class="fa-solid fa-hands-helping"></i> ${n} ${n===1?"ayuda":"ayudas"}`
    } else {
      const header = card.querySelector(".cu-card-header")
      const badge = document.createElement("span")
      badge.className = "cu-ayudas-count"
      badge.innerHTML = `<i class="fa-solid fa-hands-helping"></i> 1 ayuda`
      header.appendChild(badge)
    }
  }
}

/* ── MARCAR COMO RESUELTA ── */
window.marcarResuelta = async function(id, categoria, btn){
  if(!_user) return
  btn.disabled = true
  btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Guardando...`

  const { error } = await supabase
    .from("consultas_urgentes")
    .update({ activo: false })
    .eq("id", id)
    .eq("usuario_id", _user.id)

  if(error){
    btn.disabled = false
    btn.innerHTML = `<i class="fa-solid fa-circle-check"></i> Ya lo encontré`
    mostrarToast("❌ No se pudo guardar. Intentá de nuevo.")
    return
  }

  // Quitar card con animación
  const card = document.getElementById(`cu-card-${id}`)
  if(card){
    card.style.transition = "opacity .4s,transform .4s"
    card.style.opacity = "0"
    card.style.transform = "scale(.95)"
    setTimeout(() => card.remove(), 420)
  }

  // Modal de cierre feliz
  mostrarModalResuelto(categoria)
}

function mostrarModalResuelto(categoria){
  const overlay = document.createElement("div")
  overlay.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9999;
    display:flex;align-items:center;justify-content:center;padding:16px;animation:fadeIn .2s ease;`
  overlay.innerHTML = `
    <div style="background:white;border-radius:24px;max-width:400px;width:100%;padding:32px 28px 24px;
                text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.25);animation:scaleIn .25s ease;">
      <div style="font-size:52px;margin-bottom:12px;">🎉</div>
      <h2 style="margin:0 0 10px;font-size:20px;color:#16a34a;">¡Qué buena noticia!</h2>
      <p style="margin:0 0 20px;font-size:14px;color:#475569;line-height:1.65;">
        Nos alegramos de que hayas encontrado tu <strong>${categoria || "profesional"}</strong>.
        <br><br>
        Tu consulta fue archivada. Si en algún momento necesitás algo de nuevo,
        podés crear una nueva consulta urgente cuando quieras.
        <br><br>
        <span style="color:#1e293b;font-weight:700;">— Trabajos Cerca 💪</span>
      </p>
      <button onclick="this.closest('div').parentElement.remove()"
        style="background:linear-gradient(135deg,#16a34a,#15803d);color:white;border:none;
               padding:12px 32px;border-radius:12px;font-size:15px;font-weight:700;
               cursor:pointer;font-family:inherit;width:100%;">
        ¡Gracias!
      </button>
    </div>`
  overlay.addEventListener("click", e => { if(e.target===overlay) overlay.remove() })
  document.body.appendChild(overlay)
}

/* ── COMPARTIR CONSULTA ── */
window.compartirConsulta = function(){
  if(!_consulta_activa) return
  compartirConsultaDirecta(_consulta_activa)
}

window.compartirConsultaDirecta = function(c){
  const texto = `🚨 Se necesita urgente un ${c.categoria} en ${c.ciudad || c.provincia || "la zona"}.\n¿Conocés a alguien? Ayudalo en trabajoscerca.com.ar 👉 ${location.origin}/consultas_urgentes.html?categoria=${encodeURIComponent(c.categoria)}`

  if(navigator.share){
    navigator.share({ title: `Se busca ${c.categoria} urgente`, text: texto, url: `${location.origin}/consultas_urgentes.html?categoria=${encodeURIComponent(c.categoria)}` }).catch(()=>{})
  } else {
    const waUrl  = `https://wa.me/?text=${encodeURIComponent(texto)}`
    const igText = encodeURIComponent(texto)
    // Mostrar opciones
    const d = document.createElement("div")
    d.style.cssText = "position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:white;border-radius:16px;padding:16px 20px;box-shadow:0 8px 30px rgba(0,0,0,.2);z-index:9999;display:flex;gap:12px;align-items:center;"
    d.innerHTML = `
      <a href="${waUrl}" target="_blank" style="display:inline-flex;align-items:center;gap:6px;background:#25D366;color:white;padding:9px 16px;border-radius:10px;font-weight:700;font-size:13px;text-decoration:none;">
        <i class="fa-brands fa-whatsapp"></i> WhatsApp
      </a>
      <button onclick="navigator.clipboard.writeText(${JSON.stringify(texto)});this.textContent='✅ Copiado';setTimeout(()=>this.closest('div').remove(),1200)"
        style="background:#f1f5f9;border:none;padding:9px 16px;border-radius:10px;font-weight:700;font-size:13px;cursor:pointer;font-family:inherit;">
        📋 Copiar texto
      </button>
      <button onclick="this.closest('div').remove()" style="background:none;border:none;font-size:20px;cursor:pointer;color:#94a3b8;">×</button>`
    document.body.appendChild(d)
    setTimeout(() => d.remove(), 8000)
  }
}

/* ── MODAL ÉXITO CONSULTA CREADA ── */
function mostrarModalExito(categoria){
  // Quitar si ya existe
  document.getElementById("modalExitoConsulta")?.remove()

  const overlay = document.createElement("div")
  overlay.id = "modalExitoConsulta"
  overlay.style.cssText = `
    position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9999;
    display:flex;align-items:center;justify-content:center;padding:16px;
    animation:fadeIn .2s ease;
  `
  overlay.innerHTML = `
    <div style="background:white;border-radius:24px;max-width:420px;width:100%;
                padding:32px 28px 24px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.25);
                animation:scaleIn .25s ease;">
      <div style="width:64px;height:64px;background:linear-gradient(135deg,#16a34a,#15803d);
                  border-radius:50%;display:flex;align-items:center;justify-content:center;
                  margin:0 auto 18px;font-size:28px;">✅</div>
      <h2 style="margin:0 0 10px;font-size:20px;color:#1e293b;">¡Consulta publicada!</h2>
      <p style="margin:0 0 16px;font-size:14px;color:#475569;line-height:1.65;">
        Tu búsqueda de <strong style="color:#dc2626;">${categoria || "este servicio"}</strong> ya es visible para toda la comunidad.
        <br><br>
        Si alguien conoce a alguien o si un profesional se registra en tu zona con ese oficio,
        <strong>te va a aparecer la solución en tu perfil</strong>, en el botón
        <span style="background:#fff1f2;color:#dc2626;border-radius:6px;padding:1px 7px;font-weight:700;">⚡ Urgentes</span>.
        <br><br>
        <span style="font-style:italic;color:#64748b;">Esperamos que encuentres la ayuda que necesitás. ¡Mucha suerte!</span>
        <br><br>
        <span style="color:#1e293b;font-weight:700;">— Trabajos Cerca, siempre para servir 💪</span>
      </p>
      <button onclick="document.getElementById('modalExitoConsulta').remove()"
        style="background:linear-gradient(135deg,#2563eb,#1d4ed8);color:white;border:none;
               padding:12px 32px;border-radius:12px;font-size:15px;font-weight:700;
               cursor:pointer;font-family:inherit;width:100%;transition:opacity .15s;"
        onmouseover="this.style.opacity='.88'" onmouseout="this.style.opacity='1'">
        ¡Entendido, gracias!
      </button>
    </div>
    <style>
      @keyframes scaleIn { from{transform:scale(.9);opacity:0} to{transform:scale(1);opacity:1} }
      @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
    </style>
  `
  // Cerrar al click fuera
  overlay.addEventListener("click", e => { if(e.target === overlay) overlay.remove() })
  document.body.appendChild(overlay)
}

/* ── TOAST ── */
function mostrarToast(texto){
  const t = document.createElement("div")
  t.style.cssText = "position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#1e293b;color:white;padding:12px 22px;border-radius:30px;font-size:14px;font-weight:600;z-index:9999;box-shadow:0 4px 20px rgba(0,0,0,.25);animation:fadeIn .2s ease;"
  t.textContent = texto
  document.body.appendChild(t)
  setTimeout(() => t.remove(), 3500)
}

// ── START ──
init()
