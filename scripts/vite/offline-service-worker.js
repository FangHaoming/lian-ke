import { createHash } from 'node:crypto'
import { createHash as createFileHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

function publicAssetPaths() {
  const root = join(process.cwd(), 'public')
  const paths = []
  const visit = (directory) => {
    for (const entry of readdirSync(directory)) {
      const absolute = join(directory, entry)
      if (statSync(absolute).isDirectory()) visit(absolute)
      else paths.push(`./${relative(root, absolute).split('\\').join('/')}`)
    }
  }
  visit(root)
  return paths
}

function sha256File(file) {
  return createFileHash('sha256').update(readFileSync(file)).digest('hex')
}

export function offlineServiceWorker() {
  const nativeBuild = process.env.CAPACITOR_BUILD === '1'
  const remoteBase = nativeBuild
    ? 'https://fanghaoming.github.io/lian-ke/app-assets/'
    : 'https://fanghaoming.github.io/lian-ke/'
  const cacheSchema = 'offline-cache-v3'
  const buildIdentity = process.env.VITE_BUILD_ID || process.env.GITHUB_SHA || 'local'
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
      versionHash.update(buildIdentity)
      for (const fileName of buildFiles.sort()) {
        const output = bundle[fileName]
        versionHash.update(fileName)
        versionHash.update(output.type === 'chunk' ? output.code : output.source)
      }
      const version = versionHash.digest('hex').slice(0, 12)
      const assetURLs = [
        ...entryHTMLURLs,
        ...buildFiles.map((fileName) => `./${fileName}`),
        ...publicAssetPaths(),
      ]
      const precacheURLs = [
        ...entryHTMLURLs,
        ...buildFiles.map((fileName) => `./${fileName}`),
      ]
      const assetHashes = Object.fromEntries(
        [...new Set(assetURLs)].map((path) => {
          const fileName = path === './' ? 'index.html' : path.replace(/^\.\//, '')
          const source = bundle[fileName]
          if (source) {
            return [path, createHash('sha256').update(source.type === 'chunk' ? source.code : source.source).digest('hex')]
          }
          const sourceFile = existsSync(join(process.cwd(), fileName))
            ? join(process.cwd(), fileName)
            : join(process.cwd(), 'public', fileName)
          return [path, sha256File(sourceFile)]
        }),
      )
      const requiredURLs = [...new Set([...entryHTMLURLs, ...buildFiles.map((fileName) => `./${fileName}`)])]

      this.emitFile({
        type: 'asset',
        fileName: 'service-worker.js',
        source: `const VERSION = ${JSON.stringify(version)}
const BUILD_ID = ${JSON.stringify(buildIdentity)}
const PRECACHE = \`lianke-precache-\${VERSION}\`
const RUNTIME = \`lianke-runtime-\${VERSION}\`
const MEDIA = 'lianke-media-v1'
const REMOTE_BASE = ${JSON.stringify(remoteBase)}
const REMOTE_CACHE_PREFIX = 'lianke-remote-'
const REMOTE_POINTER = 'lianke-remote-pointer-v2'
const RUNTIME_MODE_CACHE = 'lianke-runtime-mode-v2'
let trainingActive = false
let nativeRuntime = false
const REMOTE_CACHE_TIMEOUT = 350
const PRECACHE_URLS = ${JSON.stringify([...new Set(precacheURLs)], null, 2)}
const ASSET_URLS = ${JSON.stringify([...new Set(assetURLs)], null, 2)}
const ASSET_HASHES = ${JSON.stringify(assetHashes, null, 2)}
const REQUIRED_URLS = ${JSON.stringify(requiredURLs, null, 2)}

async function responseHash(response) {
  const bytes = await response.clone().arrayBuffer()
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function findMatchingCachedResponse(request, expectedHash) {
  if (!expectedHash) return null
  const cachesToCheck = await caches.keys()
  for (const key of cachesToCheck.filter((value) => value.startsWith('lianke-precache-'))) {
    const cache = await caches.open(key)
    const cached = await cache.match(request, { ignoreSearch: true })
    if (cached && await responseHash(cached) === expectedHash) return cached
  }
  return null
}

async function precacheApp() {
  const cache = await caches.open(PRECACHE)

  await Promise.all(
    PRECACHE_URLS.map(async (url) => {
      const request = new Request(url, { cache: 'reload' })
      const cached = await cache.match(request, { ignoreSearch: true })
      if (cached) return

      const reusable = await findMatchingCachedResponse(request, ASSET_HASHES[url])
      if (reusable) {
        await cache.put(request, reusable.clone())
        return
      }

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
        if (REQUIRED_URLS.includes(url)) throw error
      }
    }),
  )
}

async function matchCached(request) {
  const remoteCache = (await isNativeRuntime()) ? await getCurrentRemoteCache() : null
  const remote = remoteCache
    ? await Promise.race([
        remoteCache.match(request, { ignoreSearch: true }),
        new Promise((resolve) => setTimeout(() => resolve(null), REMOTE_CACHE_TIMEOUT)),
      ])
    : null
  if (remote) return remote
  const currentCache = await caches.open(PRECACHE)
  return (await currentCache.match(request, { ignoreSearch: true })) ||
    caches.match(request, { ignoreSearch: true })
}

async function getCurrentRemoteCache() {
  const pointer = await caches.open(REMOTE_POINTER)
  const response = await pointer.match('./current')
  if (!response) return null
  const version = (await response.text()).trim()
  return version ? caches.open(\`\${REMOTE_CACHE_PREFIX}\${version}\`) : null
}

async function getCurrentRemoteVersion() {
  const pointer = await caches.open(REMOTE_POINTER)
  const response = await pointer.match('./current')
  return response ? (await response.text()).trim() : ''
}

async function isNativeRuntime() {
  if (nativeRuntime) return true
  const cache = await caches.open(RUNTIME_MODE_CACHE)
  const response = await cache.match('./native')
  nativeRuntime = response ? (await response.text()) === '1' : false
  return nativeRuntime
}

async function cleanupRemoteCaches(keepVersion = '') {
  const keys = await caches.keys()
  await Promise.all(
    keys
      .filter(
        (key) =>
          key.startsWith(REMOTE_CACHE_PREFIX) &&
          key !== (keepVersion ? \`\${REMOTE_CACHE_PREFIX}\${keepVersion}\` : ''),
      )
      .map((key) => caches.delete(key)),
  )
}

async function notifyClients(message) {
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
  clients.forEach((client) => client.postMessage(message))
}

async function refreshRemoteWebAssets() {
  if (trainingActive) return
  try {
    const remoteWorker = await fetch(new URL('service-worker.js', REMOTE_BASE), {
      cache: 'no-store',
    })
    if (!remoteWorker.ok) return
    const source = await remoteWorker.text()
    const versionMatch = source.match(/const VERSION = ["']([^"']+)["']/)
    const match = source.match(/const PRECACHE_URLS = (\[[\\s\\S]*?\])/)
    if (!versionMatch || !match) return
    const version = versionMatch[1]
    if (version === (await getCurrentRemoteVersion())) return
    await notifyClients({ type: 'REMOTE_UPDATE_START' })
    const urls = JSON.parse(match[1])
    const cache = await caches.open(\`\${REMOTE_CACHE_PREFIX}\${version}\`)
    for (const path of urls) {
      const remoteURL = new URL(path, REMOTE_BASE)
      const localURL = new URL(path, self.registration.scope)
      const response = await fetch(remoteURL, { cache: 'no-store' })
      if (response.ok) await cache.put(localURL, response.clone())
      else throw new Error(\`remote asset failed: \${remoteURL}\`)
    }
    const pointer = await caches.open(REMOTE_POINTER)
    await pointer.put('./current', new Response(version))
    await cleanupRemoteCaches(version)
    await notifyClients({ type: 'REMOTE_UPDATE_READY', version })
  } catch {
    // The APK's bundled cache remains the fallback when remote refresh fails.
    await cleanupRemoteCaches(await getCurrentRemoteVersion())
    await notifyClients({ type: 'REMOTE_UPDATE_FAILED' })
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(precacheApp())
})

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting()
  if (event.data?.type === 'TRAINING_STATE') {
    trainingActive = event.data.active === true
    if (!trainingActive) event.waitUntil(refreshRemoteWebAssets())
  }
  if (event.data?.type === 'REFRESH_REMOTE' && !trainingActive) {
    event.waitUntil(refreshRemoteWebAssets())
  }
  if (event.data?.type === 'RUNTIME_MODE') {
    nativeRuntime = event.data.native === true
    event.waitUntil(
      caches.open(RUNTIME_MODE_CACHE).then((cache) =>
        cache.put('./native', new Response(nativeRuntime ? '1' : '0')),
      ),
    )
  }
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
      .filter(
        (key) =>
          key.startsWith('lianke-') &&
          ![PRECACHE, RUNTIME, MEDIA, REMOTE_POINTER, RUNTIME_MODE_CACHE].includes(key) &&
          !key.startsWith(REMOTE_CACHE_PREFIX),
      )
      .map((key) => caches.delete(key)),
  )
}

self.addEventListener('activate', (event) => {
  event.waitUntil(
    activateCaches()
      .then(async () => cleanupRemoteCaches(await getCurrentRemoteVersion()))
      .then(() => self.clients.claim())
      .then(() => refreshRemoteWebAssets()),
  )
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
  const cached = await matchCached(request)
  if ((await isNativeRuntime()) && cached) return cached
  try {
    const network = await Promise.race([
      fetch(request),
      new Promise((_, reject) => setTimeout(() => reject(new Error('network timeout')), 3500)),
    ])
    return network
  } catch {
    return cached || (await matchCached(navigationFallback(new URL(request.url).pathname))) || Response.error()
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
