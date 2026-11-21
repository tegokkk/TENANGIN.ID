const PUBLIC_CACHE = 'tenangin-public-v10-ui';

const PUBLIC_SHELL_ASSETS = [
  '/',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/audio/napas-terpandu-4-4-4.wav',
  '/audio/relaksasi-otot-progresif.wav',
  '/audio/mindfulness-5-4-3-2-1.wav',
];

const PRIVATE_API_PREFIXES = [
  '/api/auth',
  '/api/articles',
  '/api/exercises',
  '/api/me',
  '/api/consent-policy',
  '/api/consents',
  '/api/moods',
  '/api/screening',
  '/api/journals',
  '/api/exercise-sessions',
  '/api/tasks',
  '/api/schedule-blocks',
  '/api/reminders',
  '/api/reflections',
  '/api/help-requests',
  '/api/group-feedback',
  '/api/bk',
  '/api/superadmin',
  '/api/exports',
];

function isCacheablePublicPath(pathname) {
  if (PRIVATE_API_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return false;
  }
  if (pathname.startsWith('/api/')) {
    return pathname === '/api/public/config';
  }
  return (
    pathname === '/' ||
    pathname === '/bantuan' ||
    pathname === '/manifest.webmanifest' ||
    pathname === '/favicon.svg' ||
    pathname.startsWith('/assets/') ||
    pathname.startsWith('/icons/') ||
    pathname.startsWith('/audio/')
  );
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(PUBLIC_CACHE).then(async (cache) => {
      await Promise.allSettled(
        PUBLIC_SHELL_ASSETS.map((url) => cache.add(new Request(url, { credentials: 'omit' })))
      );
      await Promise.allSettled(
        ['/api/public/config'].map((url) => cache.add(new Request(url, { credentials: 'omit' })))
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== PUBLIC_CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'CLEAR_PRIVATE_STATE') {
    event.waitUntil(
      caches.open(PUBLIC_CACHE).then(async (cache) => {
        const reqs = await cache.keys();
        await Promise.all(
          reqs
            .filter((r) => !isCacheablePublicPath(new URL(r.url).pathname))
            .map((r) => cache.delete(r))
        );
      })
    );
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (!isCacheablePublicPath(url.pathname)) {
    // Data pribadi, auth, dashboard staf, dan ekspor selalu melewati jaringan dan tidak pernah di-cache
    return;
  }

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then(async (res) => {
          const cc = (res.headers.get('Cache-Control') || '').toLowerCase();
          if (
            res.ok &&
            !res.headers.get('Set-Cookie') &&
            !cc.includes('no-store') &&
            !cc.includes('private')
          ) {
            const cache = await caches.open(PUBLIC_CACHE);
            cache.put(new Request(url.origin + url.pathname, { method: 'GET' }), res.clone());
          }
          return res;
        })
        .catch(() => caches.match(url.origin + url.pathname))
    );
    return;
  }

  // Ambil HTML terbaru agar navigasi tidak mengacu pada bundle build yang sudah diganti.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(async (res) => {
          const cc = (res.headers.get('Cache-Control') || '').toLowerCase();
          if (
            res.ok &&
            !res.headers.get('Set-Cookie') &&
            !cc.includes('no-store') &&
            !cc.includes('private')
          ) {
            const cache = await caches.open(PUBLIC_CACHE);
            await cache.put(request, res.clone());
          }
          return res;
        })
        .catch(async () => (await caches.match(request)) || Response.error())
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then(async (res) => {
        const cc = (res.headers.get('Cache-Control') || '').toLowerCase();
        if (res.ok && !res.headers.get('Set-Cookie') && !cc.includes('no-store')) {
          const cache = await caches.open(PUBLIC_CACHE);
          cache.put(request, res.clone());
        }
        return res;
      });
    })
  );
});

self.addEventListener('push', (event) => {
  let payload = {
    title: 'TENANGIN.ID',
    body: 'Ada jeda singkat 3 menit untuk menenangkan diri?',
    tag: 'tenangin-reminder',
    url: '/app',
  };
  try {
    if (event.data) {
      const parsed = event.data.json();
      payload = {
        title: parsed?.title || payload.title,
        body: parsed?.body || payload.body,
        tag: parsed?.tag || payload.tag,
        url: parsed?.url || payload.url,
      };
    }
  } catch {
    if (event.data) {
      payload.body = event.data.text() || payload.body;
    }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      tag: payload.tag,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url: payload.url },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification?.data?.url || '/app';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});
