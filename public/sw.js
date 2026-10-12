// Nexdo service worker —— 保证 iPad/手机主屏 PWA 始终拉取线上最新代码
// 策略：同源 GET 请求一律「网络优先」，在线时永远拿新版本；离线才回退缓存。
const CACHE = 'nexdo-cache-v1'
const PRECACHE = [
  '/index.html',
  '/manifest.webmanifest',
  '/cat-icon-512.png',
  '/cat-icon-1024.png',
]

self.addEventListener('install', (e) => {
  // 安装即激活，不等旧 SW
  self.skipWaiting()
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE)).catch(() => {})
  )
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim()) // 立刻接管所有已打开页面
  )
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  // 只处理同源；Supabase 等跨域请求直接放行
  if (url.origin !== self.location.origin) return

  // 网络优先：在线时永远取最新文件（每次部署哈希变，天然新鲜）
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.ok) {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {})
        }
        return res
      })
      .catch(() => caches.match(req).then((r) => r || caches.match('/index.html')))
  )
})
