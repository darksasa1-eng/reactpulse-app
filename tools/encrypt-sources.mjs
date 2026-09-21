#!/usr/bin/env node
/* ---------------------------------------------------------------------------
   Encrypt the application source into the repository as `.enc` blobs.

   Usage:
     SOURCE_KEY=<key> node tools/encrypt-sources.mjs [--remove-plaintext]

   Run it after editing the source: it writes `src/App.jsx.enc` next to
   `src/App.jsx` and (with --remove-plaintext) deletes the readable file, so a
   `git add -A` publishes only the encrypted form.
   --------------------------------------------------------------------------- */

import { readFileSync, writeFileSync, readdirSync, statSync, rmSync, existsSync } from 'node:fs'
import path from 'node:path'
import { encryptBuffer, VAULT_TARGETS } from './crypto.mjs'

const ROOT = path.resolve(import.meta.dirname, '..')
const secret = process.env.SOURCE_KEY
const remove = process.argv.includes('--remove-plaintext')

if (!secret || secret.length < 16) {
  console.error('SOURCE_KEY is missing or too short (use at least 16 characters).')
  process.exit(1)
}

/* every file under the vault targets, minus build/vendor noise */
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

let files = 0
let bytes = 0

function targets() {
  const found = []
  for (const target of VAULT_TARGETS) {
    const abs = path.join(ROOT, target)
    if (existsSync(abs) && statSync(abs).isFile()) {
      found.push(abs)
      continue
    }
    if (existsSync(abs)) found.push(...walk(target))
    else {
      const enc = `${abs}.enc`
      if (existsSync(enc)) found.push(enc) /* nothing to do - already encrypted only */
    }
  }
  return found
}

for (const target of VAULT_TARGETS) {
  for (const file of targets()) {
    if (file.endsWith('.enc')) continue
    if (!file.startsWith(path.join(ROOT, target))) continue
    const plain = readFileSync(file)
    const blob = encryptBuffer(plain, secret)
    const out = `${file}.enc`
    writeFileSync(out, blob)
    bytes += plain.length
    files += 1
    if (remove) rmSync(file)
  }
}

console.log(`${files} file(s) encrypted (${(bytes / 1024).toFixed(1)} KB of source)`)
console.log('now: git add -A && git commit -m "chore(vault): re-encrypt source"')
