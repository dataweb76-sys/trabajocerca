/* buscador_cv.js — CVs de trabajadores con sistema de reseñas */

const SB_URL = "https://iqeiszkoifxgygoqvbem.supabase.co"
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxZWlzemtvaWZ4Z3lnb3F2YmVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyMTEzODIsImV4cCI6MjA5NDc4NzM4Mn0.qxt70TPbARPcMc8HhHx2A2QnfBvJLCrnrH4m36IcENs"
const SB_HEADERS = { "apikey": SB_KEY, "Authorization": `Bearer ${SB_KEY}` }

const DISP = { inmediata:"Disponibilidad inmediata", "15_dias":"En 15 días", "30_dias":"En 30 días", a_consultar:"A consultar" }
const MOD  = { presencial:"Presencial", remoto:"Remoto", hibrido:"Híbrido", indiferente:"Indiferente" }

let estrellaCV  = 0
let _miNombreCV = null

/* ── AUTH ── */
function getAccessToken(){
  try { return JSON.parse(localStorage.getItem("sb-iqeiszkoifxgygoqvbem-auth-token"))?.access_token || null } catch(e){ return null }
}
function getCurrentUserId(){
  const t = getAccessToken(); if(!t) return null
  try { return JSON.parse(atob(t.split(".")[1])).sub || null } catch(e){ return null }
}

async function getMiNombreCV(){
  if(_miNombreCV !== null) return _miNombreCV
  const uid = getCurrentUserId(); if(!uid){ _miNombreCV=""; return "" }
  try {
    const res = await fetch(`${SB_URL}/rest/v1/perfiles?id=eq.${uid}&select=nombre`,{ headers: SB_HEADERS })
    if(res.ok){ const d=await res.json(); _miNombreCV=d?.[0]?.nombre||"" }
  } catch(e){ _miNombreCV="" }
  return _miNombreCV
}

function waLinkCV(movil, destNombre){
  const num=(movil||"").replace(/\D/g,""); if(!num) return null
  let msg="Hola"
  if(_miNombreCV) msg+=`, me llamo ${_miNombreCV}`
  msg+=`! Me comunico con vos porque vi tu perfil`
  if(destNombre) msg+=` de ${destNombre}`
  msg+=` en Trabajos Cerca. 👋`
  return `https://wa.me/${num}?text=${encodeURIComponent(msg)}`
}

/* ── STARS ── */
function starsHTML(avg, count, size=14){
  const r = Math.round(avg||0)
  const s = [1,2,3,4,5].map(i=>`<i class="fa-solid fa-star" style="color:${i<=r?"#f59e0b":"#d1d5db"};font-size:${size}px;"></i>`).join("")
  const c = count!==undefined ? `<span style="font-size:12px;color:#64748b;margin-left:4px;">${avg>0?avg.toFixed(1)+" ":""}<span style="opacity:.7;">(${count})</span></span>` : ""
  return `<span style="display:inline-flex;align-items:center;gap:2px;">${s}</span>${c}`
}

/* ── MODAL ── */
let modalCV = null

function abrirModalCV(item, profileId, nombre){
  const p = item.perfiles || item
  const wa = waLinkCV(p.movil, `${p.nombre||""} ${p.apellido||""}`.trim())
  const habs = item.habilidades
    ? item.habilidades.split(",").map(h=>`<span class="servicio-tag">${h.trim()}</span>`).join("")
    : ""

  const foto = p.foto
    ? `<img src="${p.foto}" style="width:90px;height:90px;border-radius:50%;object-fit:cover;border:3px solid #16a34a;">`
    : `<div style="width:90px;height:90px;border-radius:50%;background:#dcfce7;display:flex;align-items:center;justify-content:center;font-size:36px;color:#16a34a;"><i class="fa-solid fa-user"></i></div>`

  document.getElementById("cvModalContent").innerHTML = `
    <div style="text-align:center;margin-bottom:18px;">
      ${foto}
      <h2 style="margin:10px 0 4px;font-size:21px;">${p.nombre||""} ${p.apellido||""}</h2>
      <p style="margin:0;color:#16a34a;font-weight:700;font-size:15px;">${item.titulo_profesional||""}</p>
      <p style="margin:4px 0 0;color:#64748b;font-size:13px;"><i class="fa-solid fa-location-dot"></i> ${p.localidad||""}${p.provincia?", "+p.provincia:""}</p>
      ${item.disponibilidad?`<p style="margin:4px 0 0;font-size:12px;color:#2563eb;"><i class="fa-solid fa-clock"></i> ${DISP[item.disponibilidad]||item.disponibilidad} · ${MOD[item.modalidad]||item.modalidad}</p>`:""}
      <div style="margin-top:8px;" id="cvModalStarsTop"></div>
    </div>

    ${item.resumen?`<div style="margin-bottom:14px;background:#f8fafc;border-radius:8px;padding:12px 14px;">
      <p style="font-size:13px;font-weight:600;color:#475569;margin:0 0 4px;">Presentación</p>
      <p style="font-size:13px;color:#475569;line-height:1.6;margin:0;">${item.resumen}</p>
    </div>`:""}

    ${habs?`<div style="margin-bottom:14px;">
      <p style="font-size:13px;font-weight:600;color:#475569;margin:0 0 6px;">Habilidades</p>
      <div class="servicios-tags">${habs}</div>
    </div>`:""}

    ${wa?`<a href="${wa}" target="_blank" rel="noopener" class="btn-whatsapp" style="display:flex;justify-content:center;margin-bottom:12px;">
      <i class="fa-brands fa-whatsapp"></i> Contactar por WhatsApp
    </a>`:""}

    ${item.cv_archivo?`<a href="${item.cv_archivo}" target="_blank" rel="noopener"
      class="btn btn-outline" style="display:flex;justify-content:center;align-items:center;gap:8px;margin-bottom:16px;">
      <i class="fa-solid fa-file-lines"></i> Ver CV completo
    </a>`:""}

    <hr style="margin:16px 0;border:none;border-top:1px solid #e2e8f0;">
    <div id="cvReviewsSection">
      <div style="text-align:center;color:#94a3b8;padding:10px;"><i class="fa-solid fa-spinner fa-spin"></i></div>
    </div>
  `

  document.getElementById("cvModalOverlay").classList.add("activo")
  document.body.style.overflow = "hidden"
  if(profileId) cargarReviewsCV(profileId, nombre)
}

window.cerrarModalCV2 = function(){
  document.getElementById("cvModalOverlay").classList.remove("activo")
  document.body.style.overflow = ""
}
window.cerrarModalCVClick2 = function(e){
  if(e.target === document.getElementById("cvModalOverlay")) cerrarModalCV2()
}
document.addEventListener("keydown", e => { if(e.key==="Escape") cerrarModalCV2() })

/* ── REVIEWS CV ── */

async function cargarReviewsCV(profileId, nombre){
  const sec = document.getElementById("cvReviewsSection"); if(!sec) return
  let reviews = []
  try {
    const res = await fetch(`${SB_URL}/rest/v1/reviews?trabajador_id=eq.${profileId}&tipo=neq.cliente&select=id,rating,comentario,autor_id&order=created_at.desc`, { headers: SB_HEADERS })
    if(res.ok) reviews = await res.json()
  } catch(e){}

  const puntosTotal = reviews.reduce((a,b)=>a+b.rating,0)
  const count = reviews.length
  const uid = getCurrentUserId(), yaCal = uid && reviews.some(r=>r.autor_id===uid), esSí = uid===profileId

  const topEl = document.getElementById("cvModalStarsTop")
  if(topEl && count>0) topEl.innerHTML = `<span class="puntos-badge"><i class="fa-solid fa-trophy" style="font-size:11px;"></i> ${puntosTotal} pts</span>`

  let html = `<h3 style="margin:0 0 10px;font-size:16px;color:#1e293b;"><i class="fa-solid fa-trophy" style="color:#f59e0b;"></i> Puntaje y calificaciones</h3>`

  if(count>0){
    html += `<div class="puntos-total-box">
      <div class="puntos-total-num">${puntosTotal}</div>
      <div class="puntos-total-label">puntos acumulados · ${count} calificación${count!==1?"es":""}</div>
    </div>`
    reviews.slice(0,5).forEach(rev => {
      const col = rev.rating<=3?"#dc2626":rev.rating<=6?"#d97706":"#16a34a"
      html += `<div class="review-item" style="margin-bottom:8px;">
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="background:${col};color:white;font-weight:800;font-size:13px;padding:2px 9px;border-radius:20px;">${rev.rating}/10</span>
          ${rev.comentario?`<span style="font-size:13px;color:#475569;font-style:italic;">"${rev.comentario}"</span>`:""}
        </div></div>`
    })
  } else {
    html += `<p style="font-size:13px;color:#94a3b8;text-align:center;margin-bottom:14px;">Sin calificaciones aún — ¡sé el primero!</p>`
  }

  if(uid && !esSí && !yaCal){
    estrellaCV = 0
    html += `<button class="btn-calificar" id="btnCalCV" onclick="mostrarFormCV()">
      <i class="fa-solid fa-star"></i> Calificar a ${nombre}
    </button>
    <div id="formRevCV" style="display:none;">
      <div class="form-review" style="margin-top:0;">
        <h4 style="margin:0 0 6px;"><i class="fa-solid fa-pen"></i> Tu calificación</h4>
        <p style="font-size:11px;color:#94a3b8;margin:0 0 8px;">1 = Muy malo · 10 = Excelente</p>
        <div class="rating-10" id="rating10CV">
          ${[1,2,3,4,5,6,7,8,9,10].map(i=>`<button class="rating-num ${i<=3?"r-bad":i<=6?"r-ok":"r-good"}" onclick="selRevCV(${i})">${i}</button>`).join("")}
        </div>
        <div id="lblRevCV" style="font-size:13px;min-height:20px;margin-bottom:8px;"></div>
        <textarea id="comentRevCV" rows="3" placeholder="Contá tu experiencia (opcional)"
          style="width:100%;border:1px solid #bfdbfe;border-radius:8px;padding:10px;font-size:13px;resize:vertical;box-sizing:border-box;margin-bottom:10px;font-family:inherit;"></textarea>
        <div id="msgRevCV"></div>
        <button class="btn btn-primary btn-sm" onclick="enviarRevCV('${profileId}','${nombre}')">
          <i class="fa-solid fa-paper-plane"></i> Enviar calificación
        </button>
      </div>
    </div>`
  } else if(!uid){
    html += `<div style="background:#eff6ff;border-radius:10px;padding:14px;text-align:center;">
      <p style="margin:0 0 8px;font-size:14px;color:#1e40af;"><i class="fa-solid fa-trophy" style="color:#f59e0b;"></i> <strong>¿Contrataste a esta persona?</strong></p>
      <p style="margin:0 0 10px;font-size:13px;color:#475569;">Iniciá sesión y dejá tu calificación — cada punto suma.</p>
      <a href="/login.html" class="btn btn-primary btn-sm" style="text-decoration:none;"><i class="fa-solid fa-right-to-bracket"></i> Iniciá sesión</a>
    </div>`
  } else if(yaCal){
    html += `<p style="font-size:13px;color:#16a34a;text-align:center;margin-top:10px;"><i class="fa-solid fa-check-circle"></i> Ya calificaste a esta persona — ¡gracias!</p>`
  }
  sec.innerHTML = html
}

window.mostrarFormCV = function(){
  document.getElementById("btnCalCV").style.display="none"
  document.getElementById("formRevCV").style.display="block"
}

window.selRevCV = function(n){
  estrellaCV = n
  document.querySelectorAll("#rating10CV .rating-num").forEach((el,i)=>el.classList.toggle("selected",i<n))
  const col = n<=3?"#dc2626":n<=6?"#d97706":"#16a34a"
  const labels={1:"Muy malo",2:"Malo",3:"Por debajo de lo esperado",4:"Regular",5:"Puede mejorar",6:"Aceptable",7:"Bueno",8:"Muy bueno",9:"Excelente",10:"¡Perfecto!"}
  const lbl=document.getElementById("lblRevCV"); if(lbl) lbl.innerHTML=`<span style="color:${col};font-weight:700;">${n}/10 — ${labels[n]}</span>`
}

window.enviarRevCV = async function(profileId, nombre){
  const msg = document.getElementById("msgRevCV")
  if(!estrellaCV){ msg.innerHTML=`<div class="alerta alerta-err" style="font-size:13px;padding:8px;">Elegí un puntaje del 1 al 10</div>`; return }
  const token=getAccessToken(), autorId=getCurrentUserId()
  if(!token){ msg.innerHTML=`<div class="alerta alerta-err" style="font-size:13px;padding:8px;">Iniciá sesión primero</div>`; return }
  msg.innerHTML=`<div style="font-size:13px;color:#64748b;"><i class="fa-solid fa-spinner fa-spin"></i> Enviando...</div>`
  try {
    const res = await fetch(`${SB_URL}/rest/v1/reviews`, {
      method:"POST",
      headers:{...SB_HEADERS,"Authorization":`Bearer ${token}`,"Content-Type":"application/json","Prefer":"return=minimal"},
      body: JSON.stringify({ trabajador_id:profileId, autor_id:autorId, rating:estrellaCV, comentario:document.getElementById("comentRevCV").value.trim(), tipo:"servicio" })
    })
    if(!res.ok){ const e=await res.json(); throw new Error(e.message||"Error") }
    document.querySelector(".form-review").innerHTML=`<div class="alerta alerta-ok"><i class="fa-solid fa-check-circle"></i> ¡Gracias! Sumaste <strong>${estrellaCV} punto${estrellaCV!==1?"s":""}</strong> al perfil de ${nombre}.</div>`
    setTimeout(()=>cargarReviewsCV(profileId, nombre), 900)
  } catch(e){ msg.innerHTML=`<div class="alerta alerta-err" style="font-size:13px;padding:8px;">${e.message}</div>` }
}

/* ── BUSCAR ── */

window.buscar = async function(){
  const palabra = document.getElementById("buscar").value.trim()
  const ciudad  = document.getElementById("ciudad").value.trim()
  const cont    = document.getElementById("resultados")

  cont.innerHTML = `<div style="text-align:center;padding:40px;color:#64748b;">
    <i class="fa-solid fa-spinner fa-spin" style="font-size:28px;"></i><p>Buscando...</p></div>`

  const select = "id,titulo_profesional,resumen,habilidades,disponibilidad,modalidad,cv_archivo,perfiles!usuario_id(id,nombre,apellido,movil,foto,localidad,provincia,tipo)"
  let url = `${SB_URL}/rest/v1/curriculum?select=${encodeURIComponent(select)}&cv_publico=eq.true&order=created_at.desc`
  if(palabra){ const p=encodeURIComponent(`*${palabra}*`); url+=`&or=(titulo_profesional.ilike.${p},habilidades.ilike.${p},resumen.ilike.${p})` }

  let data
  try {
    const res = await fetch(url, { headers: SB_HEADERS })
    if(!res.ok){ const e=await res.json(); throw new Error(e.message||res.statusText) }
    data = await res.json()
  } catch(e){
    cont.innerHTML=`<div class="alerta alerta-err">Error: ${e.message}</div>`; return
  }

  // Solo mostrar quienes activaron el buscador de CVs (tipo contiene "cv")
  data = data.filter(item => (item.perfiles?.tipo || "").split(",").map(t=>t.trim()).includes("cv"))

  if(ciudad){
    const c = ciudad.toLowerCase()
    data = data.filter(item => { const pf=item.perfiles||{}; return (pf.localidad||"").toLowerCase().includes(c)||(pf.provincia||"").toLowerCase().includes(c) })
  }

  if(!data?.length){
    cont.innerHTML=`<div style="text-align:center;padding:50px 20px;color:#64748b;">
      <i class="fa-solid fa-face-sad-tear" style="font-size:44px;opacity:.3;display:block;margin-bottom:14px;"></i>
      <p style="font-size:16px;margin-bottom:8px;">No encontramos CVs.</p>
      <p><a href="/registro.html?tipo=trabajador">¿Buscás trabajo? Subí tu CV gratis</a></p></div>`
    return
  }

  await getMiNombreCV()

  // Ratings en paralelo
  const pids = data.map(d=>d.perfiles?.id).filter(Boolean)
  let ratingsMap = {}
  if(pids.length){
    try {
      const rRes = await fetch(`${SB_URL}/rest/v1/reviews?trabajador_id=in.(${pids.join(",")})&tipo=neq.cliente&select=trabajador_id,rating`, { headers: SB_HEADERS })
      if(rRes.ok){
        const revs = await rRes.json()
        revs.forEach(r=>{ if(!ratingsMap[r.trabajador_id]) ratingsMap[r.trabajador_id]=[]; ratingsMap[r.trabajador_id].push(r.rating) })
      }
    } catch(e){}
  }

  // Merge y sort por rating
  data.forEach(item => {
    const pid = item.perfiles?.id
    const ratings = pid ? (ratingsMap[pid]||[]) : []
    item._avgRating = ratings.length ? ratings.reduce((a,b)=>a+b,0)/ratings.length : 0
    item._ratingCount = ratings.length
  })
  data.sort((a,b) => b._avgRating - a._avgRating)

  const bannerCal = `<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:12px 16px;margin-bottom:18px;display:flex;align-items:center;gap:10px;">
    <i class="fa-solid fa-star" style="color:#f59e0b;font-size:20px;flex-shrink:0;"></i>
    <p style="margin:0;font-size:13px;color:#92400e;">
      <strong>¿Contrataste a alguien?</strong> Calificalo — ayudás a otros empleadores a elegir mejor y al trabajador a conseguir más oportunidades.
    </p>
  </div>`

  cont.innerHTML = bannerCal + `<p style="color:#64748b;margin-bottom:16px;font-size:14px;">${data.length} CV${data.length!==1?"s":""} encontrado${data.length!==1?"s":""} · ordenados por calificación</p>`

  data.forEach(item => {
    const p = item.perfiles||{}, pid = p.id||""
    const wa = waLinkCV(p.movil, `${p.nombre||""} ${p.apellido||""}`.trim())
    const habs = item.habilidades ? item.habilidades.split(",").slice(0,4).map(h=>`<span style="background:#f1f5f9;border-radius:20px;padding:2px 9px;font-size:11px;color:#475569;display:inline-block;margin:2px;">${h.trim()}</span>`).join("") : ""

    const foto = p.foto
      ? `<img src="${p.foto}" style="width:70px;height:70px;border-radius:50%;object-fit:cover;border:2px solid #16a34a;flex-shrink:0;">`
      : `<div style="width:70px;height:70px;border-radius:50%;background:#dcfce7;display:flex;align-items:center;justify-content:center;font-size:26px;color:#16a34a;flex-shrink:0;"><i class="fa-solid fa-user"></i></div>`

    const r = Math.round(item._avgRating)
    const starsCard = item._ratingCount > 0
      ? `${[1,2,3,4,5].map(i=>`<i class="fa-solid fa-star${i<=r?" lit":""}"></i>`).join("")}<span>${item._avgRating.toFixed(1)} (${item._ratingCount})</span>`
      : `<i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><span style="color:#94a3b8;font-size:12px;">Sin calificaciones aún</span>`

    const card = document.createElement("div")
    card.className = "card"
    card.style.cssText = "cursor:pointer;transition:box-shadow .2s,transform .2s;"
    card.onmouseenter = () => { card.style.boxShadow="0 6px 20px rgba(0,0,0,.13)"; card.style.transform="translateY(-2px)" }
    card.onmouseleave = () => { card.style.boxShadow=""; card.style.transform="" }
    card.onclick = () => abrirModalCV(item, pid, `${p.nombre||""} ${p.apellido||""}`.trim())

    card.innerHTML = `
      <div style="display:flex;gap:14px;align-items:flex-start;">
        ${foto}
        <div style="flex:1;min-width:0;">
          <h3 style="margin:0 0 3px;font-size:17px;">${p.nombre||""} ${p.apellido||""}</h3>
          <p style="margin:0 0 2px;color:#16a34a;font-weight:700;font-size:14px;">${item.titulo_profesional||"Sin título"}</p>
          <div class="card-stars">${starsCard}</div>
          <p style="margin:4px 0 0;font-size:13px;color:#64748b;"><i class="fa-solid fa-location-dot"></i> ${p.localidad||""}${p.provincia?", "+p.provincia:""}</p>
          ${item.disponibilidad?`<p style="margin:2px 0 0;font-size:12px;color:#2563eb;"><i class="fa-solid fa-clock"></i> ${DISP[item.disponibilidad]||item.disponibilidad}</p>`:""}
          ${habs?`<div style="margin-top:5px;">${habs}</div>`:""}
          ${item.cv_archivo
            ? `<p style="margin:4px 0 0;font-size:12px;color:#16a34a;font-weight:700;"><i class="fa-solid fa-file-lines"></i> CV adjunto</p>`
            : `<p style="margin:4px 0 0;font-size:12px;color:#94a3b8;"><i class="fa-solid fa-file-lines"></i> Sin CV adjunto</p>`}
        </div>
      </div>
      <div class="card-actions" style="margin-top:14px;">
        <button class="btn btn-outline btn-sm" onclick="event.stopPropagation();this.closest('.card').click()">
          <i class="fa-solid fa-eye"></i> Ver perfil
        </button>
        ${item.cv_archivo
          ? `<a href="${item.cv_archivo}" target="_blank" rel="noopener" onclick="event.stopPropagation()"
              class="btn btn-sm" style="background:#16a34a;color:white;display:inline-flex;align-items:center;gap:6px;text-decoration:none;">
              <i class="fa-solid fa-file-lines"></i> Ver CV</a>`
          : `<button class="btn btn-sm" disabled
              style="background:#f1f5f9;color:#94a3b8;cursor:not-allowed;display:inline-flex;align-items:center;gap:6px;border:1px solid #e2e8f0;"
              title="Este candidato no adjuntó su CV">
              <i class="fa-solid fa-file-lines"></i> Sin CV</button>`}
        ${wa?`<a href="${wa}" target="_blank" rel="noopener" onclick="event.stopPropagation()"
          class="btn btn-sm" style="background:#25D366;color:white;display:inline-flex;align-items:center;gap:6px;text-decoration:none;">
          <i class="fa-brands fa-whatsapp"></i> WhatsApp</a>`:""}
      </div>`

    cont.appendChild(card)
  })
}

/* buscar() se llama desde verificarAccesoEmpresa() solo si el usuario es empresa */
window._cvBuscarDisponible = true
