const response = await fetch('https://api.github.com/repos/FangHaoming/lian-ke/releases?per_page=20', {
  headers: { Accept: 'application/vnd.github+json' },
})
if (!response.ok) throw new Error(`GitHub Releases request failed: HTTP ${response.status}`)

const releases = (await response.json())
  .filter((release) => !release.draft)
  .map((release) => ({
    version: String(release.tag_name || '').replace(/^v/i, ''),
    prerelease: Boolean(release.prerelease),
    apk: release.assets?.find((asset) => /lianke-android-.*\.apk$/i.test(asset.name)),
    releaseUrl: release.html_url,
  }))
  .filter((release) => release.apk)

const versionParts = (value) => String(value).split(/[-.]/).map((part) => (/^\d+$/.test(part) ? Number(part) : part))
const compare = (left, right) => {
  const a = versionParts(left.version)
  const b = versionParts(right.version)
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    if (a[index] === undefined) return -1
    if (b[index] === undefined) return 1
    if (a[index] === b[index]) continue
    return a[index] > b[index] ? 1 : -1
  }
  return 0
}
const latest = (prerelease) => releases.filter((release) => release.prerelease === prerelease).sort(compare).at(-1)
const emit = (prefix, release) => {
  if (!release) return
  console.log(`VITE_RELEASE_${prefix}_VERSION=${release.version}`)
  console.log(`VITE_RELEASE_${prefix}_APK_URL=${release.apk.browser_download_url}`)
  console.log(`VITE_RELEASE_${prefix}_URL=${release.releaseUrl}`)
}

emit('STABLE', latest(false))
emit('TESTING', latest(true))
