/* buscador_trabajos.js — muestra perfiles de empleadores */

const SB_URL = "https://iqeiszkoifxgygoqvbem.supabase.co"
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxZWlzemtvaWZ4Z3lnb3F2YmVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyMTEzODIsImV4cCI6MjA5NDc4NzM4Mn0.qxt70TPbARPcMc8HhHx2A2QnfBvJLCrnrH4m36IcENs"
const SB_HEADERS = { "apikey": SB_KEY, "Authorization": `Bearer ${SB_KEY}` }

window.buscar = async function(){
  const ciudad = document.getElementById("ciudad").value.trim()
  const cont   = document.getElementById("resultados")

  cont.innerHTML = `
    <div style="text-align:center;padding:40px;color:#64748b;">
      <i class="fa-solid fa-spinner fa-spin" style="font-size:28px;"></i><p>Buscando...</p>
    </div>`

  let url = `${SB_URL}/rest/v1/perfiles?tipo=eq.empleador&select=id,nombre,apellido,foto,localidad,provincia,movil,email&order=created_at.desc`

  if(ciudad){
    url += `&localidad=ilike.*${encodeURIComponent(ciudad)}*`
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

  if(!data?.length){
    cont.innerHTML = `
      <div style="text-align:center;padding:50px 20px;color:#64748b;">
        <i class="fa-solid fa-face-sad-tear" style="font-size:44px;opacity:0.3;display:block;margin-bottom:14px;"></i>
        <p style="font-size:16px;margin-bottom:8px;">No hay empleadores registrados en esta zona aún.</p>
        <p><a href="/registro.html?tipo=empleador">¿Buscás personal? Publicá tu perfil gratis</a></p>
      </div>`
    return
  }

  cont.innerHTML = `<p style="color:#64748b;margin-bottom:16px;font-size:14px;">${data.length} empleador${data.length!==1?"es":""} encontrado${data.length!==1?"s":""}</p>`

  data.forEach(p => {
    const foto = p.foto
      ? `<img src="${p.foto}" style="width:70px;height:70px;border-radius:50%;object-fit:cover;border:2px solid #2563eb;flex-shrink:0;">`
      : `<div style="width:70px;height:70px;border-radius:50%;background:#dbeafe;display:flex;align-items:center;justify-content:center;font-size:26px;color:#2563eb;flex-shrink:0;"><i class="fa-solid fa-building"></i></div>`

    const wa = p.movil ? `https://wa.me/${p.movil.replace(/\D/g,"")}` : null

    const card = document.createElement("div")
    card.className = "card"
    card.innerHTML = `
      <div style="display:flex;gap:14px;align-items:flex-start;">
        ${foto}
        <div style="flex:1;min-width:0;">
          <h3 style="margin:0 0 3px;font-size:17px;">${p.nombre||""} ${p.apellido||""}</h3>
          <p style="margin:0 0 4px;color:#2563eb;font-weight:700;font-size:14px;">
            <i class="fa-solid fa-building"></i> Busca personal
          </p>
          <p style="margin:0;font-size:13px;color:#64748b;">
            <i class="fa-solid fa-location-dot"></i>
            ${p.localidad||""}${p.provincia?", "+p.provincia:""}
          </p>
        </div>
      </div>
      <div class="card-actions" style="margin-top:14px;">
        ${wa?`<a href="${wa}" target="_blank" rel="noopener"
          class="btn btn-sm" style="background:#25D366;color:white;display:inline-flex;align-items:center;gap:6px;">
          <i class="fa-brands fa-whatsapp"></i> WhatsApp</a>`:""}
        ${p.email?`<a href="mailto:${p.email}" class="btn btn-outline btn-sm">
          <i class="fa-solid fa-envelope"></i> Email</a>`:""}
      </div>`

    cont.appendChild(card)
  })
}

buscar()
