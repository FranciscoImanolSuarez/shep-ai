import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { randomBytes } from 'crypto'
import { encryptToken, decryptToken } from './token-cipher'

const KEY_B64 = randomBytes(32).toString('base64')

describe('token-cipher', () => {
  let original: string | undefined

  beforeEach(() => {
    original = process.env.TOKEN_ENCRYPTION_KEY
    process.env.TOKEN_ENCRYPTION_KEY = KEY_B64
  })

  afterEach(() => {
    if (original === undefined) delete process.env.TOKEN_ENCRYPTION_KEY
    else process.env.TOKEN_ENCRYPTION_KEY = original
  })

  it('round-trips a token with a base64 key', () => {
    const stored = encryptToken('ghp_super-secret-token')
    expect(stored).toMatch(/^enc:v1:/)
    expect(stored).not.toContain('ghp_super-secret-token')
    expect(decryptToken(stored)).toBe('ghp_super-secret-token')
  })

  it('round-trips with a hex key', () => {
    process.env.TOKEN_ENCRYPTION_KEY = randomBytes(32).toString('hex')
    expect(decryptToken(encryptToken('abc'))).toBe('abc')
  })

  it('produces a different ciphertext per call (random IV)', () => {
    expect(encryptToken('same')).not.toBe(encryptToken('same'))
  })

  it('passes legacy plaintext through decrypt unchanged', () => {
    expect(decryptToken('legacy-plaintext-token')).toBe('legacy-plaintext-token')
  })

  it('is a no-op without a key', () => {
    delete process.env.TOKEN_ENCRYPTION_KEY
    expect(encryptToken('visible')).toBe('visible')
  })

  it('throws when decrypting without the key', () => {
    const stored = encryptToken('secret')
    delete process.env.TOKEN_ENCRYPTION_KEY
    expect(() => decryptToken(stored)).toThrow(/TOKEN_ENCRYPTION_KEY is not set/)
  })

  it('rejects an invalid key length', () => {
    process.env.TOKEN_ENCRYPTION_KEY = 'too-short'
    expect(() => encryptToken('x')).toThrow(/32 bytes/)
  })

  it('rejects tampered ciphertext (GCM auth)', () => {
    const stored = encryptToken('secret')
    const parts = stored.split(':')
    // flip a char in the ciphertext segment
    parts[3] = parts[3].slice(0, -2) + (parts[3].endsWith('A') ? 'B' : 'A') + parts[3].slice(-1)
    expect(() => decryptToken(parts.join(':'))).toThrow()
  })
})
