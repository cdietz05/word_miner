// Keeps the whole game on the iPad, so it opens and plays with no internet
// once it has been visited once. Every file is cached up front on install.
// After that each request tries the network first and keeps what it gets,
// so an update reaches the iPad the next time it opens online; with no
// network, the cached copy answers.
//
// Bump VERSION when anything changes, so iPads drop the old copy.
// tools/check_assets.py checks ASSETS against the files on disk.

const VERSION = 'word-catcher-v4';

const ASSETS = [
  './',
  'index.html',
  'styles.css',
  'manifest.webmanifest',
  'js/main.js',
  'js/phonics.js',
  'js/progress.js',
  'js/critters.js',
  'js/creature_art.js',
  'js/orb.js',
  'js/cards.js',
  'js/audio.js',
  'js/trim.js',
  'js/gate.js',
  'js/settings.js',
  'js/recorder.js',
  'fonts/andika-regular.woff2',
  'fonts/andika-bold.woff2',
  'fonts/fredoka.woff2',
  'icons/apple-touch-icon.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'sounds/a.m4a', 'sounds/e.m4a', 'sounds/i.m4a', 'sounds/o.m4a', 'sounds/u.m4a',
  'sounds/a_e.m4a', 'sounds/e_e.m4a', 'sounds/i_e.m4a', 'sounds/o_e.m4a', 'sounds/u_e.m4a',
  'sounds/c.m4a', 'sounds/d.m4a', 'sounds/f.m4a', 'sounds/g.m4a', 'sounds/h.m4a', 'sounds/j.m4a',
  'sounds/l.m4a', 'sounds/m.m4a', 'sounds/n.m4a', 'sounds/p.m4a', 'sounds/qu.m4a', 'sounds/r.m4a',
  'sounds/s.m4a', 'sounds/t.m4a', 'sounds/v.m4a', 'sounds/w.m4a', 'sounds/x.m4a', 'sounds/y.m4a',
  'sounds/z.m4a', 'sounds/sh.m4a', 'sounds/ch.m4a', 'sounds/th.m4a', 'sounds/ng.m4a',
];

self.addEventListener('install', (event) =>
{
  event.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) =>
{
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) =>
{
  if (event.request.method !== 'GET')
  {
    return;
  }
  event.respondWith(
    caches.open(VERSION).then(async (cache) =>
    {
      try
      {
        const response = await fetch(event.request);
        if (response.ok && new URL(event.request.url).origin === self.location.origin)
        {
          cache.put(event.request, response.clone());
        }
        return response;
      }
      catch (error)
      {
        const cached = await cache.match(event.request, { ignoreSearch: true });
        return cached ?? Response.error();
      }
    }),
  );
});
