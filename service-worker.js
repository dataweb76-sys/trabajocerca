const CACHE = "trabajos-cerca-v1"

const urls = [

"/",
"/index.html",
"/style.css",
"/buscador.html",
"/registro.html",
"/login.html"

]

self.addEventListener("install", event => {

event.waitUntil(

caches.open(CACHE)
.then(cache => cache.addAll(urls))

)

})

self.addEventListener("fetch", event => {

event.respondWith(

caches.match(event.request)
.then(response => response || fetch(event.request))

)

})