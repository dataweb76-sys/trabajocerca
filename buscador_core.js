/* buscador_core.js
   Usado por buscador_oficios.html y buscador_profesionales.html
   El tipo viene FIJO desde window._TC_TIPO definido en el HTML antes de cargar este script.
*/

const SB_URL = "https://iqeiszkoifxgygoqvbem.supabase.co"
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxZWlzemtvaWZ4Z3lnb3F2YmVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyMTEzODIsImV4cCI6MjA5NDc4NzM4Mn0.qxt70TPbARPcMc8HhHx2A2QnfBvJLCrnrH4m36IcENs"
const SB_HEADERS = { "apikey": SB_KEY, "Authorization": `Bearer ${SB_KEY}` }

// TIPO FIJO — definido por el HTML que carga este script
const TIPO = window._TC_TIPO  // "oficio" o "profesional"

// Provincia guardada (filtro global persistente)
const _PROV_FILTRO = localStorage.getItem('tc_provincia') || ''

let mapModal           = null
let ratingSeleccionado = 0
let _miNombre          = null
let _favoritosSet      = new Set()

/* ── CSS animación disponible ahora ── */
const styleDisp = document.createElement("style")
styleDisp.textContent = `@keyframes pulse-green { 0%,100%{box-shadow:0 0 0 0 rgba(34,197,94,.4)} 50%{box-shadow:0 0 0 6px rgba(34,197,94,0)} }`
document.head.appendChild(styleDisp)

/* ── AUTH ── */
function getAccessToken(){
  try { return JSON.parse(localStorage.getItem("sb-iqeiszkoifxgygoqvbem-auth-token"))?.access_token || null } catch(e){ return null }
}
function getCurrentUserId(){
  const t = getAccessToken(); if(!t) return null
  try { return JSON.parse(atob(t.split(".")[1])).sub || null } catch(e){ return null }
}

/* ── MI NOMBRE ── */
async function getMiNombre(){
  if(_miNombre !== null) return _miNombre
  const uid = getCurrentUserId()
  if(!uid){ _miNombre = ""; return "" }
  try {
    const res = await fetch(`${SB_URL}/rest/v1/perfiles?id=eq.${uid}&select=nombre`, { headers: SB_HEADERS })
    if(res.ok){ const d = await res.json(); _miNombre = d?.[0]?.nombre || "" }
  } catch(e){ _miNombre = "" }
  return _miNombre
}

/* ── FAVORITOS ── */
async function cargarFavoritos(){
  const userId = getCurrentUserId()
  if(!userId) return
  const token = getAccessToken()
  try {
    const res = await fetch(`${SB_URL}/rest/v1/favoritos?usuario_id=eq.${userId}&select=profesional_id`,
      { headers: { ...SB_HEADERS, "Authorization": `Bearer ${token}` } })
    if(res.ok){
      const rows = await res.json()
      _favoritosSet = new Set(rows.map(r => r.profesional_id))
    }
  } catch(e){}
}

function waLink(movil, destNombre, destCategoria){
  const num = (movil||"").replace(/\D/g,"")
  if(!num) return null
  let msg = "Hola"
  if(_miNombre) msg += `, me llamo ${_miNombre}`
  msg += "! Me comunico con vos porque vi tu perfil"
  if(destNombre) msg += ` de ${destNombre}`
  if(destCategoria) msg += ` (${destCategoria})`
  msg += " en Trabajos Cerca. 👋"
  return `https://wa.me/${num}?text=${encodeURIComponent(msg)}`
}

/* ── PUNTAJE ── */
function colorPunto(n){ return n <= 3 ? "#dc2626" : n <= 6 ? "#d97706" : "#16a34a" }
function clasePunto(n){ return n <= 3 ? "r-bad" : n <= 6 ? "r-ok" : "r-good" }
function puntajeCardHTML(total, count){
  if(!count) return `<span style="color:#94a3b8;font-size:12px;">Sin calificaciones aún</span>`
  return `<span class="puntos-badge"><i class="fa-solid fa-trophy" style="font-size:11px;"></i> ${total} pts</span>
    <span style="font-size:12px;color:#94a3b8;margin-left:4px;">(${count} calif.)</span>`
}

/* ── HELPERS ── */
function displayName(p){
  return (p.mostrar_como === "empresa" && p.nombre_empresa)
    ? p.nombre_empresa
    : `${p.nombre||""} ${p.apellido||""}`.trim()
}
function puedeVerTel(p){ return p.mostrar_telefono !== false }

/* ── CATEGORÍAS POR TIPO ── */

// Emojis por nombre de categoría de oficio
const EMOJI_OFICIO = {
  'Albañilería':'🔨','Plomería':'💧','Gasista':'🔥','Electricidad':'⚡',
  'Carpintería':'🪚','Pintura':'🎨','Herrería':'⚙️','Cerrajería':'🔑',
  'Jardinería':'🌿','Limpieza':'🧹','Mudanzas y Fletes':'📦',
  'Refrigeración / AC':'❄️','Informática':'💻','Mecánica Automotriz':'🚗',
  'Tapicería':'🛋️','Techos e Impermeabilización':'🏠','Soldadura':'🔧',
  'Cadetería y Delivery':'🛵','Fotografía y Video':'📷',
  'Peluquería y Estética':'✂️','Costura y Modistería':'🧵',
  'Gastronomía y Catering':'🍳','Gestoría y Trámites':'📋',
  'Carnicería':'🥩','Personal Trainer':'💪',
  'Cuidado de personas':'❤️','Planchado y Lavandería':'👕',
  'Enfermería':'💊','Diseño':'🎭','Clases y Tutorías':'📚',
  'Mecánica del Hogar':'🔩',
}

// Defaults hardcodeados como fallback (se sobreescriben con DB)
let CHIPS_OFICIOS = [
  ["🟢","Disponible ahora"],
  ["🔨","Albañilería"],["💧","Plomería"],["🔥","Gasista"],["⚡","Electricidad"],
  ["🎨","Pintura"],["🪚","Carpintería"],["🌿","Jardinería"],["⚙️","Herrería"],
  ["🔑","Cerrajería"],["🧹","Limpieza"],["📦","Mudanzas y Fletes"],["❄️","Refrigeración / AC"],
  ["💻","Informática"],["🚗","Mecánica Automotriz"],["🛋️","Tapicería"],
  ["🏠","Techos e Impermeabilización"],["🔧","Soldadura"],["🛵","Cadetería y Delivery"],
  ["📷","Fotografía y Video"],["✂️","Peluquería y Estética"],["🧵","Costura y Modistería"],
  ["🍳","Gastronomía y Catering"],["📋","Gestoría y Trámites"],["🥩","Carnicería"],
  ["💪","Personal Trainer"],["❤️","Cuidado de personas"],["👕","Planchado y Lavandería"],
  ["💊","Enfermería"],["🎭","Diseño"],["📚","Clases y Tutorías"],["🔩","Mecánica del Hogar"]
]
const CHIPS_PROFESIONALES = [
  ["🟢","Disponible ahora"],
  ["🩺","Médico"],["🦷","Odontólogo"],["🧠","Psicólogo"],["🤸","Kinesiólogo"],
  ["🥗","Nutricionista"],["🐾","Veterinario"],["📐","Arquitecto"],["⚖️","Abogado"],
  ["📊","Contador"],["🏗️","Ingeniero"],["🖥️","Diseñador"],["📚","Profesor"],
  ["💼","Administración"],["📡","Comunicación"],["🔬","Biólogo/Químico"]
]

// Chips según página (let para poder actualizar desde DB)
let CHIPS = TIPO === "profesional" ? CHIPS_PROFESIONALES : [...CHIPS_OFICIOS]

/* ── Carga chips de oficios desde configuracion DB ── */
let _chipsOficioCargados = false
async function cargarChipsOficio() {
  if(TIPO !== "oficio" || _chipsOficioCargados) return
  _chipsOficioCargados = true
  try {
    const res = await fetch(
      `${SB_URL}/rest/v1/configuracion?select=valor&clave=eq.categorias_oficio`,
      { headers: SB_HEADERS }
    )
    if(!res.ok) return
    const arr = await res.json()
    const valor = arr?.[0]?.valor
    if(!valor || typeof valor !== "object") return
    // Convertir claves del objeto a chips [emoji, nombre]
    const nuevos = [
      ["🟢","Disponible ahora"],
      ...Object.keys(valor)
        .filter(n => n !== "Otro oficio")
        .map(n => [EMOJI_OFICIO[n] || "🔧", n]),
      ["🔧","Otro oficio"]
    ]
    CHIPS_OFICIOS = nuevos
    CHIPS = nuevos
  } catch(e) { console.warn("cargarChipsOficio:", e) }
}

/* ── Ciudades por provincia ── */
const CIUDADES_POR_PROVINCIA = {
  "Buenos Aires":       ["La Plata","Mar del Plata","Quilmes","Morón","San Isidro","Tigre","Lomas de Zamora","La Matanza","Moreno","Merlo","San Martín","Tres de Febrero","Bahía Blanca","Avellaneda","Lanús","Berazategui","Florencio Varela","Esteban Echeverría","Almirante Brown","Pilar","Tandil","San Nicolás","Campana","Zárate","Luján","Chivilcoy","Pergamino","Necochea","Olavarría","Azul","Junín","San Pedro","Bragado","Chascomús","Dolores","9 de Julio","Lincoln","Pehuajó","Trenque Lauquen","Coronel Suárez","General Pueyrredón","Ezeiza","Hurlingham","Ituzaingó","José C. Paz","Malvinas Argentinas","San Fernando","San Miguel","Vicente López","Brandsen","Ensenada","Berisso","Cañuelas","Balcarce","Miramar","Villa Gesell","Pinamar","Tandil","Bolívar"],
  "CABA":               ["Palermo","Belgrano","Caballito","Flores","Recoleta","Almagro","Villa Crespo","San Telmo","La Boca","Boedo","Barracas","Villa Devoto","Villa del Parque","Villa Urquiza","Saavedra","Núñez","Coghlan","Colegiales","Chacarita","Paternal","Villa Pueyrredón","Mataderos","Villa Lugano","Villa Soldati","Parque Patricios","Nueva Pompeya","Balvanera","Monserrat","San Nicolás","Retiro","Puerto Madero","San Cristóbal","Liniers","Floresta","Vélez Sársfield","Monte Castro","Versalles"],
  "Catamarca":          ["San Fernando del Valle de Catamarca","Andalgalá","Belén","Tinogasta","Santa María","Recreo","Frías","Fiambalá","Londres"],
  "Chaco":              ["Resistencia","Presidencia Roque Sáenz Peña","Barranqueras","Fontana","Villa Ángela","Charata","Las Breñas","Quitilipi","Puerto Tirol","Machagai"],
  "Chubut":             ["Comodoro Rivadavia","Rawson","Trelew","Puerto Madryn","Esquel","Sarmiento","Rada Tilly","Trevelin","El Maitén","Río Mayo"],
  "Córdoba":            ["Córdoba","Río Cuarto","Villa María","San Francisco","Villa Carlos Paz","Alta Gracia","Bell Ville","Río Tercero","Jesús María","La Calera","Unquillo","Río Ceballos","Marcos Juárez","Dean Funes","Laboulaye","Cruz del Eje","Villa Allende","Mendiolaza","Cosquín","La Falda","Mina Clavero","Oliva","Morteros","Leones","Monte Maíz","Huinca Renancó","Villa Nueva","General Cabrera"],
  "Corrientes":         ["Corrientes","Goya","Paso de los Libres","Mercedes","Curuzú Cuatiá","Santo Tomé","Bella Vista","Esquina","Ituzaingó","Monte Caseros","Saladas","Mburucuyá"],
  "Entre Ríos":         ["Paraná","Concordia","Gualeguaychú","Concepción del Uruguay","Gualeguay","Colón","Chajarí","Victoria","La Paz","Villaguay","San Salvador","Basavilbaso","Diamante","Nogoyá"],
  "Formosa":            ["Formosa","Clorinda","Pirané","El Colorado","Las Lomitas","Ingeniero Juárez"],
  "Jujuy":              ["San Salvador de Jujuy","Palpalá","San Pedro de Jujuy","El Carmen","Libertador General San Martín","La Quiaca","Tilcara","Humahuaca","Abra Pampa"],
  "La Pampa":           ["Santa Rosa","General Pico","Eduardo Castex","Realicó","Toay","Victorica","General Acha","Guatraché","Macachín","Winifreda","Catriló","Rancul"],
  "La Rioja":           ["La Rioja","Chilecito","Aimogasta","Chamical","Chepes","Vinchina","Famatina","Patquía"],
  "Mendoza":            ["Mendoza","Godoy Cruz","Guaymallén","Las Heras","Maipú","Luján de Cuyo","San Rafael","San Martín","Rivadavia","Tunuyán","Malargüe","Junín","General Alvear","La Paz","Santa Rosa"],
  "Misiones":           ["Posadas","Eldorado","Puerto Iguazú","Oberá","Apóstoles","Leandro N. Alem","Puerto Rico","Wanda","Montecarlo","San Vicente","Aristóbulo del Valle"],
  "Neuquén":            ["Neuquén","Plottier","Cipolletti","Cutral Có","Plaza Huincul","Junín de los Andes","San Martín de los Andes","Villa La Angostura","Zapala","Centenario","Las Lajas"],
  "Río Negro":          ["Viedma","Bariloche","General Roca","Cipolletti","Allen","Catriel","El Bolsón","Villa Regina","Cinco Saltos","Choele Choel","Ingeniero Huergo"],
  "Salta":              ["Salta","San Ramón de la Nueva Orán","Tartagal","General Güemes","Metán","Rosario de la Frontera","Cafayate","Joaquín V. González","Embarcación","Aguaray"],
  "San Juan":           ["San Juan","Rawson","Chimbas","Santa Lucía","Rivadavia","Pocito","Caucete","9 de Julio","Zonda","Angaco","Albardón"],
  "San Luis":           ["San Luis","Villa Mercedes","Justo Daract","Quines","Mercedes","Tilisarao","La Toma","Concarán","Buena Esperanza"],
  "Santa Cruz":         ["Río Gallegos","Caleta Olivia","Pico Truncado","El Calafate","Puerto Deseado","Las Heras","Puerto Santa Cruz","El Chaltén","Río Turbio"],
  "Santa Fe":           ["Rosario","Santa Fe","Rafaela","Reconquista","Santo Tomé","Venado Tuerto","Villa Constitución","Casilda","Cañada de Gómez","Esperanza","Firmat","San Lorenzo","Gálvez","Rufino","Vera","Avellaneda","Ceres","Sunchales","Las Rosas","Pérez","Granadero Baigorria","Funes"],
  "Santiago del Estero":["Santiago del Estero","La Banda","Termas de Río Hondo","Añatuya","Frías","Quimilí","Loreto","Monte Quemado","Selva","Clodomira"],
  "Tierra del Fuego":   ["Ushuaia","Río Grande","Tolhuin"],
  "Tucumán":            ["San Miguel de Tucumán","Tafí Viejo","Banda del Río Salí","Yerba Buena","Concepción","Monteros","Aguilares","Famaillá","Alberdi","Bella Vista","Río Chico","Lules"]
}

// Nombres de categorías normalizados (sin tildes, minúsculas)
function normStr(s){
  return (s||"").toLowerCase()
    .replace(/á/g,"a").replace(/é/g,"e").replace(/í/g,"i")
    .replace(/ó/g,"o").replace(/ú/g,"u").replace(/ü/g,"u").replace(/ñ/g,"n")
}
// Listas de categorías normalizadas (let — se recalculan tras carga de DB)
const CATS_PROF   = CHIPS_PROFESIONALES.slice(1).map(([,c]) => normStr(c))
let   CATS_OFICIO = CHIPS_OFICIOS.slice(1).map(([,c]) => normStr(c))

// ¿Este item es de un profesional universitario?
// REGLA: la categoría del servicio manda sobre el campo tipo,
// porque hay usuarios viejos con tipo='profesional' que son oficios.
function esProfesionalUni(item){
  const cat  = normStr(item.categoria || '')
  const tipo = item.perfiles?.tipo

  // 1. Si la categoría coincide con una categoría de OFICIO → siempre oficio
  if(cat && CATS_OFICIO.some(c => cat.includes(c) || c.includes(cat))) return false

  // 2. Si la categoría coincide con una categoría PROFESIONAL → siempre profesional
  if(cat && CATS_PROF.some(c => cat.includes(c) || c.includes(cat))) return true

  // 3. Categoría ambigua o vacía → usar campo tipo si está bien seteado
  if(tipo === "profesional") return true
  if(tipo === "oficio" || tipo === "emprendimiento" || tipo === "empresa" || tipo === "cv") return false

  // 4. Sin tipo y sin categoría reconocida → no mostrar en ninguno
  return false
}

/* ── SELECTOR DE CIUDAD (según provincia elegida) ── */
function inicializarCiudadInput(){
  const el = document.getElementById("ciudad")
  if(!el || !_PROV_FILTRO) return
  const ciudades = CIUDADES_POR_PROVINCIA[_PROV_FILTRO]
  if(!ciudades?.length) return

  const sel = document.createElement("select")
  sel.id        = "ciudad"
  sel.className = "ciudad-select"
  sel.onchange  = () => window.buscar()
  sel.innerHTML = `<option value="">📍 Todas las ciudades</option>` +
    ciudades.map(c => `<option value="${c}">${c}</option>`).join("")
  el.parentNode.replaceChild(sel, el)

  // Actualizar label
  const lbl = el.closest("div")?.querySelector("label") || sel.closest("div")?.querySelector("label")
  if(lbl) lbl.textContent = `Ciudad (${_PROV_FILTRO})`
}

/* ── POBLAR SELECT PRINCIPAL DE BÚSQUEDA ── */
function inicializarBuscarSelect(){
  const el = document.getElementById("buscar")
  if(!el || el.tagName !== "SELECT") return
  const placeholder = el.options[0]?.text || "— Elegí una categoría —"
  el.innerHTML = `<option value="">${placeholder}</option>` +
    CHIPS.map(([ico, cat]) => `<option value="${cat}">${ico} ${cat}</option>`).join("")
  el.onchange = () => {
    // Al cambiar categoría, resetear ciudad y buscar
    const c = document.getElementById("ciudad")
    if(c) c.value = ""
    buscar()
    document.getElementById("resultados")?.scrollIntoView({ behavior:"smooth", block:"start" })
  }
}

/* ── SELECTOR DE CATEGORÍA (chips — fallback si existe el contenedor) ── */
function renderChips(){
  const cont = document.getElementById("chipsCategoria"); if(!cont) return
  cont.innerHTML = `
    <select class="cat-select" onchange="if(this.value){ filtrarCategoria(this.value); this.value='' }">
      <option value="">— Elegí una categoría —</option>
      ${CHIPS.map(([ico, cat]) => `<option value="${cat}">${ico} ${cat}</option>`).join("")}
    </select>`
}

/* ── FILTRO RÁPIDO ── */
window.filtrarCategoria = function(cat){
  document.getElementById("buscar").value = cat
  document.getElementById("ciudad").value = ""
  buscar()
  document.getElementById("resultados").scrollIntoView({ behavior:"smooth", block:"start" })
}

/* ═══════════════════════════════════════════
   BUSCAR
═══════════════════════════════════════════ */
window.buscar = async function(){
  // Cargar categorías desde DB (solo la primera vez)
  await cargarChipsOficio()
  CATS_OFICIO = CHIPS_OFICIOS.slice(1).map(([,c]) => normStr(c))

  const palabra = document.getElementById("buscar").value.trim()
  const ciudad  = document.getElementById("ciudad").value.trim()
  const cont    = document.getElementById("resultados")

  cont.innerHTML = `<div style="text-align:center;padding:40px;color:#64748b;">
    <i class="fa-solid fa-spinner fa-spin" style="font-size:28px;"></i><p>Buscando...</p></div>`

  const select = "id,categoria,titulo,descripcion,servicios_lista,horarios,localidad,provincia,lat,lng,disponible_ahora,perfiles(id,tipo,nombre,apellido,nombre_empresa,mostrar_como,mostrar_telefono,movil,foto,localidad,provincia,instagram,destacado,verificado,profesion_universitaria,plan_nivel)"
  let url = `${SB_URL}/rest/v1/servicios?activo=eq.true&select=${encodeURIComponent(select)}&order=created_at.desc&limit=500`

  if(palabra && palabra === "Disponible ahora"){
    url += `&disponible_ahora=eq.true`
  } else if(palabra){
    const p=encodeURIComponent(`*${palabra}*`); url+=`&or=(titulo.ilike.${p},categoria.ilike.${p},descripcion.ilike.${p},servicios_lista.ilike.${p})`
  }
  if(ciudad)       url+=`&localidad=ilike.*${encodeURIComponent(ciudad)}*`
  if(_PROV_FILTRO) url+=`&provincia=ilike.*${encodeURIComponent(_PROV_FILTRO)}*`

  let data
  try {
    const res = await fetch(url, { headers: SB_HEADERS })
    if(!res.ok){ const e=await res.json(); throw new Error(e.message||res.statusText) }
    data = await res.json()
  } catch(e){
    cont.innerHTML=`<div class="alerta alerta-err">Error al buscar: ${e.message}</div>`
    return
  }

  // ── FILTRO PRINCIPAL ──
  if(TIPO === "profesional"){
    data = data.filter(d => {
      const tipos = (d.perfiles?.tipo || "").split(",").map(t => t.trim())
      // CSV multi-tipo: si tiene "profesional" explícito en su lista
      if(tipos.length > 1 && tipos.includes("profesional")) return true
      // Lógica original por categoría (backwards compatible)
      return esProfesionalUni(d)
    })
  } else {
    // Buscador de oficios
    data = data.filter(d => {
      const tipos = (d.perfiles?.tipo || "").split(",").map(t => t.trim())
      const tipoPrimario = tipos[0]
      // CSV multi-tipo: si tiene "oficio" explícito en su lista adicional
      if(tipos.length > 1 && tipos.includes("oficio")) return true
      // Lógica original: excluir empresa/emprendimiento/cv y profesionales
      if(tipoPrimario === "empresa" || tipoPrimario === "emprendimiento" || tipoPrimario === "cv") return false
      return !esProfesionalUni(d)
    })
  }

  if(!data?.length){
    const linkReg = `/registro.html`
    cont.innerHTML=`<div style="text-align:center;padding:50px 20px;color:#64748b;">
      <i class="fa-solid fa-face-sad-tear" style="font-size:44px;opacity:.3;display:block;margin-bottom:14px;"></i>
      <p style="font-size:16px;margin-bottom:8px;">No encontramos resultados${palabra?` para <strong>${palabra}</strong>`:""}.</p>
      <p><a href="${linkReg}">¿Querés aparecer acá? Registrate gratis</a></p></div>`
    return
  }

  await getMiNombre()
  await cargarFavoritos()

  /* ── Puntajes ── */
  const profileIds = data.map(d=>d.perfiles?.id).filter(Boolean)
  let puntajesMap = {}
  if(profileIds.length){
    try {
      const rRes = await fetch(
        `${SB_URL}/rest/v1/reviews?trabajador_id=in.(${profileIds.join(",")})&tipo=neq.cliente&select=trabajador_id,rating`,
        { headers: SB_HEADERS }
      )
      if(rRes.ok){
        const revs = await rRes.json()
        revs.forEach(r => {
          if(!puntajesMap[r.trabajador_id]) puntajesMap[r.trabajador_id] = { total:0, count:0 }
          puntajesMap[r.trabajador_id].total += r.rating
          puntajesMap[r.trabajador_id].count++
        })
      }
    } catch(e){}
  }

  data.forEach(item => {
    const pid = item.perfiles?.id
    const pd  = pid ? (puntajesMap[pid] || { total:0, count:0 }) : { total:0, count:0 }
    item._puntos = pd.total
    item._count  = pd.count
  })
  data.sort((a,b) => {
    const da = a.perfiles?.destacado ? 1 : 0
    const db = b.perfiles?.destacado ? 1 : 0
    if(db !== da) return db - da
    return b._puntos - a._puntos
  })

  const bannerProv = _PROV_FILTRO
    ? `<div style="background:#eff6ff;border:1.5px solid #bfdbfe;border-radius:10px;padding:10px 16px;margin-bottom:14px;display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;">
        <span style="font-size:13px;color:#1d4ed8;font-weight:700;">
          <i class="fa-solid fa-location-dot"></i> Mostrando resultados en: <strong>${_PROV_FILTRO}</strong>
        </span>
        <a href="/index.html" style="font-size:12px;color:#64748b;text-decoration:underline;">Cambiar provincia</a>
       </div>`
    : ''

  cont.innerHTML = bannerProv + `
    <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:12px 16px;margin-bottom:18px;display:flex;align-items:center;gap:10px;">
      <i class="fa-solid fa-trophy" style="color:#f59e0b;font-size:20px;flex-shrink:0;"></i>
      <p style="margin:0;font-size:13px;color:#92400e;">
        <strong>¿Usaste un servicio?</strong> Calificá del 1 al 10 — cada punto suma al puntaje y ayuda a aparecer primero.
      </p>
    </div>
    <p style="color:#64748b;margin-bottom:16px;font-size:14px;">
      ${data.length} resultado${data.length!==1?"s":""} · ordenados por puntaje${_PROV_FILTRO ? ` · ${_PROV_FILTRO}` : ""}
    </p>`

  data.forEach(item => {
    const p      = item.perfiles || {}
    const nombre = displayName(p)
    const wa     = puedeVerTel(p) ? waLink(p.movil, nombre, item.categoria) : null

    const foto = p.foto
      ? `<img src="${p.foto}" style="width:70px;height:70px;border-radius:50%;object-fit:cover;border:2px solid #2563eb;flex-shrink:0;">`
      : `<div style="width:70px;height:70px;border-radius:50%;background:#dbeafe;display:flex;align-items:center;justify-content:center;font-size:26px;color:#2563eb;flex-shrink:0;"><i class="fa-solid fa-user"></i></div>`

    const badgeDest = p.destacado
      ? `<span style="display:inline-flex;align-items:center;gap:3px;background:#f59e0b;color:white;font-size:10px;font-weight:700;padding:2px 7px;border-radius:20px;margin-bottom:3px;"><i class="fa-solid fa-crown" style="font-size:9px;"></i> DESTACADO</span>`
      : ""
    const badgeVerif = p.verificado
      ? `<span style="display:inline-flex;align-items:center;gap:3px;background:#0ea5e9;color:white;font-size:10px;font-weight:700;padding:2px 7px;border-radius:20px;margin-bottom:3px;"><i class="fa-solid fa-circle-check" style="font-size:9px;"></i> VERIFICADO</span>`
      : ""
    const badgePortfolio = (p.plan_nivel > 0 && p.tipo === "oficio")
      ? `<span style="display:inline-flex;align-items:center;gap:3px;background:#f97316;color:white;font-size:10px;font-weight:700;padding:2px 7px;border-radius:20px;margin-bottom:3px;"><i class="fa-solid fa-images" style="font-size:9px;"></i> TRABAJOS REALIZADOS</span>`
      : ""
    const badgesLine = (badgeDest || badgeVerif || badgePortfolio) ? `<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:3px;">${badgeDest}${badgeVerif}${badgePortfolio}</div>` : ""

    const card = document.createElement("div")
    card.className = "card"
    card.style.cssText = `cursor:pointer;transition:box-shadow .2s,transform .2s;${p.destacado?"border:2px solid #f59e0b;":""}`
    card.onmouseenter = () => { card.style.boxShadow="0 6px 20px rgba(0,0,0,.13)"; card.style.transform="translateY(-2px)" }
    card.onmouseleave = () => { card.style.boxShadow=""; card.style.transform="" }
    card.onclick      = () => abrirModal(item)

    const profileId = p.id || ""

    card.innerHTML = `
      <div style="display:flex;gap:14px;align-items:flex-start;">
        <div style="position:relative;flex-shrink:0;">
          ${foto}
          ${item.disponible_ahora===true?`<span style="position:absolute;top:-2px;left:-2px;background:#22c55e;border-radius:50%;width:14px;height:14px;border:2px solid white;animation:pulse-green 2s infinite;" title="Disponible ahora"></span>`:""}
          ${p.destacado?`<span style="position:absolute;bottom:-3px;right:-3px;background:#f59e0b;border-radius:50%;width:18px;height:18px;display:flex;align-items:center;justify-content:center;"><i class="fa-solid fa-crown" style="font-size:9px;color:white;"></i></span>`:""}
          ${p.verificado?`<span style="position:absolute;top:-3px;right:-3px;background:#0ea5e9;border-radius:50%;width:18px;height:18px;display:flex;align-items:center;justify-content:center;" title="Perfil verificado"><i class="fa-solid fa-circle-check" style="font-size:10px;color:white;"></i></span>`:""}
        </div>
        <div style="flex:1;min-width:0;">
          ${badgesLine}
          <h3 style="margin:0 0 2px;font-size:17px;">${nombre}</h3>
          <p style="margin:0 0 4px;color:#f97316;font-weight:700;font-size:14px;">${item.categoria}</p>
          <div style="margin-bottom:4px;">${puntajeCardHTML(item._puntos, item._count)}</div>
          <p style="margin:0;font-size:13px;color:#64748b;">
            <i class="fa-solid fa-location-dot"></i>
            ${item.localidad||p.localidad||""}${item.provincia?", "+item.provincia:""}
            ${localStorage.getItem('tc_mapa_on')==='1'&&(item.localidad||p.localidad)?`<a href="https://www.google.com/maps/search/${encodeURIComponent((item.localidad||p.localidad)+(item.provincia?', '+item.provincia:'')+', Argentina')}" target="_blank" rel="noopener" onclick="event.stopPropagation()" style="margin-left:5px;font-size:11px;color:#2563eb;font-weight:700;text-decoration:none;white-space:nowrap;vertical-align:middle;"><i class="fa-solid fa-map-location-dot"></i> Ver en mapa</a>`:''}
          </p>
          ${item.horarios?`<p style="margin:3px 0 0;font-size:13px;color:#64748b;"><i class="fa-solid fa-clock"></i> ${item.horarios}</p>`:""}
        </div>
      </div>
      <div class="card-actions" style="margin-top:14px;">
        <button class="btn btn-outline btn-sm" onclick="event.stopPropagation();abrirModal(${JSON.stringify(item).replace(/"/g,"&quot;")})">
          <i class="fa-solid fa-eye"></i> Ver perfil
        </button>
        ${profileId?`<button onclick="event.stopPropagation();toggleFavorito('${profileId}',this)"
          style="background:${_favoritosSet.has(profileId)?'#fee2e2':'#f8fafc'};border:1.5px solid ${_favoritosSet.has(profileId)?'#fca5a5':'#e2e8f0'};border-radius:8px;padding:6px 10px;cursor:pointer;font-size:16px;transition:all .15s;"
          title="${_favoritosSet.has(profileId)?'Quitar de guardados':'Guardar'}">
          ${_favoritosSet.has(profileId)?'❤️':'🤍'}
        </button>`:""}
        ${wa?`<a href="${wa}" target="_blank" rel="noopener" onclick="event.stopPropagation()"
          class="btn btn-sm" style="background:#25D366;color:white;display:inline-flex;align-items:center;gap:6px;">
          <i class="fa-brands fa-whatsapp"></i> WhatsApp</a>`:""}
        ${getCurrentUserId()?`<button class="btn btn-sm" onclick="event.stopPropagation();abrirModal(${JSON.stringify(item).replace(/"/g,"&quot;")},true)"
          style="background:#eff6ff;color:#2563eb;display:inline-flex;align-items:center;gap:5px;">
          <i class="fa-solid fa-star"></i> Calificar</button>`:""}
        ${p.id && getCurrentUserId() !== p.id ? `<button class="btn btn-sm" onclick="event.stopPropagation();window.iniciarConversacion('${p.id}')"
          style="background:#f0fdf4;color:#16a34a;border:1.5px solid #bbf7d0;display:inline-flex;align-items:center;gap:5px;">
          <i class="fa-solid fa-comment-dots"></i> Mensaje</button>` : ""}
      </div>`

    cont.appendChild(card)
  })
}

/* ═══════════════════════════════════════════
   MODAL
═══════════════════════════════════════════ */
window.abrirModal = function(item, irCalificar=false){
  if(typeof item === "string") item = JSON.parse(item.replace(/&quot;/g,'"'))
  const p = item.perfiles || {}
  if(mapModal){ mapModal.remove(); mapModal = null }

  /* ── Registrar vista (no cuenta el propio profesional) ── */
  if(p.id && getCurrentUserId() !== p.id){
    fetch(`${SB_URL}/rest/v1/perfil_eventos`, {
      method: "POST",
      headers: { ...SB_HEADERS, "Content-Type": "application/json", "Prefer": "return=minimal" },
      body: JSON.stringify({ profesional_id: p.id, tipo: "vista" })
    }).catch(()=>{})
  }

  const foto = p.foto
    ? `<img src="${p.foto}" style="width:90px;height:90px;border-radius:50%;object-fit:cover;border:3px solid #2563eb;">`
    : `<div style="width:90px;height:90px;border-radius:50%;background:#dbeafe;display:flex;align-items:center;justify-content:center;font-size:36px;color:#2563eb;"><i class="fa-solid fa-user"></i></div>`

  const _dname = displayName(p)
  const wa     = puedeVerTel(p) ? waLink(p.movil, _dname, item.categoria) : null
  const ubic   = `${item.localidad||p.localidad||""}${item.provincia?", "+item.provincia:""}`
  const tags   = item.servicios_lista
    ? item.servicios_lista.split(",").map(s=>`<span class="servicio-tag">${s.trim()}</span>`).join("") : ""

  document.getElementById("modalContent").innerHTML = `
    <div style="text-align:center;margin-bottom:20px;">
      ${foto}
      <div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin:8px 0 2px;">
        ${p.destacado?`<div style="display:inline-flex;align-items:center;gap:5px;background:#f59e0b;color:white;font-size:12px;font-weight:700;padding:3px 12px;border-radius:20px;"><i class="fa-solid fa-crown"></i> PERFIL DESTACADO</div>`:""}
        ${p.verificado?`<div style="display:inline-flex;align-items:center;gap:5px;background:#0ea5e9;color:white;font-size:12px;font-weight:700;padding:3px 12px;border-radius:20px;"><i class="fa-solid fa-circle-check"></i> VERIFICADO</div>`:""}
      </div>
      <h2 style="margin:8px 0 4px;font-size:22px;">${_dname}</h2>
      ${item.disponible_ahora?`<div style="display:inline-flex;align-items:center;gap:5px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:20px;padding:3px 10px;font-size:12px;color:#16a34a;font-weight:700;margin-bottom:8px;"><span style="width:8px;height:8px;background:#22c55e;border-radius:50%;display:inline-block;"></span> Disponible ahora</div>`:""}
      <p style="margin:0;color:#f97316;font-weight:700;font-size:16px;"><i class="fa-solid fa-tools"></i> ${item.categoria}</p>
      <p style="margin:4px 0 0;color:#64748b;font-size:14px;"><i class="fa-solid fa-location-dot"></i> ${ubic}</p>
      <div style="margin-top:10px;" id="puntajeBadgeTop"></div>
    </div>
    ${item.titulo?`<p style="font-size:16px;font-weight:600;margin:0 0 14px;text-align:center;">${item.titulo}</p>`:""}
    ${tags?`<div style="margin-bottom:16px;"><p style="font-size:13px;font-weight:600;color:#475569;margin:0 0 8px;">Servicios:</p><div class="servicios-tags">${tags}</div></div>`:""}
    ${item.horarios?`<div style="background:#f8fafc;border-radius:8px;padding:12px 14px;margin-bottom:16px;">
      <p style="margin:0;font-size:14px;"><i class="fa-solid fa-clock" style="color:#2563eb;"></i><strong> Horarios:</strong> ${item.horarios}</p></div>`:""}
    ${item.descripcion?`<div style="margin-bottom:16px;">
      <p style="font-size:13px;font-weight:600;color:#475569;margin:0 0 6px;">Descripción:</p>
      <p style="font-size:14px;color:#475569;line-height:1.6;margin:0;">${item.descripcion}</p></div>`:""}
    <div id="portfolioModal" style="margin-bottom:4px;"></div>
    ${wa?`<a href="${wa}" target="_blank" rel="noopener" class="btn-whatsapp" onclick="registrarWAClick('${p.id}')" style="display:flex;justify-content:center;margin-bottom:12px;">
      <i class="fa-brands fa-whatsapp"></i> Consultar por WhatsApp</a>`:""}
    ${getCurrentUserId() && getCurrentUserId() !== p.id ? `<button onclick="window.iniciarConversacion && window.iniciarConversacion('${p.id}')"
      style="display:flex;align-items:center;justify-content:center;gap:8px;width:100%;padding:12px;margin-bottom:12px;border:1.5px solid #2563eb;border-radius:10px;background:white;color:#2563eb;font-weight:700;font-size:15px;cursor:pointer;">
      <i class="fa-solid fa-comment-dots"></i> Enviar mensaje</button>` : ""}
    ${p.instagram?`<a href="https://instagram.com/${(p.instagram||"").replace("@","")}" target="_blank" rel="noopener"
      style="display:flex;justify-content:center;align-items:center;gap:8px;margin-bottom:16px;padding:12px;border-radius:10px;background:linear-gradient(135deg,#833ab4,#fd1d1d,#fcb045);color:white;font-weight:600;font-size:15px;text-decoration:none;">
      <i class="fa-brands fa-instagram" style="font-size:18px;"></i> ${p.instagram}</a>`:""}
    ${(item.lat&&item.lng)?`<div style="margin-bottom:16px;">
      <p style="font-size:13px;font-weight:600;color:#475569;margin:0 0 6px;"><i class="fa-solid fa-map-location-dot" style="color:#2563eb;"></i> Zona de trabajo</p>
      <div id="mapaModal" class="modal-map"></div>
      <a href="https://www.google.com/maps?q=${item.lat},${item.lng}" target="_blank" rel="noopener"
        style="display:block;text-align:center;margin-top:8px;font-size:13px;">
        <i class="fa-solid fa-diamond-turn-right"></i> Abrir en Google Maps</a></div>`:""}
    <hr style="margin:20px 0;border:none;border-top:1px solid #e2e8f0;">
    <div id="reviewsSection">
      <div style="text-align:center;color:#94a3b8;padding:12px;"><i class="fa-solid fa-spinner fa-spin"></i></div>
    </div>`

  document.getElementById("modalOverlay").classList.add("activo")
  document.body.style.overflow = "hidden"

  if(item.lat && item.lng){
    setTimeout(() => {
      mapModal = L.map("mapaModal").setView([item.lat, item.lng], 14)
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(mapModal)
      L.marker([item.lat, item.lng]).addTo(mapModal)
        .bindPopup(`<b>${_dname}</b><br>${item.categoria}`).openPopup()
    }, 60)
  }

  if(p.id){
    cargarReviews(p.id, p.nombre||"este profesional", irCalificar)
    cargarPortfolioModal(p.id)
  }
}

/* ── PORTFOLIO ── */
async function cargarPortfolioModal(uid){
  const sec = document.getElementById("portfolioModal"); if(!sec) return
  try {
    const res = await fetch(`${SB_URL}/rest/v1/portfolio?usuario_id=eq.${uid}&select=titulo,descripcion,foto1,foto2,foto3&order=created_at.desc`,{ headers:SB_HEADERS })
    if(!res.ok) return
    const items = await res.json()
    if(!items?.length){ sec.innerHTML=""; return }
    let html=`<div style="margin-bottom:16px;"><p style="font-size:13px;font-weight:600;color:#475569;margin:0 0 10px;"><i class="fa-solid fa-images" style="color:#f97316;"></i> Trabajos realizados</p>`
    items.forEach(it=>{
      const fotos=[it.foto1,it.foto2,it.foto3].filter(Boolean)
      html+=`<div style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;margin-bottom:10px;">
        ${fotos.length?`<div style="display:flex;gap:2px;height:130px;background:#f1f5f9;">${fotos.map(f=>`<img src="${f}" style="flex:1;object-fit:cover;cursor:pointer;" onclick="window.open('${f}','_blank')">`).join("")}</div>`:""}
        <div style="padding:10px 12px;"><strong style="font-size:14px;">${it.titulo}</strong>${it.descripcion?`<p style="font-size:12px;color:#64748b;margin:2px 0 0;">${it.descripcion}</p>`:""}</div></div>`
    })
    html+=`</div>`; sec.innerHTML=html
  } catch(e){}
}

/* ── REVIEWS ── */
async function cargarReviews(profileId, nombre, autoAbrirForm=false){
  const sec = document.getElementById("reviewsSection"); if(!sec) return
  let reviews = []
  try {
    const res = await fetch(
      `${SB_URL}/rest/v1/reviews?trabajador_id=eq.${profileId}&tipo=neq.cliente&select=id,rating,comentario,created_at,autor_id&order=created_at.desc`,
      { headers: SB_HEADERS }
    )
    if(res.ok) reviews = await res.json()
  } catch(e){}

  const puntosTotal = reviews.reduce((a,b) => a+b.rating, 0)
  const count       = reviews.length
  const uid         = getCurrentUserId()
  const yaCal       = uid && reviews.some(r => r.autor_id === uid)
  const esSi        = uid === profileId

  const topEl = document.getElementById("puntajeBadgeTop")
  if(topEl && count > 0){
    topEl.innerHTML = `<span class="puntos-badge" style="font-size:15px;padding:5px 14px;">
      <i class="fa-solid fa-trophy"></i> ${puntosTotal} puntos
    </span>
    <span style="font-size:12px;color:#94a3b8;display:block;margin-top:3px;">${count} calificación${count!==1?"es":""}</span>`
  }

  let html = `<h3 style="margin:0 0 10px;font-size:16px;color:#1e293b;">
    <i class="fa-solid fa-trophy" style="color:#f59e0b;"></i> Puntaje y calificaciones</h3>`

  if(count > 0){
    html += `<div class="puntos-total-box">
      <div class="puntos-total-num">${puntosTotal}</div>
      <div class="puntos-total-label">puntos acumulados · ${count} calificación${count!==1?"es":""}</div>
    </div>`
    reviews.slice(0,5).forEach(rev => {
      const col = colorPunto(rev.rating)
      html += `<div class="review-item" style="margin-bottom:8px;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
          <span style="background:${col};color:white;font-weight:800;font-size:13px;padding:2px 9px;border-radius:20px;">${rev.rating}/10</span>
          ${rev.comentario?`<span style="font-size:13px;color:#475569;font-style:italic;">"${rev.comentario}"</span>`:""}
        </div>
      </div>`
    })
  } else {
    html += `<p style="font-size:13px;color:#94a3b8;text-align:center;margin:0 0 14px;">
      Todavía no tiene calificaciones. ¡Sé el primero!</p>`
  }

  if(uid && !esSi && !yaCal){
    html += `<button class="btn-calificar" id="btnCalificar" onclick="mostrarFormRating()">
        <i class="fa-solid fa-star"></i> Calificar a ${nombre}</button>
      <div id="formRating" style="display:${autoAbrirForm?"block":"none"};">`
    html += buildFormRating(profileId, nombre)
    html += `</div>`
  } else if(!uid){
    html += `<div style="background:#eff6ff;border-radius:10px;padding:14px 16px;text-align:center;margin-top:4px;">
      <p style="margin:0 0 6px;font-size:14px;color:#1e40af;"><strong>¿Usaste este servicio?</strong></p>
      <p style="margin:0 0 10px;font-size:13px;color:#475569;">Iniciá sesión y calificalo.</p>
      <a href="/login.html" class="btn btn-primary btn-sm" style="text-decoration:none;"><i class="fa-solid fa-right-to-bracket"></i> Iniciá sesión</a>
    </div>`
  } else if(yaCal){
    html += `<p style="font-size:13px;color:#16a34a;text-align:center;margin-top:10px;">
      <i class="fa-solid fa-check-circle"></i> Ya calificaste — ¡gracias!</p>`
  }

  sec.innerHTML = html
  if(autoAbrirForm && uid && !esSi && !yaCal){
    const btn = document.getElementById("btnCalificar")
    if(btn) btn.style.display = "none"
  }
}

function buildFormRating(profileId, nombre){
  ratingSeleccionado = 0
  return `<div class="form-review" style="margin-top:0;">
    <h4 style="margin:0 0 6px;"><i class="fa-solid fa-pen"></i> Tu calificación para ${nombre}</h4>
    <p style="font-size:13px;color:#64748b;margin:0 0 4px;">Seleccioná un puntaje del 1 al 10</p>
    <p style="font-size:11px;color:#94a3b8;margin:0 0 10px;">1 = Muy malo &nbsp;·&nbsp; 5-6 = Regular &nbsp;·&nbsp; 10 = Excelente</p>
    <div class="rating-10" id="rating10Btns">
      ${[1,2,3,4,5,6,7,8,9,10].map(i =>
        `<button class="rating-num ${clasePunto(i)}" onclick="seleccionarRating(${i})">${i}</button>`
      ).join("")}
    </div>
    <div id="ratingLabel" style="font-size:13px;color:#64748b;min-height:20px;margin-bottom:10px;"></div>
    <textarea id="comentarioRev" rows="3"
      placeholder="Contá tu experiencia (opcional)"
      style="width:100%;border:1px solid #bfdbfe;border-radius:8px;padding:10px;font-size:13px;resize:vertical;box-sizing:border-box;margin-bottom:10px;font-family:inherit;"></textarea>
    <div id="msgRev"></div>
    <button class="btn btn-primary btn-sm" onclick="enviarReview('${profileId}','${nombre}')">
      <i class="fa-solid fa-paper-plane"></i> Enviar calificación
    </button>
  </div>`
}

window.mostrarFormRating = function(){
  const btn=document.getElementById("btnCalificar"); const form=document.getElementById("formRating")
  if(btn) btn.style.display="none"; if(form) form.style.display="block"
}

const LABELS = {1:"Muy malo",2:"Malo",3:"Por debajo de lo esperado",4:"Regular",5:"Puede mejorar",6:"Aceptable",7:"Bueno",8:"Muy bueno",9:"Excelente",10:"¡Perfecto! Lo recomiendo"}

window.seleccionarRating = function(n){
  ratingSeleccionado = n
  document.querySelectorAll(".rating-num").forEach((el,i) => el.classList.toggle("selected", i < n))
  const lbl = document.getElementById("ratingLabel")
  if(lbl) lbl.innerHTML = `<span style="color:${colorPunto(n)};font-weight:700;">${n}/10 — ${LABELS[n]}</span>`
}

window.enviarReview = async function(profileId, nombre){
  const msg = document.getElementById("msgRev")
  if(!ratingSeleccionado){ msg.innerHTML=`<div class="alerta alerta-err" style="font-size:13px;padding:8px 12px;">Elegí un puntaje del 1 al 10</div>`; return }
  const token=getAccessToken(); const autorId=getCurrentUserId()
  if(!token||!autorId){ msg.innerHTML=`<div class="alerta alerta-err" style="font-size:13px;padding:8px 12px;">Necesitás iniciar sesión</div>`; return }
  msg.innerHTML=`<div style="font-size:13px;color:#64748b;"><i class="fa-solid fa-spinner fa-spin"></i> Enviando...</div>`
  try {
    const res = await fetch(`${SB_URL}/rest/v1/reviews`,{
      method:"POST",
      headers:{...SB_HEADERS,"Authorization":`Bearer ${token}`,"Content-Type":"application/json","Prefer":"return=minimal"},
      body:JSON.stringify({trabajador_id:profileId,autor_id:autorId,rating:ratingSeleccionado,comentario:document.getElementById("comentarioRev").value.trim(),tipo:"servicio"})
    })
    if(!res.ok){ const e=await res.json(); throw new Error(e.message||"Error") }
    // Crear notificación para el profesional calificado
    const comentario = document.getElementById("comentarioRev")?.value?.trim() || ""
    fetch(`${SB_URL}/rest/v1/notificaciones`, {
      method: "POST",
      headers: { ...SB_HEADERS, "Content-Type": "application/json", "Prefer": "return=minimal" },
      body: JSON.stringify({
        usuario_id: profileId,
        tipo: "review",
        titulo: `Recibiste una calificación de ${ratingSeleccionado}/10`,
        cuerpo: comentario ? `"${comentario.substring(0,80)}"` : `¡Alguien valoró tu trabajo!`,
        url: "/perfil.html"
      })
    }).catch(()=>{})
    document.querySelector(".form-review").innerHTML=
      `<div class="alerta alerta-ok"><i class="fa-solid fa-check-circle"></i> ¡Gracias! Sumaste <strong>${ratingSeleccionado} punto${ratingSeleccionado!==1?"s":""}</strong> al puntaje de ${nombre}.</div>`
    setTimeout(() => cargarReviews(profileId, nombre), 900)
  } catch(e){ msg.innerHTML=`<div class="alerta alerta-err" style="font-size:13px;padding:8px 12px;">${e.message}</div>` }
}

/* ── FAVORITOS toggle ── */
window.toggleFavorito = async function(profesionalId, btn) {
  const userId = getCurrentUserId()
  if(!userId) { location.href = "/login.html"; return }
  const token = getAccessToken()
  const esFav = _favoritosSet.has(profesionalId)

  if(esFav) {
    await fetch(`${SB_URL}/rest/v1/favoritos?usuario_id=eq.${userId}&profesional_id=eq.${profesionalId}`, {
      method: "DELETE",
      headers: { ...SB_HEADERS, "Authorization": `Bearer ${token}` }
    })
    _favoritosSet.delete(profesionalId)
    btn.style.background = "#f8fafc"
    btn.style.borderColor = "#e2e8f0"
    btn.textContent = "🤍"
  } else {
    await fetch(`${SB_URL}/rest/v1/favoritos`, {
      method: "POST",
      headers: { ...SB_HEADERS, "Authorization": `Bearer ${token}`, "Content-Type": "application/json", "Prefer": "return=minimal" },
      body: JSON.stringify({ usuario_id: userId, profesional_id: profesionalId })
    })
    _favoritosSet.add(profesionalId)
    btn.style.background = "#fee2e2"
    btn.style.borderColor = "#fca5a5"
    btn.textContent = "❤️"
  }
}

/* ── TRACKING WA CLICK ── */
window.registrarWAClick = async function(profesionalId) {
  try {
    await fetch(`${SB_URL}/rest/v1/perfil_eventos`, {
      method: "POST",
      headers: { ...SB_HEADERS, "Content-Type": "application/json", "Prefer": "return=minimal" },
      body: JSON.stringify({ profesional_id: profesionalId, tipo: "wa_click" })
    })
  } catch(e){}
}

/* ── INICIAR CONVERSACIÓN ── */
window.iniciarConversacion = async function(profesionalId){
  const uid = getCurrentUserId()
  if(!uid){ window.location.href = "/login.html"; return }
  if(uid === profesionalId){ return }

  const token = getAccessToken()
  const authHdrs = { ...SB_HEADERS, "Authorization": `Bearer ${token}`, "Content-Type": "application/json" }

  // Buscar conversación existente
  try {
    const res = await fetch(
      `${SB_URL}/rest/v1/conversaciones?or=(and(usuario1_id.eq.${uid},usuario2_id.eq.${profesionalId}),and(usuario1_id.eq.${profesionalId},usuario2_id.eq.${uid}))&select=id&limit=1`,
      { headers: authHdrs }
    )
    if(res.ok){
      const data = await res.json()
      if(data?.[0]?.id){ window.location.href = `/mensajes.html?conv=${data[0].id}`; return }
    }
  } catch(e){}

  // Crear nueva conversación
  try {
    const res = await fetch(`${SB_URL}/rest/v1/conversaciones`, {
      method: "POST",
      headers: { ...authHdrs, "Prefer": "return=representation" },
      body: JSON.stringify({
        usuario1_id: uid,
        usuario2_id: profesionalId,
        ultimo_mensaje: "",
        ultimo_mensaje_at: new Date().toISOString(),
        no_leidos_u1: 0,
        no_leidos_u2: 0
      })
    })
    if(res.ok){
      const data = await res.json()
      const id = Array.isArray(data) ? data[0]?.id : data?.id
      if(id){ window.location.href = `/mensajes.html?conv=${id}`; return }
    }
  } catch(e){}

  alert("No se pudo iniciar la conversación. Intentá de nuevo.")
}

/* ── CERRAR MODAL ── */
window.cerrarModal = function(){
  document.getElementById("modalOverlay").classList.remove("activo")
  document.body.style.overflow = ""
  if(mapModal){ mapModal.remove(); mapModal = null }
}
window.cerrarModalClick = function(e){
  if(e.target===document.getElementById("modalOverlay")) cerrarModal()
}
document.addEventListener("keydown", e => { if(e.key==="Escape") cerrarModal() })

/* ── INICIAR ── */
inicializarCiudadInput()
inicializarBuscarSelect()   // puebla el select #buscar con las categorías del tipo de página
renderChips()               // fallback: si existe #chipsCategoria lo puebla también
buscar()
