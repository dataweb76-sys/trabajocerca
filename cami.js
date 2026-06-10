/*  ══════════════════════════════════════════════════════
    CAMI — Asistente IA · Trabajos Cerca
    Páginas: registro · perfil (bienvenida) · perfil_servicio
    ══════════════════════════════════════════════════════ */
;(function(){
'use strict'

/* ─────────────────────────────────────────────────────
   DETECCIÓN DE PÁGINA
───────────────────────────────────────────────────────*/
const _path       = location.pathname.replace(/\/$|\.html$/g, '')
const EN_REGISTRO = !!document.getElementById('formReg')
const EN_SERVICIO = !!document.getElementById('selectorTipo')
const EN_PERFIL   = !EN_REGISTRO && !EN_SERVICIO && _path.endsWith('/perfil')

if(!EN_REGISTRO && !EN_SERVICIO && !EN_PERFIL) return

/* ─────────────────────────────────────────────────────
   MEMORIA — ¿ya me presenté en esta sesión?
───────────────────────────────────────────────────────*/
const YA_SALUDE = !!sessionStorage.getItem('tc_cami_saludo')
const marcarSaludo = () => sessionStorage.setItem('tc_cami_saludo','1')

/* ─────────────────────────────────────────────────────
   TEXTOS
───────────────────────────────────────────────────────*/
const T = {
  saludo:      '¡Hola! Soy Cami. ¿Querés que te ayude a registrarte?',
  saludoCorto: '¿Querés que acá te siga ayudando?',
  siAyuda:     'Dale, completá el primer campo y yo te voy guiando.',
  noAyuda:     '¡Genial, qué bueno que sabés cómo hacerlo! Cualquier cosa acá estoy.',
  micInfo:     'Podés hablarme también. Decime tu oficio o profesión.',
  campo: {
    rNombre:   'Escribí tu nombre, el que usás normalmente.',
    rApellido: 'Ahora el apellido, tal cual figura en el DNI.',
    rEmail:    'Poné el email que usás. Con ese vas a entrar a la plataforma.',
    rTelefono: 'El número de WhatsApp sin el cero ni el quince. Por ejemplo: 2214561234.',
    rPass:     'Elegí una contraseña de al menos seis caracteres. Letras y números.',
    rTerminos: 'Ya casi. Aceptá los términos y apretá el botón azul para terminar.',
  },
  bvIntro: 'Acá elegís cómo aparecer en Trabajos Cerca. Mi recomendación: empezá con una sola opción. Cuando tengas el perfil listo podés agregar más desde tu cuenta.',
  bvOpciones: {
    oficio:         '🔧 Ofrezco un oficio es para plomeros, electricistas, pintores, carpinteros y oficios similares.',
    profesional:    '👔 Soy profesional es para médicos, abogados, contadores, arquitectos y universitarios.',
    emprendimiento: '🚀 Tengo un emprendimiento es para locales, marcas, gastronomía o proyectos propios.',
    cv:             '📄 Busco trabajo te pone visible para que empresas y personas te encuentren y contraten.',
    empresa:        '🏢 Soy empresa o negocio es para publicar puestos y buscar empleados.',
    cliente:        '👤 Solo busco contratar es para quien necesita un profesional pero no va a ofrecer servicios.',
  },
  bvClienteTip:   'Perfecto. No necesitás foto ni más datos. Hacé clic en el botón para terminar el registro.',
  bvContinuarTip: 'Muy bien. Hacé clic en continuar y te llevo a completar tu perfil.',
  tipos: {
    oficio:         'Completá tu categoría, subí una foto tuya o de tu trabajo, tu ciudad y una descripción. Cuanto más completo, más clientes te encuentran.',
    profesional:    'Completá tu especialidad, una foto profesional, tu ciudad y una descripción de tu servicio.',
    cv:             'Completá tus datos, una foto y describí tu experiencia. Las empresas te van a poder encontrar.',
    empresa:        'Completá el nombre, el rubro, tu ciudad y una descripción para publicar búsquedas de empleados.',
    emprendimiento: 'Completá el nombre, una foto del producto o local, tu ciudad y una descripción atractiva.',
  },
  fotoTip:        'Subí una foto tuya o de tu trabajo. Es lo primero que ven los clientes y genera más confianza.',
  fotoClienteTip: 'La foto no es obligatoria si solo buscás contratar. Pero si la ponés, los profesionales te responden más.',
  descripTip:     'Describí en pocas palabras qué hacés. Eso es lo primero que ven los clientes.',
  ciudadTip:      'Indicá tu ciudad para aparecer en las búsquedas de tu zona.',
  guardaTip:      '¡Ya tenés todo! Apretá Guardar perfil y en segundos aparecés en el buscador.',
}

/* ─────────────────────────────────────────────────────
   ESTADO
───────────────────────────────────────────────────────*/
let _ayudando       = false
let _burbujaVisible = false
let _audioOn        = true
let _escuchaModo    = false   // true = escucha continua activa
let _recActivo      = false   // ¿SpeechRecognition corriendo ahora mismo?
let _hablando       = false   // ¿TTS activo ahora mismo?
let _vozElegida     = null
let _modoActual     = EN_REGISTRO ? 'registro' : EN_SERVICIO ? 'servicio' : 'perfil'

// Anti-duplicado: no repetir el mismo mensaje en menos de 4 segundos
let _ultimoMsg = ''; let _ultimoMsgTs = 0

/* ─────────────────────────────────────────────────────
   AVATAR SVG
───────────────────────────────────────────────────────*/
const AV = `<svg viewBox="0 0 120 130" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;">
  <ellipse cx="60" cy="118" rx="30" ry="18" fill="#6366f1"/>
  <rect x="53" y="95" width="14" height="12" rx="3" fill="#fbbf7a"/>
  <ellipse cx="60" cy="72" rx="26" ry="27" fill="#fbbf7a"/>
  <ellipse cx="60" cy="58" rx="28" ry="20" fill="#7c3aed"/>
  <ellipse cx="37" cy="75" rx="9" ry="16" fill="#7c3aed"/>
  <ellipse cx="83" cy="75" rx="9" ry="16" fill="#7c3aed"/>
  <ellipse cx="60" cy="48" rx="24" ry="10" fill="#7c3aed"/>
  <ellipse cx="50" cy="74" rx="4.5" ry="5" fill="white"/><ellipse cx="70" cy="74" rx="4.5" ry="5" fill="white"/>
  <circle cx="51" cy="75" r="2.8" fill="#1e293b"/><circle cx="71" cy="75" r="2.8" fill="#1e293b"/>
  <circle cx="52" cy="73.5" r=".9" fill="white"/><circle cx="72" cy="73.5" r=".9" fill="white"/>
  <path d="M45 68 Q50 65.5 55 67.5" stroke="#5b21b6" stroke-width="1.8" fill="none" stroke-linecap="round"/>
  <path d="M65 67.5 Q70 65.5 75 68" stroke="#5b21b6" stroke-width="1.8" fill="none" stroke-linecap="round"/>
  <ellipse cx="60" cy="82" rx="2.5" ry="1.8" fill="#f59e6a"/>
  <path d="M53 88 Q60 94 67 88" stroke="#c2410c" stroke-width="2" fill="none" stroke-linecap="round"/>
  <ellipse cx="44" cy="83" rx="5.5" ry="3.5" fill="#fca5a5" opacity=".45"/>
  <ellipse cx="76" cy="83" rx="5.5" ry="3.5" fill="#fca5a5" opacity=".45"/>
  <circle cx="85" cy="72" r="4.5" fill="#2563eb" opacity=".9"/><circle cx="85" cy="72" r="2.2" fill="#60a5fa"/>
  <text x="88" y="55" font-size="7" fill="#fbbf24">✦</text>
  <text x="22" y="61" font-size="5.5" fill="#a78bfa">✦</text>
</svg>`

/* ─────────────────────────────────────────────────────
   WIDGET
───────────────────────────────────────────────────────*/
function crearWidget(){
  const div = document.createElement('div')
  div.id = 'cami-widget'
  div.innerHTML = `
<style>
#cami-widget{position:fixed;top:68px;right:12px;z-index:10000;
  display:flex;flex-direction:column;align-items:flex-end;gap:7px;pointer-events:none;}
#cami-burbuja{
  background:white;border:2px solid #6366f1;border-radius:16px 4px 16px 16px;
  padding:11px 13px;font-size:13px;color:#1e293b;line-height:1.55;
  box-shadow:0 6px 24px rgba(99,102,241,.22);pointer-events:all;width:232px;
  opacity:0;transform:translateY(-8px) scale(.96);transition:opacity .25s,transform .25s;
}
#cami-burbuja.visible{opacity:1;transform:none;}
.cami-titulo{font-weight:800;color:#6366f1;font-size:11px;margin-bottom:5px;
  display:flex;align-items:center;justify-content:space-between;}
#cami-txt{font-size:13px;color:#374151;line-height:1.55;}
#cami-btns{display:flex;gap:6px;margin-top:9px;flex-wrap:wrap;}
#cami-btns button{flex:1;min-width:60px;padding:7px;border-radius:8px;
  font-size:12px;font-weight:700;cursor:pointer;border:none;transition:all .15s;}
.cb-si{background:#6366f1;color:white;}.cb-si:hover{background:#4f46e5;}
.cb-no{background:#f1f5f9;color:#64748b;}.cb-no:hover{background:#e2e8f0;}
.cb-mic{background:#fee2e2;color:#dc2626;min-width:34px!important;
  max-width:38px!important;padding:7px 9px!important;font-size:14px;}
.cb-mic.on{background:#dc2626;color:white;animation:cr .7s infinite;}
#cami-hint{font-size:10px;color:#94a3b8;margin-top:3px;font-style:italic;min-height:13px;}
#cami-audio-btn{cursor:pointer;border:none;background:transparent;
  font-size:13px;color:#94a3b8;padding:0;line-height:1;}
#cami-audio-btn:hover{color:#6366f1;}
#cami-av-wrap{position:relative;width:62px;height:72px;cursor:pointer;pointer-events:all;}
#cami-av{width:62px;height:72px;filter:drop-shadow(0 4px 12px rgba(99,102,241,.28));transition:transform .2s;}
#cami-av-wrap:hover #cami-av{transform:translateY(3px);}
.cami-badge{position:absolute;top:-3px;right:-3px;width:17px;height:17px;
  background:#6366f1;border-radius:50%;display:flex;align-items:center;
  justify-content:center;font-size:10px;border:2px solid white;animation:cr 2.2s infinite;}
@keyframes cr{0%,100%{box-shadow:0 0 0 0 rgba(99,102,241,.4);}55%{box-shadow:0 0 0 6px rgba(99,102,241,0);}}
#cami-widget.bv-mode{top:auto;bottom:12px;z-index:9999;}
#cami-widget.teclado-on #cami-burbuja{display:none!important;}
#cami-widget.teclado-on #cami-av-wrap{width:44px;height:51px;opacity:.75;}
@media(max-width:480px){
  #cami-widget{top:58px;right:6px;}
  #cami-burbuja{width:194px;font-size:12px;padding:9px 10px;}
  #cami-av-wrap,#cami-av{width:52px;height:60px;}
}
</style>
<div id="cami-burbuja">
  <div class="cami-titulo">
    <span>✨ <strong>Cami</strong></span>
    <button id="cami-audio-btn" onclick="_camiToggleAudio()" title="Activar/desactivar voz">🔊</button>
  </div>
  <div id="cami-txt">…</div>
  <div id="cami-btns"></div>
  <div id="cami-hint"></div>
</div>
<div id="cami-av-wrap" onclick="_cami.toggleBurbuja()" title="Cami">
  <div id="cami-av">${AV}</div>
  <div class="cami-badge">💬</div>
</div>`
  document.body.appendChild(div)
}

window._camiToggleAudio = function(){
  _audioOn = !_audioOn
  const b = document.getElementById('cami-audio-btn')
  if(b) b.textContent = _audioOn ? '🔊' : '🔇'
  if(!_audioOn) window.speechSynthesis?.cancel()
}
window._cami = { toggleBurbuja(){ _burbujaVisible ? cerrarBurbuja() : abrirBurbuja() } }

/* ─────────────────────────────────────────────────────
   TTS — SpeechSynthesis
───────────────────────────────────────────────────────*/
function cargarVoces(){
  const v = window.speechSynthesis?.getVoices() || []
  if(!v.length) return
  _vozElegida = [
    v.find(x => /google/i.test(x.name) && /es.AR/i.test(x.lang)),
    v.find(x => /google/i.test(x.name) && x.lang.startsWith('es')),
    v.find(x => /microsoft/i.test(x.name) && /sabina|elena|paloma|laura/i.test(x.name)),
    v.find(x => /microsoft/i.test(x.name) && x.lang.startsWith('es')),
    v.find(x => x.lang.startsWith('es') && /female|mujer|sabina|lucia|elena/i.test(x.name)),
    v.find(x => /es.AR/i.test(x.lang)),
    v.find(x => x.lang.startsWith('es')),
  ].find(Boolean) || null
}
if(window.speechSynthesis){
  speechSynthesis.onvoiceschanged = cargarVoces
  setTimeout(cargarVoces, 300)
  setTimeout(cargarVoces, 1200)
}

function hablar(txt, cb){
  if(!_audioOn || !window.speechSynthesis){ _hablando=false; if(cb) cb(); return }

  // Parar reconocimiento mientras habla (evita eco)
  if(_recActivo){ _pausarRec = true; try { _rec?.stop() } catch(e){} }

  speechSynthesis.cancel()
  _hablando = true

  const u = new SpeechSynthesisUtterance(txt)
  u.lang  = 'es-AR'
  u.rate  = 0.96
  u.pitch = 1.05
  if(_vozElegida) u.voice = _vozElegida

  // Chrome bug: pausa silenciosa cada ~15s → re-kick
  const kickTimer = setInterval(() => {
    if(speechSynthesis.speaking && !speechSynthesis.paused) return
    clearInterval(kickTimer)
  }, 5000)

  u.onend = u.onerror = () => {
    clearInterval(kickTimer)
    _hablando = false
    _pausarRec = false
    if(cb) cb()
    // Reanudar escucha después de hablar
    if(_escuchaModo && !_recActivo) setTimeout(arrancarRec, 400)
  }

  try { speechSynthesis.speak(u) }
  catch(e){ _hablando=false; if(cb) cb() }
}

/* ─────────────────────────────────────────────────────
   STT — SpeechRecognition continuo y robusto
───────────────────────────────────────────────────────*/
const SR = window.SpeechRecognition || window.webkitSpeechRecognition
let _rec = null
let _pausarRec = false   // pausa mientras Cami habla
let _restartTimer = null

function arrancarRec(){
  if(!SR || _recActivo || _hablando || _pausarRec) return
  clearTimeout(_restartTimer)
  _recActivo = true
  _rec = new SR()
  _rec.lang = 'es-AR'
  _rec.continuous = true        // ← no se cuelga entre frases
  _rec.interimResults = false
  _rec.maxAlternatives = 1

  _rec.onstart = () => hint('🎤 Escuchando…')

  _rec.onresult = e => {
    // Tomar solo el último resultado final
    for(let i = e.resultIndex; i < e.results.length; i++){
      if(e.results[i].isFinal){
        const dicho = e.results[i][0].transcript.trim()
        if(dicho.length > 1){
          hint('✓ "' + dicho + '"')
          procesarVoz(dicho.toLowerCase())
        }
      }
    }
  }

  _rec.onerror = err => {
    _recActivo = false
    if(err.error === 'not-allowed'){
      hint('🔒 Permití el micrófono en el navegador')
      _escuchaModo = false
      return
    }
    // Auto-reintentar si sigue en modo escucha y no está hablando
    if(_escuchaModo && !_hablando && !_pausarRec){
      _restartTimer = setTimeout(arrancarRec, 1000)
    }
  }

  _rec.onend = () => {
    _recActivo = false
    if(_escuchaModo && !_hablando && !_pausarRec){
      _restartTimer = setTimeout(arrancarRec, 600)
    } else {
      hint('')
    }
  }

  try { _rec.start() }
  catch(e){ _recActivo = false; hint('') }
}

function detenerRec(){
  _escuchaModo = false
  _recActivo   = false
  clearTimeout(_restartTimer)
  try { _rec?.stop() } catch(e){}
  hint('')
}

function toggleMic(){
  if(_escuchaModo){ detenerRec() }
  else { _escuchaModo = true; arrancarRec() }
}

function btnMicOn(on){
  const b = document.getElementById('cb-mic')
  if(b) on ? b.classList.add('on') : b.classList.remove('on')
}
// Sincronizar badge visual con estado real
setInterval(() => btnMicOn(_recActivo), 800)

/* ─────────────────────────────────────────────────────
   PROCESAMIENTO DE VOZ
───────────────────────────────────────────────────────*/
function procesarVoz(txt){
  if(!_ayudando){
    if(/\bsí\b|si\b|dale|claro|ayud|bueno|obvio|quiero/i.test(txt)){ aceptarAyuda(); return }
    if(/\bno\b|gracias|ya s[eé]|estoy bien/i.test(txt))            { rechazarAyuda(); return }
  }

  if(_modoActual === 'bv'){
    const op = detectarOpcionBV(txt)
    if(op){ explicarOpcionBV(op); return }
    if(/continu|siguient|listo|ya elegí|seguir/i.test(txt)){ document.getElementById('bv-btn')?.click(); return }
  }

  if(_modoActual === 'servicio'){
    const t = detectarTipo(txt)
    if(t){ seleccionarTipo(t); return }
  }

  // Navegación por campos (registro / servicio)
  if(/\bnombre\b/i.test(txt))               { document.getElementById('rNombre')?.focus();    return }
  if(/apellido/i.test(txt))                 { document.getElementById('rApellido')?.focus();  return }
  if(/\bemail\b|correo/i.test(txt))         { document.getElementById('rEmail')?.focus();     return }
  if(/tel[eé]fono|whatsapp|\bcel\b/i.test(txt)){ document.getElementById('rTelefono')?.focus(); return }
  if(/contraseña|clave|password/i.test(txt)){ document.getElementById('rPass')?.focus();      return }

  // Tipo en registro
  const t = detectarTipo(txt)
  if(t){ decir('Anotado. Cuando llegues al perfil elegís ' + t + '. Por ahora terminemos el registro.'); return }
}

function detectarOpcionBV(txt){
  if(/(electricista|plomer|alban|pintor|gasista|carpintero|jardinero|oficio|técnico|mecán)/i.test(txt)) return 'oficio'
  if(/(m[eé]dico|abogad|contador|psic|arquitecto|ingeniero|profesional|universitari)/i.test(txt))       return 'profesional'
  if(/(emprendimiento|emprendedor|negocio|marca|local|gastronom)/i.test(txt))                            return 'emprendimiento'
  if(/(cv|currículum|busco trabajo|empleo)/i.test(txt))                                                  return 'cv'
  if(/(empresa|comercio|contratar empleado)/i.test(txt))                                                 return 'empresa'
  if(/(cliente|solo busco|contratar|busco profesional)/i.test(txt))                                     return 'cliente'
  return null
}

function detectarTipo(txt){
  if(/(electricista|electricidad|plomer|alban[ií]l|pintor|gasista|carpintero|jardinero|oficio|técnico|mecán)/i.test(txt)) return 'oficio'
  if(/(m[eé]dico|doctor|abogad|contador|psic[oó]log|arquitecto|ingeniero|profesional)/i.test(txt)) return 'profesional'
  if(/(emprendimiento|emprendedor|negocio|marca)/i.test(txt)) return 'emprendimiento'
  if(/(empresa|comercio)/i.test(txt)) return 'empresa'
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

function explicarOpcionBV(op){
  const msg = T.bvOpciones[op] || ''
  if(!msg) return
  decir(msg)
  if(window._bvToggle) window._bvToggle(op)
}

/* ─────────────────────────────────────────────────────
   UI
───────────────────────────────────────────────────────*/
function decir(txt, btns){
  const ahora = Date.now()
  // Anti-duplicado: misma frase en < 4 segundos → ignorar
  if(txt === _ultimoMsg && ahora - _ultimoMsgTs < 4000) return
  _ultimoMsg = txt; _ultimoMsgTs = ahora

  document.getElementById('cami-txt').textContent = txt
  document.getElementById('cami-btns').innerHTML = btns !== undefined ? btns : btnMic()
  abrirBurbuja()
  hablar(txt)
}

function hint(t){ const e = document.getElementById('cami-hint'); if(e) e.textContent = t }
function abrirBurbuja(){ document.getElementById('cami-burbuja')?.classList.add('visible'); _burbujaVisible=true }
function cerrarBurbuja(){ document.getElementById('cami-burbuja')?.classList.remove('visible'); _burbujaVisible=false }

function btnSiNo(){
  return `<button class="cb-si" onclick="aceptarAyuda()">👍 Sí</button>
          <button class="cb-no" onclick="rechazarAyuda()">No, gracias</button>`
}
function btnMic(){
  return SR ? `<button id="cb-mic" class="cb-mic" onclick="toggleMic()" title="Micrófono">🎤</button>` : ''
}

/* ─────────────────────────────────────────────────────
   ACEPTAR / RECHAZAR
───────────────────────────────────────────────────────*/
window.aceptarAyuda = function(){
  _ayudando = true; _escuchaModo = true
  let txt
  if(_modoActual === 'registro')  txt = T.siAyuda + ' ' + T.micInfo
  else if(_modoActual === 'bv')   txt = T.bvIntro
  else                             txt = 'Bárbaro. Completá los datos y yo te guío en cada paso. ' + T.micInfo
  document.getElementById('cami-txt').textContent = txt
  document.getElementById('cami-btns').innerHTML = btnMic()
  hablar(txt)
  if(EN_REGISTRO) setTimeout(() => document.getElementById('rNombre')?.focus(), 600)
  // Pre-tip del tipo si viene de bienvenida
  if(_modoActual === 'servicio'){
    const tipo = new URLSearchParams(location.search).get('tipo')
    if(tipo && T.tipos[tipo]) setTimeout(() => decir(T.tipos[tipo]), 3500)
  }
}

window.rechazarAyuda = function(){
  _ayudando = false; detenerRec()
  decir(T.noAyuda, btnMic())
  setTimeout(cerrarBurbuja, 3800)
}

/* ─────────────────────────────────────────────────────
   BIND — registro.html
───────────────────────────────────────────────────────*/
function bindRegistro(){
  let _campoActual = ''
  Object.entries(T.campo).forEach(([id, msg]) => {
    document.getElementById(id)?.addEventListener('focus', () => {
      if(!_ayudando || _campoActual === id) return
      _campoActual = id
      decir(msg)
    })
    document.getElementById(id)?.addEventListener('blur', () => {
      if(_campoActual === id) _campoActual = ''
    })
  })
  document.getElementById('rTerminos')?.addEventListener('change', e => {
    if(_ayudando && e.target.checked) decir('¡Perfecto! Apretá "Registrarme gratis" y ya estás dentro.')
  })
  document.querySelector('.btn-google')?.addEventListener('click', () => {
    if(_ayudando) decir('Buena elección. Con Google es más rápido.')
  })
}

/* ─────────────────────────────────────────────────────
   BIND — perfil.html (bienvenida overlay)
───────────────────────────────────────────────────────*/
window._camiActivarBienvenida = function(){
  _modoActual = 'bv'
  document.getElementById('cami-widget')?.classList.add('bv-mode')

  // Escuchar clicks en opciones
  setTimeout(() => {
    document.querySelectorAll('.bv-op').forEach(el => {
      el.addEventListener('click', () => {
        if(!_ayudando) return
        const id  = el.id.replace('bvop-', '')
        const msg = id === 'cliente' ? T.bvClienteTip : (T.bvOpciones[id] || '')
        if(msg) setTimeout(() => decir(msg), 250)
      })
    })
  }, 600)

  const txt = YA_SALUDE ? T.saludoCorto : T.saludo
  setTimeout(() => {
    document.getElementById('cami-txt').textContent = txt
    document.getElementById('cami-btns').innerHTML = btnSiNo()
    abrirBurbuja(); _escuchaModo = true; hablar(txt)
    marcarSaludo()
  }, 700)
}

/* ─────────────────────────────────────────────────────
   BIND — perfil_servicio.html
───────────────────────────────────────────────────────*/
function bindServicio(){
  // Selector tipo
  const sel = document.getElementById('selectorTipo')
  if(sel){
    sel.addEventListener('focus', () => { if(_ayudando) decir(T.tipoIntro || 'Elegí el tipo de perfil en la lista.') })
    sel.addEventListener('change', () => {
      if(_ayudando && T.tipos[sel.value]) decir(T.tipos[sel.value])
    })
  }

  // Foto — SOLO un listener en inputFoto para evitar duplicado
  let _fotoMsgDado = false
  document.getElementById('inputFoto')?.addEventListener('change', () => {
    if(!_ayudando || _fotoMsgDado) return
    _fotoMsgDado = true
    const tipo = new URLSearchParams(location.search).get('tipo') || ''
    decir(tipo === 'cliente' ? T.fotoClienteTip : T.fotoTip)
    setTimeout(() => { _fotoMsgDado = false }, 5000)
  })

  // Campos con debounce por campo
  let _campoSvc = ''
  const camposFocus = [
    [['localidad','ciudad','rLocalidad'], T.ciudadTip],
    [['descripcion','descripcion2','titulo','descripcionEmp'], T.descripTip],
  ]
  camposFocus.forEach(([ids, msg]) => {
    ids.forEach(id => {
      document.getElementById(id)?.addEventListener('focus', () => {
        if(!_ayudando || _campoSvc === id) return
        _campoSvc = id
        decir(msg)
      })
      document.getElementById(id)?.addEventListener('blur', () => { if(_campoSvc===id) _campoSvc='' })
    })
  })

  // Botón guardar
  document.querySelectorAll('button[type="submit"],[onclick*="guardar"]').forEach(btn => {
    btn.addEventListener('click', () => { if(_ayudando) setTimeout(() => decir(T.guardaTip), 400) })
  })
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
    if(window.innerHeight < altH * 0.72){ w.classList.add('teclado-on'); detenerRec() }
    else { w.classList.remove('teclado-on'); altH = window.innerHeight }
  })
}

/* ─────────────────────────────────────────────────────
   INIT
───────────────────────────────────────────────────────*/
function mostrarSaludo(delay){
  const txt = YA_SALUDE ? T.saludoCorto : T.saludo
  setTimeout(() => {
    document.getElementById('cami-txt').textContent = txt
    document.getElementById('cami-btns').innerHTML = btnSiNo()
    abrirBurbuja(); _escuchaModo = true
    hablar(txt)
    marcarSaludo()
  }, delay)
}

function init(){
  crearWidget()
  bindTeclado()

  if(EN_REGISTRO){
    _modoActual = 'registro'
    bindRegistro()
    mostrarSaludo(1800)
  } else if(EN_SERVICIO){
    _modoActual = 'servicio'
    bindServicio()
    mostrarSaludo(1200)
  } else if(EN_PERFIL){
    _modoActual = 'perfil'
    // No hace nada hasta que perfil.js llame _camiActivarBienvenida()
  }
}

if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init)
else init()

})()
