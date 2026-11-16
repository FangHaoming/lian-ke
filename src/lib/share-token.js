const SHARE_TOKEN_SECRET = 'lian-ke-share-token-v1'

function bytesToBase64Url(bytes) {
  let binary = ''
  bytes.forEach((byte) => (binary += String.fromCharCode(byte)))
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function base64UrlToBytes(value) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')
  const binary = atob(padded)
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

let keyPromise

function shareKey() {
  if (!keyPromise) {
    keyPromise = crypto.subtle
      .digest('SHA-256', new TextEncoder().encode(SHARE_TOKEN_SECRET))
      .then((digest) =>
        crypto.subtle.importKey('raw', digest, 'AES-GCM', false, ['encrypt', 'decrypt']),
      )
  }
  return keyPromise
}

export async function encodeShareToken(payload) {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(JSON.stringify(payload))
  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await shareKey(), encoded),
  )
  const token = new Uint8Array(iv.length + encrypted.length)
  token.set(iv)
  token.set(encrypted, iv.length)
  return bytesToBase64Url(token)
}

export async function decodeShareToken(token) {
  const data = base64UrlToBytes(token)
  if (data.length <= 12) throw new Error('分享链接无效')
  const iv = data.slice(0, 12)
  const encrypted = data.slice(12)
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    await shareKey(),
    encrypted,
  )
  return JSON.parse(new TextDecoder().decode(decrypted))
}
