import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

/**
 * AES-256-GCM encryption for secrets stored at rest (MCP server auth tokens).
 *
 * Wire format: `enc:v1:<iv b64>:<ciphertext b64>:<authTag b64>`
 * Values without the `enc:v1:` prefix are treated as legacy plaintext and
 * returned as-is by decrypt, so existing rows keep working and get encrypted
 * on their next write.
 *
 * Key source: TOKEN_ENCRYPTION_KEY env var — 32 bytes, base64 or hex encoded.
 * Generate one with: openssl rand -base64 32
 * When the key is absent, encryption is a no-op (plaintext storage) and a
 * warning is logged once per process.
 */

const PREFIX = 'enc:v1:'

let warned = false

function loadKey(): Buffer | null {
  const raw = process.env.TOKEN_ENCRYPTION_KEY
  if (!raw) {
    if (!warned) {
      console.warn('[token-cipher] TOKEN_ENCRYPTION_KEY not set — secrets are stored in plaintext')
      warned = true
    }
    return null
  }
  const b64 = Buffer.from(raw, 'base64')
  if (b64.length === 32) return b64
  const hex = Buffer.from(raw, 'hex')
  if (hex.length === 32) return hex
  throw new Error('[token-cipher] TOKEN_ENCRYPTION_KEY must be 32 bytes, base64 or hex encoded')
}

export function encryptToken(plaintext: string): string {
  const key = loadKey()
  if (!key) return plaintext
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${PREFIX}${iv.toString('base64')}:${ciphertext.toString('base64')}:${tag.toString('base64')}`
}

export function decryptToken(stored: string): string {
  if (!stored.startsWith(PREFIX)) return stored
  const key = loadKey()
  if (!key) {
    throw new Error('[token-cipher] found encrypted secret but TOKEN_ENCRYPTION_KEY is not set')
  }
  const [ivB64, dataB64, tagB64] = stored.slice(PREFIX.length).split(':')
  if (!ivB64 || !dataB64 || !tagB64) {
    throw new Error('[token-cipher] malformed encrypted secret')
  }
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivB64, 'base64'))
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'))
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, 'base64')),
    decipher.final(),
  ]).toString('utf8')
}
