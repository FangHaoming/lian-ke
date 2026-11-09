export const baseURL = 'https://fanghaoming.github.io/lian-ke/'
export const basePath = new URL(baseURL).pathname.replace(/\/+$/, '')

export function appURL(path = '') {
  return new URL(String(path).replace(/^\/+/, ''), baseURL).toString()
}

export function appPath(path = '') {
  const normalized = String(path).replace(/^\/+/, '')
  return normalized ? `${basePath}/${normalized}` : `${basePath}/`
}
