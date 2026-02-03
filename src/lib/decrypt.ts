/**
 * 前端解密：用 Web Crypto API 对接口返回的密文 + key 解密
 * 格式与后端一致：contentHex = iv(12) + tag(16) + enc，均为 hex
 */
const IV_LEN = 12
const AUTH_TAG_LEN = 16

export async function decryptContent(ciphertextHex: string, keyHex: string): Promise<string> {
  if (!keyHex || !ciphertextHex) return ''
  const keyBytes = hexToBytes(keyHex)
  const buf = hexToBytes(ciphertextHex)
  if (buf.length < IV_LEN + AUTH_TAG_LEN + 1) throw new Error('Invalid ciphertext')

  const iv = buf.slice(0, IV_LEN)
  const tag = buf.slice(IV_LEN, IV_LEN + AUTH_TAG_LEN)
  const enc = buf.slice(IV_LEN + AUTH_TAG_LEN)
  const ciphertext = new Uint8Array(enc.length + tag.length)
  ciphertext.set(enc)
  ciphertext.set(tag, enc.length)

  const key = await crypto.subtle.importKey('raw', keyBytes.buffer as ArrayBuffer, { name: 'AES-GCM', length: 256 }, false, ['decrypt'])

  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv, tagLength: AUTH_TAG_LEN * 8 }, key, ciphertext)
  return new TextDecoder().decode(plain)
}

function hexToBytes(hex: string): Uint8Array {
  const len = hex.length / 2
  const out = new Uint8Array(len)
  for (let i = 0; i < len; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  return out
}
