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

let todosLosMarkers = []

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
    .select(`id, categoria, titulo, localidad, provincia, lat, lng,
      perfiles(id, nombre, apellido, movil, foto)`)
    .eq("activo", true)
    .not("lat", "is", null)
    .not("lng", "is", null)

  if(error || !data?.length) return

  todosLosMarkers = []

  data.forEach(item => {
    const p = item.perfiles
    if(!p) return

    const wa = waLinkMapa(p.movil, `${p.nombre} ${p.apellido}`.trim(), item.categoria)
    const fotoHtml = p.foto
      ? `<img src="${p.foto}" class="popup-foto">`
      : `<span class="popup-foto-placeholder"><i class="fa-solid fa-user"></i></span>`

    const popup = `
      <div style="display:flex;align-items:center;margin-bottom:8px;">
        ${fotoHtml}
        <div>
          <p class="popup-nombre">${p.nombre} ${p.apellido}</p>
          <p class="popup-cat"><i class="fa-solid fa-tools" style="font-size:11px;"></i> ${item.categoria}</p>
        </div>
      </div>
      <p class="popup-ubic"><i class="fa-solid fa-location-dot"></i> ${item.localidad || ""}${item.provincia ? ", " + item.provincia : ""}</p>
      <div class="popup-acciones">
        ${p.movil ? `<a href="${wa}" target="_blank" rel="noopener" class="popup-btn popup-btn-wa"><i class="fa-brands fa-whatsapp"></i> WhatsApp</a>` : ""}
        <a href="/perfil_publico.html?id=${p.id}" target="_blank" class="popup-btn popup-btn-perfil"><i class="fa-solid fa-eye"></i> Ver perfil</a>
      </div>`

    const mk = L.marker([item.lat, item.lng], { icon: iconoNaranja })
      .addTo(map)
      .bindPopup(popup, { maxWidth: 260 })

    todosLosMarkers.push({ marker: mk, lat: item.lat, lng: item.lng })
  })

  actualizarContador(data.length)
}

function actualizarContador(n){
  const el = document.getElementById("contador")
  el.style.display = "block"
  el.textContent = `${n} profesional${n !== 1 ? "es" : ""} en el mapa`
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
    pos => map.setView([pos.coords.latitude, pos.coords.longitude], 12),
    ()  => alert("No se pudo obtener tu ubicación")
  )
}

/* ── Al cargar: intentar geolocalización automática ── */
function intentarGeolocalizacion(){
  if(!navigator.geolocation) return
  navigator.geolocation.getCurrentPosition(
    pos => map.setView([pos.coords.latitude, pos.coords.longitude], 12),
    ()  => {}  // si el usuario deniega, queda el mapa de Argentina
  )
}

cargarProfesionales()
intentarGeolocalizacion()
