// Service Worker — Recepción Hospital
// Maneja notificaciones push con pantalla bloqueada

importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

const CACHE = 'hospital-v1';
const ARCHIVOS = ['/', '/index.html', '/manifest.json'];

// Instalar y cachear archivos principales
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ARCHIVOS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Cache primero, red como respaldo
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});

// ── FIREBASE MESSAGING ────────────────────────────────────────────────────────
// Firebase se inicializa con los datos guardados en IndexedDB por la app principal
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'FIREBASE_CONFIG') {
    try {
      if (!firebase.apps.length) {
        firebase.initializeApp(e.data.config);
        firebase.messaging();
      }
    } catch(err) {}
  }
});

// Notificación push cuando la app está cerrada o el celular bloqueado
self.addEventListener('push', e => {
  let datos = {};
  try { datos = e.data ? e.data.json() : {}; } catch(err) {}

  const titulo = datos.title || '🏥 Nuevo paciente';
  const opciones = {
    body:              datos.body || 'Hay un paciente esperando en recepción.',
    icon:              '/icon-192.png',
    badge:             '/icon-192.png',
    vibrate:           [400, 150, 400, 150, 800],
    requireInteraction: true,
    tag:               'nuevo-paciente',
    renotify:          true,
    data:              { url: self.location.origin },
    actions: [
      { action: 'abrir', title: '📋 Ver paciente' },
      { action: 'ok',    title: '✓ Entendido'    },
    ]
  };

  e.waitUntil(self.registration.showNotification(titulo, opciones));
});

// Al tocar la notificación → abrir la app en consultorio
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || self.location.origin;

  if (e.action === 'ok') return;

  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(lista => {
      const abierta = lista.find(c => c.url.startsWith(url));
      if (abierta) return abierta.focus();
      return clients.openWindow(url + '#consultorio');
    })
  );
});
