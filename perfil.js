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
      <a href="/perfil_servicio.html?nuevo=1" class="btn btn-primary" style="margin-bottom:10px;">
        <i class="fa-solid fa-tools"></i> Completar perfil de profesional
      </a>
      <a href="/perfil_cv.html?nuevo=1" class="btn btn-success">
        <i class="fa-solid fa-file-lines"></i> Completar CV
      </a>`
    return
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
    empleador:      '<span class="badge" style="background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;">🏢 Empleador</span>'
  }
  const badgeHtml = BADGE[_tipo] || BADGE.profesional

  const ACCION = {
    oficio:         `<a href="/perfil_servicio.html" class="btn btn-orange"><i class="fa-solid fa-wrench"></i> Gestionar mi perfil de oficio</a>`,
    profesional:    `<a href="/perfil_servicio.html" class="btn btn-orange"><i class="fa-solid fa-tools"></i> Gestionar mi servicio</a>`,
    empresa:        `<a href="/perfil_servicio.html" class="btn btn-orange"><i class="fa-solid fa-building"></i> Gestionar mi empresa</a>`,
    emprendimiento: `<a href="/perfil_servicio.html" class="btn btn-orange"><i class="fa-solid fa-rocket"></i> Gestionar mi emprendimiento</a>`,
    cv:             `<a href="/perfil_cv.html"       class="btn btn-success"><i class="fa-solid fa-file-lines"></i> Gestionar mi CV</a>`,
    empleador:      `<a href="/buscador_trabajos.html" class="btn btn-success"><i class="fa-solid fa-users"></i> Buscar empleados</a>`
  }
  const accionPrincipal = ACCION[_tipo] || ACCION.profesional

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

    <div class="dash-actions">
      ${accionPrincipal}
      <a href="/perfil_publico.html?id=${userId}" class="btn btn-outline" target="_blank" rel="noopener">
        <i class="fa-solid fa-eye"></i> Ver mi perfil público
      </a>
      <button class="btn" onclick="togglePanelCompartir()"
        style="background:linear-gradient(135deg,#833ab4,#fd1d1d,#fcb045);color:white;border:none;">
        <i class="fa-solid fa-share-nodes"></i> Compartir en redes
      </button>
    </div>

    <!-- Panel compartir -->
    <div id="panelCompartir" style="display:none;margin-top:12px;background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:14px;padding:16px 18px;">
      <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:.04em;">¿Qué querés compartir?</p>
      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        <button onclick="compartirPerfil('${userId}')"
          style="flex:1;min-width:140px;display:flex;align-items:center;justify-content:center;gap:8px;padding:12px 16px;border-radius:10px;border:none;cursor:pointer;background:linear-gradient(135deg,#833ab4,#fd1d1d,#fcb045);color:white;font-weight:700;font-size:14px;">
          <i class="fa-solid fa-user"></i> Mi perfil
        </button>
        <button onclick="compartirInicio()"
          style="flex:1;min-width:140px;display:flex;align-items:center;justify-content:center;gap:8px;padding:12px 16px;border-radius:10px;border:none;cursor:pointer;background:linear-gradient(135deg,#2563eb,#0ea5e9);color:white;font-weight:700;font-size:14px;">
          <i class="fa-solid fa-globe"></i> La página Trabajos Cerca
        </button>
      </div>
      <div id="msgCompartir" style="margin-top:10px;"></div>
    </div>

    <!-- ── PRODE MUNDIAL 2026 ── -->
    <div id="prodeCard" style="margin:20px 0;background:linear-gradient(135deg,#0f172a 0%,#1e1b4b 60%,#0f172a 100%);border:1.5px solid rgba(250,204,21,.35);border-radius:18px;padding:20px;overflow:hidden;position:relative;">
      <div style="position:absolute;top:-20px;right:-20px;font-size:90px;opacity:.06;pointer-events:none;">⚽</div>

      <!-- Encabezado -->
      <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:14px;">
        <div style="font-size:36px;flex-shrink:0;">⚽🏆</div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:15px;font-weight:900;color:white;line-height:1.2;">Prode Mundial 2026</div>
          <div id="prodeStatus" style="font-size:12px;color:rgba(255,255,255,.55);margin-top:3px;">Verificando...</div>
        </div>
        <button onclick="window._abrirReglasMundial()" style="
          background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.28);
          color:rgba(255,255,255,.9);font-size:12px;font-weight:700;
          padding:7px 13px;border-radius:9px;cursor:pointer;flex-shrink:0;
          transition:background .15s;"
          onmouseover="this.style.background='rgba(255,255,255,.22)'"
          onmouseout="this.style.background='rgba(255,255,255,.12)'">
          📋 Reglas
        </button>
      </div>

      <!-- Requisitos -->
      <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:14px;">

        <!-- Paso 1: Compartir -->
        <div id="req1Box" style="background:rgba(255,255,255,.07);border:1.5px solid rgba(255,255,255,.13);border-radius:12px;padding:11px 13px;transition:all .3s;">
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
            <div id="req1Check" style="font-size:16px;flex-shrink:0;">📲</div>
            <div style="flex:1;min-width:0;">
              <div style="font-size:13px;font-weight:700;color:white;">1. Compartí la página en redes</div>
              <div style="font-size:11px;color:rgba(255,255,255,.5);margin-top:1px;">Publicá Trabajos Cerca en tu Instagram o Facebook</div>
            </div>
            <div style="display:flex;gap:6px;flex-shrink:0;">
              <a href="https://www.instagram.com/" target="_blank" onclick="window._marcarCompartido()"
                style="display:inline-flex;align-items:center;gap:5px;background:linear-gradient(135deg,#f09433,#dc2743,#bc1888);color:white;font-size:11px;font-weight:700;padding:6px 10px;border-radius:8px;text-decoration:none;">
                <i class="fa-brands fa-instagram"></i> IG
              </a>
              <a href="https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Ftrabajos cerca.com.ar%2Fmundial.html" target="_blank" onclick="window._marcarCompartido()"
                style="display:inline-flex;align-items:center;gap:5px;background:#1877f2;color:white;font-size:11px;font-weight:700;padding:6px 10px;border-radius:8px;text-decoration:none;">
                <i class="fa-brands fa-facebook"></i> FB
              </a>
            </div>
          </div>
        </div>

        <!-- Paso 2: Seguir IG -->
        <div id="req2Box" style="background:rgba(255,255,255,.07);border:1.5px solid rgba(255,255,255,.13);border-radius:12px;padding:11px 13px;transition:all .3s;">
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
            <div id="req2Check" style="font-size:16px;flex-shrink:0;">📸</div>
            <div style="flex:1;min-width:0;">
              <div style="font-size:13px;font-weight:700;color:white;">2. Seguí @datawebdigital en Instagram</div>
              <div style="font-size:11px;color:rgba(255,255,255,.5);margin-top:1px;">Para enterarte de resultados y ganadores</div>
            </div>
            <a href="https://www.instagram.com/datawebdigital/" target="_blank" onclick="window._marcarIGSeguido()"
              style="display:inline-flex;align-items:center;gap:6px;background:linear-gradient(135deg,#f09433,#dc2743,#bc1888);color:white;font-size:12px;font-weight:700;padding:8px 12px;border-radius:9px;text-decoration:none;flex-shrink:0;">
              <i class="fa-brands fa-instagram"></i> Seguir
            </a>
          </div>
        </div>

      </div>

      <!-- Mensaje éxito (aparece cuando ambos requisitos están completos) -->
      <div id="prodeSuccess" style="display:none;background:linear-gradient(135deg,rgba(20,83,45,.9),rgba(22,101,52,.85));border:2px solid #4ade80;border-radius:14px;padding:16px;text-align:center;margin-bottom:12px;">
        <div style="font-size:28px;margin-bottom:6px;">🎉</div>
        <div style="font-size:15px;font-weight:900;color:white;margin-bottom:4px;">¡Ya podés llenar el fixture del mundial!</div>
        <div style="font-size:12px;color:rgba(255,255,255,.8);margin-bottom:14px;">Mucha suerte en el Prode 2026 🏆⚽</div>
        <a href="/mundial.html"
          style="display:inline-flex;align-items:center;gap:8px;background:linear-gradient(135deg,#facc15,#f59e0b);color:#1c1917;font-weight:900;font-size:14px;padding:12px 26px;border-radius:12px;text-decoration:none;box-shadow:0 4px 18px rgba(250,204,21,.45);transition:transform .15s;"
          onmouseover="this.style.transform='scale(1.04)'" onmouseout="this.style.transform='scale(1)'">
          ⚽ Ir al fixture →
        </a>
      </div>

      <!-- Botón ver prode (cuando aún no completó requisitos) -->
      <div id="prodeBtnWrap">
        <a href="/mundial.html"
          style="display:flex;align-items:center;justify-content:center;gap:7px;background:rgba(255,255,255,.12);color:rgba(255,255,255,.85);font-weight:700;font-size:13px;padding:11px;border-radius:12px;text-decoration:none;border:1px solid rgba(255,255,255,.2);transition:background .15s;"
          onmouseover="this.style.background='rgba(255,255,255,.2)'" onmouseout="this.style.background='rgba(255,255,255,.12)'">
          🏆 Ver el prode del mundial →
        </a>
      </div>

    </div>
    </div>

    <hr style="margin:24px 0;border:none;border-top:1px solid #e2e8f0;">

    ${statsHtml}
    ${disponibleHtml}
    ${trabajosHtml}

    ${data.tipo === "empleador" ? `
    <!-- ── ACCIONES EMPLEADOR ── -->
    <div style="margin-bottom:28px;">
      <h3 style="margin:0 0 14px;font-size:17px;"><i class="fa-solid fa-rocket" style="color:#2563eb;"></i> Acciones rápidas</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
        <button onclick="abrirModalPuesto()"
          style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:22px 14px;border-radius:16px;border:2px solid #bfdbfe;background:#eff6ff;cursor:pointer;transition:all .2s;"
          onmouseover="this.style.background='#dbeafe';this.style.borderColor='#3b82f6'"
          onmouseout="this.style.background='#eff6ff';this.style.borderColor='#bfdbfe'">
          <i class="fa-solid fa-bullhorn" style="font-size:32px;color:#2563eb;"></i>
          <div>
            <p style="margin:0;font-weight:800;font-size:14px;color:#1e293b;">Publicar puesto</p>
            <p style="margin:2px 0 0;font-size:12px;color:#64748b;">Promocioná un puesto en tu empresa</p>
          </div>
        </button>
        <a href="/buscador_trabajos.html"
          style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:22px 14px;border-radius:16px;border:2px solid #bbf7d0;background:#f0fdf4;cursor:pointer;transition:all .2s;text-decoration:none;"
          onmouseover="this.style.background='#dcfce7';this.style.borderColor='#22c55e'"
          onmouseout="this.style.background='#f0fdf4';this.style.borderColor='#bbf7d0'">
          <i class="fa-solid fa-users" style="font-size:32px;color:#059669;"></i>
          <div>
            <p style="margin:0;font-weight:800;font-size:14px;color:#1e293b;">Buscar empleados</p>
            <p style="margin:2px 0 0;font-size:12px;color:#64748b;">Explorá CVs de tu zona</p>
          </div>
        </a>
      </div>
    </div>
    <hr style="margin:0 0 24px;border:none;border-top:1px solid #e2e8f0;">
    ` : ""}

    <h3 style="margin:0 0 16px;font-size:17px;">Mis datos</h3>

    <div class="grid-2col">
      <div><label>Nombre *</label><input id="editNombre" value="${esc(data.nombre)}"></div>
      <div><label>Apellido *</label><input id="editApellido" value="${esc(data.apellido)}"></div>
    </div>

    <label>Móvil / WhatsApp *</label>
    <input id="editMovil" value="${esc(data.movil)}" type="tel" placeholder="Ej: 1123456789">

    <label><i class="fa-brands fa-instagram" style="color:#e1306c;"></i> Instagram</label>
    <input id="editInstagram" value="${esc(data.instagram)}" placeholder="Ej: @tunombre">

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

    ${data.tipo === "empleador" ? `
    <!-- ── DATOS DE EMPRESA ── -->
    <div style="background:#eff6ff;border:1.5px solid #bfdbfe;border-radius:14px;padding:18px 20px;margin:4px 0 20px;">
      <h4 style="margin:0 0 14px;font-size:15px;font-weight:800;color:#1d4ed8;">
        <i class="fa-solid fa-building" style="margin-right:6px;"></i>Datos de la empresa o comercio
      </h4>

      <div id="logoEmpresaActual" style="margin-bottom:10px;">
        ${data.empresa_logo ? `<img src="${esc(data.empresa_logo)}" style="width:80px;height:80px;border-radius:12px;object-fit:cover;border:2px solid #bfdbfe;">` : ""}
      </div>
      <label><i class="fa-solid fa-image" style="color:#2563eb;"></i> Logo o imagen de la empresa</label>
      <label for="inputLogoEmpresa" style="display:inline-flex;align-items:center;gap:8px;cursor:pointer;background:white;border:2px dashed #93c5fd;border-radius:10px;padding:10px 16px;font-size:13px;color:#2563eb;font-weight:600;margin-bottom:12px;">
        <i class="fa-solid fa-cloud-arrow-up"></i> Subir logo
        <input type="file" id="inputLogoEmpresa" accept="image/*" style="display:none" onchange="subirLogoEmpresa(this)">
      </label>
      <div id="msgLogoEmpresa" style="margin-bottom:8px;"></div>

      <label>Nombre de la empresa *</label>
      <input id="editEmpresaNombre" value="${esc(data.nombre_empresa)}" placeholder="Ej: Supermercado El Sol, Ferretería García">

      <label>Rubro / Sector</label>
      <select id="editEmpresaSector">
        <option value="">— Seleccioná un sector —</option>
        ${["Comercio y retail","Gastronomía y hotelería","Construcción","Industria y producción",
           "Transporte y logística","Tecnología e informática","Salud y medicina","Educación",
           "Seguridad","Agropecuario","Servicios profesionales","Limpieza y mantenimiento",
           "Textil y confección","Medios y comunicación","Otro"].map(s =>
          `<option value="${s}" ${data.empresa_sector===s?"selected":""}>${s}</option>`
        ).join("")}
      </select>

      <label>Descripción de la empresa <span style="font-size:11px;color:#94a3b8;font-weight:400;">(opcional — aparece en tu perfil público)</span></label>
      <textarea id="editEmpresaDesc" rows="3" placeholder="Contá a qué se dedica tu empresa, cuántos empleados tenés, qué ambiente de trabajo ofrecés...">${esc(data.empresa_descripcion)}</textarea>
    </div>
    ` : ""}

    <!-- ── Visibilidad pública ── -->
    <div style="background:#faf5ff;border:1.5px solid #e9d5ff;border-radius:14px;padding:18px 18px 14px;margin:20px 0 0;">
      <h4 style="margin:0 0 14px;font-size:15px;font-weight:800;color:#6d28d9;">
        <i class="fa-solid fa-eye" style="margin-right:6px;"></i>Visibilidad en el buscador
      </h4>

      <label>
        <i class="fa-solid fa-building" style="color:#7c3aed;margin-right:4px;"></i>
        Nombre de Empresa o Negocio
        <span style="font-size:11px;color:#94a3b8;font-weight:400;"> (opcional)</span>
      </label>
      <input id="editEmpresa" value="${esc(data.nombre_empresa)}" placeholder="Ej: Plomería García, Estudio López & Asoc.">

      <label style="margin-top:12px;">Aparecer en el perfil público como</label>
      <div class="radio-group" style="margin-bottom:14px;">
        <label class="radio-opt">
          <input type="radio" name="editMostrarComo" value="personal" ${(data.mostrar_como||'personal')==='personal'?'checked':''}>
          <span class="radio-custom"></span>
          Mi nombre personal (${esc(data.nombre)} ${esc(data.apellido)})
        </label>
        <label class="radio-opt">
          <input type="radio" name="editMostrarComo" value="empresa" ${data.mostrar_como==='empresa'?'checked':''}>
          <span class="radio-custom"></span>
          Nombre de empresa / negocio
        </label>
      </div>

      <div class="check-fila" style="margin-bottom:0;">
        <label class="check-opt">
          <input type="checkbox" id="editMostrarTel" ${data.mostrar_telefono!==false?'checked':''}>
          <span class="check-custom"></span>
          Mostrar mi teléfono/WhatsApp en el perfil público
        </label>
      </div>

      <div class="check-fila" style="margin-top:12px;border-top:1px solid #e9d5ff;padding-top:12px;margin-bottom:0;">
        <label class="check-opt">
          <input type="checkbox" id="toggleMostrarMapa" ${localStorage.getItem('tc_mapa_on')==='1'?'checked':''}
            onchange="this.checked?localStorage.setItem('tc_mapa_on','1'):localStorage.removeItem('tc_mapa_on');document.getElementById('mapaOnMsg').style.display=this.checked?'flex':'none'">
          <span class="check-custom"></span>
          Mostrar enlace a Google Maps en el buscador
        </label>
        <div id="mapaOnMsg" style="display:${localStorage.getItem('tc_mapa_on')==='1'?'flex':'none'};align-items:center;gap:6px;font-size:12px;color:#6d28d9;margin-top:6px;padding:8px 10px;background:rgba(109,40,217,.08);border-radius:8px;">
          <i class="fa-solid fa-map-location-dot"></i>
          <span>Activado — cada resultado mostrará "Ver en mapa" con la ubicación en Google Maps</span>
        </div>
      </div>

      <div class="check-fila" style="margin-top:12px;border-top:1px solid #e9d5ff;padding-top:12px;margin-bottom:0;">
        <label class="check-opt">
          <input type="checkbox" id="toggleRecibirMsgs" ${localStorage.getItem('tc_recibir_msgs')==='0'?'':'checked'}
            onchange="this.checked?localStorage.removeItem('tc_recibir_msgs'):localStorage.setItem('tc_recibir_msgs','0');document.getElementById('msgsOffMsg').style.display=this.checked?'none':'flex'">
          <span class="check-custom"></span>
          Recibir mensajes de otros usuarios
        </label>
        <div id="msgsOffMsg" style="display:${localStorage.getItem('tc_recibir_msgs')==='0'?'flex':'none'};align-items:center;gap:6px;font-size:12px;color:#dc2626;margin-top:6px;padding:8px 10px;background:rgba(220,38,38,.07);border-radius:8px;">
          <i class="fa-solid fa-comment-slash"></i>
          <span>Mensajes desactivados en este dispositivo — otros usuarios no verán el botón de mensaje en tu perfil</span>
        </div>
      </div>

      <div class="check-fila" style="margin-top:12px;border-top:1px solid #e9d5ff;padding-top:12px;margin-bottom:0;">
        <label class="check-opt">
          <input type="checkbox" id="toggleAparecerMapa" ${localStorage.getItem('tc_en_mapa')==='0'?'':'checked'}
            onchange="this.checked?localStorage.removeItem('tc_en_mapa'):localStorage.setItem('tc_en_mapa','0');document.getElementById('mapaOffMsg').style.display=this.checked?'none':'flex'">
          <span class="check-custom"></span>
          Aparecer en el mapa de profesionales
        </label>
        <div id="mapaOffMsg" style="display:${localStorage.getItem('tc_en_mapa')==='0'?'flex':'none'};align-items:center;gap:6px;font-size:12px;color:#dc2626;margin-top:6px;padding:8px 10px;background:rgba(220,38,38,.07);border-radius:8px;">
          <i class="fa-solid fa-map-pin"></i>
          <span>Tu perfil no aparecerá en el mapa de profesionales en este dispositivo</span>
        </div>
        <p style="font-size:11px;color:#94a3b8;margin:6px 0 0;padding-left:2px;">
          <i class="fa-solid fa-circle-info" style="margin-right:3px;"></i>
          Para configurar tu ubicación en el mapa, completá tu dirección en
          <a href="/perfil_servicio.html" style="color:#2563eb;">tu perfil de servicio</a>.
        </p>
      </div>
    </div>

    <div id="msgPerfil" style="margin-top:14px;"></div>

    <button class="btn btn-primary" onclick="guardarDatos()">
      <i class="fa-solid fa-save"></i> Guardar cambios
    </button>

    <hr style="margin:28px 0;border:none;border-top:1px solid #e2e8f0;">

    ${data.tipo === "profesional" ? `
      <h3 style="margin:0 0 6px;font-size:17px;">
        <i class="fa-solid fa-star" style="color:#f59e0b;"></i> Puntuar a un cliente
      </h3>
      <p style="font-size:14px;color:#64748b;margin:0 0 16px;">
        Cuando cerrés un trato, buscá al cliente por su email y dejale una puntuación para ayudar a la comunidad.
      </p>
      <label>Email del cliente</label>
      <input id="emailCliente" type="email" placeholder="email registrado del cliente">
      <div id="clienteEncontrado" style="margin-bottom:10px;"></div>
      <button class="btn btn-outline" onclick="buscarCliente()" style="margin-bottom:18px;">
        <i class="fa-solid fa-magnifying-glass"></i> Buscar cliente
      </button>
      <div id="formClienteRating" style="display:none;">
        <label>Puntuación *</label>
        <div class="stars-input" id="starsCliente">
          <i class="fa-solid fa-star" onclick="setEstrellaCliente(1)" onmouseover="hoverEstrellaCliente(1)" onmouseout="resetHoverCliente()"></i>
          <i class="fa-solid fa-star" onclick="setEstrellaCliente(2)" onmouseover="hoverEstrellaCliente(2)" onmouseout="resetHoverCliente()"></i>
          <i class="fa-solid fa-star" onclick="setEstrellaCliente(3)" onmouseover="hoverEstrellaCliente(3)" onmouseout="resetHoverCliente()"></i>
          <i class="fa-solid fa-star" onclick="setEstrellaCliente(4)" onmouseover="hoverEstrellaCliente(4)" onmouseout="resetHoverCliente()"></i>
          <i class="fa-solid fa-star" onclick="setEstrellaCliente(5)" onmouseover="hoverEstrellaCliente(5)" onmouseout="resetHoverCliente()"></i>
        </div>
        <label>Comentario</label>
        <textarea id="comentarioCliente" rows="3"
          placeholder="¿Cómo fue trabajar con este cliente? Puntualidad, trato, pago..."></textarea>
        <div id="msgClienteRating"></div>
        <button class="btn btn-success" onclick="enviarRatingCliente()">
          <i class="fa-solid fa-paper-plane"></i> Enviar puntuación
        </button>
      </div>
    ` : ""}

    ${referidosHtml}
    ${guardadosHtml}

    <hr style="margin:28px 0;border:none;border-top:1px solid #e2e8f0;">

    ${data.email === 'datawebgames@gmail.com' ? `
    <a href="/admin.html" class="btn" style="background:linear-gradient(135deg,#dc2626,#b91c1c);color:white;border:none;margin-bottom:10px;display:flex;align-items:center;justify-content:center;gap:8px;text-decoration:none;">
      <i class="fa-solid fa-shield-halved"></i> Panel de Administración
    </a>
    ` : ""}
    <button class="btn btn-outline" onclick="cerrarSesion()" style="color:#ef4444;border-color:#ef4444;">
      <i class="fa-solid fa-right-from-bracket"></i> Cerrar sesión
    </button>
  `

  // Cargar datos del prode en la card (async, no bloquea render)
  cargarProdeCard(userId)

  // Chatbox de preguntas frecuentes
  montarFAQChat()

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

  const mostrarComo = document.querySelector('input[name="editMostrarComo"]:checked')?.value || "personal"
  const mostrarTel  = document.getElementById("editMostrarTel")?.checked ?? true
  const empresa     = (document.getElementById("editEmpresa")?.value || document.getElementById("editEmpresaNombre")?.value || "").trim()

  const payload = {
    nombre,
    apellido,
    movil:            document.getElementById("editMovil").value.trim(),
    instagram:        document.getElementById("editInstagram").value.trim(),
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

/* ── CERRAR SESIÓN ── */
window.cerrarSesion = async function(){
  await supabase.auth.signOut()
  location.href = "/index.html"
}

function esc(v){ return (v || "").toString().replace(/"/g,"&quot;") }

/* ── PRODE CARD: verificar requisitos (localStorage) ── */
function cargarProdeCard(userId){
  const compartido = !!localStorage.getItem('tc_compartido')
  const igSeguido  = !!localStorage.getItem('tc_ig_seguido')
  const ambos      = compartido && igSeguido

  // Status text
  const status = document.getElementById("prodeStatus")
  if(status){
    if(ambos){
      status.innerHTML = `<span style="color:#4ade80;font-weight:700;">✅ ¡Requisitos cumplidos! Podés predecir</span>`
    } else {
      const p = (!compartido ? 1 : 0) + (!igSeguido ? 1 : 0)
      status.innerHTML = `<span style="color:rgba(255,255,255,.5);">Completá ${p} requisito${p!==1?"s":""} para desbloquear el fixture</span>`
    }
  }

  // Marcar req1 (compartido)
  const req1Box   = document.getElementById("req1Box")
  const req1Check = document.getElementById("req1Check")
  if(req1Box && compartido){
    req1Box.style.borderColor = "rgba(74,222,128,.55)"
    req1Box.style.background  = "rgba(74,222,128,.1)"
    if(req1Check) req1Check.textContent = "✅"
  }

  // Marcar req2 (IG seguido)
  const req2Box   = document.getElementById("req2Box")
  const req2Check = document.getElementById("req2Check")
  if(req2Box && igSeguido){
    req2Box.style.borderColor = "rgba(74,222,128,.55)"
    req2Box.style.background  = "rgba(74,222,128,.1)"
    if(req2Check) req2Check.textContent = "✅"
  }

  // Mostrar éxito o botón normal
  const succ    = document.getElementById("prodeSuccess")
  const btnWrap = document.getElementById("prodeBtnWrap")
  if(succ)    succ.style.display    = ambos ? "block" : "none"
  if(btnWrap) btnWrap.style.display = ambos ? "none"  : "block"
}

/* ── Helpers globales para marcar desde onclick ── */
window._marcarCompartido = function(){
  localStorage.setItem('tc_compartido', '1')
  setTimeout(cargarProdeCard, 800)
}
window._marcarIGSeguido = function(){
  localStorage.setItem('tc_ig_seguido', '1')
  setTimeout(cargarProdeCard, 1500)
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

init()
