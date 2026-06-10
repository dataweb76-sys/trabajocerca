/*  ══════════════════════════════════════════════════════
    CAMI — Asistente IA · Trabajos Cerca
    Solo texto + TTS opcional. Sin micrófono.
    Páginas: registro · perfil (bienvenida) · perfil_servicio
    ══════════════════════════════════════════════════════ */
;(function(){
'use strict'

/* ─────────────────────────────────────────────────────
   DETECCIÓN DE PÁGINA
───────────────────────────────────────────────────────*/
const _path       = location.pathname.replace(/\/$|\.html$/g,'')
const EN_REGISTRO = !!document.getElementById('formReg')
const EN_SERVICIO = !!document.getElementById('selectorTipo')
const EN_PERFIL   = !EN_REGISTRO && !EN_SERVICIO && _path.endsWith('/perfil')

if(!EN_REGISTRO && !EN_SERVICIO && !EN_PERFIL) return

/* ─────────────────────────────────────────────────────
   MEMORIA DE SESIÓN — ¿ya me presenté?
───────────────────────────────────────────────────────*/
const YA_SALUDE  = !!sessionStorage.getItem('tc_cami_saludo')
const marcarSal  = () => sessionStorage.setItem('tc_cami_saludo','1')

/* ─────────────────────────────────────────────────────
   GUÍA POR PASOS — perfil_servicio
   Cada paso tiene: título, texto corto, y FAQ clicables
───────────────────────────────────────────────────────*/
const PASOS = {
  oficio: [
    {
      titulo: '📋 Tipo de perfil',
      texto:  'Ya elegiste "Oficio". Este perfil te muestra en el buscador de oficios: plomeros, electricistas, pintores, etc.',
      faq: [
        { q:'¿Puedo tener más de un tipo de perfil?', a:'Sí. Una vez que guardés este perfil, podés agregar otro tipo desde tu cuenta. Por ejemplo: oficio + emprendimiento.' },
        { q:'¿Qué diferencia hay entre oficio y profesional?', a:'Oficio es para trabajos manuales o técnicos (plomería, electricidad, carpintería). Profesional es para carreras universitarias (médico, abogado, contador).' },
      ]
    },
    {
      titulo: '🔧 Oficios y especialidades',
      texto:  'Elegí tu oficio principal del menú desplegable. Si hacés más de uno, podés agregar hasta 10. Cuantos más cargues, más búsquedas te van a encontrar.',
      faq: [
        { q:'¿Cuántos oficios puedo poner?', a:'Hasta 10. Empezá con el principal y agregá los demás.' },
        { q:'¿Si no encuentro mi oficio en la lista?', a:'Elegí el más parecido y aclaralo en la descripción.' },
        { q:'¿Qué es la especialidad?', a:'Es una subcategoría del oficio. Por ejemplo: Electricidad → instalaciones domiciliarias.' },
      ]
    },
    {
      titulo: '📍 Zona de trabajo',
      texto:  'Escribí tu código postal y se completan la ciudad y provincia automáticamente. La dirección exacta es privada — los clientes solo ven tu ciudad.',
      faq: [
        { q:'¿Se ve mi dirección exacta?', a:'No. Solo se muestra la ciudad y el radio de cobertura que vos definís.' },
        { q:'¿Qué es el radio de cobertura?', a:'La zona donde trabajás. Podés poner por ejemplo "Todo La Plata y alrededores hasta 30km".' },
      ]
    },
    {
      titulo: '📝 Descripción y datos',
      texto:  'La descripción es lo primero que leen los clientes. Contá tu experiencia, qué tipo de trabajos hacés y qué te diferencia. Sé claro y breve — 3 o 4 oraciones alcanzan.',
      faq: [
        { q:'¿Qué conviene poner en la descripción?', a:'Tu experiencia (años trabajando), tipos de trabajo que hacés, si tenés garantía, y cómo preferís que te contacten.' },
        { q:'¿Qué es la matrícula/habilitación?', a:'Es opcional. Si tenés una habilitación oficial (gasista, electricista), ponela — genera más confianza.' },
        { q:'¿Para qué sirven los checkboxes de presupuesto y factura?', a:'Aparecen como íconos en tu perfil. Los clientes los usan para filtrar. Si podés facturar o hacés presupuesto gratis, marcalos.' },
      ]
    },
    {
      titulo: '💳 Formas de pago y horario',
      texto:  'Marcá las formas de pago que aceptás y completá tu horario. Podés usar los chips de acceso rápido (Lun–Vie 8–18, etc.) o escribir uno personalizado.',
      faq: [
        { q:'¿Tengo que poner un horario fijo?', a:'No. Podés elegir "A acordar con el cliente" si tu horario es flexible.' },
        { q:'¿Qué pasa si acepto otras formas de pago?', a:'Aclaralas en la descripción. En la lista solo están las más comunes.' },
      ]
    },
    {
      titulo: '📞 Contacto y foto',
      texto:  'Ponés el WhatsApp sin el 0 ni el 15 (solo el código de área + número). La foto de perfil es clave — los clientes confían mucho más en perfiles con foto real.',
      faq: [
        { q:'¿Cómo pongo el número de WhatsApp?', a:'Sin el cero inicial ni el 15. Si tu número es 011-15-2345-6789, ponés 1123456789.' },
        { q:'¿La foto tiene que ser profesional?', a:'No. Una foto clara donde se te vea la cara alcanza. También podés poner una foto de un trabajo tuyo.' },
        { q:'¿Es obligatoria la foto?', a:'No, pero los perfiles con foto reciben hasta 3 veces más contactos.' },
      ]
    },
    {
      titulo: '✅ Guardar perfil',
      texto:  '¡Ya está todo! Apretá el botón "Guardar perfil" y en segundos vas a aparecer en el buscador. Después podés seguir completando o editando desde tu cuenta.',
      faq: [
        { q:'¿Puedo editar el perfil después?', a:'Sí, cuando quieras. Entrás a tu cuenta, vas a "Mi perfil" y editás cualquier dato.' },
        { q:'¿Cuándo aparezco en el buscador?', a:'Inmediatamente después de guardar.' },
        { q:'¿Puedo agregar fotos de mis trabajos?', a:'Sí, desde tu cuenta en la sección "Trabajos realizados" podés subir fotos.' },
      ]
    },
  ],

  profesional: [
    {
      titulo: '👔 Tipo de perfil',
      texto:  'Elegiste "Profesional". Este perfil te muestra en el buscador de profesionales: médicos, abogados, contadores, arquitectos, etc.',
      faq: [
        { q:'¿Qué diferencia hay entre oficio y profesional?', a:'Profesional es para quienes tienen título universitario o terciario. Oficio es para trabajos técnicos/manuales.' },
        { q:'¿Puedo tener más de un perfil?', a:'Sí. Podés agregar más tipos desde tu cuenta una vez guardado el primero.' },
      ]
    },
    {
      titulo: '🎓 Especialidad y categoría',
      texto:  'Elegí tu categoría principal y la especialidad. Cuanto más específico, mejor — los clientes buscan por especialidad.',
      faq: [
        { q:'¿Puedo tener más de una especialidad?', a:'Sí, podés agregar varias. Empezá por la principal.' },
        { q:'¿Qué pongo si soy generalista?', a:'Elegí la categoría más amplia y aclaralo en la descripción.' },
      ]
    },
    {
      titulo: '📍 Ubicación y zona',
      texto:  'Tu ciudad aparece en el buscador. La dirección exacta es privada. Si atendés online o en otras ciudades, aclaraló en la descripción.',
      faq: [
        { q:'¿Se ve mi dirección exacta?', a:'No. Solo la ciudad y el radio de cobertura que definís.' },
        { q:'¿Y si atiendo online?', a:'Ponés tu ciudad como base y en la descripción aclarás que atendés de forma remota o en todo el país.' },
      ]
    },
    {
      titulo: '📝 Descripción y contacto',
      texto:  'La descripción es tu presentación. Mencioná tu formación, años de experiencia, en qué te especializás y cómo preferís que te contacten. El WhatsApp va sin 0 ni 15.',
      faq: [
        { q:'¿Qué conviene poner en la descripción?', a:'Tu título, especialidad, años de experiencia y qué te diferencia de otros profesionales.' },
        { q:'¿Cómo pongo el WhatsApp?', a:'Sin el 0 ni el 15. Si tu número es 0351-155-123456, ponés 3515123456.' },
      ]
    },
    {
      titulo: '🖼️ Foto y guardar',
      texto:  'Subí una foto profesional o clara. Los perfiles con foto tienen muchas más consultas. Después apretá "Guardar perfil" y aparecés en el buscador al instante.',
      faq: [
        { q:'¿Es obligatoria la foto?', a:'No, pero los perfiles con foto reciben hasta 3 veces más contactos.' },
        { q:'¿Puedo editar todo esto después?', a:'Sí, cuando quieras desde "Mi perfil" en tu cuenta.' },
      ]
    },
  ],

  cv: [
    {
      titulo: '📄 Busco empleo — CV',
      texto:  'Con este perfil las empresas y personas te encuentran cuando buscan empleados. Completá tus datos y quedás visible en el buscador de CVs.',
      faq: [
        { q:'¿Quién puede ver mi perfil?', a:'Cualquier persona registrada como empresa o que busque empleados en la plataforma.' },
        { q:'¿Puedo ocultar mi perfil temporalmente?', a:'Sí, desde tu cuenta podés activar o desactivar la visibilidad cuando quieras.' },
      ]
    },
    {
      titulo: '📝 Datos y descripción',
      texto:  'Completá tu ciudad, el área en la que buscás trabajo y una descripción de tu experiencia. Sé claro y específico — eso te diferencia.',
      faq: [
        { q:'¿Qué pongo en la descripción?', a:'Tu experiencia laboral, qué tipo de trabajo buscás y cuándo podés empezar.' },
        { q:'¿Puedo subir mi CV en PDF?', a:'Por ahora no. Describí tu experiencia en el campo de texto.' },
      ]
    },
    {
      titulo: '✅ Foto y guardar',
      texto:  'La foto no es obligatoria pero ayuda. Cuando todo esté listo, apretá "Guardar" y aparecés en el buscador.',
      faq: [
        { q:'¿Qué pasa si no subo foto?', a:'El perfil funciona igual, pero las empresas prefieren candidatos con foto.' },
      ]
    },
  ],

  emprendimiento: [
    {
      titulo: '🚀 Emprendimiento',
      texto:  'Este perfil muestra tu negocio, marca o proyecto en el buscador de emprendimientos. Podés subir fotos del producto o local.',
      faq: [
        { q:'¿Qué tipo de emprendimientos pueden publicarse?', a:'Cualquiera: gastronomía, artesanías, delivery, indumentaria, servicios creativos, etc.' },
        { q:'¿Puedo también aparecer como oficio o profesional?', a:'Sí, podés agregar más perfiles desde tu cuenta.' },
      ]
    },
    {
      titulo: '📝 Nombre, descripción y contacto',
      texto:  'Poné el nombre de tu emprendimiento, describí qué vendés o qué hacés, y agregá tu WhatsApp. La descripción es tu mejor herramienta de venta.',
      faq: [
        { q:'¿Qué pongo en la descripción?', a:'Qué vendés, qué te diferencia, si tenés envíos, cómo contactarte y dónde estás.' },
        { q:'¿Puedo poner mi Instagram?', a:'Sí, hay un campo específico para el Instagram o sitio web.' },
      ]
    },
    {
      titulo: '🖼️ Foto y guardar',
      texto:  'Subí una foto del producto, del local o del logo. Las imágenes son clave para los emprendimientos — los clientes compran lo que ven.',
      faq: [
        { q:'¿Cuántas fotos puedo subir?', a:'Una foto de portada en este formulario. Después podés agregar más desde tu perfil.' },
        { q:'¿Puedo editar todo esto después?', a:'Sí, cuando quieras desde "Mi perfil".' },
      ]
    },
  ],

  empresa: [
    {
      titulo: '🏢 Empresa o negocio',
      texto:  'Con este perfil publicás búsquedas de empleados y aparecés como empleador en la plataforma.',
      faq: [
        { q:'¿Puedo publicar múltiples puestos?', a:'Sí, podés crear una oferta por cada puesto que necesites cubrir.' },
        { q:'¿Los candidatos me pueden contactar directamente?', a:'Sí, a través de WhatsApp o el sistema de mensajes de la plataforma.' },
      ]
    },
    {
      titulo: '📝 Datos de la empresa',
      texto:  'Completá el nombre de la empresa, el rubro, tu ciudad y una descripción. Los candidatos usan esa información para decidir si postulan.',
      faq: [
        { q:'¿Tengo que ser una empresa formal?', a:'No. Podés ser un comercio, un emprendimiento que contrata, o una persona que necesita empleados.' },
      ]
    },
    {
      titulo: '✅ Contacto y guardar',
      texto:  'Agregá el WhatsApp o email de contacto. Al guardar, tu empresa queda visible para quienes buscan trabajo.',
      faq: [
        { q:'¿Puedo editar los datos después?', a:'Sí, en cualquier momento desde tu cuenta.' },
      ]
    },
  ],
}

// Fallback genérico si no hay pasos para el tipo
const PASOS_DEFAULT = [
  {
    titulo: '📋 Completá tu perfil',
    texto:  'Completá todos los campos del formulario. Cuanto más completo esté el perfil, más posibilidades tenés de que te encuentren.',
    faq: [
      { q:'¿Puedo editar el perfil después?', a:'Sí, en cualquier momento desde tu cuenta.' },
      { q:'¿Cuándo aparezco en el buscador?', a:'Inmediatamente después de guardar.' },
    ]
  },
]

/* ─────────────────────────────────────────────────────
   ESTADO
───────────────────────────────────────────────────────*/
let _ayudando        = false
let _burbujaVisible  = false
let _audioOn         = true
let _pasoActual      = 0
let _pasosDelTipo    = []
let _faqAbierta      = -1
let _modoActual      = EN_REGISTRO ? 'registro' : EN_SERVICIO ? 'servicio' : 'perfil'

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
   CREAR WIDGET
───────────────────────────────────────────────────────*/
function crearWidget(){
  const div = document.createElement('div')
  div.id = 'cami-widget'
  div.innerHTML = `
<style>
#cami-widget{
  position:fixed; top:68px; right:12px; z-index:10000;
  display:flex; flex-direction:column; align-items:flex-end; gap:7px;
  pointer-events:none;
}
#cami-burbuja{
  background:white; border:2px solid #6366f1;
  border-radius:16px 4px 16px 16px;
  padding:0; overflow:hidden;
  box-shadow:0 6px 28px rgba(99,102,241,.22);
  pointer-events:all; width:260px;
  opacity:0; transform:translateY(-8px) scale(.96);
  transition:opacity .25s,transform .25s;
}
#cami-burbuja.visible{opacity:1;transform:none;}
/* Header */
.cami-head{
  background:linear-gradient(135deg,#6366f1,#7c3aed);
  padding:9px 12px; display:flex; align-items:center; justify-content:space-between;
}
.cami-head-left{display:flex;align-items:center;gap:7px;}
.cami-head-left strong{color:white;font-size:12px;}
.cami-head-left span{color:rgba(255,255,255,.75);font-size:10px;}
.cami-head-right{display:flex;align-items:center;gap:6px;}
.cami-btn-ico{
  background:rgba(255,255,255,.18);border:none;color:white;
  width:24px;height:24px;border-radius:50%;cursor:pointer;
  font-size:12px;display:flex;align-items:center;justify-content:center;
  transition:background .15s;
}
.cami-btn-ico:hover{background:rgba(255,255,255,.32);}
/* Body */
.cami-body{padding:12px 13px 8px;}
.cami-paso-titulo{
  font-size:11px;font-weight:800;color:#6366f1;
  margin-bottom:5px;display:flex;align-items:center;gap:5px;
}
.cami-paso-barra{
  height:3px;background:#e0e7ff;border-radius:2px;margin-bottom:10px;
}
.cami-paso-barra-fill{height:100%;background:#6366f1;border-radius:2px;transition:width .4s;}
.cami-msg{font-size:12.5px;color:#374151;line-height:1.55;margin-bottom:10px;}
/* FAQ */
.cami-faq-titulo{font-size:10px;font-weight:700;color:#94a3b8;margin-bottom:5px;letter-spacing:.04em;}
.cami-faq-item{margin-bottom:4px;}
.cami-faq-q{
  width:100%;text-align:left;background:#f8fafc;border:1.5px solid #e2e8f0;
  border-radius:8px;padding:6px 9px;font-size:11.5px;color:#374151;
  cursor:pointer;display:flex;justify-content:space-between;align-items:center;
  transition:border-color .15s,background .15s;
}
.cami-faq-q:hover{border-color:#a5b4fc;background:#f5f3ff;}
.cami-faq-q.open{border-color:#6366f1;background:#eef2ff;color:#4338ca;font-weight:700;}
.cami-faq-a{
  font-size:11.5px;color:#4b5563;line-height:1.5;
  padding:7px 9px;background:#f5f3ff;
  border:1.5px solid #c7d2fe;border-top:none;
  border-radius:0 0 8px 8px;margin-top:-4px;display:none;
}
.cami-faq-a.open{display:block;}
/* Navegación */
.cami-nav{
  display:flex;gap:6px;padding:8px 13px 12px;
  border-top:1px solid #f1f5f9;
}
.cami-nav button{
  flex:1;padding:7px 6px;border-radius:8px;font-size:12px;
  font-weight:700;cursor:pointer;border:none;transition:all .15s;
}
.btn-prev{background:#f1f5f9;color:#64748b;}
.btn-prev:hover{background:#e2e8f0;}
.btn-next{background:#6366f1;color:white;}
.btn-next:hover{background:#4f46e5;}
.btn-next:disabled{background:#a5b4fc;cursor:default;}
/* Botones sí/no */
#cami-btns-inicio{display:flex;gap:6px;padding:0 13px 12px;}
#cami-btns-inicio button{
  flex:1;padding:8px;border-radius:8px;font-size:12.5px;
  font-weight:700;cursor:pointer;border:none;transition:all .15s;
}
.cb-si{background:#6366f1;color:white;}.cb-si:hover{background:#4f46e5;}
.cb-no{background:#f1f5f9;color:#64748b;}.cb-no:hover{background:#e2e8f0;}
/* Avatar */
#cami-av-wrap{
  position:relative;width:62px;height:72px;
  cursor:pointer;pointer-events:all;
}
#cami-av{
  width:62px;height:72px;
  filter:drop-shadow(0 4px 12px rgba(99,102,241,.28));
  transition:transform .2s;
}
#cami-av-wrap:hover #cami-av{transform:translateY(3px);}
.cami-badge{
  position:absolute;top:-3px;right:-3px;
  width:17px;height:17px;background:#6366f1;border-radius:50%;
  display:flex;align-items:center;justify-content:center;
  font-size:10px;border:2px solid white;animation:cr 2.2s infinite;
}
@keyframes cr{0%,100%{box-shadow:0 0 0 0 rgba(99,102,241,.4);}55%{box-shadow:0 0 0 6px rgba(99,102,241,0);}}
/* Modo bienvenida (dentro del overlay) */
#cami-widget.bv-mode{top:auto;bottom:12px;right:12px;z-index:9999;}
/* Teclado mobile */
#cami-widget.teclado-on #cami-burbuja{display:none!important;}
#cami-widget.teclado-on #cami-av-wrap{width:44px;height:51px;opacity:.75;}
@media(max-width:480px){
  #cami-widget{top:58px;right:6px;}
  #cami-burbuja{width:224px;}
  #cami-av-wrap,#cami-av{width:52px;height:60px;}
}
</style>

<div id="cami-burbuja">
  <div class="cami-head">
    <div class="cami-head-left">
      <div style="width:28px;height:28px;background:rgba(255,255,255,.2);border-radius:50%;overflow:hidden;flex-shrink:0;">
        <svg viewBox="0 0 120 130" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;">
          <ellipse cx="60" cy="72" rx="26" ry="27" fill="#fbbf7a"/>
          <ellipse cx="60" cy="58" rx="28" ry="20" fill="#7c3aed"/>
          <ellipse cx="50" cy="74" rx="4.5" ry="5" fill="white"/><ellipse cx="70" cy="74" rx="4.5" ry="5" fill="white"/>
          <circle cx="51" cy="75" r="2.8" fill="#1e293b"/><circle cx="71" cy="75" r="2.8" fill="#1e293b"/>
          <path d="M53 88 Q60 94 67 88" stroke="#c2410c" stroke-width="2" fill="none" stroke-linecap="round"/>
        </svg>
      </div>
      <div><strong>Cami</strong><br><span>Asistente de registro</span></div>
    </div>
    <div class="cami-head-right">
      <button class="cami-btn-ico" onclick="_camiToggleAudio()" id="cami-audio-btn" title="Activar/desactivar voz">🔊</button>
      <button class="cami-btn-ico" onclick="_cami.cerrar()" title="Cerrar">✕</button>
    </div>
  </div>

  <!-- Vista: saludo inicial -->
  <div id="cami-vista-saludo">
    <div class="cami-body">
      <div class="cami-msg" id="cami-msg-saludo">…</div>
    </div>
    <div id="cami-btns-inicio">
      <button class="cb-si" onclick="window.camiAceptar()">👍 Sí, ayudame</button>
      <button class="cb-no" onclick="window.camiRechazar()">No, gracias</button>
    </div>
  </div>

  <!-- Vista: guía por pasos -->
  <div id="cami-vista-pasos" style="display:none;">
    <div class="cami-body">
      <div class="cami-paso-titulo" id="cami-paso-titulo">…</div>
      <div class="cami-paso-barra"><div class="cami-paso-barra-fill" id="cami-barra-fill" style="width:0%"></div></div>
      <div class="cami-msg" id="cami-paso-msg">…</div>
      <div class="cami-faq-titulo">PREGUNTAS FRECUENTES</div>
      <div id="cami-faq-lista"></div>
    </div>
    <div class="cami-nav">
      <button class="btn-prev" id="cami-btn-prev" onclick="window.camiPrevPaso()">← Anterior</button>
      <button class="btn-next" id="cami-btn-next" onclick="window.camiNextPaso()">Siguiente →</button>
    </div>
  </div>
</div>

<div id="cami-av-wrap" onclick="_cami.toggleBurbuja()" title="Cami · Asistente">
  <div id="cami-av">${AV}</div>
  <div class="cami-badge">💬</div>
</div>`
  document.body.appendChild(div)
}

/* ─────────────────────────────────────────────────────
   TTS — solo texto a voz, opcional
───────────────────────────────────────────────────────*/
let _vozElegida = null
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
}

function hablar(txt){
  if(!_audioOn || !window.speechSynthesis) return
  speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(txt)
  u.lang = 'es-AR'; u.rate = 0.96; u.pitch = 1.05
  if(_vozElegida) u.voice = _vozElegida
  try { speechSynthesis.speak(u) } catch(e){}
}

window._camiToggleAudio = function(){
  _audioOn = !_audioOn
  const b = document.getElementById('cami-audio-btn')
  if(b) b.textContent = _audioOn ? '🔊' : '🔇'
  if(!_audioOn) window.speechSynthesis?.cancel()
}

/* ─────────────────────────────────────────────────────
   UI — abrir / cerrar burbuja
───────────────────────────────────────────────────────*/
function abrirBurbuja(){ document.getElementById('cami-burbuja')?.classList.add('visible'); _burbujaVisible=true }
function cerrarBurbuja(){ document.getElementById('cami-burbuja')?.classList.remove('visible'); _burbujaVisible=false }

window._cami = {
  toggleBurbuja(){ _burbujaVisible ? cerrarBurbuja() : abrirBurbuja() },
  cerrar(){ cerrarBurbuja(); speechSynthesis?.cancel() }
}

/* ─────────────────────────────────────────────────────
   SALUDO INICIAL
───────────────────────────────────────────────────────*/
function mostrarSaludo(txt, delay){
  setTimeout(() => {
    document.getElementById('cami-msg-saludo').textContent = txt
    document.getElementById('cami-vista-saludo').style.display = ''
    document.getElementById('cami-vista-pasos').style.display  = 'none'
    abrirBurbuja()
    hablar(txt)
    marcarSal()
  }, delay)
}

/* ─────────────────────────────────────────────────────
   ACEPTAR / RECHAZAR
───────────────────────────────────────────────────────*/
window.camiAceptar = function(){
  _ayudando = true

  if(_modoActual === 'registro'){
    // En registro: explicación simple del formulario sin pasos
    mostrarMsgSimple('¡Dale! Completá los campos de arriba. Si tenés alguna duda sobre un campo, hacé clic acá para preguntar.', [
      { q:'¿Qué número de teléfono pongo?', a:'El de WhatsApp, sin el 0 ni el 15. Por ejemplo si tu número es 011-15-2345-6789, ponés 1123456789.' },
      { q:'¿Por qué me piden email?', a:'Es tu usuario para entrar a la plataforma. Te llegará un mail de confirmación.' },
      { q:'¿Mis datos son privados?', a:'Sí. El teléfono solo se muestra a quienes tengan tu perfil activado. El email nunca se muestra.' },
      { q:'¿Ya termino el registro acá?', a:'Con esto creás tu cuenta. Después vas a elegir qué tipo de perfil querés (oficio, profesional, etc.) y completar los datos del servicio.' },
    ])
    return
  }

  if(_modoActual === 'bv'){
    mostrarMsgSimple('¡Perfecto! Elegí la opción que mejor te describe. Podés elegir más de una, pero te recomiendo empezar con una sola y agregar más desde tu cuenta una vez que tengas el perfil completo.', [
      { q:'¿Qué diferencia hay entre oficio y profesional?', a:'Oficio es para trabajos manuales/técnicos (plomería, electricidad). Profesional es para carreras universitarias (médico, abogado).' },
      { q:'¿Puedo tener más de un tipo?', a:'Sí. Una vez guardado el primer perfil, podés agregar más desde tu cuenta.' },
      { q:'¿Qué es "Solo busco contratar"?', a:'Es para quienes necesitan contratar un servicio pero no van a ofrecer nada. No necesitan completar datos de servicio.' },
      { q:'¿Puedo cambiar esto después?', a:'Sí, en cualquier momento desde tu cuenta.' },
    ])
    return
  }

  if(_modoActual === 'servicio'){
    // Detectar tipo de la URL
    const tipo = new URLSearchParams(location.search).get('tipo') || 'oficio'
    _pasosDelTipo = PASOS[tipo] || PASOS_DEFAULT
    _pasoActual   = 0
    renderPaso()
    return
  }
}

window.camiRechazar = function(){
  _ayudando = false
  document.getElementById('cami-msg-saludo').textContent = '¡Genial, qué bueno que sabés cómo hacerlo! Si necesitás algo, hacé clic acá.'
  hablar('Genial, qué bueno que sabés cómo hacerlo. Cualquier cosa estoy acá.')
  setTimeout(cerrarBurbuja, 3500)
}

/* ─────────────────────────────────────────────────────
   VISTA SIMPLE (registro / bienvenida)
───────────────────────────────────────────────────────*/
function mostrarMsgSimple(txt, faqs){
  document.getElementById('cami-vista-saludo').style.display = 'none'
  document.getElementById('cami-vista-pasos').style.display  = ''
  document.getElementById('cami-paso-titulo').textContent    = '✨ Cami te explica'
  document.getElementById('cami-barra-fill').style.width     = '100%'
  document.getElementById('cami-paso-msg').textContent       = txt
  document.getElementById('cami-btn-prev').style.display     = 'none'
  document.getElementById('cami-btn-next').style.display     = 'none'
  renderFAQ(faqs)
  hablar(txt)
}

/* ─────────────────────────────────────────────────────
   GUÍA POR PASOS (perfil_servicio)
───────────────────────────────────────────────────────*/
function renderPaso(){
  const paso  = _pasosDelTipo[_pasoActual]
  const total = _pasosDelTipo.length
  const pct   = Math.round((_pasoActual / (total - 1)) * 100) || 5

  document.getElementById('cami-vista-saludo').style.display = 'none'
  document.getElementById('cami-vista-pasos').style.display  = ''

  document.getElementById('cami-paso-titulo').textContent = paso.titulo + ' · ' + (_pasoActual+1) + '/' + total
  document.getElementById('cami-barra-fill').style.width  = pct + '%'
  document.getElementById('cami-paso-msg').textContent    = paso.texto

  const prev = document.getElementById('cami-btn-prev')
  const next = document.getElementById('cami-btn-next')
  prev.style.display = ''
  next.style.display = ''
  prev.disabled = _pasoActual === 0
  next.textContent = _pasoActual === total-1 ? '✅ Listo' : 'Siguiente →'

  _faqAbierta = -1
  renderFAQ(paso.faq)

  hablar(paso.texto)
  abrirBurbuja()
}

function renderFAQ(faqs){
  const lista = document.getElementById('cami-faq-lista')
  lista.innerHTML = faqs.map((f, i) => `
    <div class="cami-faq-item">
      <button class="cami-faq-q" onclick="_camiFaqToggle(${i})" id="cfq-${i}">
        <span>❓ ${f.q}</span><span id="cfq-ico-${i}">▾</span>
      </button>
      <div class="cami-faq-a" id="cfa-${i}">${f.a}</div>
    </div>`).join('')
}

window._camiFaqToggle = function(i){
  const q = document.getElementById('cfq-'+i)
  const a = document.getElementById('cfa-'+i)
  const ico = document.getElementById('cfq-ico-'+i)
  const paso = _pasosDelTipo[_pasoActual] || { faq: [] }
  const faqActual = paso.faq || []

  if(_faqAbierta === i){
    // Cerrar
    q?.classList.remove('open')
    if(a){ a.classList.remove('open') }
    if(ico) ico.textContent = '▾'
    _faqAbierta = -1
    speechSynthesis?.cancel()
  } else {
    // Cerrar anterior
    if(_faqAbierta >= 0){
      document.getElementById('cfq-'+_faqAbierta)?.classList.remove('open')
      const prevA = document.getElementById('cfa-'+_faqAbierta)
      if(prevA) prevA.classList.remove('open')
      const prevIco = document.getElementById('cfq-ico-'+_faqAbierta)
      if(prevIco) prevIco.textContent = '▾'
    }
    // Abrir nuevo
    q?.classList.add('open')
    if(a){ a.classList.add('open') }
    if(ico) ico.textContent = '▴'
    _faqAbierta = i
    // Leer la respuesta en voz si está activado
    if(faqActual[i]) hablar(faqActual[i].a)
  }
}

window.camiNextPaso = function(){
  if(_pasoActual < _pasosDelTipo.length - 1){
    _pasoActual++
    renderPaso()
  } else {
    // Último paso — cerrar con mensaje de cierre
    document.getElementById('cami-paso-titulo').textContent = '✅ ¡Todo listo!'
    document.getElementById('cami-barra-fill').style.width  = '100%'
    document.getElementById('cami-paso-msg').textContent    = 'Guardá el perfil y en segundos aparecés en el buscador. Si necesitás algo más, hacé clic en mi avatar.'
    document.getElementById('cami-faq-lista').innerHTML     = ''
    document.getElementById('cami-btn-next').style.display  = 'none'
    document.getElementById('cami-btn-prev').style.display  = 'none'
    hablar('Guardá el perfil y en segundos aparecés en el buscador. Suerte.')
    setTimeout(cerrarBurbuja, 6000)
  }
}

window.camiPrevPaso = function(){
  if(_pasoActual > 0){ _pasoActual--; renderPaso() }
}

/* ─────────────────────────────────────────────────────
   BIND — campo selectorTipo cambia → actualizar pasos
───────────────────────────────────────────────────────*/
function bindServicio(){
  document.getElementById('selectorTipo')?.addEventListener('change', e => {
    if(!_ayudando) return
    const tipo = e.target.value
    if(!tipo) return
    _pasosDelTipo = PASOS[tipo] || PASOS_DEFAULT
    _pasoActual   = 0
    renderPaso()
  })
}

/* ─────────────────────────────────────────────────────
   BIND — bienvenida overlay (llamado desde perfil.js)
───────────────────────────────────────────────────────*/
window._camiActivarBienvenida = function(){
  _modoActual = 'bv'
  document.getElementById('cami-widget')?.classList.add('bv-mode')
  const txt = YA_SALUDE ? '¿Querés que acá te siga ayudando?' : '¡Hola! ¿Querés que te ayude a elegir tu tipo de perfil?'
  mostrarSaludo(txt, 700)
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
    if(window.innerHeight < altH * 0.72) w.classList.add('teclado-on')
    else { w.classList.remove('teclado-on'); altH = window.innerHeight }
  })
}

/* ─────────────────────────────────────────────────────
   INIT
───────────────────────────────────────────────────────*/
function init(){
  crearWidget()
  bindTeclado()

  if(EN_REGISTRO){
    _modoActual = 'registro'
    const txt = YA_SALUDE ? '¿Querés que acá te siga ayudando con el registro?' : '¡Hola! Soy Cami. ¿Querés que te ayude a registrarte?'
    mostrarSaludo(txt, 1800)
  }
  else if(EN_SERVICIO){
    _modoActual = 'servicio'
    bindServicio()
    // Detectar tipo de la URL para pre-cargar pasos
    const tipo = new URLSearchParams(location.search).get('tipo') || ''
    _pasosDelTipo = (tipo && PASOS[tipo]) ? PASOS[tipo] : PASOS_DEFAULT
    const txt = YA_SALUDE ? '¿Querés que acá te siga ayudando?' : '¡Hola! ¿Querés que te explique cómo completar este formulario?'
    mostrarSaludo(txt, 1200)
  }
  else if(EN_PERFIL){
    _modoActual = 'perfil'
    // Se activa solo cuando perfil.js llama _camiActivarBienvenida()
  }
  marcarSal()
}

if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init)
else init()

})()
