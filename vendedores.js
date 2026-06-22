import { supabase } from "./supabase.js"

const SB_URL = "https://iqeiszkoifxgygoqvbem.supabase.co"
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxZWlzemtvaWZ4Z3lnb3F2YmVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyMTEzODIsImV4cCI6MjA5NDc4NzM4Mn0.qxt70TPbARPcMc8HhHx2A2QnfBvJLCrnrH4m36IcENs"

let _userId  = null
let _fotoUrl = null
let _archivoFile = null
let _postulacionId = null

/* ── Auth check ── */
async function init() {
  const { data: { user } } = await supabase.auth.getUser()
  _userId = user?.id || null

  // Recuperar datos guardados antes del registro (si existen)
  const savedForm = localStorage.getItem("tc_vend_form")
  if(savedForm) {
    try {
      const d = JSON.parse(savedForm)
      const setVal = (id, v) => { const el = document.getElementById(id); if(el && v) el.value = v }
      setVal("cvNombre", d.nombre); setVal("cvApellido", d.apellido)
      setVal("cvEmail", d.email); setVal("cvTelefono", d.telefono)
      setVal("cvCiudad", d.ciudad); setVal("cvCP", d.cp)
      setVal("cvExperiencia", d.experiencia); setVal("cvEducacion", d.educacion)
      setVal("cvHabilidades", d.habilidades); setVal("cvMotivacion", d.motivacion)
      if(d.tipo_postulacion) { const sel = document.getElementById("tipoPostulacion"); if(sel) sel.value = d.tipo_postulacion }
      const selProv = document.getElementById("cvProvincia")
      if(selProv && d.provincia) for(let o of selProv.options) { if(o.value === d.provincia){ o.selected=true; break } }
      actualizarPreview()
    } catch(_) {}
    localStorage.removeItem("tc_vend_form")
  }

  // Intentar prefill con datos del perfil si está logueado
  if(_userId) {
    // Pre-llenar datos si ya tiene perfil
    const { data: p } = await supabase.from("perfiles")
      .select("nombre,apellido,movil,localidad,provincia,foto,email")
      .eq("id", _userId).single()
    if(p) {
      const setVal = (id, v) => { const el = document.getElementById(id); if(el && v) el.value = v }
      setVal("cvNombre",    p.nombre)
      setVal("cvApellido",  p.apellido)
      setVal("cvEmail",     p.email || user.email)
      setVal("cvTelefono",  p.movil)
      setVal("cvCiudad",    p.localidad)
      const selProv = document.getElementById("cvProvincia")
      if(selProv && p.provincia) {
        for(let o of selProv.options) { if(o.value === p.provincia){ o.selected=true; break } }
      }
      if(p.foto) {
        _fotoUrl = p.foto
        const prev = document.getElementById("fotoPreview")
        const ph   = document.getElementById("fotoPlaceholder")
        if(prev){ prev.src = p.foto; prev.style.display="block" }
        if(ph)    ph.style.display = "none"
        actualizarPrevFoto(p.foto)
      }
      actualizarPreview()
    }
  }
}

/* ── Verificar Jefe de Ventas por zona ── */
window.verificarJefeZona = async function() {
  const tipo = document.getElementById("tipoPostulacion")?.value
  const prov = document.getElementById("cvProvincia")?.value
  const info = document.getElementById("jefeVentasInfo")
  const desc = document.getElementById("jefeVentasDesc")
  if(!desc) return
  if(tipo !== "jefe_ventas") { if(info) info.style.display="none"; desc.style.display="none"; return }
  desc.style.display = "block"
  if(!prov) { if(info) info.style.display="none"; return }
  if(info) { info.style.display="block"; info.style.background="#f1f5f9"; info.style.border="1.5px solid #cbd5e1"; info.innerHTML=`<i class="fa-solid fa-spinner fa-spin"></i> Verificando disponibilidad en ${prov}...` }
  try {
    const { data } = await supabase.rpc("hay_jefe_ventas", { p_provincia: prov, p_ciudad: document.getElementById("cvCiudad")?.value?.trim() || "" })
    if(data === true) {
      info.style.background = "#fff7ed"; info.style.border = "1.5px solid #fed7aa"
      info.innerHTML = `<span style="color:#c2410c;font-weight:800;">⚠️ En ${prov} ya hay un Jefe/a de Ventas asignado.</span><br><span style="color:#374151;">Podés postularte igualmente como <strong>Vendedor/a</strong> — tenés chances de crecer al puesto en el futuro.</span>`
      document.getElementById("tipoPostulacion").value = "vendedor"
      setTimeout(() => verificarJefeZona(), 100)
    } else {
      info.style.background = "#f0fdf4"; info.style.border = "1.5px solid #86efac"
      info.innerHTML = `<span style="color:#15803d;font-weight:800;">✅ ¡Hay lugar en ${prov}!</span> Podés postularte como Jefe/a de Ventas para esta zona. Es una posición exclusiva.`
    }
  } catch(e) {
    if(info) { info.style.background="#fff7ed"; info.style.border="1.5px solid #fed7aa"; info.innerHTML=`<span style="color:#92400e;">No se pudo verificar disponibilidad. Podés enviar igual y lo revisamos.</span>` }
  }
}

/* ── Tabs ── */
window.cambiarTab = function(tab) {
  const tabs = document.querySelectorAll(".cv-tab")
  tabs[0].classList.toggle("activo", tab === "builder")
  tabs[1].classList.toggle("activo", tab === "upload")
  document.getElementById("panelBuilder").style.display = tab === "builder" ? "" : "none"
  document.getElementById("panelUpload").style.display  = tab === "upload"  ? "" : "none"
}

/* ── Preview foto ── */
window.previewFoto = function(input) {
  const file = input.files[0]; if(!file) return
  const reader = new FileReader()
  reader.onload = e => {
    const src = e.target.result
    const prev = document.getElementById("fotoPreview")
    const ph   = document.getElementById("fotoPlaceholder")
    prev.src = src; prev.style.display = "block"
    ph.style.display = "none"
    actualizarPrevFoto(src)
  }
  reader.readAsDataURL(file)
}

function actualizarPrevFoto(src) {
  const el = document.getElementById("prevFoto")
  if(!el) return
  el.innerHTML = `<img src="${src}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`
}

/* ── Live Preview ── */
window.actualizarPreview = function() {
  const g = id => document.getElementById(id)?.value?.trim() || ""
  const nombre   = `${g("cvNombre")} ${g("cvApellido")}`.trim()
  const ciudad   = [g("cvCiudad"), g("cvProvincia")].filter(Boolean).join(", ")
  const tel      = g("cvTelefono")
  const exp      = g("cvExperiencia")
  const edu      = g("cvEducacion")
  const habs     = g("cvHabilidades").split(",").map(h=>h.trim()).filter(Boolean)
  const mot      = g("cvMotivacion")

  const s = id => document.getElementById(id)
  if(s("prevNombre")) s("prevNombre").textContent = nombre || "Tu nombre aquí"
  if(s("prevCiudad")) s("prevCiudad").textContent = ciudad || "Ciudad"
  if(s("prevTel"))    s("prevTel").textContent    = tel    || "Teléfono"

  if(s("prevExp")) {
    s("prevExp").textContent  = exp || "Tu experiencia aparecerá aquí..."
    s("prevExp").className    = "cv-sec-text" + (exp ? "" : " cv-placeholder")
  }
  if(s("prevEdu")) {
    s("prevEdu").textContent  = edu || "Tu formación aparecerá aquí..."
    s("prevEdu").className    = "cv-sec-text" + (edu ? "" : " cv-placeholder")
  }
  if(s("prevMot")) {
    s("prevMot").textContent  = mot || "Tu motivación aparecerá aquí..."
    s("prevMot").className    = "cv-sec-text" + (mot ? "" : " cv-placeholder")
  }
  if(s("prevHabs")) {
    s("prevHabs").innerHTML = habs.length
      ? habs.map(h=>`<span class="cv-chip">${h}</span>`).join("")
      : `<span class="cv-placeholder" style="font-size:12px;">Tus habilidades aparecerán aquí...</span>`
  }
}

/* ── Subir foto a Supabase Storage ── */
async function subirFoto(file) {
  const ext  = file.name.split(".").pop()
  const name = `vendedor_${_userId}_${Date.now()}.${ext}`
  const { error } = await supabase.storage.from("trabajos").upload(name, file, { upsert: true })
  if(error) throw new Error(error.message)
  const { data } = supabase.storage.from("trabajos").getPublicUrl(name)
  return data.publicUrl
}

/* ── Enviar postulación (builder) ── */
window.enviarPostulacion = async function() {
  const g = id => document.getElementById(id)?.value?.trim() || ""
  const msg = document.getElementById("msgCV")

  // Validaciones obligatorias (para todos, registrados o no)
  if(!g("cvNombre"))    { showMsg(msg,"err","El nombre es obligatorio."); return }
  if(!g("cvApellido"))  { showMsg(msg,"err","El apellido es obligatorio."); return }
  if(!g("cvEmail"))     { showMsg(msg,"err","El email es obligatorio."); return }
  if(!g("cvCiudad"))    { showMsg(msg,"err","La ciudad/localidad es obligatoria."); return }
  if(!g("cvProvincia")) { showMsg(msg,"err","Seleccioná tu provincia."); return }
  const fotoFile = document.getElementById("inputFotoCV").files[0]
  if(!fotoFile && !_fotoUrl) { showMsg(msg,"err","La foto de perfil es obligatoria."); return }
  if(!g("cvMotivacion")) { showMsg(msg,"err","Contanos por qué querés vender con nosotros."); return }

  if(!_userId) {
    // Guardar datos en localStorage para recuperarlos después del registro
    localStorage.setItem("tc_vend_form", JSON.stringify({
      nombre: g("cvNombre"), apellido: g("cvApellido"), email: g("cvEmail"),
      telefono: g("cvTelefono"), ciudad: g("cvCiudad"), provincia: g("cvProvincia"),
      cp: g("cvCP"), experiencia: g("cvExperiencia"), educacion: g("cvEducacion"),
      habilidades: g("cvHabilidades"), motivacion: g("cvMotivacion"),
      tipo_postulacion: document.getElementById("tipoPostulacion")?.value || "vendedor"
    }))
    document.getElementById("popupRegistroCV").style.display = "flex"
    return
  }

  const nombre   = g("cvNombre")
  const apellido = g("cvApellido")
  const email    = g("cvEmail")
  const btn = document.getElementById("btnSubmitCV")

  btn.disabled = true
  btn.innerHTML = `<i class="fa-solid fa-spinner spin"></i> Enviando...`

  try {
    // Subir foto si es nueva
    if(fotoFile) _fotoUrl = await subirFoto(fotoFile)

    // Actualizar foto y datos en perfiles
    await supabase.from("perfiles").update({
      nombre, apellido,
      movil:     g("cvTelefono") || undefined,
      localidad: g("cvCiudad")   || undefined,
      provincia: g("cvProvincia") || undefined,
      foto:      _fotoUrl        || undefined
    }).eq("id", _userId)

    // Guardar CV en curriculum (tabla que ya existe)
    const { data: existing } = await supabase.from("curriculum")
      .select("id").eq("usuario_id", _userId).maybeSingle()

    const cvPayload = {
      usuario_id:         _userId,
      titulo_profesional: "Vendedor/a — LocalWeb & Trabajos Cerca",
      resumen:            g("cvExperiencia"),
      habilidades:        g("cvHabilidades") || "Ventas, Atención al cliente, Negociación",
      disponibilidad:     "inmediata",
      modalidad:          "remoto",
      cv_publico:         false   // se activa solo si acepta términos
    }
    if(existing) {
      await supabase.from("curriculum").update(cvPayload).eq("id", existing.id)
    } else {
      await supabase.from("curriculum").insert(cvPayload)
    }

    // Intentar guardar en vendedores_postulaciones (tabla puede no existir aún)
    try {
      const { data: post } = await supabase.from("vendedores_postulaciones").insert({
        usuario_id: _userId, nombre, apellido, email,
        telefono:   g("cvTelefono"), ciudad: g("cvCiudad"), provincia: g("cvProvincia"),
        cp: g("cvCP"), foto: _fotoUrl, experiencia: g("cvExperiencia"), educacion: g("cvEducacion"),
        habilidades: g("cvHabilidades"), motivacion: g("cvMotivacion"),
        tipo_postulacion: document.getElementById("tipoPostulacion")?.value || "vendedor",
        acepta_terminos: false
      }).select("id").single()
      if(post) _postulacionId = post.id
    } catch(_) { /* tabla aún no creada en Supabase, no bloquea el flujo */ }

    // Notificar al admin por mensaje interno + campanita
    try {
      const ADMIN_ID = "fd46288e-b703-4bba-87c3-dc48f1b97ebb"
      const tipoPost = document.getElementById("tipoPostulacion")?.value || "vendedor"
      const tipoLabel = tipoPost === "jefe_ventas" ? "Jefe/a de Ventas" : "Vendedor/a"
      const textoMsg = `📋 Nueva postulación como ${tipoLabel}\n👤 ${nombre} ${apellido}\n📍 ${g("cvCiudad")}, ${g("cvProvincia")}\n📧 ${email}\nVer CV: https://www.trabajoscerca.com.ar/buscador_trabajos`

      // Buscar o crear conversación entre el postulante y el admin
      let convId = null
      if(_userId) {
        const u1 = [_userId, ADMIN_ID].sort()[0]
        const u2 = [_userId, ADMIN_ID].sort()[1]
        const { data: convExist } = await supabase.from("conversaciones")
          .select("id").eq("usuario1_id", u1).eq("usuario2_id", u2).maybeSingle()
        if(convExist) {
          convId = convExist.id
        } else {
          const { data: convNew } = await supabase.from("conversaciones")
            .insert({ usuario1_id: u1, usuario2_id: u2, ultimo_mensaje: textoMsg.slice(0,80), ultimo_mensaje_at: new Date().toISOString(), no_leidos_u1: 0, no_leidos_u2: 0 })
            .select("id").single()
          convId = convNew?.id
        }
        if(convId) {
          await supabase.from("mensajes").insert({ conversacion_id: convId, emisor_id: _userId, texto: textoMsg })
          const esU1 = [_userId, ADMIN_ID].sort()[0] === _userId
          await supabase.from("conversaciones").update({ ultimo_mensaje: textoMsg.slice(0,80), ultimo_mensaje_at: new Date().toISOString(), [esU1 ? "no_leidos_u2" : "no_leidos_u1"]: 1 }).eq("id", convId)
        }
      }
      // Campanita siempre
      await supabase.from("notificaciones").insert({
        usuario_id: ADMIN_ID,
        tipo: "postulacion",
        titulo: `Nueva postulación — ${nombre} ${apellido}`,
        cuerpo: `Se postula como ${tipoLabel} desde ${g("cvCiudad")}, ${g("cvProvincia")}`,
        url: convId ? `/mensajes.html?conv=${convId}` : "/buscador_trabajos"
      })
    } catch(_) { /* no bloquea el flujo */ }

    // Mostrar popup términos
    document.getElementById("popupTerminos").style.display = "flex"

  } catch(e) {
    showMsg(msg, "err", "Error al enviar: " + e.message)
    btn.disabled = false
    btn.innerHTML = `<i class="fa-solid fa-paper-plane"></i> Enviar mi postulación`
  }
}

/* ── Subir archivo CV (PDF/Word) ── */
window.handleDrop = function(e) {
  e.preventDefault()
  document.getElementById("uploadZone").classList.remove("drag")
  const file = e.dataTransfer.files[0]
  if(file) procesarArchivo(file)
}

window.handleArchivoSelect = function(input) {
  const file = input.files[0]
  if(file) procesarArchivo(file)
}

function procesarArchivo(file) {
  const ok = ["application/pdf","application/msword","application/vnd.openxmlformats-officedocument.wordprocessingml.document"]
  if(!ok.includes(file.type) && !file.name.match(/\.(pdf|doc|docx)$/i)) {
    alert("Solo se aceptan archivos PDF o Word (.pdf, .doc, .docx)")
    return
  }
  _archivoFile = file
  const sel = document.getElementById("archivoSeleccionado")
  const nom  = document.getElementById("archivoNombre")
  if(sel) sel.style.display = "flex"
  if(nom) nom.textContent = file.name
  document.getElementById("btnSubmitUpload").style.display = "flex"
}

window.enviarPostulacionUpload = async function() {
  if(!_archivoFile) return
  if(!_userId) {
    document.getElementById("popupRegistroCV").style.display = "flex"
    return
  }

  const msg = document.getElementById("msgUpload")
  const btn = document.getElementById("btnSubmitUpload")
  btn.disabled = true
  btn.innerHTML = `<i class="fa-solid fa-spinner spin"></i> Subiendo CV...`

  try {
    // Subir archivo
    const ext  = _archivoFile.name.split(".").pop()
    const name = `cv_vend_${_userId}_${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage.from("trabajos").upload(name, _archivoFile, { upsert: true })
    if(upErr) throw upErr
    const { data: urlData } = supabase.storage.from("trabajos").getPublicUrl(name)

    // Datos del perfil
    const { data: p } = await supabase.from("perfiles")
      .select("nombre,apellido,movil,localidad,provincia,foto,email").eq("id", _userId).single()

    const { data: post, error } = await supabase.from("vendedores_postulaciones").insert({
      usuario_id:   _userId,
      nombre:       p?.nombre || "",
      apellido:     p?.apellido || "",
      email:        p?.email || "",
      telefono:     p?.movil,
      ciudad:       p?.localidad,
      provincia:    p?.provincia,
      foto:         p?.foto,
      cv_archivo:   urlData.publicUrl,
      acepta_terminos: false
    }).select("id").single()

    if(error) throw error
    _postulacionId = post.id
    document.getElementById("popupTerminos").style.display = "flex"

  } catch(e) {
    showMsg(msg, "err", "Error al subir: " + e.message)
    btn.disabled = false
    btn.innerHTML = `<i class="fa-solid fa-paper-plane"></i> Enviar mi CV`
  }
}

/* ── Términos: Aceptar ── */
window.aceptarTerminos = async function() {
  const check = document.getElementById("checkTerminos")
  if(!check?.checked) {
    check.style.outline = "2px solid #dc2626"
    check.parentElement.style.background = "#fef2f2"
    setTimeout(() => { check.style.outline=""; check.parentElement.style.background="" }, 2000)
    return
  }

  document.getElementById("btnAceptarTerminos").innerHTML = `<i class="fa-solid fa-spinner spin"></i> Guardando...`

  try {
    // Actualizar postulación
    if(_postulacionId) {
      await supabase.from("vendedores_postulaciones")
        .update({ acepta_terminos: true, aparece_buscador: true })
        .eq("id", _postulacionId)
    }

    // Actualizar tipo de perfil a "cv" para aparecer en buscador_cv
    await supabase.from("perfiles").update({ tipo: "cv" }).eq("id", _userId)

    // Guardar datos en tabla curriculum (buscador_cv.html los lee de ahí)
    const { data: existing } = await supabase.from("curriculum")
      .select("id").eq("usuario_id", _userId).maybeSingle()

    const cvPayload = {
      usuario_id:         _userId,
      titulo_profesional: "Vendedor/a · LocalWeb & Trabajos Cerca",
      habilidades:        document.getElementById("cvHabilidades")?.value || "Ventas, Atención al cliente",
      disponibilidad:     "inmediata",
      modalidad:          "remoto",
      cv_publico:         true
    }
    const res = document.getElementById("cvExperiencia")?.value
    if(res) cvPayload.resumen = res

    if(existing) {
      await supabase.from("curriculum").update(cvPayload).eq("id", existing.id)
    } else {
      await supabase.from("curriculum").insert(cvPayload)
    }

    // Notificación interna
    await supabase.from("notificaciones").insert({
      usuario_id: _userId, tipo: "sistema",
      titulo: "✅ Tu postulación fue enviada a RRHH",
      cuerpo: "Revisamos cada postulación y te contactamos en 48hs. También aparecés en el buscador de trabajo de Trabajos Cerca.",
      url: "/perfil.html"
    }).catch(()=>{})

    document.getElementById("popupTerminos").style.display = "none"
    location.href = "/perfil.html?vendedor=ok"

  } catch(e) {
    alert("Error al guardar: " + e.message)
    document.getElementById("btnAceptarTerminos").innerHTML = `✅ Acepto y quiero aparecer en el buscador`
  }
}

/* ── Términos: Rechazar ── */
window.rechazarTerminos = function() {
  document.getElementById("popupTerminos").style.display = "none"
  location.href = "/perfil.html?vendedor=ok"
}

/* ── Helpers ── */
function showMsg(el, type, text) {
  if(!el) return
  el.className = "form-msg " + type
  el.textContent = text
  el.style.display = "block"
  setTimeout(() => { el.style.display = "none" }, 5000)
}

/* ── Mostrar popup en perfil si viene de vendedores ── */
;(function checkVendedorParam() {
  if(location.search.includes("vendedor=ok")) {
    // Eliminar param de URL
    history.replaceState({}, "", location.pathname)
    // El popup se muestra desde perfil.js — no se puede hacer desde aquí
    // Solo marcamos en localStorage para que perfil.js lo levante
    localStorage.setItem("tc_vendedor_ok", "1")
  }
})()

init()
