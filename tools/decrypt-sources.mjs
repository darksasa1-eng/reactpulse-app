#!/usr/bin/env node
/* ---------------------------------------------------------------------------
   Rebuild the readable source from the `.enc` blobs.

   Rendering runs this automatically before every build and start:
     SOURCE_KEY=<key> npm run build      ->  prebuild decrypts, then builds

   It is idempotent: a file that is already readable (and not older than its
   vault copy) is left alone, so local development can keep plain text on disk
   while the repository only ever holds encrypted files.
   --------------------------------------------------------------------------- */

import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync, existsSync } from 'node:fs'
import path from 'node:path'
import { decryptBuffer, VAULT_TARGETS } from './crypto.mjs'

const ROOT = path.resolve(import.meta.dirname, '..')

/* the key comes from the environment (Render, CI) or, for local development,
   from the git-ignored .source-key file next to package.json */
function readSecret() {
  if (process.env.SOURCE_KEY) return process.env.SOURCE_KEY.trim()
  const local = path.join(ROOT, '.source-key')
  if (existsSync(local)) return readFileSync(local, 'utf8').trim()
  return ''
}

const secret = readSecret()

function walk(target) {
  const abs = path.join(ROOT, target)
  if (!existsSync(abs)) return []
  if (statSync(abs).isFile()) return [abs]
  const out = []
  for (const entry of readdirSync(abs, { withFileTypes: true })) {
    if (['node_modules', '.git', 'dist', '.cache'].includes(entry.name)) continue
    out.push(...walk(path.join(target, entry.name)))
  }
  return out
}

/* Vault targets are either directories (src, server, scripts) or single files
   (index.html, vite.config.js). A single file target only exists as `<name>.enc`
   in a fresh clone, so it is resolved directly instead of by walking. */
function vaultFiles() {
  const found = []
  for (const target of VAULT_TARGETS) {
    const abs = path.join(ROOT, target)
    if (existsSync(abs) && statSync(abs).isFile()) {
      if (existsSync(`${abs}.enc`)) found.push(`${abs}.enc`)
      continue
    }
    if (existsSync(abs)) found.push(...walk(target).filter((file) => file.endsWith('.enc')))
    else if (existsSync(`${abs}.enc`)) found.push(`${abs}.enc`)
  }
  return found
}

const vaultFileList = vaultFiles()

if (vaultFileList.length === 0) {
  console.log('[vault] no encrypted source found - nothing to do')
  process.exit(0)
}

if (!secret) {
  console.error('[vault] this repository ships encrypted source.')
  console.error('[vault] set SOURCE_KEY (the 64 character key from your password manager) and retry,')
  console.error('[vault] for example:  SOURCE_KEY=xxxxxxxx npm run build')
  process.exit(1)
}

let restored = 0
let skipped = 0
let failed = 0

for (const file of vaultFileList) {
  const out = file.replace(/\.enc$/, '')
  const outExists = existsSync(out)
  if (outExists && statSync(out).mtimeMs >= statSync(file).mtimeMs) {
    skipped += 1
    continue
  }
  try {
    const plain = decryptBuffer(readFileSync(file), secret)
    mkdirSync(path.dirname(out), { recursive: true })
    writeFileSync(out, plain)
    restored += 1
  } catch (error) {
    failed += 1
    console.error(`[vault] ${path.relative(ROOT, file)}: ${error.message}`)
  }
}

if (failed) {
  console.error(`[vault] ${failed} file(s) could not be decrypted - wrong SOURCE_KEY?`)
  process.exit(1)
}

console.log(`[vault] source ready (${restored} restored, ${skipped} already in place)`)
