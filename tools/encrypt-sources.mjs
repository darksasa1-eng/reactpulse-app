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
import { encryptBuffer, decryptBuffer, VAULT_TARGETS } from './crypto.mjs'

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

let encrypted = 0
let skipped = 0
let bytes = 0

function readableFiles() {
  const found = []
  for (const target of VAULT_TARGETS) {
    const abs = path.join(ROOT, target)
    if (existsSync(abs) && statSync(abs).isFile()) found.push(abs)
    else if (existsSync(abs)) found.push(...walk(target))
  }
  return found.filter((file) => !file.endsWith('.enc'))
}

for (const file of readableFiles()) {
  const plain = readFileSync(file)
  const out = `${file}.enc`

  /* unchanged since the last run? keep the existing blob so the diff stays small */
  if (existsSync(out)) {
    try {
      if (decryptBuffer(readFileSync(out), secret).equals(plain)) {
        skipped += 1
        if (remove) rmSync(file)
        continue
      }
    } catch {
      /* wrong key or a tampered blob - fall through and rewrite it */
    }
  }

  writeFileSync(out, encryptBuffer(plain, secret))
  bytes += plain.length
  encrypted += 1
  if (remove) rmSync(file)
}

/* a source file that was deleted must not survive as an encrypted page */
const orphans = []
for (const target of VAULT_TARGETS) {
  const abs = path.join(ROOT, target)
  if (!existsSync(abs) || !statSync(abs).isDirectory()) continue
  for (const file of walk(target).filter((f) => f.endsWith('.enc'))) {
    if (!existsSync(file.replace(/\.enc$/, ''))) orphans.push(file)
  }
}
for (const file of orphans) {
  rmSync(file)
  console.log('removed orphaned ' + path.relative(ROOT, file) + ' (its source is gone)')
}

console.log(
  encrypted + ' file(s) encrypted (' + (bytes / 1024).toFixed(1) + ' KB of source)' +
    (skipped ? ', ' + skipped + ' unchanged' : '') +
    (orphans.length ? ', ' + orphans.length + ' orphan(s) removed' : '')
)
console.log('now: git add -A && git commit -m "chore(vault): re-encrypt source"')
