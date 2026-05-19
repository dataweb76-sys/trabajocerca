import { supabase } from "./supabase.js"



async function verificarAdmin(){

const { data:userData } =
await supabase.auth.getUser()

if(!userData.user){

location.href="/login.html"
return

}

const { data } =
await supabase
.from("perfiles")
.select("admin")
.eq("id",userData.user.id)
.single()


if(!data.admin){

alert("No tienes acceso")
location.href="/"

}

}



async function cargarPendientes(){

const { data } =
await supabase
.from("media_pendiente")
.select("*")


const cont =
document.getElementById("pendientes")

cont.innerHTML=""


data.forEach(item=>{

const div=document.createElement("div")

div.className="card"


div.innerHTML=`

<img src="${item.archivo}" width="200">

<br><br>

<button onclick="aprobar('${item.id}')">
Aprobar
</button>

<button onclick="eliminar('${item.id}')">
Eliminar
</button>

`

cont.appendChild(div)

})

}



async function aprobar(id){

await supabase
.from("media_pendiente")
.update({aprobado:true})
.eq("id",id)

location.reload()

}



async function eliminar(id){

await supabase
.from("media_pendiente")
.delete()
.eq("id",id)

location.reload()

}



window.aprobar = aprobar
window.eliminar = eliminar


verificarAdmin()
cargarPendientes()