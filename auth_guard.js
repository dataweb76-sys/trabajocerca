/**
 * auth_guard.js
 * Corre ANTES de que cargue el contenido.
 * Si el usuario no está logueado → lo manda a /login.html
 * Único exento: /mundial.html
 */
(function(){
  try {
    var token = JSON.parse(localStorage.getItem('sb-iqeiszkoifxgygoqvbem-auth-token'))
    if(token && token.access_token) return   // logueado OK
  } catch(e){}

  // No logueado → redirigir a login con parámetro de retorno
  var next = encodeURIComponent(location.pathname + location.search)
  location.replace('/login.html?next=' + next)
})()
