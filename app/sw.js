// 오션아워 서비스 워커 — 인터넷이 끊겨도 열리게 한다.
// 새 판은 늘 인터넷에서 먼저 받는다. 먼저 창고를 보면 옛 판에 갇혀서 고친 게 안 보인다.
// 창고에는 받은 것을 넣어 두기만 하고, 인터넷이 안 될 때만 꺼내 쓴다.
// 자료(할 일)는 여기 없다 — 자료는 브라우저 저장소(localStorage)에 따로 있다.

const CACHE = 'oceanhour-v1';
const SHELL = ['./', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-180.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE)
    .then(c => c.addAll(SHELL.map(u => new Request(u, { cache:'reload' }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k.startsWith('oceanhour-') && k !== CACHE).map(k => caches.delete(k))))   // 같은 주소를 나눠 쓰는 다른 사이트의 창고는 안 건드린다
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
  // 재는 길(규칙 8·9, C판) — 핑 페이지(oceanhour-ping.pages.dev)는 이제 앱과 다른 주소라 이 위의 origin
  // 확인에서 이미 걸러진다. 이 서비스 워커의 fetch 이벤트 자체가 그 주소로는 안 걸리므로(교차 출처라
  // 이 워커가 가로챌 수 없다), 여기서는 막거나 창고에 넣을 게 없다 — 다시 1·2회차의 같은 주소(app/back.html)
  // 전용 503 분기는 그 경로 자체가 없어져 지웠다.
  e.respondWith(
    fetch(r).then(res => {
      if (res.ok){ const copy = res.clone(); caches.open(CACHE).then(c => c.put(r, copy)); }
      return res;
    }).catch(() => caches.match(r, { ignoreSearch:true })
      .then(m => m || (r.mode === 'navigate' ? caches.match('./') : undefined))
      .then(m => m || new Response('인터넷이 끊겼고, 이 파일은 아직 받아 둔 적이 없습니다.', { status:503, headers:{ 'Content-Type':'text/plain; charset=utf-8' } })))
  );
});
