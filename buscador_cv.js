/* buscador_cv.js — muestra curricula de trabajadores */

const SB_URL = "https://iqeiszkoifxgygoqvbem.supabase.co"
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxZWlzemtvaWZ4Z3lnb3F2YmVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyMTEzODIsImV4cCI6MjA5NDc4NzM4Mn0.qxt70TPbARPcMc8HhHx2A2QnfBvJLCrnrH4m36IcENs"
const SB_HEADERS = { "apikey": SB_KEY, "Authorization": `Bearer ${SB_KEY}` }

const DISP = { inmediata: "Disponibilidad inmediata", "15_dias": "En 15 días", "30_dias": "En 30 días", a_consultar: "A consultar" }
const MOD  = { presencial: "Presencial", remoto: "Remoto", hibrido: "Híbrido", indiferente: "Indiferente" }

window.buscar = async function(){
  const palabra = document.getElementById("buscar").value.trim()
  const ciudad  = document.getElementById("ciudad").value.trim()
  const cont    = document.getElementById("resultados")

  cont.innerHTML = `
    <div style="text-align:center;padding:40px;color:#64748b;">
      <i class="fa-solid fa-spinner fa-spin" style="font-size:28px;"></i><p>Buscando...</p>
    </div>`

  const select = "id,titulo_profesional,resumen,habilidades,disponibilidad,modalidad,cv_archivo,perfiles!usuario_id(id,nombre,apellido,movil,foto,localidad,provincia)"

  let url = `${SB_URL}/rest/v1/curriculum?select=${encodeURIComponent(select)}&order=created_at.desc`

  if(palabra){
    const p = encodeURIComponent(`*${palabra}*`)
    url += `&or=(titulo_profesional.ilike.${p},habilidades.ilike.${p},resumen.ilike.${p})`
  }

  let data
  try {
    const res = await fetch(url, { headers: SB_HEADERS })
    if(!res.ok){ const err = await res.json(); throw new Error(err.message || res.statusText) }
    data = await res.json()
  } catch(e){
    cont.innerHTML = `<div class="alerta alerta-err">Error al buscar: ${e.message}</div>`
    return
  }

  // Filtro de ciudad client-side (columna en tabla relacionada)
  if(ciudad){
    const c = ciudad.toLowerCase()
    data = data.filter(item => {
      const pf = item.perfiles || {}
      return (pf.localidad||"").toLowerCase().includes(c) || (pf.provincia||"").toLowerCase().includes(c)
    })
  }

  if(!data?.length){
    cont.innerHTML = `
      <div style="text-align:center;padding:50px 20px;color:#64748b;">
        <i class="fa-solid fa-face-sad-tear" style="font-size:44px;opacity:0.3;display:block;margin-bottom:14px;"></i>
        <p style="font-size:16px;margin-bottom:8px;">No encontramos CVs con esos criterios.</p>
        <p><a href="/registro.html?tipo=trabajador">¿Buscás trabajo? Subí tu CV gratis</a></p>
      </div>`
    return
  }

  cont.innerHTML = `<p style="color:#64748b;margin-bottom:16px;font-size:14px;">${data.length} CV${data.length!==1?"s":""} encontrado${data.length!==1?"s":""}</p>`

  data.forEach(item => {
    const p = item.perfiles || {}

    const foto = p.foto
      ? `<img src="${p.foto}" style="width:70px;height:70px;border-radius:50%;object-fit:cover;border:2px solid #16a34a;flex-shrink:0;">`
      : `<div style="width:70px;height:70px;border-radius:50%;background:#dcfce7;display:flex;align-items:center;justify-content:center;font-size:26px;color:#16a34a;flex-shrink:0;"><i class="fa-solid fa-user"></i></div>`

    const wa = p.movil ? `https://wa.me/${p.movil.replace(/\D/g,"")}` : null

    const habs = item.habilidades
      ? item.habilidades.split(",").slice(0,5).map(h =>
          `<span style="background:#f1f5f9;border-radius:20px;padding:2px 9px;font-size:11px;color:#475569;display:inline-block;margin:2px;">${h.trim()}</span>`
        ).join("")
      : ""

    const card = document.createElement("div")
    card.className = "card"
    card.innerHTML = `
      <div style="display:flex;gap:14px;align-items:flex-start;">
        ${foto}
        <div style="flex:1;min-width:0;">
          <h3 style="margin:0 0 3px;font-size:17px;">${p.nombre||""} ${p.apellido||""}</h3>
          <p style="margin:0 0 4px;color:#16a34a;font-weight:700;font-size:14px;">${item.titulo_profesional||"Sin título profesional"}</p>
          <p style="margin:0 0 4px;font-size:13px;color:#64748b;">
            <i class="fa-solid fa-location-dot"></i>
            ${p.localidad||""}${p.provincia?", "+p.provincia:""}
          </p>
          ${item.disponibilidad?`<p style="margin:0;font-size:12px;color:#2563eb;">
            <i class="fa-solid fa-clock"></i> ${DISP[item.disponibilidad]||item.disponibilidad}
            &nbsp;·&nbsp; ${MOD[item.modalidad]||item.modalidad}
          </p>`:""}
          ${habs?`<div style="margin-top:6px;">${habs}</div>`:""}
        </div>
      </div>
      ${item.resumen?`<p style="margin:12px 0 0;font-size:13px;color:#475569;line-height:1.6;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${item.resumen}</p>`:""}
      <div class="card-actions" style="margin-top:14px;">
        ${wa?`<a href="${wa}" target="_blank" rel="noopener"
          class="btn btn-sm" style="background:#25D366;color:white;display:inline-flex;align-items:center;gap:6px;">
          <i class="fa-brands fa-whatsapp"></i> WhatsApp</a>`:""}
        ${item.cv_archivo?`<a href="${item.cv_archivo}" target="_blank" rel="noopener" class="btn btn-outline btn-sm">
          <i class="fa-solid fa-file-lines"></i> Ver CV</a>`:""}
      </div>`

    cont.appendChild(card)
  })
}

buscar()
