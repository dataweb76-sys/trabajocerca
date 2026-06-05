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
    supabase.from("perfiles").select("*").eq("id", id).maybeSingle(),
    supabase.from("servicios").select("*").eq("usuario_id", id).maybeSingle(),
    supabase.from("reviews").select("*").eq("trabajador_id", id).order("created_at", { ascending: false }),
    supabase.from("portfolio").select("*").eq("usuario_id", id)
  ])

  if(!perfil){ document.getElementById("contenido").innerHTML = '<div class="alerta alerta-err">Perfil no encontrado.</div>'; return }

  // Nombre a mostrar según preferencia del usuario
  const displayNombre = (perfil.mostrar_como === "empresa" && perfil.nombre_empresa)
    ? perfil.nombre_empresa
    : `${perfil.nombre||""} ${perfil.apellido||""}`.trim()
  const displayNombreEsc = displayNombre.replace(/'/g, "\\'").replace(/"/g, "&quot;")

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

  /* ── Fotos de trabajos realizados ── */
  const itemsConFotos = fotos?.filter(f => f.foto1 || f.foto2 || f.foto3) || []

  // Armar lista plana de todas las imágenes para el lightbox
  const todasLasImgs = []
  itemsConFotos.forEach(item => {
    const imgs = [item.foto1, item.foto2, item.foto3].filter(Boolean)
    imgs.forEach(f => todasLasImgs.push({ src: f, titulo: item.titulo || "" }))
  })
  // Guardar en window para acceso desde onclick
  window._tcImgs = todasLasImgs

  let fotosHtml = itemsConFotos.length
    ? `<div class="card">
        <h3><i class="fa-solid fa-images" style="color:#f97316;"></i> Trabajos realizados</h3>
        ${itemsConFotos.map(item => {
          const imgs = [item.foto1, item.foto2, item.foto3].filter(Boolean)
          return `<div style="margin-bottom:18px;">
            ${item.titulo ? `<p style="font-size:14px;font-weight:700;color:#1e293b;margin:0 0 8px;">
              <i class="fa-solid fa-hammer" style="color:#f97316;font-size:12px;margin-right:5px;"></i>${item.titulo}</p>` : ""}
            <div class="fotos-grid">
              ${imgs.map(f => {
                const idx = todasLasImgs.findIndex(i => i.src === f)
                return `<img src="${f}" alt="${item.titulo||""}"
                  onclick="window._tcAbrirLightbox(${idx})"
                  style="cursor:zoom-in;border-radius:10px;transition:opacity .15s;"
                  onmouseover="this.style.opacity='.85'" onmouseout="this.style.opacity='1'">`
              }).join("")}
            </div>
            ${item.descripcion ? `<p style="font-size:12px;color:#64748b;margin:6px 0 0;line-height:1.5;">${item.descripcion}</p>` : ""}
          </div>`
        }).join("")}
      </div>`
    : `<div class="card" style="text-align:center;padding:22px 16px;">
        <i class="fa-solid fa-camera" style="font-size:32px;color:#cbd5e1;display:block;margin-bottom:10px;"></i>
        <p style="margin:0;font-size:14px;font-weight:700;color:#94a3b8;">Trabajos realizados</p>
        <p style="margin:4px 0 0;font-size:12px;color:#cbd5e1;">Este profesional aún no subió fotos de sus trabajos</p>
      </div>`

  /* ── Reviews ── */
  const reviewsHtml = reviews?.length
    ? `<div class="card"><h3><i class="fa-solid fa-star" style="color:#f59e0b;"></i> Valoraciones</h3>
        ${reviews.map(r=>{
          const stars = Math.min(Math.max(Math.round(r.rating / 2), 1), 5)
          return `<div class="cv-item">
          <span class="stars-show">${"★".repeat(stars)}${"☆".repeat(5-stars)}</span>
          <span style="font-size:13px;color:#64748b;margin-left:5px;">${r.rating}/10</span>
          ${r.comentario?`<p style="margin:6px 0 0;font-size:14px;">${r.comentario}</p>`:""}
        </div>`}).join("")}
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
      <div style="display:flex;gap:7px;justify-content:center;margin-top:10px;flex-wrap:wrap;">
        <button id="btnCompartir" onclick="compartirPerfil('${id}')"
          style="display:inline-flex;align-items:center;gap:6px;padding:8px 14px;background:#f1f5f9;border:1.5px solid #e2e8f0;border-radius:9px;font-size:13px;font-weight:600;color:#475569;cursor:pointer;">
          <i class="fa-solid fa-link"></i> Copiar link
        </button>
        <button onclick="compartirWA('${displayNombreEsc}','${id}')"
          style="display:inline-flex;align-items:center;gap:6px;padding:8px 14px;background:#f0fdf4;border:1.5px solid #bbf7d0;border-radius:9px;font-size:13px;font-weight:600;color:#16a34a;cursor:pointer;">
          <i class="fa-brands fa-whatsapp"></i> WhatsApp
        </button>
        <button onclick="compartirFB('${id}')"
          style="display:inline-flex;align-items:center;gap:6px;padding:8px 14px;background:#eff6ff;border:1.5px solid #bfdbfe;border-radius:9px;font-size:13px;font-weight:600;color:#1d4ed8;cursor:pointer;">
          <i class="fa-brands fa-facebook"></i> Facebook
        </button>
        <button onclick="compartirX('${displayNombreEsc}','${id}')"
          style="display:inline-flex;align-items:center;gap:6px;padding:8px 14px;background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:9px;font-size:13px;font-weight:600;color:#0f172a;cursor:pointer;">
          <i class="fa-brands fa-x-twitter"></i> X
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
        .bindPopup(`<b>${displayNombreEsc}</b><br>${servicio.categoria}`).openPopup()
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

/* ══════════════════════════════════════════════════════
   LIGHTBOX — Popup de imágenes de trabajos realizados
══════════════════════════════════════════════════════ */
;(function(){

  const css = `
  #tc-lightbox {
    display:none; position:fixed; inset:0; z-index:9800;
    background:rgba(0,0,0,.88); align-items:center; justify-content:center;
    padding:0; box-sizing:border-box;
  }
  #tc-lightbox.abierto { display:flex; }
  #tc-lb-box {
    background:white; border-radius:20px; width:100%; max-width:520px;
    margin:16px; max-height:calc(100vh - 32px);
    display:flex; flex-direction:column; overflow:hidden;
    box-shadow:0 24px 80px rgba(0,0,0,.5);
  }
  #tc-lb-header {
    display:flex; align-items:center; justify-content:space-between;
    padding:13px 16px 11px; border-bottom:1px solid #f1f5f9; flex-shrink:0;
  }
  #tc-lb-titulo { font-size:14px; font-weight:800; color:#1e293b; flex:1; min-width:0;
    white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  #tc-lb-contador { font-size:12px; color:#94a3b8; margin:0 10px; flex-shrink:0; }
  #tc-lb-cerrar {
    background:none; border:none; font-size:22px; color:#94a3b8; cursor:pointer;
    width:32px; height:32px; display:flex; align-items:center; justify-content:center;
    border-radius:8px; flex-shrink:0; font-family:inherit; line-height:1;
  }
  #tc-lb-cerrar:hover { background:#f1f5f9; color:#1e293b; }
  #tc-lb-scroll { overflow-y:auto; flex:1; }
  #tc-lb-img-wrap {
    position:relative; background:#000; min-height:240px;
    display:flex; align-items:center; justify-content:center;
  }
  #tc-lb-img { width:100%; max-height:60vh; object-fit:contain; display:block; }
  .tc-lb-nav {
    position:absolute; top:50%; transform:translateY(-50%);
    background:rgba(255,255,255,.18); border:none; color:white;
    width:40px; height:40px; border-radius:50%; font-size:18px; cursor:pointer;
    display:flex; align-items:center; justify-content:center;
    backdrop-filter:blur(4px); transition:background .15s;
  }
  .tc-lb-nav:hover { background:rgba(255,255,255,.35); }
  #tc-lb-prev { left:10px; }
  #tc-lb-next { right:10px; }
  #tc-lb-dots {
    display:flex; justify-content:center; gap:6px; padding:10px 16px 4px; flex-shrink:0;
  }
  .tc-lb-dot {
    width:7px; height:7px; border-radius:50%; background:#e2e8f0;
    cursor:pointer; transition:background .15s; border:none; padding:0;
  }
  .tc-lb-dot.activo { background:#2563eb; transform:scale(1.2); }
  #tc-lb-cta {
    padding:18px 18px 20px; border-top:1px solid #f1f5f9; flex-shrink:0;
    background:linear-gradient(to bottom,#fff,#f8fafc);
  }
  #tc-lb-cta p {
    margin:0 0 12px; font-size:15px; font-weight:800; color:#1e293b; text-align:center;
  }
  #tc-lb-cta p span { color:#f97316; }
  #tc-lb-btns { display:flex; gap:10px; }
  #tc-lb-btns button {
    flex:1; padding:12px 10px; border-radius:12px; border:none;
    font-size:14px; font-weight:700; cursor:pointer; font-family:inherit;
    display:flex; align-items:center; justify-content:center; gap:7px;
    transition:opacity .15s;
  }
  #tc-lb-btns button:hover { opacity:.88; }
  #tc-lb-btn-compartir { background:linear-gradient(135deg,#833ab4,#fd1d1d,#fcb045); color:white; }
  #tc-lb-btn-valorar   { background:#2563eb; color:white; }
  @media(max-width:400px){
    #tc-lb-box { margin:8px; border-radius:16px; }
  }
  `
  const s = document.createElement("style")
  s.textContent = css
  document.head.appendChild(s)

  const el = document.createElement("div")
  el.id = "tc-lightbox"
  el.innerHTML = `
    <div id="tc-lb-box">
      <div id="tc-lb-header">
        <span id="tc-lb-titulo"></span>
        <span id="tc-lb-contador"></span>
        <button id="tc-lb-cerrar" onclick="window._tcCerrarLightbox()">×</button>
      </div>
      <div id="tc-lb-scroll">
        <div id="tc-lb-img-wrap">
          <img id="tc-lb-img" src="" alt="">
          <button class="tc-lb-nav" id="tc-lb-prev" onclick="window._tcLbNav(-1)">‹</button>
          <button class="tc-lb-nav" id="tc-lb-next" onclick="window._tcLbNav(1)">›</button>
        </div>
        <div id="tc-lb-dots"></div>
      </div>
      <div id="tc-lb-cta">
        <p>¿Te gustaron mis trabajos? <span>¡Valorame o compartí mi perfil!</span></p>
        <div id="tc-lb-btns">
          <button id="tc-lb-btn-compartir" onclick="window._tcLbCompartir()">
            <i class="fa-solid fa-share-nodes"></i> Compartir perfil
          </button>
          <button id="tc-lb-btn-valorar" onclick="window._tcLbValorar()">
            <i class="fa-solid fa-star"></i> Valorame
          </button>
        </div>
        <div id="tc-lb-msg-comp" style="margin-top:10px;font-size:13px;text-align:center;color:#16a34a;display:none;"></div>
      </div>
    </div>`
  document.body.appendChild(el)

  el.addEventListener("click", e => { if(e.target === el) window._tcCerrarLightbox() })

  document.addEventListener("keydown", e => {
    if(!el.classList.contains("abierto")) return
    if(e.key === "ArrowLeft")  window._tcLbNav(-1)
    if(e.key === "ArrowRight") window._tcLbNav(1)
    if(e.key === "Escape")     window._tcCerrarLightbox()
  })

  let _idx = 0

  function renderImg(){
    const imgs  = window._tcImgs || []
    const total = imgs.length
    if(!total) return
    _idx = Math.max(0, Math.min(_idx, total - 1))
    const cur = imgs[_idx]
    document.getElementById("tc-lb-img").src = cur.src
    document.getElementById("tc-lb-img").alt = cur.titulo
    document.getElementById("tc-lb-titulo").textContent = cur.titulo || "Trabajo realizado"
    document.getElementById("tc-lb-contador").textContent = `${_idx + 1} / ${total}`
    document.getElementById("tc-lb-prev").style.display = _idx > 0         ? "flex" : "none"
    document.getElementById("tc-lb-next").style.display = _idx < total - 1 ? "flex" : "none"
    const dotsEl = document.getElementById("tc-lb-dots")
    dotsEl.innerHTML = total > 1
      ? imgs.map((_, i) => `<button class="tc-lb-dot ${i===_idx?"activo":""}" onclick="window._tcLbIr(${i})"></button>`).join("")
      : ""
  }

  window._tcAbrirLightbox = function(idx){
    _idx = idx || 0
    document.getElementById("tc-lb-msg-comp").style.display = "none"
    renderImg()
    el.classList.add("abierto")
    document.body.style.overflow = "hidden"
  }

  window._tcCerrarLightbox = function(){
    el.classList.remove("abierto")
    document.body.style.overflow = ""
  }

  window._tcLbNav = function(dir){
    _idx = Math.max(0, Math.min(_idx + dir, (window._tcImgs||[]).length - 1))
    renderImg()
  }

  window._tcLbIr = function(i){ _idx = i; renderImg() }

  window._tcLbCompartir = async function(){
    const url = location.href
    const msg = document.getElementById("tc-lb-msg-comp")
    if(navigator.share){
      try { await navigator.share({ title: "Mirá estos trabajos en Trabajos Cerca", url }); return } catch(e){}
    }
    try { await navigator.clipboard.writeText(url) } catch(e){}
    msg.style.display = "block"
    msg.innerHTML = "<i class='fa-solid fa-check'></i> ¡Link copiado! Compartilo donde quieras."
    setTimeout(() => { msg.style.display = "none" }, 3000)
  }

  window._tcLbValorar = function(){
    window._tcCerrarLightbox()
    const formEl = document.getElementById("formRating")
    if(formEl){
      formEl.scrollIntoView({ behavior: "smooth", block: "center" })
      formEl.style.outline = "2.5px solid #2563eb"
      formEl.style.borderRadius = "14px"
      setTimeout(() => { formEl.style.outline = "" }, 2000)
    } else {
      const params = new URLSearchParams(location.search)
      location.href = `/login.html?next=/perfil_publico.html?id=${params.get("id")}`
    }
  }

})();

/* ── Tracking de vistas ── */
async function registrarVista(profesionalId){
  const { data: authData } = await supabase.auth.getUser()
  if(authData?.user?.id === profesionalId) return
  supabase.from("perfil_eventos").insert({ profesional_id: profesionalId, tipo: "vista" }).catch(()=>{})
}

/* ── Compartir perfil ── */
window.compartirPerfil = function(id){
  const url = `${location.origin}/perfil_publico.html?id=${id}`
  navigator.clipboard?.writeText(url).then(() => {
    const btn = document.getElementById("btnCompartir")
    if(btn){ btn.innerHTML = `<i class="fa-solid fa-check"></i> ¡Copiado!`; setTimeout(() => { btn.innerHTML = `<i class="fa-solid fa-link"></i> Copiar link` }, 2000) }
  })
}
window.compartirWA = function(nombre, id){
  const url = `${location.origin}/perfil_publico.html?id=${id}`
  window.open(`https://wa.me/?text=${encodeURIComponent(`Mirá el perfil de ${nombre} en Trabajos Cerca: ${url}`)}`, "_blank")
}
window.compartirFB = function(id){
  const url = encodeURIComponent(`${location.origin}/perfil_publico.html?id=${id}`)
  window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, "_blank", "width=600,height=400")
}
window.compartirX = function(nombre, id){
  const url = `${location.origin}/perfil_publico.html?id=${id}`
  const txt = encodeURIComponent(`Mirá el perfil de ${nombre} en Trabajos Cerca 💼`)
  window.open(`https://twitter.com/intent/tweet?text=${txt}&url=${encodeURIComponent(url)}`, "_blank", "width=600,height=400")
}
