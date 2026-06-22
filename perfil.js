import { supabase } from "./supabase.js"

/* ── Crédito de referido ── */
async function creditarReferido(nuevoUserId){
  const ref = localStorage.getItem('tc_ref')
  if(!ref || ref === nuevoUserId) return
  try {
    const { data: ya } = await supabase.from("referidos").select("id").eq("referido_id", nuevoUserId).maybeSingle()
    if(ya) return
    await supabase.from("referidos").insert({ referidor_id: ref, referido_id: nuevoUserId })
    const { data: rp } = await supabase.from("perfiles").select("puntos_referidos").eq("id", ref).single()
    const pts = (rp?.puntos_referidos || 0) + 1
    await supabase.from("perfiles").update({ puntos_referidos: pts }).eq("id", ref)
    await supabase.from("notificaciones").insert({
      usuario_id: ref, tipo: "sistema",
      titulo: "🎉 ¡Ganaste 1 punto de referido!",
      cuerpo: "Alguien se registró con tu link de invitación. ¡Seguí compartiendo!",
      url: "/perfil.html"
    })
    localStorage.removeItem('tc_ref')
  } catch(e){ console.warn("creditarReferido:", e) }
}

async function init(){
  const { data: userData } = await supabase.auth.getUser()
  if(!userData.user){ location.href = "/login.html"; return }

  const userId = userData.user.id

  /* ── Guardar perfil pendiente del registro (cuando se confirma email) ── */
  const pending = localStorage.getItem("pendingPerfil")
  if(pending){
    try {
      const perfilData = JSON.parse(pending)
      const { data: existing } = await supabase.from("perfiles").select("id").eq("id", userId).single()
      if(!existing){
        await supabase.from("perfiles").insert({ id: userId, ...perfilData })
        await creditarReferido(userId)
      }
    } catch(e){}
    localStorage.removeItem("pendingPerfil")
  }

  const { data, error } = await supabase
    .from("perfiles").select("*").eq("id", userId).single()

  if(error || !data){
    document.getElementById("dash").innerHTML = `
      <div class="alerta alerta-err" style="margin-bottom:16px;">No se encontraron tus datos de perfil.</div>
      <a href="/perfil_servicio.html?tipo=oficio" class="btn btn-orange" style="margin-bottom:10px;">
        <i class="fa-solid fa-wrench"></i> Completar como Oficio
      </a>
      <a href="/perfil_servicio.html?tipo=profesional" class="btn btn-primary" style="margin-bottom:10px;">
        <i class="fa-solid fa-graduation-cap"></i> Completar como Profesional
      </a>`
    return
  }

  /* ── Verificar servicios cargados ── */
  const { data: srvCheck } = await supabase
    .from("servicios").select("id,categoria").eq("usuario_id", userId).maybeSingle()

  /* ── Configuración de tipos de perfil ── */
  const TIPOS_OPTS = [
    { id:"oficio",         emoji:"🔧", label:"Oficio",          labelLargo:"Ofrezco un oficio",
      desc:"Plomero, electricista, albañil, carpintero...",
      color:"#92400e", bg:"#fef3c7", border:"#fde68a", hover:"#f59e0b" },
    { id:"profesional",    emoji:"👔", label:"Profesional",      labelLargo:"Soy profesional universitario",
      desc:"Médico, abogado, contador, arquitecto...",
      color:"#5b21b6", bg:"#ede9fe", border:"#ddd6fe", hover:"#7c3aed" },
    { id:"emprendimiento", emoji:"🚀", label:"Emprendimiento",   labelLargo:"Tengo un emprendimiento",
      desc:"Local, marca propia, gastronomía, artesanías...",
      color:"#065f46", bg:"#d1fae5", border:"#a7f3d0", hover:"#059669" },
    { id:"cv",             emoji:"📄", label:"CV / Empleo",      labelLargo:"Busco empleo — publicar mi CV",
      desc:"Aparecer en el buscador de empleados",
      color:"#0c4a6e", bg:"#e0f2fe", border:"#bae6fd", hover:"#0369a1" },
    { id:"empresa",        emoji:"🏢", label:"Empresa",          labelLargo:"Soy empresa o negocio",
      desc:"Publicar ofertas de trabajo y buscar empleados",
      color:"#1e40af", bg:"#eff6ff", border:"#bfdbfe", hover:"#2563eb" },
  ]

  // Tipos registrados = tiene servicios Y el tipo está en el CSV de tipo
  const tieneServicio   = !!srvCheck
  const tiposCSV        = (data.tipo || "").split(",").map(t => t.trim()).filter(t => t && t !== "profesional" || tieneServicio && t === "profesional")
  // Si no tiene servicio configurado, no hay tipos registrados todavía
  const tiposRegistrados = tieneServicio ? tiposCSV : []

  const registrados  = TIPOS_OPTS.filter(t => tiposRegistrados.includes(t.id))
  const pendientes   = TIPOS_OPTS.filter(t => !tiposRegistrados.includes(t.id))

  const btnTipo = (t, esPrimero) => `
    <a href="/perfil_servicio.html?tipo=${t.id}" style="
      display:flex;align-items:center;gap:14px;padding:14px 16px;
      background:${esPrimero ? t.bg : 'white'};
      border:2px solid ${esPrimero ? t.border : '#e2e8f0'};
      border-radius:12px;text-decoration:none;transition:all .18s;"
      onmouseover="this.style.borderColor='${t.hover}';this.style.background='${t.bg}'"
      onmouseout="this.style.borderColor='${esPrimero ? t.border : '#e2e8f0'}';this.style.background='${esPrimero ? t.bg : 'white'}'">
      <span style="font-size:26px;flex-shrink:0;">${t.emoji}</span>
      <div style="flex:1;">
        <strong style="display:block;font-size:14px;font-weight:800;color:${t.color};">${t.labelLargo}</strong>
        <span style="font-size:12px;color:#64748b;">${t.desc}</span>
      </div>
      <i class="fa-solid fa-chevron-right" style="color:#cbd5e1;"></i>
    </a>`

  // Categorías registradas como oficios (puede ser "Plomería, Electricidad, Informática")
  const catsOficio = srvCheck?.categoria
    ? srvCheck.categoria.split(',').map(c => c.trim()).filter(Boolean)
    : []

  const btnModificar = (t) => {
    let labelActivo, subLabel
    if(t.id === 'oficio' && catsOficio.length) {
      const count = catsOficio.length
      labelActivo = `✅ Registrado en ${count} oficio${count > 1 ? 's' : ''} — perfil activo`
      subLabel = catsOficio.join(' · ')
    } else {
      labelActivo = `✅ ${t.label} registrado — perfil activo`
      subLabel = t.desc
    }
    return `
    <div style="display:flex;align-items:center;gap:12px;padding:12px 14px;
      background:${t.bg};border:2px solid ${t.border};border-radius:12px;">
      <span style="font-size:22px;flex-shrink:0;">${t.emoji}</span>
      <div style="flex:1;min-width:0;">
        <strong style="display:block;font-size:13px;font-weight:700;color:${t.color};">
          ${labelActivo}
        </strong>
        <span style="display:block;font-size:11px;color:#64748b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${subLabel}</span>
      </div>
      <a href="/perfil_servicio.html?tipo=${t.id}" style="
        white-space:nowrap;font-size:12px;font-weight:700;color:${t.color};
        background:white;border:1.5px solid ${t.border};border-radius:8px;
        padding:5px 12px;text-decoration:none;flex-shrink:0;">
        <i class="fa-solid fa-pen"></i> Modificar
      </a>
    </div>`
  }

  let misPerfilesHtml = ""
  if(registrados.length === 0) {
    // Usuario nuevo — mostrar 5 botones de registro
    misPerfilesHtml = `
    <div style="background:#fff;border:1.5px solid #e2e8f0;border-radius:14px;padding:18px;margin-bottom:16px;">
      <h3 style="margin:0 0 6px;font-size:16px;font-weight:800;">
        <i class="fa-solid fa-id-card" style="color:#2563eb;"></i> ¿Cómo querés aparecer?
      </h3>
      <p style="margin:0 0 14px;font-size:13px;color:#64748b;">Elegí uno o más. Podés agregar más después.</p>
      <div style="display:flex;flex-direction:column;gap:10px;">
        ${TIPOS_OPTS.map(t => btnTipo(t, true)).join("")}
      </div>
    </div>`
  } else {
    // Usuario con perfiles registrados
    misPerfilesHtml = `
    <div style="background:#fff;border:1.5px solid #e2e8f0;border-radius:14px;padding:18px;margin-bottom:16px;">
      <h3 style="margin:0 0 14px;font-size:16px;font-weight:800;">
        <i class="fa-solid fa-id-card" style="color:#2563eb;"></i> Mis perfiles
      </h3>
      <div style="display:flex;flex-direction:column;gap:8px;">
        ${registrados.map(t => btnModificar(t)).join("")}
      </div>
      ${pendientes.length ? `
      <div style="margin-top:16px;padding-top:14px;border-top:1px solid #f1f5f9;">
        <p style="margin:0 0 10px;font-size:13px;font-weight:700;color:#64748b;">
          <i class="fa-solid fa-plus-circle" style="color:#2563eb;"></i> ¿Querés agregar algo más?
        </p>
        <div style="display:flex;flex-direction:column;gap:8px;">
          ${pendientes.map(t => btnTipo(t, false)).join("")}
        </div>
      </div>` : ""}
    </div>`
  }

  /* ── Completitud del perfil ── */
  const campos = [data.foto, data.nombre, data.apellido, data.movil, data.localidad, data.direccion, data.telefono_fijo]
  const completitud = Math.round((campos.filter(Boolean).length / campos.length) * 100)

  const fotoHtml = data.foto
    ? `<img src="${data.foto}" class="dash-avatar">`
    : `<div class="dash-avatar-placeholder"><i class="fa-solid fa-user"></i></div>`

  const _tipo = data.tipo || "profesional"

  const BADGE = {
    oficio:         '<span class="badge" style="background:#fef3c7;color:#92400e;border:1px solid #fde68a;">🔧 Oficio</span>',
    profesional:    '<span class="badge badge-pro">👔 Profesional</span>',
    empresa:        '<span class="badge" style="background:#e0f2fe;color:#0369a1;border:1px solid #bae6fd;">🏢 Empresa</span>',
    emprendimiento: '<span class="badge" style="background:#d1fae5;color:#065f46;border:1px solid #a7f3d0;">🚀 Emprendimiento</span>',
    cv:             '<span class="badge badge-work">📄 Busca trabajo</span>',
    empleador:      '<span class="badge" style="background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;">🏢 Empleador</span>',
    cliente:        '<span class="badge" style="background:#dbeafe;color:#1d4ed8;border:1px solid #93c5fd;">🔍 Cliente</span>'
  }
  const badgeHtml = BADGE[_tipo] || BADGE.profesional

  const ACCION = {
    oficio:         `<a href="/perfil_servicio.html" class="btn btn-orange"><i class="fa-solid fa-wrench"></i> Gestionar mi perfil de oficio</a>`,
    profesional:    `<a href="/perfil_servicio.html" class="btn btn-orange"><i class="fa-solid fa-tools"></i> Gestionar mi servicio</a>`,
    empresa:        `<a href="/perfil_servicio.html" class="btn btn-orange"><i class="fa-solid fa-building"></i> Gestionar mi empresa</a>`,
    emprendimiento: `<a href="/perfil_servicio.html" class="btn btn-orange"><i class="fa-solid fa-rocket"></i> Gestionar mi emprendimiento</a>`,
    cv:             `<a href="/perfil_cv.html"       class="btn btn-success"><i class="fa-solid fa-file-lines"></i> Gestionar mi CV</a>`,
    empleador:      `<a href="/buscador_trabajos.html" class="btn btn-success"><i class="fa-solid fa-users"></i> Buscar empleados</a>`,
    cliente:        `<a href="/buscador.html" class="btn btn-primary"><i class="fa-solid fa-magnifying-glass"></i> Buscar oficios y profesionales</a>`
  }
  const accionPrincipal = ACCION[_tipo] || ACCION.profesional

  /* ── Buscadores donde aparecer (multi-tipo) / o buscadores para cliente ── */
  const tiposActivos = (data.tipo || _tipo).split(",").map(t => t.trim()).filter(Boolean)

  const BUSCADORES_LINKS = [
    { href:"/buscador_oficios.html",        emoji:"🔧", label:"Buscar oficios",          desc:"Plomeros, electricistas, albañiles, pintores..." },
    { href:"/buscador_profesionales.html",  emoji:"👔", label:"Buscar profesionales",     desc:"Médicos, abogados, contadores, psicólogos..." },
    { href:"/buscador_emprendimientos.html",emoji:"🚀", label:"Buscar emprendimientos",   desc:"Locales, marcas, proyectos y negocios" },
    { href:"/buscar-empleo.html",            emoji:"📄", label:"Ver CVs / buscar empleados",desc:"Encontrá personas en búsqueda de trabajo" },
    { href:"/buscador_trabajos.html",       emoji:"💼", label:"Ofertas de trabajo",        desc:"Puestos publicados por empresas y empleadores" },
  ]

  let buscadoresHtml
  if(_tipo === "cliente"){
    buscadoresHtml = `
    <div style="background:#eff6ff;border:1.5px solid #bfdbfe;border-radius:14px;padding:16px 18px;margin-bottom:16px;">
      <h3 style="margin:0 0 6px;font-size:16px;font-weight:800;">
        <i class="fa-solid fa-magnifying-glass" style="color:#2563eb;"></i> Buscadores disponibles
      </h3>
      <p style="margin:0 0 14px;font-size:12px;color:#1d4ed8;">Encontrá el profesional, oficio o servicio que necesitás.</p>
      <div style="display:flex;flex-direction:column;gap:8px;">
        ${BUSCADORES_LINKS.map(b => `
          <a href="${b.href}" style="display:flex;align-items:center;gap:12px;padding:12px 14px;
            background:white;border:1.5px solid #dbeafe;border-radius:10px;
            text-decoration:none;color:inherit;transition:background .15s;"
            onmouseover="this.style.background='#dbeafe'" onmouseout="this.style.background='white'">
            <span style="font-size:22px;flex-shrink:0;">${b.emoji}</span>
            <div style="flex:1;">
              <strong style="display:block;font-size:13px;color:#1e293b;">${b.label}</strong>
              <span style="font-size:11px;color:#64748b;">${b.desc}</span>
            </div>
            <i class="fa-solid fa-chevron-right" style="color:#93c5fd;font-size:12px;flex-shrink:0;"></i>
          </a>`).join("")}
      </div>
    </div>`
  } else {
    const BUSCADORES_OPTS = [
      { id:"oficio",         emoji:"🔧", label:"Buscador de Oficios",         desc:"Plomeros, electricistas, carpinteros..." },
      { id:"profesional",    emoji:"👔", label:"Buscador de Profesionales",    desc:"Médicos, abogados, contadores..." },
      { id:"emprendimiento", emoji:"🚀", label:"Buscador de Emprendimientos",  desc:"Locales, marcas y proyectos propios" },
      { id:"cv",             emoji:"📄", label:"Buscador de CVs / Empleados",  desc:"Aparecés buscando trabajo" },
      { id:"empresa",        emoji:"🏢", label:"Ofertas de Trabajo",           desc:"Publicás puestos y buscás empleados" },
    ]
    buscadoresHtml = `
    <div style="background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:14px;padding:16px 18px;margin-bottom:16px;">
      <h3 style="margin:0 0 6px;font-size:16px;font-weight:800;">
        <i class="fa-solid fa-magnifying-glass" style="color:#2563eb;"></i> ¿En qué buscadores querés aparecer?
      </h3>
      <p style="margin:0 0 14px;font-size:12px;color:#64748b;">Podés aparecer en varios a la vez. Tu formulario principal sigue siendo el que ya completaste.</p>
      <div style="display:flex;flex-direction:column;gap:8px;">
        ${BUSCADORES_OPTS.map(b => `
          <label style="display:flex;align-items:center;gap:12px;padding:10px 12px;
            background:${tiposActivos.includes(b.id) ? '#eff6ff' : 'white'};
            border:1.5px solid ${tiposActivos.includes(b.id) ? '#bfdbfe' : '#e2e8f0'};
            border-radius:10px;cursor:pointer;transition:all .15s;"
            onclick="toggleBuscador('${b.id}','${userId}')">
            <span style="font-size:22px;flex-shrink:0;">${b.emoji}</span>
            <div style="flex:1;">
              <strong style="display:block;font-size:13px;color:#1e293b;">${b.label}</strong>
              <span style="font-size:11px;color:#64748b;">${b.desc}</span>
            </div>
            <span id="check-buscador-${b.id}" style="
              width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;
              background:${tiposActivos.includes(b.id) ? '#2563eb' : '#e2e8f0'};
              color:white;font-size:12px;flex-shrink:0;">
              ${tiposActivos.includes(b.id) ? '<i class="fa-solid fa-check"></i>' : ''}
            </span>
          </label>`).join("")}
      </div>
    </div>`
  }

  /* ── Disponibilidad + Estadísticas + Trabajos realizados (solo profesionales) ── */
  let disponibleHtml = ""
  let statsHtml      = ""
  let trabajosHtml   = ""
  if(_tipo === "profesional" || _tipo === "oficio" || _tipo === "empresa" || _tipo === "emprendimiento"){
    const { data: srv } = await supabase
      .from("servicios").select("id,disponible,disponible_ahora").eq("usuario_id", userId).single()
    const isDisp      = srv?.disponible !== false
    const isDispAhora = srv?.disponible_ahora === true

    disponibleHtml = `
      <div style="background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:14px;padding:16px 18px;margin-bottom:16px;">
        <h3 style="margin:0 0 14px;font-size:16px;font-weight:800;"><i class="fa-solid fa-circle-dot" style="color:#22c55e;"></i> Disponibilidad</h3>

        <!-- Visible en búsquedas -->
        <div class="toggle-wrap" style="margin-bottom:12px;">
          <label class="toggle">
            <input type="checkbox" id="toggleDisponible" ${isDisp ? "checked" : ""}
              onchange="cambiarDisponibilidad(this.checked,'${srv?.id || ""}')">
            <span class="toggle-slider"></span>
          </label>
          <div>
            <strong id="labelDisp" style="font-size:14px;">${isDisp ? "Visible en búsquedas" : "Oculto en búsquedas"}</strong>
            <p style="margin:1px 0 0;font-size:12px;color:#64748b;">
              ${isDisp ? "Los clientes pueden encontrarte" : "No aparecés en los resultados"}
            </p>
          </div>
        </div>

        <!-- Disponible Ahora -->
        <div style="border-top:1px solid #e2e8f0;padding-top:12px;">
          <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">
            <div>
              <strong style="font-size:14px;display:flex;align-items:center;gap:6px;">
                ${isDispAhora ? `<span style="width:10px;height:10px;background:#22c55e;border-radius:50%;display:inline-block;animation:pulse-green 2s infinite;flex-shrink:0;"></span>` : `<span style="width:10px;height:10px;background:#cbd5e1;border-radius:50%;display:inline-block;flex-shrink:0;"></span>`}
                <span id="labelDispAhora">${isDispAhora ? "Disponible ahora" : "No disponible ahora"}</span>
              </strong>
              <p style="margin:1px 0 0;font-size:12px;color:#64748b;" id="subDispAhora">
                ${isDispAhora ? "Aparecés con punto verde en los resultados · dura 8 horas" : "Activalo cuando podés atender clientes al momento"}
              </p>
            </div>
            <button onclick="toggleDispAhora('${srv?.id || ""}', ${!isDispAhora})"
              id="btnDispAhora"
              style="background:${isDispAhora ? "#dcfce7" : "#f1f5f9"};border:1.5px solid ${isDispAhora ? "#86efac" : "#e2e8f0"};color:${isDispAhora ? "#16a34a" : "#64748b"};border-radius:10px;padding:8px 16px;font-weight:700;font-size:13px;cursor:pointer;white-space:nowrap;transition:all .2s;">
              ${isDispAhora ? "🟢 Desactivar" : "⚡ Estoy disponible"}
            </button>
          </div>
        </div>
      </div>`

    /* ── Estadísticas ── */
    const hace7 = new Date(Date.now() - 7*24*60*60*1000).toISOString()
    const { data: eventos } = await supabase
      .from("perfil_eventos")
      .select("tipo")
      .eq("profesional_id", userId)
      .gte("created_at", hace7)

    const vistas   = eventos?.filter(e => e.tipo === "vista").length    || 0
    const waClicks = eventos?.filter(e => e.tipo === "wa_click").length  || 0

    const { count: favCount } = await supabase
      .from("favoritos").select("id", { count: "exact", head: true })
      .eq("profesional_id", userId)

    const { data: allItems } = await supabase
      .from("servicios").select("usuario_id, perfiles(plan_nivel)")
      .eq("activo", true).limit(500)
    const posicion = (allItems?.findIndex(s => s.usuario_id === userId) ?? -1) + 1

    statsHtml = `
      <div style="background:linear-gradient(135deg,#1e293b,#334155);border-radius:14px;padding:18px 20px;margin-bottom:16px;color:white;">
        <h3 style="margin:0 0 14px;font-size:15px;font-weight:800;color:white;">
          <i class="fa-solid fa-chart-line" style="color:#38bdf8;"></i> Tus estadísticas — últimos 7 días
        </h3>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:12px;">
          <div style="background:rgba(255,255,255,.08);border-radius:10px;padding:12px;text-align:center;">
            <div style="font-size:26px;font-weight:900;color:#38bdf8;">${vistas}</div>
            <div style="font-size:11px;color:#94a3b8;margin-top:2px;"><i class="fa-solid fa-eye"></i> Vistas del perfil</div>
          </div>
          <div style="background:rgba(255,255,255,.08);border-radius:10px;padding:12px;text-align:center;">
            <div style="font-size:26px;font-weight:900;color:#4ade80;">${waClicks}</div>
            <div style="font-size:11px;color:#94a3b8;margin-top:2px;"><i class="fa-brands fa-whatsapp"></i> Clicks WhatsApp</div>
          </div>
          <div style="background:rgba(255,255,255,.08);border-radius:10px;padding:12px;text-align:center;">
            <div style="font-size:26px;font-weight:900;color:#f472b6;">${favCount || 0}</div>
            <div style="font-size:11px;color:#94a3b8;margin-top:2px;">❤️ Guardados</div>
          </div>
        </div>
        <div style="background:rgba(255,255,255,.06);border-radius:8px;padding:10px 14px;display:flex;align-items:center;justify-content:space-between;">
          <span style="font-size:13px;color:#cbd5e1;">
            <i class="fa-solid fa-trophy" style="color:#fbbf24;margin-right:5px;"></i>
            ${posicion > 0 ? `Posición <strong style="color:white;">#${posicion}</strong> en el buscador` : "Completá tu perfil para aparecer en búsquedas"}
          </span>
          <a href="/buscador_oficios.html" style="font-size:11px;color:#38bdf8;text-decoration:none;">Ver buscador →</a>
        </div>
      </div>`

    /* ── Trabajos realizados (solo tipo oficio) ── */
    if(_tipo === "oficio") {
    const planNivel  = data.plan_nivel || 0
    const maxTrab    = planNivel >= 3 ? 5 : planNivel === 2 ? 2 : planNivel === 1 ? 1 : 0

    if(planNivel === 0){
      trabajosHtml = `
      <div onclick="window.abrirModalTrabajos()" style="
        background:linear-gradient(135deg,#c2410c,#f97316,#fb923c);
        border-radius:16px;padding:20px 20px;margin-bottom:16px;
        cursor:pointer;position:relative;overflow:hidden;
        transition:transform .2s,box-shadow .2s;box-shadow:0 4px 20px rgba(249,115,22,.3);"
        onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 8px 28px rgba(249,115,22,.4)'"
        onmouseout="this.style.transform='';this.style.boxShadow='0 4px 20px rgba(249,115,22,.3)'">
        <div style="position:absolute;top:-30px;right:-20px;width:110px;height:110px;background:rgba(255,255,255,.08);border-radius:50%;"></div>
        <div style="position:absolute;bottom:-30px;left:10px;width:80px;height:80px;background:rgba(255,255,255,.06);border-radius:50%;"></div>
        <div style="position:relative;">
          <div style="display:flex;align-items:flex-start;gap:14px;margin-bottom:14px;">
            <span style="font-size:38px;line-height:1;flex-shrink:0;">📷</span>
            <div>
              <p style="margin:0 0 3px;font-size:17px;font-weight:900;color:white;line-height:1.2;">Mostrá tus trabajos realizados</p>
              <p style="margin:0;font-size:13px;color:rgba(255,255,255,.9);line-height:1.5;">
                Los clientes confían <strong style="color:white;text-decoration:underline;">3× más</strong> en profesionales con fotos reales. ¡Destacate de la competencia!
              </p>
            </div>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:7px;margin-bottom:14px;">
            <span style="background:rgba(255,255,255,.2);border-radius:20px;padding:5px 11px;font-size:12px;color:white;font-weight:600;">📈 +200% más contactos</span>
            <span style="background:rgba(255,255,255,.2);border-radius:20px;padding:5px 11px;font-size:12px;color:white;font-weight:600;">⭐ Mejor posición</span>
            <span style="background:rgba(255,255,255,.2);border-radius:20px;padding:5px 11px;font-size:12px;color:white;font-weight:600;">💵 Desde $10.000/mes</span>
          </div>
          <div style="display:inline-flex;align-items:center;gap:8px;background:white;color:#c2410c;border-radius:10px;padding:11px 22px;font-size:15px;font-weight:900;box-shadow:0 3px 12px rgba(0,0,0,.2);">
            <i class="fa-solid fa-camera"></i> Ver planes — Activar ahora
          </div>
        </div>
      </div>`
    } else {
      const planLabel = planNivel >= 3 ? "Pro" : planNivel === 2 ? "Estándar" : "Básico"
      trabajosHtml = `
      <div style="background:white;border:2px solid #bbf7d0;border-radius:14px;padding:16px 18px;margin-bottom:16px;display:flex;align-items:center;gap:14px;">
        <span style="font-size:32px;flex-shrink:0;">📸</span>
        <div style="flex:1;min-width:0;">
          <div style="display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-bottom:3px;">
            <span style="background:#dcfce7;color:#15803d;font-size:11px;font-weight:800;padding:2px 9px;border-radius:20px;border:1px solid #86efac;">✓ PLAN ${planLabel.toUpperCase()} ACTIVO</span>
          </div>
          <p style="margin:2px 0;font-size:14px;font-weight:700;color:#1e293b;">
            Podés subir hasta <strong>${maxTrab} trabajo${maxTrab>1?"s":""}</strong> con fotos
          </p>
          <p style="margin:0;font-size:12px;color:#64748b;">Tus clientes los ven en tu perfil público</p>
        </div>
        <a href="/perfil_servicio.html" style="display:flex;align-items:center;gap:6px;background:#f97316;color:white;text-decoration:none;border-radius:10px;padding:10px 14px;font-size:13px;font-weight:700;white-space:nowrap;flex-shrink:0;">
          <i class="fa-solid fa-plus"></i> Agregar fotos
        </a>
      </div>`
    }
    } // fin if(_tipo === "oficio")
  }

  /* ── Referidos ── */
  const puntosRef = data.puntos_referidos || 0
  const refLink   = `${location.origin}/?ref=${userId}`
  const referidosHtml = `
    <div style="background:linear-gradient(135deg,#7c3aed,#2563eb);border-radius:16px;padding:20px 20px;margin-bottom:16px;position:relative;overflow:hidden;">
      <div style="position:absolute;top:-30px;right:-20px;width:110px;height:110px;background:rgba(255,255,255,.08);border-radius:50%;"></div>
      <div style="position:absolute;bottom:-30px;left:10px;width:80px;height:80px;background:rgba(255,255,255,.06);border-radius:50%;"></div>
      <div style="position:relative;">
        <div style="display:flex;align-items:center;gap:14px;margin-bottom:14px;">
          <div style="background:rgba(255,255,255,.18);border-radius:14px;width:52px;height:52px;display:flex;align-items:center;justify-content:center;font-size:26px;flex-shrink:0;">🎁</div>
          <div>
            <p style="margin:0 0 2px;font-size:17px;font-weight:900;color:white;">Invitá amigos y ganá puntos</p>
            <p style="margin:0;font-size:13px;color:rgba(255,255,255,.85);">Cada persona que se registre con tu link suma <strong style="color:white;">1 punto</strong></p>
          </div>
        </div>
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:14px;">
          <div style="background:rgba(255,255,255,.15);border-radius:12px;padding:10px 18px;display:inline-flex;align-items:center;gap:8px;">
            <span style="font-size:30px;font-weight:900;color:white;line-height:1;">${puntosRef}</span>
            <span style="font-size:12px;color:rgba(255,255,255,.8);font-weight:700;">punto${puntosRef !== 1 ? "s" : ""}<br>ganado${puntosRef !== 1 ? "s" : ""}</span>
          </div>
        </div>
        <div style="background:rgba(255,255,255,.12);border-radius:11px;padding:10px 14px;margin-bottom:12px;display:flex;align-items:center;gap:8px;">
          <span style="font-size:12px;color:rgba(255,255,255,.7);word-break:break-all;flex:1;font-family:monospace;">${refLink}</span>
          <button id="btnCopiarRef"
            onclick="window.copiarRefLink('${refLink}')"
            style="background:white;color:#7c3aed;border:none;border-radius:8px;padding:7px 14px;font-size:12px;font-weight:800;cursor:pointer;white-space:nowrap;flex-shrink:0;">
            <i class="fa-solid fa-copy"></i> Copiar
          </button>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button onclick="window.compartirRefWA('${refLink}')"
            style="display:inline-flex;align-items:center;gap:7px;background:#25d366;color:white;border:none;border-radius:10px;padding:10px 16px;font-size:13px;font-weight:700;cursor:pointer;">
            <i class="fa-brands fa-whatsapp"></i> WhatsApp
          </button>
          <button onclick="window.compartirRefFB('${refLink}')"
            style="display:inline-flex;align-items:center;gap:7px;background:#1877f2;color:white;border:none;border-radius:10px;padding:10px 16px;font-size:13px;font-weight:700;cursor:pointer;">
            <i class="fa-brands fa-facebook"></i> Facebook
          </button>
          <button onclick="window.compartirRefNativo('${refLink}')"
            style="display:inline-flex;align-items:center;gap:7px;background:rgba(255,255,255,.2);color:white;border:none;border-radius:10px;padding:10px 16px;font-size:13px;font-weight:700;cursor:pointer;">
            <i class="fa-solid fa-share-nodes"></i> Más
          </button>
          <button onclick="window.abrirModalTickets()"
            style="display:inline-flex;align-items:center;gap:7px;background:rgba(255,255,255,.18);color:white;border:1.5px solid rgba(255,255,255,.3);border-radius:10px;padding:10px 16px;font-size:13px;font-weight:700;cursor:pointer;">
            🎟️ Mis Tickets <span style="background:#fbbf24;color:#1e293b;border-radius:99px;padding:0 7px;font-size:11px;font-weight:900;margin-left:2px;">${data.tickets_descuento||0}</span>
          </button>
        </div>
      </div>
    </div>`

  /* ── Favoritos guardados (todos los usuarios) ── */
  let guardadosHtml = ""
  const { data: favs } = await supabase
    .from("favoritos")
    .select("profesional_id, perfiles(id,nombre,apellido,nombre_empresa,mostrar_como,foto,localidad,verificado,destacado)")
    .eq("usuario_id", userId)
    .limit(20)

  if(favs?.length){
    guardadosHtml = `
      <hr style="margin:24px 0;border:none;border-top:1px solid #e2e8f0;">
      <h3 style="margin:0 0 14px;font-size:17px;"><i class="fa-solid fa-heart" style="color:#f43f5e;"></i> Mis guardados</h3>
      <div style="display:flex;flex-direction:column;gap:10px;">
        ${favs.map(f => {
          const p = f.perfiles || {}
          const nombre = (p.mostrar_como === "empresa" && p.nombre_empresa) ? p.nombre_empresa : `${p.nombre||""} ${p.apellido||""}`.trim()
          const foto = p.foto
            ? `<img src="${p.foto}" style="width:44px;height:44px;border-radius:50%;object-fit:cover;border:2px solid #e2e8f0;flex-shrink:0;">`
            : `<div style="width:44px;height:44px;border-radius:50%;background:#f1f5f9;display:flex;align-items:center;justify-content:center;color:#94a3b8;flex-shrink:0;font-size:18px;"><i class="fa-solid fa-user"></i></div>`
          return `<div style="background:white;border:1.5px solid #e2e8f0;border-radius:12px;padding:12px 14px;display:flex;align-items:center;gap:12px;">
            ${foto}
            <div style="flex:1;min-width:0;">
              <strong style="font-size:14px;">${nombre}</strong>
              ${p.localidad ? `<p style="margin:1px 0 0;font-size:12px;color:#64748b;"><i class="fa-solid fa-location-dot" style="font-size:10px;"></i> ${p.localidad}</p>` : ""}
            </div>
            <a href="/perfil_publico.html?id=${f.profesional_id}" class="btn btn-sm btn-outline" style="font-size:12px;">Ver perfil</a>
          </div>`
        }).join("")}
      </div>`
  }

  /* ── Banner bienvenida nueva empresa ── */
  const urlParams = new URLSearchParams(window.location.search)
  const esNuevaEmpresa = urlParams.get("nueva_empresa") === "1" && data.tipo === "empleador"
  const bannerEmpresa = esNuevaEmpresa ? `
    <div style="background:linear-gradient(135deg,#7c3aed,#2563eb);border-radius:16px;padding:22px 24px;margin-bottom:24px;color:white;">
      <div style="font-size:36px;margin-bottom:8px;">🎉</div>
      <h3 style="margin:0 0 6px;font-size:20px;font-weight:900;">¡Bienvenido a Trabajos Cerca!</h3>
      <p style="margin:0 0 14px;font-size:14px;opacity:.9;line-height:1.6;">
        Tu cuenta de empresa está lista. Ya podés explorar candidatos de tu zona, contactarlos por WhatsApp
        y publicar puestos disponibles. Completá los datos de tu empresa para que los candidatos te reconozcan.
      </p>
      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        <a href="/buscador_trabajos.html"
          style="display:inline-flex;align-items:center;gap:6px;padding:10px 18px;background:white;color:#7c3aed;border-radius:10px;font-weight:800;font-size:14px;text-decoration:none;">
          <i class="fa-solid fa-users"></i> Buscar candidatos ahora
        </a>
      </div>
    </div>` : ""

  /* ── Función para renderizar el perfil completo (no clientes) ── */
  function renderPerfilCompleto() {
    // Actualizar tipo a oficio para que aparezcan las opciones
    // (el usuario eligió empezar a ofrecer algo)
    document.getElementById("dash").innerHTML = `
    ${bannerEmpresa}
    <div class="dash-header">
      <div style="text-align:center;">
        ${fotoHtml}
        <div style="margin-top:8px;">
          <label for="inputFoto" style="cursor:pointer;color:#2563eb;font-size:12px;font-weight:600;">
            <i class="fa-solid fa-camera"></i> Cambiar foto
          </label>
          <input type="file" id="inputFoto" accept="image/*" style="display:none" onchange="subirFoto(this)">
        </div>
      </div>
      <div class="dash-info" style="flex:1;">
        <h3>${data.nombre || ""} ${data.apellido || ""}</h3>
        <p><i class="fa-solid fa-location-dot"></i> ${data.localidad || "Sin localidad"}${data.provincia ? ", " + data.provincia : ""}</p>
        <p><i class="fa-brands fa-whatsapp" style="color:#25D366"></i> ${data.movil || "Sin móvil"}</p>
        ${badgeHtml}
        <div style="margin-top:10px;">
          <p style="font-size:12px;color:#64748b;margin:0 0 4px;">Perfil completado: <strong>${completitud}%</strong></p>
          <div class="progreso-barra"><div class="progreso-fill" style="width:${completitud}%"></div></div>
          ${completitud < 100 ? '<p style="font-size:11px;color:#94a3b8;margin:4px 0 0;">Completá todos los datos para aparecer mejor posicionado</p>' : '<p style="font-size:11px;color:#16a34a;margin:4px 0 0;"><i class="fa-solid fa-check"></i> Perfil completo</p>'}
        </div>
      </div>
    </div>

    <button onclick="window.abrirGuiaUso('profesional')" style="
      display:flex;align-items:center;gap:14px;width:100%;padding:16px 20px;margin-bottom:12px;
      background:linear-gradient(135deg,#0f172a,#1e3a5f);border:1.5px solid #3b82f6;
      border-radius:14px;cursor:pointer;text-align:left;font-family:inherit;transition:box-shadow .2s;"
      onmouseover="this.style.boxShadow='0 4px 20px rgba(59,130,246,.3)'"
      onmouseout="this.style.boxShadow=''">
      <div style="width:46px;height:46px;border-radius:13px;background:linear-gradient(135deg,#2563eb,#7c3aed);display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;">📖</div>
      <div style="flex:1;">
        <div style="font-size:15px;font-weight:900;color:white;">Guía de uso completa</div>
        <div style="font-size:12px;color:#93c5fd;margin-top:2px;">Cómo conseguir más clientes, puntos, tickets y más →</div>
      </div>
    </button>

    <div class="dash-actions">
      <a href="/perfil_publico.html?id=${userId}" class="btn btn-outline" target="_blank" rel="noopener">
        <i class="fa-solid fa-eye"></i> Ver mi perfil público
      </a>
      <a href="/libreta.html" class="btn" style="background:#f59e0b;color:#1e293b;border:none;font-weight:800;">
        <i class="fa-solid fa-book"></i> Mis Clientes
      </a>
      <button class="btn" onclick="togglePanelCompartir()"
        style="background:linear-gradient(135deg,#833ab4,#fd1d1d,#fcb045);color:white;border:none;">
        <i class="fa-solid fa-share-nodes"></i> Compartir en redes
      </button>
    </div>

    ${data.tipo !== "cv" && data.tipo !== "cliente" ? `
    <div id="ticketToggleLabel" onclick="window._guardarTicketToggle()" style="margin-top:10px;display:flex;align-items:center;gap:14px;cursor:pointer;background:${data.acepta_ticket_descuento?'linear-gradient(135deg,#ede9fe,#eff6ff)':'#f8fafc'};border:1.5px solid ${data.acepta_ticket_descuento?'#c4b5fd':'#e2e8f0'};border-radius:14px;padding:14px 16px;transition:all .2s;user-select:none;">
      <div id="ticketToggleSliderDash" data-activo="${data.acepta_ticket_descuento?'1':'0'}" style="flex-shrink:0;width:44px;height:24px;border-radius:99px;background:${data.acepta_ticket_descuento?'#7c3aed':'#cbd5e1'};transition:background .2s;position:relative;">
        <div id="ticketToggleKnobDash" style="position:absolute;top:2px;left:2px;width:20px;height:20px;background:white;border-radius:50%;transition:transform .2s;transform:${data.acepta_ticket_descuento?'translateX(20px)':'translateX(0)'};box-shadow:0 1px 4px rgba(0,0,0,.2);"></div>
      </div>
      <div style="flex:1;min-width:0;">
        <div id="ticketToggleTitulo" style="font-size:14px;font-weight:800;color:${data.acepta_ticket_descuento?'#5b21b6':'#475569'};">⭐ Aceptar Ticket 10% OFF</div>
        <div id="ticketToggleDesc" style="font-size:12px;color:${data.acepta_ticket_descuento?'#6d28d9':'#94a3b8'};margin-top:2px;">${data.acepta_ticket_descuento?'Aparecés con estrella en el buscador':'Activalo para aparecer con estrella en el buscador'}</div>
      </div>
    </div>` : ""}

    <div id="panelCompartir" style="display:none;margin-top:12px;background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:14px;padding:16px 18px;">
      <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:.04em;">¿Qué querés compartir?</p>
      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        <button onclick="compartirPerfil('${userId}')" style="flex:1;min-width:140px;display:flex;align-items:center;justify-content:center;gap:8px;padding:12px 16px;border-radius:10px;border:none;cursor:pointer;background:linear-gradient(135deg,#833ab4,#fd1d1d,#fcb045);color:white;font-weight:700;font-size:14px;">
          <i class="fa-solid fa-user"></i> Mi perfil
        </button>
        <button onclick="compartirInicio()" style="flex:1;min-width:140px;display:flex;align-items:center;justify-content:center;gap:8px;padding:12px 16px;border-radius:10px;border:none;cursor:pointer;background:linear-gradient(135deg,#2563eb,#0ea5e9);color:white;font-weight:700;font-size:14px;">
          <i class="fa-solid fa-globe"></i> La página Trabajos Cerca
        </button>
        <button onclick="window.generarTarjetaProfesional('${userId}')" style="flex:1;min-width:140px;display:flex;align-items:center;justify-content:center;gap:8px;padding:12px 16px;border-radius:10px;border:none;cursor:pointer;background:linear-gradient(135deg,#f59e0b,#ef4444);color:white;font-weight:700;font-size:14px;">
          <i class="fa-solid fa-id-card"></i> Descargar mi tarjeta
        </button>
      </div>
      <div id="msgCompartir" style="margin-top:10px;"></div>
      <div id="previewTarjeta" style="display:none;margin-top:14px;text-align:center;">
        <p style="font-size:13px;color:#475569;margin:0 0 8px;font-weight:600;">📲 Guardá esta imagen y compartila en Instagram o Facebook</p>
        <canvas id="canvasTarjeta" style="max-width:100%;border-radius:14px;box-shadow:0 4px 24px rgba(0,0,0,.15);"></canvas>
        <div style="display:flex;gap:8px;justify-content:center;margin-top:10px;flex-wrap:wrap;">
          <button onclick="window.descargarTarjeta()" style="display:inline-flex;align-items:center;gap:7px;background:#0f172a;color:white;border:none;border-radius:10px;padding:10px 18px;font-size:13px;font-weight:700;cursor:pointer;">
            <i class="fa-solid fa-download"></i> Descargar PNG
          </button>
          <a href="https://www.instagram.com" target="_blank" style="display:inline-flex;align-items:center;gap:7px;background:linear-gradient(135deg,#833ab4,#fd1d1d,#fcb045);color:white;border:none;border-radius:10px;padding:10px 18px;font-size:13px;font-weight:700;text-decoration:none;">
            <i class="fa-brands fa-instagram"></i> Abrir Instagram
          </a>
          <button onclick="window.compartirTarjetaFB('${userId}')" style="display:inline-flex;align-items:center;gap:7px;background:#1877f2;color:white;border:none;border-radius:10px;padding:10px 18px;font-size:13px;font-weight:700;cursor:pointer;">
            <i class="fa-brands fa-facebook"></i> Compartir en Facebook
          </button>
        </div>
      </div>
    </div>

    ${misPerfilesHtml}
    ${statsHtml}
    ${buscadoresHtml}
    ${disponibleHtml}
    ${trabajosHtml}

    <h3 style="margin:0 0 16px;font-size:17px;">Mis datos</h3>
    <div class="grid-2col">
      <div><label>Nombre *</label><input id="editNombre" value="${esc(data.nombre)}"></div>
      <div><label>Apellido *</label><input id="editApellido" value="${esc(data.apellido)}"></div>
    </div>
    <label>Móvil / WhatsApp *</label>
    <input id="editMovil" value="${esc(data.movil)}" type="tel" placeholder="Ej: 1123456789">
    <label><i class="fa-brands fa-instagram" style="color:#e1306c;"></i> Instagram</label>
    <input id="editInstagram" value="${esc(data.instagram)}" placeholder="Ej: @tunombre">
    <label><i class="fa-brands fa-tiktok" style="color:#010101;"></i> TikTok</label>
    <input id="editTiktok" value="${esc(data.tiktok)}" placeholder="Ej: @tunombre">

    <label>Teléfono fijo</label>
    <input id="editTelefono" value="${esc(data.telefono_fijo)}" type="tel" placeholder="Ej: 02214567890">
    <label>Dirección</label>
    <input id="editDireccion" value="${esc(data.direccion)}" placeholder="Ej: Av. Rivadavia 1234, piso 2">
    <label>Código Postal</label>
    <input id="editCP" value="${esc(data.codigo_postal)}" placeholder="Ej: 1900" oninput="autocompletarCPPerfil(this.value)">
    <label>Localidad</label>
    <select id="editLocalidad">
      <option value="${esc(data.localidad)}">${esc(data.localidad) || "Ingresá el CP primero"}</option>
    </select>
    <label>Provincia</label>
    <input id="editProvincia" value="${esc(data.provincia)}" readonly placeholder="Se completa automático">
    <label>Email</label>
    <input value="${esc(data.email)}" readonly style="color:#94a3b8;">

    <div id="msgPerfil" style="margin-top:14px;"></div>
    <button class="btn btn-primary" onclick="guardarDatos()">
      <i class="fa-solid fa-save"></i> Guardar cambios
    </button>

    <hr style="margin:28px 0;border:none;border-top:1px solid #e2e8f0;">
    ${referidosHtml}
    ${guardadosHtml}
    <hr style="margin:28px 0;border:none;border-top:1px solid #e2e8f0;">
    <div id="adminBtnPerfil" style="display:none;margin-bottom:10px;">
      <a href="/admin.html" class="btn" style="background:linear-gradient(135deg,#7c3aed,#2563eb);color:white;border:none;width:100%;display:flex;align-items:center;justify-content:center;gap:8px;">
        <i class="fa-solid fa-shield-halved"></i> Panel de Administración
      </a>
    </div>
    <button class="btn btn-outline" onclick="cerrarSesion()" style="color:#ef4444;border-color:#ef4444;">
      <i class="fa-solid fa-right-from-bracket"></i> Cerrar sesión
    </button>

    <!-- Prode Mundial -->
    <div id="prodeCard" style="margin:28px 0 0;background:linear-gradient(135deg,#0f172a 0%,#1e1b4b 60%,#0f172a 100%);border:1.5px solid rgba(250,204,21,.35);border-radius:18px;padding:20px;overflow:hidden;position:relative;">
      <div style="position:absolute;top:-20px;right:-20px;font-size:90px;opacity:.06;pointer-events:none;">⚽</div>
      <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:14px;">
        <div style="font-size:36px;flex-shrink:0;">⚽🏆</div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:15px;font-weight:900;color:white;line-height:1.2;">Prode Mundial 2026</div>
          <div id="prodeStatus" style="font-size:12px;color:rgba(255,255,255,.55);margin-top:3px;">Verificando...</div>
        </div>
        <button onclick="window._abrirReglasMundial()" style="background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.28);color:rgba(255,255,255,.9);font-size:12px;font-weight:700;padding:7px 13px;border-radius:9px;cursor:pointer;flex-shrink:0;">📋 Reglas</button>
      </div>
      <div id="prodePartidosHoy" style="margin-bottom:14px;">
        <div style="font-size:9px;font-weight:800;letter-spacing:2px;color:#fbbf24;text-transform:uppercase;margin-bottom:10px;">📅 Partidos de hoy</div>
        <div id="prodeListaPartidos" style="display:flex;flex-direction:column;gap:8px;"><div style="color:rgba(255,255,255,.35);font-size:12px;text-align:center;padding:10px 0;">Cargando...</div></div>
      </div>
      <a href="/mundial.html" style="display:flex;align-items:center;justify-content:center;gap:10px;background:linear-gradient(135deg,#facc15,#f59e0b,#d97706);color:#1c1917;font-weight:900;font-size:15px;padding:14px;border-radius:13px;text-decoration:none;box-shadow:0 4px 20px rgba(250,204,21,.4);">
        ⚽ Entrar y participar →
      </a>
    </div>`

    cargarProdeCard(userId)
    cargarPartidoProde(userId)
    montarFAQChat()
    enviarRecordatorioCompartir(userId)
    mostrarPopupNuevosReferidos(userId)
    if(registrados.length === 0) mostrarBienvenida(userId)
    if(localStorage.getItem("tc_vendedor_ok")) { localStorage.removeItem("tc_vendedor_ok"); mostrarPopupVendedorOk() }
    if(data.admin) document.getElementById("adminBtnPerfil")?.style.setProperty("display","block")
  }

  /* ── Vista para postulantes CV / vendedores ── */
  if(_tipo === "cv") {
    // Verificar si ya tiene cv_publico activo
    const { data: cvData } = await supabase.from("curriculum")
      .select("cv_publico,titulo_profesional").eq("usuario_id", userId).maybeSingle()

    document.getElementById("dash").innerHTML = `
    <div class="dash-header">
      <div style="text-align:center;">
        ${fotoHtml}
        <div style="margin-top:8px;">
          <label for="inputFoto" style="cursor:pointer;color:#2563eb;font-size:12px;font-weight:600;">
            <i class="fa-solid fa-camera"></i> Cambiar foto
          </label>
          <input type="file" id="inputFoto" accept="image/*" style="display:none" onchange="subirFoto(this)">
        </div>
      </div>
      <div class="dash-info" style="flex:1;">
        <h3>${data.nombre || ""} ${data.apellido || ""}</h3>
        <p><i class="fa-solid fa-location-dot"></i> ${data.localidad || "Sin localidad"}${data.provincia ? ", " + data.provincia : ""}</p>
        <p><i class="fa-brands fa-whatsapp" style="color:#25D366"></i> ${data.movil || "Sin móvil"}</p>
        ${badgeHtml}
      </div>
    </div>

    <!-- Estado CV -->
    <div style="background:linear-gradient(135deg,#065f46,#1e40af);border-radius:18px;padding:20px 22px;margin-bottom:16px;color:white;">
      <div style="display:flex;align-items:center;gap:14px;">
        <div style="font-size:40px;flex-shrink:0;">📋</div>
        <div style="flex:1;">
          <div style="font-size:16px;font-weight:900;margin-bottom:4px;">Tu CV fue enviado a RRHH</div>
          <div style="font-size:13px;opacity:.85;line-height:1.5;">
            Estamos revisando tu postulación y te contactamos en las próximas <strong>48hs</strong> por WhatsApp o email.
          </div>
        </div>
      </div>
    </div>

    <!-- Acciones CV -->
    <a href="/perfil_cv.html" style="display:flex;align-items:center;gap:14px;padding:16px 18px;margin-bottom:10px;background:#f0fdf4;border:1.5px solid #86efac;border-radius:14px;text-decoration:none;transition:box-shadow .2s;"
      onmouseover="this.style.boxShadow='0 4px 16px rgba(34,197,94,.15)'" onmouseout="this.style.boxShadow=''">
      <div style="width:44px;height:44px;border-radius:12px;background:#16a34a;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;">✏️</div>
      <div style="flex:1;">
        <div style="font-size:15px;font-weight:800;color:#15803d;">Editar mi CV</div>
        <div style="font-size:12px;color:#64748b;margin-top:2px;">Actualizá tu información, experiencia y habilidades</div>
      </div>
      <i class="fa-solid fa-chevron-right" style="color:#86efac;"></i>
    </a>

    ${!cvData?.cv_publico ? `
    <button onclick="window._activarBuscadorCV()" style="display:flex;align-items:center;gap:14px;width:100%;padding:16px 18px;margin-bottom:10px;background:#eff6ff;border:2px dashed #93c5fd;border-radius:14px;cursor:pointer;font-family:inherit;text-align:left;transition:box-shadow .2s;"
      onmouseover="this.style.boxShadow='0 4px 16px rgba(37,99,235,.15)'" onmouseout="this.style.boxShadow=''">
      <div style="width:44px;height:44px;border-radius:12px;background:#2563eb;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;">🔍</div>
      <div style="flex:1;">
        <div style="font-size:15px;font-weight:800;color:#1e40af;">Aparecer en el buscador de CVs</div>
        <div style="font-size:12px;color:#64748b;margin-top:2px;">Activá tu CV para que empresas y empleadores te encuentren</div>
      </div>
      <i class="fa-solid fa-chevron-right" style="color:#93c5fd;"></i>
    </button>
    ` : `
    <div style="display:flex;align-items:center;gap:12px;padding:14px 18px;margin-bottom:10px;background:#eff6ff;border:1.5px solid #bfdbfe;border-radius:14px;">
      <i class="fa-solid fa-circle-check" style="color:#2563eb;font-size:20px;flex-shrink:0;"></i>
      <div style="flex:1;">
        <div style="font-size:14px;font-weight:800;color:#1e40af;">Tu CV está visible en el buscador</div>
        <div style="font-size:12px;color:#64748b;margin-top:2px;"><a href="/buscar-empleo.html" style="color:#2563eb;">Ver buscador de CVs →</a></div>
      </div>
    </div>
    `}

    <!-- Agregar otro tipo de perfil -->
    <button onclick="window._expandirPerfilCompleto()" style="display:flex;align-items:center;gap:14px;width:100%;padding:16px 18px;margin-bottom:20px;background:linear-gradient(135deg,#faf5ff,#eff6ff);border:1.5px solid #c4b5fd;border-radius:14px;cursor:pointer;font-family:inherit;text-align:left;transition:box-shadow .2s;"
      onmouseover="this.style.boxShadow='0 4px 16px rgba(124,58,237,.15)'" onmouseout="this.style.boxShadow=''">
      <div style="width:44px;height:44px;border-radius:12px;background:linear-gradient(135deg,#7c3aed,#2563eb);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;">🚀</div>
      <div style="flex:1;">
        <div style="font-size:15px;font-weight:800;color:#5b21b6;">Agregar oficio, profesión o emprendimiento</div>
        <div style="font-size:12px;color:#64748b;margin-top:2px;">También podés publicar tus servicios y llegar a más clientes</div>
      </div>
      <i class="fa-solid fa-chevron-right" style="color:#c4b5fd;"></i>
    </button>

    ${guardadosHtml}

    <hr style="margin:20px 0;border:none;border-top:1px solid #e2e8f0;">
    <div id="adminBtnPerfil" style="display:none;margin-bottom:10px;">
      <a href="/admin.html" class="btn" style="background:linear-gradient(135deg,#7c3aed,#2563eb);color:white;border:none;width:100%;display:flex;align-items:center;justify-content:center;gap:8px;">
        <i class="fa-solid fa-shield-halved"></i> Panel de Administración
      </a>
    </div>
    <button class="btn btn-outline" onclick="cerrarSesion()" style="color:#ef4444;border-color:#ef4444;">
      <i class="fa-solid fa-right-from-bracket"></i> Cerrar sesión
    </button>`

    window._expandirPerfilCompleto = function() { renderPerfilCompleto() }
    window._activarBuscadorCV = async function() {
      const { data: cv } = await supabase.from("curriculum").select("id").eq("usuario_id", userId).maybeSingle()
      if(!cv) { location.href = "/perfil_cv.html"; return }
      const { error } = await supabase.from("curriculum").update({ cv_publico: true }).eq("id", cv.id)
      if(!error) {
        // Agregar "cv" a los tipos existentes sin borrar los otros (ej. "oficio")
        const { data: perf } = await supabase.from("perfiles").select("tipo").eq("id", userId).single()
        const tiposActuales = (perf?.tipo || "").split(",").map(t => t.trim()).filter(Boolean)
        if(!tiposActuales.includes("cv")) tiposActuales.push("cv")
        await supabase.from("perfiles").update({ tipo: tiposActuales.join(",") }).eq("id", userId)
        location.reload()
      }
    }
    cargarProdeCard(userId)
    cargarPartidoProde(userId)
    if(localStorage.getItem("tc_vendedor_ok")) { localStorage.removeItem("tc_vendedor_ok"); mostrarPopupVendedorOk() }
    if(data.admin) document.getElementById("adminBtnPerfil")?.style.setProperty("display","block")
    return
  }

  /* ── Vista simplificada para clientes ── */
  if(_tipo === "cliente") {
    document.getElementById("dash").innerHTML = `
    <div class="dash-header">
      <div style="text-align:center;">
        ${fotoHtml}
        <div style="margin-top:8px;">
          <label for="inputFoto" style="cursor:pointer;color:#2563eb;font-size:12px;font-weight:600;">
            <i class="fa-solid fa-camera"></i> Cambiar foto
          </label>
          <input type="file" id="inputFoto" accept="image/*" style="display:none" onchange="subirFoto(this)">
        </div>
      </div>
      <div class="dash-info" style="flex:1;">
        <h3>${data.nombre || ""} ${data.apellido || ""}</h3>
        <p><i class="fa-solid fa-location-dot"></i> ${data.localidad || "Sin localidad"}${data.provincia ? ", " + data.provincia : ""}</p>
        <p><i class="fa-brands fa-whatsapp" style="color:#25D366"></i> ${data.movil || "Sin móvil"}</p>
        ${badgeHtml}
      </div>
    </div>

    <!-- Guía de uso -->
    <button onclick="window.abrirGuiaUso('cliente')" style="
      display:flex;align-items:center;gap:14px;width:100%;padding:16px 20px;margin-bottom:12px;
      background:linear-gradient(135deg,#0f172a,#1e3a5f);border:1.5px solid #3b82f6;
      border-radius:14px;cursor:pointer;text-align:left;font-family:inherit;transition:box-shadow .2s;"
      onmouseover="this.style.boxShadow='0 4px 20px rgba(59,130,246,.3)'"
      onmouseout="this.style.boxShadow=''">
      <div style="width:46px;height:46px;border-radius:13px;background:linear-gradient(135deg,#2563eb,#7c3aed);display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;">📖</div>
      <div style="flex:1;">
        <div style="font-size:15px;font-weight:900;color:white;">Guía de uso completa</div>
        <div style="font-size:12px;color:#93c5fd;margin-top:2px;">Cómo ganar puntos, tickets de descuento y mucho más →</div>
      </div>
    </button>

    <!-- Botón para ofrecer servicios -->
    <button onclick="window._expandirPerfilCompleto()" style="
      display:flex;align-items:center;gap:16px;width:100%;padding:20px 22px;
      background:linear-gradient(135deg,#f0fdf4,#eff6ff);
      border:2px dashed #86efac;border-radius:16px;cursor:pointer;text-align:left;
      font-family:inherit;transition:border-color .2s,box-shadow .2s;margin-bottom:20px;"
      onmouseover="this.style.borderColor='#22c55e';this.style.boxShadow='0 4px 16px rgba(34,197,94,.15)'"
      onmouseout="this.style.borderColor='#86efac';this.style.boxShadow=''">
      <div style="width:52px;height:52px;border-radius:14px;background:white;border:1.5px solid #86efac;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:26px;">🚀</div>
      <div style="flex:1;">
        <div style="font-size:16px;font-weight:800;color:#15803d;margin-bottom:3px;">¿Querés ofrecer tus servicios?</div>
        <div style="font-size:13px;color:#64748b;line-height:1.5;">Registrá tu oficio, profesión, emprendimiento o subí tu CV. Es gratis y llegás a clientes de tu zona.</div>
      </div>
      <i class="fa-solid fa-chevron-right" style="color:#86efac;font-size:16px;flex-shrink:0;"></i>
    </button>

    ${guardadosHtml}

    <!-- Tickets de Descuento -->
    <div id="ticketClienteCard" style="margin:0 0 20px;background:linear-gradient(135deg,#4c1d95,#1e40af);border-radius:18px;padding:20px;overflow:hidden;position:relative;cursor:pointer;"
      onclick="window.abrirModalTickets()">
      <div style="position:absolute;top:-20px;right:-20px;font-size:100px;opacity:.07;pointer-events:none;">🎟️</div>
      <div style="display:flex;align-items:center;gap:16px;">
        <div style="width:54px;height:54px;border-radius:16px;background:rgba(255,255,255,.15);display:flex;align-items:center;justify-content:center;font-size:28px;flex-shrink:0;">🎟️</div>
        <div style="flex:1;">
          <div style="font-size:16px;font-weight:900;color:white;margin-bottom:3px;">Mis Tickets de Descuento</div>
          <div style="font-size:13px;color:rgba(255,255,255,.8);">
            Tenés <strong id="ticketCountLabel" style="color:#fbbf24;">...</strong> ticket${(data.tickets_descuento||0)!==1?'s':''} disponible${(data.tickets_descuento||0)!==1?'s':''} •
            <span id="puntosTicketLabel" style="color:rgba(255,255,255,.7);">${puntosRef} pto${puntosRef!==1?'s':''}</span>
          </div>
        </div>
        <i class="fa-solid fa-chevron-right" style="color:rgba(255,255,255,.5);"></i>
      </div>
      <div id="barraProgTicket" style="margin-top:14px;background:rgba(255,255,255,.15);border-radius:99px;height:6px;overflow:hidden;">
        <div style="width:${Math.min(100,Math.round((puntosRef%10)/10*100))}%;height:100%;background:#fbbf24;border-radius:99px;transition:width .6s;"></div>
      </div>
      <div style="margin-top:6px;font-size:11px;color:rgba(255,255,255,.6);">${10-(puntosRef%10)>0?`${10-(puntosRef%10)} referido${10-(puntosRef%10)!==1?'s':''} más para ganar un ticket`:'¡Ticket disponible!'}</div>
    </div>

    <!-- Prode Mundial -->
    <div id="prodeCard" style="margin:20px 0;background:linear-gradient(135deg,#0f172a 0%,#1e1b4b 60%,#0f172a 100%);border:1.5px solid rgba(250,204,21,.35);border-radius:18px;padding:20px;overflow:hidden;position:relative;">
      <div style="position:absolute;top:-20px;right:-20px;font-size:90px;opacity:.06;pointer-events:none;">⚽</div>
      <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:14px;">
        <div style="font-size:36px;flex-shrink:0;">⚽🏆</div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:15px;font-weight:900;color:white;line-height:1.2;">Prode Mundial 2026</div>
          <div id="prodeStatus" style="font-size:12px;color:rgba(255,255,255,.55);margin-top:3px;">Verificando...</div>
        </div>
        <button onclick="window._abrirReglasMundial()" style="background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.28);color:rgba(255,255,255,.9);font-size:12px;font-weight:700;padding:7px 13px;border-radius:9px;cursor:pointer;flex-shrink:0;">📋 Reglas</button>
      </div>
      <div id="prodePartidosHoy" style="margin-bottom:14px;">
        <div style="font-size:9px;font-weight:800;letter-spacing:2px;color:#fbbf24;text-transform:uppercase;margin-bottom:10px;">📅 Partidos de hoy</div>
        <div id="prodeListaPartidos" style="display:flex;flex-direction:column;gap:8px;"><div style="color:rgba(255,255,255,.35);font-size:12px;text-align:center;padding:10px 0;">Cargando...</div></div>
      </div>
      <a href="/mundial.html" style="display:flex;align-items:center;justify-content:center;gap:10px;background:linear-gradient(135deg,#facc15,#f59e0b,#d97706);color:#1c1917;font-weight:900;font-size:15px;padding:14px;border-radius:13px;text-decoration:none;box-shadow:0 4px 20px rgba(250,204,21,.4);">
        ⚽ Entrar y participar →
      </a>
    </div>
    `
    window._expandirPerfilCompleto = function() {
      renderPerfilCompleto()
    }
    cargarProdeCard(userId)
    cargarPartidoProde(userId)
    if(localStorage.getItem("tc_vendedor_ok")) { localStorage.removeItem("tc_vendedor_ok"); mostrarPopupVendedorOk() }
    return
  }

  /* ── Vista completa (no clientes) ── */
  renderPerfilCompleto()
}


/* ── LOGO EMPRESA ── */
window.subirLogoEmpresa = async function(input){
  const file = input.files[0]; if(!file) return
  const { data: ud } = await supabase.auth.getUser()
  const uid = ud.user.id
  const name = `logo_empresa_${uid}_${Date.now()}`
  const msgEl = document.getElementById("msgLogoEmpresa")
  msgEl.innerHTML = '<span style="font-size:13px;color:#64748b;"><i class="fa-solid fa-spinner fa-spin"></i> Subiendo...</span>'
  const { error } = await supabase.storage.from("trabajos").upload(name, file, { upsert: true })
  if(error){ msgEl.innerHTML = `<div class="alerta alerta-err">${error.message}</div>`; return }
  const { data } = supabase.storage.from("trabajos").getPublicUrl(name)
  await supabase.from("perfiles").update({ empresa_logo: data.publicUrl }).eq("id", uid)
  msgEl.innerHTML = '<div class="alerta alerta-ok"><i class="fa-solid fa-check"></i> Logo guardado</div>'
  const prev = document.getElementById("logoEmpresaActual")
  if(prev) prev.innerHTML = `<img src="${data.publicUrl}" style="width:80px;height:80px;border-radius:12px;object-fit:cover;border:2px solid #bfdbfe;">`
  setTimeout(() => { msgEl.innerHTML = "" }, 3000)
}

/* ── MODAL TRABAJOS REALIZADOS ── */
window.abrirModalTrabajos = function(){
  document.getElementById("modalTrabajos").classList.add("activo")
  document.body.style.overflow = "hidden"
}
window.cerrarModalTrabajos = function(){
  document.getElementById("modalTrabajos").classList.remove("activo")
  document.body.style.overflow = ""
  document.getElementById("pasoEleccionT").style.display = "block"
  document.getElementById("pasoPagoT").style.display     = "none"
  window._planT = null
}
window.cerrarModalTrabajosClick = function(e){
  if(e.target === document.getElementById("modalTrabajos")) cerrarModalTrabajos()
}

/* ── MODAL PUBLICAR PUESTO ── */
window.abrirModalPuesto = function(){
  document.getElementById("modalPuestoOverlay").classList.add("activo")
  document.body.style.overflow = "hidden"
}
window.cerrarModalPuesto = function(){
  document.getElementById("modalPuestoOverlay").classList.remove("activo")
  document.body.style.overflow = ""
}
window.cerrarModalPuestoClick = function(e){
  if(e.target === document.getElementById("modalPuestoOverlay")) cerrarModalPuesto()
}

/* ── DISPONIBILIDAD ── */
window.cambiarDisponibilidad = async function(activo, servicioId){
  const lbl = document.getElementById("labelDisp")
  if(!servicioId) return
  await supabase.from("servicios").update({ disponible: activo }).eq("id", servicioId)
  lbl.textContent = activo ? "Visible en búsquedas" : "Oculto en búsquedas"
  lbl.nextElementSibling.textContent = activo ? "Los clientes pueden encontrarte" : "No aparecés en los resultados"
}

window.toggleDispAhora = async function(servicioId, nuevoVal){
  if(!servicioId) return
  const btn  = document.getElementById("btnDispAhora")
  const lbl  = document.getElementById("labelDispAhora")
  const sub  = document.getElementById("subDispAhora")
  if(btn) btn.disabled = true

  await supabase.from("servicios").update({ disponible_ahora: nuevoVal }).eq("id", servicioId)

  if(lbl) lbl.textContent = nuevoVal ? "Disponible ahora" : "No disponible ahora"
  if(sub) sub.textContent = nuevoVal
    ? "Aparecés con punto verde en los resultados · dura 8 horas"
    : "Activalo cuando podés atender clientes al momento"
  if(btn){
    btn.disabled = false
    btn.textContent = nuevoVal ? "🟢 Desactivar" : "⚡ Estoy disponible"
    btn.style.background    = nuevoVal ? "#dcfce7" : "#f1f5f9"
    btn.style.borderColor   = nuevoVal ? "#86efac" : "#e2e8f0"
    btn.style.color         = nuevoVal ? "#16a34a" : "#64748b"
    btn.setAttribute("onclick", `toggleDispAhora('${servicioId}', ${!nuevoVal})`)
  }

  // Auto-apagar después de 8 horas (registro del tiempo de activación)
  if(nuevoVal){
    localStorage.setItem("dispAhoraActivado", Date.now().toString())
    setTimeout(() => {
      supabase.from("servicios").update({ disponible_ahora: false }).eq("id", servicioId)
        .then(() => { if(lbl) lbl.textContent = "No disponible ahora" })
    }, 8 * 60 * 60 * 1000)
  } else {
    localStorage.removeItem("dispAhoraActivado")
  }
}

/* ── AUTOCOMPLETAR CP EN PERFIL ── */
window.autocompletarCPPerfil = async function(codigo){
  if(codigo.trim().length < 4) return
  try {
    const res = await fetch(`https://api.zippopotam.us/ar/${codigo.trim()}`)
    if(!res.ok) return
    const data = await res.json()
    const sel = document.getElementById("editLocalidad")
    sel.innerHTML = ""
    data.places.forEach(p => {
      const o = document.createElement("option"); o.value = o.textContent = p["place name"]; sel.appendChild(o)
    })
    document.getElementById("editProvincia").value = data.places[0]["state"]
  } catch(e){}
}

/* ── FOTO ── */
window.subirFoto = async function(input){
  const file = input.files[0]; if(!file) return
  const { data: ud } = await supabase.auth.getUser()
  const uid = ud.user.id
  const name = `perfil_${uid}_${Date.now()}`
  const { error } = await supabase.storage.from("trabajos").upload(name, file, { upsert: true })
  if(error){ alert(error.message); return }
  const { data } = supabase.storage.from("trabajos").getPublicUrl(name)
  await supabase.from("perfiles").update({ foto: data.publicUrl }).eq("id", uid)
  init()
}

/* ── GUARDAR DATOS ── */
window.guardarDatos = async function(){
  const { data: ud } = await supabase.auth.getUser()
  const uid  = ud.user.id
  const msg  = document.getElementById("msgPerfil")
  const nombre   = document.getElementById("editNombre").value.trim()
  const apellido = document.getElementById("editApellido").value.trim()

  if(!nombre || !apellido){
    msg.innerHTML = '<div class="alerta alerta-err">Nombre y apellido son obligatorios</div>'
    return
  }

  const localidad = document.getElementById("editLocalidad").value.trim()
  const provincia = document.getElementById("editProvincia").value.trim()
  if(!localidad || !provincia){
    msg.innerHTML = '<div class="alerta alerta-err">Ciudad y provincia son obligatorias para aparecer en los buscadores</div>'
    document.getElementById("editLocalidad")?.scrollIntoView({ behavior:"smooth", block:"center" })
    return
  }

  const mostrarComo = document.querySelector('input[name="editMostrarComo"]:checked')?.value || "personal"
  const mostrarTel  = document.getElementById("editMostrarTel")?.checked ?? true
  const empresa     = (document.getElementById("editEmpresa")?.value || document.getElementById("editEmpresaNombre")?.value || "").trim()

  const payload = {
    nombre,
    apellido,
    movil:            document.getElementById("editMovil").value.trim(),
    instagram:        document.getElementById("editInstagram").value.trim(),
    tiktok:           document.getElementById("editTiktok").value.trim(),
    telefono_fijo:    document.getElementById("editTelefono").value.trim(),
    direccion:        document.getElementById("editDireccion").value.trim(),
    codigo_postal:    document.getElementById("editCP").value.trim(),
    localidad:        document.getElementById("editLocalidad").value,
    provincia:        document.getElementById("editProvincia").value,
    nombre_empresa:   empresa || null,
    mostrar_como:     mostrarComo,
    mostrar_telefono: mostrarTel
  }

  // Campos exclusivos de empleador
  const sectorEl = document.getElementById("editEmpresaSector")
  const descEl   = document.getElementById("editEmpresaDesc")
  if(sectorEl) payload.empresa_sector      = sectorEl.value || null
  if(descEl)   payload.empresa_descripcion = descEl.value.trim() || null

  const { error } = await supabase.from("perfiles").update(payload).eq("id", uid)

  if(error){ msg.innerHTML = `<div class="alerta alerta-err">${error.message}</div>`; return }

  msg.innerHTML = '<div class="alerta alerta-ok"><i class="fa-solid fa-check"></i> Cambios guardados</div>'
  setTimeout(() => { msg.innerHTML = ""; init() }, 2000)
}

/* ── PUNTUAR CLIENTE ── */
let clienteIdSel = null, estrellaCliente = 0

window.buscarCliente = async function(){
  const email = document.getElementById("emailCliente").value.trim()
  const div   = document.getElementById("clienteEncontrado")
  const form  = document.getElementById("formClienteRating")
  if(!email){ div.innerHTML = '<div class="alerta alerta-err">Ingresá un email</div>'; return }

  const { data } = await supabase.from("perfiles").select("id,nombre,apellido,foto").eq("email", email).single()
  if(!data){
    div.innerHTML = '<div class="alerta alerta-err">No se encontró ningún usuario con ese email</div>'
    form.style.display = "none"; return
  }
  clienteIdSel = data.id
  const fotoEl = data.foto
    ? `<img src="${data.foto}" style="width:38px;height:38px;border-radius:50%;object-fit:cover;vertical-align:middle;margin-right:8px;">`
    : `<i class="fa-solid fa-user" style="color:#2563eb;margin-right:8px;"></i>`
  div.innerHTML = `<div class="alerta alerta-ok">${fotoEl}<strong>${data.nombre} ${data.apellido}</strong> encontrado</div>`
  form.style.display = "block"
  estrellaCliente = 0
  actualizarStarsCliente(0)
}

window.setEstrellaCliente = function(n){ estrellaCliente = n; actualizarStarsCliente(n) }
window.hoverEstrellaCliente = function(n){ actualizarStarsCliente(n, true) }
window.resetHoverCliente = function(){ actualizarStarsCliente(estrellaCliente) }

function actualizarStarsCliente(n, hover){
  document.querySelectorAll("#starsCliente i").forEach((el, i) => {
    el.classList.remove("lit")
    if(i < n) el.classList.add("lit")
  })
}

window.enviarRatingCliente = async function(){
  const msg = document.getElementById("msgClienteRating")
  if(!clienteIdSel)   { msg.innerHTML = '<div class="alerta alerta-err">Buscá primero al cliente</div>'; return }
  if(!estrellaCliente){ msg.innerHTML = '<div class="alerta alerta-err">Seleccioná una puntuación</div>'; return }

  const { data: ud } = await supabase.auth.getUser()
  const { error } = await supabase.from("reviews").insert({
    trabajador_id: clienteIdSel, autor_id: ud.user.id,
    rating: estrellaCliente,
    comentario: document.getElementById("comentarioCliente").value.trim(),
    tipo: "cliente"
  })
  if(error){ msg.innerHTML = `<div class="alerta alerta-err">${error.message}</div>`; return }
  document.getElementById("formClienteRating").innerHTML =
    '<div class="alerta alerta-ok"><i class="fa-solid fa-check"></i> Puntuación enviada al cliente.</div>'
  clienteIdSel = null; estrellaCliente = 0
}

/* ── COMPARTIR EN REDES ── */
window.togglePanelCompartir = function(){
  const panel = document.getElementById("panelCompartir")
  panel.style.display = panel.style.display === "none" ? "block" : "none"
}

async function compartir(url, titulo, texto){
  const msg = document.getElementById("msgCompartir")
  try { await navigator.clipboard.writeText(url) } catch(e){}

  if(navigator.share){
    try {
      await navigator.share({ title: titulo, text: texto, url })
      return
    } catch(e){}
  }

  window.open("https://www.instagram.com/", "_blank")
  msg.innerHTML = `<div class="alerta alerta-ok" style="font-size:14px;">
    <i class="fa-solid fa-check"></i>
    <strong>¡Enlace copiado!</strong> Abrimos Instagram — pegalo en tu historia o bio.<br>
    <small style="color:#64748b;">Cuantos más conozcan la página, más rápido conseguís lo que buscás 🚀</small>
  </div>`
  setTimeout(() => { msg.innerHTML = "" }, 6000)
}

window.compartirPerfil = function(userId){
  const url   = `https://trabajoscerca.com.ar/perfil_publico?id=${userId}`
  const texto = "Mirá mi perfil en Trabajos Cerca 👷‍♂️ Encontrá profesionales y oficios cerca tuyo."
  compartir(url, "Mi perfil — Trabajos Cerca", texto)
}

window.compartirInicio = function(){
  const url   = "https://trabajoscerca.com.ar/"
  const texto = "¡Encontrá profesionales, oficios y trabajo en tu ciudad! 👷‍♂️💼 Trabajos Cerca — 100% gratis."
  compartir(url, "Trabajos Cerca", texto)
}

/* ── TOGGLE TICKET DESCUENTO ── */
window._guardarTicketToggle = async function() {
  const slider = document.getElementById('ticketToggleSliderDash')
  const knob   = document.getElementById('ticketToggleKnobDash')
  const label  = document.getElementById('ticketToggleLabel')
  const titulo = document.getElementById('ticketToggleTitulo')
  const desc   = document.getElementById('ticketToggleDesc')
  if(!slider) return

  const activo = slider.style.background !== 'rgb(124, 58, 237)' && !slider.style.background.includes('#7c3aed')
    ? true
    : slider.dataset.activo !== '1'

  // toggle interno
  const nuevoEstado = slider.dataset.activo !== '1'
  slider.dataset.activo = nuevoEstado ? '1' : '0'

  slider.style.background = nuevoEstado ? '#7c3aed' : '#cbd5e1'
  if(knob) knob.style.transform = nuevoEstado ? 'translateX(20px)' : 'translateX(0)'
  if(label) {
    label.style.background  = nuevoEstado ? 'linear-gradient(135deg,#ede9fe,#eff6ff)' : '#f8fafc'
    label.style.borderColor = nuevoEstado ? '#c4b5fd' : '#e2e8f0'
  }
  if(titulo) titulo.style.color = nuevoEstado ? '#5b21b6' : '#475569'
  if(desc) {
    desc.style.color   = nuevoEstado ? '#6d28d9' : '#94a3b8'
    desc.textContent   = nuevoEstado ? 'Aparecés con estrella en el buscador' : 'Activalo para aparecer con estrella en el buscador'
  }

  const { data: ud } = await supabase.auth.getUser()
  if(!ud?.user) return
  await supabase.from('perfiles').update({ acepta_ticket_descuento: nuevoEstado }).eq('id', ud.user.id)
}

/* ── COMPARTIR LINK DE REFERIDOS ── */
window.copiarRefLink = function(url){
  navigator.clipboard?.writeText(url).then(() => {
    const btn = document.getElementById("btnCopiarRef")
    if(btn){ btn.innerHTML = '<i class="fa-solid fa-check"></i> ¡Copiado!'; setTimeout(() => { btn.innerHTML = '<i class="fa-solid fa-copy"></i> Copiar' }, 2000) }
  })
}
window.compartirRefWA = function(url){
  const txt = encodeURIComponent(`¡Unite a Trabajos Cerca! Conseguí empleo, clientes o empleados en tu zona. Registrate acá: ${url}`)
  window.open(`https://wa.me/?text=${txt}`, "_blank")
}
window.compartirRefFB = function(url){
  window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, "_blank", "width=600,height=400")
}
window.compartirRefNativo = function(url){
  if(navigator.share){
    navigator.share({ title: "Trabajos Cerca", text: "¡Unite a Trabajos Cerca y encontrá trabajo u oportunidades en tu zona!", url })
  } else {
    window.copiarRefLink(url)
  }
}

/* ── COMPARTIR INVITACIÓN POR INSTAGRAM ── */
window.compartirInvitacionIG = async function(userId) {
  const refLink = `https://www.trabajoscerca.com.ar/?ref=${userId}`
  const texto = `⚽ ¡Participá del Prode del Mundial 2026 en Trabajos Cerca!\nRegistrate con mi link, me ayudás a desbloquear el fixture y vos también podés ganar una web gratis o $500.000 ARS si Argentina es campeón 🇦🇷🏆\n👉 ${refLink}\n\n📸 Seguí a @datawebdigital para participar`

  const msg = document.getElementById("msgInvIG")

  // Intentar Web Share API (funciona en móvil mostrando Instagram y otras apps)
  if (navigator.share) {
    try {
      await navigator.share({ text: texto, url: refLink })
      return
    } catch(e) { /* usuario canceló, caemos al clipboard */ }
  }

  // Fallback: copiar al portapapeles y abrir Instagram
  try {
    await navigator.clipboard.writeText(texto)
    if (msg) {
      msg.innerHTML = `<div style="background:#fdf2f8;border:1px solid #fbcfe8;border-radius:10px;padding:10px 14px;font-size:12px;color:#831843;line-height:1.6;">
        ✅ <strong>¡Texto copiado!</strong> Ahora abrimos Instagram. Pegalo en tus stories, bio o DMs.<br>
        <span style="color:#9d174d;font-size:11px;">Tu link ya está en el portapapeles 📋</span>
      </div>`
      setTimeout(() => { msg.innerHTML = "" }, 5000)
    }
    setTimeout(() => { window.open("https://www.instagram.com/", "_blank") }, 600)
  } catch(e) {
    if (msg) msg.innerHTML = `<div style="background:#fef2f2;border-radius:10px;padding:10px 14px;font-size:12px;color:#991b1b;">No se pudo copiar. Tu link: <strong>${refLink}</strong></div>`
  }
}

/* ══════════════════════════════════════════════════════════
   GUÍA DE USO — popup diferenciado por tipo de perfil
══════════════════════════════════════════════════════════ */
/* ── POPUP POSTULACIÓN VENDEDOR OK ── */
function mostrarPopupVendedorOk() {
  const overlay = document.createElement('div')
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:9400;display:flex;align-items:center;justify-content:center;padding:20px;'
  overlay.innerHTML = `
    <div style="background:white;border-radius:22px;max-width:400px;width:100%;overflow:hidden;box-shadow:0 24px 60px rgba(0,0,0,.35);animation:slideUp .3s ease;">
      <div style="background:linear-gradient(135deg,#065f46,#1e40af);padding:28px;text-align:center;color:white;">
        <div style="font-size:52px;margin-bottom:10px;">🎉</div>
        <h2 style="margin:0 0 6px;font-size:22px;font-weight:900;">¡Bienvenido/a a Trabajos Cerca!</h2>
        <p style="margin:0;opacity:.85;font-size:14px;">Gracias por postularte a LocalWeb.ar</p>
      </div>
      <div style="padding:24px;text-align:center;">
        <div style="background:#f0fdf4;border:1.5px solid #86efac;border-radius:14px;padding:16px;margin-bottom:18px;text-align:left;">
          <div style="font-size:14px;font-weight:800;color:#15803d;margin-bottom:6px;">📋 ¿Qué pasa ahora?</div>
          <p style="margin:0 0 10px;font-size:13px;color:#374151;line-height:1.7;">
            Estaremos mirando tu CV y, si aceptás, quedarás también en el <strong>buscador de CV de la página</strong> para que más empresas y empleadores te encuentren.
          </p>
          <ul style="margin:0;padding:0 0 0 18px;font-size:13px;color:#374151;line-height:1.8;">
            <li>Revisamos tu postulación en las próximas <strong>48hs</strong></li>
            <li>Te contactamos por <strong>WhatsApp o email</strong></li>
            <li>¡Bienvenido/a al equipo!</li>
          </ul>
        </div>
        <div style="background:#eff6ff;border:1.5px solid #bfdbfe;border-radius:14px;padding:14px;margin-bottom:18px;font-size:13px;color:#1e40af;">
          <i class="fa-solid fa-search"></i> Mientras esperás, podés <a href="/buscar-empleo.html" style="color:#2563eb;font-weight:700;">ver el buscador de trabajo</a> para conocer la plataforma.
        </div>
        <button onclick="this.closest('[style*=fixed]').remove()" style="width:100%;background:linear-gradient(135deg,#065f46,#1e40af);color:white;border:none;border-radius:13px;padding:14px;font-size:15px;font-weight:800;cursor:pointer;">
          ¡Perfecto, gracias! 🙌
        </button>
      </div>
    </div>`
  document.body.appendChild(overlay)
  overlay.addEventListener('click', e => { if(e.target === overlay) overlay.remove() })
}

window.abrirGuiaUso = function(tipo) {
  const esPro = tipo === 'profesional'

  const pasosPro = [
    { icono:'📸', titulo:'Completá tu perfil al 100%',
      texto:'Agregá una foto clara, describí bien tu servicio, sumá tu WhatsApp y tu localidad. Los perfiles completos aparecen primero en el buscador.' },
    { icono:'🔧', titulo:'Publicá tu oficio o servicio',
      texto:'Desde "Mis perfiles" podés registrarte como Oficio, Profesional, Emprendimiento, CV o Empresa. Cada uno tiene su propio buscador con clientes que buscan exactamente lo que ofrecés.' },
    { icono:'📷', titulo:'Subí fotos de trabajos realizados',
      texto:'Con el Plan Básico podés subir hasta 1 foto de trabajos realizados. Los clientes confían más en perfiles con evidencia visual de tu trabajo.' },
    { icono:'✅', titulo:'Activá "Disponible ahora"',
      texto:'El botón verde hace que aparezcas con un punto verde en los resultados. Los clientes lo ven y saben que podés atenderlos de inmediato — eso genera más contactos.' },
    { icono:'⭐', titulo:'Activá el Ticket de Descuento 10%',
      texto:'Al activarlo aparecés con el badge "⭐ TICKET 10% OFF" en el buscador. Los clientes con ticket preferirán contactarte a vos antes que a la competencia.' },
    { icono:'🎁', titulo:'Invitá amigos y ganá puntos',
      texto:'Compartí tu link de referido. Cada persona que se registre con tu link suma 1 punto. Con 10 puntos ganás slots extra en tu Libreta de Clientes. Con 50 puntos publicás un trabajo realizado gratis.' },
    { icono:'📋', titulo:'Usá tu Libreta de Clientes',
      texto:'Guardá los datos de tus clientes, registrá trabajos con estado (presupuestado, en curso, terminado), llevá el control de lo que te deben y enviá recordatorios por WhatsApp.' },
    { icono:'📱', titulo:'Compartí tu perfil en redes',
      texto:'Usá el botón "Compartir en redes" para difundir tu perfil en WhatsApp, Facebook e Instagram. También podés descargar tu tarjeta profesional 1080x1080 lista para postear.' },
    { icono:'🌟', titulo:'Calificaciones y reputación',
      texto:'Pedile a tus clientes que te califiquen en tu perfil público. Las estrellas mejoran tu posición en el buscador y generan más confianza en nuevos clientes.' },
    { icono:'💬', titulo:'Respondé consultas urgentes',
      texto:'En la sección "Urgentes" aparecen personas que necesitan un servicio ahora mismo. Respondé rápido y conseguí clientes directos sin esperar a que te busquen.' },
  ]

  const pasosCli = [
    { icono:'🔍', titulo:'Buscá profesionales cerca tuyo',
      texto:'Usá el buscador para encontrar plomeros, electricistas, médicos, contadores y más de 30 oficios. Filtrá por ciudad o provincia para ver solo los de tu zona.' },
    { icono:'💬', titulo:'Contactá directo por WhatsApp',
      texto:'En cada perfil hay un botón de WhatsApp. Hacés clic y arranca una conversación directa con el profesional — sin intermediarios, sin comisiones.' },
    { icono:'⭐', titulo:'Calificá a los profesionales',
      texto:'Después de contratar, podés calificar el servicio. Tus calificaciones ayudan a otros usuarios a elegir bien y le dan visibilidad al profesional.' },
    { icono:'❤️', titulo:'Guardá tus favoritos',
      texto:'El botón de corazón en cada perfil guarda al profesional en tu lista de favoritos. Así los tenés a mano para la próxima vez que los necesités.' },
    { icono:'🎁', titulo:'Invitá amigos y ganá puntos',
      texto:'Compartí tu link de invitación. Cada persona que se registre con tu código suma 1 punto para vos. Los puntos aparecen en tu perfil y se acumulan automáticamente.' },
    { icono:'🎟️', titulo:'¡Con 10 referidos ganás un Ticket de Descuento!',
      texto:'Al llegar a 10 puntos de referidos te damos automáticamente 1 Ticket de Descuento 10% OFF. Te avisamos con un popup y te llega una notificación.' },
    { icono:'🛍️', titulo:'Usá tu ticket en perfiles con estrella',
      texto:'Buscá perfiles con el badge "⭐ TICKET 10% OFF". Hacé clic en su perfil, tocá "Mostrar mi ticket" y mostráselo al profesional para obtener el 10% de descuento.' },
    { icono:'📲', titulo:'Instalá la app en tu celular',
      texto:'Trabajos Cerca funciona como app. En Chrome (Android) o Safari (iPhone) tocá el ícono de compartir y elegí "Agregar a pantalla de inicio". Así recibís notificaciones de nuevos referidos.' },
    { icono:'🔔', titulo:'Notificaciones de referidos',
      texto:'Cada vez que alguien se registre con tu código de invitación, te avisamos. Si tenés la app instalada, también recibís una notificación push en tu celular.' },
    { icono:'💼', titulo:'¿Querés ofrecer algo vos también?',
      texto:'Si tenés un oficio, sos profesional o tenés un emprendimiento, podés registrarte desde tu perfil. Es gratis y empezás a recibir clientes de tu zona.' },
  ]

  const pasos = esPro ? pasosPro : pasosCli
  const titulo = esPro ? '📖 Guía para Profesionales y Emprendedores' : '📖 Guía para Clientes'
  const subtitulo = esPro ? 'Todo lo que podés hacer para conseguir más clientes' : 'Cómo sacarle el máximo provecho a Trabajos Cerca'
  const gradiente = esPro ? 'linear-gradient(135deg,#1e40af,#7c3aed)' : 'linear-gradient(135deg,#065f46,#1e40af)'

  const pasosHtml = pasos.map((p, i) => `
    <div style="display:flex;gap:14px;align-items:flex-start;padding:14px 0;${i < pasos.length-1 ? 'border-bottom:1px solid #f1f5f9;' : ''}">
      <div style="width:46px;height:46px;border-radius:13px;background:#f8fafc;border:1.5px solid #e2e8f0;display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0;">${p.icono}</div>
      <div style="flex:1;min-width:0;">
        <div style="font-size:14px;font-weight:800;color:#1e293b;margin-bottom:3px;">${i+1}. ${p.titulo}</div>
        <div style="font-size:13px;color:#64748b;line-height:1.55;">${p.texto}</div>
      </div>
    </div>`).join('')

  const overlay = document.createElement('div')
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:9300;display:flex;align-items:flex-end;justify-content:center;padding:0;'
  overlay.innerHTML = `
    <div style="background:white;border-radius:22px 22px 0 0;max-width:520px;width:100%;max-height:92vh;display:flex;flex-direction:column;box-shadow:0 -12px 60px rgba(0,0,0,.25);animation:slideUp .3s ease;">
      <!-- Header fijo -->
      <div style="background:${gradiente};padding:22px 22px 18px;flex-shrink:0;border-radius:22px 22px 0 0;position:relative;">
        <button onclick="this.closest('[style*=fixed]').remove()" style="position:absolute;top:14px;right:14px;background:rgba(255,255,255,.2);border:none;color:white;width:32px;height:32px;border-radius:50%;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;line-height:1;">✕</button>
        <h2 style="margin:0 0 4px;font-size:18px;color:white;font-weight:900;padding-right:36px;">${titulo}</h2>
        <p style="margin:0;font-size:13px;color:rgba(255,255,255,.8);">${subtitulo}</p>
        <div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap;">
          <span style="background:rgba(255,255,255,.18);color:white;font-size:11px;font-weight:700;padding:4px 10px;border-radius:20px;">${pasos.length} pasos</span>
          <span style="background:rgba(255,255,255,.18);color:white;font-size:11px;font-weight:700;padding:4px 10px;border-radius:20px;">🎟️ Sistema de tickets</span>
          <span style="background:rgba(255,255,255,.18);color:white;font-size:11px;font-weight:700;padding:4px 10px;border-radius:20px;">🎁 Puntos por referidos</span>
        </div>
      </div>
      <!-- Contenido scrolleable -->
      <div style="overflow-y:auto;padding:4px 20px 20px;flex:1;">
        ${pasosHtml}
      </div>
      <!-- Footer fijo -->
      <div style="padding:16px 20px;border-top:1px solid #f1f5f9;flex-shrink:0;background:white;border-radius:0 0 0 0;">
        <button onclick="this.closest('[style*=fixed]').remove()" style="width:100%;background:${gradiente};color:white;border:none;border-radius:13px;padding:14px;font-size:15px;font-weight:800;cursor:pointer;">
          ¡Entendido, a potenciar mi perfil! 🚀
        </button>
      </div>
    </div>`

  document.body.appendChild(overlay)
  overlay.addEventListener('click', e => { if(e.target === overlay) overlay.remove() })
}

/* ── CERRAR SESIÓN ── */
window.cerrarSesion = async function(){
  await supabase.auth.signOut()
  location.href = "/index.html"
}

function esc(v){ return (v || "").toString().replace(/"/g,"&quot;") }

/* ── PRODE CARD: verificar requisitos (localStorage) ── */
function cargarProdeCard(userId){
  const status = document.getElementById("prodeStatus")
  if(status) status.innerHTML = `<span style="color:#4ade80;font-weight:700;">✅ ¡Participación gratuita y abierta para todos!</span>`
}

/* ── PRODE: partidos de hoy desde ESPN (datos reales) + encuesta ── */
async function cargarPartidoProde(userId){
  const lista = document.getElementById("prodeListaPartidos")
  if(!lista) return
  try {
    const ahora   = new Date()
    const dStrAR  = new Date(ahora.getTime()-3*3600000).toISOString().slice(0,10).replace(/-/g,"")
    const dStrUTC = ahora.toISOString().slice(0,10).replace(/-/g,"")

    const [r1, r2] = await Promise.all([
      fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/FIFA.WORLD/scoreboard?dates=${dStrAR}&limit=50`).then(r=>r.json()),
      dStrUTC!==dStrAR ? fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/FIFA.WORLD/scoreboard?dates=${dStrUTC}&limit=50`).then(r=>r.json()) : Promise.resolve({events:[]})
    ])

    const evMap = {}
    ;[...(r1.events||[]),...(r2.events||[])].forEach(e=>evMap[e.id]=e)
    let eventos = Object.values(evMap).sort((a,b)=>new Date(a.date)-new Date(b.date))

    // Si no hay partidos hoy, mostrar próximos sin fecha
    let label = "📅 Partidos de hoy"
    if(!eventos.length){
      const rp = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/FIFA.WORLD/scoreboard`).then(r=>r.json())
      eventos = (rp.events||[]).slice(0,3)
      label = "📅 Próximos partidos"
    }

    const tit = lista.previousElementSibling
    if(tit) tit.textContent = label

    if(!eventos.length){
      lista.innerHTML = `<div style="color:rgba(255,255,255,.35);font-size:12px;text-align:center;padding:10px 0;">No hay partidos por ahora</div>`
    } else {
      lista.innerHTML = eventos.map(ev => {
        const comp = ev.competitions[0]
        const home = comp.competitors.find(c=>c.homeAway==="home")||comp.competitors[0]
        const away = comp.competitors.find(c=>c.homeAway==="away")||comp.competitors[1]
        const kick = new Date(ev.date)
        const hora = kick.toLocaleTimeString("es-AR",{hour:"2-digit",minute:"2-digit",timeZone:"America/Argentina/Buenos_Aires"})
        const tipo = ev.status.type
        const terminado = tipo.completed
        const enVivo    = !terminado && tipo.description!=="Scheduled"
        const bloq      = !terminado && !enVivo && ahora>=new Date(kick.getTime()-3600000)
        const logoH = home.team?.logos?.[0]?.href||""
        const logoA = away.team?.logos?.[0]?.href||""
        const imgH  = logoH?`<img src="${logoH}" style="width:18px;height:14px;object-fit:contain;vertical-align:middle;">`:"🏳"
        const imgA  = logoA?`<img src="${logoA}" style="width:18px;height:14px;object-fit:contain;vertical-align:middle;">`:"🏳"
        const nomH  = home.team?.displayName||"?"
        const nomA  = away.team?.displayName||"?"

        let badge = ""
        if(terminado)   badge = `<span style="font-size:10px;background:#22c55e;color:white;font-weight:800;padding:1px 7px;border-radius:99px;">Final ${home.score}-${away.score}</span>`
        else if(enVivo) badge = `<span style="font-size:10px;background:#dc2626;color:white;font-weight:800;padding:1px 7px;border-radius:99px;">🔴 EN VIVO ${home.score??0}-${away.score??0}</span>`
        else if(bloq)   badge = `<span style="font-size:10px;color:#fca5a5;font-weight:700;">🔒 Cerrado</span>`
        else            badge = `<span style="font-size:10px;color:#fbbf24;font-weight:700;">⏱ ${hora}hs</span>`

        return `<div style="background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:11px;padding:10px 13px;${enVivo?"border-color:rgba(220,38,38,.5);":""}">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;flex-wrap:wrap;">
            <div style="font-size:13px;font-weight:800;color:white;">${imgH} ${nomH} <span style="color:rgba(255,255,255,.4);font-size:10px;">vs</span> ${nomA} ${imgA}</div>
            <div>${badge}</div>
          </div>
        </div>`
      }).join("")
    }

    // Encuesta ¿Quién va a ganar? — mini card
    await _montarEncuestaPerfilCard(userId)

  } catch(e){
    if(lista) lista.innerHTML = `<div style="color:rgba(255,255,255,.35);font-size:12px;text-align:center;padding:10px 0;">Sin conexión a datos en vivo</div>`
  }
}

async function _montarEncuestaPerfilCard(userId){
  // Buscar o crear el contenedor de encuesta dentro de #prodeCard
  const card = document.getElementById("prodeCard")
  if(!card) return
  if(document.getElementById("perfilEncuestaWrap")) return // ya montado

  const wrap = document.createElement("div")
  wrap.id = "perfilEncuestaWrap"
  wrap.style.cssText = "margin-top:14px;border-top:1px solid rgba(255,255,255,.1);padding-top:12px;"
  wrap.innerHTML = `
    <div style="font-size:11px;font-weight:800;letter-spacing:1.5px;color:#fbbf24;text-transform:uppercase;margin-bottom:8px;">🏆 ¿Quién va a ganar el Mundial?</div>
    <div style="display:flex;gap:8px;align-items:center;">
      <select id="perfilEncuestaSelect" style="
        flex:1;background:#1e293b;color:#f1f5f9;border:1.5px solid rgba(255,255,255,.2);
        border-radius:8px;padding:7px 10px;font-size:12px;font-weight:700;cursor:pointer;">
        <option value="" style="background:#1e293b;">— Elegí un equipo —</option>
      </select>
      <button onclick="window._votarEncuestaPerfil()" style="
        background:linear-gradient(135deg,#facc15,#f59e0b);color:#1c1917;
        font-weight:900;font-size:12px;padding:7px 13px;border-radius:8px;border:none;cursor:pointer;white-space:nowrap;">
        Votar ⚡
      </button>
    </div>
    <div id="perfilEncuestaMensaje" style="font-size:11px;margin-top:6px;min-height:14px;color:rgba(255,255,255,.5);"></div>
    <div style="margin-top:6px;"><a href="/mundial.html" style="color:#fbbf24;font-size:11px;font-weight:700;text-decoration:none;">⚽ Ver tabla completa de votos →</a></div>
  `
  card.appendChild(wrap)

  // Poblar select
  try {
    const { data: eqs } = await supabase.from("mundial_equipos").select("id,nombre,bandera").order("nombre")
    const sel = document.getElementById("perfilEncuestaSelect")
    if(sel && eqs) eqs.forEach(e => {
      const o = document.createElement("option")
      o.value=e.id; o.textContent=`${e.bandera||""} ${e.nombre}`
      o.style.background="#1e293b"; o.style.color="#f1f5f9"
      sel.appendChild(o)
    })
    const voto = localStorage.getItem("tc_voto_campeon")
    if(voto && sel) sel.value = voto
  } catch(e){}

  window._votarEncuestaPerfil = async function(){
    const sel = document.getElementById("perfilEncuestaSelect")
    const msg = document.getElementById("perfilEncuestaMensaje")
    if(!sel?.value){ if(msg) msg.textContent="Elegí un equipo."; return }
    if(!userId){ if(msg) msg.textContent="Iniciá sesión para votar."; return }
    const { error } = await supabase.from("mundial_encuesta").upsert(
      {user_id:userId, equipo_id:parseInt(sel.value)},{onConflict:"user_id"}
    )
    if(!error){
      localStorage.setItem("tc_voto_campeon", sel.value)
      if(msg){ msg.style.color="#6ee7b7"; msg.textContent="✅ ¡Voto registrado!" }
    }
  }
}

/* ── Popup Reglas Mundial (abre el popup de mundial.html si está; si no, va a mundial.html) ── */
window._abrirReglasMundial = function(){
  const p = document.getElementById('popupReglas')
  if(p){ p.style.display = 'flex' }
  else { window.location.href = '/mundial.html' }
}

/* ══════════════════════════════════════════════════════════
   FAQ CHATBOX — Botón flotante + panel de preguntas frecuentes
══════════════════════════════════════════════════════════ */
function montarFAQChat(){
  if(document.getElementById('tc-faq-btn')) return // ya montado

  const FAQS = [
    { q: '¿Cómo me registro?',
      a: 'Hacé click en <strong>"Registrarse"</strong> en la pantalla de inicio, elegí tu tipo de perfil (busco empleo, ofrezco oficios, soy profesional, empresa) y completá tus datos. ¡Es gratis y tardás menos de 2 minutos!' },
    { q: '¿Cómo participo en el Prode del Mundial 2026?',
      a: 'Para participar tenés que: <strong>1)</strong> Compartir la página en Instagram o Facebook, <strong>2)</strong> Seguir <strong>@datawebdigital</strong> en Instagram. Con eso ya podés completar el fixture del Mundial.' },
    { q: '¿Cómo busco trabajo?',
      a: 'Cargá tu CV en tu perfil (sección <em>Perfil CV</em>). Las empresas y empleadores te encontrarán en el buscador de CVs. También podés buscar ofertas en el buscador de <strong>Ofertas de trabajo</strong>.' },
    { q: '¿Cómo busco un profesional o servicio?',
      a: 'Desde la pantalla principal usá los buscadores: <strong>Oficios</strong> (plomeros, electricistas, albañiles…), <strong>Profesionales</strong> (contadores, diseñadores, médicos…) o <strong>Emprendimientos</strong>.' },
    { q: '¿Cómo activo "Disponible ahora"?',
      a: 'En tu perfil, en la sección <strong>"Disponibilidad"</strong>, tocá el botón <em>"⚡ Estoy disponible"</em>. Aparecerás con un punto verde en los resultados durante 8 horas automáticamente.' },
    { q: '¿Cómo contacto a un profesional?',
      a: 'En la tarjeta de cada profesional hay un botón de <strong>WhatsApp</strong> para contactarlo directamente. Sin intermediarios ni comisiones.' },
    { q: '¿Cómo funciona el sistema de referidos?',
      a: 'Compartí tu link único de referido (lo encontrás en tu perfil, sección <em>Invitá amigos</em>). Cada persona que se registre con tu link te suma <strong>1 punto</strong>.' },
    { q: '¿Cómo subo mi foto de perfil?',
      a: 'En tu perfil, hacé click en <strong>"Cambiar foto"</strong> debajo de tu avatar. Admite JPG, PNG y formatos similares.' },
    { q: '¿Es gratis?',
      a: '¡Sí! <strong>Trabajos Cerca es 100% gratuito.</strong> Los planes de pago son opcionales y te permiten subir fotos de trabajos realizados para destacarte en el buscador.' },
    { q: '¿Cómo actualizo mi ubicación?',
      a: 'En <em>"Mis datos"</em>, ingresá tu <strong>Código Postal</strong> y la localidad se completa automáticamente. Luego hacé click en <strong>"Guardar cambios"</strong>.' },
    { q: '¿Cómo publico una oferta de trabajo?',
      a: 'Si tenés cuenta de <strong>Empleador</strong>, en tu perfil encontrás el botón <em>"Publicar puesto"</em>. Completá los datos y tu oferta aparecerá visible para todos los candidatos.' },
    { q: '¿Cómo activo Google Maps en el buscador?',
      a: 'En tu perfil, sección <em>"Visibilidad en el buscador"</em>, activá la opción <strong>"Mostrar enlace a Google Maps"</strong>. Así cada resultado mostrará un enlace directo a la ubicación.' },
  ]

  /* ── CSS ── */
  const s = document.createElement('style')
  s.textContent = `
  #tc-faq-btn {
    position:fixed; bottom:24px; right:24px; z-index:9990;
    width:52px; height:52px; border-radius:50%;
    background:linear-gradient(135deg,#2563eb,#7c3aed);
    color:white; border:none; cursor:pointer; font-size:21px;
    display:flex; align-items:center; justify-content:center;
    box-shadow:0 4px 22px rgba(37,99,235,.45);
    transition:transform .2s,box-shadow .2s; font-family:inherit;
  }
  #tc-faq-btn:hover { transform:scale(1.1); box-shadow:0 8px 30px rgba(37,99,235,.55); }
  #tc-faq-panel {
    position:fixed; bottom:86px; right:24px; z-index:9989;
    width:320px; max-width:calc(100vw - 48px);
    background:white; border-radius:18px;
    box-shadow:0 14px 50px rgba(0,0,0,.22);
    display:none; flex-direction:column;
    max-height:72vh; overflow:hidden;
  }
  #tc-faq-panel.tc-faq-open {
    display:flex;
    animation:tcFaqIn .25s cubic-bezier(.22,1,.36,1);
  }
  @keyframes tcFaqIn { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
  #tc-faq-header {
    background:linear-gradient(135deg,#2563eb,#7c3aed);
    color:white; padding:14px 16px; border-radius:18px 18px 0 0;
    display:flex; align-items:center; gap:10px; flex-shrink:0;
  }
  #tc-faq-lista { overflow-y:auto; flex:1; }
  .tc-faq-item { border-bottom:1px solid #f1f5f9; }
  .tc-faq-item:last-child { border-bottom:none; }
  .tc-faq-q {
    width:100%; text-align:left; background:none; border:none;
    padding:12px 14px; font-size:13px; font-weight:700; color:#1e293b;
    cursor:pointer; display:flex; align-items:center; justify-content:space-between;
    gap:8px; font-family:inherit; transition:background .15s; line-height:1.4;
  }
  .tc-faq-q:hover { background:#f8fafc; }
  .tc-faq-q.tc-open { color:#2563eb; background:#eff6ff; }
  .tc-faq-q .tc-arr { font-size:10px; flex-shrink:0; transition:transform .2s; color:#94a3b8; }
  .tc-faq-q.tc-open .tc-arr { transform:rotate(180deg); color:#2563eb; }
  .tc-faq-a {
    overflow:hidden; max-height:0; transition:max-height .3s ease,padding .25s;
    font-size:12px; color:#475569; line-height:1.65;
    padding:0 14px;
  }
  .tc-faq-a.tc-open { max-height:220px; padding:2px 14px 12px; }
  `
  document.head.appendChild(s)

  /* ── HTML del panel ── */
  const panel = document.createElement('div')
  panel.id = 'tc-faq-panel'
  panel.innerHTML = `
    <div id="tc-faq-header">
      <i class="fa-solid fa-circle-question" style="font-size:20px;flex-shrink:0;"></i>
      <div style="flex:1;">
        <div style="font-size:14px;font-weight:900;line-height:1.2;">Preguntas frecuentes</div>
        <div style="font-size:11px;opacity:.8;margin-top:1px;">¿En qué te podemos ayudar?</div>
      </div>
      <button id="tc-faq-close"
        style="background:rgba(255,255,255,.2);border:none;color:white;width:28px;height:28px;border-radius:50%;
        font-size:17px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-family:inherit;line-height:1;">×</button>
    </div>
    <div id="tc-faq-lista">
      ${FAQS.map((f, i) => `
      <div class="tc-faq-item">
        <button class="tc-faq-q" data-idx="${i}">
          <span>${f.q}</span>
          <i class="fa-solid fa-chevron-down tc-arr"></i>
        </button>
        <div class="tc-faq-a" id="tc-faq-a-${i}">${f.a}</div>
      </div>`).join('')}
    </div>
  `

  /* ── Botón flotante ── */
  const btn = document.createElement('button')
  btn.id = 'tc-faq-btn'
  btn.title = 'Preguntas frecuentes'
  btn.innerHTML = '<i class="fa-solid fa-circle-question"></i>'

  document.body.appendChild(panel)
  document.body.appendChild(btn)

  /* ── Eventos ── */
  btn.onclick = () => panel.classList.toggle('tc-faq-open')
  document.getElementById('tc-faq-close').onclick = () => panel.classList.remove('tc-faq-open')

  document.getElementById('tc-faq-lista').addEventListener('click', e => {
    const qBtn = e.target.closest('.tc-faq-q')
    if(!qBtn) return
    const idx     = qBtn.dataset.idx
    const answerEl = document.getElementById(`tc-faq-a-${idx}`)
    const isOpen   = answerEl.classList.contains('tc-open')

    // Cerrar todos
    document.querySelectorAll('.tc-faq-q').forEach(q => q.classList.remove('tc-open'))
    document.querySelectorAll('.tc-faq-a').forEach(a => a.classList.remove('tc-open'))

    // Abrir o cerrar el clickeado
    if(!isOpen){
      qBtn.classList.add('tc-open')
      answerEl.classList.add('tc-open')
    }
  })
}

/* ══════════════════════════════════════
   CAMBIAR CONTRASEÑA
══════════════════════════════════════ */
window.toggleCambiarPass = function() {
  const form = document.getElementById("cambPassForm")
  const btn  = document.getElementById("btnTogglePass")
  if(!form) return
  const visible = form.style.display !== "none"
  form.style.display = visible ? "none" : "block"
  if(btn) btn.textContent = visible ? "Cambiar" : "Cancelar"
}

window.guardarNuevaPass = async function() {
  const p1  = document.getElementById("nuevaPass")?.value || ""
  const p2  = document.getElementById("nuevaPass2")?.value || ""
  const msg = document.getElementById("msgCambPass")
  const btn = document.getElementById("btnGuardarPass")
  if(!msg) return

  if(p1.length < 6) {
    msg.innerHTML = '<span style="color:#dc2626;">La contraseña debe tener al menos 6 caracteres.</span>'
    return
  }
  if(p1 !== p2) {
    msg.innerHTML = '<span style="color:#dc2626;">Las contraseñas no coinciden.</span>'
    return
  }

  btn.disabled = true
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Guardando...'
  msg.innerHTML = ""

  const { error } = await supabase.auth.updateUser({ password: p1 })
  btn.disabled = false
  btn.innerHTML = '<i class="fa-solid fa-check"></i> Guardar nueva contraseña'

  if(error) {
    msg.innerHTML = `<span style="color:#dc2626;">${error.message}</span>`
  } else {
    msg.innerHTML = '<span style="color:#16a34a;font-weight:700;">✓ Contraseña actualizada correctamente.</span>'
    document.getElementById("nuevaPass").value  = ""
    document.getElementById("nuevaPass2").value = ""
    setTimeout(() => window.toggleCambiarPass(), 2000)
  }
}

/* ══════════════════════════════════════
   RECORDATORIO DIARIO — COMPARTIR + MÚLTIPLES OFICIOS
══════════════════════════════════════ */
async function enviarRecordatorioCompartir(userId) {
  const CLAVE  = "tc_ult_recordatorio"
  const ahora  = Date.now()
  const ultimo = parseInt(localStorage.getItem(CLAVE) || "0")
  const HORAS  = 22 * 60 * 60 * 1000  // una vez por día

  if(ahora - ultimo < HORAS) return

  // Elegir entre dos pools: compartir O agregar servicios (alternados)
  const turno = parseInt(localStorage.getItem("tc_rec_turno") || "0")

  const mensajesCompartir = [
    {
      titulo: "👋 ¡Hola! Somos de Trabajos Cerca",
      cuerpo: "Acordate de compartir tu perfil hoy. Cuanta más gente lo vea, más chances tenés de que te contacten. ¡30 segundos pueden traerte un nuevo cliente! 🚀",
      url: "/perfil.html"
    },
    {
      titulo: "📲 ¡Compartí y hacé crecer la comunidad!",
      cuerpo: "Cada persona que se suma a Trabajos Cerca es un potencial cliente tuyo. Mandá tu link de perfil por WhatsApp a tus contactos hoy. ¡Vale la pena!",
      url: "/perfil.html"
    },
    {
      titulo: "🌟 Tu perfil merece más visitas",
      cuerpo: "Compartí Trabajos Cerca en tu Instagram, Facebook o grupos de WhatsApp. La comunidad crece y vos aparecés antes que la competencia.",
      url: "/perfil.html"
    },
  ]

  const mensajesOficios = [
    {
      titulo: "🔧 ¿Sabés hacer más de una cosa? ¡Registralo!",
      cuerpo: "En Trabajos Cerca podés tener VARIOS perfiles a la vez. Si sos cerrajero pero también plomero, electricista o carpintero — agregá todos tus oficios y aparecés en más búsquedas.",
      url: "/perfil.html"
    },
    {
      titulo: "💡 ¿Tenés un emprendimiento además de tu oficio?",
      cuerpo: "¡Podés registrar los dos! Un perfil de oficio y uno de emprendimiento al mismo tiempo. Más perfiles = más visibilidad = más clientes. Entrá a tu perfil y agregalo.",
      url: "/perfil.html"
    },
    {
      titulo: "🚀 ¡Muchos profesionales tienen 2 o 3 perfiles activos!",
      cuerpo: "¿Sos plomero y también hacés trabajos de albañilería? ¿Tenés un negocio además? Registrá todo lo que sabés hacer — es gratis y aparecés en más búsquedas.",
      url: "/perfil.html"
    },
    {
      titulo: "👷 ¿Ya registraste todos tus oficios?",
      cuerpo: "Muchos usuarios solo se registraron en uno y se olvidan del resto. Si hacés más de una cosa, agregala desde tu perfil. ¡Cada oficio extra te da más chances de conseguir trabajo!",
      url: "/perfil.html"
    },
  ]

  // Alternar entre pools
  const pool = turno % 2 === 0 ? mensajesCompartir : mensajesOficios
  const msg  = pool[Math.floor(Math.random() * pool.length)]

  try {
    await supabase.from("notificaciones").insert({
      usuario_id: userId,
      tipo:       "sistema",
      titulo:     msg.titulo,
      cuerpo:     msg.cuerpo,
      url:        msg.url
    })
    localStorage.setItem(CLAVE, String(ahora))
    localStorage.setItem("tc_rec_turno", String(turno + 1))
  } catch(e) {}
}

/* ══════════════════════════════════════
   TOGGLE BUSCADOR (multi-tipo)
══════════════════════════════════════ */
window.toggleBuscador = async function(tipoToggle, userId) {
  const { data: perfActual } = await supabase
    .from("perfiles").select("tipo").eq("id", userId).single()
  const tipoActual = perfActual?.tipo || ""
  const tipos = tipoActual.split(",").map(t => t.trim()).filter(Boolean)

  let nuevosTipos
  if(tipos.includes(tipoToggle)){
    if(tipos.length <= 1){ alert("Tenés que aparecer en al menos un buscador."); return }
    nuevosTipos = tipos.filter(t => t !== tipoToggle)
  } else {
    nuevosTipos = [...tipos, tipoToggle]
  }

  const nuevoTipo = nuevosTipos.join(",")
  const { error } = await supabase
    .from("perfiles").update({ tipo: nuevoTipo }).eq("id", userId)
  if(error){ alert("Error: " + error.message); return }

  // Sincronizar cv_publico en curriculum cuando se activa/desactiva el buscador de CVs
  if(tipoToggle === "cv") {
    const cvActivo = nuevosTipos.includes("cv")
    await supabase.from("curriculum").update({ cv_publico: cvActivo }).eq("usuario_id", userId)
  }

  // Actualizar UI sin recargar
  const checkEl = document.getElementById("check-buscador-" + tipoToggle)
  const labelEl = checkEl?.closest("label")
  const activo  = nuevosTipos.includes(tipoToggle)
  if(checkEl){
    checkEl.style.background = activo ? "#2563eb" : "#e2e8f0"
    checkEl.innerHTML = activo ? '<i class="fa-solid fa-check"></i>' : ""
  }
  if(labelEl){
    labelEl.style.background  = activo ? "#eff6ff" : "white"
    labelEl.style.borderColor = activo ? "#bfdbfe" : "#e2e8f0"
  }
}

init()

/* ── Toast de éxito al volver de perfil_servicio ── */
;(function() {
  const params = new URLSearchParams(location.search)
  const saved  = params.get('saved')
  const cat    = params.get('cat')
  const bv     = params.get('bv')  // viene del modal de bienvenida
  if(!saved) return

  // Si vino del flujo de bienvenida, verificar si hay más tipos pendientes
  if(bv === '1') {
    try {
      const pendingRaw = localStorage.getItem("tc_pending_tipos")
      if(pendingRaw) {
        const pending = JSON.parse(pendingRaw)
        // Quitar el tipo que acaba de guardar
        const resto = pending.filter(t => t !== saved)
        if(resto.length > 0) {
          localStorage.setItem("tc_pending_tipos", JSON.stringify(resto))
          // Mostrar mini toast y llevar al siguiente tipo
          const next = resto[0]
          const NOMBRES = { oficio:"oficio", profesional:"profesional", emprendimiento:"emprendimiento", cv:"CV", empresa:"empresa" }
          const t = document.createElement("div")
          t.style.cssText = "position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#1d4ed8;color:white;padding:12px 20px;border-radius:12px;font-size:14px;font-weight:700;z-index:9999;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,.3);"
          t.innerHTML = `<i class="fa-solid fa-circle-check" style="color:#93c5fd;margin-right:6px;"></i>¡Guardado! Ahora completá tu perfil de ${NOMBRES[next]||next}…`
          document.body.appendChild(t)
          setTimeout(() => { window.location.href = `/perfil_servicio.html?tipo=${next}&bv=1` }, 1800)
          return
        } else {
          localStorage.removeItem("tc_pending_tipos")
          // Todos completados — mostrar toast de registro terminado
          history.replaceState({}, '', '/perfil.html')
          const t = document.createElement("div")
          t.style.cssText = "position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(80px);background:#14532d;color:white;padding:16px 24px;border-radius:14px;font-size:15px;font-weight:700;z-index:9999;max-width:90vw;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,.25);transition:transform .35s ease,opacity .35s ease;opacity:0;line-height:1.6;"
          t.innerHTML = '<i class="fa-solid fa-circle-check" style="color:#4ade80;margin-right:8px;font-size:18px;"></i>¡Registro completado! Ya aparecés en el buscador.'
          document.body.appendChild(t)
          requestAnimationFrame(()=>requestAnimationFrame(()=>{ t.style.transform="translateX(-50%) translateY(0)"; t.style.opacity="1" }))
          setTimeout(()=>{ t.style.transform="translateX(-50%) translateY(80px)"; t.style.opacity="0"; setTimeout(()=>t.remove(),400) }, 5000)
          return
        }
      }
    } catch(e) {}
  }

  const msgs = {
    oficio:         cat ? `¡Tu perfil de <strong>${cat}</strong> está activo en el buscador de oficios! 🔧` : '¡Tu perfil de oficio está activo en el buscador! 🔧',
    profesional:    '¡Tu perfil profesional está activo en el buscador! 👔',
    cv:             '¡Tu CV está publicado y visible para empleadores! 📄',
    empresa:        '¡Tu oferta de trabajo está publicada! 🏢',
    emprendimiento: '¡Tu emprendimiento está activo en el buscador! 🚀'
  }
  const msg = msgs[saved] || '¡Tu perfil está activo!'

  const toast = document.createElement('div')
  toast.style.cssText = `
    position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(80px);
    background:#14532d;color:white;padding:14px 22px;border-radius:14px;
    font-size:14px;font-weight:600;z-index:9999;max-width:90vw;text-align:center;
    box-shadow:0 8px 32px rgba(0,0,0,.25);transition:transform .35s ease,opacity .35s ease;
    opacity:0;line-height:1.5;
  `
  toast.innerHTML = '<i class="fa-solid fa-circle-check" style="color:#4ade80;margin-right:8px;"></i>' + msg
  document.body.appendChild(toast)

  requestAnimationFrame(function() {
    requestAnimationFrame(function() {
      toast.style.transform = 'translateX(-50%) translateY(0)'
      toast.style.opacity = '1'
    })
  })
  setTimeout(function() {
    toast.style.transform = 'translateX(-50%) translateY(80px)'
    toast.style.opacity = '0'
    setTimeout(function(){ toast.remove() }, 400)
  }, 5000)

  history.replaceState({}, '', '/perfil.html')
})()

/* ══════════════════════════════════════════════════════════
   POPUP NUEVOS REFERIDOS — avisa al profesional
══════════════════════════════════════════════════════════ */
async function mostrarPopupNuevosReferidos(userId) {
  try {
    const { data: perfil } = await supabase
      .from('perfiles')
      .select('puntos_referidos, ref_ultima_visita, tickets_descuento')
      .eq('id', userId).single()

    if(!perfil) return
    const puntosActuales  = perfil.puntos_referidos || 0
    const ticketsActuales = perfil.tickets_descuento || 0
    const ultimaVisita    = perfil.ref_ultima_visita || new Date(0).toISOString()

    // Contar referidos nuevos desde la última visita
    const { count } = await supabase
      .from('referidos')
      .select('id', { count: 'exact', head: true })
      .eq('referidor_id', userId)
      .gt('created_at', ultimaVisita)

    await supabase.from('perfiles').update({ ref_ultima_visita: new Date().toISOString() }).eq('id', userId)

    if(!count || count === 0) return

    // ── Tickets ganados: 1 ticket cada 10 puntos
    const ticketsGanados = Math.floor(puntosActuales / 10) - Math.floor((puntosActuales - count) / 10)
    if(ticketsGanados > 0) {
      await supabase.from('perfiles')
        .update({ tickets_descuento: ticketsActuales + ticketsGanados })
        .eq('id', userId)
      // Notificación interna
      await supabase.from('notificaciones').insert({
        usuario_id: userId, tipo: 'sistema',
        titulo: `🎟️ ¡Ganaste ${ticketsGanados} Ticket${ticketsGanados>1?'s':''} de Descuento!`,
        cuerpo: `Llegaste a ${Math.floor(puntosActuales/10)*10} referidos. Usá tu ticket para obtener 10% OFF en perfiles que lo acepten.`,
        url: '/perfil.html'
      }).catch(()=>{})
    }

    // ── Desbloqueos de libreta
    const umbralesLib = [10, 20, 50]
    const bonusLib = umbralesLib.filter(u => puntosActuales >= u && (puntosActuales - count) < u)
    const desbloqueo = bonusLib.length > 0
      ? bonusLib[0] === 50
        ? '🎁 ¡Desbloqueaste publicar un trabajo realizado gratis!'
        : `🎉 ¡Desbloqueaste ${bonusLib[0] <= 10 ? '+10' : '+5'} clientes extra en tu libreta!`
      : ''

    const ticketsNuevosHtml = ticketsGanados > 0 ? `
      <div style="background:linear-gradient(135deg,#4c1d95,#1e40af);border-radius:14px;padding:14px 16px;margin-bottom:14px;display:flex;align-items:center;gap:12px;">
        <div style="font-size:28px;flex-shrink:0;">🎟️</div>
        <div>
          <div style="font-size:15px;font-weight:900;color:white;">¡Ganaste ${ticketsGanados} Ticket${ticketsGanados>1?'s':''} de Descuento!</div>
          <div style="font-size:12px;color:rgba(255,255,255,.8);margin-top:2px;">Usalo para obtener 10% OFF en profesionales y emprendimientos</div>
        </div>
      </div>` : ''

    const overlay = document.createElement('div')
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9000;display:flex;align-items:center;justify-content:center;padding:20px;'
    overlay.innerHTML = `
      <div style="background:white;border-radius:20px;max-width:380px;width:100%;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.3);animation:slideUp .3s ease;">
        <div style="background:linear-gradient(135deg,#1d4ed8,#7c3aed);padding:24px;text-align:center;color:white;">
          <div style="font-size:48px;margin-bottom:8px;">🎊</div>
          <h2 style="margin:0 0 4px;font-size:20px;">¡${count} nuevo${count!==1?'s':''} referido${count!==1?'s':''}!</h2>
          <p style="margin:0;opacity:.85;font-size:14px;">Se unieron con tu código de invitación</p>
        </div>
        <div style="padding:24px;text-align:center;">
          ${ticketsNuevosHtml}
          <div style="background:#eff6ff;border-radius:12px;padding:12px 16px;margin-bottom:14px;">
            <div style="font-size:13px;color:#1d4ed8;font-weight:700;">Total: ${puntosActuales} referido${puntosActuales!==1?'s':''}</div>
            <div style="background:#dbeafe;border-radius:99px;height:8px;margin-top:8px;overflow:hidden;">
              <div style="width:${Math.min(100,Math.round((puntosActuales%10)/10*100))}%;height:100%;background:#2563eb;border-radius:99px;"></div>
            </div>
            <div style="font-size:11px;color:#64748b;margin-top:5px;">${10-(puntosActuales%10)>0?`${10-(puntosActuales%10)} más para ganar otro ticket 🎟️`:'¡Listo para ganar ticket!'}</div>
          </div>
          ${desbloqueo ? `<div style="background:#f0fdf4;border:1.5px solid #86efac;border-radius:12px;padding:12px;margin-bottom:14px;font-size:13px;font-weight:700;color:#16a34a;">${desbloqueo}</div>` : ''}
          <div style="display:flex;gap:10px;">
            ${ticketsGanados > 0 ? `<button onclick="this.closest('[style*=fixed]').remove();window.abrirModalTickets()" style="flex:1;background:linear-gradient(135deg,#7c3aed,#2563eb);color:white;border:none;border-radius:12px;padding:13px;font-size:14px;font-weight:700;cursor:pointer;">Ver mis tickets 🎟️</button>` : ''}
            <button onclick="this.closest('[style*=fixed]').remove()" style="flex:1;background:#1d4ed8;color:white;border:none;border-radius:12px;padding:13px;font-size:14px;font-weight:700;cursor:pointer;">¡Genial! 🙌</button>
          </div>
        </div>
      </div>`
    document.body.appendChild(overlay)
    overlay.addEventListener('click', e => { if(e.target === overlay) overlay.remove() })

  } catch(e) { console.warn('popup referidos:', e) }
}

/* ══════════════════════════════════════════════════════════
   MODAL TICKETS DE DESCUENTO
══════════════════════════════════════════════════════════ */
window.abrirModalTickets = async function() {
  const { data: ud } = await supabase.auth.getUser()
  if(!ud?.user) return
  const { data: p } = await supabase.from('perfiles')
    .select('tickets_descuento, puntos_referidos, nombre')
    .eq('id', ud.user.id).single()

  const tickets = p?.tickets_descuento || 0
  const puntos  = p?.puntos_referidos  || 0
  const falta   = 10 - (puntos % 10)

  const overlay = document.createElement('div')
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:9100;display:flex;align-items:center;justify-content:center;padding:20px;'
  overlay.innerHTML = `
    <div style="background:white;border-radius:22px;max-width:420px;width:100%;overflow:hidden;box-shadow:0 24px 60px rgba(0,0,0,.35);max-height:90vh;overflow-y:auto;">
      <div style="background:linear-gradient(135deg,#4c1d95,#1e40af);padding:26px 24px;color:white;text-align:center;position:relative;">
        <button onclick="this.closest('[style*=fixed]').remove()" style="position:absolute;top:14px;right:14px;background:rgba(255,255,255,.15);border:none;color:white;width:32px;height:32px;border-radius:50%;font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;">✕</button>
        <div style="font-size:52px;margin-bottom:8px;">🎟️</div>
        <h2 style="margin:0 0 4px;font-size:22px;">Mis Tickets de Descuento</h2>
        <p style="margin:0;opacity:.8;font-size:14px;">Ganá descuentos en negocios y profesionales locales</p>
      </div>
      <div style="padding:24px;">

        <!-- Tickets disponibles -->
        <div style="background:linear-gradient(135deg,#fef3c7,#fde68a);border:2px solid #fbbf24;border-radius:18px;padding:20px;text-align:center;margin-bottom:20px;">
          <div style="font-size:56px;font-weight:900;color:#92400e;line-height:1;">${tickets}</div>
          <div style="font-size:15px;font-weight:700;color:#78350f;margin-top:4px;">ticket${tickets!==1?'s':''} disponible${tickets!==1?'s':''}</div>
          ${tickets > 0
            ? `<div style="font-size:12px;color:#92400e;margin-top:8px;background:rgba(255,255,255,.6);border-radius:8px;padding:6px 12px;">Buscá el badge <strong>⭐ TICKET 10% OFF</strong> en el buscador y usá tu descuento</div>`
            : `<div style="font-size:12px;color:#92400e;margin-top:8px;">Invitá amigos para ganar tu primer ticket</div>`}
        </div>

        <!-- Progreso hacia próximo ticket -->
        <div style="background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:14px;padding:16px;margin-bottom:20px;">
          <div style="font-size:13px;font-weight:800;color:#1e293b;margin-bottom:10px;">🎯 Progreso al próximo ticket</div>
          <div style="display:flex;justify-content:space-between;font-size:12px;color:#64748b;margin-bottom:6px;">
            <span>${puntos % 10} / 10 referidos</span>
            <span>${falta > 0 ? `Faltan ${falta}` : '¡Ticket listo!'}</span>
          </div>
          <div style="background:#e2e8f0;border-radius:99px;height:10px;overflow:hidden;">
            <div style="width:${Math.min(100,Math.round((puntos%10)/10*100))}%;height:100%;background:linear-gradient(90deg,#7c3aed,#2563eb);border-radius:99px;transition:width .6s;"></div>
          </div>
          <div style="font-size:11px;color:#94a3b8;margin-top:6px;">Total de referidos: <strong>${puntos}</strong> · Tickets ganados: <strong>${Math.floor(puntos/10)}</strong></div>
        </div>

        <!-- Cómo funciona -->
        <div style="background:#f0fdf4;border:1.5px solid #86efac;border-radius:14px;padding:16px;margin-bottom:20px;">
          <div style="font-size:13px;font-weight:800;color:#15803d;margin-bottom:12px;">ℹ️ ¿Cómo funciona?</div>
          <div style="display:flex;flex-direction:column;gap:8px;">
            <div style="display:flex;gap:10px;align-items:flex-start;font-size:13px;color:#374151;">
              <span style="font-size:18px;flex-shrink:0;">1️⃣</span>
              <span>Invitá amigos con tu link de referido. Cada uno que se registra suma <strong>1 punto</strong>.</span>
            </div>
            <div style="display:flex;gap:10px;align-items:flex-start;font-size:13px;color:#374151;">
              <span style="font-size:18px;flex-shrink:0;">2️⃣</span>
              <span>Al llegar a <strong>10 puntos</strong> ganás <strong>1 Ticket de Descuento 10%</strong> automáticamente.</span>
            </div>
            <div style="display:flex;gap:10px;align-items:flex-start;font-size:13px;color:#374151;">
              <span style="font-size:18px;flex-shrink:0;">3️⃣</span>
              <span>Buscá perfiles con el badge <strong>⭐ TICKET 10% OFF</strong> y mostrales tu ticket al contratar.</span>
            </div>
            <div style="display:flex;gap:10px;align-items:flex-start;font-size:13px;color:#374151;">
              <span style="font-size:18px;flex-shrink:0;">4️⃣</span>
              <span>El profesional o emprendimiento te aplica el <strong>10% de descuento</strong> en el servicio.</span>
            </div>
          </div>
        </div>

        <a href="/buscador.html?ticket=1" style="display:flex;align-items:center;justify-content:center;gap:10px;background:linear-gradient(135deg,#7c3aed,#2563eb);color:white;font-weight:800;font-size:15px;padding:14px;border-radius:13px;text-decoration:none;margin-bottom:10px;">
          ⭐ Buscar perfiles con Ticket 10% OFF
        </a>
        <button onclick="this.closest('[style*=fixed]').remove()" style="width:100%;background:#f1f5f9;color:#475569;border:none;border-radius:12px;padding:12px;font-size:14px;font-weight:600;cursor:pointer;">Cerrar</button>
      </div>
    </div>`
  document.body.appendChild(overlay)
  overlay.addEventListener('click', e => { if(e.target === overlay) overlay.remove() })

  // Actualizar label en la card del cliente si existe
  const lbl = document.getElementById('ticketCountLabel')
  if(lbl) lbl.textContent = tickets + ' ticket' + (tickets!==1?'s':'')
}

/* ══════════════════════════════════════════════════════════
   MODAL BIENVENIDA — Completar tipo de perfil
══════════════════════════════════════════════════════════ */
function mostrarBienvenida(userId) {

  const OPCIONES = [
    { id: "oficio",
      emoji: "🔧",
      titulo: "Ofrezco un oficio",
      desc: "Plomero, electricista, albañil, carpintero, pintor, gasista..." },
    { id: "profesional",
      emoji: "👔",
      titulo: "Soy profesional",
      desc: "Médico, abogado, contador, arquitecto, diseñador..." },
    { id: "emprendimiento",
      emoji: "🚀",
      titulo: "Tengo un emprendimiento",
      desc: "Local propio, marca, gastronomía, artesanías, delivery..." },
    { id: "cv",
      emoji: "📄",
      titulo: "Busco trabajo",
      desc: "Quiero que empresas o personas me encuentren y me contraten" },
    { id: "empresa",
      emoji: "🏢",
      titulo: "Soy empresa o negocio",
      desc: "Quiero publicar puestos y buscar empleados para mi empresa" },
    { id: "cliente",
      emoji: "👤",
      titulo: "Solo busco contratar",
      desc: "No ofrezco servicios, solo busco profesionales u oficios" },
  ]

  const sel = new Set()

  const css = `
  #bv-overlay {
    position:fixed; inset:0; z-index:9900;
    background:rgba(15,23,42,.82); backdrop-filter:blur(3px);
    display:flex; align-items:flex-start; justify-content:center;
    overflow-y:auto; padding:20px 12px 40px;
  }
  #bv-box {
    background:white; border-radius:24px; width:100%; max-width:500px;
    box-shadow:0 32px 80px rgba(0,0,0,.45); overflow:hidden;
    margin:auto;
  }
  #bv-header {
    background:linear-gradient(135deg,#1d4ed8,#2563eb,#7c3aed);
    padding:28px 24px 22px; text-align:center; position:relative;
  }
  #bv-header .bv-logo { font-size:38px; margin-bottom:8px; }
  #bv-header h2 { margin:0 0 6px; font-size:20px; font-weight:900; color:white; line-height:1.25; }
  #bv-header p  { margin:0; font-size:14px; color:rgba(255,255,255,.85); line-height:1.5; }
  #bv-body { padding:20px 18px 0; }
  #bv-body > p { margin:0 0 14px; font-size:14px; font-weight:700; color:#475569; text-align:center; }
  .bv-op {
    display:flex; align-items:center; gap:14px;
    border:2px solid #e2e8f0; border-radius:14px; padding:14px 16px;
    cursor:pointer; transition:all .18s; margin-bottom:10px;
    background:white; user-select:none;
  }
  .bv-op:hover { border-color:#93c5fd; background:#f0f9ff; }
  .bv-op.sel { border-color:#2563eb; background:#eff6ff; }
  .bv-op.sel-cliente { border-color:#64748b; background:#f8fafc; }
  .bv-emoji { font-size:32px; flex-shrink:0; }
  .bv-txt { flex:1; min-width:0; }
  .bv-txt strong { display:block; font-size:14px; color:#1e293b; font-weight:800; margin-bottom:2px; }
  .bv-txt span   { font-size:12px; color:#64748b; line-height:1.4; }
  .bv-check {
    width:24px; height:24px; border-radius:50%; border:2px solid #e2e8f0;
    display:flex; align-items:center; justify-content:center;
    flex-shrink:0; font-size:13px; transition:all .18s;
  }
  .bv-op.sel .bv-check, .bv-op.sel-cliente .bv-check {
    background:#2563eb; border-color:#2563eb; color:white;
  }
  .bv-op.sel-cliente .bv-check { background:#64748b; border-color:#64748b; }
  #bv-footer { padding:16px 18px 22px; }
  #bv-msg { font-size:13px; color:#dc2626; text-align:center; min-height:18px; margin-bottom:8px; }
  #bv-btn {
    width:100%; padding:15px; border:none; border-radius:14px; cursor:pointer;
    font-size:16px; font-weight:900; font-family:inherit;
    background:linear-gradient(135deg,#2563eb,#7c3aed); color:white;
    transition:opacity .15s; box-shadow:0 4px 16px rgba(37,99,235,.35);
  }
  #bv-btn:disabled { opacity:.5; cursor:default; }
  #bv-btn:hover:not(:disabled) { opacity:.9; }
  #bv-separador {
    border:none; border-top:1px solid #e2e8f0; margin:6px 0 12px;
  }
  `
  const styleEl = document.createElement("style")
  styleEl.textContent = css
  document.head.appendChild(styleEl)

  const overlay = document.createElement("div")
  overlay.id = "bv-overlay"
  overlay.innerHTML = `
    <div id="bv-box">
      <div id="bv-header">
        <div class="bv-logo">👋</div>
        <h2>¡Bienvenido/a a Trabajos Cerca!</h2>
        <p>Solo falta un paso para terminar tu registro.<br>Contanos qué vas a hacer en la plataforma.</p>
      </div>
      <div id="bv-body">
        <p>¿Qué vas a ofrecer? <span style="font-weight:400;color:#94a3b8;">(podés elegir más de uno)</span></p>
        ${OPCIONES.filter(o => o.id !== "cliente").map(o => `
          <div class="bv-op" id="bvop-${o.id}" onclick="window._bvToggle('${o.id}')">
            <span class="bv-emoji">${o.emoji}</span>
            <div class="bv-txt">
              <strong>${o.titulo}</strong>
              <span>${o.desc}</span>
            </div>
            <div class="bv-check" id="bvchk-${o.id}"></div>
          </div>`).join("")}
        <hr id="bv-separador">
        <div class="bv-op" id="bvop-cliente" onclick="window._bvToggle('cliente')">
          <span class="bv-emoji">👤</span>
          <div class="bv-txt">
            <strong>Solo busco contratar</strong>
            <span>No ofrezco servicios, solo busco profesionales u oficios</span>
          </div>
          <div class="bv-check" id="bvchk-cliente"></div>
        </div>
      </div>
      <div id="bv-footer">
        <div id="bv-msg"></div>
        <button id="bv-btn" onclick="window._bvContinuar()" disabled>
          Elegí al menos una opción para continuar →
        </button>
      </div>
    </div>`

  document.body.appendChild(overlay)
  document.body.style.overflow = "hidden"

  // Activar Cami en el overlay de bienvenida
  setTimeout(function(){
    if(window._camiActivarBienvenida) window._camiActivarBienvenida()
  }, 600)

  window._bvToggle = function(id) {
    const esCliente = id === "cliente"

    if(esCliente) {
      // Solo cliente es exclusivo con el resto
      const yaEstabaCliente = sel.has("cliente")
      sel.clear()
      if(!yaEstabaCliente) sel.add("cliente")
    } else {
      // Desmarcar "solo cliente" si elige otra cosa
      sel.delete("cliente")
      document.getElementById("bvop-cliente")?.classList.remove("sel-cliente")
      document.getElementById("bvchk-cliente").innerHTML = ""

      if(sel.has(id)) sel.delete(id)
      else            sel.add(id)
    }

    // Actualizar UI de todas las opciones
    OPCIONES.forEach(o => {
      const opEl  = document.getElementById(`bvop-${o.id}`)
      const chkEl = document.getElementById(`bvchk-${o.id}`)
      if(!opEl || !chkEl) return
      const activo = sel.has(o.id)
      opEl.classList.remove("sel", "sel-cliente")
      chkEl.innerHTML = ""
      if(activo){
        opEl.classList.add(o.id === "cliente" ? "sel-cliente" : "sel")
        chkEl.innerHTML = `<i class="fa-solid fa-check"></i>`
      }
    })

    // Actualizar botón
    const btn = document.getElementById("bv-btn")
    const msg = document.getElementById("bv-msg")
    msg.textContent = ""
    if(sel.size === 0){
      btn.disabled = true
      btn.textContent = "Elegí al menos una opción para continuar →"
    } else if(sel.has("cliente")){
      btn.disabled = false
      btn.textContent = "✓ Terminar registro como cliente"
    } else {
      const labels = [...sel].map(id => OPCIONES.find(o=>o.id===id)?.titulo || id)
      btn.disabled = false
      btn.textContent = `Continuar con: ${labels.join(", ")} →`
    }
  }

  window._bvContinuar = async function() {
    if(sel.size === 0) return

    // Verificar si ya tiene los datos obligatorios
    const { data: datosActuales } = await supabase.from("perfiles")
      .select("nombre,apellido,localidad,provincia,movil").eq("id", userId).single()

    const faltanDatos = !datosActuales?.nombre || !datosActuales?.apellido ||
                        !datosActuales?.localidad || !datosActuales?.provincia || !datosActuales?.movil

    if(faltanDatos) {
      // Mostrar formulario de datos obligatorios antes de continuar
      document.getElementById("bv-body").innerHTML = `
        <p style="font-size:13px;color:#64748b;margin:0 0 14px;">Completá tus datos para aparecer en los buscadores:</p>
        <div style="display:grid;gap:10px;">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
            <input id="bv-nombre" placeholder="Nombre *" value="${datosActuales?.nombre||''}" style="padding:10px 12px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:14px;">
            <input id="bv-apellido" placeholder="Apellido *" value="${datosActuales?.apellido||''}" style="padding:10px 12px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:14px;">
          </div>
          <input id="bv-tel" placeholder="Teléfono / WhatsApp *" value="${datosActuales?.movil||''}" style="padding:10px 12px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:14px;">
          <input id="bv-cp" placeholder="Código Postal (para autocompletar ciudad)" style="padding:10px 12px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:14px;" oninput="window._bvAutoCP(this.value)">
          <input id="bv-ciudad" placeholder="Ciudad *" value="${datosActuales?.localidad||''}" style="padding:10px 12px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:14px;">
          <select id="bv-provincia" style="padding:10px 12px;border:1.5px solid #e2e8f0;border-radius:10px;font-size:14px;color:#374151;">
            <option value="">Provincia *</option>
            ${["Buenos Aires","CABA","Catamarca","Chaco","Chubut","Córdoba","Corrientes","Entre Ríos","Formosa","Jujuy","La Pampa","La Rioja","Mendoza","Misiones","Neuquén","Río Negro","Salta","San Juan","San Luis","Santa Cruz","Santa Fe","Santiago del Estero","Tierra del Fuego","Tucumán"]
              .map(pv => `<option value="${pv}"${datosActuales?.provincia===pv?" selected":""}>${pv}</option>`).join("")}
          </select>
        </div>`
      document.getElementById("bv-btn").disabled = false
      document.getElementById("bv-btn").innerHTML = 'Guardar y continuar →'
      document.getElementById("bv-btn").onclick = window._bvGuardarDatos
      return
    }

    await window._bvFinalizar()
  }

  window._bvAutoCP = async function(cp) {
    if(cp.length < 4) return
    try {
      const r = await fetch(`https://iqeiszkoifxgygoqvbem.supabase.co/rest/v1/codigos_postales?cp=eq.${cp}&select=localidad,provincia&limit=1`,
        { headers: { apikey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxZWlzemtvaWZ4Z3lnb3F2YmVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyMTEzODIsImV4cCI6MjA5NDc4NzM4Mn0.qxt70TPbARPcMc8HhHx2A2QnfBvJLCrnrH4m36IcENs" } })
      const d = await r.json()
      if(d?.[0]) {
        const ci = document.getElementById("bv-ciudad"); if(ci) ci.value = d[0].localidad
        const pr = document.getElementById("bv-provincia"); if(pr) { for(let o of pr.options) { if(o.value===d[0].provincia){o.selected=true;break} } }
      }
    } catch(_) {}
  }

  window._bvGuardarDatos = async function() {
    const nombre   = document.getElementById("bv-nombre")?.value.trim()
    const apellido = document.getElementById("bv-apellido")?.value.trim()
    const movil    = document.getElementById("bv-tel")?.value.trim()
    const localidad= document.getElementById("bv-ciudad")?.value.trim()
    const provincia= document.getElementById("bv-provincia")?.value.trim()
    const btn = document.getElementById("bv-btn")
    const msg = document.getElementById("bv-msg")

    if(!nombre || !apellido || !movil || !localidad || !provincia) {
      msg.innerHTML = '<p style="color:#dc2626;font-size:13px;margin:8px 0 0;">Todos los campos son obligatorios.</p>'
      return
    }
    btn.disabled = true
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Guardando...'
    await supabase.from("perfiles").update({ nombre, apellido, movil, localidad, provincia }).eq("id", userId)
    await window._bvFinalizar()
  }

  window._bvFinalizar = async function() {
    const btn = document.getElementById("bv-btn")
    if(btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Guardando...' }

    if(sel.has("cliente")) {
      await supabase.from("perfiles").update({ tipo: "cliente" }).eq("id", userId)
      document.getElementById("bv-overlay").remove()
      document.body.style.overflow = ""
      const toast = document.createElement("div")
      toast.style.cssText = "position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(80px);background:#14532d;color:white;padding:14px 22px;border-radius:14px;font-size:14px;font-weight:600;z-index:9999;max-width:90vw;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,.25);transition:transform .35s ease,opacity .35s ease;opacity:0;line-height:1.5;"
      toast.innerHTML = '<i class="fa-solid fa-circle-check" style="color:#4ade80;margin-right:8px;"></i>¡Registro completado! Ya podés buscar profesionales.'
      document.body.appendChild(toast)
      requestAnimationFrame(() => requestAnimationFrame(() => { toast.style.transform="translateX(-50%) translateY(0)"; toast.style.opacity="1" }))
      setTimeout(() => { toast.style.transform="translateX(-50%) translateY(80px)"; toast.style.opacity="0"; setTimeout(()=>toast.remove(),400) }, 4000)
      return
    }

    const tipos = [...sel]
    localStorage.setItem("tc_pending_tipos", JSON.stringify(tipos))
    window.location.href = `/perfil_servicio.html?tipo=${tipos[0]}&bv=1`
  }
}

/* ══════════════════════════════════════════════════════════
   GENERADOR DE TARJETA PROFESIONAL (Canvas 1080x1080)
══════════════════════════════════════════════════════════ */
window.generarTarjetaProfesional = async function(userId) {
  const btn = event?.currentTarget
  if(btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generando...' }

  try {
    const { data: p } = await supabase
      .from("perfiles")
      .select("nombre, apellido, nombre_empresa, mostrar_como, foto, localidad, provincia, tipo")
      .eq("id", userId).single()

    const { data: srv } = await supabase
      .from("servicios").select("categoria, descripcion").eq("usuario_id", userId).maybeSingle()

    const nombre = (p.mostrar_como === "empresa" && p.nombre_empresa)
      ? p.nombre_empresa
      : `${p.nombre || ""} ${p.apellido || ""}`.trim()
    const categoria = srv?.categoria?.split(",")[0]?.trim() || "Profesional"
    const lugar = [p.localidad, p.provincia].filter(Boolean).join(", ")
    const perfilUrl = `https://trabajoscerca.com.ar/perfil_publico.html?id=${userId}`

    const W = 1080, H = 1080
    const canvas = document.getElementById("canvasTarjeta")
    canvas.width = W
    canvas.height = H
    const ctx = canvas.getContext("2d")

    // ── Fondo degradado oscuro ──
    const bg = ctx.createLinearGradient(0, 0, W, H)
    bg.addColorStop(0, "#0f172a")
    bg.addColorStop(0.5, "#1e2d4a")
    bg.addColorStop(1, "#0f172a")
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, W, H)

    // ── Círculos decorativos de fondo ──
    ;[
      { x: 900, y: 150, r: 320, color: "rgba(37,99,235,0.12)" },
      { x: 120, y: 900, r: 260, color: "rgba(245,158,11,0.10)" },
      { x: 540, y: 540, r: 420, color: "rgba(255,255,255,0.03)" },
    ].forEach(c => {
      ctx.beginPath()
      ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2)
      ctx.fillStyle = c.color
      ctx.fill()
    })

    // ── Header: logo/marca ──
    ctx.fillStyle = "rgba(255,255,255,0.06)"
    ctx.fillRect(0, 0, W, 100)
    ctx.font = "bold 36px Arial"
    ctx.fillStyle = "#fbbf24"
    ctx.textAlign = "center"
    ctx.fillText("TRABAJOS CERCA", W / 2, 62)
    ctx.font = "20px Arial"
    ctx.fillStyle = "rgba(255,255,255,0.5)"
    ctx.fillText("trabajoscerca.com.ar", W / 2, 88)

    // ── Línea amarilla bajo header ──
    const linGrad = ctx.createLinearGradient(0, 0, W, 0)
    linGrad.addColorStop(0, "transparent")
    linGrad.addColorStop(0.3, "#fbbf24")
    linGrad.addColorStop(0.7, "#f59e0b")
    linGrad.addColorStop(1, "transparent")
    ctx.fillStyle = linGrad
    ctx.fillRect(0, 100, W, 3)

    // ── Foto de perfil ──
    const fotoY = 220, fotoR = 160
    ctx.save()
    ctx.beginPath()
    ctx.arc(W / 2, fotoY, fotoR + 6, 0, Math.PI * 2)
    ctx.fillStyle = "#fbbf24"
    ctx.fill()
    ctx.restore()

    if(p.foto) {
      await new Promise(resolve => {
        const img = new Image()
        img.crossOrigin = "anonymous"
        img.onload = () => {
          ctx.save()
          ctx.beginPath()
          ctx.arc(W / 2, fotoY, fotoR, 0, Math.PI * 2)
          ctx.clip()
          ctx.drawImage(img, W/2 - fotoR, fotoY - fotoR, fotoR*2, fotoR*2)
          ctx.restore()
          resolve()
        }
        img.onerror = () => {
          dibujarAvatarFallback(ctx, W/2, fotoY, fotoR)
          resolve()
        }
        img.src = p.foto
      })
    } else {
      dibujarAvatarFallback(ctx, W/2, fotoY, fotoR)
    }

    // ── Badge de categoría ──
    const badgeY = fotoY + fotoR + 30
    const badgeText = `🔧 ${categoria}`
    ctx.font = "bold 28px Arial"
    const badgeW = ctx.measureText(badgeText).width + 50
    const badgeH = 50
    ctx.fillStyle = "rgba(245,158,11,0.2)"
    ctx.strokeStyle = "#fbbf24"
    ctx.lineWidth = 2
    roundRect(ctx, W/2 - badgeW/2, badgeY, badgeW, badgeH, 25)
    ctx.fill(); ctx.stroke()
    ctx.fillStyle = "#fbbf24"
    ctx.textAlign = "center"
    ctx.fillText(badgeText, W/2, badgeY + 33)

    // ── Nombre ──
    ctx.font = "bold 64px Arial"
    ctx.fillStyle = "#ffffff"
    ctx.textAlign = "center"
    const nombreY = badgeY + 100
    // Texto largo: reducir
    const nombreFit = fitText(ctx, nombre, W - 120, 64)
    ctx.font = `bold ${nombreFit}px Arial`
    ctx.fillText(nombre, W/2, nombreY)

    // ── Localidad ──
    if(lugar) {
      ctx.font = "28px Arial"
      ctx.fillStyle = "rgba(255,255,255,0.55)"
      ctx.fillText(`📍 ${lugar}`, W/2, nombreY + 50)
    }

    // ── Descripción breve ──
    if(srv?.descripcion) {
      const desc = srv.descripcion.length > 80 ? srv.descripcion.slice(0,80)+"…" : srv.descripcion
      ctx.font = "italic 26px Arial"
      ctx.fillStyle = "rgba(255,255,255,0.65)"
      ctx.fillText(`"${desc}"`, W/2, nombreY + (lugar ? 110 : 70))
    }

    // ── QR ──
    const qrY = 780
    const qrSize = 160
    const qrCanvas = document.createElement("canvas")
    await QRCode.toCanvas(qrCanvas, perfilUrl, { width: qrSize, margin: 1, color: { dark: "#0f172a", light: "#ffffff" } })
    // Fondo blanco redondeado bajo QR
    ctx.fillStyle = "#ffffff"
    roundRect(ctx, W/2 - qrSize/2 - 12, qrY - 12, qrSize + 24, qrSize + 24, 16)
    ctx.fill()
    ctx.drawImage(qrCanvas, W/2 - qrSize/2, qrY, qrSize, qrSize)

    ctx.font = "bold 22px Arial"
    ctx.fillStyle = "#fbbf24"
    ctx.textAlign = "center"
    ctx.fillText("📲 Escaneame para contactarme", W/2, qrY + qrSize + 44)

    // ── Footer ──
    ctx.fillStyle = "rgba(255,255,255,0.05)"
    ctx.fillRect(0, H - 70, W, 70)
    ctx.font = "22px Arial"
    ctx.fillStyle = "rgba(255,255,255,0.4)"
    ctx.fillText("Encontrá profesionales y oficios cerca tuyo — ¡Es gratis!", W/2, H - 26)

    // ── Mostrar preview ──
    document.getElementById("previewTarjeta").style.display = "block"
    document.getElementById("previewTarjeta").scrollIntoView({ behavior: "smooth", block: "nearest" })

    // Guardar referencia para descarga
    window._tarjetaCanvas = canvas
    window._tarjetaNombre = nombre.replace(/\s+/g, "-").toLowerCase()
    window._tarjetaPerfilUrl = perfilUrl

  } catch(e) {
    console.error("Error generando tarjeta:", e)
    alert("No se pudo generar la tarjeta. Intentá de nuevo.")
  } finally {
    if(btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-id-card"></i> Descargar mi tarjeta' }
  }
}

function dibujarAvatarFallback(ctx, x, y, r) {
  ctx.save()
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fillStyle = "#1e3a5f"
  ctx.fill()
  ctx.font = `${r}px Arial`
  ctx.fillStyle = "rgba(255,255,255,0.3)"
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillText("👷", x, y)
  ctx.textBaseline = "alphabetic"
  ctx.restore()
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.arcTo(x + w, y, x + w, y + r, r)
  ctx.lineTo(x + w, y + h - r)
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
  ctx.lineTo(x + r, y + h)
  ctx.arcTo(x, y + h, x, y + h - r, r)
  ctx.lineTo(x, y + r)
  ctx.arcTo(x, y, x + r, y, r)
  ctx.closePath()
}

function fitText(ctx, text, maxWidth, startSize) {
  let size = startSize
  ctx.font = `bold ${size}px Arial`
  while(ctx.measureText(text).width > maxWidth && size > 24) {
    size -= 4
    ctx.font = `bold ${size}px Arial`
  }
  return size
}

window.descargarTarjeta = function() {
  if(!window._tarjetaCanvas) return
  const link = document.createElement("a")
  link.download = `tarjeta-${window._tarjetaNombre || "profesional"}-trabajoscerca.png`
  link.href = window._tarjetaCanvas.toDataURL("image/png")
  link.click()
}

window.compartirTarjetaFB = function(userId) {
  const url = `https://trabajoscerca.com.ar/perfil_publico.html?id=${userId}`
  window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, "_blank", "width=600,height=400")
}