/* buscador_trabajos.js — empleadores con sistema de reseñas */

const SB_URL = "https://iqeiszkoifxgygoqvbem.supabase.co"
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxZWlzemtvaWZ4Z3lnb3F2YmVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyMTEzODIsImV4cCI6MjA5NDc4NzM4Mn0.qxt70TPbARPcMc8HhHx2A2QnfBvJLCrnrH4m36IcENs"
const SB_HEADERS = { "apikey": SB_KEY, "Authorization": `Bearer ${SB_KEY}` }

let estrellaEmp = 0

/* ── AUTH ── */
function getAccessToken(){
  try { return JSON.parse(localStorage.getItem("sb-iqeiszkoifxgygoqvbem-auth-token"))?.access_token||null } catch(e){ return null }
}
function getCurrentUserId(){
  const t=getAccessToken(); if(!t) return null
  try { return JSON.parse(atob(t.split(".")[1])).sub||null } catch(e){ return null }
}

/* ── MODAL ── */
function abrirModalEmp(p){
  const wa = p.movil ? `https://wa.me/${p.movil.replace(/\D/g,"")}` : null
  const foto = p.foto
    ? `<img src="${p.foto}" style="width:90px;height:90px;border-radius:50%;object-fit:cover;border:3px solid #2563eb;">`
    : `<div style="width:90px;height:90px;border-radius:50%;background:#dbeafe;display:flex;align-items:center;justify-content:center;font-size:36px;color:#2563eb;"><i class="fa-solid fa-building"></i></div>`

  document.getElementById("empModalContent").innerHTML = `
    <div style="text-align:center;margin-bottom:18px;">
      ${foto}
      <h2 style="margin:10px 0 4px;font-size:21px;">${p.nombre||""} ${p.apellido||""}</h2>
      <p style="margin:0;color:#2563eb;font-weight:700;font-size:15px;"><i class="fa-solid fa-building"></i> Busca personal</p>
      <p style="margin:4px 0 0;color:#64748b;font-size:13px;"><i class="fa-solid fa-location-dot"></i> ${p.localidad||""}${p.provincia?", "+p.provincia:""}</p>
      <div style="margin-top:8px;" id="empModalStarsTop"></div>
    </div>

    ${wa?`<a href="${wa}" target="_blank" rel="noopener" class="btn-whatsapp" style="display:flex;justify-content:center;margin-bottom:12px;">
      <i class="fa-brands fa-whatsapp"></i> Contactar por WhatsApp
    </a>`:""}
    ${p.email?`<a href="mailto:${p.email}" class="btn btn-outline" style="display:flex;justify-content:center;align-items:center;gap:8px;margin-bottom:16px;">
      <i class="fa-solid fa-envelope"></i> Enviar email
    </a>`:""}

    <hr style="margin:16px 0;border:none;border-top:1px solid #e2e8f0;">
    <div id="empReviewsSection">
      <div style="text-align:center;color:#94a3b8;padding:10px;"><i class="fa-solid fa-spinner fa-spin"></i></div>
    </div>
  `

  document.getElementById("empModalOverlay").classList.add("activo")
  document.body.style.overflow = "hidden"
  if(p.id) cargarReviewsEmp(p.id, `${p.nombre||""} ${p.apellido||""}`.trim())
}

window.cerrarModalEmp = function(){
  document.getElementById("empModalOverlay").classList.remove("activo")
  document.body.style.overflow = ""
}
window.cerrarModalEmpClick = function(e){
  if(e.target===document.getElementById("empModalOverlay")) cerrarModalEmp()
}
document.addEventListener("keydown", e => { if(e.key==="Escape") cerrarModalEmp() })

/* ── REVIEWS ── */
async function cargarReviewsEmp(profileId, nombre){
  const sec = document.getElementById("empReviewsSection"); if(!sec) return
  let reviews = []
  try {
    const res = await fetch(`${SB_URL}/rest/v1/reviews?trabajador_id=eq.${profileId}&tipo=neq.cliente&select=id,rating,comentario,autor_id&order=created_at.desc`, { headers: SB_HEADERS })
    if(res.ok) reviews = await res.json()
  } catch(e){}

  const count=reviews.length, avg=count?reviews.reduce((a,b)=>a+b.rating,0)/count:0
  const uid=getCurrentUserId(), yaCal=uid&&reviews.some(r=>r.autor_id===uid), esSí=uid===profileId

  const topEl = document.getElementById("empModalStarsTop")
  if(topEl&&count>0){
    const r=Math.round(avg)
    topEl.innerHTML=`<span style="display:inline-flex;align-items:center;gap:3px;">${[1,2,3,4,5].map(i=>`<i class="fa-solid fa-star" style="color:${i<=r?"#f59e0b":"#d1d5db"};font-size:15px;"></i>`).join("")}</span>
      <span style="font-size:12px;color:#64748b;margin-left:5px;">${avg.toFixed(1)} (${count})</span>`
  }

  const puntosTotal = reviews.reduce((a,b)=>a+b.rating,0)

  const topEl=document.getElementById("empModalStarsTop")
  if(topEl&&count>0) topEl.innerHTML=`<span class="puntos-badge"><i class="fa-solid fa-trophy" style="font-size:11px;"></i> ${puntosTotal} pts</span>`

  let html=`<h3 style="margin:0 0 10px;font-size:16px;color:#1e293b;"><i class="fa-solid fa-trophy" style="color:#f59e0b;"></i> Puntaje y calificaciones</h3>`

  if(count>0){
    html+=`<div class="puntos-total-box">
      <div class="puntos-total-num">${puntosTotal}</div>
      <div class="puntos-total-label">puntos acumulados · ${count} calificación${count!==1?"es":""}</div>
    </div>`
    reviews.slice(0,5).forEach(rev=>{
      const col=rev.rating<=3?"#dc2626":rev.rating<=6?"#d97706":"#16a34a"
      html+=`<div class="review-item" style="margin-bottom:8px;">
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="background:${col};color:white;font-weight:800;font-size:13px;padding:2px 9px;border-radius:20px;">${rev.rating}/10</span>
          ${rev.comentario?`<span style="font-size:13px;color:#475569;font-style:italic;">"${rev.comentario}"</span>`:""}
        </div></div>`
    })
  } else {
    html+=`<p style="font-size:13px;color:#94a3b8;text-align:center;margin-bottom:14px;">Sin calificaciones aún — ¡sé el primero!</p>`
  }

  if(uid&&!esSí&&!yaCal){
    estrellaEmp=0
    html+=`<button class="btn-calificar" id="btnCalEmp" onclick="mostrarFormEmp()">
      <i class="fa-solid fa-star"></i> Calificar a ${nombre}
    </button>
    <div id="formRevEmp" style="display:none;">
      <div class="form-review" style="margin-top:0;">
        <h4 style="margin:0 0 6px;"><i class="fa-solid fa-pen"></i> Tu calificación</h4>
        <p style="font-size:11px;color:#94a3b8;margin:0 0 8px;">1 = Muy malo · 10 = Excelente</p>
        <div class="rating-10" id="rating10Emp">
          ${[1,2,3,4,5,6,7,8,9,10].map(i=>`<button class="rating-num ${i<=3?"r-bad":i<=6?"r-ok":"r-good"}" onclick="selRevEmp(${i})">${i}</button>`).join("")}
        </div>
        <div id="lblRevEmp" style="font-size:13px;min-height:20px;margin-bottom:8px;"></div>
        <textarea id="comentRevEmp" rows="3" placeholder="¿Buen trato, pagó en término, buen ambiente? (opcional)"
          style="width:100%;border:1px solid #bfdbfe;border-radius:8px;padding:10px;font-size:13px;resize:vertical;box-sizing:border-box;margin-bottom:10px;font-family:inherit;"></textarea>
        <div id="msgRevEmp"></div>
        <button class="btn btn-primary btn-sm" onclick="enviarRevEmp('${profileId}','${nombre}')">
          <i class="fa-solid fa-paper-plane"></i> Enviar calificación
        </button>
      </div>
    </div>`
  } else if(!uid){
    html+=`<div style="background:#eff6ff;border-radius:10px;padding:14px;text-align:center;">
      <p style="margin:0 0 8px;font-size:14px;color:#1e40af;"><i class="fa-solid fa-trophy" style="color:#f59e0b;"></i> <strong>¿Trabajaste para esta empresa?</strong></p>
      <p style="margin:0 0 10px;font-size:13px;color:#475569;">Iniciá sesión y calificala — cada punto suma.</p>
      <a href="/login.html" class="btn btn-primary btn-sm" style="text-decoration:none;"><i class="fa-solid fa-right-to-bracket"></i> Iniciá sesión</a>
    </div>`
  } else if(yaCal){
    html+=`<p style="font-size:13px;color:#16a34a;text-align:center;margin-top:10px;"><i class="fa-solid fa-check-circle"></i> Ya calificaste — ¡gracias!</p>`
  }
  sec.innerHTML=html
}

window.mostrarFormEmp = function(){
  document.getElementById("btnCalEmp").style.display="none"
  document.getElementById("formRevEmp").style.display="block"
}

const LABELS_EMP={1:"Muy malo",2:"Malo",3:"Por debajo de lo esperado",4:"Regular",5:"Puede mejorar",6:"Aceptable",7:"Bueno",8:"Muy bueno",9:"Excelente",10:"¡Perfecto!"}
window.selRevEmp = function(n){
  estrellaEmp=n
  document.querySelectorAll("#rating10Emp .rating-num").forEach((el,i)=>el.classList.toggle("selected",i<n))
  const col=n<=3?"#dc2626":n<=6?"#d97706":"#16a34a"
  const lbl=document.getElementById("lblRevEmp"); if(lbl) lbl.innerHTML=`<span style="color:${col};font-weight:700;">${n}/10 — ${LABELS_EMP[n]}</span>`
}

window.enviarRevEmp = async function(profileId, nombre){
  const msg=document.getElementById("msgRevEmp")
  if(!estrellaEmp){ msg.innerHTML=`<div class="alerta alerta-err" style="font-size:13px;padding:8px;">Elegí un puntaje del 1 al 10</div>`; return }
  const token=getAccessToken(), autorId=getCurrentUserId()
  if(!token){ msg.innerHTML=`<div class="alerta alerta-err" style="font-size:13px;padding:8px;">Iniciá sesión primero</div>`; return }
  msg.innerHTML=`<div style="font-size:13px;color:#64748b;"><i class="fa-solid fa-spinner fa-spin"></i> Enviando...</div>`
  try {
    const res=await fetch(`${SB_URL}/rest/v1/reviews`,{
      method:"POST",
      headers:{...SB_HEADERS,"Authorization":`Bearer ${token}`,"Content-Type":"application/json","Prefer":"return=minimal"},
      body:JSON.stringify({ trabajador_id:profileId, autor_id:autorId, rating:estrellaEmp, comentario:document.getElementById("comentRevEmp").value.trim(), tipo:"servicio" })
    })
    if(!res.ok){ const e=await res.json(); throw new Error(e.message||"Error") }
    document.querySelector(".form-review").innerHTML=`<div class="alerta alerta-ok"><i class="fa-solid fa-check-circle"></i> ¡Gracias! Sumaste <strong>${estrellaEmp} punto${estrellaEmp!==1?"s":""}</strong> al perfil de ${nombre}.</div>`
    setTimeout(()=>cargarReviewsEmp(profileId, nombre), 900)
  } catch(e){ msg.innerHTML=`<div class="alerta alerta-err" style="font-size:13px;padding:8px;">${e.message}</div>` }
}

/* ── BUSCAR ── */

window.buscar = async function(){
  const ciudad = document.getElementById("ciudad").value.trim()
  const cont   = document.getElementById("resultados")

  cont.innerHTML = `<div style="text-align:center;padding:40px;color:#64748b;">
    <i class="fa-solid fa-spinner fa-spin" style="font-size:28px;"></i><p>Buscando...</p></div>`

  let url = `${SB_URL}/rest/v1/perfiles?tipo=eq.empleador&select=id,nombre,apellido,foto,localidad,provincia,movil,email&order=created_at.desc`
  if(ciudad) url += `&localidad=ilike.*${encodeURIComponent(ciudad)}*`

  let data
  try {
    const res=await fetch(url,{headers:SB_HEADERS})
    if(!res.ok){ const e=await res.json(); throw new Error(e.message||res.statusText) }
    data=await res.json()
  } catch(e){ cont.innerHTML=`<div class="alerta alerta-err">Error: ${e.message}</div>`; return }

  if(!data?.length){
    cont.innerHTML=`<div style="text-align:center;padding:50px 20px;color:#64748b;">
      <i class="fa-solid fa-face-sad-tear" style="font-size:44px;opacity:.3;display:block;margin-bottom:14px;"></i>
      <p style="font-size:16px;margin-bottom:8px;">No hay empleadores registrados en esta zona.</p>
      <p><a href="/registro.html?tipo=empleador">¿Buscás personal? Registrate gratis</a></p></div>`
    return
  }

  // Ratings en paralelo
  const pids = data.map(p=>p.id).filter(Boolean)
  let ratingsMap = {}
  if(pids.length){
    try {
      const rRes = await fetch(`${SB_URL}/rest/v1/reviews?trabajador_id=in.(${pids.join(",")})&tipo=neq.cliente&select=trabajador_id,rating`,{headers:SB_HEADERS})
      if(rRes.ok){
        const revs = await rRes.json()
        revs.forEach(r=>{ if(!ratingsMap[r.trabajador_id]) ratingsMap[r.trabajador_id]=[]; ratingsMap[r.trabajador_id].push(r.rating) })
      }
    } catch(e){}
  }

  // Merge y sort por rating
  data.forEach(p => {
    const ratings = ratingsMap[p.id] || []
    p._avgRating = ratings.length ? ratings.reduce((a,b)=>a+b,0)/ratings.length : 0
    p._ratingCount = ratings.length
  })
  data.sort((a,b) => b._avgRating - a._avgRating)

  const bannerCal = `<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:12px 16px;margin-bottom:18px;display:flex;align-items:center;gap:10px;">
    <i class="fa-solid fa-star" style="color:#f59e0b;font-size:20px;flex-shrink:0;"></i>
    <p style="margin:0;font-size:13px;color:#92400e;">
      <strong>¿Trabajaste para alguna de estas empresas o personas?</strong> Dejá tu calificación — ayudás a otros trabajadores a elegir dónde postularse.
    </p>
  </div>`

  cont.innerHTML = bannerCal + `<p style="color:#64748b;margin-bottom:16px;font-size:14px;">${data.length} empleador${data.length!==1?"es":""} encontrado${data.length!==1?"s":""} · ordenados por calificación</p>`

  data.forEach(p => {
    const wa = p.movil ? `https://wa.me/${p.movil.replace(/\D/g,"")}` : null
    const foto = p.foto
      ? `<img src="${p.foto}" style="width:70px;height:70px;border-radius:50%;object-fit:cover;border:2px solid #2563eb;flex-shrink:0;">`
      : `<div style="width:70px;height:70px;border-radius:50%;background:#dbeafe;display:flex;align-items:center;justify-content:center;font-size:26px;color:#2563eb;flex-shrink:0;"><i class="fa-solid fa-building"></i></div>`

    const r = Math.round(p._avgRating)
    const starsCard = p._ratingCount > 0
      ? `${[1,2,3,4,5].map(i=>`<i class="fa-solid fa-star${i<=r?" lit":""}"></i>`).join("")}<span>${p._avgRating.toFixed(1)} (${p._ratingCount})</span>`
      : `<i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><span style="color:#94a3b8;font-size:12px;">Sin calificaciones aún</span>`

    const card = document.createElement("div")
    card.className = "card"
    card.style.cssText = "cursor:pointer;transition:box-shadow .2s,transform .2s;"
    card.onmouseenter = () => { card.style.boxShadow="0 6px 20px rgba(0,0,0,.13)"; card.style.transform="translateY(-2px)" }
    card.onmouseleave = () => { card.style.boxShadow=""; card.style.transform="" }
    card.onclick = () => abrirModalEmp(p)

    card.innerHTML = `
      <div style="display:flex;gap:14px;align-items:flex-start;">
        ${foto}
        <div style="flex:1;min-width:0;">
          <h3 style="margin:0 0 3px;font-size:17px;">${p.nombre||""} ${p.apellido||""}</h3>
          <p style="margin:0 0 2px;color:#2563eb;font-weight:700;font-size:14px;"><i class="fa-solid fa-building"></i> Busca personal</p>
          <div class="card-stars">${starsCard}</div>
          <p style="margin:4px 0 0;font-size:13px;color:#64748b;"><i class="fa-solid fa-location-dot"></i> ${p.localidad||""}${p.provincia?", "+p.provincia:""}</p>
        </div>
      </div>
      <div class="card-actions" style="margin-top:14px;">
        <button class="btn btn-outline btn-sm" onclick="event.stopPropagation();abrirModalEmp(${JSON.stringify(p).replace(/"/g,"&quot;")})">
          <i class="fa-solid fa-eye"></i> Ver perfil
        </button>
        ${wa?`<a href="${wa}" target="_blank" rel="noopener" onclick="event.stopPropagation()"
          class="btn btn-sm" style="background:#25D366;color:white;display:inline-flex;align-items:center;gap:6px;">
          <i class="fa-brands fa-whatsapp"></i> WhatsApp</a>`:""}
      </div>`

    cont.appendChild(card)
  })
}

buscar()
