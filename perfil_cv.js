import { supabase } from "./supabase.js"

let habilidades  = []
let experiencias = []
let educaciones  = []

async function init(){
  const { data: userData } = await supabase.auth.getUser()
  if(!userData.user){ location.href = "/login.html"; return }

  if(new URLSearchParams(location.search).get("nuevo")){
    document.getElementById("msgNuevo").style.display = "block"
  }

  const userId = userData.user.id

  const { data: cv } = await supabase
    .from("curriculum")
    .select("*")
    .eq("usuario_id", userId)
    .single()

  if(!cv) return

  document.getElementById("titulo").value        = cv.titulo_profesional || ""
  document.getElementById("resumen").value       = cv.resumen            || ""
  document.getElementById("disponibilidad").value= cv.disponibilidad     || "inmediata"
  document.getElementById("modalidad").value     = cv.modalidad          || "presencial"

  if(cv.habilidades){
    habilidades = cv.habilidades.split(",").map(h => h.trim()).filter(Boolean)
    renderTags()
  }

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

  const payload = {
    usuario_id:         userId,
    titulo_profesional: titulo,
    resumen:            document.getElementById("resumen").value,
    disponibilidad:     document.getElementById("disponibilidad").value,
    modalidad:          document.getElementById("modalidad").value,
    habilidades:        habilidades.join(", "),
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

  msg.innerHTML = '<div class="alerta alerta-ok"><i class="fa-solid fa-check"></i> CV guardado correctamente</div>'
  setTimeout(() => window.location.href = "/perfil.html", 1800)
}

/* ── UTILIDAD ── */
function esc(val){ return (val || "").replace(/"/g, "&quot;") }

init()
