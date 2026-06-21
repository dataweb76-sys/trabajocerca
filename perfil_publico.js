import { supabase } from "./supabase.js"

let estrellaSeleccionada = 0

async function cargarPerfil(){
  const params = new URLSearchParams(location.search)
  const id = params.get("id")
  if(!id){
    document.getElementById("contenido").innerHTML = `
      <div style="text-align:center;padding:60px 20px;">
        <i class="fa-solid fa-circle-exclamation" style="font-size:44px;color:#f97316;display:block;margin-bottom:14px;"></i>
        <p style="font-size:16px;color:#475569;margin-bottom:16px;">No se especificó ningún perfil.</p>
        <a href="/buscador_oficios.html" class="btn btn-primary">Ir al buscador</a>
      </div>`
    return
  }
  try {

  const { data: authData } = await supabase.auth.getUser()
  const usuarioActual = authData.user?.id || null

  const [
    { data: perfil },
    { data: servicio },
    { data: reviews },
    { data: fotos },
    { data: curriculum },
    { count: apoyoCount }
  ] = await Promise.all([
    supabase.from("perfiles").select("*").eq("id", id).maybeSingle(),
    supabase.from("servicios").select("*").eq("usuario_id", id).maybeSingle(),
    supabase.from("reviews").select("*").eq("trabajador_id", id).order("created_at", { ascending: false }),
    supabase.from("portfolio").select("*").eq("usuario_id", id),
    // cv_publico se fetchea aparte para no romper si la columna aún no existe en DB
    supabase.from("curriculum").select("titulo_profesional,rubros,disponibilidad,modalidad,resumen,habilidades,educacion,experiencia,cv_archivo").eq("usuario_id", id).maybeSingle(),
    supabase.from("perfil_eventos").select("*", { count: "exact", head: true }).eq("profesional_id", id).eq("tipo", "apoyo_cv")
  ])

  // cv_publico: si la columna existe en DB viene en el objeto, si no existe es undefined → true por defecto
  const cvPublico = curriculum?.cv_publico !== false

  const yaApoyo = localStorage.getItem(`tc_apoyo_cv_${id}`) === "1"
  // Si el usuario ya apoyó localmente, ajustar el conteo mínimo a 1
  const apoyoMin = (yaApoyo && (apoyoCount || 0) === 0) ? 1 : (apoyoCount || 0)

  if(!perfil){ document.getElementById("contenido").innerHTML = '<div class="alerta alerta-err">Perfil no encontrado.</div>'; return }

  // Nombre a mostrar según preferencia del usuario
  const displayNombre = (perfil.mostrar_como === "empresa" && perfil.nombre_empresa)
    ? perfil.nombre_empresa
    : `${perfil.nombre||""} ${perfil.apellido||""}`.trim()
  const displayNombreEsc = displayNombre.replace(/'/g, "\\'").replace(/"/g, "&quot;")

  document.title = `${displayNombre} — Trabajos Cerca`

  const foto = perfil.foto
    ? `<img src="${perfil.foto}" style="width:100px;height:100px;border-radius:50%;object-fit:cover;border:3px solid #2563eb;margin-bottom:12px;">`
    : `<div style="width:100px;height:100px;border-radius:50%;background:#dbeafe;display:flex;align-items:center;justify-content:center;font-size:40px;color:#2563eb;margin:0 auto 12px;"><i class="fa-solid fa-user"></i></div>`

  const promedio = reviews?.length
    ? (reviews.reduce((a,r) => a+r.rating, 0) / reviews.length).toFixed(1) : null

  const ratingHtml = promedio
    ? `<p class="estrellas" style="margin:4px 0;">★ ${promedio} <span style="color:#64748b;font-size:14px;">(${reviews.length} valoración${reviews.length!==1?"es":""})</span></p>`
    : `<p style="color:#94a3b8;font-size:13px;margin:4px 0;">Sin valoraciones aún</p>`

  const wa = perfil.mostrar_telefono !== false && perfil.movil
    ? `https://wa.me/${perfil.movil.replace(/\D/g,"")}`
    : null

  /* ── Servicio ── */
  let servicioHtml = ""
  if(servicio){
    const tags = servicio.servicios_lista
      ? servicio.servicios_lista.split(",").map(s=>`<span class="servicio-tag">${s.trim()}</span>`).join("") : ""

    servicioHtml = `
      <div class="card">
        <h3 style="color:#f97316;"><i class="fa-solid fa-tools"></i> ${servicio.categoria}</h3>
        ${servicio.titulo?`<p><strong>${servicio.titulo}</strong></p>`:""}
        ${tags?`<div class="servicios-tags" style="margin-bottom:12px;">${tags}</div>`:""}
        ${servicio.horarios?`<p style="font-size:14px;"><i class="fa-solid fa-clock" style="color:#2563eb;"></i> <strong>Horarios:</strong> ${servicio.horarios}</p>`:""}
        ${servicio.descripcion?`<p style="line-height:1.6;color:#475569;">${servicio.descripcion}</p>`:""}
        <p style="font-size:13px;color:#64748b;margin-bottom:0;">
          <i class="fa-solid fa-location-dot"></i>
          ${servicio.localidad||""}${servicio.provincia?", "+servicio.provincia:""}
        </p>
        ${(servicio.lat&&servicio.lng)?'<div id="mapaPub"></div>':""}
      </div>`
  }

  /* ── Fotos de trabajos realizados ── */
  const itemsConFotos = fotos?.filter(f => f.foto1 || f.foto2 || f.foto3) || []

  // Armar lista plana de todas las imágenes para el lightbox
  const todasLasImgs = []
  itemsConFotos.forEach(item => {
    const imgs = [item.foto1, item.foto2, item.foto3].filter(Boolean)
    imgs.forEach(f => todasLasImgs.push({ src: f, titulo: item.titulo || "" }))
  })
  // Guardar en window para acceso desde onclick
  window._tcImgs = todasLasImgs

  let fotosHtml = itemsConFotos.length
    ? `<div class="card">
        <h3><i class="fa-solid fa-images" style="color:#f97316;"></i> Trabajos realizados</h3>
        ${itemsConFotos.map(item => {
          const imgs = [item.foto1, item.foto2, item.foto3].filter(Boolean)
          return `<div style="margin-bottom:18px;">
            ${item.titulo ? `<p style="font-size:14px;font-weight:700;color:#1e293b;margin:0 0 8px;">
              <i class="fa-solid fa-hammer" style="color:#f97316;font-size:12px;margin-right:5px;"></i>${item.titulo}</p>` : ""}
            <div class="fotos-grid">
              ${imgs.map(f => {
                const idx = todasLasImgs.findIndex(i => i.src === f)
                return `<img src="${f}" alt="${item.titulo||""}"
                  onclick="window._tcAbrirLightbox(${idx})"
                  style="cursor:zoom-in;border-radius:10px;transition:opacity .15s;"
                  onmouseover="this.style.opacity='.85'" onmouseout="this.style.opacity='1'">`
              }).join("")}
            </div>
            ${item.descripcion ? `<p style="font-size:12px;color:#64748b;margin:6px 0 0;line-height:1.5;">${item.descripcion}</p>` : ""}
          </div>`
        }).join("")}
      </div>`
    : `<div class="card" style="text-align:center;padding:22px 16px;">
        <i class="fa-solid fa-camera" style="font-size:32px;color:#cbd5e1;display:block;margin-bottom:10px;"></i>
        <p style="margin:0;font-size:14px;font-weight:700;color:#94a3b8;">Trabajos realizados</p>
        <p style="margin:4px 0 0;font-size:12px;color:#cbd5e1;">Este profesional aún no subió fotos de sus trabajos</p>
      </div>`

  /* ── Banner publicitario entre info y calificaciones ── */
  const bannerPubHtml = `
  <div id="banner-perfil-pub" style="margin-bottom:16px;">
    <a href="/perfil_servicio.html" id="banner-perfil-link"
      style="display:block;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.10);line-height:0;text-decoration:none;transition:transform .15s,box-shadow .15s;"
      title="Publicita aquí en Trabajos Cerca"
      onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 18px rgba(0,0,0,.16)'"
      onmouseout="this.style.transform='';this.style.boxShadow='0 2px 12px rgba(0,0,0,.10)'">
      <img id="banner-perfil-img" src="/banner-pub-profesional.jpg" alt="Publicita aquí"
        style="width:100%;height:auto;display:block;">
    </a>
  </div>`

  /* Cargar banner dinámico del admin (sin bloquear el render) */
  ;(function(){
    var SUPA_URL2 = 'https://iqeiszkoifxgygoqvbem.supabase.co'
    var SUPA_KEY2 = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxZWlzemtvaWZ4Z3lnb3F2YmVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyMTEzODIsImV4cCI6MjA5NDc4NzM4Mn0.qxt70TPbARPcMc8HhHx2A2QnfBvJLCrnrH4m36IcENs'
    fetch(SUPA_URL2 + '/rest/v1/configuracion?clave=eq.pub_config&select=valor', {
      headers: { 'apikey': SUPA_KEY2, 'Authorization': 'Bearer ' + SUPA_KEY2 }
    }).then(function(r){ return r.json() }).then(function(rows){
      if(!rows?.[0]?.valor) return
      var cfg  = JSON.parse(rows[0].valor)
      var sec  = cfg.inicio_a || cfg.oficios || {}
      var imgs = (sec.imagenes || []).filter(Boolean)
      var lnks = sec.links || []
      if(!imgs.length) return
      var idx  = Math.floor(Math.random() * imgs.length)
      var img  = document.getElementById('banner-perfil-img')
      var a    = document.getElementById('banner-perfil-link')
      if(img) img.src = imgs[idx]
      if(a && lnks[idx]) {
        var l = lnks[idx]
        a.href   = l.startsWith('http') ? l : 'https://' + l
        a.target = '_blank'
        a.rel    = 'noopener noreferrer'
      }
    }).catch(function(){})
  })()

  /* ── Reviews + Calificación (todo en una card) ── */
  const puntosTotal = reviews?.reduce((a,r) => a + r.rating, 0) || 0
  const yaVoto = reviews?.some(r => r.autor_id === usuarioActual)
  const puedeVotar = usuarioActual && usuarioActual !== id && !yaVoto

  const reviewsHtml = ""  // incluido en formRating abajo

  const formRating = `<div class="card" id="formRating">
    <h3><i class="fa-solid fa-trophy" style="color:#f59e0b;"></i> Puntaje y calificaciones</h3>

    ${reviews?.length ? `
      <div class="puntos-total-box">
        <div class="puntos-total-num">${puntosTotal}</div>
        <div class="puntos-total-label">puntos acumulados · ${reviews.length} calificación${reviews.length!==1?"es":""}</div>
      </div>
      ${reviews.slice(0,5).map(r => {
        const col = r.rating<=3?"#dc2626":r.rating<=6?"#d97706":"#16a34a"
        return `<div class="review-item" style="margin-bottom:8px;">
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="background:${col};color:white;font-weight:800;font-size:13px;padding:2px 9px;border-radius:20px;">${r.rating}/10</span>
            ${r.comentario?`<span style="font-size:13px;color:#475569;font-style:italic;">"${r.comentario.substring(0,80)}"</span>`:""}
          </div>
        </div>`
      }).join("")}
    ` : `<p style="font-size:13px;color:#94a3b8;text-align:center;margin-bottom:14px;">Sin calificaciones aún — ¡sé el primero!</p>`}

    ${puedeVotar ? `
      <button class="btn-calificar" id="btnCalPub" onclick="mostrarFormPub()">
        <i class="fa-solid fa-star"></i> Calificar a ${displayNombre}
      </button>
      <div id="formRevPub" style="display:none;">
        <div class="form-review" style="margin-top:0;">
          <h4 style="margin:0 0 4px;"><i class="fa-solid fa-pen"></i> Tu calificación</h4>
          <p style="font-size:11px;color:#94a3b8;margin:0 0 8px;">1 = Muy malo · 10 = Excelente</p>
          <div class="rating-10" id="rating10Pub">
            ${[1,2,3,4,5,6,7,8,9,10].map(i=>`<button class="rating-num ${i<=3?"r-bad":i<=6?"r-ok":"r-good"}" onclick="selPub(${i})">${i}</button>`).join("")}
          </div>
          <div id="lblRevPub" style="font-size:13px;min-height:20px;margin-bottom:8px;"></div>
          <textarea id="comentRevPub" rows="3" placeholder="Contá tu experiencia (opcional)"
            style="width:100%;border:1px solid #bfdbfe;border-radius:8px;padding:10px;font-size:13px;resize:vertical;box-sizing:border-box;margin-bottom:10px;font-family:inherit;"></textarea>
          <div id="msgRevPub"></div>
          <button class="btn btn-primary btn-sm" onclick="enviarRatingPub('${id}','${displayNombreEsc}')">
            <i class="fa-solid fa-paper-plane"></i> Enviar calificación
          </button>
        </div>
      </div>
    ` : yaVoto
      ? `<p style="font-size:13px;color:#16a34a;text-align:center;margin:8px 0 0;"><i class="fa-solid fa-check-circle"></i> Ya calificaste a esta persona — ¡gracias!</p>`
      : `<div style="background:#eff6ff;border-radius:10px;padding:14px;text-align:center;margin-top:8px;">
          <p style="margin:0 0 8px;font-size:14px;color:#1e40af;"><strong>¿Trabajaste o contrataste a ${displayNombre}?</strong></p>
          <p style="margin:0 0 10px;font-size:13px;color:#475569;">Iniciá sesión y dejá tu calificación — cada punto suma.</p>
          <a href="/login.html?next=${encodeURIComponent(location.pathname+location.search)}" class="btn btn-primary btn-sm" style="text-decoration:none;">
            <i class="fa-solid fa-right-to-bracket"></i> Iniciá sesión
          </a>
        </div>`}
  </div>`

  /* ── Sección "Impulsá tu búsqueda" — sólo para perfiles con CV ── */
  const esPropioPerfilCV = usuarioActual === id && !!curriculum

  const rubrosCV = Array.isArray(curriculum?.rubros) ? curriculum.rubros : []
  const rubrosCVstr = rubrosCV.slice(0, 4).join(" · ")

  const impulsarCVHtml = curriculum ? (() => {
    const total = apoyoMin
    const waNum = (perfil.movil || "").replace(/\D/g,"")
    const waLinkContacto = waNum
      ? `https://wa.me/${waNum}?text=${encodeURIComponent(`Hola${perfil.nombre?" "+perfil.nombre:""}! Vi tu CV en Trabajos Cerca y me interesa contactarte. ¿Podemos hablar? 👋`)}`
      : null

    const msgWACv = encodeURIComponent(
      `👋 Conocé a ${displayNombre}${curriculum.titulo_profesional ? `, ${curriculum.titulo_profesional}` : ""}${perfil.localidad ? ` en ${perfil.localidad}` : ""}.\n` +
      `Está buscando trabajo y su perfil está en Trabajos Cerca 💼\n` +
      `👉 ${location.origin}/perfil_publico.html?id=${id}\n` +
      `¡Compartilo si conocés a alguien que lo pueda contratar!`
    )

    const apoyadoStyle = yaApoyo
      ? `background:#dcfce7;color:#15803d;border:2px solid #86efac;`
      : `background:linear-gradient(135deg,#2563eb,#1d4ed8);color:white;border:none;`

    return `
    <div class="card" id="impulsarCVSection" style="background:linear-gradient(160deg,#f0fdf4 0%,#eff6ff 100%);border:2px solid #86efac;padding:20px;">

      <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:18px;">
        <div style="font-size:34px;flex-shrink:0;line-height:1;">🚀</div>
        <div>
          <h3 style="margin:0 0 3px;color:#15803d;font-size:17px;">Ayudalo a conseguir trabajo</h3>
          <p style="margin:0;font-size:13px;color:#16a34a;line-height:1.5;">
            Con un clic podés cambiarle la vida. Cada compartido lo acerca a su próximo trabajo.
          </p>
        </div>
      </div>

      <!-- Contador de apoyos -->
      <div style="background:white;border-radius:14px;padding:12px 16px;margin-bottom:16px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;border:1px solid #dcfce7;box-shadow:0 2px 8px rgba(21,128,61,.07);">
        <div style="font-size:28px;">👏</div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:22px;font-weight:900;color:#15803d;line-height:1;" id="apoyoNum">${total}</div>
          <div style="font-size:12px;color:#64748b;" id="apoyoLabel">persona${total!==1?"s":""} ya apoyaron este perfil</div>
        </div>
        <button id="btnApoyo" onclick="darApoyo('${id}','${displayNombreEsc}')"
          style="${apoyadoStyle}padding:10px 18px;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:7px;font-family:inherit;transition:opacity .15s;">
          ${yaApoyo ? `<i class="fa-solid fa-check"></i> Apoyado` : `<i class="fa-solid fa-thumbs-up"></i> Apoyar`}
        </button>
      </div>

      <!-- Compartir -->
      <div style="margin-bottom:16px;">
        <p style="font-weight:800;color:#1e293b;font-size:14px;margin:0 0 10px;display:flex;align-items:center;gap:7px;">
          <span style="background:#2563eb;color:white;width:22px;height:22px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:11px;flex-shrink:0;">📤</span>
          Compartí su perfil — cada compartido puede ser su próxima oportunidad:
        </p>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <a href="https://wa.me/?text=${msgWACv}" target="_blank" rel="noopener"
            style="display:inline-flex;align-items:center;gap:6px;padding:10px 16px;background:#25D366;color:white;border-radius:10px;font-size:13px;font-weight:700;text-decoration:none;">
            <i class="fa-brands fa-whatsapp"></i> WhatsApp
          </a>
          <button onclick="compartirFBcv('${id}')"
            style="display:inline-flex;align-items:center;gap:6px;padding:10px 16px;background:#1877f2;color:white;border-radius:10px;font-size:13px;font-weight:700;border:none;cursor:pointer;font-family:inherit;">
            <i class="fa-brands fa-facebook"></i> Facebook
          </button>
          <button onclick="copiarLinkCV('${id}')" id="btnCopiarCV"
            style="display:inline-flex;align-items:center;gap:6px;padding:10px 16px;background:#f1f5f9;color:#475569;border:1.5px solid #e2e8f0;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;">
            <i class="fa-solid fa-link"></i> Copiar link
          </button>
          <button onclick="generarImagenCV('${displayNombreEsc}','${(curriculum.titulo_profesional||"").replace(/'/g,"\\'").replace(/"/g,"&quot;")}','${(perfil.localidad||"").replace(/'/g,"\\'")}','${rubrosCVstr.replace(/'/g,"\\'")}','${id}')"
            style="display:inline-flex;align-items:center;gap:6px;padding:10px 16px;background:linear-gradient(135deg,#833ab4,#fd1d1d,#fcb045);color:white;border-radius:10px;font-size:13px;font-weight:700;border:none;cursor:pointer;font-family:inherit;">
            <i class="fa-brands fa-instagram"></i> Generar imagen
          </button>
        </div>
      </div>

      <!-- Ideas de comunidades -->
      <div style="background:white;border-radius:12px;padding:14px 16px;margin-bottom:16px;border:1px solid #e2e8f0;">
        <p style="margin:0 0 10px;font-weight:800;color:#1e293b;font-size:14px;">💡 Ideas de dónde compartirlo:</p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:7px;font-size:13px;color:#475569;line-height:1.5;">
          <div><span style="font-size:15px;">📱</span> Grupos de WhatsApp de tu barrio o zona</div>
          <div><span style="font-size:15px;">👥</span> Grupos de Facebook "Trabajo en ${perfil.localidad||"tu ciudad"}"</div>
          <div><span style="font-size:15px;">💼</span> Grupos de LinkedIn de Recursos Humanos</div>
          <div><span style="font-size:15px;">🏭</span> Comunidades de tu gremio o sindicato</div>
          <div><span style="font-size:15px;">📋</span> Bolsas de trabajo de tu provincia</div>
          <div><span style="font-size:15px;">🏘️</span> Foros y grupos de tu ciudad</div>
        </div>
      </div>

      <!-- ¿Tenés trabajo para ofrecerle? -->
      ${waLinkContacto ? `
      <div style="background:linear-gradient(135deg,#f0fdf4,#dcfce7);border-radius:12px;padding:14px 16px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;border:1px solid #86efac;">
        <div style="flex:1;min-width:180px;">
          <p style="margin:0;font-weight:800;color:#15803d;font-size:15px;">💼 ¿Tenés trabajo para ofrecerle?</p>
          <p style="margin:4px 0 0;font-size:13px;color:#16a34a;line-height:1.5;">Contactalo directamente por WhatsApp, sin intermediarios.</p>
        </div>
        ${usuarioActual
          ? `<a href="${waLinkContacto}" target="_blank" rel="noopener"
          style="display:inline-flex;align-items:center;gap:7px;padding:12px 18px;background:#25D366;color:white;border-radius:10px;font-size:14px;font-weight:800;text-decoration:none;white-space:nowrap;">
          <i class="fa-brands fa-whatsapp"></i> Contactar ahora
        </a>`
          : `<a href="/registro.html?next=${encodeURIComponent(location.pathname+location.search)}"
          style="display:inline-flex;align-items:center;gap:7px;padding:12px 18px;background:#16a34a;color:white;border-radius:10px;font-size:14px;font-weight:800;text-decoration:none;white-space:nowrap;">
          <i class="fa-solid fa-user-plus"></i> Registrate gratis
        </a>`}
      </div>` : ""}

    </div>`
  })() : ""

  const badgesHtml = [
    perfil.destacado ? `<span style="display:inline-flex;align-items:center;gap:5px;background:#f59e0b;color:white;font-size:12px;font-weight:700;padding:3px 12px;border-radius:20px;"><i class="fa-solid fa-crown"></i> DESTACADO</span>` : "",
    perfil.verificado ? `<span style="display:inline-flex;align-items:center;gap:5px;background:#0ea5e9;color:white;font-size:12px;font-weight:700;padding:3px 12px;border-radius:20px;"><i class="fa-solid fa-circle-check"></i> VERIFICADO</span>` : ""
  ].filter(Boolean).join("")

  document.getElementById("contenido").innerHTML = `
    <div class="pub-header">
      ${foto}
      ${badgesHtml ? `<div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin:6px 0 4px;">${badgesHtml}</div>` : ""}
      <h2 style="margin:0 0 4px;">${displayNombre}</h2>
      <p style="margin:0 0 2px;color:#64748b;">
        <i class="fa-solid fa-location-dot"></i>
        ${perfil.localidad||""}${perfil.provincia?", "+perfil.provincia:""}
      </p>
      ${ratingHtml}
      ${curriculum ? `
      <button onclick="abrirVerCV('${id}','${displayNombreEsc}','${(perfil.movil||"").replace(/\D/g,"")}',${cvPublico},'${curriculum.cv_archivo||""}')"
        style="display:inline-flex;align-items:center;gap:8px;padding:11px 22px;background:linear-gradient(135deg,#1d4ed8,#2563eb);color:white;border:none;border-radius:12px;font-size:15px;font-weight:800;cursor:pointer;margin:10px auto 4px;font-family:inherit;box-shadow:0 4px 14px rgba(37,99,235,.3);">
        <i class="fa-solid fa-file-lines"></i> Ver CV completo
      </button>` : ""}
      ${wa
        ? usuarioActual
          ? `<a class="btn-whatsapp" href="${wa}?text=${encodeURIComponent(`Hola${perfil.nombre?" "+perfil.nombre:""}! Vi tu perfil en Trabajos Cerca.`)}" target="_blank" rel="noopener">
        <i class="fa-brands fa-whatsapp"></i> Contactar por WhatsApp</a>`
          : `<div style="background:linear-gradient(135deg,#f0fdf4,#eff6ff);border:2px solid #86efac;border-radius:14px;padding:16px 18px;text-align:center;margin:10px 0;">
          <p style="margin:0 0 6px;font-size:15px;font-weight:700;color:#15803d;">¿Querés contactar a ${displayNombre}?</p>
          <p style="margin:0 0 12px;font-size:13px;color:#475569;">Registrate gratis para ver el contacto y conectar con profesionales.</p>
          <a href="/registro.html?next=${encodeURIComponent(location.pathname+location.search)}" style="display:inline-flex;align-items:center;gap:7px;padding:10px 20px;background:linear-gradient(135deg,#16a34a,#15803d);color:white;border-radius:10px;font-size:14px;font-weight:700;text-decoration:none;margin-right:8px;">
            <i class="fa-solid fa-user-plus"></i> Registrarme gratis</a>
          <a href="/login.html?next=${encodeURIComponent(location.pathname+location.search)}" style="display:inline-flex;align-items:center;gap:7px;padding:10px 16px;background:white;color:#475569;border:1.5px solid #e2e8f0;border-radius:10px;font-size:13px;font-weight:600;text-decoration:none;">
            Ya tengo cuenta</a>
        </div>`
        : ""}
      <div style="display:flex;gap:7px;justify-content:center;margin-top:10px;flex-wrap:wrap;">
        <button id="btnCompartir" onclick="compartirPerfil('${id}')"
          style="display:inline-flex;align-items:center;gap:6px;padding:8px 14px;background:#f1f5f9;border:1.5px solid #e2e8f0;border-radius:9px;font-size:13px;font-weight:600;color:#475569;cursor:pointer;">
          <i class="fa-solid fa-link"></i> Copiar link
        </button>
        <button onclick="compartirWA('${displayNombreEsc}','${id}')"
          style="display:inline-flex;align-items:center;gap:6px;padding:8px 14px;background:#f0fdf4;border:1.5px solid #bbf7d0;border-radius:9px;font-size:13px;font-weight:600;color:#16a34a;cursor:pointer;">
          <i class="fa-brands fa-whatsapp"></i> WhatsApp
        </button>
        <button onclick="compartirFB('${id}')"
          style="display:inline-flex;align-items:center;gap:6px;padding:8px 14px;background:#eff6ff;border:1.5px solid #bfdbfe;border-radius:9px;font-size:13px;font-weight:600;color:#1d4ed8;cursor:pointer;">
          <i class="fa-brands fa-facebook"></i> Facebook
        </button>
        <button onclick="compartirX('${displayNombreEsc}','${id}')"
          style="display:inline-flex;align-items:center;gap:6px;padding:8px 14px;background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:9px;font-size:13px;font-weight:600;color:#0f172a;cursor:pointer;">
          <i class="fa-brands fa-x-twitter"></i> X
        </button>
      </div>
    </div>
    ${servicioHtml}
    ${curriculum ? `
    <div class="card" style="text-align:center;padding:22px 20px;background:linear-gradient(135deg,#eff6ff,#f0fdf4);border:2px solid #bfdbfe;">
      <p style="margin:0 0 6px;font-size:14px;color:#475569;line-height:1.5;">
        ${curriculum.cv_archivo
          ? `<i class="fa-solid fa-paperclip" style="color:#2563eb;"></i> Este candidato tiene un <strong>CV adjunto</strong> y un perfil completo`
          : `<i class="fa-solid fa-file-lines" style="color:#2563eb;"></i> Este candidato tiene su <strong>CV cargado</strong> en la plataforma`}
      </p>
      <button onclick="abrirVerCV('${id}','${displayNombreEsc}','${(perfil.movil||"").replace(/\D/g,"")}',${cvPublico},'${curriculum.cv_archivo||""}')"
        style="display:inline-flex;align-items:center;gap:9px;padding:13px 28px;background:linear-gradient(135deg,#1d4ed8,#2563eb);color:white;border:none;border-radius:14px;font-size:16px;font-weight:800;cursor:pointer;font-family:inherit;box-shadow:0 4px 16px rgba(37,99,235,.35);margin-top:8px;">
        <i class="fa-solid fa-file-lines"></i> Ver CV completo
      </button>
      ${!cvPublico ? `<p style="margin:8px 0 0;font-size:12px;color:#64748b;"><i class="fa-solid fa-lock" style="color:#f97316;"></i> Requiere autorización del candidato</p>` : ""}
    </div>` : ""}
    ${fotosHtml}
    ${impulsarCVHtml}
    ${reviewsHtml}
    ${bannerPubHtml}
    ${formRating}
  `

  if(servicio?.lat && servicio?.lng){
    setTimeout(() => {
      const map = L.map("mapaPub").setView([servicio.lat, servicio.lng], 13)
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map)
      L.marker([servicio.lat, servicio.lng]).addTo(map)
        .bindPopup(`<b>${displayNombreEsc}</b><br>${servicio.categoria}`).openPopup()
    }, 60)
  }

  // Registrar vista (no cuenta el propio profesional)
  registrarVista(id)

  } catch(err){
    console.error("Error en cargarPerfil:", err)
    const el = document.getElementById("contenido")
    if(el) el.innerHTML = '<div class="alerta alerta-err">Ocurrió un error al cargar el perfil. Intentá de nuevo.</div>'
  }
}

/* ── CALIFICACIÓN 1-10 (mismo sistema que buscador_cv) ── */

let _pubRating = 0

window.mostrarFormPub = function(){
  const btn = document.getElementById("btnCalPub")
  const form = document.getElementById("formRevPub")
  if(btn) btn.style.display = "none"
  if(form) form.style.display = "block"
}

window.selPub = function(n){
  _pubRating = n
  document.querySelectorAll("#rating10Pub .rating-num").forEach((el,i) => el.classList.toggle("selected", i < n))
  const col = n<=3?"#dc2626":n<=6?"#d97706":"#16a34a"
  const labels = {1:"Muy malo",2:"Malo",3:"Por debajo de lo esperado",4:"Regular",5:"Puede mejorar",6:"Aceptable",7:"Bueno",8:"Muy bueno",9:"Excelente",10:"¡Perfecto!"}
  const lbl = document.getElementById("lblRevPub")
  if(lbl) lbl.innerHTML = `<span style="color:${col};font-weight:700;">${n}/10 — ${labels[n]}</span>`
}

window.enviarRatingPub = async function(trabajadorId, nombre){
  const msg = document.getElementById("msgRevPub")
  if(!_pubRating){
    msg.innerHTML = '<div class="alerta alerta-err" style="font-size:13px;padding:8px;">Elegí un puntaje del 1 al 10</div>'
    return
  }
  const { data: authData } = await supabase.auth.getUser()
  if(!authData?.user){ msg.innerHTML = '<div class="alerta alerta-err" style="font-size:13px;padding:8px;">Debés estar logueado</div>'; return }

  msg.innerHTML = '<div style="font-size:13px;color:#64748b;"><i class="fa-solid fa-spinner fa-spin"></i> Enviando...</div>'

  const comentario = document.getElementById("comentRevPub")?.value?.trim() || ""
  const { error } = await supabase.from("reviews").insert({
    trabajador_id: trabajadorId,
    autor_id:      authData.user.id,
    rating:        _pubRating,
    comentario,
    tipo:          "servicio"
  })

  if(error){ msg.innerHTML = `<div class="alerta alerta-err" style="font-size:13px;padding:8px;">${error.message}</div>`; return }

  // Notificación al profesional
  supabase.from("notificaciones").insert({
    usuario_id: trabajadorId,
    tipo: "review",
    titulo: `¡Recibiste una calificación de ${_pubRating}/10!`,
    cuerpo: comentario ? `"${comentario.substring(0,80)}"` : "¡Alguien valoró tu perfil en Trabajos Cerca!",
    url: "/perfil.html"
  }).catch(()=>{})

  document.querySelector("#formRevPub .form-review").innerHTML =
    `<div class="alerta alerta-ok"><i class="fa-solid fa-check-circle"></i> ¡Gracias! Sumaste <strong>${_pubRating} punto${_pubRating!==1?"s":""}</strong> al perfil de ${nombre}.</div>`
}

cargarPerfil()

/* ══════════════════════════════════════════════════════
   LIGHTBOX — Popup de imágenes de trabajos realizados
══════════════════════════════════════════════════════ */
;(function(){

  const css = `
  #tc-lightbox {
    display:none; position:fixed; inset:0; z-index:9800;
    background:rgba(0,0,0,.88); align-items:center; justify-content:center;
    padding:0; box-sizing:border-box;
  }
  #tc-lightbox.abierto { display:flex; }
  #tc-lb-box {
    background:white; border-radius:20px; width:100%; max-width:520px;
    margin:16px; max-height:calc(100vh - 32px);
    display:flex; flex-direction:column; overflow:hidden;
    box-shadow:0 24px 80px rgba(0,0,0,.5);
  }
  #tc-lb-header {
    display:flex; align-items:center; justify-content:space-between;
    padding:13px 16px 11px; border-bottom:1px solid #f1f5f9; flex-shrink:0;
  }
  #tc-lb-titulo { font-size:14px; font-weight:800; color:#1e293b; flex:1; min-width:0;
    white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  #tc-lb-contador { font-size:12px; color:#94a3b8; margin:0 10px; flex-shrink:0; }
  #tc-lb-cerrar {
    background:none; border:none; font-size:22px; color:#94a3b8; cursor:pointer;
    width:32px; height:32px; display:flex; align-items:center; justify-content:center;
    border-radius:8px; flex-shrink:0; font-family:inherit; line-height:1;
  }
  #tc-lb-cerrar:hover { background:#f1f5f9; color:#1e293b; }
  #tc-lb-scroll { overflow-y:auto; flex:1; }
  #tc-lb-img-wrap {
    position:relative; background:#000; min-height:240px;
    display:flex; align-items:center; justify-content:center;
  }
  #tc-lb-img { width:100%; max-height:60vh; object-fit:contain; display:block; }
  .tc-lb-nav {
    position:absolute; top:50%; transform:translateY(-50%);
    background:rgba(255,255,255,.18); border:none; color:white;
    width:40px; height:40px; border-radius:50%; font-size:18px; cursor:pointer;
    display:flex; align-items:center; justify-content:center;
    backdrop-filter:blur(4px); transition:background .15s;
  }
  .tc-lb-nav:hover { background:rgba(255,255,255,.35); }
  #tc-lb-prev { left:10px; }
  #tc-lb-next { right:10px; }
  #tc-lb-dots {
    display:flex; justify-content:center; gap:6px; padding:10px 16px 4px; flex-shrink:0;
  }
  .tc-lb-dot {
    width:7px; height:7px; border-radius:50%; background:#e2e8f0;
    cursor:pointer; transition:background .15s; border:none; padding:0;
  }
  .tc-lb-dot.activo { background:#2563eb; transform:scale(1.2); }
  #tc-lb-cta {
    padding:18px 18px 20px; border-top:1px solid #f1f5f9; flex-shrink:0;
    background:linear-gradient(to bottom,#fff,#f8fafc);
  }
  #tc-lb-cta p {
    margin:0 0 12px; font-size:15px; font-weight:800; color:#1e293b; text-align:center;
  }
  #tc-lb-cta p span { color:#f97316; }
  #tc-lb-btns { display:flex; gap:10px; }
  #tc-lb-btns button {
    flex:1; padding:12px 10px; border-radius:12px; border:none;
    font-size:14px; font-weight:700; cursor:pointer; font-family:inherit;
    display:flex; align-items:center; justify-content:center; gap:7px;
    transition:opacity .15s;
  }
  #tc-lb-btns button:hover { opacity:.88; }
  #tc-lb-btn-compartir { background:linear-gradient(135deg,#833ab4,#fd1d1d,#fcb045); color:white; }
  #tc-lb-btn-valorar   { background:#2563eb; color:white; }
  @media(max-width:400px){
    #tc-lb-box { margin:8px; border-radius:16px; }
  }
  `
  const s = document.createElement("style")
  s.textContent = css
  document.head.appendChild(s)

  const el = document.createElement("div")
  el.id = "tc-lightbox"
  el.innerHTML = `
    <div id="tc-lb-box">
      <div id="tc-lb-header">
        <span id="tc-lb-titulo"></span>
        <span id="tc-lb-contador"></span>
        <button id="tc-lb-cerrar" onclick="window._tcCerrarLightbox()">×</button>
      </div>
      <div id="tc-lb-scroll">
        <div id="tc-lb-img-wrap">
          <img id="tc-lb-img" src="" alt="">
          <button class="tc-lb-nav" id="tc-lb-prev" onclick="window._tcLbNav(-1)">‹</button>
          <button class="tc-lb-nav" id="tc-lb-next" onclick="window._tcLbNav(1)">›</button>
        </div>
        <div id="tc-lb-dots"></div>
      </div>
      <div id="tc-lb-cta">
        <p>¿Te gustaron mis trabajos? <span>¡Valorame o compartí mi perfil!</span></p>
        <div id="tc-lb-btns">
          <button id="tc-lb-btn-compartir" onclick="window._tcLbCompartir()">
            <i class="fa-solid fa-share-nodes"></i> Compartir perfil
          </button>
          <button id="tc-lb-btn-valorar" onclick="window._tcLbValorar()">
            <i class="fa-solid fa-star"></i> Valorame
          </button>
        </div>
        <div id="tc-lb-msg-comp" style="margin-top:10px;font-size:13px;text-align:center;color:#16a34a;display:none;"></div>
      </div>
    </div>`
  document.body.appendChild(el)

  el.addEventListener("click", e => { if(e.target === el) window._tcCerrarLightbox() })

  document.addEventListener("keydown", e => {
    if(!el.classList.contains("abierto")) return
    if(e.key === "ArrowLeft")  window._tcLbNav(-1)
    if(e.key === "ArrowRight") window._tcLbNav(1)
    if(e.key === "Escape")     window._tcCerrarLightbox()
  })

  let _idx = 0

  function renderImg(){
    const imgs  = window._tcImgs || []
    const total = imgs.length
    if(!total) return
    _idx = Math.max(0, Math.min(_idx, total - 1))
    const cur = imgs[_idx]
    document.getElementById("tc-lb-img").src = cur.src
    document.getElementById("tc-lb-img").alt = cur.titulo
    document.getElementById("tc-lb-titulo").textContent = cur.titulo || "Trabajo realizado"
    document.getElementById("tc-lb-contador").textContent = `${_idx + 1} / ${total}`
    document.getElementById("tc-lb-prev").style.display = _idx > 0         ? "flex" : "none"
    document.getElementById("tc-lb-next").style.display = _idx < total - 1 ? "flex" : "none"
    const dotsEl = document.getElementById("tc-lb-dots")
    dotsEl.innerHTML = total > 1
      ? imgs.map((_, i) => `<button class="tc-lb-dot ${i===_idx?"activo":""}" onclick="window._tcLbIr(${i})"></button>`).join("")
      : ""
  }

  window._tcAbrirLightbox = function(idx){
    _idx = idx || 0
    document.getElementById("tc-lb-msg-comp").style.display = "none"
    renderImg()
    el.classList.add("abierto")
    document.body.style.overflow = "hidden"
  }

  window._tcCerrarLightbox = function(){
    el.classList.remove("abierto")
    document.body.style.overflow = ""
  }

  window._tcLbNav = function(dir){
    _idx = Math.max(0, Math.min(_idx + dir, (window._tcImgs||[]).length - 1))
    renderImg()
  }

  window._tcLbIr = function(i){ _idx = i; renderImg() }

  window._tcLbCompartir = async function(){
    const url = location.href
    const msg = document.getElementById("tc-lb-msg-comp")
    if(navigator.share){
      try { await navigator.share({ title: "Mirá estos trabajos en Trabajos Cerca", url }); return } catch(e){}
    }
    try { await navigator.clipboard.writeText(url) } catch(e){}
    msg.style.display = "block"
    msg.innerHTML = "<i class='fa-solid fa-check'></i> ¡Link copiado! Compartilo donde quieras."
    setTimeout(() => { msg.style.display = "none" }, 3000)
  }

  window._tcLbValorar = function(){
    window._tcCerrarLightbox()
    const formEl = document.getElementById("formRating")
    if(formEl){
      formEl.scrollIntoView({ behavior: "smooth", block: "center" })
      formEl.style.outline = "2.5px solid #2563eb"
      formEl.style.borderRadius = "14px"
      setTimeout(() => { formEl.style.outline = "" }, 2000)
    } else {
      const params = new URLSearchParams(location.search)
      location.href = `/login.html?next=/perfil_publico.html?id=${params.get("id")}`
    }
  }

})();

/* ══════════════════════════════════════════════════════
   CV VIEWER — popup completo con privacidad y mensajes
══════════════════════════════════════════════════════ */
;(function(){

  // Inyectar CSS una sola vez
  const css = `
  #tcCVModal {
    display:none; position:fixed; inset:0; z-index:9850;
    background:rgba(0,0,0,.7); align-items:center; justify-content:center;
    padding:16px; box-sizing:border-box;
  }
  #tcCVModal.abierto { display:flex; }
  #tcCVBox {
    background:white; border-radius:20px; width:100%; max-width:600px;
    max-height:90vh; display:flex; flex-direction:column; overflow:hidden;
    box-shadow:0 24px 60px rgba(0,0,0,.35); animation:tcCVSlide .25s ease;
  }
  @keyframes tcCVSlide { from{transform:scale(.95);opacity:0} to{transform:scale(1);opacity:1} }
  #tcCVHeader {
    padding:16px 18px 12px; border-bottom:1px solid #f1f5f9;
    display:flex; align-items:center; justify-content:space-between; flex-shrink:0;
    background:linear-gradient(135deg,#1e3a5f,#1d4ed8);
  }
  #tcCVHeader h3 { margin:0; color:white; font-size:17px; display:flex; align-items:center; gap:9px; }
  #tcCVHeader button { background:rgba(255,255,255,.2); border:none; color:white; width:32px; height:32px;
    border-radius:50%; font-size:20px; cursor:pointer; display:flex; align-items:center; justify-content:center; font-family:inherit; line-height:1; }
  #tcCVHeader button:hover { background:rgba(255,255,255,.35); }
  #tcCVScroll { overflow-y:auto; flex:1; padding:18px 18px 0; }
  #tcCVFooter { padding:14px 18px 20px; border-top:1px solid #f1f5f9; flex-shrink:0; background:#fafafa; }
  .cv-seccion { margin-bottom:18px; }
  .cv-seccion h4 { margin:0 0 8px; font-size:13px; font-weight:800; color:#64748b;
    text-transform:uppercase; letter-spacing:.5px; display:flex; align-items:center; gap:6px; }
  .cv-seccion p { margin:0; font-size:14px; color:#1e293b; line-height:1.65; }
  .cv-exp-item { border-left:3px solid #2563eb; padding:6px 0 6px 12px; margin-bottom:10px; }
  .cv-exp-item strong { font-size:14px; color:#1e293b; display:block; }
  .cv-exp-item span { font-size:12px; color:#64748b; }
  .cv-exp-item p { font-size:13px; color:#475569; margin:4px 0 0; }
  .cv-hab-tag { display:inline-block; background:#eff6ff; color:#1d4ed8; border-radius:20px;
    padding:3px 11px; font-size:12px; font-weight:600; margin:3px 4px 3px 0; }
  .cv-rubro-tag2 { display:inline-block; background:#f0fdf4; color:#15803d; border-radius:20px;
    padding:3px 11px; font-size:12px; font-weight:600; margin:3px 4px 3px 0; }
  `
  const st = document.createElement("style")
  st.textContent = css
  document.head.appendChild(st)

  // Crear estructura del modal
  const el = document.createElement("div")
  el.id = "tcCVModal"
  el.innerHTML = `
    <div id="tcCVBox">
      <div id="tcCVHeader">
        <h3><i class="fa-solid fa-file-lines"></i> <span id="tcCVNombreHeader">CV</span></h3>
        <button onclick="window._tcCerrarCV()">×</button>
      </div>
      <div id="tcCVScroll"></div>
      <div id="tcCVFooter" id="tcCVFooter"></div>
    </div>`
  document.body.appendChild(el)
  el.addEventListener("click", e => { if(e.target === el) window._tcCerrarCV() })

  window._tcCerrarCV = function(){
    el.classList.remove("abierto")
    document.body.style.overflow = ""
  }

})();

window.abrirVerCV = async function(userId, nombre, waNum, esPublico, cvArchivo){
  const modal = document.getElementById("tcCVModal")
  const scroll = document.getElementById("tcCVScroll")
  const footer = document.getElementById("tcCVFooter")
  if(!modal || !scroll || !footer) return

  document.getElementById("tcCVNombreHeader").textContent = `CV de ${decodeHTMLEntities(nombre)}`
  scroll.innerHTML = `<div style="text-align:center;padding:40px;color:#94a3b8;"><i class="fa-solid fa-spinner fa-spin" style="font-size:30px;"></i></div>`
  footer.innerHTML = ""
  modal.classList.add("abierto")
  document.body.style.overflow = "hidden"

  // Verificar usuario actual
  const { data: authData } = await supabase.auth.getUser()
  const miId = authData?.user?.id || null

  // Si es privado y no es el dueño
  if(!esPublico && miId !== userId){
    const waReq = waNum
      ? `https://wa.me/${waNum}?text=${encodeURIComponent(`Hola${nombre?" "+decodeHTMLEntities(nombre):""}! Vi tu perfil en Trabajos Cerca y me gustaría ver tu CV completo. ¿Me autorizás? 🙏\n${location.href}`)}`
      : null
    scroll.innerHTML = `
      <div style="text-align:center;padding:32px 20px;">
        <div style="font-size:54px;margin-bottom:16px;">🔒</div>
        <h3 style="margin:0 0 8px;color:#1e293b;">CV privado</h3>
        <p style="margin:0 0 18px;font-size:14px;color:#64748b;line-height:1.6;">
          Este candidato eligió que su CV sea privado.<br>
          Podés solicitar autorización directamente por WhatsApp.
        </p>
        ${waReq ? `
        <a href="${waReq}" target="_blank" rel="noopener"
          style="display:inline-flex;align-items:center;gap:8px;padding:13px 24px;background:#25D366;color:white;border-radius:12px;font-size:15px;font-weight:800;text-decoration:none;margin-bottom:8px;">
          <i class="fa-brands fa-whatsapp"></i> Solicitar acceso por WhatsApp
        </a>
        <p style="font-size:12px;color:#94a3b8;margin:8px 0 0;">Le llegará un mensaje para que autorice o rechace</p>
        ` : `<p style="color:#94a3b8;font-size:13px;">Este candidato no tiene WhatsApp visible.</p>`}
      </div>`
    footer.innerHTML = ""
    return
  }

  // CV público — traer datos completos
  let cv = null
  try {
    const res = await fetch(
      `https://iqeiszkoifxgygoqvbem.supabase.co/rest/v1/curriculum?usuario_id=eq.${userId}&select=titulo_profesional,resumen,habilidades,disponibilidad,modalidad,rubros,experiencia,educacion,cv_archivo&limit=1`,
      { headers: {
        "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxZWlzemtvaWZ4Z3lnb3F2YmVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyMTEzODIsImV4cCI6MjA5NDc4NzM4Mn0.qxt70TPbARPcMc8HhHx2A2QnfBvJLCrnrH4m36IcENs",
        "Content-Type": "application/json"
      }}
    )
    if(res.ok){ const d = await res.json(); cv = d?.[0] || null }
  } catch(e){}

  if(!cv){
    scroll.innerHTML = `<div style="text-align:center;padding:40px;color:#94a3b8;font-size:14px;">No se pudo cargar el CV.</div>`
    return
  }

  const DISP = { inmediata:"Disponibilidad inmediata", part_time:"Part-time", full_time:"Full-time", weekends:"Fines de semana", flexible:"Flexible" }
  const MOD  = { presencial:"Presencial", remoto:"Remoto", hibrido:"Híbrido" }
  const rubros = Array.isArray(cv.rubros) ? cv.rubros : []
  const habs   = cv.habilidades ? cv.habilidades.split(",").map(h=>h.trim()).filter(Boolean) : []
  const exps   = Array.isArray(cv.experiencia) ? cv.experiencia : []
  const edus   = Array.isArray(cv.educacion)   ? cv.educacion   : []

  scroll.innerHTML = `
    ${cv.titulo_profesional ? `
    <div class="cv-seccion">
      <h4><i class="fa-solid fa-briefcase"></i> Título / Profesión</h4>
      <p style="font-size:17px;font-weight:800;color:#1d4ed8;">${cv.titulo_profesional}</p>
    </div>` : ""}

    ${cv.resumen ? `
    <div class="cv-seccion">
      <h4><i class="fa-solid fa-user"></i> Presentación</h4>
      <p>${cv.resumen}</p>
    </div>` : ""}

    ${rubros.length ? `
    <div class="cv-seccion">
      <h4><i class="fa-solid fa-tags"></i> Rubros</h4>
      <div>${rubros.map(r=>`<span class="cv-rubro-tag2">${r}</span>`).join("")}</div>
    </div>` : ""}

    ${(cv.disponibilidad || cv.modalidad) ? `
    <div class="cv-seccion">
      <h4><i class="fa-solid fa-clock"></i> Disponibilidad</h4>
      <p>${[DISP[cv.disponibilidad]||cv.disponibilidad, MOD[cv.modalidad]||cv.modalidad].filter(Boolean).join(" · ")}</p>
    </div>` : ""}

    ${habs.length ? `
    <div class="cv-seccion">
      <h4><i class="fa-solid fa-star"></i> Habilidades</h4>
      <div>${habs.map(h=>`<span class="cv-hab-tag">${h}</span>`).join("")}</div>
    </div>` : ""}

    ${exps.length ? `
    <div class="cv-seccion">
      <h4><i class="fa-solid fa-building"></i> Experiencia</h4>
      ${exps.map(e=>`<div class="cv-exp-item">
        <strong>${e.puesto||e.empresa||""}</strong>
        <span>${[e.empresa, e.periodo].filter(Boolean).join(" · ")}</span>
        ${e.descripcion?`<p>${e.descripcion}</p>`:""}
      </div>`).join("")}
    </div>` : ""}

    ${edus.length ? `
    <div class="cv-seccion">
      <h4><i class="fa-solid fa-graduation-cap"></i> Educación</h4>
      ${edus.map(e=>`<div class="cv-exp-item">
        <strong>${e.titulo||e.institucion||""}</strong>
        <span>${[e.institucion, e.año||e.anio].filter(Boolean).join(" · ")}</span>
      </div>`).join("")}
    </div>` : ""}

    ${cv.cv_archivo ? `
    <div class="cv-seccion" style="border:2px dashed #bfdbfe;border-radius:12px;padding:14px;text-align:center;background:#eff6ff;">
      <p style="margin:0 0 10px;font-size:14px;color:#1e40af;font-weight:700;"><i class="fa-solid fa-paperclip"></i> CV adjunto en PDF</p>
      <a href="${cv.cv_archivo}" target="_blank" rel="noopener"
        style="display:inline-flex;align-items:center;gap:8px;padding:10px 20px;background:#1d4ed8;color:white;border-radius:10px;font-size:14px;font-weight:700;text-decoration:none;">
        <i class="fa-solid fa-file-pdf"></i> Abrir / descargar PDF
      </a>
    </div>` : ""}
    <div style="height:16px;"></div>
  `

  // Footer: contacto + mensaje privado
  const waLink = waNum
    ? `https://wa.me/${waNum}?text=${encodeURIComponent(`Hola${nombre?" "+decodeHTMLEntities(nombre):""}! Vi tu CV en Trabajos Cerca y me interesa contactarte. ¿Podemos hablar? 👋`)}`
    : null

  const puedeEnviar = miId && miId !== userId

  footer.innerHTML = `
    <div style="display:flex;gap:10px;margin-bottom:${puedeEnviar?"14px":"0"};flex-wrap:wrap;">
      ${waLink && miId ? `
      <a href="${waLink}" target="_blank" rel="noopener"
        style="flex:1;display:flex;align-items:center;justify-content:center;gap:7px;padding:12px 16px;background:#25D366;color:white;border-radius:11px;font-size:14px;font-weight:800;text-decoration:none;min-width:140px;">
        <i class="fa-brands fa-whatsapp"></i> Contactar
      </a>` : waLink ? `
      <a href="/registro.html?next=${encodeURIComponent(location.pathname+location.search)}"
        style="flex:1;display:flex;align-items:center;justify-content:center;gap:7px;padding:12px 16px;background:#16a34a;color:white;border-radius:11px;font-size:14px;font-weight:800;text-decoration:none;min-width:140px;">
        <i class="fa-solid fa-user-plus"></i> Registrate para contactar
      </a>` : ""}
      ${miId ? `<button onclick="window._tcCerrarCV();window.location.href='/mensajes.html?dest=${userId}'"
        style="flex:1;display:flex;align-items:center;justify-content:center;gap:7px;padding:12px 16px;background:#eff6ff;color:#1d4ed8;border:1.5px solid #bfdbfe;border-radius:11px;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;min-width:140px;">
        <i class="fa-solid fa-comment-dots"></i> Mensaje privado
      </button>` : ""}
    </div>

    ${puedeEnviar ? `
    <div style="background:#f8fafc;border-radius:12px;padding:14px;border:1px solid #e2e8f0;">
      <p style="margin:0 0 8px;font-size:13px;font-weight:800;color:#1e293b;">
        <i class="fa-solid fa-bullhorn" style="color:#f97316;"></i> Recomendarle una oferta de trabajo
      </p>
      <p style="margin:0 0 8px;font-size:12px;color:#64748b;">Pegá el link de una oferta que encontraste y mandáselo directamente</p>
      <textarea id="tcCVMsgTxt" rows="3" placeholder="Ej: Vi esta oferta en InfoJobs y pensé en vos: https://... ¿Te interesa?"
        style="width:100%;border:1.5px solid #e2e8f0;border-radius:8px;padding:10px;font-size:13px;resize:vertical;box-sizing:border-box;margin-bottom:8px;font-family:inherit;"></textarea>
      <div id="tcCVMsgStatus"></div>
      <button onclick="enviarMsgDesdeCV('${userId}','${displayNombreEsc||nombre}')"
        style="width:100%;padding:11px;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:white;border:none;border-radius:9px;font-size:14px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:7px;font-family:inherit;">
        <i class="fa-solid fa-paper-plane"></i> Enviar mensaje
      </button>
    </div>` : ""}
  `
}

window.enviarMsgDesdeCV = async function(destinoId, destNombre){
  const txt = document.getElementById("tcCVMsgTxt")
  const status = document.getElementById("tcCVMsgStatus")
  const texto = txt?.value?.trim()
  if(!texto){ if(status) status.innerHTML = `<div class="alerta alerta-err" style="font-size:13px;padding:8px;margin-bottom:8px;">Escribí un mensaje antes de enviar</div>`; return }
  if(status) status.innerHTML = `<div style="font-size:13px;color:#64748b;margin-bottom:8px;"><i class="fa-solid fa-spinner fa-spin"></i> Enviando...</div>`

  const { data: authData } = await supabase.auth.getUser()
  const miId = authData?.user?.id
  if(!miId){
    if(status) status.innerHTML = `<div class="alerta alerta-err" style="font-size:13px;padding:8px;margin-bottom:8px;">Iniciá sesión para enviar mensajes</div>`
    return
  }

  const SB_URL = "https://iqeiszkoifxgygoqvbem.supabase.co"
  const { data: sess } = await supabase.auth.getSession()
  const token = sess?.session?.access_token
  const hdrs = {
    "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxZWlzemtvaWZ4Z3lnb3F2YmVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyMTEzODIsImV4cCI6MjA5NDc4NzM4Mn0.qxt70TPbARPcMc8HhHx2A2QnfBvJLCrnrH4m36IcENs",
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json"
  }

  // Buscar conversación existente
  let convId = null
  try {
    const r = await fetch(`${SB_URL}/rest/v1/conversaciones?or=(and(usuario1_id.eq.${miId},usuario2_id.eq.${destinoId}),and(usuario1_id.eq.${destinoId},usuario2_id.eq.${miId}))&select=id&limit=1`, { headers: hdrs })
    if(r.ok){ const d = await r.json(); convId = d?.[0]?.id || null }
  } catch(e){}

  // Crear si no existe
  if(!convId){
    try {
      const r = await fetch(`${SB_URL}/rest/v1/conversaciones`, {
        method: "POST",
        headers: { ...hdrs, "Prefer": "return=representation" },
        body: JSON.stringify({ usuario1_id: miId, usuario2_id: destinoId, ultimo_mensaje: "", ultimo_mensaje_at: new Date().toISOString(), no_leidos_u1: 0, no_leidos_u2: 0 })
      })
      if(r.ok){ const d = await r.json(); convId = Array.isArray(d) ? d[0]?.id : d?.id }
    } catch(e){}
  }

  if(!convId){
    if(status) status.innerHTML = `<div class="alerta alerta-err" style="font-size:13px;padding:8px;margin-bottom:8px;">No se pudo crear la conversación. Intentá de nuevo.</div>`
    return
  }

  // Enviar mensaje
  const { error } = await supabase.from("mensajes").insert({ conversacion_id: convId, emisor_id: miId, texto })
  if(error){
    if(status) status.innerHTML = `<div class="alerta alerta-err" style="font-size:13px;padding:8px;margin-bottom:8px;">${error.message}</div>`
    return
  }

  // Actualizar conversación
  await supabase.from("conversaciones").update({ ultimo_mensaje: texto.substring(0,80), ultimo_mensaje_at: new Date().toISOString(), no_leidos_u2: 1 }).eq("id", convId)

  // Notificación
  supabase.from("notificaciones").insert({
    usuario_id: destinoId,
    tipo: "mensaje",
    titulo: "📩 Te recomendaron una oferta de trabajo",
    cuerpo: texto.substring(0,80),
    url: `/mensajes.html?conv=${convId}`
  }).catch(()=>{})

  if(txt) txt.value = ""
  if(status) status.innerHTML = `<div class="alerta alerta-ok" style="font-size:13px;padding:8px;margin-bottom:8px;"><i class="fa-solid fa-check-circle"></i> ¡Mensaje enviado! También podés verlo en <a href="/mensajes.html?conv=${convId}" style="font-weight:700;">Mensajes</a>.</div>`
}

/* ── Tracking de vistas ── */
async function registrarVista(profesionalId){
  const { data: authData } = await supabase.auth.getUser()
  if(authData?.user?.id === profesionalId) return
  supabase.from("perfil_eventos").insert({ profesional_id: profesionalId, tipo: "vista" }).catch(()=>{})
}

/* ── Apoyo CV ── */
window.darApoyo = function(id){
  const btn = document.getElementById("btnApoyo")
  if(!btn) return

  // Si ya apoyó (localStorage) → mostrar estado y salir
  if(localStorage.getItem(`tc_apoyo_cv_${id}`) === "1"){
    btn.innerHTML = `<i class="fa-solid fa-check"></i> Ya apoyaste este perfil`
    setTimeout(() => { btn.innerHTML = `<i class="fa-solid fa-check"></i> Apoyado` }, 2000)
    return
  }

  // ── Actualizar UI INMEDIATAMENTE (sin esperar BD) ──
  localStorage.setItem(`tc_apoyo_cv_${id}`, "1")

  btn.disabled = false
  btn.style.cssText = "background:#dcfce7;color:#15803d;border:2px solid #86efac;padding:10px 18px;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:7px;font-family:inherit;"
  btn.innerHTML = `<i class="fa-solid fa-check"></i> Apoyado`

  // Contador +1
  const numEl = document.getElementById("apoyoNum")
  if(numEl){
    const n = (parseInt(numEl.textContent) || 0) + 1
    numEl.textContent = n
    const labelEl = document.getElementById("apoyoLabel")
    if(labelEl) labelEl.textContent = `persona${n!==1?"s":""} ya apoyaron este perfil`
  }

  // Mini confetti 👏
  const conf = document.createElement("div")
  conf.style.cssText = "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);font-size:52px;z-index:9999;pointer-events:none;animation:tcPop .65s ease forwards;"
  conf.textContent = "👏"
  document.body.appendChild(conf)
  if(!document.getElementById("tcPopStyle")){
    const s = document.createElement("style")
    s.id = "tcPopStyle"
    s.textContent = "@keyframes tcPop{0%{opacity:1;transform:translate(-50%,-50%) scale(.4)}50%{opacity:1;transform:translate(-50%,-50%) scale(1.4)}100%{opacity:0;transform:translate(-50%,-90%) scale(1)}}"
    document.head.appendChild(s)
  }
  setTimeout(() => conf.remove(), 750)

  // ── Guardar en BD en segundo plano (no bloquea UI) ──
  supabase.auth.getUser().then(({ data: authData }) => {
    // Registrar evento
    supabase.from("perfil_eventos")
      .insert({ profesional_id: id, tipo: "apoyo_cv" })
      .then(()=>{}).catch(()=>{})
    // Notificar al titular del perfil
    if(authData?.user?.id){
      supabase.from("notificaciones").insert({
        usuario_id: id,
        tipo: "apoyo",
        titulo: "¡Alguien apoyó tu búsqueda laboral! 👏",
        cuerpo: "Tu perfil de CV recibió un apoyo. ¡Más gente lo está viendo!",
        url: "/perfil.html"
      }).then(()=>{}).catch(()=>{})
    }
  }).catch(()=>{}) // Si falla la auth, no importa — el localStorage ya quedó guardado
}

/* ── Copiar link CV ── */
window.copiarLinkCV = function(id){
  const url = `${location.origin}/perfil_publico.html?id=${id}`
  const btn = document.getElementById("btnCopiarCV")
  navigator.clipboard?.writeText(url).then(() => {
    if(btn){ btn.innerHTML = `<i class="fa-solid fa-check"></i> ¡Copiado!`; setTimeout(() => { btn.innerHTML = `<i class="fa-solid fa-link"></i> Copiar link` }, 2200) }
  }).catch(() => {
    if(btn){ btn.innerHTML = `<i class="fa-solid fa-link"></i> Copiar link` }
  })
}

/* ── Facebook CV ── */
window.compartirFBcv = function(id){
  const url = encodeURIComponent(`${location.origin}/perfil_publico.html?id=${id}`)
  window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, "_blank", "width=640,height=460")
}

/* ── Generar imagen para Instagram/Stories/Facebook ── */
window.generarImagenCV = function(nombre, titulo, localidad, rubros, id){
  // Crear modal
  let modal = document.getElementById("tcImgModal")
  if(!modal){
    modal = document.createElement("div")
    modal.id = "tcImgModal"
    modal.style.cssText = "display:none;position:fixed;inset:0;z-index:9900;background:rgba(0,0,0,.85);align-items:center;justify-content:center;padding:16px;box-sizing:border-box;"
    modal.innerHTML = `
      <div style="background:white;border-radius:20px;width:100%;max-width:520px;max-height:calc(100vh - 32px);overflow-y:auto;box-shadow:0 24px 80px rgba(0,0,0,.5);">
        <div style="padding:18px 20px 14px;border-bottom:1px solid #f1f5f9;display:flex;align-items:center;justify-content:space-between;">
          <div>
            <p style="margin:0;font-size:16px;font-weight:900;color:#1e293b;">📸 Imagen lista para compartir</p>
            <p style="margin:3px 0 0;font-size:12px;color:#64748b;">Perfecta para Instagram, Facebook Stories o WhatsApp</p>
          </div>
          <button onclick="document.getElementById('tcImgModal').style.display='none';document.body.style.overflow=''"
            style="background:none;border:none;font-size:24px;color:#94a3b8;cursor:pointer;padding:4px;font-family:inherit;line-height:1;">×</button>
        </div>
        <div style="padding:16px 20px;">
          <canvas id="tcImgCanvas" style="width:100%;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,.15);display:block;"></canvas>

          <div style="margin-top:14px;display:flex;gap:8px;flex-wrap:wrap;">
            <button onclick="descargarImagenCV('${nombre}')"
              style="flex:1;padding:12px;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:white;border:none;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:7px;font-family:inherit;">
              <i class="fa-solid fa-download"></i> Descargar imagen
            </button>
            <a id="tcWaImgLink" href="" target="_blank"
              style="flex:1;padding:12px;background:#25D366;color:white;border-radius:10px;font-size:14px;font-weight:700;text-decoration:none;display:flex;align-items:center;justify-content:center;gap:7px;">
              <i class="fa-brands fa-whatsapp"></i> Compartir link
            </a>
          </div>

          <div style="margin-top:14px;background:#f8fafc;border-radius:12px;padding:14px 16px;">
            <p style="margin:0 0 8px;font-weight:800;font-size:13px;color:#1e293b;">📋 Cómo publicarlo:</p>
            <ol style="margin:0;padding-left:18px;font-size:13px;color:#475569;line-height:1.8;">
              <li>Descargá la imagen con el botón de arriba</li>
              <li>Abrí Instagram o Facebook</li>
              <li>Creá una nueva publicación o Story y subí la imagen</li>
              <li>Copiá el texto de abajo y pegalo como descripción</li>
            </ol>
          </div>

          <div style="margin-top:12px;background:#eff6ff;border-radius:12px;padding:14px 16px;">
            <p style="margin:0 0 6px;font-weight:800;font-size:13px;color:#1d4ed8;">✍️ Texto para copiar y pegar:</p>
            <p id="tcCaptionText" style="margin:0;font-size:13px;color:#1e293b;line-height:1.6;white-space:pre-line;"></p>
            <button onclick="copiarCaption()" id="btnCopiarCaption"
              style="margin-top:10px;padding:8px 14px;background:#2563eb;color:white;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:6px;font-family:inherit;">
              <i class="fa-solid fa-copy"></i> Copiar texto
            </button>
          </div>
        </div>
      </div>`
    document.body.appendChild(modal)
  }

  modal.style.display = "flex"
  document.body.style.overflow = "hidden"
  modal.onclick = e => { if(e.target === modal){ modal.style.display="none"; document.body.style.overflow="" } }

  // Generar canvas
  const canvas = document.getElementById("tcImgCanvas")
  const W = 1080, H = 1080
  canvas.width = W; canvas.height = H
  const ctx = canvas.getContext("2d")

  // Fondo degradado
  const grad = ctx.createLinearGradient(0, 0, W, H)
  grad.addColorStop(0, "#0f172a")
  grad.addColorStop(0.4, "#1e3a5f")
  grad.addColorStop(1, "#14532d")
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, W, H)

  // Círculos decorativos de fondo
  ctx.save()
  ctx.globalAlpha = 0.07
  ctx.fillStyle = "#22d3ee"
  ctx.beginPath(); ctx.arc(900, 150, 320, 0, Math.PI*2); ctx.fill()
  ctx.fillStyle = "#4ade80"
  ctx.beginPath(); ctx.arc(100, 900, 280, 0, Math.PI*2); ctx.fill()
  ctx.restore()

  // Badge "BUSCANDO TRABAJO"
  const bw = 340, bh = 44
  const bx = (W - bw) / 2, by = 80
  ctx.save()
  ctx.fillStyle = "#22c55e"
  ctx.beginPath()
  ctx.roundRect(bx, by, bw, bh, 22)
  ctx.fill()
  ctx.fillStyle = "white"
  ctx.font = "bold 20px Arial, sans-serif"
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillText("🔍  BUSCANDO TRABAJO", W/2, by + bh/2)
  ctx.restore()

  // Avatar círculo
  const cx = W/2, cy = 330, r = 120
  ctx.save()
  ctx.fillStyle = "rgba(255,255,255,0.12)"
  ctx.beginPath(); ctx.arc(cx, cy, r+8, 0, Math.PI*2); ctx.fill()
  ctx.fillStyle = "#1e3a5f"
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2); ctx.fill()
  // Iniciales
  const initiales = nombre.split(" ").map(w=>w[0]||"").join("").substring(0,2).toUpperCase()
  ctx.fillStyle = "#4ade80"
  ctx.font = `bold ${r*0.72}px Arial, sans-serif`
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillText(initiales, cx, cy)
  ctx.restore()

  // Nombre
  ctx.fillStyle = "white"
  ctx.font = `bold 64px Arial, sans-serif`
  ctx.textAlign = "center"
  ctx.textBaseline = "top"
  // Ajustar tamaño si nombre largo
  const nombreDec = decodeHTMLEntities(nombre)
  let fSize = 64
  while(ctx.measureText(nombreDec).width > W - 100 && fSize > 36){ fSize -= 4; ctx.font = `bold ${fSize}px Arial, sans-serif` }
  ctx.fillText(nombreDec, W/2, 490)

  // Título profesional
  if(titulo){
    ctx.fillStyle = "#4ade80"
    ctx.font = `500 36px Arial, sans-serif`
    const tituloDec = decodeHTMLEntities(titulo)
    let tf = 36
    while(ctx.measureText(tituloDec).width > W - 120 && tf > 24){ tf -= 2; ctx.font = `500 ${tf}px Arial, sans-serif` }
    ctx.fillText(tituloDec, W/2, 490 + fSize + 14)
  }

  // Localidad
  if(localidad){
    ctx.fillStyle = "rgba(255,255,255,0.7)"
    ctx.font = `28px Arial, sans-serif`
    ctx.fillText(`📍 ${decodeHTMLEntities(localidad)}`, W/2, 490 + fSize + 14 + (titulo ? 50 : 0) + 10)
  }

  // Rubros como tags
  if(rubros){
    const tagsArr = rubros.split("·").map(t=>t.trim()).filter(Boolean)
    let tx = 0
    const tagH = 48, gap = 12
    // Calcular ancho total para centrar
    ctx.font = "bold 22px Arial, sans-serif"
    const widths = tagsArr.map(t => ctx.measureText(t).width + 40)
    const totalW = widths.reduce((a,b)=>a+b,0) + gap*(tagsArr.length-1)
    let startX = Math.max(40, (W - Math.min(totalW, W-80)) / 2)
    const tagY = 760

    tagsArr.forEach((tag, i) => {
      const tw = widths[i]
      if(startX + tw > W - 40){ return } // skip if too wide
      ctx.save()
      ctx.fillStyle = "rgba(255,255,255,0.13)"
      ctx.beginPath(); ctx.roundRect(startX, tagY, tw, tagH, tagH/2); ctx.fill()
      ctx.fillStyle = "rgba(255,255,255,0.85)"
      ctx.font = "bold 22px Arial, sans-serif"
      ctx.textBaseline = "middle"
      ctx.textAlign = "left"
      ctx.fillText(tag, startX + 20, tagY + tagH/2)
      ctx.restore()
      startX += tw + gap
    })
  }

  // Separador
  ctx.strokeStyle = "rgba(255,255,255,0.15)"
  ctx.lineWidth = 2
  ctx.beginPath(); ctx.moveTo(80, 850); ctx.lineTo(W-80, 850); ctx.stroke()

  // Branding
  ctx.fillStyle = "rgba(255,255,255,0.5)"
  ctx.font = "bold 26px Arial, sans-serif"
  ctx.textAlign = "center"
  ctx.textBaseline = "top"
  ctx.fillText("trabajoscerca.com.ar", W/2, 870)

  ctx.fillStyle = "rgba(255,255,255,0.35)"
  ctx.font = "22px Arial, sans-serif"
  ctx.fillText("¡Compartilo y ayudalo a conseguir trabajo! 💪", W/2, 908)

  // URL perfil
  ctx.fillStyle = "#4ade80"
  ctx.font = "bold 20px Arial, sans-serif"
  ctx.fillText(`trabajoscerca.com.ar/perfil_publico.html?id=${id}`, W/2, 960)

  // Caption text
  const caption = `👤 ${decodeHTMLEntities(nombre)}${titulo ? `\n💼 ${decodeHTMLEntities(titulo)}` : ""}${localidad ? `\n📍 ${decodeHTMLEntities(localidad)}` : ""}\n\n🔍 Está buscando trabajo y puede ser exactamente lo que necesitás.\n\n💪 Compartilo para ayudarlo a encontrar oportunidades.\n\n👉 ${location.origin}/perfil_publico.html?id=${id}\n\n#trabajo #empleo #buscandotrabajo #trabajoscerca${localidad ? " #"+decodeHTMLEntities(localidad).replace(/\s/g,"") : ""}`
  const captionEl = document.getElementById("tcCaptionText")
  if(captionEl) captionEl.textContent = caption
  window._tcCurrentCaption = caption

  // WA link
  const waImgLink = document.getElementById("tcWaImgLink")
  if(waImgLink){
    const url = `${location.origin}/perfil_publico.html?id=${id}`
    const msg = encodeURIComponent(`👤 Conocé a ${decodeHTMLEntities(nombre)}${titulo?" - "+decodeHTMLEntities(titulo):""}${localidad?" en "+decodeHTMLEntities(localidad):""}\n🔍 Está buscando trabajo en Trabajos Cerca.\n¡Compartilo para ayudarlo! 👇\n${url}`)
    waImgLink.href = `https://wa.me/?text=${msg}`
  }
}

function decodeHTMLEntities(str){
  if(!str) return ""
  try {
    const el = document.createElement("div")
    el.innerHTML = str
    return el.textContent || el.innerText || str
  } catch(e){ return str }
}

window.descargarImagenCV = function(nombre){
  const canvas = document.getElementById("tcImgCanvas")
  if(!canvas) return
  const link = document.createElement("a")
  link.download = `cv-${(nombre||"perfil").replace(/[^a-z0-9]/gi,"-").toLowerCase()}.png`
  link.href = canvas.toDataURL("image/png")
  link.click()
}

window.copiarCaption = function(){
  const text = window._tcCurrentCaption || ""
  const btn = document.getElementById("btnCopiarCaption")
  navigator.clipboard?.writeText(text).then(() => {
    if(btn){ btn.innerHTML = `<i class="fa-solid fa-check"></i> ¡Copiado!`; setTimeout(() => { btn.innerHTML = `<i class="fa-solid fa-copy"></i> Copiar texto` }, 2200) }
  })
}

/* ── Compartir perfil ── */
window.compartirPerfil = function(id){
  const url = `${location.origin}/perfil_publico.html?id=${id}`
  navigator.clipboard?.writeText(url).then(() => {
    const btn = document.getElementById("btnCompartir")
    if(btn){ btn.innerHTML = `<i class="fa-solid fa-check"></i> ¡Copiado!`; setTimeout(() => { btn.innerHTML = `<i class="fa-solid fa-link"></i> Copiar link` }, 2000) }
  })
}
window.compartirWA = function(nombre, id){
  const url = `${location.origin}/perfil_publico.html?id=${id}`
  window.open(`https://wa.me/?text=${encodeURIComponent(`Mirá el perfil de ${nombre} en Trabajos Cerca: ${url}`)}`, "_blank")
}
window.compartirFB = function(id){
  const url = encodeURIComponent(`${location.origin}/perfil_publico.html?id=${id}`)
  window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, "_blank", "width=600,height=400")
}
window.compartirX = function(nombre, id){
  const url = `${location.origin}/perfil_publico.html?id=${id}`
  const txt = encodeURIComponent(`Mirá el perfil de ${nombre} en Trabajos Cerca 💼`)
  window.open(`https://twitter.com/intent/tweet?text=${txt}&url=${encodeURIComponent(url)}`, "_blank", "width=600,height=400")
}
