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

window.login = login
window.loginConGoogle = loginConGoogle
