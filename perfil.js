import { supabase } from "./supabase.js"

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

  const badgeHtml = data.tipo === "profesional"
    ? '<span class="badge badge-pro">🔨 Profesional</span>'
    : data.tipo === "empleador"
    ? '<span class="badge" style="background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;">🏢 Empleador</span>'
    : '<span class="badge badge-work">📄 Busca trabajo</span>'

  const accionPrincipal = data.tipo === "profesional"
    ? `<a href="/perfil_servicio.html" class="btn btn-orange"><i class="fa-solid fa-tools"></i> Gestionar mi servicio</a>`
    : data.tipo === "empleador"
    ? `<a href="/buscador_trabajos.html" class="btn btn-success"><i class="fa-solid fa-users"></i> Buscar empleados</a>`
    : `<a href="/perfil_cv.html" class="btn btn-success"><i class="fa-solid fa-file-lines"></i> Gestionar mi CV</a>`

  /* ── Disponibilidad + Estadísticas + Guardados (solo profesionales) ── */
  let disponibleHtml = ""
  let statsHtml = ""
  if(data.tipo === "profesional"){
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
  }

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

    <hr style="margin:24px 0;border:none;border-top:1px solid #e2e8f0;">

    ${statsHtml}
    ${disponibleHtml}

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

    ${guardadosHtml}

    <hr style="margin:28px 0;border:none;border-top:1px solid #e2e8f0;">

    <button class="btn btn-outline" onclick="cerrarSesion()" style="color:#ef4444;border-color:#ef4444;">
      <i class="fa-solid fa-right-from-bracket"></i> Cerrar sesión
    </button>
  `

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
  const url   = `https://trabajocerca.vercel.app/perfil_publico?id=${userId}`
  const texto = "Mirá mi perfil en Trabajos Cerca 👷‍♂️ Encontrá profesionales y oficios cerca tuyo."
  compartir(url, "Mi perfil — Trabajos Cerca", texto)
}

window.compartirInicio = function(){
  const url   = "https://trabajocerca.vercel.app/"
  const texto = "¡Encontrá profesionales, oficios y trabajo en tu ciudad! 👷‍♂️💼 Trabajos Cerca — 100% gratis."
  compartir(url, "Trabajos Cerca", texto)
}

/* ── CERRAR SESIÓN ── */
window.cerrarSesion = async function(){
  await supabase.auth.signOut()
  location.href = "/index.html"
}

function esc(v){ return (v || "").toString().replace(/"/g,"&quot;") }


init()
