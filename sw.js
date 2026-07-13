/* Service Worker de Raíz — cachea los assets estáticos para que, después de
   la primera visita, el sitio cargue instantáneo desde la caché del navegador.
   Si algo falla acá, el sitio sigue funcionando normal (fetch normal de red). */

const CACHE_VERSION = 'raiz-v1';
const CACHE_ASSETS = [
  './',
  './index.html',
  './logo-raiz-blanco.png',
  './sillonheroviejo.png',
  './sillonherofinal.jpg',
  './plano-mesita.png',
  './plano-mesita-diagrama.png',
  './hombresilla1.png',
  './hombresilla2.png',
  './ChatGPT_Image_18_jun_2026__05_16_01_p_m_.png',
  './diagramacurso3.png',
  './ChatGPT_Image_18_jun_2026__05_20_05_p_m_.png',
  './diagramacurso2.png',
  './ChatGPT_Image_18_jun_2026__05_22_52_p_m_.png',
  './diagramacurso1.png',
  './ChatGPT_Image_18_jun_2026__05_23_39_p_m_.png',
  './ChatGPT_Image_18_jun_2026__05_25_46_p_m_.png',
  './ChatGPT_Image_18_jun_2026__05_27_21_p_m_.png',
  './ChatGPT_Image_18_jun_2026__05_31_41_p_m_.png',
  './ChatGPT_Image_18_jun_2026__05_36_38_p_m_.png',
  './iconosierra.png',
  './iconopincel.png',
  './iconosillon.png',
];

// Instala: guarda en caché los assets base. Si alguno falla (ej. no existe
// todavía en el server), no rompe la instalación del resto.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => {
      return Promise.all(
        CACHE_ASSETS.map((url) =>
          cache.add(url).catch(() => null)
        )
      );
    })
  );
  self.skipWaiting();
});

// Activa: borra cachés de versiones viejas.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Solo manejamos GET del mismo origen; todo lo demás (fuentes de Google,
  // POST, etc.) pasa directo a la red sin tocar nada.
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) {
    return;
  }

  // El HTML: network-first, para que siempre se vea la versión más nueva
  // cuando hay conexión, con la caché como respaldo si falla la red.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const resClone = res.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(req, resClone));
          return res;
        })
        .catch(() => caches.match(req).then((cached) => cached || caches.match('./index.html')))
    );
    return;
  }

  // Imágenes y otros assets estáticos: cache-first para que carguen al
  // instante en visitas siguientes, actualizando la caché de fondo.
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const resClone = res.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(req, resClone));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
