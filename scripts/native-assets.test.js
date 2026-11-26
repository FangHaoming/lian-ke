import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { execFileSync } from 'node:child_process'

const source = readFileSync(new URL('../src/lib/native-training.js', import.meta.url), 'utf8')
const updateSource = source
  .slice(
    source.indexOf('export async function updateNativeWebAssets'),
    source.indexOf('export function openNativeExternalUrl'),
  )
  .replace('export ', '')

function harness(version, failDownload = false, overrides = {}) {
  const calls = []
  const toasts = []
  const context = {
    nativeTrainingAvailable: () => true,
    fetch: async () => ({
      ok: true,
      text: async () =>
        'const VERSION = "new"\nconst PRECACHE_URLS = ["./index.html","./assets/app.js","./assets/app.css"]',
    }),
    NativeTraining: {
      getAssetVersion: async () => ({ version }),
      downloadAsset: async (value) => {
        calls.push(['download', value])
        if (failDownload) throw Error('offline')
      },
      activateAssetVersion: async (value) => {
        calls.push(['activate', value])
        version = value.version
      },
      ...overrides,
    },
    showToast: (message, options) => toasts.push({ message, ...options }),
    console: { warn() {} },
    URL,
    Date,
  }
  return {
    calls,
    toasts,
    context,
    run: runInNewContext(
      `let nativeAssetUpdateInFlight = false; ${updateSource}; updateNativeWebAssets`,
      context,
    ),
  }
}

test('same version neither downloads nor activates again', async () => {
  const h = harness('new')
  assert.equal((await h.run()).updated, false)
  assert.equal(h.calls.length, 0)
})
test('new version downloads all assets before activation and requests one reload', async () => {
  const h = harness('old')
  assert.equal((await h.run()).updated, true)
  assert.deepEqual(
    h.calls.map(([type]) => type),
    ['download', 'download', 'download', 'activate'],
  )
  assert.equal(h.calls.at(-1)[1].reload, true)
})
test('failed download leaves the active version unchanged', async () => {
  const h = harness('old', true)
  assert.equal((await h.run()).updated, false)
  assert.ok(!h.calls.some(([type]) => type === 'activate'))
})

test('subsequent launches do not download or activate the same version', async () => {
  const h = harness('old')
  await h.run()
  for (let i = 0; i < 5; i++) await h.run()
  assert.equal(h.calls.filter(([type]) => type === 'activate').length, 1)
  assert.equal(h.calls.filter(([type]) => type === 'download').length, 3)
})

test('commit failure never displays success', async () => {
  const h = harness('old', false, {
    activateAssetVersion: async () => {
      throw Error('disk full')
    },
  })
  assert.equal((await h.run()).updated, false)
  assert.equal(h.toasts.filter((toast) => toast.type === 'success').length, 0)
})

test('HTTP failure and malformed manifest do not activate resources', async () => {
  for (const response of [
    { ok: false, status: 503 },
    { ok: true, text: async () => 'invalid' },
  ]) {
    const h = harness('old')
    h.context.fetch = async () => response
    assert.equal((await h.run()).updated, false)
    assert.equal(h.calls.length, 0)
  }
})

test(
  'JavaScript downloads, Java commits, restart reads the updated CSS',
  {
    skip: !process.env.LIANKE_TEST_JAVA,
  },
  async () => {
    const root = mkdtempSync(join(tmpdir(), 'lianke-update-integration-'))
    const java = (...args) =>
      execFileSync(
        process.env.LIANKE_TEST_JAVA,
        ['-cp', process.env.LIANKE_TEST_CLASSES, 'com.fanghaoming.lianke.AssetStoreTest', ...args],
        { encoding: 'utf8' },
      ).trim()
    try {
      let css = 'buttons { flex: 1 1 100%; }'
      const h = harness('old', false, {
        getAssetVersion: async () => ({ version: java('version', root) }),
        downloadAsset: async ({ version, path }) => {
          const file = join(root, 'staging', version, path)
          mkdirSync(dirname(file), { recursive: true })
          writeFileSync(file, path.endsWith('.css') ? css : 'updated document or script')
        },
        activateAssetVersion: async ({ version, paths, reload }) => {
          assert.equal(reload, true)
          java('activate', root, version, ...paths)
        },
      })
      assert.equal((await h.run()).updated, true)
      const startup = java('startup', root)
      assert.equal(readFileSync(join(startup, 'assets/app.css'), 'utf8'), css)
      css = 'must not be downloaded again'
      assert.equal((await h.run()).updated, false)
      assert.equal(
        readFileSync(join(startup, 'assets/app.css'), 'utf8'),
        'buttons { flex: 1 1 100%; }',
      )
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  },
)
