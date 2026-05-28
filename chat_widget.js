;(function(){
  if(document.getElementById("lara-widget")) return

  /* ══════════════════════════════════════════════
     LARA — Asistente virtual de Trabajos Cerca
  ══════════════════════════════════════════════ */

  /* ── Base de conocimiento ── */
  const FAQ = [
    {
      q: "¿Para qué sirve registrarme?",
      tags: ["registrar","registro","cuenta","para que","sirve","inscrib"],
      r: `Al registrarte podés <strong>publicar tu perfil</strong> con tus servicios, aparecer en el buscador y en el mapa, recibir contactos de clientes y acumular calificaciones. ¡Es gratis! 🎉`
    },
    {
      q: "¿Cómo publico mis servicios?",
      tags: ["publicar","servicio","oficio","profesion","como pongo","agregar","categoria","categorias"],
      r: `Iniciá sesión, andá a <strong>Mi Perfil</strong> y completá la sección "Mis Servicios". Elegí tu categoría, escribí una descripción y guardá. ¡Ya aparecés en el buscador! 🔨<br><br>Tenemos categorías como Plomero, Electricista, Carpintero, <strong>Carnicero / Carnicería</strong>, <strong>Gestoría</strong>, Contador, Abogado y muchas más.`
    },
    {
      q: "¿Para qué sirve compartir mi perfil?",
      tags: ["compartir","compartido","difundir","link","enlace","redes"],
      r: `Compartir tu perfil en redes sociales, grupos de WhatsApp o con clientes anteriores te da más visibilidad. Cuanta más gente te vea, más calificaciones acumulás y <strong>más alto aparecés</strong> en el buscador. 📱`
    },
    {
      q: "¿Cómo funciona el sistema de calificaciones?",
      tags: ["calificacion","calificar","puntaje","puntos","estrellas","rating","nota","10","puntuar"],
      r: `Cada cliente puede calificarte del <strong>1 al 10</strong>. Los puntos se <em>acumulan</em>: si 3 clientes te dan 10, 8 y 9, tenés 27 puntos. Los perfiles con más puntos aparecen primero en el buscador. ¡Pedíle a tus clientes que te califiquen! ⭐`
    },
    {
      q: "¿Qué significa estar en Destacados?",
      tags: ["destacado","destacar","destacados","primero","arriba","posicion","aparecer primero"],
      r: `Los perfiles <strong>Destacados</strong> aparecen siempre al principio del buscador, antes que el resto. Es una función premium gestionada por el equipo de Trabajos Cerca. Próximamente habrá un plan para activarlo. 🌟`
    },
    {
      q: "¿Cómo subo fotos de trabajos realizados?",
      tags: ["foto","portfolio","trabajos realizados","trabajos","galeria","imagen","subir foto"],
      r: `En tu perfil encontrás la sección <strong>"Trabajos Realizados"</strong>. Podés subir fotos de tus proyectos. Con el <em>Plan Básico</em> subís hasta 2 fotos, con el <em>Plan Pro</em> hasta 5. Las fotos le generan más confianza a tus clientes. 📸`
    },
    {
      q: "¿Cuáles son los planes disponibles?",
      tags: ["plan","planes","precio","costo","basico","pro","pagar","abono","suscripcion"],
      r: `Hay tres planes pagos:<br>
      🥉 <strong>Plan 1 — $10.000/mes</strong>: 1 trabajo en portfolio.<br>
      🥈 <strong>Plan 2 — $15.000/mes</strong>: hasta 2 trabajos en portfolio.<br>
      🏆 <strong>Plan Pro — $30.000/mes</strong>: hasta 5 trabajos + prioridad en resultados.<br>
      Todos los precios son en pesos argentinos. Pagás desde tu perfil con MercadoPago. 💳`
    },
    {
      q: "¿Cómo me contacto con un profesional?",
      tags: ["contactar","contacto","como llamo","hablar","whatsapp","mensaje","llamar"],
      r: `En la tarjeta de cada profesional hay un botón de <strong>WhatsApp</strong>. Al hacer clic, se abre un chat con un mensaje ya escrito con tu nombre. ¡Solo mandalo y empezá a coordinar! 💬`
    },
    {
      q: "¿Qué es el Buscador de CVs?",
      tags: ["cv","curriculum","empleador","busco empleado","contratar","busco persona","trabajo","buscador cv"],
      r: `El <strong>Buscador de CVs</strong> muestra personas que buscan trabajo. Si tenés un negocio o necesitás personal, podés buscar por nombre, ciudad o categoría y contactarlas directamente por WhatsApp. 👥`
    },
    {
      q: "¿Cómo aparezco en el Mapa?",
      tags: ["mapa","ubicacion","aparecer mapa","localizacion","ciudad","donde"],
      r: `Al completar tu perfil con <strong>localidad y provincia</strong>, aparecés automáticamente en el mapa interactivo de Argentina. Los clientes pueden encontrarte según su ubicación. 📍`
    },
    {
      q: "¿Cómo escribo una buena descripción?",
      tags: ["descripcion","descripción","titulo","que pongo","como escribo","texto","bio"],
      r: `Contá qué hacés, cuántos años de experiencia tenés y en qué zonas trabajás. Mencioná algún trabajo especial que hayas hecho. <strong>Cuanto más completo, más confianza generás</strong>. Máximo 500 caracteres. ✍️`
    },
    {
      q: "¿Cuántas calificaciones necesito para subir en el buscador?",
      tags: ["cuantas calificaciones","subir","mejorar","posicion","ranking","escalar"],
      r: `No hay un mínimo, pero mientras más calificaciones altas acumulés, <strong>más arriba aparecés</strong>. Pedíle a cada cliente que te deje una nota. Con 5 clientes que te den 10 ya tenés 50 puntos. 🚀`
    },
    {
      q: "¿Es gratis usar Trabajos Cerca?",
      tags: ["gratis","gratuito","costo","cobran","pago","free","sin pagar"],
      r: `¡Sí! Registrarse, publicar tu perfil, aparecer en el buscador y en el mapa es <strong>100% gratis</strong>. Los planes pagos son opcionales y suman funciones extra como el portfolio de fotos. 💚`
    },
    {
      q: "¿Cómo funciona la Guía de la página?",
      tags: ["guia","ayuda","explicacion","como funciona","tutorial","instruccion"],
      r: `En tu perfil hay un banner azul que dice <strong>"Guía de la página"</strong>. Al hacer clic se abre una explicación completa del sistema de puntos, cómo acumular calificaciones y cómo sacarle el máximo provecho a tu perfil. 📖`
    },
    {
      q: "¿Cómo participo en el Prode del Mundial 2026?",
      tags: ["prode","mundial","fixture","participar","sorteo","como juego","como participo","premio","web gratis","500000","argentina campeon","invitar","referido"],
      r: `¡Hay premios increíbles! Así participás:<br><br>
      1️⃣ <strong>Registrate gratis</strong> en Trabajos Cerca.<br>
      2️⃣ <strong>Seguí a <a href="https://www.instagram.com/datawebdigital/" target="_blank" style="color:#ec4899;font-weight:700;">@datawebdigital</a></strong> en Instagram.<br>
      3️⃣ <strong>Invitá a 10 amigos</strong> a registrarse con tu link personal (lo encontrás en tu perfil).<br>
      4️⃣ Una vez cumplidos los requisitos, <strong>predecí los 104 partidos</strong> del Mundial.<br><br>
      🏆 <strong>Premios:</strong><br>
      🥇 1° lugar → <strong>Página web completa GRATIS</strong><br>
      🇦🇷 Si Argentina campeón + 3 resultados exactos → <strong>$500.000 ARS</strong><br><br>
      📌 3 pts por resultado exacto · 1 pt por tendencia · Las predicciones se bloquean 1 hora antes de cada partido.<br><br>
      <a href="/mundial.html" style="color:#15803d;font-weight:700;">→ Ir al Prode del Mundial</a>`
    },
    {
      q: "¿Cuáles son los requisitos para participar en el prode?",
      tags: ["requisitos","condiciones","necesito","cuanto","10 invitados","instagram","seguir","requisito prode","bases"],
      r: `Para participar en el Prode del Mundial 2026 necesitás cumplir <strong>3 requisitos</strong>:<br><br>
      ✅ <strong>Estar registrado</strong> en Trabajos Cerca (gratis).<br>
      📸 <strong>Seguir a <a href="https://www.instagram.com/datawebdigital/" target="_blank" style="color:#ec4899;font-weight:700;">@datawebdigital</a></strong> en Instagram.<br>
      👥 <strong>10 amigos registrados</strong> con tu link de invitación personal.<br><br>
      Una vez cumplidos, entrás al fixture y podés predecir los 104 partidos. El sorteo es válido cuando la plataforma supere los <strong>10.000 participantes</strong>.<br><br>
      <a href="/terminos-mundial.html" target="_blank" style="color:#2563eb;font-weight:700;">Ver bases y condiciones completas →</a>`
    }
  ]

  /* ── Mensajes de bienvenida ── */
  const SALUDO = `¡Hola! Soy <strong>Lara</strong>, tu asistente en Trabajos Cerca. 👋<br>Hacé clic en una pregunta frecuente o escribime lo que necesitás saber.`

  /* ── Respuesta por defecto ── */
  const DEFAULT_R = `Mmm, no estoy segura de eso todavía 😅. Pero podés contactar al equipo de Trabajos Cerca por WhatsApp: <a href="https://wa.me/5492954320639" target="_blank" style="color:#7c3aed;font-weight:700;">+54 9 2954 320639</a> y te ayudamos.`

  /* ── Buscar respuesta por palabras clave ── */
  function buscarRespuesta(texto){
    const t = texto.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"")
    let best = null, bestScore = 0
    for(const item of FAQ){
      let score = 0
      for(const tag of item.tags){
        if(t.includes(tag.normalize("NFD").replace(/[̀-ͯ]/g,""))) score++
      }
      if(score > bestScore){ bestScore = score; best = item }
    }
    return bestScore > 0 ? best.r : DEFAULT_R
  }

  /* ══════ SVG de Lara (cara femenina) ══════ */
  const SVG_LARA = `<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="20" cy="21" r="13" fill="#fde7c8"/>
    <ellipse cx="20" cy="11" rx="12" ry="7" fill="#7c3aed"/>
    <ellipse cx="9" cy="18" rx="3.5" ry="7" fill="#7c3aed"/>
    <ellipse cx="31" cy="18" rx="3.5" ry="7" fill="#7c3aed"/>
    <ellipse cx="15.5" cy="20" rx="1.8" ry="2" fill="#1e293b"/>
    <ellipse cx="24.5" cy="20" rx="1.8" ry="2" fill="#1e293b"/>
    <circle cx="16" cy="19.4" r=".6" fill="white"/>
    <circle cx="25" cy="19.4" r=".6" fill="white"/>
    <path d="M20 22.5 Q19 24 20 24.5 Q21 24 20 22.5" fill="#e8a87c"/>
    <path d="M16 26.5 Q20 29.5 24 26.5" stroke="#c0392b" stroke-width="1.5" stroke-linecap="round" fill="none"/>
    <circle cx="13.5" cy="24" r="2.5" fill="#f8a4a4" opacity=".5"/>
    <circle cx="26.5" cy="24" r="2.5" fill="#f8a4a4" opacity=".5"/>
  </svg>`

  const SVG_SEND = `<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </svg>`

  /* ══════ CSS ══════ */
  const css = `
  #lara-widget * { box-sizing: border-box; font-family: 'Segoe UI', system-ui, sans-serif; }

  /* ── Contenedor (relativo para posicionar el panel) ── */
  #lara-widget {
    position: relative;
    display: inline-flex;
    align-items: center;
  }

  /* ── Botón inline en el header ── */
  #lara-btn {
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 6px 13px 6px 8px;
    border-radius: 22px;
    background: rgba(255,255,255,.18);
    color: white;
    transition: background .2s;
    user-select: none;
    white-space: nowrap;
  }
  #lara-btn:hover { background: rgba(255,255,255,.30); }

  /* ── Avatar pequeño ── */
  #lara-avatar {
    width: 30px; height: 30px; border-radius: 50%;
    background: rgba(255,255,255,.25);
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; position: relative;
  }
  #lara-avatar svg { width: 22px; height: 22px; }

  /* ── Punto de notificación ── */
  #lara-notif {
    position: absolute; top: 0px; right: 0px;
    width: 10px; height: 10px; border-radius: 50%;
    background: #ef4444; border: 2px solid #2563eb;
    display: none;
  }

  /* ── Etiqueta de texto ── */
  #lara-name-tag {
    font-size: 13px; font-weight: 700; color: white;
    letter-spacing: .01em;
  }

  /* ── Panel de chat — cae desde el header ── */
  #lara-chat {
    position: absolute;
    top: calc(100% + 12px);
    left: 50%;
    width: 340px;
    background: white; border-radius: 18px;
    box-shadow: 0 8px 40px rgba(0,0,0,.18);
    display: flex; flex-direction: column; overflow: hidden;
    transform: translateX(-50%) scale(.88) translateY(-10px);
    opacity: 0;
    pointer-events: none;
    transition: transform .25s cubic-bezier(.34,1.56,.64,1), opacity .2s;
    z-index: 9998;
  }
  #lara-chat.abierto {
    transform: translateX(-50%) scale(1) translateY(0);
    opacity: 1;
    pointer-events: all;
  }

  /* ── Header del chat ── */
  #lara-header {
    background: linear-gradient(135deg, #7c3aed, #2563eb);
    padding: 14px 16px; display: flex; align-items: center; gap: 12px;
  }
  #lara-header-avatar {
    width: 42px; height: 42px; border-radius: 50%;
    background: rgba(255,255,255,.2);
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }
  #lara-header-avatar svg { width: 26px; height: 26px; }
  #lara-header-info { flex: 1; }
  #lara-header-info strong { color: white; font-size: 15px; display: block; }
  #lara-header-info span { color: rgba(255,255,255,.8); font-size: 11px; }
  #lara-close {
    background: rgba(255,255,255,.15); border: none; color: white;
    width: 28px; height: 28px; border-radius: 50%; font-size: 16px;
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    transition: background .15s;
  }
  #lara-close:hover { background: rgba(255,255,255,.3); }

  /* ── Mensajes ── */
  #lara-msgs {
    flex: 1; overflow-y: auto; padding: 14px 14px 6px;
    display: flex; flex-direction: column; gap: 10px;
    scroll-behavior: smooth; min-height: 180px;
  }
  #lara-msgs::-webkit-scrollbar { width: 4px; }
  #lara-msgs::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 4px; }

  .lara-msg { display: flex; gap: 8px; align-items: flex-end; }
  .lara-msg.user { flex-direction: row-reverse; }
  .lara-bubble {
    max-width: 82%; padding: 9px 13px; border-radius: 16px;
    font-size: 13px; line-height: 1.5; color: #1e293b;
    background: #f1f5f9;
  }
  .lara-bubble.user { background: linear-gradient(135deg,#7c3aed,#2563eb); color: white; }
  .lara-bubble a { color: #7c3aed; }
  .lara-bubble.user a { color: #bfdbfe; }
  .lara-msg-icon {
    width: 28px; height: 28px; border-radius: 50%;
    background: linear-gradient(135deg,#7c3aed,#2563eb);
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }
  .lara-msg-icon svg { width: 16px; height: 16px; }

  /* ── FAQs ── */
  #lara-faqs {
    padding: 6px 14px 10px;
    display: flex; flex-wrap: wrap; gap: 6px;
    border-top: 1px solid #f1f5f9;
    max-height: 160px; overflow-y: auto; flex-shrink: 0;
  }
  #lara-faqs-toggle {
    width: 100%; text-align: left; background: none; border: none;
    font-size: 11px; font-weight: 700; color: #94a3b8;
    letter-spacing: .06em; text-transform: uppercase;
    cursor: pointer; padding: 8px 0 4px; display: flex; align-items: center; gap: 4px;
  }
  .lara-faq-chip {
    background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe;
    border-radius: 20px; padding: 4px 11px; font-size: 11.5px; font-weight: 600;
    cursor: pointer; transition: background .15s, transform .1s;
  }
  .lara-faq-chip:hover { background: #dbeafe; transform: scale(1.03); }

  /* ── Input ── */
  #lara-input-row {
    padding: 10px 12px; border-top: 1px solid #f1f5f9;
    display: flex; gap: 8px;
  }
  #lara-input {
    flex: 1; border: 1.5px solid #e2e8f0; border-radius: 22px;
    padding: 8px 14px; font-size: 13px; outline: none;
    transition: border-color .15s;
  }
  #lara-input:focus { border-color: #7c3aed; }
  #lara-send {
    width: 36px; height: 36px; border-radius: 50%;
    background: linear-gradient(135deg,#7c3aed,#2563eb);
    border: none; cursor: pointer; display: flex; align-items: center; justify-content: center;
    transition: transform .15s, box-shadow .15s; flex-shrink: 0;
  }
  #lara-send:hover { transform: scale(1.1); box-shadow: 0 3px 10px rgba(124,58,237,.4); }
  #lara-send svg { width: 16px; height: 16px; }

  /* ── Typing indicator ── */
  .lara-typing { display: flex; align-items: center; gap: 4px; padding: 6px 4px; }
  .lara-typing span {
    width: 7px; height: 7px; border-radius: 50%; background: #94a3b8;
    animation: lara-bounce .9s infinite;
  }
  .lara-typing span:nth-child(2){ animation-delay:.15s; }
  .lara-typing span:nth-child(3){ animation-delay:.3s; }
  @keyframes lara-bounce {
    0%,80%,100%{ transform:translateY(0); }
    40%{ transform:translateY(-6px); }
  }

  /* ── Mobile ── */
  @media(max-width: 520px){
    #lara-name-tag { display: none; }
    #lara-btn { padding: 6px 8px; }
    #lara-chat {
      position: fixed;
      top: 62px;
      left: 12px;
      right: 12px;
      width: auto;
      transform: scale(.88) translateY(-10px);
    }
    #lara-chat.abierto {
      transform: scale(1) translateY(0);
    }
  }
  `

  /* ══════ HTML ══════ */
  const html = `
  <div id="lara-widget">
    <div id="lara-btn" onclick="window._laraToggle()">
      <div id="lara-avatar">
        ${SVG_LARA}
        <div id="lara-notif"></div>
      </div>
      <div id="lara-name-tag">Consultá tus dudas</div>
    </div>

    <div id="lara-chat">
      <div id="lara-header">
        <div id="lara-header-avatar">${SVG_LARA}</div>
        <div id="lara-header-info">
          <strong>Lara</strong>
          <span>Consultá tus dudas · Trabajos Cerca</span>
        </div>
        <button id="lara-close" onclick="window._laraToggle()">×</button>
      </div>

      <div id="lara-msgs"></div>

      <div id="lara-faqs">
        <button id="lara-faqs-toggle" onclick="window._laraToggleFaqs()">
          <span id="lara-faqs-arrow">▸</span> Preguntas frecuentes
        </button>
        <div id="lara-faqs-list" style="display:none;flex-wrap:wrap;gap:6px;width:100%;"></div>
      </div>

      <div id="lara-input-row">
        <input id="lara-input" placeholder="Escribime tu pregunta..." onkeydown="if(event.key==='Enter') window._laraEnviar()">
        <button id="lara-send" onclick="window._laraEnviar()">${SVG_SEND}</button>
      </div>
    </div>
  </div>`

  /* ══════ Inyectar CSS ══════ */
  const styleEl = document.createElement("style")
  styleEl.textContent = css
  document.head.appendChild(styleEl)

  /* ══════ Inyectar HTML — entre logo y nav en el topbar ══════ */
  const topbar = document.querySelector(".topbar") || document.querySelector("header")
  const nav    = topbar ? topbar.querySelector("nav") : null

  const wrap = document.createElement("div")
  wrap.innerHTML = html

  if(nav && topbar){
    // Insertar entre logo y nav
    topbar.insertBefore(wrap.firstElementChild, nav)
  } else if(topbar){
    topbar.appendChild(wrap.firstElementChild)
  } else {
    // Fallback: botón flotante si no hay topbar
    const fallbackEl = wrap.firstElementChild
    fallbackEl.style.cssText = "position:fixed;bottom:24px;right:24px;z-index:9999;"
    document.body.appendChild(fallbackEl)
  }

  /* ══════ Cerrar al clickear afuera ══════ */
  document.addEventListener("click", e => {
    const widget = document.getElementById("lara-widget")
    if(widget && !widget.contains(e.target)){
      document.getElementById("lara-chat")?.classList.remove("abierto")
      abierto = false
    }
  })

  /* ══════ Estado ══════ */
  let abierto = false
  let faqsVisible = false
  let primeraMensaje = true

  const chatEl   = document.getElementById("lara-chat")
  const msgsEl   = document.getElementById("lara-msgs")
  const inputEl  = document.getElementById("lara-input")
  const notifEl  = document.getElementById("lara-notif")
  const faqsList = document.getElementById("lara-faqs-list")
  const faqsArrow= document.getElementById("lara-faqs-arrow")

  /* ── Construir chips FAQ ── */
  FAQ.forEach(item => {
    const btn = document.createElement("button")
    btn.className = "lara-faq-chip"
    btn.textContent = item.q
    btn.onclick = () => {
      agregarMsg(item.q, "user")
      setTimeout(() => mostrarTyping(() => agregarMsg(item.r, "lara")), 600)
    }
    faqsList.appendChild(btn)
  })

  /* ── Mostrar/ocultar FAQs ── */
  window._laraToggleFaqs = function(){
    faqsVisible = !faqsVisible
    faqsList.style.display = faqsVisible ? "flex" : "none"
    faqsArrow.textContent = faqsVisible ? "▾" : "▸"
  }

  /* ── Toggle ventana ── */
  window._laraToggle = function(e){
    if(e) e.stopPropagation()
    abierto = !abierto
    chatEl.classList.toggle("abierto", abierto)
    if(abierto){
      notifEl.style.display = "none"
      if(primeraMensaje){
        primeraMensaje = false
        setTimeout(() => agregarMsg(SALUDO, "lara"), 300)
      }
      setTimeout(() => inputEl.focus(), 400)
    }
  }

  /* ── Agregar mensaje al chat ── */
  function agregarMsg(texto, tipo){
    const div = document.createElement("div")
    div.className = `lara-msg ${tipo === "user" ? "user" : ""}`

    if(tipo !== "user"){
      const iconDiv = document.createElement("div")
      iconDiv.className = "lara-msg-icon"
      iconDiv.innerHTML = SVG_LARA
      div.appendChild(iconDiv)
    }

    const bubble = document.createElement("div")
    bubble.className = `lara-bubble ${tipo === "user" ? "user" : ""}`
    bubble.innerHTML = texto
    div.appendChild(bubble)

    msgsEl.appendChild(div)
    msgsEl.scrollTop = msgsEl.scrollHeight
  }

  /* ── Typing indicator ── */
  function mostrarTyping(cb){
    const div = document.createElement("div")
    div.className = "lara-msg"
    div.id = "lara-typing-ind"

    const iconDiv = document.createElement("div")
    iconDiv.className = "lara-msg-icon"
    iconDiv.innerHTML = SVG_LARA
    div.appendChild(iconDiv)

    const bubble = document.createElement("div")
    bubble.className = "lara-bubble"
    bubble.innerHTML = `<div class="lara-typing"><span></span><span></span><span></span></div>`
    div.appendChild(bubble)

    msgsEl.appendChild(div)
    msgsEl.scrollTop = msgsEl.scrollHeight

    setTimeout(() => {
      const ind = document.getElementById("lara-typing-ind")
      if(ind) ind.remove()
      cb()
    }, 800)
  }

  /* ── Enviar pregunta escrita ── */
  window._laraEnviar = function(){
    const txt = inputEl.value.trim()
    if(!txt) return
    inputEl.value = ""
    agregarMsg(txt, "user")
    setTimeout(() => mostrarTyping(() => agregarMsg(buscarRespuesta(txt), "lara")), 400)
  }

  /* ── Notif inicial después de 3s ── */
  setTimeout(() => {
    if(!abierto) notifEl.style.display = "block"
  }, 3000)

})()
