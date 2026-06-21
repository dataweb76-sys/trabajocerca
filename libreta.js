/* ══════════════════════════════════════════════
   LIBRETA DE CLIENTES — Trabajos Cerca
══════════════════════════════════════════════ */

import { supabase as _supabase } from './supabase.js'

let userId = null
let clientes = []
let clienteActual = null
let trabajosActuales = []
let slotsTotal = 5   // base gratuita
let puntosRef  = 0   // referidos registrados con su código
const SLOTS_BASE = 5

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

  const { data: prof } = await _supabase
    .from('perfiles')
    .select('nombre, apellido, puntos, libreta_slots_extra')
    .eq('id', userId).single()

  window._profNombre = prof ? `${prof.nombre||''} ${prof.apellido||''}`.trim() : ''
  puntosRef  = prof?.puntos || 0

  // Calcular slots totales según puntos y extra pagados
  const slotsExtra = prof?.libreta_slots_extra || 0
  const bonoPuntos = puntosRef >= 50 ? 20 : puntosRef >= 20 ? 10 : puntosRef >= 10 ? 10 : 0
  slotsTotal = SLOTS_BASE + bonoPuntos + slotsExtra

  // Verificar si hay bono nuevo por puntos que no se haya acreditado aún
  await verificarBonoPuntos(puntosRef, slotsExtra)

  await cargarClientes()
  renderBarraSlots()
})()

async function verificarBonoPuntos(puntos, slotsExtra) {
  // Acredita slots automáticamente cuando alcanza umbrales
  const bonoCorrecto = puntos >= 50 ? 20 : puntos >= 20 ? 10 : puntos >= 10 ? 10 : 0
  if(bonoCorrecto > slotsExtra) {
    await _supabase.from('perfiles').update({ libreta_slots_extra: bonoCorrecto }).eq('id', userId)
    slotsTotal = SLOTS_BASE + bonoCorrecto
  }
}

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
  if(clientes.length >= slotsTotal) { mostrarModalUpgrade(); return }
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

/* ══ BARRA DE SLOTS ══ */
function renderBarraSlots() {
  const usado = clientes.length
  const pct   = Math.min(100, Math.round(usado / slotsTotal * 100))
  const color = usado >= slotsTotal ? '#dc2626' : usado >= slotsTotal * 0.8 ? '#f59e0b' : '#22c55e'

  // Próximo umbral de puntos
  const proxUmbral = puntosRef < 10 ? 10 : puntosRef < 20 ? 20 : puntosRef < 50 ? 50 : null
  const proxLabel  = proxUmbral === 50
    ? `${proxUmbral - puntosRef} referidos más → publicar un trabajo realizado gratis 🎁`
    : proxUmbral
      ? `${proxUmbral - puntosRef} referidos más → +${proxUmbral <= 10 ? 10 : 5} clientes extra 🎉`
      : '¡Máximo desbloqueado por referidos! 🏆'

  let barraHTML = `
    <div style="background:white;border-radius:12px;padding:12px 16px;box-shadow:0 1px 6px rgba(0,0,0,.07);margin-bottom:0;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
        <span style="font-size:13px;font-weight:700;color:#1e293b;">📋 Clientes: ${usado} / ${slotsTotal}</span>
        ${usado >= slotsTotal
          ? `<button onclick="mostrarModalUpgrade()" style="background:#dc2626;color:white;border:none;border-radius:8px;padding:4px 12px;font-size:12px;font-weight:700;cursor:pointer;">+ Ampliar</button>`
          : `<span style="font-size:11px;color:#94a3b8;">${slotsTotal - usado} disponibles</span>`}
      </div>
      <div style="background:#f1f5f9;border-radius:99px;height:7px;overflow:hidden;">
        <div style="width:${pct}%;height:100%;background:${color};border-radius:99px;transition:width .4s;"></div>
      </div>
      ${proxUmbral !== null ? `<p style="margin:7px 0 0;font-size:11px;color:#64748b;"><i class="fa-solid fa-star" style="color:#f59e0b;"></i> ${proxLabel}</p>` : ''}
    </div>`

  const wrap = document.getElementById('resumen-top')
  if(wrap) wrap.innerHTML = barraHTML
}

/* ══ MODAL UPGRADE ══ */
window.mostrarModalUpgrade = function() {
  const proxSlots  = slotsTotal + 10
  const faltanRef  = puntosRef < 10 ? 10 - puntosRef : puntosRef < 20 ? 20 - puntosRef : 10
  const refLink    = `https://trabajoscerca.com.ar/registro.html?ref=${userId}`
  const msgWA      = encodeURIComponent(
    `¡Hola! 👋 Te invito a Trabajos Cerca, la plataforma gratuita para encontrar oficios, profesionales y trabajo cerca tuyo.\n\nRegistrate con mi link y empezá a usarla hoy 👇\n${refLink}`
  )

  let modal = document.getElementById('modalUpgrade')
  if(!modal) {
    modal = document.createElement('div')
    modal.id = 'modalUpgrade'
    modal.style.cssText = 'display:none;position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:2000;align-items:center;justify-content:center;padding:16px;'
    modal.onclick = e => { if(e.target === modal) modal.style.display = 'none' }
    document.body.appendChild(modal)
  }

  modal.innerHTML = `
    <div style="background:white;border-radius:20px;width:100%;max-width:460px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.25);">
      <div style="background:linear-gradient(135deg,#1e293b,#334155);padding:22px 24px;color:white;">
        <div style="font-size:32px;margin-bottom:8px;">🔒</div>
        <h2 style="margin:0 0 4px;font-size:20px;">Límite alcanzado</h2>
        <p style="margin:0;font-size:14px;opacity:.75;">Tenés ${clientes.length} de ${slotsTotal} clientes disponibles</p>
      </div>

      <div style="padding:20px 24px;display:flex;flex-direction:column;gap:14px;">

        <!-- Opción 1: Referidos -->
        <div style="border:2px solid #e0e7ff;border-radius:14px;padding:16px;">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
            <div style="font-size:28px;">🎯</div>
            <div>
              <div style="font-weight:800;color:#1e293b;font-size:15px;">Invitá amigos → Gratis</div>
              <div style="font-size:12px;color:#64748b;">Conseguí ${faltanRef} registro${faltanRef!==1?'s':''} más y sumás <strong>+10 clientes</strong></div>
            </div>
          </div>
          <div style="background:#f8fafc;border-radius:10px;padding:10px 12px;margin-bottom:12px;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
              <span style="font-size:12px;font-weight:700;color:#475569;">Tu progreso: ${puntosRef} / ${puntosRef < 10 ? 10 : 20} referidos</span>
            </div>
            <div style="background:#e2e8f0;border-radius:99px;height:8px;overflow:hidden;">
              <div style="width:${Math.min(100, Math.round(puntosRef / (puntosRef < 10 ? 10 : 20) * 100))}%;height:100%;background:#6366f1;border-radius:99px;"></div>
            </div>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <a href="https://wa.me/?text=${msgWA}" target="_blank"
              style="flex:1;min-width:120px;display:inline-flex;align-items:center;justify-content:center;gap:7px;background:#25d366;color:white;font-weight:700;font-size:13px;padding:10px 14px;border-radius:10px;text-decoration:none;">
              <i class="fa-brands fa-whatsapp"></i> Invitar por WA
            </a>
            <button onclick="copiarLinkRef()" style="flex:1;min-width:120px;display:inline-flex;align-items:center;justify-content:center;gap:7px;background:#eff6ff;color:#2563eb;font-weight:700;font-size:13px;padding:10px 14px;border-radius:10px;border:none;cursor:pointer;">
              <i class="fa-solid fa-copy"></i> Copiar link
            </button>
          </div>
        </div>

        <!-- Opción 2: Pago -->
        <div style="border:2px solid #fef3c7;border-radius:14px;padding:16px;">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
            <div style="font-size:28px;">💳</div>
            <div>
              <div style="font-weight:800;color:#1e293b;font-size:15px;">Pago único → +10 clientes</div>
              <div style="font-size:12px;color:#64748b;">$10.000 ARS · Acreditación en menos de 24hs</div>
            </div>
          </div>
          <div style="background:#fffbeb;border-radius:10px;padding:12px;margin-bottom:12px;font-size:13px;color:#475569;line-height:1.6;">
            <strong>Transferí a:</strong><br>
            👤 Daniel Faggi<br>
            🏦 CVU/Alias: <strong>dataweb.mp</strong><br>
            💰 Monto: <strong>$10.000</strong><br>
            📝 Concepto: <strong>Libreta TC - ${userId.slice(0,8)}</strong>
          </div>
          <button onclick="abrirModalComprobante()" style="width:100%;background:#f59e0b;color:#1c1917;font-weight:800;font-size:14px;padding:12px;border-radius:10px;border:none;cursor:pointer;">
            <i class="fa-solid fa-paper-plane"></i> Enviar comprobante
          </button>
        </div>

        <!-- Logros -->
        <div style="background:#f8fafc;border-radius:12px;padding:12px 14px;">
          <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:.05em;">🏆 Recompensas por referidos</p>
          <div style="display:flex;flex-direction:column;gap:6px;">
            ${[
              {n:10,  premio:'+10 clientes extra',            done: puntosRef>=10},
              {n:20,  premio:'+5 clientes más (15 total)',    done: puntosRef>=20},
              {n:50,  premio:'Publicar 1 trabajo realizado 🎁', done: puntosRef>=50},
            ].map(r => `
              <div style="display:flex;align-items:center;gap:10px;">
                <div style="width:28px;height:28px;border-radius:50%;background:${r.done?'#22c55e':'#e2e8f0'};display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:13px;">
                  ${r.done ? '✓' : r.n}
                </div>
                <span style="font-size:13px;color:${r.done?'#16a34a':'#64748b'};font-weight:${r.done?'700':'400'};">${r.premio}</span>
              </div>`).join('')}
          </div>
        </div>

      </div>
      <div style="padding:0 24px 20px;">
        <button onclick="document.getElementById('modalUpgrade').style.display='none'" style="width:100%;background:#f1f5f9;color:#475569;font-weight:700;font-size:14px;padding:12px;border-radius:10px;border:none;cursor:pointer;">
          Cerrar
        </button>
      </div>
    </div>`

  modal.style.display = 'flex'
}

window.copiarLinkRef = function() {
  const link = `https://trabajoscerca.com.ar/registro.html?ref=${userId}`
  navigator.clipboard?.writeText(link).catch(()=>{})
  mostrarToast('📋 Link de invitación copiado!')
}

window.abrirModalComprobante = function() {
  const texto = prompt('Pegá el número de operación o una descripción del pago:')
  if(!texto) return
  _supabase.from('libreta_pagos').insert({
    profesional_id: userId,
    monto: 10000,
    slots_sumados: 10,
    comprobante: texto,
    aprobado: false
  }).then(() => {
    document.getElementById('modalUpgrade').style.display = 'none'
    mostrarToast('✅ Comprobante enviado. Te acreditamos en menos de 24hs.')
  })
}

function mostrarToast(msg) {
  const t = document.createElement('div')
  t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(80px);background:#1e293b;color:white;padding:12px 20px;border-radius:12px;font-size:14px;font-weight:600;z-index:9999;max-width:90vw;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,.25);transition:transform .3s ease,opacity .3s ease;opacity:0;'
  t.textContent = msg
  document.body.appendChild(t)
  requestAnimationFrame(() => requestAnimationFrame(() => { t.style.transform = 'translateX(-50%) translateY(0)'; t.style.opacity = '1' }))
  setTimeout(() => { t.style.transform = 'translateX(-50%) translateY(80px)'; t.style.opacity = '0'; setTimeout(() => t.remove(), 350) }, 3500)
}
