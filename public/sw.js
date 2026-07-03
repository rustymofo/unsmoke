// Unsmoke SW Killer v4
const kill = async () => {
  const regs = await navigator.serviceWorker.getRegistrations();
  await Promise.all(regs.map(r => r.unregister()));
  const keys = await caches.keys();
  await Promise.all(keys.map(k => caches.delete(k)));
};
self.addEventListener('install', e => { e.waitUntil(kill()); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(kill().then(() => self.registration.unregister())); });
self.addEventListener('fetch', () => {});
