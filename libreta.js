/* ══════════════════════════════════════════════
   LIBRETA DE CLIENTES — Trabajos Cerca
══════════════════════════════════════════════ */

import { supabase as _supabase } from './supabase.js'

let userId = null
let clientes = []
let clienteActual = null
let trabajosActuales = []

const ESTADOS = {
  consulta:      { label: '🔵 Consulta',      cls: 'e-consulta',      dot: 'dot-consulta' },
  presupuestado: { label: '🟡 Presupuestado', cls: 'e-presupuestado', dot: 'dot-presupuestado' },
  en_curso:      { label: '🟠 En curso',       cls: 'e-en_curso',      dot: 'dot-en_curso' },
  terminado:     { label: '✅ Terminado',      cls: 'e-terminado',     dot: 'dot-terminado' },
  cobrado:       { label: '💰 Cobrado',        cls: 'e-cobrado',       dot: 'dot-cobrado' },
}

/* ── Init ── */
;(async () => {
  const { data: { session } } = await _supabase.auth.getSession()
  if(!session) { location.href = '/login.html'; return }
  userId = session.user.id

  // Cargar nombre del profesional para los mensajes de invitación
  const { data: prof } = await _supabase.from('perfiles').select('nombre,apellido').eq('id', userId).single()
  window._profNombre = prof ? `${prof.nombre || ''} ${prof.apellido || ''}`.trim() : 'Un profesional'

  await cargarClientes()
})()

/* ══ CLIENTES ══ */

async function cargarClientes() {
  const { data, error } = await _supabase
    .from('libreta_clientes')
    .select('*')
    .eq('profesional_id', userId)
    .order('created_at', { ascending: false })

  if(error) { console.error(error); return }
  clientes = data || []
  document.getElementById('contadorClientes').textContent = `(${clientes.length})`
  renderListaClientes(clientes)
  actualizarResumenTop()
}

function renderListaClientes(lista) {
  const el = document.getElementById('listaClientes')
  if(!lista.length) {
    el.innerHTML = `
      <div class="empty-state">
        <div class="icon">👥</div>
        <p style="font-weight:700;color:#475569;margin-bottom:6px;">Todavía no tenés clientes</p>
        <p>Agregá tu primer cliente con el botón <strong>+ Agregar</strong></p>
      </div>`
    return
  }

  el.innerHTML = lista.map(c => {
    const inicial = (c.nombre || '?')[0].toUpperCase()
    const trabajosC = trabajosActuales.filter(t => t.cliente_id === c.id)
    const pendCobro = trabajosC.filter(t => t.estado === 'terminado').reduce((s,t) => s+(t.monto||0), 0)
    const activos   = trabajosC.filter(t => ['en_curso','presupuestado'].includes(t.estado)).length
    const cobrados  = trabajosC.filter(t => t.estado === 'cobrado').length

    const badge = pendCobro > 0
      ? `<span class="cliente-badge" style="background:#fef2f2;color:#dc2626;">💸 $${Number(pendCobro).toLocaleString('es-AR')}</span>`
      : activos > 0
        ? `<span class="cliente-badge badge-activo">${activos} en curso</span>`
        : cobrados > 0
          ? `<span class="cliente-badge badge-cobrado">✓ cobrado</span>`
          : `<span class="cliente-badge badge-consulta">${trabajosC.length} trabajo${trabajosC.length!==1?'s':''}</span>`

    const activo = clienteActual?.id === c.id ? 'activo' : ''
    return `
      <div class="cliente-item ${activo}" onclick="window.abrirCliente('${c.id}')">
        <div class="cliente-avatar">${inicial}</div>
        <div class="cliente-info">
          <div class="cliente-nombre">${c.nombre} ${c.apellido || ''}</div>
          <div class="cliente-sub">${c.telefono ? '📱 '+c.telefono : c.email || 'Sin contacto'}</div>
        </div>
        ${badge}
      </div>`
  }).join('')
}

window.filtrarClientes = function(q) {
  const txt = q.toLowerCase()
  const filtrados = clientes.filter(c =>
    (c.nombre + ' ' + (c.apellido||'')).toLowerCase().includes(txt) ||
    (c.telefono||'').includes(txt) ||
    (c.email||'').toLowerCase().includes(txt)
  )
  renderListaClientes(filtrados)
}

window.abrirCliente = async function(id) {
  clienteActual = clientes.find(c => c.id === id)
  if(!clienteActual) return

  // Marcar activo en lista
  document.querySelectorAll('.cliente-item').forEach(el => el.classList.remove('activo'))
  const items = document.querySelectorAll('.cliente-item')
  items.forEach(el => { if(el.getAttribute('onclick')?.includes(id)) el.classList.add('activo') })

  // Mobile: mostrar detalle y ocultar lista
  document.getElementById('panelLista').classList.toggle('oculto', window.innerWidth <= 680)
  const panelDetalle = document.getElementById('panelDetalle')
  panelDetalle.classList.add('activo')
  panelDetalle.innerHTML = `<div style="padding:40px;text-align:center;color:#94a3b8;"><i class="fa-solid fa-spinner fa-spin fa-2x"></i></div>`

  // Cargar trabajos
  const { data: trabajos } = await _supabase
    .from('libreta_trabajos')
    .select('*')
    .eq('cliente_id', id)
    .order('created_at', { ascending: false })

  trabajosActuales = trabajos || []
  renderDetalle()
  renderListaClientes(clientes)
}

function renderDetalle() {
  const c = clienteActual
  const trabajos = trabajosActuales

  const totalCobrado   = trabajos.filter(t => t.estado === 'cobrado').reduce((s,t) => s+(t.monto||0), 0)
  const pendienteCobro = trabajos.filter(t => t.estado === 'terminado').reduce((s,t) => s+(t.monto||0), 0)
  const enCurso        = trabajos.filter(t => ['en_curso','presupuestado'].includes(t.estado)).length

  // WhatsApp links
  const telLimpio = c.telefono ? c.telefono.replace(/\D/g,'').replace(/^0/,'').replace(/^15/,'') : null
  const waBase = telLimpio ? `https://wa.me/549${telLimpio}` : null

  // Mensaje de invitación personalizado
  const linkRegistro = `https://trabajoscerca.com.ar/registro.html?ref=${userId}`
  const msgInvitacion = encodeURIComponent(
    `Hola ${c.nombre}! 👋 Te escribo de Trabajos Cerca.\n\n` +
    `Usamos la plataforma para llevar el registro de tus trabajos y tengas todo en un lugar: presupuestos, estado de cada trabajo y más.\n\n` +
    `Registrate gratis acá 👇\n${linkRegistro}\n\n` +
    `Es gratis y te aviso cuando haya novedades.`
  )
  const waInvitacion = waBase ? `${waBase}?text=${msgInvitacion}` : null

  // Mensaje de cobro pendiente
  const msgCobro = pendienteCobro > 0 && waBase
    ? encodeURIComponent(`Hola ${c.nombre}! Te recuerdo que tenés un saldo pendiente de $${Number(pendienteCobro).toLocaleString('es-AR')} por los trabajos realizados. Cualquier consulta estoy a disposición. 🙏`)
    : null
  const waCobro = msgCobro && waBase ? `${waBase}?text=${msgCobro}` : null

  // Alerta deuda
  const alertaDeuda = pendienteCobro > 0
    ? `<div style="background:#fef2f2;border:1.5px solid #fecaca;border-radius:12px;padding:14px 16px;margin-bottom:0;display:flex;align-items:center;gap:12px;">
        <div style="font-size:28px;">💸</div>
        <div style="flex:1;">
          <div style="font-size:15px;font-weight:800;color:#dc2626;">Pendiente de cobro</div>
          <div style="font-size:22px;font-weight:900;color:#dc2626;">$${Number(pendienteCobro).toLocaleString('es-AR')}</div>
        </div>
        ${waCobro ? `<a href="${waCobro}" target="_blank" style="display:inline-flex;align-items:center;gap:6px;background:#25d366;color:white;font-weight:700;font-size:13px;padding:9px 14px;border-radius:10px;text-decoration:none;white-space:nowrap;flex-shrink:0;"><i class="fa-brands fa-whatsapp"></i> Recordar</a>` : ''}
      </div>`
    : ''

  const trabajosHtml = trabajos.length ? trabajos.map(t => `
    <div class="trabajo-card" id="tc-${t.id}">
      <div class="trabajo-estado-dot ${ESTADOS[t.estado]?.dot || 'dot-consulta'}"></div>
      <div class="trabajo-body">
        <div class="trabajo-desc">${t.descripcion}</div>
        <div class="trabajo-meta">
          <span class="estado-pill ${ESTADOS[t.estado]?.cls || 'e-consulta'}">${ESTADOS[t.estado]?.label || t.estado}</span>
          ${t.monto ? `<span class="trabajo-monto">$${Number(t.monto).toLocaleString('es-AR')}</span>` : ''}
          ${t.categoria ? `<span class="trabajo-fecha">• ${t.categoria}</span>` : ''}
          ${t.fecha_inicio ? `<span class="trabajo-fecha">📅 ${formatFecha(t.fecha_inicio)}</span>` : ''}
          ${t.fecha_fin ? `<span class="trabajo-fecha">→ ${formatFecha(t.fecha_fin)}</span>` : ''}
        </div>
        ${t.notas ? `<div style="font-size:12px;color:#64748b;margin-top:5px;font-style:italic;">${t.notas}</div>` : ''}
        <div class="trabajo-acciones">
          ${avanzarEstadoBtn(t)}
          <button class="btn-estado" onclick="window.editarTrabajo('${t.id}')"><i class="fa-solid fa-pen"></i> Editar</button>
          <button class="btn-estado btn-eliminar-t" onclick="window.eliminarTrabajo('${t.id}')"><i class="fa-solid fa-trash"></i></button>
        </div>
      </div>
    </div>`).join('')
  : `<div class="empty-state"><div class="icon">🔧</div><p>Sin trabajos registrados todavía.<br>Tocá <strong>+ Trabajo</strong> para agregar el primero.</p></div>`

  document.getElementById('panelDetalle').innerHTML = `
    <button class="btn-volver" onclick="window.volverLista()"><i class="fa-solid fa-arrow-left"></i> Volver</button>

    <div class="detalle-header">
      <div class="detalle-nombre">${c.nombre} ${c.apellido || ''}</div>
      <div class="detalle-contacto">
        ${c.telefono ? `<span><i class="fa-solid fa-phone"></i> ${c.telefono}</span>` : ''}
        ${c.email    ? `<span><i class="fa-solid fa-envelope"></i> ${c.email}</span>` : ''}
      </div>
      <div class="detalle-acciones">
        ${waBase ? `<a href="${waBase}" target="_blank" class="btn-accion" style="background:#25d366;color:white;"><i class="fa-brands fa-whatsapp"></i> WhatsApp</a>` : ''}
        ${waInvitacion ? `<a href="${waInvitacion}" target="_blank" class="btn-accion" style="background:#16a34a;color:white;" title="Invitarlo a Trabajos Cerca"><i class="fa-solid fa-user-plus"></i> Invitar a TC</a>` : `<button class="btn-accion" style="background:rgba(255,255,255,.15);color:white;" onclick="window.invitarCliente('${c.id}')"><i class="fa-solid fa-user-plus"></i> Invitar a TC</button>`}
        <button class="btn-accion" style="background:rgba(255,255,255,.1);color:white;" onclick="window.editarCliente('${c.id}')"><i class="fa-solid fa-pen"></i> Editar</button>
        <button class="btn-accion" style="background:rgba(239,68,68,.25);color:#fca5a5;" onclick="window.eliminarCliente('${c.id}')"><i class="fa-solid fa-trash"></i></button>
      </div>
    </div>

    <div class="stats-cliente">
      <div class="stat-item">
        <div class="stat-num">${trabajos.length}</div>
        <div class="stat-lbl">Trabajos</div>
      </div>
      <div class="stat-item">
        <div class="stat-num" style="color:#f97316;">${enCurso}</div>
        <div class="stat-lbl">En curso</div>
      </div>
      <div class="stat-item">
        <div class="stat-num" style="color:#16a34a;">$${totalCobrado ? Number(totalCobrado).toLocaleString('es-AR') : '0'}</div>
        <div class="stat-lbl">Cobrado</div>
      </div>
    </div>

    ${alertaDeuda ? `<div style="padding:14px 16px;border-bottom:1px solid #f1f5f9;">${alertaDeuda}</div>` : ''}
    ${c.notas ? `<div class="notas-cliente"><p><i class="fa-solid fa-note-sticky" style="color:#f59e0b;"></i> ${c.notas}</p></div>` : ''}

    <div class="trabajos-header">
      <h3><i class="fa-solid fa-list-check" style="color:#2563eb;"></i> Historial de trabajos</h3>
      <button class="btn-add-trabajo" onclick="window.abrirModalTrabajo()"><i class="fa-solid fa-plus"></i> Trabajo</button>
    </div>
    ${trabajosHtml}
  `
}

function avanzarEstadoBtn(t) {
  const orden = ['consulta','presupuestado','en_curso','terminado','cobrado']
  const idx = orden.indexOf(t.estado)
  if(idx >= orden.length - 1) return ''
  const sig = orden[idx + 1]
  return `<button class="btn-estado" style="background:#eff6ff;color:#2563eb;border-color:#bfdbfe;" onclick="window.cambiarEstado('${t.id}','${sig}')">→ ${ESTADOS[sig].label}</button>`
}

window.cambiarEstado = async function(trabajoId, nuevoEstado) {
  await _supabase.from('libreta_trabajos').update({ estado: nuevoEstado }).eq('id', trabajoId)
  const t = trabajosActuales.find(x => x.id === trabajoId)
  if(t) t.estado = nuevoEstado
  renderDetalle()
  renderListaClientes(clientes)
  actualizarResumenTop()
}

/* ══ MODAL CLIENTE ══ */

window.abrirModalCliente = function() {
  document.getElementById('tituloModalCliente').textContent = 'Agregar cliente'
  document.getElementById('clienteEditId').value = ''
  document.getElementById('cNombre').value = ''
  document.getElementById('cApellido').value = ''
  document.getElementById('cTelefono').value = ''
  document.getElementById('cEmail').value = ''
  document.getElementById('cNotas').value = ''
  document.getElementById('modalCliente').classList.add('open')
  document.getElementById('cNombre').focus()
}

window.editarCliente = function(id) {
  const c = clientes.find(x => x.id === id)
  if(!c) return
  document.getElementById('tituloModalCliente').textContent = 'Editar cliente'
  document.getElementById('clienteEditId').value = c.id
  document.getElementById('cNombre').value = c.nombre || ''
  document.getElementById('cApellido').value = c.apellido || ''
  document.getElementById('cTelefono').value = c.telefono || ''
  document.getElementById('cEmail').value = c.email || ''
  document.getElementById('cNotas').value = c.notas || ''
  document.getElementById('modalCliente').classList.add('open')
}

window.guardarCliente = async function() {
  const nombre = document.getElementById('cNombre').value.trim()
  if(!nombre) { alert('El nombre es obligatorio'); return }

  const editId = document.getElementById('clienteEditId').value
  const payload = {
    profesional_id: userId,
    nombre,
    apellido:  document.getElementById('cApellido').value.trim() || null,
    telefono:  document.getElementById('cTelefono').value.trim() || null,
    email:     document.getElementById('cEmail').value.trim() || null,
    notas:     document.getElementById('cNotas').value.trim() || null,
  }

  if(editId) {
    const { error } = await _supabase.from('libreta_clientes').update(payload).eq('id', editId)
    if(error) { alert('Error: ' + error.message); return }
    const idx = clientes.findIndex(x => x.id === editId)
    if(idx >= 0) clientes[idx] = { ...clientes[idx], ...payload }
    if(clienteActual?.id === editId) { clienteActual = { ...clienteActual, ...payload }; renderDetalle() }
  } else {
    const { data, error } = await _supabase.from('libreta_clientes').insert(payload).select().single()
    if(error) { alert('Error: ' + error.message); return }
    clientes.unshift(data)
    document.getElementById('contadorClientes').textContent = `(${clientes.length})`
  }

  cerrarModal('modalCliente')
  renderListaClientes(clientes)
  actualizarResumenTop()
}

window.eliminarCliente = async function(id) {
  if(!confirm('¿Eliminar este cliente y todos sus trabajos?')) return
  await _supabase.from('libreta_clientes').delete().eq('id', id)
  clientes = clientes.filter(c => c.id !== id)
  document.getElementById('contadorClientes').textContent = `(${clientes.length})`
  clienteActual = null
  trabajosActuales = []
  document.getElementById('panelDetalle').innerHTML = `
    <div class="lib-placeholder">
      <i class="fa-solid fa-hand-pointer" style="font-size:36px;"></i>
      <p style="font-size:14px;color:#94a3b8;">Seleccioná un cliente para ver sus trabajos</p>
    </div>`
  renderListaClientes(clientes)
  actualizarResumenTop()
  volverLista()
}

/* ══ MODAL TRABAJO ══ */

window.abrirModalTrabajo = function() {
  if(!clienteActual) return
  document.getElementById('tituloModalTrabajo').textContent = 'Agregar trabajo'
  document.getElementById('trabajoEditId').value = ''
  document.getElementById('tDesc').value = ''
  document.getElementById('tCat').value = ''
  document.getElementById('tEstado').value = 'consulta'
  document.getElementById('tMonto').value = ''
  document.getElementById('tFechaInicio').value = new Date().toISOString().split('T')[0]
  document.getElementById('tFechaFin').value = ''
  document.getElementById('tNotas').value = ''
  document.getElementById('modalTrabajo').classList.add('open')
  document.getElementById('tDesc').focus()
}

window.editarTrabajo = function(id) {
  const t = trabajosActuales.find(x => x.id === id)
  if(!t) return
  document.getElementById('tituloModalTrabajo').textContent = 'Editar trabajo'
  document.getElementById('trabajoEditId').value = t.id
  document.getElementById('tDesc').value = t.descripcion || ''
  document.getElementById('tCat').value = t.categoria || ''
  document.getElementById('tEstado').value = t.estado || 'consulta'
  document.getElementById('tMonto').value = t.monto || ''
  document.getElementById('tFechaInicio').value = t.fecha_inicio || ''
  document.getElementById('tFechaFin').value = t.fecha_fin || ''
  document.getElementById('tNotas').value = t.notas || ''
  document.getElementById('modalTrabajo').classList.add('open')
}

window.guardarTrabajo = async function() {
  const desc = document.getElementById('tDesc').value.trim()
  if(!desc) { alert('La descripción es obligatoria'); return }

  const editId = document.getElementById('trabajoEditId').value
  const payload = {
    profesional_id: userId,
    cliente_id:    clienteActual.id,
    descripcion:   desc,
    categoria:     document.getElementById('tCat').value.trim() || null,
    estado:        document.getElementById('tEstado').value,
    monto:         parseFloat(document.getElementById('tMonto').value) || null,
    fecha_inicio:  document.getElementById('tFechaInicio').value || null,
    fecha_fin:     document.getElementById('tFechaFin').value || null,
    notas:         document.getElementById('tNotas').value.trim() || null,
  }

  if(editId) {
    const { error } = await _supabase.from('libreta_trabajos').update(payload).eq('id', editId)
    if(error) { alert('Error: ' + error.message); return }
    const idx = trabajosActuales.findIndex(x => x.id === editId)
    if(idx >= 0) trabajosActuales[idx] = { ...trabajosActuales[idx], ...payload }
  } else {
    const { data, error } = await _supabase.from('libreta_trabajos').insert(payload).select().single()
    if(error) { alert('Error: ' + error.message); return }
    trabajosActuales.unshift(data)
  }

  cerrarModal('modalTrabajo')
  renderDetalle()
  renderListaClientes(clientes)
  actualizarResumenTop()
}

window.eliminarTrabajo = async function(id) {
  if(!confirm('¿Eliminar este trabajo?')) return
  await _supabase.from('libreta_trabajos').delete().eq('id', id)
  trabajosActuales = trabajosActuales.filter(t => t.id !== id)
  renderDetalle()
  renderListaClientes(clientes)
  actualizarResumenTop()
}

/* ══ INVITAR CLIENTE (fallback sin teléfono) ══ */
window.invitarCliente = function(clienteId) {
  const c = clientes.find(x => x.id === clienteId)
  if(!c) return
  const link = `https://trabajoscerca.com.ar/registro.html?ref=${userId}`
  const texto = `Hola ${c.nombre}! 👋 Te invito a Trabajos Cerca, la plataforma donde llevo el registro de tus trabajos. Es gratis 👇\n${link}`
  navigator.clipboard?.writeText(texto).catch(()=>{})
  mostrarToast('📋 Mensaje de invitación copiado. Envialo por el canal que prefieras.')
}

/* ══ RESUMEN TOP ══ */
function actualizarResumenTop() {
  const el = document.getElementById('resumen-top')
  if(!el) return
  const total = clientes.length
  if(!total) { el.innerHTML = ''; return }
  el.innerHTML = `
    <div style="background:white;border-radius:12px;padding:10px 16px;text-align:center;box-shadow:0 1px 6px rgba(0,0,0,.07);">
      <div style="font-size:20px;font-weight:900;color:#1e293b;">${total}</div>
      <div style="font-size:11px;color:#94a3b8;">Clientes</div>
    </div>`
}

/* ══ HELPERS ══ */
window.volverLista = function() {
  document.getElementById('panelLista').classList.remove('oculto')
  document.getElementById('panelDetalle').classList.remove('activo')
}

window.cerrarModal = function(id) {
  document.getElementById(id).classList.remove('open')
}

window.cerrarModalSiFondo = function(e, id) {
  if(e.target === document.getElementById(id)) window.cerrarModal(id)
}

function formatFecha(f) {
  if(!f) return ''
  const [y, m, d] = f.split('-')
  return `${d}/${m}/${y}`
}

function mostrarToast(msg) {
  const t = document.createElement('div')
  t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(80px);background:#1e293b;color:white;padding:12px 20px;border-radius:12px;font-size:14px;font-weight:600;z-index:9999;max-width:90vw;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,.25);transition:transform .3s ease,opacity .3s ease;opacity:0;'
  t.textContent = msg
  document.body.appendChild(t)
  requestAnimationFrame(() => requestAnimationFrame(() => { t.style.transform = 'translateX(-50%) translateY(0)'; t.style.opacity = '1' }))
  setTimeout(() => { t.style.transform = 'translateX(-50%) translateY(80px)'; t.style.opacity = '0'; setTimeout(() => t.remove(), 350) }, 3500)
}
