export function initPWA() {
    // Manifest dynamique
    const manifest = {
        name:             'Kalou BTP Pro',
        short_name:       'KalouBTP',
        start_url:        '.',
        display:          'standalone',
        background_color: '#1A1A1A',
        theme_color:      '#FF7A00',
        icons: [{
            src:   'data:image/svg+xml;base64,' + btoa('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="128" fill="#FF7A00"/><path d="M150 350V160h60v70h90v-70h60v190h-60v-70h-90v70z" fill="white"/></svg>'),
            sizes: '512x512',
            type:  'image/svg+xml'
        }]
    };
    const mLink = document.createElement('link');
    mLink.rel   = 'manifest';
    mLink.href  = URL.createObjectURL(new Blob([JSON.stringify(manifest)], { type: 'application/json' }));
    document.head.appendChild(mLink);

    // Service Worker v2 (force le remplacement du cache v1)
    if ('serviceWorker' in navigator) {
        const swCode = `
            const CACHE = 'kalou-btp-v2';
            self.addEventListener('install', e => {
                e.waitUntil(caches.open(CACHE).then(c => c.addAll(['/'])));
                self.skipWaiting();
            });
            self.addEventListener('activate', e => {
                e.waitUntil(
                    caches.keys().then(keys =>
                        Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
                    )
                );
            });
            self.addEventListener('fetch', e => {
                e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
            });
        `;
        navigator.serviceWorker
            .register(URL.createObjectURL(new Blob([swCode], { type: 'text/javascript' })))
            .catch(() => {});
    }
}
