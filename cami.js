/*  ══════════════════════════════════════════════════════
    CAMI — Asistente IA · Trabajos Cerca
    Funciona en: registro.html  +  perfil_servicio.html
    ══════════════════════════════════════════════════════ */
;(function(){
'use strict'

/* ─────────────────────────────────────────────────────
   TEXTOS  (tono pampeano — tuteo argentino casual)
───────────────────────────────────────────────────────*/
const T = {
  saludo:    '¡Hola! Soy Cami, tu asistente de Trabajos Cerca. ¿Querés que te ayude a registrarte?',
  siAyuda:   'Dale, arranquemos. Hacé clic en el primer campo y yo te voy guiando.',
  noAyuda:   '¡Genial, qué bueno que sabés cómo hacerlo! Cualquier cosa estoy acá.',
  micInfo:   'También podés hablarme. Decime qué oficio o profesión tenés.',
  exito:     '¡Listo! Cuenta creada. Ahora revisá tu correo para activarla.',
  google:    'Buena elección. Con Google es más rápido, solo confirmá tu cuenta.',
  campo: {
    rNombre:   'Escribí tu nombre, el que usás normalmente.',
    rApellido: 'Ahora el apellido, tal cual figura en el DNI.',
    rEmail:    'El email lo vas a usar para entrar. Tiene que ser uno que uses seguido.',
    rTelefono: 'El número de WhatsApp, sin el cero ni el quince. Por ejemplo: 2214561234.',
    rPass:     'Elegí una contraseña de al menos seis caracteres. Combiná letras y números.',
    rTerminos: 'Ya casi terminamos. Aceptá los términos y después apretá el botón azul.',
  },
  tipoIntro: '¡Bienvenido! Ahora elegís cómo querés aparecer en Trabajos Cerca. ¿Qué sos vos?',
  tipos: {
    oficio:         'Perfecto. Seleccioná "Como oficio" y completá tus datos. Cuanto más completo, más clientes.',
    profesional:    'Buenísimo. Elegí "Como profesional" y completá tu especialidad.',
    cv:             'Entendido. Seleccioná "Busco empleo" y armamos tu CV juntos.',
    empresa:        'Genial. Elegí "Soy empresa o comercio" y publicás tus búsquedas.',
    emprendimiento: '¡Qué bueno! Elegí "Tengo un emprendimiento" y mostrás tu proyecto.',
  },
  fotoTip:   'Subí una foto clara tuya o de tu logo. Es lo primero que ven los clientes.',
  descripTip:'Describí lo que hacés en pocas palabras. Eso es lo primero que ven los clientes.',
  ciudadTip: 'Indicá tu ciudad para que te encuentren los clientes de tu zona.',
  guardaTip: 'Ya tenés todo. Apretá "Guardar perfil" y ya aparecés en el buscador.',
}

/* ─────────────────────────────────────────────────────
   DETECCIÓN DE PÁGINA
───────────────────────────────────────────────────────*/
const EN_REGISTRO = !!document.getElementById('formReg')
const EN_SERVICIO = !!document.getElementById('selectorTipo')
if(!EN_REGISTRO && !EN_SERVICIO) return

/* ─────────────────────────────────────────────────────
   ESTADO
───────────────────────────────────────────────────────*/
let _ayudando       = false
let _burbujaVisible = false
let _audioOn        = true
let _escuchaModo    = false
let _escuchando     = false
let _vozElegida     = null

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
   CREAR WIDGET  — posición ARRIBA a la derecha
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
.cami-titulo-left{display:flex;align-items:center;gap:4px;}
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
#cami-widget.teclado-on #cami-av{width:44px;height:51px;opacity:.75;}
@media(max-width:480px){
  #cami-widget{top:58px;right:6px;}
  #cami-burbuja{width:192px;font-size:12px;padding:9px 10px;}
  #cami-av-wrap,#cami-av{width:52px;height:60px;}
}
</style>

<div id="cami-burbuja">
  <div class="cami-titulo">
    <span class="cami-titulo-left">✨ <strong>Cami</strong></span>
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
   VOZ — síntesis (prioriza Google Neural, luego Microsoft)
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
    hint(err.error === 'not-allowed' ? '🔒 Permití el micrófono en el navegador' : '')
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
   PROCESAMIENTO DE VOZ
───────────────────────────────────────────────────────*/
function procesarVoz(txt){
  if(!_ayudando){
    if(/s[ií]|dale|buen|claro|ayud|obvio/i.test(txt)){ aceptarAyuda(); return }
    if(/no\b|gracias|solo|ya s[eé]/i.test(txt)){ rechazarAyuda(); return }
  }
  if(EN_SERVICIO){
    const t = detectarTipo(txt)
    if(t){ seleccionarTipo(t); return }
  }
  if(/nombre/i.test(txt))                  { document.getElementById('rNombre')?.focus(); return }
  if(/apellido/i.test(txt))                { document.getElementById('rApellido')?.focus(); return }
  if(/email|correo/i.test(txt))            { document.getElementById('rEmail')?.focus(); return }
  if(/tel[eé]fono|whatsapp|cel/i.test(txt)){ document.getElementById('rTelefono')?.focus(); return }
  if(/contraseña|clave/i.test(txt))        { document.getElementById('rPass')?.focus(); return }
  const t = detectarTipo(txt)
  if(t){ decir('Anotado. Cuando llegues al perfil elegís ' + t + '. Por ahora terminemos el registro.'); return }
  decir('No te entendí bien. Seguí completando y cualquier duda me preguntás.')
}

function detectarTipo(txt){
  if(/(electricista|electricidad)/i.test(txt)) return 'oficio'
  if(/(plomer)/i.test(txt))                   return 'oficio'
  if(/(alban[ií]l|construcci)/i.test(txt))    return 'oficio'
  if(/(pintor|pintura)/i.test(txt))           return 'oficio'
  if(/(gasista)/i.test(txt))                  return 'oficio'
  if(/(carpintero)/i.test(txt))               return 'oficio'
  if(/(jardinero)/i.test(txt))               return 'oficio'
  if(/(oficio|técnico|mecán)/i.test(txt))     return 'oficio'
  if(/(m[eé]dico|doctor|medicina)/i.test(txt))return 'profesional'
  if(/(abogad)/i.test(txt))                   return 'profesional'
  if(/(contador|contabilidad)/i.test(txt))    return 'profesional'
  if(/(psic[oó]log)/i.test(txt))              return 'profesional'
  if(/(arquitecto|ingeniero)/i.test(txt))     return 'profesional'
  if(/(profesional)/i.test(txt))              return 'profesional'
  if(/(emprendimiento|emprendedor|negocio|marca)/i.test(txt)) return 'emprendimiento'
  if(/(empresa|comercio|empleado|contratar)/i.test(txt))      return 'empresa'
  if(/(cv|currículum|empleo|trabajo\s+busc)/i.test(txt))      return 'cv'
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

function hint(txt){
  const el = document.getElementById('cami-mic-hint')
  if(el) el.textContent = txt
}

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
  return `<button class="cb-si" onclick="aceptarAyuda()">👍 Sí, ayudame</button>
          <button class="cb-no" onclick="rechazarAyuda()">No, gracias</button>`
}
function btnMic(){
  return SR ? `<button id="cb-mic" class="cb-mic" onclick="toggleMic()" title="Hablar con Cami">🎤</button>` : ''
}

window.aceptarAyuda = function(){
  _ayudando=true; _escuchaModo=true
  const txt = T.siAyuda + ' ' + T.micInfo
  document.getElementById('cami-txt').textContent = txt
  document.getElementById('cami-btns').innerHTML = btnMic()
  hablar(txt)
  if(EN_REGISTRO) document.getElementById('rNombre')?.focus()
}

window.rechazarAyuda = function(){
  _ayudando=false; _escuchaModo=false
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
    if(_ayudando){ document.getElementById('cami-txt').textContent = T.google; hablar(T.google) }
  })
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
  document.getElementById('inputFoto')?.addEventListener('change', () => { if(_ayudando) decir(T.fotoTip) })
  document.getElementById('fotoCircle')?.addEventListener('click', () => { if(_ayudando) decir(T.fotoTip) })
  document.querySelectorAll('button[type="submit"],[onclick*="guardar"]').forEach(btn => {
    btn.addEventListener('click', () => { if(_ayudando) setTimeout(() => decir(T.guardaTip), 300) })
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
    if(window.innerHeight < altH * 0.72){ w.classList.add('teclado-on'); detenerEscucha() }
    else { w.classList.remove('teclado-on'); altH = window.innerHeight }
  })
}

/* ─────────────────────────────────────────────────────
   INIT
───────────────────────────────────────────────────────*/
function init(){
  crearWidget(); bindTeclado()
  if(EN_REGISTRO) bindRegistro()
  if(EN_SERVICIO) bindServicio()
  setTimeout(() => {
    document.getElementById('cami-txt').textContent = T.saludo
    document.getElementById('cami-btns').innerHTML = btnSiNo()
    abrirBurbuja(); _escuchaModo=true; hablar(T.saludo)
  }, EN_SERVICIO ? 1200 : 1800)
}

if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init)
else init()

})()
