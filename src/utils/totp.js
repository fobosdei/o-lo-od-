/**
 * TOTP Engine — Time-based One-Time Password (RFC 6238)
 * Implementado con Web Crypto API (HMAC-SHA1)
 * Compatible con Google Authenticator, Microsoft Authenticator, Authy, etc.
 */

// ─── Base32 decoder ────────────────────────────────────────────────────────────
const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

function base32Decode(input) {
  const str = input.toUpperCase().replace(/=+$/, '').replace(/\s/g, '')
  let bits = 0
  let value = 0
  let index = 0
  const output = new Uint8Array(Math.floor((str.length * 5) / 8))

  for (let i = 0; i < str.length; i++) {
    const charIdx = BASE32_CHARS.indexOf(str[i])
    if (charIdx === -1) throw new Error(`Caracter base32 inválido: ${str[i]}`)
    value = (value << 5) | charIdx
    bits += 5
    if (bits >= 8) {
      output[index++] = (value >>> (bits - 8)) & 255
      bits -= 8
    }
  }
  return output
}

// ─── HMAC-SHA1 ─────────────────────────────────────────────────────────────────
async function hmacSha1(keyBytes, msgBytes) {
  const key = await crypto.subtle.importKey(
    'raw', keyBytes,
    { name: 'HMAC', hash: 'SHA-1' },
    false, ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, msgBytes)
  return new Uint8Array(sig)
}

// ─── TOTP Generator ─────────────────────────────────────────────────────────────
/**
 * Genera el código TOTP actual
 * @param {string} secret  — Secreto en Base32 (del QR code)
 * @param {number} digits  — Dígitos del código (default: 6)
 * @param {number} period  — Periodo en segundos (default: 30)
 * @returns {Promise<string>} — Código de N dígitos con ceros a la izquierda
 */
export async function generateTOTP(secret, digits = 6, period = 30) {
  const keyBytes = base32Decode(secret)
  const counter = Math.floor(Date.now() / 1000 / period)

  // Counter como big-endian 8 bytes
  const msg = new Uint8Array(8)
  let tmp = counter
  for (let i = 7; i >= 0; i--) {
    msg[i] = tmp & 0xff
    tmp = Math.floor(tmp / 256)
  }

  const hash = await hmacSha1(keyBytes, msg)

  // Dynamic truncation
  const offset = hash[hash.length - 1] & 0x0f
  const code = (
    ((hash[offset]     & 0x7f) << 24) |
    ((hash[offset + 1] & 0xff) << 16) |
    ((hash[offset + 2] & 0xff) <<  8) |
    ((hash[offset + 3] & 0xff))
  ) % Math.pow(10, digits)

  return String(code).padStart(digits, '0')
}

/**
 * Segundos restantes en el periodo actual
 */
export function secondsRemaining(period = 30) {
  return period - (Math.floor(Date.now() / 1000) % period)
}

/**
 * Progreso del periodo actual (0 → 1)
 */
export function periodProgress(period = 30) {
  return (Math.floor(Date.now() / 1000) % period) / period
}

/**
 * Valida que un secreto base32 sea correcto
 */
export function validateSecret(secret) {
  if (!secret || secret.trim().length < 8) return false
  try {
    base32Decode(secret.trim())
    return true
  } catch {
    return false
  }
}

/**
 * Parsea una URL otpauth:// (de un QR code)
 * otpauth://totp/Label?secret=XXX&issuer=YYY&digits=6&period=30
 */
export function parseOtpAuthUrl(url) {
  try {
    const u = new URL(url)
    if (u.protocol !== 'otpauth:') return null

    const label = decodeURIComponent(u.pathname.replace('//', '').replace('/totp/', ''))
    const params = u.searchParams
    const issuer = params.get('issuer') || label.split(':')[0] || ''
    const account = label.includes(':') ? label.split(':')[1].trim() : label
    const secret = params.get('secret') || ''
    const digits = parseInt(params.get('digits') || '6')
    const period = parseInt(params.get('period') || '30')

    return { issuer, account, secret, digits, period }
  } catch {
    return null
  }
}
