/*  ══════════════════════════════════════════════════════
    CAMI — Asistente IA · Trabajos Cerca
    Páginas: registro.html · perfil.html · perfil_servicio.html
    ══════════════════════════════════════════════════════ */
;(function(){
'use strict'

/* ─────────────────────────────────────────────────────
   DETECCIÓN DE PÁGINA
───────────────────────────────────────────────────────*/
const _path        = location.pathname.replace(/\/$/, '').replace(/\.html$/, '')
const EN_REGISTRO  = !!document.getElementById('formReg')
const EN_SERVICIO  = !!document.getElementById('selectorTipo')
const EN_PERFIL    = !EN_REGISTRO && !EN_SERVICIO && _path.endsWith('/perfil')

// Solo cargar en las 3 páginas objetivo
if(!EN_REGISTRO && !EN_SERVICIO && !EN_PERFIL) return

/* ─────────────────────────────────────────────────────
   MEMORIA DE SESIÓN — ¿ya me presenté?
   (persiste entre registro → bienvenida → formulario)
───────────────────────────────────────────────────────*/
const YA_SALUDE = !!localStorage.getItem('tc_cami_saludo')

function marcarSaludo(){ localStorage.setItem('tc_cami_saludo', '1') }
function limpiarSaludo(){ localStorage.removeItem('tc_cami_saludo') }

/* ─────────────────────────────────────────────────────
   TEXTOS
───────────────────────────────────────────────────────*/
const T = {
  // Registro — saludo inicial (solo la primera vez)
  saludo:       '¡Hola! Soy Cami, tu asistente de Trabajos Cerca. ¿Querés que te ayude a registrarte?',
  siAyuda:      'Dale, arranquemos. Hacé clic en el primer campo y yo te voy guiando.',
  noAyuda:      '¡Genial, qué bueno que sabés cómo hacerlo! Cualquier cosa estoy acá.',
  micInfo:      'También podés hablarme. Decime qué oficio o profesión tenés.',

  // Páginas siguientes — saludo corto
  saludoCorto:  '¿Querés que acá te siga ayudando?',

  // Registro — guía por campo
  campo: {
    rNombre:   'Escribí tu nombre, el que usás normalmente.',
    rApellido: 'Ahora el apellido, tal cual figura en el DNI.',
    rEmail:    'El email lo vas a usar para entrar. Usá uno que revises seguido.',
    rTelefono: 'El número de WhatsApp, sin el cero ni el quince. Ejemplo: 2214561234.',
    rPass:     'Elegí una contraseña de al menos seis caracteres. Combiná letras y números.',
    rTerminos: 'Ya casi terminamos. Aceptá los términos y después apretá el botón azul.',
  },

  // Bienvenida — selector de tipo
  bvIntro: '¡Bienvenido/a! Acá elegís cómo aparecer en Trabajos Cerca. Te recomiendo empezar con una sola opción, y una vez que tengas el perfil listo podés agregar más desde tu cuenta.',
  bvOpciones: {
    oficio:         '🔧 Elegí "Ofrezco un oficio" si sos plomero, electricista, pintor, carpintero u otro oficio similar.',
    profesional:    '👔 "Soy profesional" es para médicos, abogados, contadores, arquitectos y similares.',
    emprendimiento: '🚀 "Tengo un emprendimiento" es para locales, marcas, gastronomía o proyectos propios.',
    cv:             '📄 "Busco trabajo" te pone visible para que empresas y personas te encuentren.',
    empresa:        '🏢 "Soy empresa o negocio" es para publicar puestos de trabajo y buscar empleados.',
    cliente:        '👤 "Solo busco contratar" es si necesitás un profesional y no vas a ofrecer servicios vos.',
  },
  bvClienteTip: 'Perfecto. Si solo buscás contratar no es necesario subir foto ni completar más datos. Hacé clic en "Terminar registro como cliente" y listo.',
  bvContinuarTip: 'Muy bien. Hacé clic en "Continuar" y te llevo a completar tu perfil. Solo te va a pedir una foto y algunos datos básicos.',
  bvMultiTip: 'Elegiste varias opciones. Te recomiendo completar primero la que más uses, y después desde tu perfil agregás las demás. ¿Listo para continuar?',

  // perfil_servicio — formulario
  tipoIntro:  '¿Qué tipo de perfil querés crear? Elegí en la lista y te explico qué datos necesitás.',
  tipos: {
    oficio:         'Perfecto. Completá tu categoría, una foto tuya o de tu trabajo, tu localidad y una descripción. Cuanto más completo, más clientes te encuentran.',
    profesional:    'Buenísimo. Completá tu especialidad, subí una foto profesional, tu localidad y una breve descripción de tu servicio.',
    cv:             'Entendido. Completá tus datos, una foto y describí tu experiencia. Las empresas te van a poder encontrar y contactar.',
    empresa:        'Genial. Completá el nombre de tu empresa, el rubro, tu localidad y una descripción. Así podés publicar búsquedas de empleados.',
    emprendimiento: '¡Qué bueno! Completá el nombre, una foto del producto o local, tu localidad y una descripción atractiva. Eso es lo primero que ven los clientes.',
  },
  fotoTip:    'La foto es clave. Si ofrecés un servicio, subí una imagen tuya o de tu trabajo para que los clientes confíen más en vos.',
  fotoClienteTip: 'Si solo buscás contratar, la foto no es obligatoria. Pero si la ponés, es más fácil que los profesionales te respondan.',
  descripTip: 'Describí en pocas palabras qué hacés. Eso es lo primero que ven los clientes.',
  ciudadTip:  'Indicá tu ciudad para aparecer en búsquedas de tu zona.',
  guardaTip:  '¡Ya tenés todo! Apretá "Guardar perfil" y en segundos vas a aparecer en el buscador.',
}

/* ─────────────────────────────────────────────────────
   ESTADO
───────────────────────────────────────────────────────*/
let _ayudando       = false
let _burbujaVisible = false
let _audioOn        = true
let _escuchaModo    = false
let _escuchando     = false
let _vozElegida     = null
let _modoActual     = EN_REGISTRO ? 'registro' : EN_SERVICIO ? 'servicio' : 'perfil'

/* ─────────────────────────────────────────────────────
   AVATAR SVG
───────────────────────────────────────────────────────*/
const AVATAR_SVG = `<svg viewBox="0 0 120 130" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;">
  <ellipse cx="60" cy="118" rx="30" ry="18" fill="#6366f1"/>
  <rect x="53" y="95" width="14" height="12" rx="3" fill="#fbbf7a"/>
  <ellipse cx="60" cy="72" rx="26" ry="27" fill="#fbbf7a"/>
  <ellipse cx="60" cy="58" rx="28" ry="20" fill="#7c3aed"/>
  <ellipse cx="37" cy="75" rx="9" ry="16" fill="#7c3aed"/>
  <ellipse cx="83" cy="75" rx="9" ry="16" fill="#7c3aed"/>
  <ellipse cx="60" cy="48" rx="24" ry="10" fill="#7c3aed"/>
  <ellipse cx="50" cy="74" rx="4.5" ry="5" fill="white"/>
  <ellipse cx="70" cy="74" rx="4.5" ry="5" fill="white"/>
  <circle cx="51" cy="75" r="2.8" fill="#1e293b"/>
  <circle cx="71" cy="75" r="2.8" fill="#1e293b"/>
  <circle cx="52" cy="73.5" r=".9" fill="white"/>
  <circle cx="72" cy="73.5" r=".9" fill="white"/>
  <path d="M45 68 Q50 65.5 55 67.5" stroke="#5b21b6" stroke-width="1.8" fill="none" stroke-linecap="round"/>
  <path d="M65 67.5 Q70 65.5 75 68" stroke="#5b21b6" stroke-width="1.8" fill="none" stroke-linecap="round"/>
  <ellipse cx="60" cy="82" rx="2.5" ry="1.8" fill="#f59e6a"/>
  <path d="M53 88 Q60 94 67 88" stroke="#c2410c" stroke-width="2" fill="none" stroke-linecap="round"/>
  <ellipse cx="44" cy="83" rx="5.5" ry="3.5" fill="#fca5a5" opacity=".45"/>
  <ellipse cx="76" cy="83" rx="5.5" ry="3.5" fill="#fca5a5" opacity=".45"/>
  <circle cx="85" cy="72" r="4.5" fill="#2563eb" opacity=".9"/>
  <circle cx="85" cy="72" r="2.2" fill="#60a5fa"/>
  <text x="88" y="55" font-size="7" fill="#fbbf24">✦</text>
  <text x="22" y="61" font-size="5.5" fill="#a78bfa">✦</text>
</svg>`

/* ─────────────────────────────────────────────────────
   CREAR WIDGET
───────────────────────────────────────────────────────*/
function crearWidget(){
  const div = document.createElement('div')
  div.id = 'cami-widget'
  div.innerHTML = `
<style>
#cami-widget{
  position:fixed;
  top:68px; right:12px;
  z-index:10000;
  display:flex; flex-direction:column; align-items:flex-end; gap:7px;
  pointer-events:none;
}
#cami-burbuja{
  background:white;
  border:2px solid #6366f1;
  border-radius:16px 4px 16px 16px;
  padding:11px 13px;
  font-size:13px; color:#1e293b; line-height:1.55;
  box-shadow:0 6px 24px rgba(99,102,241,.22);
  pointer-events:all;
  opacity:0; transform:translateY(-8px) scale(.96);
  transition:opacity .28s ease,transform .28s ease;
  width:230px;
}
#cami-burbuja.visible{opacity:1;transform:translateY(0) scale(1);}
.cami-titulo{
  font-weight:800;color:#6366f1;font-size:11px;
  margin-bottom:5px;display:flex;align-items:center;
  justify-content:space-between;
}
.cami-txt-wrap{font-size:13px;color:#374151;line-height:1.55;}
#cami-btns{display:flex;gap:6px;margin-top:9px;flex-wrap:wrap;}
#cami-btns button{
  flex:1;min-width:62px;padding:7px 7px;border-radius:8px;
  font-size:12px;font-weight:700;cursor:pointer;border:none;transition:all .15s;
}
.cb-si{background:#6366f1;color:white;} .cb-si:hover{background:#4f46e5;}
.cb-no{background:#f1f5f9;color:#64748b;} .cb-no:hover{background:#e2e8f0;}
.cb-mic{
  background:#fee2e2;color:#dc2626;
  min-width:34px!important;max-width:38px!important;
  padding:7px 9px!important;font-size:14px;
}
.cb-mic.on{background:#dc2626;color:white;animation:cami-ring .7s infinite;}
.cami-mic-hint{font-size:10px;color:#94a3b8;margin-top:3px;font-style:italic;min-height:13px;}
#cami-audio-btn{
  cursor:pointer;border:none;background:transparent;
  font-size:13px;color:#94a3b8;padding:0;line-height:1;
  transition:color .15s;
}
#cami-audio-btn:hover{color:#6366f1;}
#cami-av-wrap{
  position:relative;width:62px;height:72px;
  cursor:pointer;pointer-events:all;
}
#cami-av{
  width:62px;height:72px;
  filter:drop-shadow(0 4px 12px rgba(99,102,241,.28));
  transform:translateY(0);
  transition:transform .2s ease;
}
#cami-av-wrap:hover #cami-av{transform:translateY(3px);}
.cami-badge{
  position:absolute;top:-3px;right:-3px;
  width:17px;height:17px;background:#6366f1;
  border-radius:50%;display:flex;align-items:center;
  justify-content:center;font-size:10px;border:2px solid white;
  animation:cami-ring 2.2s infinite;
}
@keyframes cami-ring{0%,100%{box-shadow:0 0 0 0 rgba(99,102,241,.4);}55%{box-shadow:0 0 0 6px rgba(99,102,241,0);}}
#cami-widget.teclado-on #cami-burbuja{display:none!important;}
#cami-widget.teclado-on #cami-av-wrap{width:44px;height:51px;opacity:.75;}
@media(max-width:480px){
  #cami-widget{top:58px;right:6px;}
  #cami-burbuja{width:192px;font-size:12px;padding:9px 10px;}
  #cami-av-wrap,#cami-av{width:52px;height:60px;}
}
</style>

<div id="cami-burbuja">
  <div class="cami-titulo">
    <span>✨ <strong>Cami</strong></span>
    <button id="cami-audio-btn" onclick="_camiToggleAudio()" title="Activar/desactivar voz">🔊</button>
  </div>
  <div class="cami-txt-wrap" id="cami-txt">…</div>
  <div id="cami-btns"></div>
  <div class="cami-mic-hint" id="cami-mic-hint"></div>
</div>

<div id="cami-av-wrap" onclick="_cami.toggleBurbuja()" title="Cami · Asistente">
  <div id="cami-av">${AVATAR_SVG}</div>
  <div class="cami-badge">💬</div>
</div>`
  document.body.appendChild(div)
}

window._camiToggleAudio = function(){
  _audioOn = !_audioOn
  const btn = document.getElementById('cami-audio-btn')
  if(btn) btn.textContent = _audioOn ? '🔊' : '🔇'
  if(!_audioOn) window.speechSynthesis?.cancel()
}

/* ─────────────────────────────────────────────────────
   VOZ — síntesis
───────────────────────────────────────────────────────*/
function cargarVoces(){
  const voces = window.speechSynthesis?.getVoices() || []
  if(!voces.length) return
  const candidatos = [
    voces.find(v => /google/i.test(v.name) && /es.AR/i.test(v.lang)),
    voces.find(v => /google/i.test(v.name) && v.lang.startsWith('es') && /sabina|lucia|monica|valeria/i.test(v.name)),
    voces.find(v => /google/i.test(v.name) && v.lang.startsWith('es')),
    voces.find(v => /microsoft/i.test(v.name) && /sabina|elena|paloma|laura|conchita/i.test(v.name)),
    voces.find(v => /microsoft/i.test(v.name) && v.lang.startsWith('es')),
    voces.find(v => v.lang.startsWith('es') && /female|mujer|sabina|lucia|elena|laura/i.test(v.name)),
    voces.find(v => /es.AR/i.test(v.lang)),
    voces.find(v => v.lang.startsWith('es')),
  ]
  _vozElegida = candidatos.find(Boolean) || null
}
if(window.speechSynthesis){
  speechSynthesis.onvoiceschanged = cargarVoces
  setTimeout(cargarVoces, 400)
  setTimeout(cargarVoces, 1500)
}

let _hablandoTimer = null
function hablar(txt, cb){
  if(!_audioOn || !window.speechSynthesis){ if(cb) cb(); return }
  speechSynthesis.cancel()
  clearTimeout(_hablandoTimer)
  const u = new SpeechSynthesisUtterance(txt)
  u.lang  = 'es-AR'
  u.rate  = 0.97
  u.pitch = 1.06
  if(_vozElegida) u.voice = _vozElegida
  u.onend = () => {
    if(_escuchaModo) setTimeout(iniciarEscucha, 400)
    if(cb) cb()
  }
  _hablandoTimer = setTimeout(() => {
    if(speechSynthesis.speaking){ speechSynthesis.cancel(); if(cb) cb() }
  }, 15000)
  speechSynthesis.speak(u)
}

/* ─────────────────────────────────────────────────────
   VOZ — reconocimiento
───────────────────────────────────────────────────────*/
const SR = window.SpeechRecognition || window.webkitSpeechRecognition
let _rec = null

function iniciarEscucha(){
  if(!SR){ hint('Tu navegador no soporta micrófono'); return }
  if(_escuchando) return
  _escuchando = true
  _rec = new SR()
  _rec.lang = 'es-AR'
  _rec.continuous = false
  _rec.interimResults = false
  _rec.onstart = () => { hint('🎤 Escuchando…'); btnMicOn(true) }
  _rec.onresult = e => {
    const dicho = e.results[0][0].transcript.trim()
    hint('✓ "' + dicho + '"')
    procesarVoz(dicho.toLowerCase())
  }
  _rec.onerror = err => {
    hint(err.error === 'not-allowed' ? '🔒 Permití el micrófono' : '')
    _escuchando = false; btnMicOn(false)
  }
  _rec.onend = () => { _escuchando = false; btnMicOn(false) }
  try { _rec.start() } catch(e){ _escuchando = false }
}

function detenerEscucha(){
  _escuchando = false; btnMicOn(false)
  try { _rec?.stop() } catch(e){}
}

function btnMicOn(on){
  const btn = document.getElementById('cb-mic')
  if(btn) on ? btn.classList.add('on') : btn.classList.remove('on')
}

function toggleMic(){
  if(_escuchando){ _escuchaModo=false; detenerEscucha(); hint('') }
  else { _escuchaModo=true; iniciarEscucha() }
}

/* ─────────────────────────────────────────────────────
   PROCESAMIENTO DE VOZ — según modo actual
───────────────────────────────────────────────────────*/
function procesarVoz(txt){
  // Respuesta al saludo (sí/no)
  if(!_ayudando){
    if(/s[ií]|dale|buen|claro|ayud|obvio|quiero/i.test(txt)){ aceptarAyuda(); return }
    if(/no\b|gracias|solo|ya s[eé]/i.test(txt)){ rechazarAyuda(); return }
  }

  // Modo bienvenida — explicar opciones por voz
  if(_modoActual === 'bv'){
    const op = detectarOpcionBV(txt)
    if(op){ explicarOpcionBV(op); return }
    if(/continuar|siguiente|listo|ya elegí|seguir/i.test(txt)){
      document.getElementById('bv-btn')?.click(); return
    }
  }

  // Modo servicio
  if(_modoActual === 'servicio'){
    const t = detectarTipo(txt)
    if(t){ seleccionarTipo(t); return }
  }

  // Campos de registro
  if(/nombre/i.test(txt))                   { document.getElementById('rNombre')?.focus(); return }
  if(/apellido/i.test(txt))                 { document.getElementById('rApellido')?.focus(); return }
  if(/email|correo/i.test(txt))             { document.getElementById('rEmail')?.focus(); return }
  if(/tel[eé]fono|whatsapp|cel/i.test(txt)) { document.getElementById('rTelefono')?.focus(); return }
  if(/contraseña|clave/i.test(txt))         { document.getElementById('rPass')?.focus(); return }

  // Tipo en registro
  const t = detectarTipo(txt)
  if(t){ decir('Anotado. Cuando llegues al perfil elegís ' + t + '. Por ahora terminemos el registro.'); return }

  decir('No te entendí bien. Seguí completando y cualquier duda me preguntás.')
}

function detectarOpcionBV(txt){
  if(/(electricista|plomer|alban|pintor|gasista|carpintero|jardinero|oficio|técnico|mecán)/i.test(txt)) return 'oficio'
  if(/(m[eé]dico|abogad|contador|psic|arquitecto|ingeniero|profesional|universitari)/i.test(txt)) return 'profesional'
  if(/(emprendimiento|emprendedor|negocio|marca|local|gastronom)/i.test(txt)) return 'emprendimiento'
  if(/(cv|currículum|busco trabajo|empleo)/i.test(txt)) return 'cv'
  if(/(empresa|comercio|contratar empleado)/i.test(txt)) return 'empresa'
  if(/(cliente|solo busco|contratar|busco profesional)/i.test(txt)) return 'cliente'
  return null
}

function explicarOpcionBV(op){
  const msg = T.bvOpciones[op] || ''
  if(!msg) return
  decir(msg)
  // Seleccionar visualmente la opción
  const el = document.getElementById('bvop-' + op)
  if(el && window._bvToggle) window._bvToggle(op)
}

function detectarTipo(txt){
  if(/(electricista|electricidad|plomer|alban[ií]l|pintor|gasista|carpintero|jardinero|oficio|técnico|mecán)/i.test(txt)) return 'oficio'
  if(/(m[eé]dico|doctor|abogad|contador|psic[oó]log|arquitecto|ingeniero|profesional)/i.test(txt)) return 'profesional'
  if(/(emprendimiento|emprendedor|negocio|marca)/i.test(txt)) return 'emprendimiento'
  if(/(empresa|comercio)/i.test(txt))       return 'empresa'
  if(/(cv|currículum|busco trabajo)/i.test(txt)) return 'cv'
  return null
}

function seleccionarTipo(tipo){
  const sel = document.getElementById('selectorTipo')
  if(!sel) return
  sel.value = tipo
  sel.dispatchEvent(new Event('change'))
  decir(T.tipos[tipo] || 'Perfecto, completá los datos.')
}

/* ─────────────────────────────────────────────────────
   UI HELPERS
───────────────────────────────────────────────────────*/
function decir(txt, btns){
  document.getElementById('cami-txt').textContent = txt
  document.getElementById('cami-btns').innerHTML = btns !== undefined ? btns : btnMic()
  abrirBurbuja(); hablar(txt)
}

function hint(txt){ const el = document.getElementById('cami-mic-hint'); if(el) el.textContent = txt }

function abrirBurbuja(){
  document.getElementById('cami-burbuja')?.classList.add('visible')
  _burbujaVisible = true
}
function cerrarBurbuja(){
  document.getElementById('cami-burbuja')?.classList.remove('visible')
  _burbujaVisible = false
}

window._cami = { toggleBurbuja(){ _burbujaVisible ? cerrarBurbuja() : abrirBurbuja() } }

function btnSiNo(){
  return `<button class="cb-si" onclick="aceptarAyuda()">👍 Sí</button>
          <button class="cb-no" onclick="rechazarAyuda()">No, gracias</button>`
}
function btnMic(){
  return SR ? `<button id="cb-mic" class="cb-mic" onclick="toggleMic()" title="Hablar con Cami">🎤</button>` : ''
}

/* ─────────────────────────────────────────────────────
   ACEPTAR / RECHAZAR AYUDA
───────────────────────────────────────────────────────*/
window.aceptarAyuda = function(){
  _ayudando = true; _escuchaModo = true
  if(_modoActual === 'registro'){
    const txt = T.siAyuda + ' ' + T.micInfo
    document.getElementById('cami-txt').textContent = txt
    document.getElementById('cami-btns').innerHTML = btnMic()
    hablar(txt)
    document.getElementById('rNombre')?.focus()
  } else if(_modoActual === 'bv'){
    document.getElementById('cami-txt').textContent = T.bvIntro
    document.getElementById('cami-btns').innerHTML = btnMic()
    hablar(T.bvIntro)
  } else if(_modoActual === 'servicio'){
    const txt = 'Bárbaro. Completá los datos del formulario y yo te voy guiando en cada paso. ' + T.micInfo
    document.getElementById('cami-txt').textContent = txt
    document.getElementById('cami-btns').innerHTML = btnMic()
    hablar(txt)
  }
}

window.rechazarAyuda = function(){
  _ayudando = false; _escuchaModo = false
  document.getElementById('cami-txt').textContent = T.noAyuda
  document.getElementById('cami-btns').innerHTML = btnMic()
  hablar(T.noAyuda)
  setTimeout(cerrarBurbuja, 3800)
}

/* ─────────────────────────────────────────────────────
   BIND CAMPOS — registro.html
───────────────────────────────────────────────────────*/
function bindRegistro(){
  Object.entries(T.campo).forEach(([id, msg]) => {
    const el = document.getElementById(id)
    if(!el) return
    el.addEventListener('focus', () => {
      if(!_ayudando) return
      document.getElementById('cami-txt').textContent = msg
      document.getElementById('cami-btns').innerHTML = btnMic()
      abrirBurbuja(); hablar(msg)
    })
  })
  document.getElementById('rTerminos')?.addEventListener('change', e => {
    if(!_ayudando || !e.target.checked) return
    const msg = '¡Perfecto! Apretá "Registrarme gratis" y ya estás dentro.'
    document.getElementById('cami-txt').textContent = msg; hablar(msg)
  })
  document.querySelector('.btn-google')?.addEventListener('click', () => {
    if(_ayudando){ document.getElementById('cami-txt').textContent = '¡Buena! Con Google es más rápido.'; hablar('Buena elección. Con Google es más rápido, solo confirmá tu cuenta.') }
  })
}

/* ─────────────────────────────────────────────────────
   BIND OVERLAY BIENVENIDA — perfil.html
   (Cami aparece dentro del overlay #bv-overlay)
───────────────────────────────────────────────────────*/
window._camiActivarBienvenida = function(){
  _modoActual = 'bv'

  // Reposicionar: en el overlay queremos Cami dentro
  const widget = document.getElementById('cami-widget')
  if(widget){
    widget.style.top    = 'auto'
    widget.style.bottom = '12px'
    widget.style.right  = '12px'
    widget.style.zIndex = '9999'
  }

  // Escuchar clicks en opciones para guiar
  setTimeout(() => {
    document.querySelectorAll('.bv-op').forEach(el => {
      el.addEventListener('click', () => {
        if(!_ayudando) return
        const id = el.id.replace('bvop-', '')
        const msg = T.bvOpciones[id] || ''
        if(msg){
          setTimeout(() => {
            document.getElementById('cami-txt').textContent = msg
            document.getElementById('cami-btns').innerHTML = btnMic()
            hablar(msg)
          }, 200)
        }
        // Detectar cliente → tip especial
        if(id === 'cliente'){
          setTimeout(() => decir(T.bvClienteTip), 400)
        }
      })
    })

    // Observar el botón Continuar para dar tip de múltiple selección
    document.getElementById('bv-btn')?.addEventListener('click', () => {
      if(!_ayudando) return
      const btn = document.getElementById('bv-btn')
      if(btn?.textContent?.includes(',')) decir(T.bvMultiTip)
    }, { once: false })
  }, 500)

  const txtSaludo = YA_SALUDE ? T.saludoCorto : T.saludo
  setTimeout(() => {
    document.getElementById('cami-txt').textContent = txtSaludo
    document.getElementById('cami-btns').innerHTML = btnSiNo()
    abrirBurbuja(); _escuchaModo = true; hablar(txtSaludo)
    marcarSaludo()
  }, 800)
}

/* ─────────────────────────────────────────────────────
   BIND CAMPOS — perfil_servicio.html
───────────────────────────────────────────────────────*/
function bindServicio(){
  const sel = document.getElementById('selectorTipo')
  if(sel){
    sel.addEventListener('focus', () => { if(_ayudando) decir(T.tipoIntro) })
    sel.addEventListener('change', () => {
      if(!_ayudando) return
      const msg = T.tipos[sel.value]
      if(msg){ document.getElementById('cami-txt').textContent = msg; hablar(msg) }
    })
  }

  // Foto — detectar si es cliente (no necesita foto)
  const fotoListener = () => {
    if(!_ayudando) return
    const params = new URLSearchParams(location.search)
    const tipo   = params.get('tipo') || ''
    decir(tipo === 'cliente' ? T.fotoClienteTip : T.fotoTip)
  }
  document.getElementById('inputFoto')?.addEventListener('change', fotoListener)
  document.getElementById('fotoCircle')?.addEventListener('click',  fotoListener)

  // Localidad
  ;['localidad','ciudad','rLocalidad'].forEach(id => {
    document.getElementById(id)?.addEventListener('focus', () => {
      if(_ayudando){ document.getElementById('cami-txt').textContent = T.ciudadTip; hablar(T.ciudadTip) }
    })
  })

  // Descripción
  ;['descripcion','descripcion2','titulo'].forEach(id => {
    document.getElementById(id)?.addEventListener('focus', () => {
      if(_ayudando){ document.getElementById('cami-txt').textContent = T.descripTip; hablar(T.descripTip) }
    })
  })

  // Guardar
  document.querySelectorAll('button[type="submit"],[onclick*="guardar"]').forEach(btn => {
    btn.addEventListener('click', () => { if(_ayudando) setTimeout(() => decir(T.guardaTip), 300) })
  })

  // Pre-llenar tip según ?tipo= en la URL (viene de bienvenida con ?bv=1)
  const params  = new URLSearchParams(location.search)
  const tipoUrl = params.get('tipo')
  const desvBv  = params.get('bv') === '1'
  if(tipoUrl && T.tipos[tipoUrl]){
    // Dar tip del tipo 2s después de aceptar ayuda
    const _origAceptar = window.aceptarAyuda
    window.aceptarAyuda = function(){
      _origAceptar()
      setTimeout(() => {
        if(_ayudando && tipoUrl){
          decir(T.tipos[tipoUrl])
        }
      }, 2000)
    }
  }
}

/* ─────────────────────────────────────────────────────
   TECLADO VIRTUAL — mobile
───────────────────────────────────────────────────────*/
function bindTeclado(){
  if(!/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) return
  let altH = window.innerHeight
  window.addEventListener('resize', () => {
    const w = document.getElementById('cami-widget')
    if(!w) return
    if(window.innerHeight < altH * 0.72){ w.classList.add('teclado-on'); detenerEscucha() }
    else { w.classList.remove('teclado-on'); altH = window.innerHeight }
  })
}

/* ─────────────────────────────────────────────────────
   INIT por página
───────────────────────────────────────────────────────*/
function init(){
  crearWidget()
  bindTeclado()

  if(EN_REGISTRO){
    _modoActual = 'registro'
    bindRegistro()
    // Primera vez o regresó a registro → limpiar bandera para que no salude de nuevo
    const txtSaludo = YA_SALUDE ? T.saludoCorto : T.saludo
    setTimeout(() => {
      document.getElementById('cami-txt').textContent = txtSaludo
      document.getElementById('cami-btns').innerHTML = btnSiNo()
      abrirBurbuja(); _escuchaModo = true; hablar(txtSaludo)
      marcarSaludo()
    }, 1800)

  } else if(EN_SERVICIO){
    _modoActual = 'servicio'
    bindServicio()
    const txtSaludo = YA_SALUDE ? T.saludoCorto : T.saludo
    setTimeout(() => {
      document.getElementById('cami-txt').textContent = txtSaludo
      document.getElementById('cami-btns').innerHTML = btnSiNo()
      abrirBurbuja(); _escuchaModo = true; hablar(txtSaludo)
      marcarSaludo()
    }, 1200)

  } else if(EN_PERFIL){
    _modoActual = 'perfil'
    // En perfil.html solo se activa cuando aparece el overlay de bienvenida
    // El hook _camiActivarBienvenida() lo llama mostrarBienvenida() en perfil.js
    // No hacemos nada acá — esperamos que perfil.js lo invoque
  }
}

if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init)
else init()

})()
