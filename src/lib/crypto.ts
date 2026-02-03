import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

const ALGO = 'aes-256-gcm'
const KEY_LEN = 32
const IV_LEN = 12
const AUTH_TAG_LEN = 16

const ENCRYPTION_KEY_MSG = 'ENCRYPTION_KEY is required (64 hex chars, e.g. openssl rand -hex 32). Set it in .env.local or Vercel environment variables.'

function getMasterKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY
  if (!raw || !raw.trim()) throw new Error(ENCRYPTION_KEY_MSG)
  const trimmed = raw.trim()
  if (trimmed.length !== 64 || !/^[0-9a-fA-F]+$/.test(trimmed)) throw new Error(ENCRYPTION_KEY_MSG)
  const buf = Buffer.from(trimmed, 'hex')
  if (buf.length !== KEY_LEN) throw new Error(ENCRYPTION_KEY_MSG)
  return buf
}

/** 用 per-link 密钥加密内容，返回 hex（iv + tag + enc），前端可用同一格式解密 */
export function encryptWithKey(plaintext: string, key: Buffer): string {
  const iv = randomBytes(IV_LEN)
  const cipher = createCipheriv(ALGO, key, iv, { authTagLength: AUTH_TAG_LEN })
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, enc]).toString('hex')
}

/** 用主密钥加密 32 字节 per-link 密钥，供存库；返回 hex */
export function encryptKeyWithMaster(key: Buffer): string {
  const master = getMasterKey()
  const iv = randomBytes(IV_LEN)
  const cipher = createCipheriv(ALGO, master, iv, { authTagLength: AUTH_TAG_LEN })
  const enc = Buffer.concat([cipher.update(key), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, enc]).toString('hex')
}

/** 用主密钥解密存库的 key，返回 32 字节 Buffer（per-link 密钥） */
export function decryptKeyWithMaster(encryptedHex: string): Buffer {
  const master = getMasterKey()
  const buf = Buffer.from(encryptedHex, 'hex')
  if (buf.length < IV_LEN + AUTH_TAG_LEN + 1) throw new Error('Invalid encrypted key')
  const iv = buf.subarray(0, IV_LEN)
  const tag = buf.subarray(IV_LEN, IV_LEN + AUTH_TAG_LEN)
  const enc = buf.subarray(IV_LEN + AUTH_TAG_LEN)
  const decipher = createDecipheriv(ALGO, master, iv, { authTagLength: AUTH_TAG_LEN })
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(enc), decipher.final()])
}

/** 生成 32 字节随机 per-link 密钥 */
export function randomLinkKey(): Buffer {
  return randomBytes(KEY_LEN)
}
