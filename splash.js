;(function(){
  /* ══════════════════════════════════════════════
     Trabajos Cerca — Splash de bienvenida
     - Detecta provincia por IP (sin pedir permisos)
     - Se muestra una vez cada 24 horas
     - Auto-cierre a los 10 segundos con countdown
  ══════════════════════════════════════════════ */

  // Mostrar solo 1 vez cada 24 horas
  const CLAVE = 'tc_splash_ts'
  const ultima = localStorage.getItem(CLAVE)
  if(ultima && Date.now() - parseInt(ultima) < 24 * 60 * 60 * 1000) return
  localStorage.setItem(CLAVE, Date.now())

  /* ── CSS ── */
  const style = document.createElement('style')
  style.textContent = `
  #tc-splash {
    position: fixed; inset: 0; z-index: 99999;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    background: linear-gradient(145deg, #1e3a8a 0%, #1d4ed8 40%, #7c3aed 100%);
    padding: 24px;
    animation: tcFadeIn .5s ease;
  }
  @keyframes tcFadeIn  { from { opacity:0 } to { opacity:1 } }
  @keyframes tcFadeOut { from { opacity:1 } to { opacity:0 } }
  #tc-splash.cerrando { animation: tcFadeOut .4s ease forwards; }

  #tc-splash-inner {
    max-width: 480px; width: 100%; text-align: center;
  }
  #tc-splash-logo {
    width: 80px; height: 80px; border-radius: 18px;
    margin: 0 auto 20px;
    box-shadow: 0 8px 32px rgba(0,0,0,.3);
  }
  #tc-splash-saludo {
    font-size: 15px; font-weight: 600;
    color: rgba(255,255,255,.75);
    margin: 0 0 6px; letter-spacing: .04em;
    text-transform: uppercase;
  }
  #tc-splash-titulo {
    font-size: clamp(22px, 6vw, 32px);
    font-weight: 900; color: white;
    margin: 0 0 10px; line-height: 1.2;
  }
  #tc-splash-subtitulo {
    font-size: clamp(14px, 4vw, 17px);
    color: rgba(255,255,255,.85);
    margin: 0 0 28px; line-height: 1.5;
  }
  #tc-splash-lugar {
    display: inline-flex; align-items: center; gap: 6px;
    background: rgba(255,255,255,.15);
    border: 1px solid rgba(255,255,255,.3);
    border-radius: 30px; padding: 5px 14px;
    font-size: 14px; font-weight: 700; color: white;
    margin-bottom: 30px;
  }
  #tc-splash-btn {
    display: inline-flex; align-items: center; gap: 8px;
    background: white; color: #1d4ed8;
    border: none; border-radius: 12px;
    padding: 14px 36px; font-size: 16px; font-weight: 800;
    cursor: pointer; transition: transform .15s, box-shadow .15s;
    box-shadow: 0 4px 20px rgba(0,0,0,.2);
  }
  #tc-splash-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(0,0,0,.25); }

  /* Barra de countdown */
  #tc-splash-bar-wrap {
    width: 100%; max-width: 320px; margin: 20px auto 0;
    background: rgba(255,255,255,.2); border-radius: 10px; height: 4px; overflow: hidden;
  }
  #tc-splash-bar {
    height: 100%; background: white; border-radius: 10px;
    width: 100%;
    transition: width 1s linear;
  }
  #tc-splash-timer {
    font-size: 12px; color: rgba(255,255,255,.6);
    margin-top: 8px; text-align: center;
  }

  /* Partículas decorativas */
  .tc-sp-dot {
    position: absolute; border-radius: 50%;
    background: rgba(255,255,255,.08);
    pointer-events: none;
  }
  `
  document.head.appendChild(style)

  /* ── HTML ── */
  const el = document.createElement('div')
  el.id = 'tc-splash'
  el.innerHTML = `
    <div class="tc-sp-dot" style="width:300px;height:300px;top:-100px;right:-100px;"></div>
    <div class="tc-sp-dot" style="width:200px;height:200px;bottom:-60px;left:-60px;"></div>
    <div id="tc-splash-inner">
      <img id="tc-splash-logo" src="/icon-192.png" alt="Trabajos Cerca"
           onerror="this.src='/logo.png'">
      <p id="tc-splash-saludo">¡Bienvenido/a!</p>
      <h1 id="tc-splash-titulo">Encontrá lo que<br>necesitás, cerca tuyo</h1>
      <p id="tc-splash-subtitulo">
        Empleos, personal, oficios y profesionales<br>al alcance de un mensaje.
      </p>
      <div id="tc-splash-lugar">
        <span>📍</span>
        <span id="tc-splash-lugar-txt">Detectando tu ubicación...</span>
      </div>
      <br>
      <button id="tc-splash-btn" onclick="window._tcSplashCerrar()">
        <span>🚀</span> Comenzar
      </button>
      <div id="tc-splash-bar-wrap">
        <div id="tc-splash-bar"></div>
      </div>
      <p id="tc-splash-timer">Cerrando en <span id="tc-splash-seg">10</span>s</p>
    </div>
  `
  document.body.appendChild(el)
  document.body.style.overflow = 'hidden'

  /* ── Cerrar ── */
  window._tcSplashCerrar = function(){
    clearInterval(window._tcSplashInterval)
    el.classList.add('cerrando')
    setTimeout(() => {
      el.remove()
      document.body.style.overflow = ''
    }, 400)
  }

  /* ── Countdown 10 segundos ── */
  let seg = 10
  const bar  = document.getElementById('tc-splash-bar')
  const segEl = document.getElementById('tc-splash-seg')

  window._tcSplashInterval = setInterval(() => {
    seg--
    if(segEl) segEl.textContent = seg
    if(bar)   bar.style.width   = (seg / 10 * 100) + '%'
    if(seg <= 0){
      clearInterval(window._tcSplashInterval)
      window._tcSplashCerrar()
    }
  }, 1000)

  // Arrancar barra
  setTimeout(() => { if(bar) bar.style.width = '0%' }, 50)

  /* ── Geolocalización: primero localStorage, luego IP ── */
  function mostrarProvincia(texto){
    const lugar = document.getElementById('tc-splash-lugar-txt')
    if(!lugar) return
    if(texto){
      lugar.textContent = texto
      const sub = document.getElementById('tc-splash-subtitulo')
      if(sub) sub.innerHTML = `Empleos, personal, oficios y profesionales<br>en <strong style="color:white;">${texto}</strong> y alrededores.`
    } else {
      lugar.textContent = 'Argentina'
    }
  }

  const provGuardada = localStorage.getItem('tc_provincia')
  if(provGuardada){
    // Usar la provincia que el usuario ya seleccionó en el strip
    mostrarProvincia(provGuardada)
  } else {
    // Detectar por IP y guardar para futuras visitas
    fetch('https://ipapi.co/json/')
      .then(r => r.json())
      .then(data => {
        const prov = normalizarProvincia(data.region || data.city || '')
        const texto = prov || data.city || ''
        if(texto) localStorage.setItem('tc_provincia', texto)
        mostrarProvincia(texto)
      })
      .catch(() => mostrarProvincia(''))
  }

  function normalizarProvincia(raw){
    if(!raw) return ''
    const r = raw.toLowerCase()
    const mapa = {
      'buenos aires':        'Buenos Aires',
      'ciudad autónoma':     'CABA',
      'capital federal':     'CABA',
      'caba':                'CABA',
      'córdoba':             'Córdoba',
      'cordoba':             'Córdoba',
      'santa fe':            'Santa Fe',
      'mendoza':             'Mendoza',
      'tucumán':             'Tucumán',
      'tucuman':             'Tucumán',
      'entre ríos':          'Entre Ríos',
      'entre rios':          'Entre Ríos',
      'salta':               'Salta',
      'misiones':            'Misiones',
      'chaco':               'Chaco',
      'corrientes':          'Corrientes',
      'santiago del estero': 'Santiago del Estero',
      'san juan':            'San Juan',
      'jujuy':               'Jujuy',
      'río negro':           'Río Negro',
      'rio negro':           'Río Negro',
      'neuquén':             'Neuquén',
      'neuquen':             'Neuquén',
      'formosa':             'Formosa',
      'chubut':              'Chubut',
      'san luis':            'San Luis',
      'catamarca':           'Catamarca',
      'la rioja':            'La Rioja',
      'la pampa':            'La Pampa',
      'santa cruz':          'Santa Cruz',
      'tierra del fuego':    'Tierra del Fuego',
    }
    for(const key of Object.keys(mapa)){
      if(r.includes(key)) return mapa[key]
    }
    // Si no matchea, devolver capitalizado
    return raw.charAt(0).toUpperCase() + raw.slice(1)
  }

})()
