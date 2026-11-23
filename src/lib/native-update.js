import { nativeAppInfo } from './native-training.js'

const RELEASES_URL = 'https://api.github.com/repos/FangHaoming/lian-ke/releases?per_page=20'

function versionParts(value) {
  const match = String(value || '')
    .trim()
    .replace(/^v/i, '')
    .match(/^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?/)
  if (!match) return null
  return {
    numbers: match.slice(1, 4).map(Number),
    pre: match[4] ? match[4].split('.') : [],
  }
}

function compareVersions(left, right) {
  const a = versionParts(left)
  const b = versionParts(right)
  if (!a || !b) return 0
  for (let index = 0; index < 3; index += 1) {
    if (a.numbers[index] !== b.numbers[index]) return a.numbers[index] - b.numbers[index]
  }
  if (!a.pre.length && !b.pre.length) return 0
  if (!a.pre.length) return 1
  if (!b.pre.length) return -1
  for (let index = 0; index < Math.max(a.pre.length, b.pre.length); index += 1) {
    if (a.pre[index] === undefined) return -1
    if (b.pre[index] === undefined) return 1
    const aNumber = /^\d+$/.test(a.pre[index])
    const bNumber = /^\d+$/.test(b.pre[index])
    if (aNumber && bNumber) {
      if (Number(a.pre[index]) !== Number(b.pre[index]))
        return Number(a.pre[index]) - Number(b.pre[index])
    } else if (aNumber !== bNumber) return aNumber ? -1 : 1
    else if (a.pre[index] !== b.pre[index]) return a.pre[index] > b.pre[index] ? 1 : -1
  }
  return 0
}

export async function fetchLatestAppRelease() {
  const response = await fetch(RELEASES_URL, {
    headers: { Accept: 'application/vnd.github+json' },
  })
  if (!response.ok) throw Error(`更新检查失败 HTTP ${response.status}`)
  const releases = await response.json()
  const candidates = releases
    // Only show public/stable releases. RC/beta tags are for internal tests
    // and must not appear as user-facing update candidates.
    .filter((release) => !release.draft && !release.prerelease)
    .map((release) => ({
      ...release,
      version: String(release.tag_name || '').replace(/^v/i, ''),
      apk: release.assets?.find((asset) => /lianke-android-.*\.apk$/i.test(asset.name)),
    }))
    .filter((release) => release.apk && versionParts(release.version))
    .sort((left, right) => compareVersions(right.version, left.version))
  const latest = candidates[0]
  if (!latest) return null
  return {
    latestVersion: latest.version,
    apkUrl: latest.apk.browser_download_url,
    releaseUrl: latest.html_url,
    releaseName: latest.name || latest.tag_name,
  }
}

export async function checkNativeAppUpdate() {
  const current = await nativeAppInfo()
  if (!current?.version) return null
  const latest = await fetchLatestAppRelease()
  if (!latest || compareVersions(latest.latestVersion, current.version) <= 0) return null
  return { ...latest, currentVersion: current.version }
}

export { compareVersions }
