import { supabase } from "./supabase.js"

const ARGENTINA = [-38.4, -63.6]

/* ── Mensaje WA personalizado ── */
let _miNombreMapa = null
async function getMiNombreMapa(){
  if(_miNombreMapa !== null) return _miNombreMapa
  const { data: { user } } = await supabase.auth.getUser()
  if(!user){ _miNombreMapa = ""; return "" }
  try {
    const { data } = await supabase.from("perfiles").select("nombre").eq("id", user.id).single()
    _miNombreMapa = data?.nombre || ""
  } catch(e){ _miNombreMapa = "" }
  return _miNombreMapa
}

function waLinkMapa(movil, destNombre, destCategoria){
  const num = (movil||"").replace(/\D/g,""); if(!num) return null
  let msg = "Hola"
  if(_miNombreMapa) msg += `, me llamo ${_miNombreMapa}`
  msg += `! Me comunico con vos porque vi tu perfil`
  if(destNombre) msg += ` de ${destNombre}`
  if(destCategoria) msg += ` (${destCategoria})`
  msg += ` en Trabajos Cerca. 👋`
  return `https://wa.me/${num}?text=${encodeURIComponent(msg)}`
}

const map = L.map("map").setView(ARGENTINA, 5)

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "© OpenStreetMap"
}).addTo(map)

/* ── Cache de items para el modal ── */
const _itemsCache = {}

/* ── Icono naranja personalizado ── */
const iconoNaranja = L.divIcon({
  className: "",
  html: `<div style="background:#f97316;width:34px;height:34px;border-radius:50% 50% 50% 0;
    transform:rotate(-45deg);border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);"></div>`,
  iconSize: [34, 34],
  iconAnchor: [17, 34],
  popupAnchor: [0, -36]
})

async function cargarProfesionales(){
  await getMiNombreMapa()

  const { data, error } = await supabase
    .from("servicios")
    .select(`id, categoria, titulo, descripcion, servicios_lista, horarios, localidad, provincia, lat, lng,
      perfiles(id, nombre, apellido, nombre_empresa, mostrar_como, mostrar_telefono, movil, foto, lat, lng)`)
    .eq("activo", true)

  if(error){ console.error("[mapa] Error Supabase:", error); return }
  if(!data?.length){ console.warn("[mapa] Sin datos"); return }

  let mostrados = 0
  data.forEach(item => {
    const p = item.perfiles
    if(!p) return

    // Usar lat/lng del servicio; si no tiene, usar lat/lng del perfil
    const lat = item.lat ?? p.lat
    const lng = item.lng ?? p.lng
    if(!lat || !lng) return   // sin coordenadas: no se puede mostrar en el mapa

    const nombre = (p.mostrar_como === "empresa" && p.nombre_empresa)
      ? p.nombre_empresa
      : `${p.nombre||""} ${p.apellido||""}`.trim()

    const mostrarTel = p.mostrar_telefono !== false
    const wa = mostrarTel ? waLinkMapa(p.movil, nombre, item.categoria) : null

    // Enriquecer item con coordenadas resueltas para usarlas en el popup/modal
    item._lat = lat
    item._lng = lng

    /* Guardar en cache indexado por el id del servicio (siempre disponible) */
    _itemsCache[item.id] = { item, p, nombre, wa }

    const fotoHtml = p.foto
      ? `<img src="${p.foto}" class="popup-foto">`
      : `<span class="popup-foto-placeholder"><i class="fa-solid fa-user"></i></span>`

    const popup = `
      <div style="display:flex;align-items:center;margin-bottom:8px;">
        ${fotoHtml}
        <div>
          <p class="popup-nombre">${nombre}</p>
          <p class="popup-cat"><i class="fa-solid fa-tools" style="font-size:11px;"></i> ${item.categoria}</p>
        </div>
      </div>
      <p class="popup-ubic"><i class="fa-solid fa-location-dot"></i> ${item.localidad || ""}${item.provincia ? ", " + item.provincia : ""}</p>
      <div class="popup-acciones">
        ${wa ? `<a href="${wa}" target="_blank" rel="noopener" class="popup-btn popup-btn-wa"><i class="fa-brands fa-whatsapp"></i> WhatsApp</a>` : ""}
        <button onclick="verPerfilModal('${item.id}')" class="popup-btn popup-btn-perfil" style="cursor:pointer;border:none;">
          <i class="fa-solid fa-eye"></i> Ver perfil
        </button>
      </div>`

    L.marker([lat, lng], { icon: iconoNaranja })
      .addTo(map)
      .bindPopup(popup, { maxWidth: 260 })
    mostrados++
  })

  actualizarContador(mostrados)
}

function actualizarContador(n){
  const el = document.getElementById("contador")
  el.style.display = "block"
  el.textContent = `${n} profesional${n !== 1 ? "es" : ""} en el mapa`
}

/* ══════════════════════════════════
   MODAL PERFIL DESDE MAPA
══════════════════════════════════ */
window.verPerfilModal = function(serviceId){
  const cached = _itemsCache[serviceId]; if(!cached) return
  const { item, p, nombre, wa } = cached

  const foto = p.foto
    ? `<img src="${p.foto}" style="width:86px;height:86px;border-radius:50%;object-fit:cover;border:3px solid #2563eb;">`
    : `<div style="width:86px;height:86px;border-radius:50%;background:#dbeafe;display:flex;align-items:center;justify-content:center;font-size:34px;color:#2563eb;"><i class="fa-solid fa-user"></i></div>`

  const tags = item.servicios_lista
    ? item.servicios_lista.split(",").map(s=>`<span class="servicio-tag">${s.trim()}</span>`).join("") : ""

  const ubic = `${item.localidad||""}${item.provincia?", "+item.provincia:""}`

  document.getElementById("mapaPerfilContent").innerHTML = `
    <div style="text-align:center;margin-bottom:18px;">
      ${foto}
      <h2 style="margin:12px 0 3px;font-size:21px;">${nombre}</h2>
      <p style="margin:0;color:#f97316;font-weight:700;font-size:15px;">${item.categoria}</p>
      <p style="margin:5px 0 0;color:#64748b;font-size:13px;"><i class="fa-solid fa-location-dot"></i> ${ubic}</p>
      <div id="badgeReviewsMapa" style="margin-top:10px;"></div>
    </div>
    ${tags?`<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px;">${tags}</div>`:""}
    ${item.horarios?`<div style="background:#f8fafc;border-radius:8px;padding:10px 14px;margin-bottom:12px;">
      <p style="margin:0;font-size:14px;"><i class="fa-solid fa-clock" style="color:#2563eb;"></i> <strong>Horarios:</strong> ${item.horarios}</p></div>`:""}
    ${item.descripcion?`<p style="font-size:14px;color:#475569;line-height:1.6;margin:0 0 14px;">${item.descripcion}</p>`:""}
    ${wa?`<a href="${wa}" target="_blank" rel="noopener"
      style="display:flex;justify-content:center;align-items:center;gap:9px;background:#25D366;color:white;padding:13px;border-radius:10px;font-weight:700;font-size:15px;text-decoration:none;margin-bottom:12px;">
      <i class="fa-brands fa-whatsapp" style="font-size:18px;"></i> Contactar por WhatsApp</a>`:""}
    <div id="reviewsModalMapa" style="margin-top:16px;">
      <div style="text-align:center;padding:14px;color:#94a3b8;">
        <i class="fa-solid fa-spinner fa-spin"></i> Cargando calificaciones...
      </div>
    </div>
  `

  document.getElementById("mapaPerfilModal").style.display = "flex"
  document.body.style.overflow = "hidden"

  if(p.id) cargarReviewsMapa(p.id)
}

window.cerrarMapaModal = function(){
  document.getElementById("mapaPerfilModal").style.display = "none"
  document.body.style.overflow = ""
}

document.addEventListener("keydown", e => { if(e.key === "Escape") window.cerrarMapaModal() })

async function cargarReviewsMapa(profileId){
  const sec = document.getElementById("reviewsModalMapa"); if(!sec) return
  try {
    const { data: reviews } = await supabase
      .from("reviews")
      .select("rating, comentario, created_at")
      .eq("trabajador_id", profileId)
      .neq("tipo", "cliente")
      .order("created_at", { ascending: false })
      .limit(5)

    if(!reviews?.length){
      sec.innerHTML = `<p style="text-align:center;font-size:13px;color:#94a3b8;margin:0;">Sin calificaciones aún. ¡Sé el primero!</p>`
      return
    }

    const total = reviews.reduce((a, r) => a + r.rating, 0)

    const badge = document.getElementById("badgeReviewsMapa")
    if(badge) badge.innerHTML = `
      <span style="display:inline-flex;align-items:center;gap:5px;background:#f97316;color:white;font-weight:800;font-size:15px;padding:4px 16px;border-radius:20px;">
        <i class="fa-solid fa-trophy" style="font-size:13px;"></i> ${total} pts
      </span>
      <span style="font-size:12px;color:#94a3b8;display:block;margin-top:3px;">
        ${reviews.length} calificación${reviews.length !== 1 ? "es" : ""}
      </span>`

    sec.innerHTML = `<h4 style="margin:0 0 10px;font-size:14px;color:#475569;font-weight:700;">
        <i class="fa-solid fa-trophy" style="color:#f59e0b;"></i> Calificaciones
      </h4>` +
      reviews.map(r => {
        const col = r.rating >= 7 ? "#16a34a" : r.rating >= 4 ? "#d97706" : "#dc2626"
        return `<div style="border:1px solid #e2e8f0;border-radius:8px;padding:10px 12px;margin-bottom:8px;">
          <span style="background:${col};color:white;font-weight:800;font-size:13px;padding:2px 10px;border-radius:20px;">${r.rating}/10</span>
          ${r.comentario ? `<p style="margin:6px 0 0;font-size:13px;color:#475569;font-style:italic;">"${r.comentario}"</p>` : ""}
        </div>`
      }).join("")
  } catch(e){
    const sec2 = document.getElementById("reviewsModalMapa")
    if(sec2) sec2.innerHTML = ""
  }
}

/* ── Ir a ciudad buscada ── */
window.irACiudad = async function(){
  const ciudad = document.getElementById("inputCiudad").value.trim()
  if(!ciudad) return
  try {
    const geo = await (await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(ciudad + ", Argentina")}&format=json&limit=1`
    )).json()
    if(!geo.length){ alert("No se encontró la ciudad"); return }
    map.setView([parseFloat(geo[0].lat), parseFloat(geo[0].lon)], 12)
  } catch(e){ console.error(e) }
}

/* ── Ir a mi ubicación ── */
window.miUbicacion = function(){
  if(!navigator.geolocation){ alert("Tu navegador no soporta geolocalización"); return }
  navigator.geolocation.getCurrentPosition(
    pos => map.setView([pos.coords.latitude, pos.coords.longitude], 14),
    ()  => alert("No se pudo obtener tu ubicación. Verificá los permisos del navegador.")
  )
}

/* ── Geolocalización automática al cargar ── */
function intentarGeolocalizacion(){
  if(!navigator.geolocation) return
  navigator.geolocation.getCurrentPosition(
    pos => map.setView([pos.coords.latitude, pos.coords.longitude], 13),
    ()  => {}
  )
}

cargarProfesionales()
intentarGeolocalizacion()
