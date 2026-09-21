/* ---------------------------------------------------------------------------
   ReactPulse - source vault (AES-256-GCM)
   ---------------------------------------------------------------------------
   The GitHub repository is public, but the application source is not readable
   there: every file under VAULT_TARGETS is stored as `<path>.enc`, encrypted
   with a key that only lives in the Render environment (`SOURCE_KEY`).

   Format of a `.enc` file:
     "RPENC1"           6 bytes   magic + format version
     salt               16 bytes  scrypt salt
     iv                 12 bytes  GCM nonce
     tag                16 bytes  GCM auth tag
     ciphertext         rest      AES-256-GCM(plaintext, key, iv)

   The key is derived per file with scrypt(SOURCE_KEY, salt) so two files never
   share a key, and a tampered file fails to decrypt instead of silently
   producing garbage (GCM authenticates).
   --------------------------------------------------------------------------- */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto'

export const MAGIC = Buffer.from('RPENC1', 'ascii')
export const SALT_BYTES = 16
export const IV_BYTES = 12
export const TAG_BYTES = 16

/* what gets encrypted - everything that makes the app work.
   package.json / package-lock.json stay readable because npm has to read them
   before any of our code can run, and public/ assets are downloaded by every
   browser anyway. */
export const VAULT_TARGETS = ['src', 'server', 'scripts', 'index.html', 'vite.config.js']

export function deriveKey(secret, salt) {
  return scryptSync(secret, salt, 32, { N: 16384, r: 8, p: 1 })
}

export function encryptBuffer(plain, secret) {
  const salt = randomBytes(SALT_BYTES)
  const iv = randomBytes(IV_BYTES)
  const key = deriveKey(secret, salt)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const ciphertext = Buffer.concat([cipher.update(plain), cipher.final()])
  return Buffer.concat([MAGIC, salt, iv, cipher.getAuthTag(), ciphertext])
}

export function decryptBuffer(blob, secret) {
  if (!blob.subarray(0, MAGIC.length).equals(MAGIC)) {
    throw new Error('not a ReactPulse vault file (bad magic)')
  }
  let offset = MAGIC.length
  const salt = blob.subarray(offset, (offset += SALT_BYTES))
  const iv = blob.subarray(offset, (offset += IV_BYTES))
  const tag = blob.subarray(offset, (offset += TAG_BYTES))
  const ciphertext = blob.subarray(offset)
  const decipher = createDecipheriv('aes-256-gcm', deriveKey(secret, salt), iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(ciphertext), decipher.final()])
}
