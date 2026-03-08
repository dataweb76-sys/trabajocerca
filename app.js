import { supabase } from './supabase.js'

async function cargarServicios(){

const { data } = await supabase
.from('servicios')
.select('*')

const contenedor = document.getElementById("resultados")

data.forEach(servicio=>{

const card = document.createElement("div")

card.innerHTML = `
<h3>${servicio.nombre}</h3>
<p>${servicio.categoria}</p>
<p>${servicio.ciudad}</p>
<p>📞 ${servicio.telefono}</p>
`

contenedor.appendChild(card)

})

}

cargarServicios()