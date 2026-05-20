/* buscador.js — usa fetch directo a la REST API de Supabase (sin cliente JS) */

const SB_URL = "https://iqeiszkoifxgygoqvbem.supabase.co"
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxZWlzemtvaWZ4Z3lnb3F2YmVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyMTEzODIsImV4cCI6MjA5NDc4NzM4Mn0.qxt70TPbARPcMc8HhHx2A2QnfBvJLCrnrH4m36IcENs"
const SB_HEADERS = { "apikey": SB_KEY, "Authorization": `Bearer ${SB_KEY}` }

let mapModal = null

/* ── TÉRMINOS ── */

function verificarTerminos(){
  if(localStorage.getItem("tc_aceptados")){
    document.getElementById("modalTerminos").classList.remove("activo")
  }
}

window.aceptarTerminos = function(){
  localStorage.setItem("tc_aceptados", "1")
  document.getElementById("modalTerminos").classList.remove("activo")
  document.body.style.overflow = ""
}

verificarTerminos()

/* ── PARÁMETROS DE URL ── */

const params = new URLSearchParams(location.search)
const SECCION = params.get("seccion") // "oficios" | "profesionales" | null

const CATS_OFICIOS = new Set(["Albañilería","Plomería","Gasista","Electricista","Carpintería","Pintura","Jardinería","Herrería","Cerrajería","Limpieza","Mudanzas / Fletes","Refrigeración / Aire acondicionado","Informática / Reparaciones","Gastronomía","Mecánico Automotriz","Tapicería","Personal Trainer","Enfermero/a","Niñera / Cuidadora","Delivery / Mensajería","Planchado / Laundry"])
const CATS_PROF    = new Set(["Médico / Clínica","Odontólogo","Psicólogo / Terapia","Kinesiólogo","Nutricionista","Veterinario","Arquitecto","Abogado","Contador / Impositivo","Diseñador Gráfico","Fotógrafo","Profesor Particular","Peluquería / Estética"])

if(SECCION === "oficios"){
  document.title = "Buscador de Oficios — Trabajos Cerca"
  document.querySelector("h2").innerHTML = '<i class="fa-solid fa-hammer" style="color:#2563eb"></i> Buscador de Oficios'
} else if(SECCION === "profesionales"){
  document.title = "Buscador de Profesionales — Trabajos Cerca"
  document.querySelector("h2").innerHTML = '<i class="fa-solid fa-user-tie" style="color:#2563eb"></i> Buscador de Profesionales'
}

if(params.get("q"))      document.getElementById("buscar").value = params.get("q")
if(params.get("ciudad")) document.getElementById("ciudad").value = params.get("ciudad")
if(params.get("cat"))    document.getElementById("buscar").value = params.get("cat")

/* ── FILTROS RÁPIDOS ── */

window.filtrarCategoria = function(cat){
  document.getElementById("buscar").value = cat
  document.getElementById("ciudad").value = ""
  buscar()
}

/* ── BUSCAR ── */

window.buscar = async function(){
  const palabra = document.getElementById("buscar").value.trim()
  const ciudad  = document.getElementById("ciudad").value.trim()
  const cont    = document.getElementById("resultados")

  cont.innerHTML = `
    <div style="text-align:center; padding:40px; color:#64748b;">
      <i class="fa-solid fa-spinner fa-spin" style="font-size:28px;"></i><p>Buscando...</p>
    </div>`

  const select = "id,categoria,titulo,descripcion,servicios_lista,horarios,localidad,provincia,lat,lng,perfiles(id,nombre,apellido,movil,foto,localidad,provincia,instagram)"

  let url = `${SB_URL}/rest/v1/servicios?activo=eq.true&select=${encodeURIComponent(select)}&order=created_at.desc`

  if(palabra){
    const p = encodeURIComponent(`*${palabra}*`)
    url += `&or=(titulo.ilike.${p},categoria.ilike.${p},descripcion.ilike.${p})`
  }
  if(ciudad){
    url += `&localidad=ilike.*${encodeURIComponent(ciudad)}*`
  }

  let data, error
  try {
    const res = await fetch(url, { headers: SB_HEADERS })
    if(!res.ok){ const err = await res.json(); throw new Error(err.message || res.statusText) }
    data = await res.json()
  } catch(e){
    cont.innerHTML = `<div class="alerta alerta-err">Error al buscar: ${e.message}</div>`
    return
  }

  // Filtro de sección (oficios / profesionales)
  if(SECCION === "oficios")       data = data.filter(d => CATS_OFICIOS.has(d.categoria))
  if(SECCION === "profesionales") data = data.filter(d => CATS_PROF.has(d.categoria))

  if(!data?.length){
    cont.innerHTML = `
      <div style="text-align:center;padding:50px 20px;color:#64748b;">
        <i class="fa-solid fa-face-sad-tear" style="font-size:44px;opacity:0.3;display:block;margin-bottom:14px;"></i>
        <p style="font-size:16px;margin-bottom:8px;">No encontramos resultados.</p>
        <p><a href="/registro.html?tipo=profesional">¿Sos profesional? Publicá tu servicio gratis</a></p>
      </div>`
    return
  }

  cont.innerHTML = `<p style="color:#64748b;margin-bottom:16px;font-size:14px;">${data.length} resultado${data.length!==1?"s":""} encontrado${data.length!==1?"s":""}</p>`

  data.forEach(item => {
    const p = item.perfiles || {}

    const foto = p.foto
      ? `<img src="${p.foto}" style="width:70px;height:70px;border-radius:50%;object-fit:cover;border:2px solid #2563eb;flex-shrink:0;">`
      : `<div style="width:70px;height:70px;border-radius:50%;background:#dbeafe;display:flex;align-items:center;justify-content:center;font-size:26px;color:#2563eb;flex-shrink:0;"><i class="fa-solid fa-user"></i></div>`

    const wa = `https://wa.me/${(p.movil||"").replace(/\D/g,"")}`

    const card = document.createElement("div")
    card.className = "card"
    card.style.cssText = "cursor:pointer;transition:box-shadow 0.2s,transform 0.2s;"
    card.onmouseenter = () => { card.style.boxShadow="0 6px 20px rgba(0,0,0,0.13)"; card.style.transform="translateY(-2px)" }
    card.onmouseleave = () => { card.style.boxShadow=""; card.style.transform="" }
    card.onclick      = () => abrirModal(item)

    card.innerHTML = `
      <div style="display:flex;gap:14px;align-items:flex-start;">
        ${foto}
        <div style="flex:1;min-width:0;">
          <h3 style="margin:0 0 3px;font-size:17px;">${p.nombre||""} ${p.apellido||""}</h3>
          <p style="margin:0 0 3px;color:#f97316;font-weight:700;font-size:14px;">${item.categoria}</p>
          <p style="margin:0;font-size:13px;color:#64748b;">
            <i class="fa-solid fa-location-dot"></i>
            ${item.localidad||p.localidad||""}${item.provincia?", "+item.provincia:""}
          </p>
          ${item.horarios?`<p style="margin:4px 0 0;font-size:13px;color:#64748b;"><i class="fa-solid fa-clock"></i> ${item.horarios}</p>`:""}
        </div>
      </div>
      <div class="card-actions" style="margin-top:14px;">
        <button class="btn btn-outline btn-sm" onclick="event.stopPropagation();abrirModal(${JSON.stringify(item).replace(/"/g,'&quot;')})">
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

  document.getElementById("modalContent").innerHTML = `
    <div style="text-align:center;margin-bottom:20px;">
      ${foto}
      <h2 style="margin:10px 0 4px;font-size:22px;">${p.nombre||""} ${p.apellido||""}</h2>
      <p style="margin:0;color:#f97316;font-weight:700;font-size:16px;"><i class="fa-solid fa-tools"></i> ${item.categoria}</p>
      <p style="margin:4px 0 0;color:#64748b;font-size:14px;"><i class="fa-solid fa-location-dot"></i> ${ubic}</p>
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

    ${p.movil?`<a href="${wa}" target="_blank" rel="noopener" class="btn-whatsapp"
      style="display:flex;justify-content:center;margin-bottom:12px;">
      <i class="fa-brands fa-whatsapp"></i> Consultar por WhatsApp
    </a>`:""}

    ${p.instagram?`<a href="https://instagram.com/${(p.instagram||"").replace("@","")}" target="_blank" rel="noopener"
      style="display:flex;justify-content:center;align-items:center;gap:8px;margin-bottom:16px;padding:12px;border-radius:10px;background:linear-gradient(135deg,#833ab4,#fd1d1d,#fcb045);color:white;font-weight:600;font-size:15px;text-decoration:none;">
      <i class="fa-brands fa-instagram" style="font-size:18px;"></i> ${p.instagram}
    </a>`:""}

    ${(item.lat&&item.lng)?`
      <div>
        <p style="font-size:13px;font-weight:600;color:#475569;margin:0 0 6px;">
          <i class="fa-solid fa-map-location-dot" style="color:#2563eb;"></i> Zona de trabajo
        </p>
        <div id="mapaModal" class="modal-map"></div>
        <a href="https://www.google.com/maps?q=${item.lat},${item.lng}" target="_blank" rel="noopener"
          style="display:block;text-align:center;margin-top:8px;font-size:13px;">
          <i class="fa-solid fa-diamond-turn-right"></i> Abrir en Google Maps
        </a>
      </div>`:""}
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
}

window.cerrarModal = function(){
  document.getElementById("modalOverlay").classList.remove("activo")
  document.body.style.overflow = ""
  if(mapModal){ mapModal.remove(); mapModal = null }
}

window.cerrarModalClick = function(e){
  if(e.target === document.getElementById("modalOverlay")) cerrarModal()
}

document.addEventListener("keydown", e => { if(e.key === "Escape") cerrarModal() })

// Cargar todos al abrir (window.buscar ya está definido)
buscar()
