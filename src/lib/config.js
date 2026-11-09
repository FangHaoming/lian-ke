export const baseURL = 'https://fanghaoming.github.io/lian-ke/'
export const basePath = new URL(baseURL).pathname.replace(/\/+$/, '')

export function appURL(path = '') {
  const runtimeBaseURL =
    typeof window !== 'undefined' && window.location.origin !== new URL(baseURL).origin
      ? `${window.location.origin}${basePath}/`
      : baseURL
  return new URL(String(path).replace(/^\/+/, ''), runtimeBaseURL).toString()
}

export function appPath(path = '') {
  const normalized = String(path).replace(/^\/+/, '')
  return normalized ? `${basePath}/${normalized}` : `${basePath}/`
}
