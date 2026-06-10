/*  ══════════════════════════════════════════════════════
    CAMI — Asistente IA de registro · Trabajos Cerca
    Voz (SpeechSynthesis) + Escucha (SpeechRecognition)
    ══════════════════════════════════════════════════════ */
;(function(){
'use strict'

/* ── Configuración ── */
const DELAY_SALUDO = 1800  // ms antes de aparecer

/* ── Frases para cada campo ── */
const GUIA = {
  rNombre:   '¡Genial! Empezamos fácil. Escribí tu nombre, el que usás normalmente.',
  rApellido: 'Ahora tu apellido. Tal como figura en tu DNI.',
  rEmail:    'Ingresá tu email. Lo vas a usar para iniciar sesión. Usá uno al que tengas acceso.',
  rTelefono: 'Tu número de WhatsApp, sin el cero inicial ni el quince. Por ejemplo: 2214561234. Lo ven los clientes para contactarte.',
  rPass:     'Elegí una contraseña de al menos 6 caracteres. Podés mezclar letras y números.',
  rTerminos: 'Para terminar, aceptá los Términos y Condiciones. Son breves, te lo prometo.',
}

const SALUDO = '¡Hola! Soy Cami, tu asistente de Trabajos Cerca. ¿Querés que te ayude a registrarte?'
const AYUDA_VOZ = 'También podés hablarme. Decime, por ejemplo: "quiero registrarme como electricista" y yo te ayudo.'
const EXITO = '¡Listo! Tu cuenta fue creada. Bienvenido a Trabajos Cerca. 🎉'
const GOOGLE_MSG = '¡Buena elección! Con Google es más rápido. Solo hacé clic en el botón azul.'

/* ══════════════════════════════════════════════════════
   AVATAR SVG (chica animada)
══════════════════════════════════════════════════════ */
const AVATAR_SVG = `
<svg viewBox="0 0 120 140" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;">
  <!-- Cuerpo / camisa -->
  <ellipse cx="60" cy="125" rx="32" ry="22" fill="#6366f1"/>
  <!-- Cuello -->
  <rect x="52" y="98" width="16" height="14" rx="4" fill="#fbbf7a"/>
  <!-- Cabeza -->
  <ellipse cx="60" cy="78" rx="28" ry="30" fill="#fbbf7a"/>
  <!-- Cabello posterior -->
  <ellipse cx="60" cy="62" rx="30" ry="24" fill="#7c3aed"/>
  <!-- Cabello lateral izq -->
  <ellipse cx="35" cy="80" rx="10" ry="18" fill="#7c3aed"/>
  <!-- Cabello lateral der -->
  <ellipse cx="85" cy="80" rx="10" ry="18" fill="#7c3aed"/>
  <!-- Frente cabello -->
  <ellipse cx="60" cy="52" rx="26" ry="12" fill="#7c3aed"/>
  <!-- Ojos -->
  <ellipse cx="49" cy="80" rx="5" ry="5.5" fill="white"/>
  <ellipse cx="71" cy="80" rx="5" ry="5.5" fill="white"/>
  <circle cx="50" cy="81" r="3" fill="#1e293b"/>
  <circle cx="72" cy="81" r="3" fill="#1e293b"/>
  <circle cx="51" cy="79.5" r="1" fill="white"/>
  <circle cx="73" cy="79.5" r="1" fill="white"/>
  <!-- Cejas -->
  <path d="M44 74 Q49 71 54 73" stroke="#5b21b6" stroke-width="2" fill="none" stroke-linecap="round"/>
  <path d="M66 73 Q71 71 76 74" stroke="#5b21b6" stroke-width="2" fill="none" stroke-linecap="round"/>
  <!-- Nariz -->
  <ellipse cx="60" cy="88" rx="3" ry="2" fill="#f59e6a"/>
  <!-- Boca -->
  <path id="cami-boca" d="M52 94 Q60 100 68 94" stroke="#c2410c" stroke-width="2" fill="none" stroke-linecap="round"/>
  <!-- Mejillas -->
  <ellipse cx="44" cy="89" rx="6" ry="4" fill="#fca5a5" opacity="0.5"/>
  <ellipse cx="76" cy="89" rx="6" ry="4" fill="#fca5a5" opacity="0.5"/>
  <!-- Auricular IA (der) -->
  <circle cx="87" cy="78" r="5" fill="#2563eb" opacity="0.9"/>
  <circle cx="87" cy="78" r="2.5" fill="#60a5fa"/>
  <!-- Estrellitas IA -->
  <text x="90" y="58" font-size="8" fill="#fbbf24">✦</text>
  <text x="20" y="65" font-size="6" fill="#a78bfa">✦</text>
</svg>`

/* ══════════════════════════════════════════════════════
   INYECTAR HTML DEL WIDGET
══════════════════════════════════════════════════════ */
function crearWidget() {
  const div = document.createElement('div')
  div.id = 'cami-widget'
  div.innerHTML = `
  <style>
  #cami-widget {
    position: fixed;
    bottom: 16px;
    right: 12px;
    z-index: 9999;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 8px;
    pointer-events: none;
  }
  /* En celular con teclado abierto: solo el avatar, sin burbuja */
  #cami-widget.teclado-abierto #cami-burbuja {
    display: none !important;
  }
  #cami-widget.teclado-abierto #cami-avatar-wrap {
    width: 52px;
    height: 60px;
    opacity: .85;
  }
  #cami-burbuja {
    background: white;
    border: 2px solid #6366f1;
    border-radius: 18px 18px 4px 18px;
    padding: 12px 14px;
    max-width: 220px;
    font-size: 13px;
    color: #1e293b;
    line-height: 1.5;
    box-shadow: 0 6px 24px rgba(99,102,241,.25);
    pointer-events: all;
    opacity: 0;
    transform: translateY(10px) scale(.95);
    transition: opacity .3s ease, transform .3s ease;
  }
  /* Móvil: burbuja más pequeña y avatar más chico */
  @media (max-width: 480px) {
    #cami-burbuja { max-width: 190px; font-size: 12px; padding: 10px 12px; }
    #cami-avatar-wrap { width: 62px; height: 72px; }
  }
  #cami-burbuja.visible {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  #cami-burbuja .cami-titulo {
    font-weight: 800;
    color: #6366f1;
    font-size: 13px;
    margin-bottom: 5px;
    display: flex;
    align-items: center;
    gap: 5px;
  }
  #cami-burbuja .cami-texto {
    font-size: 13px;
    color: #374151;
    line-height: 1.55;
  }
  #cami-btns {
    display: flex;
    gap: 6px;
    margin-top: 10px;
    flex-wrap: wrap;
  }
  #cami-btns button {
    flex: 1;
    min-width: 80px;
    padding: 7px 10px;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    border: none;
    transition: all .15s;
  }
  .cami-btn-si  { background: #6366f1; color: white; }
  .cami-btn-si:hover  { background: #4f46e5; }
  .cami-btn-no  { background: #f1f5f9; color: #64748b; }
  .cami-btn-no:hover  { background: #e2e8f0; }
  .cami-btn-mic { background: #fee2e2; color: #dc2626; padding: 7px !important; }
  .cami-btn-mic.escuchando { background: #dc2626; color: white; animation: cami-pulso .8s infinite; }
  .cami-btn-mic:hover { background: #fecaca; }

  #cami-avatar-wrap {
    width: 70px;
    height: 82px;
    position: relative;
    cursor: pointer;
    pointer-events: all;
    filter: drop-shadow(0 4px 12px rgba(99,102,241,.3));
    transform: translateY(0);
    transition: transform .2s ease, width .2s, height .2s, opacity .2s;
  }
  #cami-avatar-wrap:hover { transform: translateY(-4px); }
  #cami-avatar-wrap.habla #cami-boca {
    d: path("M52 92 Q60 102 68 92");
  }
  .cami-badge {
    position: absolute;
    top: -4px;
    right: -4px;
    width: 20px;
    height: 20px;
    background: #6366f1;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    border: 2px solid white;
    animation: cami-pulso 2s infinite;
  }
  @keyframes cami-pulso {
    0%,100% { box-shadow: 0 0 0 0 rgba(99,102,241,.4); }
    50%      { box-shadow: 0 0 0 6px rgba(99,102,241,0); }
  }
  #cami-widget.oculto #cami-burbuja { display: none; }
  #cami-widget.oculto #cami-avatar-wrap { opacity: .7; }

  .cami-mic-status {
    font-size: 11px;
    color: #dc2626;
    margin-top: 5px;
    min-height: 16px;
    font-style: italic;
  }
  </style>

  <div id="cami-burbuja">
    <div class="cami-titulo">✨ Cami · Asistente IA</div>
    <div class="cami-texto" id="cami-texto">...</div>
    <div id="cami-btns"></div>
    <div class="cami-mic-status" id="cami-mic-status"></div>
  </div>

  <div id="cami-avatar-wrap" onclick="window._cami.toggleBurbuja()" title="Cami · Asistente IA">
    ${AVATAR_SVG}
    <div class="cami-badge">💬</div>
  </div>
  `
  document.body.appendChild(div)
}

/* ══════════════════════════════════════════════════════
   SPEECH
══════════════════════════════════════════════════════ */
let _voz = null
function elegirVoz() {
  const voces = speechSynthesis.getVoices()
  // Prioridad: voz femenina argentina > española > cualquier español
  const candidatas = voces.filter(v => v.lang.startsWith('es'))
  _voz = candidatas.find(v => /argentina|es-ar/i.test(v.name + v.lang))
      || candidatas.find(v => /female|mujer|sabina|lucia|monica|valeria|paulina/i.test(v.name))
      || candidatas[0]
      || null
}
if(speechSynthesis.onvoiceschanged !== undefined) {
  speechSynthesis.onvoiceschanged = elegirVoz
}
setTimeout(elegirVoz, 500)

function hablar(texto) {
  if(!window.speechSynthesis) return
  speechSynthesis.cancel()
  const utter = new SpeechSynthesisUtterance(texto)
  utter.lang  = 'es-AR'
  utter.rate  = 1.05
  utter.pitch = 1.1
  if(_voz) utter.voice = _voz
  const av = document.getElementById('cami-avatar-wrap')
  if(av) av.classList.add('habla')
  utter.onend = () => { if(av) av.classList.remove('habla') }
  speechSynthesis.speak(utter)
}

/* ══════════════════════════════════════════════════════
   RECONOCIMIENTO DE VOZ
══════════════════════════════════════════════════════ */
let _recognizer = null
let _escuchando = false

function iniciarEscucha() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition
  if(!SR) {
    mostrarEnBurbuja('Lo siento, tu navegador no soporta reconocimiento de voz. Pero podés escribir normalmente.')
    return
  }
  if(_escuchando) { detenerEscucha(); return }

  _recognizer = new SR()
  _recognizer.lang = 'es-AR'
  _recognizer.continuous = false
  _recognizer.interimResults = false

  _recognizer.onstart = () => {
    _escuchando = true
    const btn = document.getElementById('cami-mic-btn')
    if(btn) btn.classList.add('escuchando')
    document.getElementById('cami-mic-status').textContent = '🎤 Escuchando...'
  }

  _recognizer.onresult = (e) => {
    const texto = e.results[0][0].transcript
    document.getElementById('cami-mic-status').textContent = '✓ Escuché: "' + texto + '"'
    procesarVoz(texto.toLowerCase())
  }

  _recognizer.onerror = () => {
    document.getElementById('cami-mic-status').textContent = ''
    detenerEscucha()
  }

  _recognizer.onend = () => { detenerEscucha() }
  _recognizer.start()
}

function detenerEscucha() {
  _escuchando = false
  if(_recognizer) { try { _recognizer.stop() } catch(e){} }
  const btn = document.getElementById('cami-mic-btn')
  if(btn) btn.classList.remove('escuchando')
}

/* ── Procesar lo que el usuario dijo ── */
function procesarVoz(texto) {
  // Detectar tipo de registro
  const tipo = detectarTipo(texto)
  if(tipo) {
    const msg = `Entendí que querés registrarte como ${tipo}. ¡Completemos los datos!`
    mostrarEnBurbuja(msg)
    hablar(msg)
    // Foco en el primer campo
    document.getElementById('rNombre')?.focus()
    return
  }
  // Detectar si quiere ayuda con un campo específico
  if(/nombre/i.test(texto))   { document.getElementById('rNombre')?.focus(); return }
  if(/apellido/i.test(texto)) { document.getElementById('rApellido')?.focus(); return }
  if(/email|correo/i.test(texto)) { document.getElementById('rEmail')?.focus(); return }
  if(/tel[eé]fono|whatsapp|cel/i.test(texto)) { document.getElementById('rTelefono')?.focus(); return }
  if(/contraseña|password|clave/i.test(texto)) { document.getElementById('rPass')?.focus(); return }

  // Respuesta genérica
  const fallback = 'No entendí bien, pero estoy aquí. Completá los campos del formulario y cualquier duda me preguntás.'
  mostrarEnBurbuja(fallback)
  hablar(fallback)
}

function detectarTipo(texto) {
  if(/(electricista|electricidad|electr)/i.test(texto)) return 'electricista'
  if(/(plomer|plomería)/i.test(texto)) return 'plomero'
  if(/(albanil|albañil|construcción|construct)/i.test(texto)) return 'albañil'
  if(/(pintor|pintura)/i.test(texto)) return 'pintor'
  if(/(gasista|gas)/i.test(texto)) return 'gasista'
  if(/(carpintero|carpintería|muebles)/i.test(texto)) return 'carpintero'
  if(/(jardinero|jardín|jardinería)/i.test(texto)) return 'jardinero'
  if(/(médico|doctor|doctora|medicina)/i.test(texto)) return 'médico'
  if(/(abogado|abogada|derecho|legal)/i.test(texto)) return 'abogado'
  if(/(contador|contadora|contabilidad)/i.test(texto)) return 'contador'
  if(/(psic[oó]logo|psicología)/i.test(texto)) return 'psicólogo'
  if(/(arquitecto|arquitecta|arquitectura)/i.test(texto)) return 'arquitecto'
  if(/(diseñ|diseño)/i.test(texto)) return 'diseñador'
  if(/(emprendimiento|emprendedor|negocio|marca)/i.test(texto)) return 'emprendedor'
  if(/(profesional)/i.test(texto)) return 'profesional'
  if(/(oficio|trabajador)/i.test(texto)) return 'trabajador de oficio'
  return null
}

/* ══════════════════════════════════════════════════════
   LÓGICA DEL WIDGET
══════════════════════════════════════════════════════ */
let _burbujaVisible = false
let _ayudandoActivo = false

function mostrarEnBurbuja(texto, btns) {
  const el = document.getElementById('cami-texto')
  const bEl = document.getElementById('cami-btns')
  if(!el) return
  el.textContent = texto
  bEl.innerHTML = btns || ''
  abrirBurbuja()
}

function abrirBurbuja() {
  const b = document.getElementById('cami-burbuja')
  if(!b) return
  b.classList.add('visible')
  _burbujaVisible = true
}

function cerrarBurbuja() {
  const b = document.getElementById('cami-burbuja')
  if(!b) return
  b.classList.remove('visible')
  _burbujaVisible = false
}

window._cami = {
  toggleBurbuja: () => { _burbujaVisible ? cerrarBurbuja() : abrirBurbuja() }
}

/* ── Botones de respuesta ── */
function btnsInicio() {
  return `
  <div id="cami-btns" style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap;">
    <button class="cami-btn-si" onclick="window._cami.aceptarAyuda()">👍 Sí, ayudame</button>
    <button class="cami-btn-no" onclick="window._cami.rechazarAyuda()">No, gracias</button>
  </div>`
}

function btnsMic() {
  return `
  <div id="cami-btns" style="display:flex;gap:6px;margin-top:10px;align-items:center;">
    <button id="cami-mic-btn" class="cami-btn-mic" onclick="iniciarEscucha()" title="Hablar con Cami">
      🎤
    </button>
    <span style="font-size:11px;color:#64748b;">Hablarme por el micrófono</span>
  </div>`
}

window._cami.aceptarAyuda = function() {
  _ayudandoActivo = true
  const msg = AYUDA_VOZ
  mostrarEnBurbuja(msg, btnsMic())
  hablar('¡Genial! Hacé clic en el primer campo y yo te voy guiando. ' + AYUDA_VOZ)
  document.getElementById('rNombre')?.focus()
}

window._cami.rechazarAyuda = function() {
  _ayudandoActivo = false
  mostrarEnBurbuja('¡Sin problema! Si necesitás algo, hacé clic en mí. 😊', '')
  hablar('Sin problema. Cualquier cosa que necesites, estoy aquí.')
  setTimeout(cerrarBurbuja, 3000)
}

/* ══════════════════════════════════════════════════════
   TECLADO VIRTUAL (móvil) — detectar apertura/cierre
══════════════════════════════════════════════════════ */
function bindTeclado() {
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
  if(!isMobile) return

  // En mobile, cuando se abre el teclado el viewport encoge
  let alturaOriginal = window.innerHeight
  window.addEventListener('resize', () => {
    const widget = document.getElementById('cami-widget')
    if(!widget) return
    if(window.innerHeight < alturaOriginal * 0.75) {
      // Teclado abierto: minimizar Cami
      widget.classList.add('teclado-abierto')
    } else {
      // Teclado cerrado: restaurar Cami
      widget.classList.remove('teclado-abierto')
      alturaOriginal = window.innerHeight
    }
  })
}

/* ══════════════════════════════════════════════════════
   ESCUCHAR FOCUS EN LOS CAMPOS DEL FORM
══════════════════════════════════════════════════════ */
function bindCampos() {
  Object.keys(GUIA).forEach(id => {
    const el = document.getElementById(id)
    if(!el) return
    el.addEventListener('focus', () => {
      if(!_ayudandoActivo) return
      const msg = GUIA[id]
      mostrarEnBurbuja(msg, btnsMic())
      hablar(msg)
    })
    // En desktop: al perder el foco cerramos la burbuja después de un rato
    el.addEventListener('blur', () => {
      if(!_ayudandoActivo) return
      setTimeout(() => {
        // Solo cerrar si ningún otro campo del form tiene foco
        const hayFoco = Object.keys(GUIA).some(fid => document.getElementById(fid) === document.activeElement)
        if(!hayFoco) {
          // No cerramos del todo, dejamos el último mensaje
        }
      }, 200)
    })
  })

  // Checkbox términos
  const chk = document.getElementById('rTerminos')
  if(chk) {
    chk.addEventListener('change', () => {
      if(!_ayudandoActivo) return
      if(chk.checked) {
        const msg = '¡Perfecto! Ahora hacé clic en "Registrarme gratis" y ya estás adentro.'
        mostrarEnBurbuja(msg, btnsMic())
        hablar(msg)
      }
    })
  }

  // Google button
  const gBtn = document.querySelector('.btn-google')
  if(gBtn) {
    gBtn.addEventListener('click', () => {
      mostrarEnBurbuja(GOOGLE_MSG, '')
      hablar(GOOGLE_MSG)
    })
  }

  // Submit — detectar éxito
  const form = document.getElementById('formReg')
  if(form) {
    form.addEventListener('submit', () => {
      setTimeout(() => {
        const ok = document.getElementById('msgOk')
        if(ok && ok.style.display !== 'none' && ok.textContent) {
          mostrarEnBurbuja(EXITO, '')
          hablar(EXITO)
        }
      }, 2000)
    })
  }
}

/* ══════════════════════════════════════════════════════
   INIT
══════════════════════════════════════════════════════ */
function init() {
  // Solo aparece en la página de registro si el usuario NO está logueado
  if(!document.getElementById('formReg')) return

  crearWidget()
  bindCampos()
  bindTeclado()

  // Aparece después del delay con el saludo
  setTimeout(() => {
    abrirBurbuja()
    document.getElementById('cami-texto').textContent = SALUDO
    document.getElementById('cami-btns').innerHTML = `
      <div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap;">
        <button class="cami-btn-si" onclick="window._cami.aceptarAyuda()">👍 Sí, ayudame</button>
        <button class="cami-btn-no" onclick="window._cami.rechazarAyuda()">No, gracias</button>
      </div>`
    hablar(SALUDO)
  }, DELAY_SALUDO)
}

if(document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}

})()
