/// <reference lib="webworker" />

// Definição de nomes de cache específicos para granularidade
const CACHE_VERSION = "v2";
const CACHE_STATIC = `protheus-static-${CACHE_VERSION}`;
const CACHE_IMAGES = `protheus-images-${CACHE_VERSION}`;
const CACHE_FONTS = `protheus-fonts-${CACHE_VERSION}`;
const CACHE_API = `protheus-api-${CACHE_VERSION}`;

const ALL_CACHES = [CACHE_STATIC, CACHE_IMAGES, CACHE_FONTS, CACHE_API];

// Recursos críticos pré-cacheados (Application Shell)
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/favicon.ico",
  "/favicon.svg",
  "/placeholder.svg"
];

// Limite de tamanho de cache dinâmico (FIFO)
const CACHE_LIMITS = {
  [CACHE_IMAGES]: 50,
  [CACHE_API]: 30
};

// Auxiliar para limitar o tamanho do cache
async function limitCacheSize(cacheName, maxItems) {
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    if (keys.length > maxItems) {
      for (let i = 0; i < keys.length - maxItems; i++) {
        await cache.delete(keys[i]);
      }
    }
  } catch (err) {
    console.warn(`[Service Worker] Erro ao limitar cache ${cacheName}:`, err);
  }
}

// 1. Instalação: Pré-cacheamento dos recursos críticos e ativação imediata
self.addEventListener("install", (event) => {
  console.log("[Service Worker] Instalando versão:", CACHE_VERSION);
  event.waitUntil(
    caches.open(CACHE_STATIC).then((cache) => {
      console.log("[Service Worker] Pré-cacheando App Shell...");
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// 2. Ativação: Limpeza completa de caches obsoletos de versões antigas
self.addEventListener("activate", (event) => {
  console.log("[Service Worker] Ativando versão:", CACHE_VERSION);
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (!ALL_CACHES.includes(key)) {
            console.log("[Service Worker] Removendo cache obsoleto:", key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. Comunicação: Ouvir atualizações forçadas do cliente
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    console.log("[Service Worker] Forçando skipWaiting por comando do cliente");
    self.skipWaiting();
  }
});

// Função auxiliar para notificar o cliente sobre sincronização em background
function notifyClient(type, url) {
  self.clients.matchAll().then(clients => {
    clients.forEach(client => client.postMessage({ type, url }));
  });
}

// 4. Interceptação de requisições com estratégias avançadas
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Filtrar requisições: apenas GET e esquemas http/https seguros
  if (request.method !== "GET" || (url.protocol !== "http:" && url.protocol !== "https:")) {
    return;
  }

  // A. Estratégia para chamadas de API (/api/* ou supabase): Stale-While-Revalidate (SWR) com notificação visual
  if (url.pathname.startsWith("/api/") || url.host.includes("supabase.co")) {
    event.respondWith(
      caches.open(CACHE_API).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          
          const fetchPromise = fetch(request).then((networkResponse) => {
            if (networkResponse.status === 200) {
              cache.put(request, networkResponse.clone());
              limitCacheSize(CACHE_API, CACHE_LIMITS[CACHE_API]);
              
              if (cachedResponse) {
                // Notifica que os dados foram atualizados em segundo plano
                notifyClient('SYNC_COMPLETED', request.url);
              }
            }
            return networkResponse;
          }).catch(() => {
            console.log(`[Service Worker] Rede offline para API. Falha no background sync de: ${url.pathname}`);
            if (cachedResponse) {
                notifyClient('SYNC_COMPLETED', request.url);
            }
            
            // Se nem estiver no cache (e falhou a rede), retorna resposta JSON amigável offline
            if (!cachedResponse) {
              return new Response(
                JSON.stringify({
                  error: "Offline",
                  message: "Conexão com a rede perdida. Dados em cache não disponíveis para este recurso."
                }),
                {
                  status: 503,
                  headers: { "Content-Type": "application/json" }
                }
              );
            }
          });

          if (cachedResponse) {
            // Emite notificação de que o fetch está ocorrendo em background
            notifyClient('SYNC_STARTED', request.url);
            return cachedResponse; // Retorna imediatamente o cache (Stale)
          }
          
          return fetchPromise; // Aguarda a rede se não houver cache
        });
      })
    );
    return;
  }

  // B. Estratégia para Fontes (locais ou Google/gStatic): Cache-First com expiração longa
  if (request.destination === "font" || url.host.includes("fonts.gstatic.com") || url.host.includes("fonts.googleapis.com")) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        return fetch(request).then((response) => {
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_FONTS).then((cache) => cache.put(request, responseClone));
          }
          return response;
        });
      })
    );
    return;
  }

  // C. Estratégia para Imagens: Cache-First com limite de tamanho
  if (request.destination === "image" || url.pathname.match(/\.(png|jpe?g|gif|svg|webp|ico)$/i)) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        return fetch(request).then((response) => {
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_IMAGES).then((cache) => {
              cache.put(request, responseClone);
              limitCacheSize(CACHE_IMAGES, CACHE_LIMITS[CACHE_IMAGES]);
            });
          }
          return response;
        });
      })
    );
    return;
  }

  // D. Estratégia para CSS, JS e Ativos Estáticos Críticos: Stale-While-Revalidate (SWR)
  // Carregamento instantâneo do cache com atualização em segundo plano para máxima performance
  if (request.destination === "script" || request.destination === "style" || url.pathname.match(/\.(js|css)$/i)) {
    event.respondWith(
      caches.open(CACHE_STATIC).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          const fetchPromise = fetch(request).then((networkResponse) => {
            if (networkResponse.status === 200) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => {
            // Silencia erro se a rede falhar em background
          });
          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }

  // E. Navegação de Páginas HTML (SPA Router): Network-First, com fallback para o App Shell
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => {
        console.log("[Service Worker] Navegação falhou (offline). Retornando App Shell...");
        return caches.match("/");
      })
    );
  }
});
