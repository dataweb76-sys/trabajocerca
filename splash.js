;(function(){
  /* ══════════════════════════════════════════════════════════
     Trabajos Cerca — Splash de bienvenida
     ─ Primera visita: bienvenida + selector de provincia
     ─ Visitas siguientes (cada 24h): bienvenida rápida con provincia guardada
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
    background: linear-gradient(160deg, #0f172a 0%, #1d4ed8 55%, #7c3aed 100%);
    padding: 20px; animation: tcFadeIn .5s ease;
    overflow-y: auto;
  }
  @keyframes tcFadeIn  { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:translateY(0) } }
  @keyframes tcFadeOut { from { opacity:1 } to { opacity:0 } }
  #tc-splash.cerrando { animation: tcFadeOut .38s ease forwards; pointer-events:none; }

  #tc-splash-inner {
    max-width: 500px; width: 100%; text-align: center;
    display: flex; flex-direction: column; align-items: center;
    padding: 10px 0 20px;
  }

  /* Logo + nombre */
  #tc-splash-logo {
    width: 80px; height: 80px; border-radius: 20px;
    box-shadow: 0 10px 40px rgba(0,0,0,.45);
    margin-bottom: 14px;
  }
  #tc-splash-nombre {
    font-size: clamp(24px, 7vw, 34px);
    font-weight: 900; color: #fff;
    margin: 0 0 4px; letter-spacing: -.02em;
  }
  #tc-splash-tagline {
    font-size: clamp(13px, 3.8vw, 16px);
    color: rgba(255,255,255,.78);
    margin: 0 0 24px; line-height: 1.55;
    max-width: 380px;
  }
  #tc-splash-tagline strong { color: #93c5fd; }

  /* Divisor */
  .tc-divisor {
    width: 48px; height: 3px; border-radius: 4px;
    background: rgba(255,255,255,.25); margin: 0 0 20px;
  }

  /* Province picker */
  #tc-prov-label {
    font-size: 12px; font-weight: 800; color: rgba(255,255,255,.6);
    text-transform: uppercase; letter-spacing: .1em; margin: 0 0 10px;
  }
  #tc-prov-grid {
    display: flex; flex-wrap: wrap; gap: 7px; justify-content: center;
    max-height: 195px; overflow-y: auto; width: 100%;
    padding: 2px 4px 8px;
    scrollbar-width: thin; scrollbar-color: rgba(255,255,255,.2) transparent;
  }
  #tc-prov-grid::-webkit-scrollbar { width: 3px; }
  #tc-prov-grid::-webkit-scrollbar-thumb { background: rgba(255,255,255,.25); border-radius: 4px; }
  .tc-prov-btn {
    padding: 7px 15px; border-radius: 22px;
    border: 1.5px solid rgba(255,255,255,.28);
    background: rgba(255,255,255,.09);
    font-size: 13px; font-weight: 600; color: rgba(255,255,255,.9);
    cursor: pointer; transition: all .16s; font-family: inherit; user-select: none;
  }
  .tc-prov-btn:hover { background: rgba(255,255,255,.2); border-color: rgba(255,255,255,.6); }
  .tc-prov-btn.sel   { background: white; color: #1d4ed8; border-color: white; font-weight: 800; transform: scale(1.06); }

  /* Botón entrar */
  #tc-btn-entrar {
    margin-top: 18px;
    display: inline-flex; align-items: center; gap: 9px;
    background: white; color: #1d4ed8;
    border: none; border-radius: 14px;
    padding: 15px 42px; font-size: 16px; font-weight: 900;
    cursor: pointer; font-family: inherit;
    box-shadow: 0 6px 28px rgba(0,0,0,.3);
    transition: transform .15s, box-shadow .15s;
  }
  #tc-btn-entrar:hover { transform: translateY(-2px); box-shadow: 0 10px 32px rgba(0,0,0,.38); }
  #tc-btn-entrar .arr { font-size: 18px; transition: transform .2s; }
  #tc-btn-entrar:hover .arr { transform: translateX(4px); }

  #tc-splash-skip {
    display: inline-block; margin-top: 12px;
    font-size: 12px; color: rgba(255,255,255,.38);
    cursor: pointer; background: none; border: none;
    font-family: inherit; transition: color .15s; text-decoration: underline;
  }
  #tc-splash-skip:hover { color: rgba(255,255,255,.7); }

  /* Bienvenida de vuelta */
  #tc-splash-lugar {
    display: inline-flex; align-items: center; gap: 7px;
    background: rgba(255,255,255,.13); border: 1px solid rgba(255,255,255,.28);
    border-radius: 30px; padding: 7px 20px;
    font-size: 15px; font-weight: 700; color: white;
    margin: 6px 0 22px;
  }
  #tc-splash-bar-wrap {
    width: 100%; max-width: 300px; margin: 16px auto 0;
    background: rgba(255,255,255,.15); border-radius: 10px; height: 4px; overflow: hidden;
  }
  #tc-splash-bar { height: 100%; background: white; border-radius: 10px; width: 100%; transition: width 1s linear; }
  #tc-splash-timer { font-size: 12px; color: rgba(255,255,255,.45); margin-top: 8px; }

  /* Partículas */
  .tc-sp-dot { position: absolute; border-radius: 50%; background: rgba(255,255,255,.06); pointer-events: none; }
  `
  document.head.appendChild(style)

  const el = document.createElement('div')
  el.id = 'tc-splash'

  /* ════════════════════════════════════════
     MODO A: Primera vez → Bienvenida + Picker
  ════════════════════════════════════════ */
  if(!provGuardada){
    el.innerHTML = `
      <div class="tc-sp-dot" style="width:320px;height:320px;top:-120px;right:-100px;"></div>
      <div class="tc-sp-dot" style="width:220px;height:220px;bottom:-70px;left:-70px;"></div>
      <div id="tc-splash-inner">
        <img id="tc-splash-logo" src="/icon-192.png" alt="Trabajos Cerca" onerror="this.src='/logo.png'">
        <h1 id="tc-splash-nombre">Trabajos Cerca</h1>
        <p id="tc-splash-tagline">
          El lugar donde conseguir un empleo,<br>
          <strong>empleados, oficios o un profesional.</strong>
        </p>
        <div class="tc-divisor"></div>
        <p id="tc-prov-label">📍 ¿En qué provincia estás?</p>
        <div id="tc-prov-grid"></div>
        <button id="tc-btn-entrar" onclick="window._tcSplashCerrar()">
          Entrar a la app <span class="arr">→</span>
        </button>
        <button id="tc-splash-skip" onclick="window._tcSplashCerrar()">Omitir selección de provincia</button>
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
      /* Guardar y propagar al hero y al strip de index */
      localStorage.setItem(KEY_PROV, p)
      const heroSpan = document.getElementById('hero-prov-txt')
      if(heroSpan) heroSpan.textContent = p
      document.querySelectorAll('.prov-chip').forEach(c =>
        c.classList.toggle('active', c.textContent === p)
      )
      const activeChip = document.querySelector('.prov-chip.active')
      if(activeChip) activeChip.scrollIntoView({ block:'nearest', inline:'center', behavior:'smooth' })
      /* Cerrar automáticamente tras 700ms para que vean la selección */
      setTimeout(() => window._tcSplashCerrar(), 700)
    }

  /* ════════════════════════════════════════
     MODO B: Visita siguiente → Bienvenida rápida
  ════════════════════════════════════════ */
  } else {
    el.innerHTML = `
      <div class="tc-sp-dot" style="width:320px;height:320px;top:-120px;right:-100px;"></div>
      <div class="tc-sp-dot" style="width:220px;height:220px;bottom:-70px;left:-70px;"></div>
      <div id="tc-splash-inner">
        <img id="tc-splash-logo" src="/icon-192.png" alt="Trabajos Cerca" onerror="this.src='/logo.png'">
        <h1 id="tc-splash-nombre">Trabajos Cerca</h1>
        <p id="tc-splash-tagline">
          El lugar donde conseguir un empleo,<br>
          <strong>empleados, oficios o un profesional.</strong>
        </p>
        <div id="tc-splash-lugar"><span>📍</span><span>${provGuardada}</span></div>
        <button id="tc-btn-entrar" onclick="window._tcSplashCerrar()">
          Entrar a la app <span class="arr">→</span>
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
