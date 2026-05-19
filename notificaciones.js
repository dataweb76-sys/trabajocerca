import { supabase } from "./supabase.js"



async function escucharNotificaciones(){

const { data:userData } = await supabase.auth.getUser()

const userId = userData.user.id



supabase
.channel("notificaciones")

.on(
"postgres_changes",
{
event:"INSERT",
schema:"public",
table:"notificaciones",
filter:`usuario_id=eq.${userId}`
},

payload=>{

mostrarNotificacion(payload.new.mensaje)

}

)

.subscribe()

}



function mostrarNotificacion(texto){

const div = document.createElement("div")

div.className = "notificacion"

div.innerHTML = texto

document.body.appendChild(div)

setTimeout(()=>{

div.remove()

},5000)

}



escucharNotificaciones()