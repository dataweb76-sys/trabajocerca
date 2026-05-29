/* ══════════════════════════════════════════════
   Trabajos Cerca — Service Worker
   - Cache básico para funcionar offline
   - Manejo de Push Notifications
══════════════════════════════════════════════ */

const CACHE_NAME = 'tc-v25'
const CACHE_STATIC = ['/index.html', '/style.css', '/logo.png']

/* ── Instalación ── */
self.addEventListener('install', e => {
  self.skipWaiting()
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(c => Promise.allSettled(CACHE_STATIC.map(url => c.add(url))))
  )
})

/* ── Activación ── */
self.addEventListener('activate', e => {
  self.clients.claim()
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => {
      // Avisar a todos los clientes que hay nueva versión activa
      self.clients.matchAll({ type: 'window' }).then(clients => {
        clients.forEach(c => c.postMessage({ type: 'SW_UPDATED' }))
      })
    })
  )
})

/* ── Mensaje desde la página (skip waiting manual) ── */
self.addEventListener('message', e => {
  if(e.data?.type === 'SKIP_WAITING') self.skipWaiting()
})

/* ── Fetch: network-first, cache como fallback ── */
self.addEventListener('fetch', e => {
  if(e.request.method !== 'GET') return
  // No cachear llamadas a Supabase
  if(e.request.url.includes('supabase.co')) return

  e.respondWith(
    fetch(e.request)
      .then(res => {
        const clone = res.clone()
        caches.open(CACHE_NAME).then(c => c.put(e.request, clone))
        return res
      })
      .catch(() => caches.match(e.request))
  )
})

/* ══════════════════════════════════════════════
   PUSH NOTIFICATIONS
══════════════════════════════════════════════ */
self.addEventListener('push', e => {
  if(!e.data) return

  let data = {}
  try { data = e.data.json() } catch(_){ data = { title: 'Trabajos Cerca', body: e.data.text() } }

  const options = {
    body:               data.body   || '',
    icon:               '/icon-192.png',
    badge:              '/icon-192.png',
    data:               { url: data.url || '/index.html' },
    vibrate:            [200, 100, 200],
    requireInteraction: false,
    tag:                data.tag || 'tc-notif',
    renotify:           true
  }

  e.waitUntil(
    self.registration.showNotification(data.title || 'Trabajos Cerca', options)
  )
})

/* ── Click en notificación ── */
self.addEventListener('notificationclick', e => {
  e.notification.close()
  const url = e.notification.data?.url || '/index.html'

  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        // Si ya hay una pestaña abierta, enfocarla y navegar
        for(const client of clientList){
          if(client.url.startsWith(self.location.origin) && 'focus' in client){
            client.navigate(url)
            return client.focus()
          }
        }
        // Si no, abrir nueva pestaña
        if(clients.openWindow) return clients.openWindow(url)
      })
  )
})

/* ── Cierre de notificación (opcional analytics) ── */
self.addEventListener('notificationclose', _ => {})
