import { supabase } from "./supabase.js"

async function login(){
  const email    = document.getElementById("email").value.trim()
  const password = document.getElementById("password").value
  const msg      = document.getElementById("msg")

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if(error){
    msg.innerHTML = `<div class="alerta alerta-err">${error.message}</div>`
    return
  }

  // Si vino de auth_guard con ?next=, volver a esa página
  var next = new URLSearchParams(location.search).get('next')
  window.location.href = (next && next.startsWith('/')) ? next : '/perfil.html'
}

async function loginConGoogle(){
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: "https://trabajoscerca.com.ar/auth_callback.html"
    }
  })
  if(error){
    const msg = document.getElementById("msg")
    msg.innerHTML = `<div class="alerta alerta-err">${error.message}</div>`
  }
}

async function loginConFacebook(){
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "facebook",
    options: {
      redirectTo: "https://www.trabajoscerca.com.ar/auth_callback.html",
      scopes: "public_profile"
    }
  })
  if(error){
    const msg = document.getElementById("msg")
    if(msg) msg.innerHTML = `<div class="alerta alerta-err">${error.message}</div>`
  }
}

window.login = login
window.loginConGoogle = loginConGoogle
window.loginConFacebook = loginConFacebook

window.mostrarRecuperarPass = function(e) {
  if(e) e.preventDefault()
  const panel = document.getElementById("panelRecuperar")
  if(panel) panel.style.display = panel.style.display === "none" ? "block" : "none"
}

window.enviarRecuperacion = async function() {
  const email = (document.getElementById("emailRecuperar")?.value || "").trim()
  const msg   = document.getElementById("msgRecuperar")
  const btn   = document.querySelector("#panelRecuperar button")
  if(!msg) return

  if(!email) {
    msg.innerHTML = '<span style="color:#dc2626;">Ingresá tu email.</span>'
    return
  }

  if(btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Enviando...' }
  msg.innerHTML = ""

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: "https://trabajoscerca.com.ar/auth_callback.html"
  })

  if(btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Enviar enlace de recuperación' }

  if(error) {
    msg.innerHTML = `<span style="color:#dc2626;">${error.message}</span>`
  } else {
    msg.innerHTML = `
      <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:10px 12px;color:#15803d;font-size:13px;line-height:1.5;">
        <i class="fa-solid fa-circle-check"></i> <strong>¡Listo!</strong> Te enviamos un email con el enlace para cambiar tu contraseña.<br>
        <span style="font-size:12px;color:#16a34a;">Revisá también la carpeta de spam si no lo encontrás.</span>
      </div>`
  }
}
