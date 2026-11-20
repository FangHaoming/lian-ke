import { createHash } from 'node:crypto'

export function offlineServiceWorker() {
  const cacheSchema = 'offline-cache-v2'
  const entryHTMLURLs = [
    './',
    './index.html',
    './challenges/index.html',
    './share/index.html',
    './source/index.html',
  ]

  return {
    name: 'lianke-offline-service-worker',
    apply: 'build',
    generateBundle(_options, bundle) {
      const buildFiles = Object.entries(bundle)
        .filter(([fileName]) => !fileName.endsWith('.map'))
        .filter(
          ([, output]) =>
            output.type !== 'chunk' ||
            (!output.facadeModuleId?.endsWith('.html') && output.code.trim().length > 0),
        )
        .map(([fileName]) => fileName)
      const versionHash = createHash('sha256')
      versionHash.update(cacheSchema)
      for (const fileName of buildFiles.sort()) {
        const output = bundle[fileName]
        versionHash.update(fileName)
        versionHash.update(output.type === 'chunk' ? output.code : output.source)
      }
      const version = versionHash.digest('hex').slice(0, 12)
      const precacheURLs = [
        ...entryHTMLURLs,
        ...buildFiles.map((fileName) => `./${fileName}`),
        './fit-log-icon.png',
        './icon-192.png',
        './icon-512.png',
        './manifest.webmanifest',
      ]

      this.emitFile({
        type: 'asset',
        fileName: 'service-worker.js',
        source: `const VERSION = ${JSON.stringify(version)}
const PRECACHE = \`lianke-precache-\${VERSION}\`
const RUNTIME = \`lianke-runtime-\${VERSION}\`
const MEDIA = 'lianke-media-v1'
const PRECACHE_URLS = ${JSON.stringify([...new Set(precacheURLs)], null, 2)}

async function precacheApp() {
  const cache = await caches.open(PRECACHE)

  await Promise.all(
    PRECACHE_URLS.map(async (url) => {
      const request = new Request(url, { cache: 'reload' })
      const cached = await cache.match(request, { ignoreSearch: true })
      if (cached) return

      try {
        const response = await fetch(request)
        if (!response.ok) throw new Error(\`Failed to precache \${request.url}: \${response.status}\`)
        await cache.put(request, response)
      } catch (error) {
        const legacyCached = await caches.match(request, { ignoreSearch: true })
        if (legacyCached) {
          await cache.put(request, legacyCached.clone())
          return
        }
        throw error
      }
    }),
  )
}

async function matchCached(request) {
  const currentCache = await caches.open(PRECACHE)
  return (await currentCache.match(request, { ignoreSearch: true })) ||
    caches.match(request, { ignoreSearch: true })
}

self.addEventListener('install', (event) => {
  event.waitUntil(precacheApp())
})

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting()
})

async function activateCaches() {
  const keys = await caches.keys()
  const legacyMediaKeys = keys.filter(
    (key) => key.startsWith('lianke-media-') && key !== MEDIA,
  )
  const mediaCache = await caches.open(MEDIA)

  for (const key of legacyMediaKeys) {
    const legacyCache = await caches.open(key)
    for (const request of await legacyCache.keys()) {
      if (await mediaCache.match(request)) continue
      const response = await legacyCache.match(request)
      if (response) await mediaCache.put(request, response)
    }
  }

  await Promise.all(
    keys
      .filter((key) => key.startsWith('lianke-') && ![PRECACHE, RUNTIME, MEDIA].includes(key))
      .map((key) => caches.delete(key)),
  )
}

self.addEventListener('activate', (event) => {
  event.waitUntil(activateCaches().then(() => self.clients.claim()))
})

function navigationFallback(pathname) {
  const scopePath = new URL(self.registration.scope).pathname.replace(/\\/$/, '')
  const appPath = pathname.slice(scopePath.length).replace(/^\\/+/, '')
  if (appPath === 'share' || appPath.startsWith('share/')) return './share/index.html'
  if (appPath === 'source' || appPath.startsWith('source/')) return './source/index.html'
  if (appPath === 'challenges' || appPath.startsWith('challenges/')) {
    return './challenges/index.html'
  }
  return './'
}

async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName)
  const keys = await cache.keys()
  await Promise.all(keys.slice(0, Math.max(0, keys.length - maxEntries)).map((key) => cache.delete(key)))
}

async function networkFirstNavigation(request) {
  try {
    return await Promise.race([
      fetch(request),
      new Promise((_, reject) => setTimeout(() => reject(new Error('network timeout')), 3500)),
    ])
  } catch {
    return (await matchCached(navigationFallback(new URL(request.url).pathname))) || Response.error()
  }
}

async function staleWhileRevalidate(event, request, cacheName, maxEntries) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)
  const network = fetch(request)
    .then(async (response) => {
      if (response.ok && response.type === 'basic') {
        await cache.put(request, response.clone())
        if (Number.isFinite(maxEntries)) await trimCache(cacheName, maxEntries)
      }
      return response
    })
    .catch(() => null)
  if (cached) {
    event.waitUntil(network)
    return cached
  }
  return (await network) || Response.error()
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(request))
    return
  }

  event.respondWith(
    (async () => {
      const cached = await matchCached(request)
      if (cached) return cached
      const isMedia = request.destination === 'image' || request.destination === 'video'
      return staleWhileRevalidate(
        event,
        request,
        isMedia ? MEDIA : RUNTIME,
        isMedia ? undefined : 80,
      )
    })(),
  )
})
`,
      })
    },
  }
}
