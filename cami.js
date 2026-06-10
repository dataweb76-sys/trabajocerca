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
  // Registro
  saludo:    '¡Hola! Soy Cami, tu asistente de Trabajos Cerca. ¿Querés que te ayude a registrarte?',
  siAyuda:   'Dale, arranquemos. Hacé clic en el primer campo y yo te voy guiando.',
  noAyuda:   '¡Genial, qué bueno que sabés cómo hacerlo! Cualquier cosa estoy acá.',
  micInfo:   'También podés hablarme. Decime qué oficio o profesión tenés.',
  exito:     '¡Listo! Cuenta creada. Ahora revisá tu correo para activarla.',
  google:    'Buena elección. Con Google es más rápido, solo confirmá tu cuenta.',

  // Guía por campo
  campo: {
    rNombre:   'Escribí tu nombre, el que usás normalmente.',
    rApellido: 'Ahora el apellido, tal cual figura en el DNI.',
    rEmail:    'El email lo vas a usar para entrar. Tiene que ser uno que uses.',
    rTelefono: 'El número de WhatsApp, sin el cero ni el quince. Por ejemplo: 2214561234.',
    rPass:     'Elegí una contraseña de al menos seis caracteres. Combiná letras y números.',
    rTerminos: 'Ya casi terminamos. Aceptá los términos y después apretá el botón azul.',
  },

  // perfil_servicio — selector de tipo
  tipoIntro: '¡Bienvenido! Ahora elegís cómo querés aparecer en Trabajos Cerca. ¿Qué sos vos?',
  tipos: {
    oficio:         'Perfecto. Elegí "Como oficio" en la lista y completá tus datos. Cuanto más completo, más clientes.',
    profesional:    'Buenísimo. Elegí "Como profesional" y completá tu especialidad.',
    cv:             'Entendido. Seleccioná "Busco empleo" y armamos tu CV juntos.',
    empresa:        'Genial. Elegí "Soy empresa o comercio" y publicás tus búsquedas.',
    emprendimiento: 'Qué bueno. Elegí "Tengo un emprendimiento" y mostrás tu proyecto.',
  },
  fotoTip:      'Subí una foto clara tuya o de tu logo. Aparece en los resultados y ayuda a que te elijan.',
  categoriaTip: 'Elegí la categoría que más te define. Podés agregar varias especialidades.',
  descripTip:   'Describí lo que hacés en pocas palabras. Eso es lo primero que ven los clientes.',
  ciudadTip:    'Indicá tu ciudad para que te encuentren los clientes de tu zona.',
  guardaTip:    'Ya tenés todo. Apretá "Guardar perfil" y ya aparecés en el buscador.',
}

/* ─────────────────────────────────────────────────────
   DETECCIÓN DE PÁGINA
───────────────────────────────────────────────────────*/
const EN_REGISTRO  = !!document.getElementById('formReg')
const EN_SERVICIO  = !!document.getElementById('selectorTipo')
if(!EN_REGISTRO && !EN_SERVICIO) return   // no carga en otras páginas

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
  <path id="cami-boca" d="M53 88 Q60 94 67 88" stroke="#c2410c" stroke-width="2" fill="none" stroke-linecap="round"/>
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
function crearWidget() {
  const div = document.createElement('div')
  div.id = 'cami-widget'
  div.innerHTML = `
<style>
#cami-widget{
  position:fixed; bottom:14px; right:12px;
  z-index:10000;
  display:flex; flex-direction:column; align-items:flex-end; gap:8px;
  pointer-events:none;
}
/* Burbuja */
#cami-burbuja{
  background:white; border:2px solid #6366f1;
  border-radius:16px 16px 4px 16px;
  padding:12px 14px; max-width:230px;
  font-size:13px; color:#1e293b; line-height:1.55;
  box-shadow:0 6px 24px rgba(99,102,241,.22);
  pointer-events:all;
  opacity:0; transform:translateY(8px) scale(.96);
  transition:opacity .28s ease,transform .28s ease;
  /* Nunca sobre un campo enfocado — ajuste dinámico via JS */
}
#cami-burbuja.visible{opacity:1;transform:translateY(0) scale(1);}
.cami-titulo{font-weight:800;color:#6366f1;font-size:12px;margin-bottom:5px;display:flex;align-items:center;gap:4px;}
.cami-texto{font-size:13px;color:#374151;line-height:1.55;}
#cami-btns{display:flex;gap:6px;margin-top:9px;flex-wrap:wrap;}
#cami-btns button{flex:1;min-width:72px;padding:7px 8px;border-radius:8px;
  font-size:12px;font-weight:700;cursor:pointer;border:none;transition:all .15s;}
.cb-si{background:#6366f1;color:white;} .cb-si:hover{background:#4f46e5;}
.cb-no{background:#f1f5f9;color:#64748b;} .cb-no:hover{background:#e2e8f0;}
.cb-mic{background:#fee2e2;color:#dc2626;padding:7px 10px !important;font-size:15px;}
.cb-mic.on{background:#dc2626;color:white;animation:cami-ring .7s infinite;}
.cami-mic-hint{font-size:10px;color:#94a3b8;margin-top:4px;font-style:italic;min-height:14px;}
/* Estado escucha */
#cami-escucha-overlay{
  display:none; position:fixed; inset:0; z-index:9998;
  background:rgba(99,102,241,.06);
  pointer-events:none;
}
#cami-escucha-overlay.activo{display:block;}
/* Avatar */
#cami-av{
  width:68px; height:78px; position:relative; cursor:pointer;
  pointer-events:all;
  filter:drop-shadow(0 4px 12px rgba(99,102,241,.28));
  transform:translateY(0);
  transition:transform .2s ease,width .2s,height .2s,opacity .2s;
}
#cami-av:hover{transform:translateY(-3px);}
.cami-badge{
  position:absolute;top:-3px;right:-3px;
  width:18px;height:18px;background:#6366f1;
  border-radius:50%;display:flex;align-items:center;
  justify-content:center;font-size:10px;border:2px solid white;
  animation:cami-ring 2.2s infinite;
}
@keyframes cami-ring{0%,100%{box-shadow:0 0 0 0 rgba(99,102,241,.4);}55%{box-shadow:0 0 0 5px rgba(99,102,241,0);}}
/* Teclado virtual abierto → solo avatar chico */
#cami-widget.teclado-on #cami-burbuja{display:none!important;}
#cami-widget.teclado-on #cami-av{width:46px;height:52px;opacity:.8;}
/* Mobile */
@media(max-width:480px){
  #cami-burbuja{max-width:185px;font-size:12px;padding:10px 11px;}
  #cami-av{width:58px;height:67px;}
}
</style>

<div id="cami-escucha-overlay"></div>

<div id="cami-burbuja">
  <div class="cami-titulo">✨ Cami · Asistente</div>
  <div class="cami-texto" id="cami-txt">…</div>
  <div id="cami-btns"></div>
  <div class="cami-mic-hint" id="cami-mic-hint"></div>
</div>

<div id="cami-av" onclick="_cami.toggleBurbuja()" title="Cami · Asistente">
  ${AVATAR_SVG}
  <div class="cami-badge">💬</div>
</div>`
  document.body.appendChild(div)
}

/* ─────────────────────────────────────────────────────
   VOZ — síntesis
───────────────────────────────────────────────────────*/
let _vozElegida = null
function cargarVoces(){
  const voces = speechSynthesis.getVoices()
  const es = voces.filter(v => v.lang.startsWith('es'))
  // Intentar voz argentina femenina
  _vozElegida =
    es.find(v => /es-AR/i.test(v.lang) && /female|mujer|sabina|valeria|paulina|lucia|monica/i.test(v.name)) ||
    es.find(v => /es-AR/i.test(v.lang)) ||
    es.find(v => /female|mujer/i.test(v.name)) ||
    es[0] || null
}
speechSynthesis.onvoiceschanged = cargarVoces
setTimeout(cargarVoces, 300)

let _hablandoTimer = null
function hablar(txt, cb){
  if(!window.speechSynthesis) { if(cb) cb(); return }
  speechSynthesis.cancel()
  clearTimeout(_hablandoTimer)
  const u = new SpeechSynthesisUtterance(txt)
  u.lang  = 'es-AR'
  u.rate  = 1.08
  u.pitch = 1.12
  if(_vozElegida) u.voice = _vozElegida
  const av = document.getElementById('cami-av')
  if(av) av.classList.add('habla')
  u.onend = () => {
    if(av) av.classList.remove('habla')
    // Iniciar escucha automática después de hablar
    if(_escuchaModo) setTimeout(iniciarEscucha, 400)
    if(cb) cb()
  }
  // Workaround Chrome bug: re-trigger si se cuelga
  _hablandoTimer = setTimeout(() => {
    if(speechSynthesis.speaking) { speechSynthesis.cancel(); if(cb) cb() }
  }, 12000)
  speechSynthesis.speak(u)
}

/* ─────────────────────────────────────────────────────
   VOZ — reconocimiento (SpeechRecognition)
───────────────────────────────────────────────────────*/
const SR = window.SpeechRecognition || window.webkitSpeechRecognition
let _rec = null
let _escuchando = false
let _escuchaModo = false   // true = escucha continua activa

function iniciarEscucha(){
  if(!SR){ hint('Tu navegador no soporta el micrófono 😕'); return }
  if(_escuchando) return
  _escuchando = true
  _rec = new SR()
  _rec.lang = 'es-AR'
  _rec.continuous = false
  _rec.interimResults = false
  _rec.onstart = () => {
    document.getElementById('cami-escucha-overlay')?.classList.add('activo')
    hint('🎤 Escuchando…')
    const btn = document.getElementById('cb-mic')
    if(btn) btn.classList.add('on')
  }
  _rec.onresult = e => {
    const dicho = e.results[0][0].transcript.trim()
    hint('✓ "' + dicho + '"')
    procesarVoz(dicho.toLowerCase())
  }
  _rec.onerror = err => {
    hint(err.error === 'not-allowed' ? '🔒 Permití el micrófono en el navegador' : '')
    detenerEscucha()
  }
  _rec.onend = () => detenerEscucha()
  try { _rec.start() } catch(e){ _escuchando = false }
}

function detenerEscucha(){
  _escuchando = false
  document.getElementById('cami-escucha-overlay')?.classList.remove('activo')
  const btn = document.getElementById('cb-mic')
  if(btn) btn.classList.remove('on')
  try { _rec?.stop() } catch(e){}
}

function toggleMic(){
  if(_escuchando){ _escuchaModo = false; detenerEscucha(); hint('') }
  else { _escuchaModo = true; iniciarEscucha() }
}

/* ─────────────────────────────────────────────────────
   PROCESAMIENTO DE VOZ
───────────────────────────────────────────────────────*/
function procesarVoz(txt){
  // ¿Responde al saludo?
  if(!_ayudando){
    if(/s[ií]|dale|buen|claro|ayud|sí/i.test(txt)){
      aceptarAyuda(); return
    }
    if(/no\b|gracias|solo|sé/i.test(txt)){
      rechazarAyuda(); return
    }
  }

  // Detectar tipo en perfil_servicio
  if(EN_SERVICIO){
    const t = detectarTipo(txt)
    if(t){
      seleccionarTipo(t)
      return
    }
  }

  // Detectar campo a completar
  if(/nombre/i.test(txt))          { document.getElementById('rNombre')?.focus(); return }
  if(/apellido/i.test(txt))        { document.getElementById('rApellido')?.focus(); return }
  if(/email|correo/i.test(txt))    { document.getElementById('rEmail')?.focus(); return }
  if(/tel[eé]fono|whatsapp|cel/i.test(txt)) { document.getElementById('rTelefono')?.focus(); return }
  if(/contraseña|clave/i.test(txt)){ document.getElementById('rPass')?.focus(); return }

  // Tipo desde registro
  const t = detectarTipo(txt)
  if(t){
    const msg = 'Anotado. Cuando llegues a "Mi servicio" elegís ' + t + '. Por ahora terminemos el registro.'
    decir(msg)
    return
  }

  // Fallback
  decir('Perdoná, no te entendí bien. Seguí completando los campos y cualquier duda me preguntás.')
}

function detectarTipo(txt){
  if(/(electricista|electricidad)/i.test(txt)) return 'oficio'
  if(/(plomer)/i.test(txt))                   return 'oficio'
  if(/(alban[ií]l|construcci)/i.test(txt))    return 'oficio'
  if(/(pintor|pintura)/i.test(txt))           return 'oficio'
  if(/(gasista)/i.test(txt))                  return 'oficio'
  if(/(carpintero)/i.test(txt))               return 'oficio'
  if(/(jardinero)/i.test(txt))                return 'oficio'
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
  const msg = T.tipos[tipo] || 'Perfecto, completá los datos del formulario.'
  decir(msg)
}

/* ─────────────────────────────────────────────────────
   UI HELPERS
───────────────────────────────────────────────────────*/
let _burbujaVisible = false
let _ayudando = false

function decir(txt, btns){
  document.getElementById('cami-txt').textContent = txt
  document.getElementById('cami-btns').innerHTML = btns || btnMic()
  abrirBurbuja()
  hablar(txt)
}

function hint(txt){
  const el = document.getElementById('cami-mic-hint')
  if(el) el.textContent = txt
}

function abrirBurbuja(){
  const b = document.getElementById('cami-burbuja')
  if(b) b.classList.add('visible')
  _burbujaVisible = true
  ajustarPosicion()
}

function cerrarBurbuja(){
  const b = document.getElementById('cami-burbuja')
  if(b) b.classList.remove('visible')
  _burbujaVisible = false
}

window._cami = {
  toggleBurbuja(){ _burbujaVisible ? cerrarBurbuja() : abrirBurbuja() }
}

/* ── Botones ── */
function btnSiNo(){
  return `<button class="cb-si" onclick="aceptarAyuda()">👍 Sí, ayudame</button>
          <button class="cb-no" onclick="rechazarAyuda()">No, gracias</button>`
}
function btnMic(){
  if(!SR) return ''
  return `<button id="cb-mic" class="cb-mic" onclick="toggleMic()" title="Hablar con Cami">🎤</button>`
}

window.aceptarAyuda = function(){
  _ayudando = true
  _escuchaModo = true
  const txt = T.siAyuda + ' ' + T.micInfo
  document.getElementById('cami-txt').textContent = txt
  document.getElementById('cami-btns').innerHTML = btnMic()
  hablar(txt)
  if(EN_REGISTRO) document.getElementById('rNombre')?.focus()
}

window.rechazarAyuda = function(){
  _ayudando = false
  _escuchaModo = false
  document.getElementById('cami-txt').textContent = T.noAyuda
  document.getElementById('cami-btns').innerHTML = btnMic()
  hablar(T.noAyuda)
  setTimeout(cerrarBurbuja, 3500)
}

/* ─────────────────────────────────────────────────────
   POSICIONAMIENTO INTELIGENTE
   Sube la burbuja para que no tape el campo activo
───────────────────────────────────────────────────────*/
function ajustarPosicion(){
  const burbuja = document.getElementById('cami-burbuja')
  const widget  = document.getElementById('cami-widget')
  if(!burbuja || !widget) return

  const activo = document.activeElement
  const esInput = activo && ['INPUT','TEXTAREA','SELECT'].includes(activo.tagName)

  if(esInput){
    const rect = activo.getBoundingClientRect()
    const winH = window.innerHeight
    // El campo está en la mitad inferior → subir la burbuja más
    if(rect.bottom > winH * 0.55){
      widget.style.bottom = (winH - rect.top + 10) + 'px'
    } else {
      widget.style.bottom = '14px'
    }
  } else {
    widget.style.bottom = '14px'
  }
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
      abrirBurbuja()
      hablar(msg)
      ajustarPosicion()
    })
    el.addEventListener('blur', () => setTimeout(ajustarPosicion, 200))
  })

  // Checkbox términos
  document.getElementById('rTerminos')?.addEventListener('change', e => {
    if(!_ayudando || !e.target.checked) return
    const msg = '¡Perfecto! Apretá "Registrarme gratis" y ya estás dentro.'
    document.getElementById('cami-txt').textContent = msg
    document.getElementById('cami-btns').innerHTML = btnMic()
    hablar(msg)
  })

  // Google
  document.querySelector('.btn-google')?.addEventListener('click', () => {
    const msg = T.google
    document.getElementById('cami-txt').textContent = msg
    hablar(msg)
  })

  // Éxito del form
  const form = document.getElementById('formReg')
  if(form){
    form.addEventListener('submit', () => {
      setTimeout(() => {
        const ok = document.getElementById('msgOk')
        if(ok?.style.display !== 'none' && ok?.textContent){
          decir(T.exito)
        }
      }, 2200)
    })
  }
}

/* ─────────────────────────────────────────────────────
   BIND CAMPOS — perfil_servicio.html
───────────────────────────────────────────────────────*/
function bindServicio(){
  // Selector de tipo
  const sel = document.getElementById('selectorTipo')
  if(sel){
    sel.addEventListener('change', () => {
      if(!_ayudando) return
      const tipo = sel.value
      const msg = T.tipos[tipo] || ''
      if(msg){ document.getElementById('cami-txt').textContent = msg; hablar(msg) }
    })
    sel.addEventListener('focus', () => {
      if(!_ayudando) return
      decir(T.tipoIntro)
    })
  }

  // Foto
  document.getElementById('inputFoto')?.addEventListener('change', () => {
    if(!_ayudando) return
    decir(T.fotoTip)
  })
  document.getElementById('fotoCircle')?.addEventListener('click', () => {
    if(!_ayudando) return
    decir(T.fotoTip)
  })

  // Campos comunes que aparecen en todos los formularios del servicio
  const camposServicio = [
    ['titulo','descripcion','descripcion2'].map(id =>
      [document.getElementById(id), T.descripTip]),
    [['localidad','ciudad','rLocalidad'].map(id =>
      [document.getElementById(id), T.ciudadTip])],
  ].flat(2)

  document.querySelectorAll('input[type=text], textarea, select').forEach(el => {
    if(el.id === 'selectorTipo') return
    el.addEventListener('focus', () => {
      if(!_ayudando) return
      ajustarPosicion()
      // Hint genérico si no tiene uno específico
      const par = el.closest('.seccion')
      const titulo = par?.querySelector('h3')?.textContent?.trim()
      if(titulo && !_hablandoAlgo){
        // no interrumpir si ya está hablando
      }
    })
    el.addEventListener('blur', () => setTimeout(ajustarPosicion, 150))
  })

  // Botón guardar
  document.querySelectorAll('[onclick*="guardar"], [onclick*="Guardar"], button[type="submit"]').forEach(btn => {
    btn.addEventListener('click', () => {
      if(!_ayudando) return
      setTimeout(() => decir(T.guardaTip), 300)
    })
  })
}

let _hablandoAlgo = false

/* ─────────────────────────────────────────────────────
   TECLADO VIRTUAL — mobile
───────────────────────────────────────────────────────*/
function bindTeclado(){
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
  if(!isMobile) return
  let altH = window.innerHeight
  window.addEventListener('resize', () => {
    const w = document.getElementById('cami-widget')
    if(!w) return
    if(window.innerHeight < altH * 0.72){
      w.classList.add('teclado-on')
      detenerEscucha()
    } else {
      w.classList.remove('teclado-on')
      altH = window.innerHeight
    }
  })
}

/* ─────────────────────────────────────────────────────
   INIT
───────────────────────────────────────────────────────*/
function init(){
  crearWidget()
  bindTeclado()

  if(EN_REGISTRO) bindRegistro()
  if(EN_SERVICIO) bindServicio()

  // Saludo inicial
  const delay = EN_SERVICIO ? 1200 : 1800
  setTimeout(() => {
    document.getElementById('cami-txt').textContent = T.saludo
    document.getElementById('cami-btns').innerHTML = btnSiNo()
    abrirBurbuja()
    hablar(T.saludo)
    // Después del saludo → escuchar automáticamente la respuesta
    _escuchaModo = true
  }, delay)
}

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}

})()
