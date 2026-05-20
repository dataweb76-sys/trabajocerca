/* buscador.js — REST API directa (sin cliente JS para evitar CSP) */

const SB_URL = "https://iqeiszkoifxgygoqvbem.supabase.co"
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxZWlzemtvaWZ4Z3lnb3F2YmVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyMTEzODIsImV4cCI6MjA5NDc4NzM4Mn0.qxt70TPbARPcMc8HhHx2A2QnfBvJLCrnrH4m36IcENs"
const SB_HEADERS = { "apikey": SB_KEY, "Authorization": `Bearer ${SB_KEY}` }

let mapModal = null
let estrellaReview = 0

/* ── AUTH HELPERS ── */

function getAccessToken(){
  try {
    const raw = localStorage.getItem("sb-iqeiszkoifxgygoqvbem-auth-token")
    if(!raw) return null
    return JSON.parse(raw)?.access_token || null
  } catch(e){ return null }
}

function getCurrentUserId(){
  const token = getAccessToken()
  if(!token) return null
  try { return JSON.parse(atob(token.split(".")[1])).sub || null }
  catch(e){ return null }
}

/* ── STARS HELPERS ── */

function starsHTML(avg, count, size=14){
  const r = Math.round(avg || 0)
  const s = [1,2,3,4,5].map(i =>
    `<i class="fa-solid fa-star" style="color:${i<=r?"#f59e0b":"#d1d5db"};font-size:${size}px;"></i>`
  ).join("")
  const countTxt = count !== undefined
    ? `<span style="font-size:12px;color:#64748b;margin-left:4px;">${avg>0?avg.toFixed(1)+" ":""}<span style="opacity:.7;">(${count})</span></span>`
    : ""
  return `<span style="display:inline-flex;align-items:center;gap:2px;">${s}</span>${countTxt}`
}

/* ── TÉRMINOS ── */

function verificarTerminos(){
  if(localStorage.getItem("tc_aceptados")){
    document.getElementById("modalTerminos").classList.remove("activo")
  }
}
window.aceptarTerminos = function(){
  localStorage.setItem("tc_aceptados","1")
  document.getElementById("modalTerminos").classList.remove("activo")
  document.body.style.overflow = ""
}
verificarTerminos()

/* ── PARÁMETROS DE URL ── */

const params  = new URLSearchParams(location.search)
const SECCION = params.get("seccion")

const CATS_OFICIOS = new Set(["Albañilería","Plomería","Gasista","Electricista","Carpintería","Pintura","Jardinería","Herrería","Cerrajería","Limpieza","Mudanzas / Fletes","Refrigeración / Aire acondicionado","Informática / Reparaciones","Gastronomía","Mecánico Automotriz","Tapicería","Personal Trainer","Enfermero/a","Niñera / Cuidadora","Delivery / Mensajería","Planchado / Laundry"])
const CATS_PROF    = new Set(["Médico / Clínica","Odontólogo","Psicólogo / Terapia","Kinesiólogo","Nutricionista","Veterinario","Arquitecto","Abogado","Contador / Impositivo","Diseñador Gráfico","Fotógrafo","Profesor Particular","Peluquería / Estética"])

if(SECCION === "oficios"){
  document.title = "Buscador de Oficios — Trabajos Cerca"
  const t = document.getElementById("tituloSeccion")
  if(t) t.innerHTML = '<i class="fa-solid fa-hammer" style="color:#2563eb"></i> Buscador de Oficios'
} else if(SECCION === "profesionales"){
  document.title = "Buscador de Profesionales — Trabajos Cerca"
  const t = document.getElementById("tituloSeccion")
  if(t) t.innerHTML = '<i class="fa-solid fa-user-tie" style="color:#2563eb"></i> Buscador de Profesionales'
}

if(params.get("q"))      document.getElementById("buscar").value = params.get("q")
if(params.get("ciudad")) document.getElementById("ciudad").value = params.get("ciudad")
if(params.get("cat"))    document.getElementById("buscar").value = params.get("cat")

/* ── FILTROS RÁPIDOS ── */

window.filtrarCategoria = function(cat){
  document.getElementById("buscar").value = cat
  document.getElementById("ciudad").value = ""
  buscar()
  document.getElementById("resultados").scrollIntoView({ behavior:"smooth", block:"start" })
}

/* ── BUSCAR ── */

window.buscar = async function(){
  const palabra = document.getElementById("buscar").value.trim()
  const ciudad  = document.getElementById("ciudad").value.trim()
  const cont    = document.getElementById("resultados")

  cont.innerHTML = `<div style="text-align:center;padding:40px;color:#64748b;">
    <i class="fa-solid fa-spinner fa-spin" style="font-size:28px;"></i><p>Buscando...</p></div>`

  const select = "id,categoria,titulo,descripcion,servicios_lista,horarios,localidad,provincia,lat,lng,perfiles(id,nombre,apellido,movil,foto,localidad,provincia,instagram,destacado)"
  let url = `${SB_URL}/rest/v1/servicios?activo=eq.true&select=${encodeURIComponent(select)}&order=created_at.desc`

  if(palabra){
    const p = encodeURIComponent(`*${palabra}*`)
    url += `&or=(titulo.ilike.${p},categoria.ilike.${p},descripcion.ilike.${p})`
  }
  if(ciudad) url += `&localidad=ilike.*${encodeURIComponent(ciudad)}*`

  let data
  try {
    const res = await fetch(url, { headers: SB_HEADERS })
    if(!res.ok){ const err = await res.json(); throw new Error(err.message || res.statusText) }
    data = await res.json()
  } catch(e){
    cont.innerHTML = `<div class="alerta alerta-err">Error al buscar: ${e.message}</div>`
    return
  }

  if(SECCION === "oficios")       data = data.filter(d => CATS_OFICIOS.has(d.categoria))
  if(SECCION === "profesionales") data = data.filter(d => CATS_PROF.has(d.categoria))

  if(!data?.length){
    cont.innerHTML = `<div style="text-align:center;padding:50px 20px;color:#64748b;">
      <i class="fa-solid fa-face-sad-tear" style="font-size:44px;opacity:.3;display:block;margin-bottom:14px;"></i>
      <p style="font-size:16px;margin-bottom:8px;">No encontramos resultados.</p>
      <p><a href="/registro.html?tipo=profesional">¿Sos profesional? Publicá tu servicio gratis</a></p></div>`
    return
  }

  // ── Cargar ratings en paralelo y merge ──
  const profileIds = data.map(d => d.perfiles?.id).filter(Boolean)
  let ratingsMap = {}
  if(profileIds.length){
    try {
      const rRes = await fetch(
        `${SB_URL}/rest/v1/reviews?trabajador_id=in.(${profileIds.join(",")})&tipo=neq.cliente&select=trabajador_id,rating`,
        { headers: SB_HEADERS }
      )
      if(rRes.ok){
        const revs = await rRes.json()
        revs.forEach(r => {
          if(!ratingsMap[r.trabajador_id]) ratingsMap[r.trabajador_id] = []
          ratingsMap[r.trabajador_id].push(r.rating)
        })
      }
    } catch(e){}
  }

  // Adjuntar avg_rating a cada item
  data.forEach(item => {
    const pid = item.perfiles?.id
    const ratings = pid ? (ratingsMap[pid] || []) : []
    item._avgRating = ratings.length ? ratings.reduce((a,b)=>a+b,0)/ratings.length : 0
    item._ratingCount = ratings.length
  })

  // ── Ordenar: destacado > avg_rating > nombre ──
  data.sort((a, b) => {
    const da = a.perfiles?.destacado ? 1 : 0
    const db = b.perfiles?.destacado ? 1 : 0
    if(db !== da) return db - da
    return b._avgRating - a._avgRating
  })

  // ── Banner calificaciones ──
  const bannerCal = `<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:12px 16px;margin-bottom:18px;display:flex;align-items:center;gap:10px;">
    <i class="fa-solid fa-star" style="color:#f59e0b;font-size:20px;flex-shrink:0;"></i>
    <p style="margin:0;font-size:13px;color:#92400e;">
      <strong>¿Trabajaste con alguien?</strong> Dejá tu calificación — ayuda a otros usuarios a elegir mejor y a los profesionales a conseguir más clientes.
    </p>
  </div>`

  cont.innerHTML = bannerCal + `<p style="color:#64748b;margin-bottom:16px;font-size:14px;">${data.length} resultado${data.length!==1?"s":""} encontrado${data.length!==1?"s":""} · ordenados por calificación</p>`

  data.forEach(item => {
    const p   = item.perfiles || {}
    const wa  = `https://wa.me/${(p.movil||"").replace(/\D/g,"")}`
    const pid = p.id || ""

    const foto = p.foto
      ? `<img src="${p.foto}" style="width:70px;height:70px;border-radius:50%;object-fit:cover;border:2px solid #2563eb;flex-shrink:0;">`
      : `<div style="width:70px;height:70px;border-radius:50%;background:#dbeafe;display:flex;align-items:center;justify-content:center;font-size:26px;color:#2563eb;flex-shrink:0;"><i class="fa-solid fa-user"></i></div>`

    const badgeDestacado = p.destacado
      ? `<span style="display:inline-flex;align-items:center;gap:4px;background:#f59e0b;color:white;font-size:11px;font-weight:700;padding:2px 8px;border-radius:20px;margin-bottom:4px;">
          <i class="fa-solid fa-crown"></i> DESTACADO
        </span><br>`
      : ""

    // Stars para la card
    const r = Math.round(item._avgRating)
    const starsCard = item._ratingCount > 0
      ? `${[1,2,3,4,5].map(i=>`<i class="fa-solid fa-star${i<=r?" lit":""}"></i>`).join("")}<span>${item._avgRating.toFixed(1)} (${item._ratingCount})</span>`
      : `<i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><span style="color:#94a3b8;font-size:12px;">Sin calificaciones aún</span>`

    const card = document.createElement("div")
    card.className = "card"
    card.style.cssText = `cursor:pointer;transition:box-shadow .2s,transform .2s;${p.destacado?"border:2px solid #f59e0b;":""}`
    card.onmouseenter = () => { card.style.boxShadow="0 6px 20px rgba(0,0,0,.13)"; card.style.transform="translateY(-2px)" }
    card.onmouseleave = () => { card.style.boxShadow=""; card.style.transform="" }
    card.onclick      = () => abrirModal(item)

    card.innerHTML = `
      <div style="display:flex;gap:14px;align-items:flex-start;">
        <div style="position:relative;">
          ${foto}
          ${p.destacado?`<span style="position:absolute;bottom:-4px;right:-4px;background:#f59e0b;border-radius:50%;width:20px;height:20px;display:flex;align-items:center;justify-content:center;">
            <i class="fa-solid fa-crown" style="font-size:10px;color:white;"></i>
          </span>`:""}
        </div>
        <div style="flex:1;min-width:0;">
          ${badgeDestacado}
          <h3 style="margin:0 0 3px;font-size:17px;">${p.nombre||""} ${p.apellido||""}</h3>
          <p style="margin:0 0 2px;color:#f97316;font-weight:700;font-size:14px;">${item.categoria}</p>
          <div class="card-stars">${starsCard}</div>
          <p style="margin:4px 0 0;font-size:13px;color:#64748b;">
            <i class="fa-solid fa-location-dot"></i>
            ${item.localidad||p.localidad||""}${item.provincia?", "+item.provincia:""}
          </p>
          ${item.horarios?`<p style="margin:4px 0 0;font-size:13px;color:#64748b;"><i class="fa-solid fa-clock"></i> ${item.horarios}</p>`:""}
        </div>
      </div>
      <div class="card-actions" style="margin-top:14px;">
        <button class="btn btn-outline btn-sm" onclick="event.stopPropagation();abrirModal(${JSON.stringify(item).replace(/"/g,"&quot;")})">
          <i class="fa-solid fa-eye"></i> Ver perfil
        </button>
        ${p.movil?`<a href="${wa}" target="_blank" rel="noopener" onclick="event.stopPropagation()"
          class="btn btn-sm" style="background:#25D366;color:white;display:inline-flex;align-items:center;gap:6px;">
          <i class="fa-brands fa-whatsapp"></i> WhatsApp</a>`:""}
      </div>`

    cont.appendChild(card)
  })
}

/* ── MODAL PERFIL ── */

window.abrirModal = function(item){
  if(typeof item === "string") item = JSON.parse(item.replace(/&quot;/g,'"'))
  const p = item.perfiles || {}
  if(mapModal){ mapModal.remove(); mapModal = null }

  const foto = p.foto
    ? `<img src="${p.foto}" style="width:90px;height:90px;border-radius:50%;object-fit:cover;border:3px solid #2563eb;">`
    : `<div style="width:90px;height:90px;border-radius:50%;background:#dbeafe;display:flex;align-items:center;justify-content:center;font-size:36px;color:#2563eb;"><i class="fa-solid fa-user"></i></div>`

  const wa   = `https://wa.me/${(p.movil||"").replace(/\D/g,"")}`
  const ubic = `${item.localidad||p.localidad||""}${item.provincia?", "+item.provincia:""}`
  const tags = item.servicios_lista
    ? item.servicios_lista.split(",").map(s=>`<span class="servicio-tag">${s.trim()}</span>`).join("")
    : ""

  const badgeDestacado = p.destacado
    ? `<div style="display:inline-flex;align-items:center;gap:5px;background:#f59e0b;color:white;font-size:12px;font-weight:700;padding:3px 12px;border-radius:20px;margin-bottom:8px;">
        <i class="fa-solid fa-crown"></i> PERFIL DESTACADO
      </div><br>`
    : ""

  document.getElementById("modalContent").innerHTML = `
    <div style="text-align:center;margin-bottom:20px;">
      ${foto}
      ${badgeDestacado}
      <h2 style="margin:10px 0 4px;font-size:22px;">${p.nombre||""} ${p.apellido||""}</h2>
      <p style="margin:0;color:#f97316;font-weight:700;font-size:16px;"><i class="fa-solid fa-tools"></i> ${item.categoria}</p>
      <p style="margin:4px 0 0;color:#64748b;font-size:14px;"><i class="fa-solid fa-location-dot"></i> ${ubic}</p>
      <div style="margin-top:8px;" id="modalStarsTop"></div>
    </div>

    ${item.titulo?`<p style="font-size:16px;font-weight:600;margin:0 0 14px;text-align:center;">${item.titulo}</p>`:""}

    ${tags?`<div style="margin-bottom:16px;">
      <p style="font-size:13px;font-weight:600;color:#475569;margin:0 0 8px;">Servicios:</p>
      <div class="servicios-tags">${tags}</div>
    </div>`:""}

    ${item.horarios?`<div style="background:#f8fafc;border-radius:8px;padding:12px 14px;margin-bottom:16px;">
      <p style="margin:0;font-size:14px;"><i class="fa-solid fa-clock" style="color:#2563eb;"></i>
      <strong> Horarios:</strong> ${item.horarios}</p>
    </div>`:""}

    ${item.descripcion?`<div style="margin-bottom:16px;">
      <p style="font-size:13px;font-weight:600;color:#475569;margin:0 0 6px;">Descripción:</p>
      <p style="font-size:14px;color:#475569;line-height:1.6;margin:0;">${item.descripcion}</p>
    </div>`:""}

    <div id="portfolioModal" style="margin-bottom:4px;"></div>

    ${p.movil?`<a href="${wa}" target="_blank" rel="noopener" class="btn-whatsapp"
      style="display:flex;justify-content:center;margin-bottom:12px;">
      <i class="fa-brands fa-whatsapp"></i> Consultar por WhatsApp
    </a>`:""}

    ${p.instagram?`<a href="https://instagram.com/${(p.instagram||"").replace("@","")}" target="_blank" rel="noopener"
      style="display:flex;justify-content:center;align-items:center;gap:8px;margin-bottom:16px;padding:12px;border-radius:10px;background:linear-gradient(135deg,#833ab4,#fd1d1d,#fcb045);color:white;font-weight:600;font-size:15px;text-decoration:none;">
      <i class="fa-brands fa-instagram" style="font-size:18px;"></i> ${p.instagram}
    </a>`:""}

    ${(item.lat&&item.lng)?`<div style="margin-bottom:16px;">
      <p style="font-size:13px;font-weight:600;color:#475569;margin:0 0 6px;">
        <i class="fa-solid fa-map-location-dot" style="color:#2563eb;"></i> Zona de trabajo
      </p>
      <div id="mapaModal" class="modal-map"></div>
      <a href="https://www.google.com/maps?q=${item.lat},${item.lng}" target="_blank" rel="noopener"
        style="display:block;text-align:center;margin-top:8px;font-size:13px;">
        <i class="fa-solid fa-diamond-turn-right"></i> Abrir en Google Maps
      </a>
    </div>`:""}

    <hr style="margin:20px 0;border:none;border-top:1px solid #e2e8f0;">
    <div id="reviewsSection">
      <div style="text-align:center;color:#94a3b8;padding:12px;">
        <i class="fa-solid fa-spinner fa-spin"></i>
      </div>
    </div>
  `

  document.getElementById("modalOverlay").classList.add("activo")
  document.body.style.overflow = "hidden"

  if(item.lat && item.lng){
    setTimeout(() => {
      mapModal = L.map("mapaModal").setView([item.lat, item.lng], 14)
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(mapModal)
      L.marker([item.lat, item.lng]).addTo(mapModal)
        .bindPopup(`<b>${p.nombre||""} ${p.apellido||""}</b><br>${item.categoria}`).openPopup()
    }, 60)
  }

  if(p.id){
    cargarReviews(p.id, p.nombre || "este profesional")
    cargarPortfolioModal(p.id)
  }
}

/* ── PORTFOLIO EN MODAL ── */

async function cargarPortfolioModal(uid){
  const sec = document.getElementById("portfolioModal")
  if(!sec) return
  try {
    const res = await fetch(
      `${SB_URL}/rest/v1/portfolio?usuario_id=eq.${uid}&select=titulo,descripcion,foto1,foto2,foto3&order=created_at.desc`,
      { headers: SB_HEADERS }
    )
    if(!res.ok) return
    const items = await res.json()
    if(!items?.length){ sec.innerHTML = ""; return }

    let html = `<div style="margin-bottom:16px;">
      <p style="font-size:13px;font-weight:600;color:#475569;margin:0 0 10px;">
        <i class="fa-solid fa-images" style="color:#f97316;"></i> Trabajos realizados
      </p>`

    items.forEach(item => {
      const fotos = [item.foto1, item.foto2, item.foto3].filter(Boolean)
      html += `<div style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;margin-bottom:10px;background:white;">
        ${fotos.length ? `<div style="display:flex;gap:2px;height:130px;background:#f1f5f9;">
          ${fotos.map(f => `<img src="${f}" style="flex:1;object-fit:cover;cursor:pointer;" onclick="window.open('${f}','_blank')">`).join("")}
        </div>` : ""}
        <div style="padding:10px 12px;">
          <strong style="font-size:14px;display:block;margin-bottom:2px;">${item.titulo}</strong>
          ${item.descripcion ? `<p style="font-size:12px;color:#64748b;margin:0;line-height:1.4;">${item.descripcion}</p>` : ""}
        </div>
      </div>`
    })

    html += `</div>`
    sec.innerHTML = html
  } catch(e){}
}

/* ── SISTEMA DE RESEÑAS ── */

async function cargarReviews(profileId, nombre){
  const sec = document.getElementById("reviewsSection")
  if(!sec) return

  let reviews = []
  try {
    const url = `${SB_URL}/rest/v1/reviews?trabajador_id=eq.${profileId}&tipo=neq.cliente&select=id,rating,comentario,created_at,autor_id&order=created_at.desc`
    const res = await fetch(url, { headers: SB_HEADERS })
    if(res.ok) reviews = await res.json()
  } catch(e){}

  const count = reviews.length
  const avg   = count ? reviews.reduce((a,b) => a+b.rating, 0) / count : 0
  const uid   = getCurrentUserId()
  const yaCal = uid && reviews.some(r => r.autor_id === uid)
  const esSí  = uid === profileId

  const topEl = document.getElementById("modalStarsTop")
  if(topEl && count > 0) topEl.innerHTML = starsHTML(avg, count, 15)

  let html = `<h3 style="margin:0 0 6px;font-size:16px;color:#1e293b;">
    <i class="fa-solid fa-star" style="color:#f59e0b;"></i> Calificaciones
  </h3>`

  // CTA de calificación destacado
  if(uid && !esSí && !yaCal){
    html += `<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:10px 14px;margin-bottom:14px;font-size:13px;color:#92400e;">
      <i class="fa-solid fa-star" style="color:#f59e0b;"></i>
      <strong> ¿Ya trabajaste con ${nombre}?</strong> Tu calificación ayuda a otros y al profesional a conseguir más clientes. ¡Tomá 30 segundos y calificalo!
    </div>`
  }

  if(count > 0){
    const r = Math.round(avg)
    html += `<div class="rating-avg-box">
      <div class="avg-num">${avg.toFixed(1)}</div>
      <div>
        <div class="avg-stars">
          ${[1,2,3,4,5].map(i=>`<i class="fa-solid fa-star${i<=r?" lit":""}"></i>`).join("")}
        </div>
        <div class="avg-count">${count} reseña${count!==1?"s":""}</div>
      </div>
    </div>`

    reviews.slice(0,5).forEach(rev => {
      const r2 = rev.rating
      html += `<div class="review-item">
        <div class="rev-stars">
          ${[1,2,3,4,5].map(i=>`<i class="fa-solid fa-star${i<=r2?" lit":""}"></i>`).join("")}
        </div>
        ${rev.comentario ? `<p>"${rev.comentario}"</p>` : ""}
      </div>`
    })
  } else {
    html += `<p style="font-size:13px;color:#94a3b8;text-align:center;margin:0 0 14px;">
      Todavía no tiene calificaciones. ¡Sé el primero en calificar!
    </p>`
  }

  // Formulario
  if(uid && !esSí && !yaCal){
    estrellaReview = 0
    html += `<div class="form-review">
      <h4 style="margin:0 0 10px;"><i class="fa-solid fa-pen"></i> Calificá a ${nombre}</h4>
      <p style="font-size:13px;color:#64748b;margin:0 0 10px;">Tu opinión importa. Ayudás a la comunidad y al profesional.</p>
      <div class="stars-input" id="starsRevModal">
        ${[1,2,3,4,5].map(i=>`<i class="fa-solid fa-star"
          onclick="setRevStar(${i})"
          onmouseover="hovRevStar(${i})"
          onmouseout="resRevStar()"></i>`).join("")}
      </div>
      <textarea id="comentarioRev" rows="3"
        placeholder="Contá tu experiencia: ¿fue puntual? ¿el trabajo quedó bien? ¿lo recomendarías? (opcional)"
        style="width:100%;border:1px solid #bfdbfe;border-radius:8px;padding:10px;font-size:13px;resize:vertical;box-sizing:border-box;margin-bottom:10px;font-family:inherit;"></textarea>
      <div id="msgRev"></div>
      <button class="btn btn-primary btn-sm" onclick="enviarReview('${profileId}','${nombre}')">
        <i class="fa-solid fa-paper-plane"></i> Enviar calificación
      </button>
    </div>`
  } else if(!uid){
    html += `<div style="background:#eff6ff;border-radius:8px;padding:12px 16px;text-align:center;margin-top:10px;">
      <p style="margin:0 0 8px;font-size:14px;color:#1e40af;">
        <i class="fa-solid fa-star" style="color:#f59e0b;"></i>
        <strong> ¿Trabajaste con esta persona?</strong>
      </p>
      <p style="margin:0 0 10px;font-size:13px;color:#475569;">Iniciá sesión y dejá tu calificación — ayuda a toda la comunidad.</p>
      <a href="/login.html" class="btn btn-primary btn-sm" style="text-decoration:none;">
        <i class="fa-solid fa-right-to-bracket"></i> Iniciá sesión para calificar
      </a>
    </div>`
  } else if(yaCal){
    html += `<p style="font-size:13px;color:#16a34a;text-align:center;margin-top:10px;">
      <i class="fa-solid fa-check-circle"></i> Ya calificaste a esta persona — ¡gracias!
    </p>`
  }

  sec.innerHTML = html
}

window.setRevStar = function(n){
  estrellaReview = n
  document.querySelectorAll("#starsRevModal i").forEach((el,i) => el.classList.toggle("lit", i < n))
}
window.hovRevStar = function(n){
  document.querySelectorAll("#starsRevModal i").forEach((el,i) => el.classList.toggle("lit", i < n))
}
window.resRevStar = function(){
  document.querySelectorAll("#starsRevModal i").forEach((el,i) => el.classList.toggle("lit", i < estrellaReview))
}

window.enviarReview = async function(profileId, nombre){
  const msg = document.getElementById("msgRev")
  if(!estrellaReview){
    msg.innerHTML = `<div class="alerta alerta-err" style="font-size:13px;padding:8px 12px;">Elegí una puntuación antes de enviar</div>`
    return
  }
  const token  = getAccessToken()
  const autorId = getCurrentUserId()
  if(!token || !autorId){
    msg.innerHTML = `<div class="alerta alerta-err" style="font-size:13px;padding:8px 12px;">Necesitás iniciar sesión</div>`
    return
  }

  msg.innerHTML = `<div style="font-size:13px;color:#64748b;"><i class="fa-solid fa-spinner fa-spin"></i> Enviando...</div>`

  try {
    const res = await fetch(`${SB_URL}/rest/v1/reviews`, {
      method: "POST",
      headers: { ...SB_HEADERS, "Authorization": `Bearer ${token}`, "Content-Type": "application/json", "Prefer": "return=minimal" },
      body: JSON.stringify({
        trabajador_id: profileId,
        autor_id:      autorId,
        rating:        estrellaReview,
        comentario:    document.getElementById("comentarioRev").value.trim(),
        tipo:          "servicio"
      })
    })
    if(!res.ok){ const err = await res.json(); throw new Error(err.message || "Error al enviar") }

    document.querySelector(".form-review").innerHTML =
      `<div class="alerta alerta-ok"><i class="fa-solid fa-check-circle"></i> ¡Gracias! Tu calificación fue enviada. Ayudás a toda la comunidad.</div>`

    setTimeout(() => cargarReviews(profileId, nombre), 900)
  } catch(e){
    msg.innerHTML = `<div class="alerta alerta-err" style="font-size:13px;padding:8px 12px;">${e.message}</div>`
  }
}

/* ── CERRAR MODAL ── */

window.cerrarModal = function(){
  document.getElementById("modalOverlay").classList.remove("activo")
  document.body.style.overflow = ""
  if(mapModal){ mapModal.remove(); mapModal = null }
}
window.cerrarModalClick = function(e){
  if(e.target === document.getElementById("modalOverlay")) cerrarModal()
}
document.addEventListener("keydown", e => { if(e.key === "Escape") cerrarModal() })
