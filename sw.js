// Service worker Kalou BTP : l'appli marche sans réseau sur le chantier.
// Stratégie « réseau d'abord » : dès qu'il y a du réseau, on prend la dernière
// version publiée (mises à jour immédiates) ; sinon on sert la copie en cache.

const CACHE = 'kalou-btp-v4.5.0';
const FICHIERS = [
    './',
    './index.html',
    './manifest.webmanifest',
    './css/app.css',
    './icons/icon.svg',
    './icons/icon-192.png',
    './icons/apple-touch-icon.png',
    './js/app.js',
    './js/core/format.js',
    './js/core/store.js',
    './js/calc/materiaux.js',
    './js/calc/base.js',
    './js/calc/ouvrages.js',
    './js/calc/maison.js',
    './js/calc/cout.js',
    './js/ui/dom.js',
    './js/ui/form.js',
    './js/ui/resultats.js',
    './js/ui/contour.js',
    './js/views/commun.js',
    './js/views/calculs.js',
    './js/views/maison.js',
    './js/views/chantiers.js',
    './js/views/reglages.js'
];

self.addEventListener('install', e => {
    e.waitUntil(caches.open(CACHE).then(c => c.addAll(FICHIERS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys()
            .then(cles => Promise.all(cles.filter(k => k !== CACHE).map(k => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', e => {
    const req = e.request;
    if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
    e.respondWith(
        fetch(req)
            .then(rep => {
                if (rep && rep.ok) {
                    const copie = rep.clone();
                    caches.open(CACHE).then(c => c.put(req, copie));
                }
                return rep;
            })
            .catch(() => caches.match(req, { ignoreSearch: true })
                .then(r => r || (req.mode === 'navigate' ? caches.match('./index.html') : undefined)))
    );
});
