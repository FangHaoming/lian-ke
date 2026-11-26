import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const classes = mkdtempSync(join(tmpdir(), 'lianke-java-tests-'))
const javaHome = process.env.LIANKE_JAVA_HOME || process.env.JAVA_HOME
const bin = (name) => (javaHome ? join(javaHome, 'bin', name) : name)
try {
  execFileSync(
    bin('javac'),
    [
      '--release',
      '8',
      '-d',
      classes,
      'android/app/src/main/java/com/fanghaoming/lianke/AssetStore.java',
    ],
    { stdio: 'inherit' },
  )
  execFileSync(bin('javac'), ['-cp', classes, '-d', classes, 'tests/java/AssetStoreTest.java'], {
    stdio: 'inherit',
  })
  execFileSync(bin('java'), ['-cp', classes, 'com.fanghaoming.lianke.AssetStoreTest'], {
    stdio: 'inherit',
  })
  execFileSync(process.execPath, ['--test', 'scripts/native-assets.test.js'], {
    stdio: 'inherit',
    env: {
      ...process.env,
      LIANKE_TEST_JAVA: javaHome ? resolve(bin('java')) : 'java',
      LIANKE_TEST_CLASSES: classes,
    },
  })
} finally {
  rmSync(classes, { recursive: true, force: true })
}
