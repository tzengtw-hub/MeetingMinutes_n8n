// 只為了讓這個頁面可以「加入主畫面」當 App 用，以及沒網路時還開得起來。
//
// 刻意用 network-first 而不是 cache-first：這頁的狀態全部來自 API，
// cache-first 會讓使用者開到舊版頁面卻以為是最新的 —— 對一個「看進度」的
// 工具來說，顯示過期的東西比慢個幾百毫秒糟糕得多。
const CACHE = 'mm-shell-v1';
const SHELL = ['./', './index.html', './manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;

  // API 一律走網路，絕不快取：快取住的 job 狀態會是假的。
  if (req.method !== 'GET' || /\/webhook\//.test(req.url)) return;

  e.respondWith(
    fetch(req)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req))
  );
});
