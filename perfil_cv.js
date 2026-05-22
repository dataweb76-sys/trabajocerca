import { supabase } from "./supabase.js"

let habilidades  = []
let experiencias = []
let educaciones  = []

const RUBROS = [
  "Atención al público",
  "Ventas y comercial",
  "Administración",
  "Contabilidad y finanzas",
  "Logística y depósito",
  "Cocina y gastronomía",
  "Limpieza y mantenimiento",
  "Seguridad y vigilancia",
  "Educación y docencia",
  "Salud y enfermería",
  "Electricidad y gas",
  "Construcción",
  "Informática y sistemas",
  "Marketing y publicidad",
  "Transporte y delivery",
  "Producción e industria",
  "Diseño y arte",
  "Turismo y hotelería",
  "Cuidado de personas",
  "Recursos humanos",
  "Mecánica automotriz",
  "Servicio técnico",
  "Textil y confección",
  "Agropecuario"
]

function renderRubros(seleccionados = []){
  const grid = document.getElementById("rubrosGrid")
  grid.innerHTML = RUBROS.map((r, i) => {
    const checked = seleccionados.includes(r) ? "checked" : ""
    return `<label class="rubro-chip">
      <input type="checkbox" name="rubro" value="${r}" id="rubro_${i}" ${checked}>
      <span>${r}</span>
    </label>`
  }).join("")
}

function getRubrosSeleccionados(){
  return [...document.querySelectorAll('input[name="rubro"]:checked')].map(c => c.value)
}

async function init(){
  const { data: userData } = await supabase.auth.getUser()
  if(!userData.user){ location.href = "/login.html"; return }

  if(new URLSearchParams(location.search).get("nuevo")){
    document.getElementById("msgNuevo").style.display = "block"
  }

  renderRubros([])

  const userId = userData.user.id

  // Cargar datos de visibilidad desde perfiles
  const { data: perfilVis } = await supabase
    .from("perfiles")
    .select("nombre_empresa, mostrar_como, mostrar_telefono")
    .eq("id", userId).single()

  if(perfilVis?.nombre_empresa)
    document.getElementById("cv-empresa").value = perfilVis.nombre_empresa
  const radioCV = document.querySelector(`input[name="cvMostrarComo"][value="${perfilVis?.mostrar_como||'personal'}"]`)
  if(radioCV) radioCV.checked = true
  document.getElementById("cv-mostrar-tel").checked = perfilVis?.mostrar_telefono !== false

  const { data: cv } = await supabase
    .from("curriculum")
    .select("*")
    .eq("usuario_id", userId)
    .single()

  if(!cv){
    document.getElementById("archivoActual").innerHTML = ""
    return
  }

  if(cv.cv_archivo){
    const nombre = cv.cv_archivo.split("/").pop().split("?")[0]
    document.getElementById("archivoActual").innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:10px 14px;">
        <i class="fa-solid fa-file-lines" style="color:#16a34a;font-size:20px;"></i>
        <div style="flex:1;min-width:0;">
          <p style="margin:0;font-size:13px;font-weight:600;color:#166534;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${nombre}</p>
          <p style="margin:2px 0 0;font-size:12px;color:#64748b;">Archivo subido</p>
        </div>
        <a href="${cv.cv_archivo}" target="_blank" rel="noopener" class="btn btn-outline btn-sm">
          <i class="fa-solid fa-download"></i> Ver
        </a>
      </div>`
  }

  document.getElementById("titulo").value        = cv.titulo_profesional || ""
  document.getElementById("resumen").value       = cv.resumen            || ""
  document.getElementById("edad").value          = cv.edad               || ""
  document.getElementById("disponibilidad").value= cv.disponibilidad     || "inmediata"
  document.getElementById("modalidad").value     = cv.modalidad          || "presencial"

  if(cv.habilidades){
    habilidades = cv.habilidades.split(",").map(h => h.trim()).filter(Boolean)
    renderTags()
  }

  renderRubros(Array.isArray(cv.rubros) ? cv.rubros : [])

  experiencias = Array.isArray(cv.experiencia) ? cv.experiencia : []
  renderExperiencias()

  educaciones = Array.isArray(cv.educacion) ? cv.educacion : []
  renderEducaciones()
}

/* ── TAGS / HABILIDADES ── */

function renderTags(){
  const container = document.getElementById("tagsContainer")
  const input     = document.getElementById("tagInput")
  container.innerHTML = ""

  habilidades.forEach((h, i) => {
    const tag = document.createElement("span")
    tag.className = "tag"
    tag.innerHTML = `${h} <button type="button" onclick="eliminarTag(${i})">×</button>`
    container.appendChild(tag)
  })

  container.appendChild(input)
  input.focus()
}

window.agregarTag = function(e){
  if(e.key === "Enter" || e.key === ","){
    e.preventDefault()
    const val = e.target.value.replace(",", "").trim()
    if(val && !habilidades.includes(val)){
      habilidades.push(val)
      renderTags()
    }
    e.target.value = ""
  }
}

window.eliminarTag = function(i){
  habilidades.splice(i, 1)
  renderTags()
}

/* ── EXPERIENCIA ── */

function renderExperiencias(){
  const lista = document.getElementById("listaExp")
  lista.innerHTML = ""

  experiencias.forEach((exp, i) => {
    const div = document.createElement("div")
    div.className = "cv-item"
    div.innerHTML = `
      <button type="button" class="cv-item-remove" onclick="eliminarExp(${i})" title="Eliminar">×</button>

      <label>Empresa / Organización</label>
      <input value="${esc(exp.empresa)}" oninput="experiencias[${i}].empresa=this.value" placeholder="Nombre de la empresa">

      <label>Cargo / Puesto</label>
      <input value="${esc(exp.cargo)}" oninput="experiencias[${i}].cargo=this.value" placeholder="Ej: Vendedor, Operario, Secretaria">

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
        <div>
          <label>Desde</label>
          <input type="month" value="${esc(exp.desde)}" oninput="experiencias[${i}].desde=this.value">
        </div>
        <div>
          <label>Hasta</label>
          <input type="month" value="${esc(exp.hasta)}" oninput="experiencias[${i}].hasta=this.value"
            placeholder="Vacío si es actual">
        </div>
      </div>

      <label>Descripción de tareas</label>
      <textarea oninput="experiencias[${i}].descripcion=this.value"
        placeholder="Describí brevemente qué hacías en ese puesto">${esc(exp.descripcion)}</textarea>
    `
    lista.appendChild(div)
  })
}

window.agregarExp = function(){
  experiencias.push({ empresa: "", cargo: "", desde: "", hasta: "", descripcion: "" })
  renderExperiencias()
  document.getElementById("listaExp").lastElementChild?.scrollIntoView({ behavior: "smooth", block: "start" })
}

window.eliminarExp = function(i){
  experiencias.splice(i, 1)
  renderExperiencias()
}

/* ── EDUCACIÓN ── */

function renderEducaciones(){
  const lista = document.getElementById("listaEdu")
  lista.innerHTML = ""

  educaciones.forEach((edu, i) => {
    const div = document.createElement("div")
    div.className = "cv-item"
    div.innerHTML = `
      <button type="button" class="cv-item-remove" onclick="eliminarEdu(${i})" title="Eliminar">×</button>

      <label>Institución</label>
      <input value="${esc(edu.institucion)}" oninput="educaciones[${i}].institucion=this.value"
        placeholder="Nombre del colegio, universidad, instituto">

      <label>Título / Carrera</label>
      <input value="${esc(edu.titulo)}" oninput="educaciones[${i}].titulo=this.value"
        placeholder="Ej: Bachiller, Tecnicatura en..., Licenciatura en...">

      <label>Año de egreso</label>
      <input type="number" min="1970" max="2030" value="${esc(edu.anio)}"
        oninput="educaciones[${i}].anio=this.value" placeholder="Ej: 2019">
    `
    lista.appendChild(div)
  })
}

window.agregarEdu = function(){
  educaciones.push({ institucion: "", titulo: "", anio: "" })
  renderEducaciones()
  document.getElementById("listaEdu").lastElementChild?.scrollIntoView({ behavior: "smooth", block: "start" })
}

window.eliminarEdu = function(i){
  educaciones.splice(i, 1)
  renderEducaciones()
}

/* ── GUARDAR ── */

window.guardarCV = async function(){
  const { data: userData } = await supabase.auth.getUser()
  const userId = userData.user.id
  const msg    = document.getElementById("msg")

  const titulo = document.getElementById("titulo").value.trim()

  if(!titulo){
    msg.innerHTML = '<div class="alerta alerta-err">El título profesional es obligatorio</div>'
    document.getElementById("titulo").focus()
    return
  }

  const edadVal = parseInt(document.getElementById("edad").value) || null

  const payload = {
    usuario_id:         userId,
    titulo_profesional: titulo,
    resumen:            document.getElementById("resumen").value,
    edad:               edadVal,
    disponibilidad:     document.getElementById("disponibilidad").value,
    modalidad:          document.getElementById("modalidad").value,
    habilidades:        habilidades.join(", "),
    rubros:             getRubrosSeleccionados(),
    experiencia:        experiencias,
    educacion:          educaciones
  }

  const { data: existing } = await supabase
    .from("curriculum")
    .select("id")
    .eq("usuario_id", userId)
    .single()

  const { error } = existing
    ? await supabase.from("curriculum").update(payload).eq("id", existing.id)
    : await supabase.from("curriculum").insert(payload)

  if(error){
    msg.innerHTML = `<div class="alerta alerta-err">${error.message}</div>`
    return
  }

  // Guardar visibilidad en perfiles
  const empresa    = (document.getElementById("cv-empresa")?.value || "").trim()
  const mostrarC   = document.querySelector('input[name="cvMostrarComo"]:checked')?.value || "personal"
  const mostrarTel = document.getElementById("cv-mostrar-tel")?.checked ?? true

  await supabase.from("perfiles").update({
    nombre_empresa:   empresa || null,
    mostrar_como:     mostrarC,
    mostrar_telefono: mostrarTel
  }).eq("id", userId)

  msg.innerHTML = '<div class="alerta alerta-ok"><i class="fa-solid fa-check"></i> CV guardado correctamente</div>'
  setTimeout(() => window.location.href = "/perfil.html", 1800)
}

/* ── SUBIR ARCHIVO CV ── */

window.subirArchivoCV = async function(input){
  const file = input.files[0]
  if(!file) return

  if(file.size > 5 * 1024 * 1024){
    document.getElementById("msgArchivoCV").innerHTML = '<div class="alerta alerta-err">El archivo no puede superar 5 MB</div>'
    return
  }

  const { data: ud } = await supabase.auth.getUser()
  const uid = ud.user.id
  const ext = file.name.split(".").pop().toLowerCase()
  const nombre = `cv_${uid}_${Date.now()}.${ext}`
  const msgEl = document.getElementById("msgArchivoCV")

  msgEl.innerHTML = '<div style="color:#64748b;font-size:13px;"><i class="fa-solid fa-spinner fa-spin"></i> Subiendo archivo...</div>'

  const { error } = await supabase.storage.from("trabajos").upload(nombre, file, { upsert: true })
  if(error){
    msgEl.innerHTML = `<div class="alerta alerta-err">${error.message}</div>`
    return
  }

  const { data } = supabase.storage.from("trabajos").getPublicUrl(nombre)
  const url = data.publicUrl

  const { data: existing } = await supabase.from("curriculum").select("id").eq("usuario_id", uid).single()
  if(existing){
    await supabase.from("curriculum").update({ cv_archivo: url }).eq("id", existing.id)
  } else {
    await supabase.from("curriculum").insert({ usuario_id: uid, cv_archivo: url })
  }

  msgEl.innerHTML = '<div class="alerta alerta-ok"><i class="fa-solid fa-check"></i> Archivo subido correctamente</div>'
  document.getElementById("archivoActual").innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:10px 14px;">
      <i class="fa-solid fa-file-lines" style="color:#16a34a;font-size:20px;"></i>
      <div style="flex:1;min-width:0;">
        <p style="margin:0;font-size:13px;font-weight:600;color:#166534;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${file.name}</p>
        <p style="margin:2px 0 0;font-size:12px;color:#64748b;">Archivo subido</p>
      </div>
      <a href="${url}" target="_blank" rel="noopener" class="btn btn-outline btn-sm">
        <i class="fa-solid fa-download"></i> Ver
      </a>
    </div>`
  setTimeout(() => { msgEl.innerHTML = "" }, 3000)
}

/* ── UTILIDAD ── */
function esc(val){ return (val || "").replace(/"/g, "&quot;") }

init()
