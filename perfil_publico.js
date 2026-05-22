import { supabase } from "./supabase.js"

let estrellaSeleccionada = 0

async function cargarPerfil(){
  const params = new URLSearchParams(location.search)
  const id = params.get("id")
  if(!id){
    document.getElementById("contenido").innerHTML = `
      <div style="text-align:center;padding:60px 20px;">
        <i class="fa-solid fa-circle-exclamation" style="font-size:44px;color:#f97316;display:block;margin-bottom:14px;"></i>
        <p style="font-size:16px;color:#475569;margin-bottom:16px;">No se especificó ningún perfil.</p>
        <a href="/buscador_oficios.html" class="btn btn-primary">Ir al buscador</a>
      </div>`
    return
  }
  try {

  const { data: authData } = await supabase.auth.getUser()
  const usuarioActual = authData.user?.id || null

  const [
    { data: perfil },
    { data: servicio },
    { data: reviews },
    { data: fotos }
  ] = await Promise.all([
    supabase.from("perfiles").select("*").eq("id", id).single(),
    supabase.from("servicios").select("*").eq("usuario_id", id).single(),
    supabase.from("reviews").select("*").eq("trabajador_id", id).eq("tipo","servicio").order("created_at", { ascending: false }),
    supabase.from("portfolio").select("*").eq("usuario_id", id)
  ])

  if(!perfil){ document.getElementById("contenido").innerHTML = '<div class="alerta alerta-err">Perfil no encontrado.</div>'; return }

  // Nombre a mostrar según preferencia del usuario
  const displayNombre = (perfil.mostrar_como === "empresa" && perfil.nombre_empresa)
    ? perfil.nombre_empresa
    : `${perfil.nombre||""} ${perfil.apellido||""}`.trim()

  document.title = `${displayNombre} — Trabajos Cerca`

  const foto = perfil.foto
    ? `<img src="${perfil.foto}" style="width:100px;height:100px;border-radius:50%;object-fit:cover;border:3px solid #2563eb;margin-bottom:12px;">`
    : `<div style="width:100px;height:100px;border-radius:50%;background:#dbeafe;display:flex;align-items:center;justify-content:center;font-size:40px;color:#2563eb;margin:0 auto 12px;"><i class="fa-solid fa-user"></i></div>`

  const promedio = reviews?.length
    ? (reviews.reduce((a,r) => a+r.rating, 0) / reviews.length).toFixed(1) : null

  const ratingHtml = promedio
    ? `<p class="estrellas" style="margin:4px 0;">★ ${promedio} <span style="color:#64748b;font-size:14px;">(${reviews.length} valoración${reviews.length!==1?"es":""})</span></p>`
    : `<p style="color:#94a3b8;font-size:13px;margin:4px 0;">Sin valoraciones aún</p>`

  const wa = perfil.mostrar_telefono !== false && perfil.movil
    ? `https://wa.me/${perfil.movil.replace(/\D/g,"")}`
    : null

  /* ── Servicio ── */
  let servicioHtml = ""
  if(servicio){
    const tags = servicio.servicios_lista
      ? servicio.servicios_lista.split(",").map(s=>`<span class="servicio-tag">${s.trim()}</span>`).join("") : ""

    servicioHtml = `
      <div class="card">
        <h3 style="color:#f97316;"><i class="fa-solid fa-tools"></i> ${servicio.categoria}</h3>
        ${servicio.titulo?`<p><strong>${servicio.titulo}</strong></p>`:""}
        ${tags?`<div class="servicios-tags" style="margin-bottom:12px;">${tags}</div>`:""}
        ${servicio.horarios?`<p style="font-size:14px;"><i class="fa-solid fa-clock" style="color:#2563eb;"></i> <strong>Horarios:</strong> ${servicio.horarios}</p>`:""}
        ${servicio.descripcion?`<p style="line-height:1.6;color:#475569;">${servicio.descripcion}</p>`:""}
        <p style="font-size:13px;color:#64748b;margin-bottom:0;">
          <i class="fa-solid fa-location-dot"></i>
          ${servicio.localidad||""}${servicio.provincia?", "+servicio.provincia:""}
        </p>
        ${(servicio.lat&&servicio.lng)?'<div id="mapaPub"></div>':""}
      </div>`
  }

  /* ── Fotos ── */
  let fotosHtml = fotos?.length
    ? `<div class="card"><h3><i class="fa-solid fa-images"></i> Trabajos realizados</h3>
        <div class="fotos-grid">${fotos.map(f=>`<div><img src="${f.imagen}" alt="${f.descripcion||""}">
          ${f.descripcion?`<p style="font-size:12px;color:#64748b;margin:4px 0 0;">${f.descripcion}</p>`:""}</div>`).join("")}
        </div></div>`
    : `<div class="card" style="text-align:center;padding:26px;color:#94a3b8;">
        <i class="fa-solid fa-lock" style="font-size:26px;display:block;margin-bottom:8px;"></i>
        <p style="margin:0;font-weight:600;">Fotos de trabajos</p>
        <p style="margin:4px 0 0;font-size:13px;">Próximamente disponible</p>
      </div>`

  /* ── Reviews ── */
  const reviewsHtml = reviews?.length
    ? `<div class="card"><h3><i class="fa-solid fa-star" style="color:#f59e0b;"></i> Valoraciones</h3>
        ${reviews.map(r=>`<div class="cv-item">
          <span class="stars-show">${"★".repeat(r.rating)}${"☆".repeat(5-r.rating)}</span>
          ${r.comentario?`<p style="margin:6px 0 0;font-size:14px;">${r.comentario}</p>`:""}
        </div>`).join("")}
      </div>` : ""

  /* ── Formulario de puntuación (solo si está logueado y no es su propio perfil) ── */
  const yaVoto = reviews?.some(r => r.autor_id === usuarioActual)
  const puedeVotar = usuarioActual && usuarioActual !== id && !yaVoto

  const formRating = puedeVotar ? `
    <div class="card" id="formRating">
      <h3><i class="fa-solid fa-star-half-stroke" style="color:#f59e0b;"></i> Dejar valoración</h3>
      <p style="font-size:14px;color:#64748b;margin-top:-4px;">¿Trabajaste con ${displayNombre}? Contale a otros cómo fue tu experiencia.</p>
      <label>Puntuación *</label>
      <div class="stars-input" id="starsInput">
        ${[1,2,3,4,5].map(n=>`<i class="fa-solid fa-star" data-v="${n}" onclick="setEstrella(${n})" onmouseover="hoverEstrella(${n})" onmouseout="resetHover()"></i>`).join("")}
      </div>
      <label>Comentario</label>
      <textarea id="comentarioRating" rows="3" placeholder="Contá cómo fue el trabajo, la puntualidad, la calidad..."></textarea>
      <div id="msgRating"></div>
      <button class="btn btn-primary" onclick="enviarRating('${id}')">
        <i class="fa-solid fa-paper-plane"></i> Enviar valoración
      </button>
    </div>` : (usuarioActual && yaVoto
      ? `<div class="alerta alerta-ok" style="margin-bottom:16px;"><i class="fa-solid fa-check"></i> Ya dejaste tu valoración</div>`
      : (!usuarioActual ? `<div class="card" style="text-align:center;padding:20px;">
          <p style="margin:0;color:#64748b;font-size:14px;">
            <a href="/login.html">Iniciá sesión</a> para dejar una valoración
          </p></div>` : ""))

  const badgesHtml = [
    perfil.destacado ? `<span style="display:inline-flex;align-items:center;gap:5px;background:#f59e0b;color:white;font-size:12px;font-weight:700;padding:3px 12px;border-radius:20px;"><i class="fa-solid fa-crown"></i> DESTACADO</span>` : "",
    perfil.verificado ? `<span style="display:inline-flex;align-items:center;gap:5px;background:#0ea5e9;color:white;font-size:12px;font-weight:700;padding:3px 12px;border-radius:20px;"><i class="fa-solid fa-circle-check"></i> VERIFICADO</span>` : ""
  ].filter(Boolean).join("")

  document.getElementById("contenido").innerHTML = `
    <div class="pub-header">
      ${foto}
      ${badgesHtml ? `<div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin:6px 0 4px;">${badgesHtml}</div>` : ""}
      <h2 style="margin:0 0 4px;">${displayNombre}</h2>
      <p style="margin:0 0 2px;color:#64748b;">
        <i class="fa-solid fa-location-dot"></i>
        ${perfil.localidad||""}${perfil.provincia?", "+perfil.provincia:""}
      </p>
      ${ratingHtml}
      ${wa?`<a class="btn-whatsapp" href="${wa}" target="_blank" rel="noopener">
        <i class="fa-brands fa-whatsapp"></i> Contactar por WhatsApp</a>`:""}
      <div style="display:flex;gap:8px;justify-content:center;margin-top:10px;flex-wrap:wrap;">
        <button id="btnCompartir" onclick="compartirPerfil('${id}')"
          style="display:inline-flex;align-items:center;gap:6px;padding:8px 16px;background:#f1f5f9;border:1.5px solid #e2e8f0;border-radius:9px;font-size:13px;font-weight:600;color:#475569;cursor:pointer;">
          <i class="fa-solid fa-share-nodes"></i> Compartir
        </button>
        <button onclick="compartirWA('${displayNombre}','${id}')"
          style="display:inline-flex;align-items:center;gap:6px;padding:8px 16px;background:#f0fdf4;border:1.5px solid #bbf7d0;border-radius:9px;font-size:13px;font-weight:600;color:#16a34a;cursor:pointer;">
          <i class="fa-brands fa-whatsapp"></i> Compartir en WA
        </button>
      </div>
    </div>
    ${servicioHtml}
    ${fotosHtml}
    ${formRating}
    ${reviewsHtml}
  `

  if(servicio?.lat && servicio?.lng){
    setTimeout(() => {
      const map = L.map("mapaPub").setView([servicio.lat, servicio.lng], 13)
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map)
      L.marker([servicio.lat, servicio.lng]).addTo(map)
        .bindPopup(`<b>${displayNombre}</b><br>${servicio.categoria}`).openPopup()
    }, 60)
  }

  // Registrar vista (no cuenta el propio profesional)
  registrarVista(id)

  } catch(err){
    console.error("Error en cargarPerfil:", err)
    const el = document.getElementById("contenido")
    if(el) el.innerHTML = '<div class="alerta alerta-err">Ocurrió un error al cargar el perfil. Intentá de nuevo.</div>'
  }
}

/* ── ESTRELLAS ── */

window.setEstrella = function(n){
  estrellaSeleccionada = n
  document.querySelectorAll("#starsInput i").forEach((el,i) => {
    el.classList.toggle("activa", i < n)
  })
}

window.hoverEstrella = function(n){
  document.querySelectorAll("#starsInput i").forEach((el,i) => {
    el.classList.toggle("hover", i < n)
  })
}

window.resetHover = function(){
  document.querySelectorAll("#starsInput i").forEach(el => el.classList.remove("hover"))
}

/* ── ENVIAR RATING ── */

window.enviarRating = async function(trabajadorId){
  const msg = document.getElementById("msgRating")

  if(!estrellaSeleccionada){
    msg.innerHTML = '<div class="alerta alerta-err">Seleccioná una puntuación</div>'
    return
  }

  const { data: authData } = await supabase.auth.getUser()
  if(!authData.user){ msg.innerHTML = '<div class="alerta alerta-err">Debés estar logueado</div>'; return }

  const { error } = await supabase.from("reviews").insert({
    trabajador_id: trabajadorId,
    autor_id:      authData.user.id,
    rating:        estrellaSeleccionada,
    comentario:    document.getElementById("comentarioRating").value.trim(),
    tipo:          "servicio"
  })

  if(error){ msg.innerHTML = `<div class="alerta alerta-err">${error.message}</div>`; return }

  // Notificación para el profesional
  const comentario = document.getElementById("comentarioRating")?.value?.trim() || ""
  supabase.from("notificaciones").insert({
    usuario_id: trabajadorId,
    tipo: "review",
    titulo: `Recibiste una calificación de ${estrellaSeleccionada}/10`,
    cuerpo: comentario ? `"${comentario.substring(0,80)}"` : "¡Alguien valoró tu trabajo!",
    url: "/perfil.html"
  }).catch(()=>{})

  document.getElementById("formRating").innerHTML =
    '<div class="alerta alerta-ok"><i class="fa-solid fa-check"></i> ¡Gracias! Tu valoración fue enviada.</div>'
}

cargarPerfil()

/* ── Tracking de vistas ── */
async function registrarVista(profesionalId){
  const { data: authData } = await supabase.auth.getUser()
  if(authData?.user?.id === profesionalId) return
  supabase.from("perfil_eventos").insert({ profesional_id: profesionalId, tipo: "vista" }).catch(()=>{})
}

/* ── Compartir perfil ── */
window.compartirPerfil = function(id){
  const url = `${location.origin}/perfil_publico.html?id=${id}`
  if(navigator.share){
    navigator.share({ title: "Trabajos Cerca", url })
  } else {
    navigator.clipboard?.writeText(url).then(() => {
      const btn = document.getElementById("btnCompartir")
      if(btn){ btn.innerHTML = `<i class="fa-solid fa-check"></i> ¡Copiado!`; setTimeout(() => { btn.innerHTML = `<i class="fa-solid fa-share-nodes"></i> Compartir` }, 2000) }
    })
  }
}
window.compartirWA = function(nombre, id){
  const url = `${location.origin}/perfil_publico.html?id=${id}`
  window.open(`https://wa.me/?text=${encodeURIComponent(`Mirá el perfil de ${nombre} en Trabajos Cerca: ${url}`)}`, "_blank")
}
