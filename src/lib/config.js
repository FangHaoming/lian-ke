export const baseURL = 'https://fanghaoming.github.io/lian-ke/'

function isNativeRuntime() {
  return typeof window !== 'undefined' && Boolean(window.Capacitor?.isNativePlatform?.())
}

export const basePath = isNativeRuntime() ? '' : new URL(baseURL).pathname.replace(/\/+$/, '')

export function appURL(path = '') {
  const runtimeBaseURL = isNativeRuntime()
    ? `${window.location.origin}/`
    : typeof window !== 'undefined' && window.location.origin !== new URL(baseURL).origin
      ? `${window.location.origin}${basePath}/`
      : baseURL
  return new URL(String(path).replace(/^\/+/, ''), runtimeBaseURL).toString()
}

export function appPath(path = '') {
  const normalized = String(path).replace(/^\/+/, '')
  if (!normalized) return `${basePath}/`
  const [, pathPart, queryPart = ''] = normalized.match(/^([^?#]*)(.*)$/) || []
  const route = pathPart.replace(/\/+$/, '')
  const publicDirectories = new Set(['challenges', 'share', 'source'])
  const suffix = publicDirectories.has(route) && !pathPart.endsWith('/') ? '/' : ''
  return `${basePath}/${pathPart}${suffix}${queryPart}`
}
