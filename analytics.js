;(function(){
  /* Trabajos Cerca — registro de visitas reales (anónimas, sin cookies)
     Inserta una fila en visitas_pagina con la ruta de la página actual.
     La tabla requiere RLS con INSERT para anon. Ver SQL en documentación. */

  const SB_URL = "https://iqeiszkoifxgygoqvbem.supabase.co"
  const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxZWlzemtvaWZ4Z3lnb3F2YmVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkyMTEzODIsImV4cCI6MjA5NDc4NzM4Mn0.qxt70TPbARPcMc8HhHx2A2QnfBvJLCrnrH4m36IcENs"

  // Evitar registrar bots obvios
  if(navigator.userAgent.toLowerCase().includes("bot")) return
  if(navigator.userAgent.toLowerCase().includes("crawler")) return

  try {
    fetch(`${SB_URL}/rest/v1/visitas_pagina`, {
      method: "POST",
      headers: {
        "apikey": SB_KEY,
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
      },
      body: JSON.stringify({ pagina: location.pathname })
    })
  } catch(e){}
})()
