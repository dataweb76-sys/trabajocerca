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

  window.location.href = "/perfil.html"
}

window.login = login
