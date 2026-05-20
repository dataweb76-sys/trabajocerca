import { supabase } from "./supabase.js"

const SERVICIOS = {
  /* ── Oficios ── */
  "Albañilería":   ["Construcción nueva", "Refacciones y arreglos", "Pisos y revestimientos", "Impermeabilización", "Revoque y enlucido", "Demolición", "Tabiques y divisiones"],
  "Plomería":      ["Instalaciones nuevas", "Reparaciones de cañerías", "Destapaciones", "Calefón y termotanque", "Bomba de agua", "Piletas"],
  "Gasista":       ["Instalación de gas", "Control de pérdidas", "Habilitación de medidores", "Calefacción a gas", "Cocinas y hornos", "Calderas"],
  "Electricista":  ["Instalaciones eléctricas", "Tableros eléctricos", "Iluminación", "Reparaciones eléctricas", "Certificación eléctrica", "Porteros y alarmas"],
  "Carpintería":   ["Muebles a medida", "Puertas y ventanas", "Reparación de muebles", "Deck y pérgolas", "Placards", "Pisos de madera"],
  "Pintura":       ["Pintura interior", "Pintura exterior", "Empapelado", "Microcemento", "Pintura texturada", "Enduído"],
  "Jardinería":    ["Diseño de jardines", "Mantenimiento de jardín", "Poda de árboles", "Fumigación", "Riego automático", "Desmalezado"],
  "Herrería":      ["Rejas y portones", "Escaleras de hierro", "Estructuras metálicas", "Soldadura", "Balcones y barandas"],
  "Cerrajería":    ["Apertura de puertas", "Cambio de cerraduras", "Copia de llaves", "Cajas fuertes", "Rejas y portones"],
  "Limpieza":      ["Limpieza de hogares", "Limpieza de oficinas", "Limpieza post-obra", "Limpieza de vidrios", "Planchado"],
  "Mudanzas / Fletes": ["Mudanzas locales", "Mudanzas larga distancia", "Fletes pequeños", "Embalaje y desarme", "Guardamuebles"],
  "Refrigeración / Aire acondicionado": ["Instalación de equipos", "Mantenimiento preventivo", "Reparación de equipos", "Recarga de gas refrigerante"],
  "Informática / Reparaciones": ["Reparación de PC y notebooks", "Reparación de celulares", "Redes y WiFi", "Eliminación de virus", "Cámaras de seguridad"],
  "Gastronomía":   ["Catering para eventos", "Cocina a domicilio", "Parrilladas", "Postres y tortas", "Servicios de mozo"],
  "Mecánico Automotriz": ["Mecánica general", "Service y mantenimiento", "Frenos y suspensión", "Electricidad del auto", "Diagnóstico computarizado", "Gomería"],
  "Tapicería":     ["Tapizado de autos", "Tapizado de muebles", "Reparación de cuero", "Cortinas y persianas", "Capotería"],
  "Personal Trainer": ["Entrenamiento personalizado", "Entrenamiento funcional", "Pérdida de peso", "Musculación", "Yoga", "Pilates", "Crossfit", "Entrenamiento online", "Preparación física deportiva"],
  "Enfermero/a":   ["Cuidado de adultos mayores", "Atención post-quirúrgica", "Inyecciones y curaciones", "Control de medicación", "Atención domiciliaria", "Acompañante terapéutico"],
  "Niñera / Cuidadora": ["Cuidado de niños en el hogar", "Babysitting", "Apoyo escolar básico", "Cuidado de bebés", "Por horas o días", "Turno noche"],
  "Delivery / Mensajería": ["Envíos locales en moto", "Distribución de volantes", "Mandados y encargos", "Trámites bancarios", "Transporte de documentos"],
  "Planchado / Laundry": ["Planchado a domicilio", "Lavado y planchado", "Planchado de uniformes y camisas"],
  "Estampería Textil":  ["Estampado en tela", "Serigrafía", "Sublimación", "Remeras personalizadas", "Gorras estampadas", "Uniformes y ropa de trabajo", "Bolsas personalizadas", "Estampados digitales", "Bordado", "Diseño gráfico para estampados"],
  /* ── Profesionales ── */
  "Médico / Clínica":    ["Consulta clínica general", "Pediatría", "Cardiología", "Dermatología", "Traumatología", "Medicina laboral", "Atención a domicilio"],
  "Odontólogo":          ["Odontología general", "Ortodoncia", "Blanqueamiento dental", "Implantes", "Odontología pediátrica", "Cirugía maxilofacial"],
  "Psicólogo / Terapia": ["Psicología clínica", "Terapia de pareja", "Terapia infanto-juvenil", "Orientación vocacional", "Consulta online"],
  "Kinesiólogo":         ["Kinesiología deportiva", "Rehabilitación post-operatoria", "Masajes terapéuticos", "Osteopatía", "Atención a domicilio"],
  "Nutricionista":       ["Nutrición clínica", "Planes alimentarios", "Nutrición deportiva", "Nutrición pediátrica", "Consulta online"],
  "Veterinario":         ["Consulta clínica", "Vacunación", "Cirugía veterinaria", "Peluquería canina", "Atención a domicilio", "Guardería de mascotas"],
  "Arquitecto":          ["Diseño de viviendas", "Reformas y ampliaciones", "Dirección de obra", "Planos y permisos", "Diseño de interiores", "Arquitectura comercial"],
  "Abogado":             ["Derecho civil", "Derecho laboral", "Derecho de familia", "Sucesiones", "Derecho penal", "Accidentes de tránsito", "Derecho comercial"],
  "Contador / Impositivo": ["Contabilidad PYME", "Declaración de impuestos", "Monotributo", "Balances y auditorías", "Asesoramiento impositivo", "Sueldos y RRHH"],
  "Diseñador Gráfico":   ["Diseño de logos", "Identidad corporativa", "Diseño para redes sociales", "Material publicitario", "Diseño web", "Edición de video"],
  "Fotógrafo":           ["Fotografía de eventos", "Fotografía de producto", "Sesiones de fotos", "Fotografía inmobiliaria", "Video y cinematografía"],
  "Profesor Particular": ["Matemática", "Lengua y Literatura", "Inglés", "Física y Química", "Historia y Geografía", "Preparación para examen", "Informática"],
  "Peluquería / Estética": ["Corte y color", "Alisado y tratamientos", "Manicuría y pedicuría", "Depilación", "Maquillaje profesional", "Uñas acrílicas"],
  "Otro":          []
}

let map, marker, provinciaActual = "", serviciosSeleccionados = []
let userId = null
let planNivel = 0
let fotasPortfolio = { 1: null, 2: null, 3: null }

async function init(){
  const { data: userData } = await supabase.auth.getUser()
  if(!userData.user){ location.href = "/login.html"; return }
  userId = userData.user.id

  if(new URLSearchParams(location.search).get("nuevo")){
    document.getElementById("msgNuevo").style.display = "block"
  }

  /* ── Cargar foto de perfil ── */
  const { data: perfil } = await supabase
    .from("perfiles").select("foto").eq("id", userId).single()

  if(perfil?.foto){
    document.getElementById("fotoPreview").innerHTML =
      `<img src="${perfil.foto}" style="width:100%;height:100%;object-fit:cover;">`
  }

  /* ── Cargar servicio existente ── */
  const { data: servicio } = await supabase
    .from("servicios").select("*").eq("usuario_id", userId).single()

  iniciarMapa(servicio?.lat || -34.61, servicio?.lng || -58.38, !!servicio?.lat)

  if(!servicio) return

  document.getElementById("categoria").value        = servicio.categoria        || ""
  document.getElementById("titulo").value           = servicio.titulo           || ""
  document.getElementById("descripcion").value      = servicio.descripcion      || ""
  document.getElementById("horarios").value         = servicio.horarios         || ""
  document.getElementById("direccion_exacta").value = servicio.direccion        || ""

  if(servicio.servicios_lista){
    serviciosSeleccionados = servicio.servicios_lista.split(",").map(s => s.trim()).filter(Boolean)
  }
  if(servicio.categoria) actualizarCheckboxes()

  if(servicio.localidad){
    const sel = document.getElementById("localidad_servicio")
    sel.innerHTML = `<option value="${servicio.localidad}">${servicio.localidad}</option>`
    sel.value = servicio.localidad
  }
  if(servicio.provincia){
    document.getElementById("provincia_servicio").value = servicio.provincia
    provinciaActual = servicio.provincia
  }

  /* ── Cargar plan y portfolio ── */
  const { data: perfilPlan } = await supabase.from("perfiles").select("plan_nivel").eq("id", userId).single()
  planNivel = perfilPlan?.plan_nivel || 0
  cargarPortfolio()
}

function iniciarMapa(lat, lng, conMarker){
  map = L.map("mapServicio").setView([lat, lng], conMarker ? 13 : 5)
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map)
  if(conMarker){
    marker = L.marker([lat, lng], { draggable: true }).addTo(map)
  }
  map.on("click", e => {
    if(marker) map.removeLayer(marker)
    marker = L.marker(e.latlng, { draggable: true }).addTo(map)
  })
}

/* ── FOTO ── */

window.subirFoto = async function(input){
  const file = input.files[0]
  if(!file) return

  const msgFoto = document.getElementById("msgFoto")
  msgFoto.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Subiendo...'

  const name = `perfil_${userId}_${Date.now()}`
  const { error } = await supabase.storage.from("trabajos").upload(name, file, { upsert: true })

  if(error){ msgFoto.textContent = error.message; return }

  const { data } = supabase.storage.from("trabajos").getPublicUrl(name)

  await supabase.from("perfiles").update({ foto: data.publicUrl }).eq("id", userId)

  document.getElementById("fotoPreview").innerHTML =
    `<img src="${data.publicUrl}" style="width:100%;height:100%;object-fit:cover;">`
  msgFoto.innerHTML = '<span style="color:#16a34a"><i class="fa-solid fa-check"></i> Foto actualizada</span>'
}

/* ── CHECKBOXES ── */

window.actualizarCheckboxes = function(){
  const cat   = document.getElementById("categoria").value
  const lista = SERVICIOS[cat] || []
  const cont  = document.getElementById("checksServicios")

  if(!lista.length){
    cont.innerHTML = `<p style="color:#94a3b8;font-size:14px;">Describí tus servicios en el campo de descripción</p>`
    return
  }

  cont.innerHTML = `<div class="checks-grid" id="checksGrid"></div>`
  const grid = document.getElementById("checksGrid")

  lista.forEach(s => {
    const marcado = serviciosSeleccionados.includes(s)
    const lbl = document.createElement("label")
    lbl.className = `check-item${marcado ? " marcado" : ""}`
    lbl.innerHTML = `<input type="checkbox" value="${s}" ${marcado ? "checked" : ""} onchange="toggleServicio(this)">${s}`
    grid.appendChild(lbl)
  })
}

window.toggleServicio = function(input){
  const v = input.value, lbl = input.closest(".check-item")
  if(input.checked){ if(!serviciosSeleccionados.includes(v)) serviciosSeleccionados.push(v); lbl.classList.add("marcado") }
  else             { serviciosSeleccionados = serviciosSeleccionados.filter(s => s !== v);    lbl.classList.remove("marcado") }
}

/* ── HORARIOS RÁPIDOS ── */

window.setHorario = t => document.getElementById("horarios").value = t

/* ── AUTOCOMPLETAR CP ── */

window.autocompletarCP = async function(codigo){
  if(codigo.trim().length < 4) return
  try {
    const res = await fetch(`https://api.zippopotam.us/ar/${codigo.trim()}`)
    if(!res.ok) return
    const data = await res.json()
    const sel  = document.getElementById("localidad_servicio")
    sel.innerHTML = '<option value="">Seleccione localidad</option>'
    data.places.forEach(p => { const o = document.createElement("option"); o.value = o.textContent = p["place name"]; sel.appendChild(o) })
    provinciaActual = data.places[0]["state"]
    document.getElementById("provincia_servicio").value = provinciaActual
    if(data.places.length === 1){ sel.value = data.places[0]["place name"]; moverMapaA(data.places[0]["place name"], provinciaActual) }
  } catch(e){ console.error(e) }
}

window.actualizarMapaDesdeSelect = function(){
  const ciudad = document.getElementById("localidad_servicio").value
  if(ciudad && provinciaActual) moverMapaA(ciudad, provinciaActual)
}

async function moverMapaA(ciudad, provincia){
  try {
    const geo = await (await fetch(`https://nominatim.openstreetmap.org/search?city=${encodeURIComponent(ciudad)}&state=${encodeURIComponent(provincia)}&country=Argentina&format=json&limit=1`)).json()
    if(!geo.length) return
    const lat = parseFloat(geo[0].lat), lng = parseFloat(geo[0].lon)
    map.setView([lat, lng], 13)
    if(marker) map.removeLayer(marker)
    marker = L.marker([lat, lng], { draggable: true }).addTo(map)
  } catch(e){ console.error(e) }
}

/* ── GUARDAR ── */

window.guardarServicio = async function(){
  const msg      = document.getElementById("msg")
  const categoria   = document.getElementById("categoria").value
  const titulo      = document.getElementById("titulo").value.trim()
  const descripcion = document.getElementById("descripcion").value.trim()
  const horarios    = document.getElementById("horarios").value.trim()
  const direccion   = document.getElementById("direccion_exacta").value.trim()
  const localidad   = document.getElementById("localidad_servicio").value
  const provincia   = document.getElementById("provincia_servicio").value

  if(!categoria || !titulo || !localidad){
    msg.innerHTML = '<div class="alerta alerta-err">Completá los campos obligatorios (*)</div>'
    return
  }

  /* ── Asegurar que existe el registro en perfiles antes del FK ── */
  const { data: perfilCheck } = await supabase.from("perfiles").select("id").eq("id", userId).single()
  if(!perfilCheck){
    const { data: au } = await supabase.auth.getUser()
    const { error: pe } = await supabase.from("perfiles").insert({ id: userId, email: au.user.email, tipo: "profesional" })
    if(pe){ msg.innerHTML = `<div class="alerta alerta-err">Error al crear perfil: ${pe.message}</div>`; return }
  }

  /* ── Coordenadas: dirección exacta tiene prioridad sobre el marcador del mapa ── */
  let lat = null, lng = null

  if(direccion){
    try {
      const geo = await (await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(direccion+", "+localidad+", Argentina")}&format=json&limit=1`)).json()
      if(geo.length){ lat = parseFloat(geo[0].lat); lng = parseFloat(geo[0].lon) }
    } catch(e){}
  }

  if(!lat && marker){ const ll = marker.getLatLng(); lat = ll.lat; lng = ll.lng }

  const payload = { usuario_id: userId, categoria, titulo, descripcion, horarios, direccion, servicios_lista: serviciosSeleccionados.join(", "), localidad, provincia, lat, lng, activo: true }

  const { data: existing } = await supabase.from("servicios").select("id").eq("usuario_id", userId).single()
  const { error } = existing
    ? await supabase.from("servicios").update(payload).eq("id", existing.id)
    : await supabase.from("servicios").insert(payload)

  if(error){ msg.innerHTML = `<div class="alerta alerta-err">${error.message}</div>`; return }

  msg.innerHTML = '<div class="alerta alerta-ok"><i class="fa-solid fa-check"></i> ¡Perfil publicado! Los clientes ya pueden encontrarte.</div>'
  setTimeout(() => location.href = "/perfil.html", 1800)
}

/* ── PORTFOLIO ── */

async function cargarPortfolio(){
  const lista = document.getElementById("listaPortfolio")
  if(!lista || !userId) return

  const { data: items } = await supabase
    .from("portfolio")
    .select("*")
    .eq("usuario_id", userId)
    .order("created_at", { ascending: false })

  const maxItems = planNivel === 1 ? 2 : planNivel >= 2 ? 5 : 0

  if(!items?.length){
    lista.innerHTML = `<p style="color:#94a3b8;font-size:13px;text-align:center;padding:8px 0;">
      No tenés trabajos publicados aún.
      ${maxItems > 0 ? `Podés agregar hasta <strong>${maxItems}</strong>.` : ""}
    </p>`
  } else {
    lista.innerHTML = items.map(item => {
      const fotos = [item.foto1, item.foto2, item.foto3].filter(Boolean)
      return `<div class="portfolio-item" style="margin-bottom:12px;">
        ${fotos.length ? `<div class="portfolio-fotos" style="height:120px;">
          ${fotos.map(f => `<img src="${f}" onclick="window.open('${f}','_blank')" alt="">`).join("")}
        </div>` : ""}
        <div class="portfolio-info">
          <strong>${item.titulo}</strong>
          ${item.descripcion ? `<p>${item.descripcion}</p>` : ""}
          <button class="btn btn-sm" onclick="eliminarPortfolio('${item.id}')"
            style="margin-top:8px;background:#fee2e2;color:#dc2626;border:none;padding:4px 10px;font-size:12px;border-radius:6px;cursor:pointer;">
            <i class="fa-solid fa-trash"></i> Eliminar
          </button>
        </div>
      </div>`
    }).join("")
  }

  const btn = document.getElementById("btnAgregarTrabajo")
  if(btn){
    const count = items?.length || 0
    if(planNivel > 0 && count >= maxItems){
      btn.disabled = true
      btn.innerHTML = `<i class="fa-solid fa-lock"></i> Límite alcanzado (${count}/${maxItems})`
    } else {
      btn.disabled = false
      btn.innerHTML = `<i class="fa-solid fa-plus"></i> Agregar trabajo realizado`
    }
  }
}

window.clickAgregarTrabajo = async function(){
  if(planNivel === 0){
    mostrarPlanes()
    return
  }
  const maxItems = planNivel === 1 ? 2 : 5
  const { count } = await supabase
    .from("portfolio")
    .select("id", { count: "exact", head: true })
    .eq("usuario_id", userId)
  if(count >= maxItems){
    mostrarPlanes()
    return
  }
  abrirFormPortfolio()
}

function mostrarPlanes(){
  document.getElementById("modalPlanes").classList.add("activo")
  document.body.style.overflow = "hidden"
}

window.cerrarPlanes = function(){
  document.getElementById("modalPlanes").classList.remove("activo")
  document.body.style.overflow = ""
}

window.cerrarPlanesClick = function(e){
  if(e.target === document.getElementById("modalPlanes")) cerrarPlanes()
}

function abrirFormPortfolio(){
  fotasPortfolio = { 1: null, 2: null, 3: null }
  document.getElementById("ptTitulo").value  = ""
  document.getElementById("ptDesc").value    = ""
  document.getElementById("msgPt").innerHTML = ""
  for(let n = 1; n <= 3; n++){
    document.getElementById(`prevPt${n}`).innerHTML = `<i class="fa-solid fa-camera"></i>`
    document.getElementById(`inputPt${n}`).value    = ""
  }
  const sec = document.getElementById("formPortfolioSec")
  sec.style.display = "block"
  sec.scrollIntoView({ behavior: "smooth", block: "start" })
}

window.cerrarFormPortfolio = function(){
  document.getElementById("formPortfolioSec").style.display = "none"
}

window.prevFotoPt = function(input, n){
  const file = input.files[0]
  if(!file) return
  fotasPortfolio[n] = file
  const reader = new FileReader()
  reader.onload = e => {
    document.getElementById(`prevPt${n}`).innerHTML =
      `<img src="${e.target.result}" style="width:100%;height:100%;object-fit:cover;border-radius:8px;">`
  }
  reader.readAsDataURL(file)
}

window.guardarPortfolio = async function(){
  const titulo = document.getElementById("ptTitulo").value.trim()
  const desc   = document.getElementById("ptDesc").value.trim()
  const msg    = document.getElementById("msgPt")

  if(!titulo){
    msg.innerHTML = `<div class="alerta alerta-err" style="padding:8px 12px;font-size:13px;">El título es obligatorio</div>`
    return
  }

  msg.innerHTML = `<div style="color:#64748b;font-size:13px;"><i class="fa-solid fa-spinner fa-spin"></i> Guardando...</div>`

  const fotos = {}
  for(let n = 1; n <= 3; n++){
    if(!fotasPortfolio[n]) continue
    const name = `portfolio_${userId}_${Date.now()}_${n}`
    const { error: errUp } = await supabase.storage.from("trabajos").upload(name, fotasPortfolio[n], { upsert: true })
    if(errUp){
      msg.innerHTML = `<div class="alerta alerta-err" style="padding:8px 12px;font-size:13px;">Error al subir foto ${n}: ${errUp.message}</div>`
      return
    }
    const { data: urlData } = supabase.storage.from("trabajos").getPublicUrl(name)
    fotos[`foto${n}`] = urlData.publicUrl
  }

  const { error } = await supabase.from("portfolio").insert({
    usuario_id:  userId,
    titulo,
    descripcion: desc || null,
    ...fotos
  })

  if(error){
    msg.innerHTML = `<div class="alerta alerta-err" style="padding:8px 12px;font-size:13px;">${error.message}</div>`
    return
  }

  cerrarFormPortfolio()
  await cargarPortfolio()
  document.getElementById("seccionPortfolio").scrollIntoView({ behavior: "smooth" })
}

window.eliminarPortfolio = async function(id){
  if(!confirm("¿Eliminar este trabajo?")) return
  await supabase.from("portfolio").delete().eq("id", id).eq("usuario_id", userId)
  cargarPortfolio()
}

/* ── GUÍA ── */
window.abrirGuia = function(){
  document.getElementById("modalGuia").classList.add("activo")
  document.body.style.overflow = "hidden"
}
window.cerrarGuia = function(){
  document.getElementById("modalGuia").classList.remove("activo")
  document.body.style.overflow = ""
}

init()
