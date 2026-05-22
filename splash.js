;(function(){
  /* ══════════════════════════════════════════════════════════
     Trabajos Cerca — Splash de bienvenida
     ─ Primera visita: selector de provincia (obligatorio o skip)
     ─ Visitas siguientes: bienvenida con provincia guardada (6s)
  ══════════════════════════════════════════════════════════ */

  const KEY_PROV   = 'tc_provincia'
  const KEY_SPLASH = 'tc_splash_ts'
  const provGuardada = localStorage.getItem(KEY_PROV)

  // Si ya eligió provincia → throttle de 24h
  if(provGuardada){
    const ultima = localStorage.getItem(KEY_SPLASH)
    if(ultima && Date.now() - parseInt(ultima) < 24 * 60 * 60 * 1000) return
  }
  localStorage.setItem(KEY_SPLASH, Date.now())

  const PROVINCIAS = [
    'Buenos Aires','CABA','Catamarca','Chaco','Chubut','Córdoba',
    'Corrientes','Entre Ríos','Formosa','Jujuy','La Pampa','La Rioja',
    'Mendoza','Misiones','Neuquén','Río Negro','Salta','San Juan',
    'San Luis','Santa Cruz','Santa Fe','Santiago del Estero',
    'Tierra del Fuego','Tucumán'
  ]

  /* ── CSS ── */
  const style = document.createElement('style')
  style.textContent = `
  #tc-splash {
    position: fixed; inset: 0; z-index: 99999;
    display: flex; align-items: center; justify-content: center;
    background: linear-gradient(145deg, #1e3a8a 0%, #1d4ed8 45%, #7c3aed 100%);
    padding: 20px; animation: tcFadeIn .45s ease;
  }
  @keyframes tcFadeIn  { from { opacity:0; transform:scale(.98) } to { opacity:1; transform:scale(1) } }
  @keyframes tcFadeOut { from { opacity:1 } to { opacity:0 } }
  #tc-splash.cerrando { animation: tcFadeOut .38s ease forwards; }

  #tc-splash-inner { max-width: 520px; width: 100%; text-align: center; }

  #tc-splash-logo {
    width: 68px; height: 68px; border-radius: 16px;
    margin: 0 auto 14px; display: block;
    box-shadow: 0 8px 28px rgba(0,0,0,.35);
  }
  #tc-splash-titulo {
    font-size: clamp(20px, 5.5vw, 30px);
    font-weight: 900; color: white;
    margin: 0 0 8px; line-height: 1.2;
  }
  #tc-splash-titulo .hl { color: #93c5fd; }
  #tc-splash-sub {
    font-size: clamp(13px, 3.5vw, 15px);
    color: rgba(255,255,255,.82); margin: 0 0 18px; line-height: 1.5;
  }

  /* ── Province picker ── */
  #tc-prov-label {
    font-size: 12px; font-weight: 800; color: rgba(255,255,255,.65);
    text-transform: uppercase; letter-spacing: .1em; margin: 0 0 10px;
  }
  #tc-prov-grid {
    display: flex; flex-wrap: wrap; gap: 7px; justify-content: center;
    max-height: 210px; overflow-y: auto;
    padding: 2px 4px 8px;
    scrollbar-width: thin; scrollbar-color: rgba(255,255,255,.25) transparent;
  }
  #tc-prov-grid::-webkit-scrollbar { width: 4px; }
  #tc-prov-grid::-webkit-scrollbar-thumb { background: rgba(255,255,255,.3); border-radius: 4px; }
  .tc-prov-btn {
    padding: 7px 15px; border-radius: 22px;
    border: 1.5px solid rgba(255,255,255,.3);
    background: rgba(255,255,255,.1);
    font-size: 13px; font-weight: 600; color: white;
    cursor: pointer; transition: all .16s; font-family: inherit;
    user-select: none;
  }
  .tc-prov-btn:hover { background: rgba(255,255,255,.22); border-color: rgba(255,255,255,.65); transform: translateY(-1px); }
  .tc-prov-btn.sel  { background: white; color: #1d4ed8; border-color: white; font-weight: 800; transform: scale(1.05); }

  #tc-splash-skip {
    display: inline-block; margin-top: 14px;
    font-size: 12px; color: rgba(255,255,255,.45);
    cursor: pointer; text-decoration: underline;
    background: none; border: none; font-family: inherit;
    transition: color .15s;
  }
  #tc-splash-skip:hover { color: rgba(255,255,255,.75); }

  /* ── Bienvenida (visita de vuelta) ── */
  #tc-splash-saludo {
    font-size: 13px; font-weight: 700; color: rgba(255,255,255,.65);
    text-transform: uppercase; letter-spacing: .09em; margin: 0 0 6px;
  }
  #tc-splash-lugar {
    display: inline-flex; align-items: center; gap: 6px;
    background: rgba(255,255,255,.15); border: 1px solid rgba(255,255,255,.3);
    border-radius: 30px; padding: 6px 18px;
    font-size: 15px; font-weight: 700; color: white;
    margin: 14px 0 22px;
  }
  #tc-splash-btn {
    display: inline-flex; align-items: center; gap: 9px;
    background: white; color: #1d4ed8;
    border: none; border-radius: 12px;
    padding: 14px 38px; font-size: 16px; font-weight: 800;
    cursor: pointer; font-family: inherit;
    box-shadow: 0 4px 20px rgba(0,0,0,.22);
    transition: transform .15s, box-shadow .15s;
  }
  #tc-splash-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(0,0,0,.28); }
  #tc-splash-bar-wrap {
    width: 100%; max-width: 300px; margin: 18px auto 0;
    background: rgba(255,255,255,.18); border-radius: 10px; height: 4px; overflow: hidden;
  }
  #tc-splash-bar { height: 100%; background: white; border-radius: 10px; width: 100%; transition: width 1s linear; }
  #tc-splash-timer { font-size: 12px; color: rgba(255,255,255,.5); margin-top: 8px; }

  /* Partículas */
  .tc-sp-dot { position: absolute; border-radius: 50%; background: rgba(255,255,255,.07); pointer-events: none; }
  `
  document.head.appendChild(style)

  const el = document.createElement('div')
  el.id = 'tc-splash'

  /* ════════════════════════════════
     MODO A: Primera vez → Picker
  ════════════════════════════════ */
  if(!provGuardada){
    el.innerHTML = `
      <div class="tc-sp-dot" style="width:300px;height:300px;top:-110px;right:-110px;"></div>
      <div class="tc-sp-dot" style="width:200px;height:200px;bottom:-60px;left:-60px;"></div>
      <div id="tc-splash-inner">
        <img id="tc-splash-logo" src="/icon-192.png" alt="Trabajos Cerca" onerror="this.src='/logo.png'">
        <h1 id="tc-splash-titulo">El trabajo que buscás,<br>en <span class="hl">Argentina</span></h1>
        <p id="tc-splash-sub">
          Profesionales, oficios y empleos cerca tuyo.<br>
          <strong style="color:white;">¿En qué provincia estás?</strong>
        </p>
        <p id="tc-prov-label">📍 Elegí tu provincia</p>
        <div id="tc-prov-grid"></div>
        <button id="tc-splash-skip" onclick="window._tcSplashCerrar()">Continuar sin elegir →</button>
      </div>
    `
    document.body.appendChild(el)
    document.body.style.overflow = 'hidden'

    /* Render chips */
    const grid = document.getElementById('tc-prov-grid')
    PROVINCIAS.forEach(p => {
      const btn = document.createElement('button')
      btn.className = 'tc-prov-btn'
      btn.textContent = p
      btn.onclick = () => elegirProvincia(p, btn)
      grid.appendChild(btn)
    })

    function elegirProvincia(p, btn){
      document.querySelectorAll('.tc-prov-btn').forEach(b => b.classList.remove('sel'))
      btn.classList.add('sel')

      /* Guardar y propagar al hero y al strip */
      localStorage.setItem(KEY_PROV, p)
      const heroSpan = document.getElementById('hero-prov-txt')
      if(heroSpan) heroSpan.textContent = p
      document.querySelectorAll('.prov-chip').forEach(c =>
        c.classList.toggle('active', c.textContent === p)
      )
      const activeChip = document.querySelector('.prov-chip.active')
      if(activeChip) activeChip.scrollIntoView({ block:'nearest', inline:'center', behavior:'smooth' })

      /* Cerrar con micro-pausa para que el usuario vea la selección */
      setTimeout(() => window._tcSplashCerrar(), 650)
    }

  /* ════════════════════════════════
     MODO B: Visita siguiente → Bienvenida
  ════════════════════════════════ */
  } else {
    el.innerHTML = `
      <div class="tc-sp-dot" style="width:300px;height:300px;top:-110px;right:-110px;"></div>
      <div class="tc-sp-dot" style="width:200px;height:200px;bottom:-60px;left:-60px;"></div>
      <div id="tc-splash-inner">
        <img id="tc-splash-logo" src="/icon-192.png" alt="Trabajos Cerca" onerror="this.src='/logo.png'">
        <p id="tc-splash-saludo">¡Bienvenido/a de vuelta!</p>
        <h1 id="tc-splash-titulo">El trabajo que buscás,<br>en <span class="hl">${provGuardada}</span></h1>
        <div id="tc-splash-lugar"><span>📍</span><span>${provGuardada}</span></div>
        <button id="tc-splash-btn" onclick="window._tcSplashCerrar()">
          <span>🚀</span> Comenzar
        </button>
        <div id="tc-splash-bar-wrap"><div id="tc-splash-bar"></div></div>
        <p id="tc-splash-timer">Cerrando en <span id="tc-splash-seg">6</span>s</p>
      </div>
    `
    document.body.appendChild(el)
    document.body.style.overflow = 'hidden'

    let seg = 6
    const bar   = document.getElementById('tc-splash-bar')
    const segEl = document.getElementById('tc-splash-seg')
    window._tcSplashInterval = setInterval(() => {
      seg--
      if(segEl) segEl.textContent = seg
      if(bar)   bar.style.width = (seg / 6 * 100) + '%'
      if(seg <= 0){ clearInterval(window._tcSplashInterval); window._tcSplashCerrar() }
    }, 1000)
    setTimeout(() => { if(bar) bar.style.width = '0%' }, 50)
  }

  /* ── Cerrar splash ── */
  window._tcSplashCerrar = function(){
    clearInterval(window._tcSplashInterval)
    el.classList.add('cerrando')
    setTimeout(() => { el.remove(); document.body.style.overflow = '' }, 400)
  }

})()
