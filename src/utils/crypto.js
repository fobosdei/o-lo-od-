/**
 * ╔═══════════════════════════════════════════════════════════╗
 * ║  Vault — Client-Side Encryption Utilities                 ║
 * ║  Uses Web Crypto API (AES-256-GCM + PBKDF2)               ║
 * ║  Zero-knowledge: plaintext NEVER leaves the device        ║
 * ╚═══════════════════════════════════════════════════════════╝
 *
 * Security model:
 *  1. Master password → PBKDF2 (100,000 iterations, SHA-256) → 256-bit key
 *  2. Each credential uses a unique random IV (12 bytes)
 *  3. Encryption: AES-256-GCM (provides authenticity + confidentiality)
 *  4. Salt is stored per-user (random 16 bytes, stored in Supabase)
 *  5. The derived key lives ONLY in memory; never persisted
 */

// ─── Key Derivation ────────────────────────────────────────────────────────────

/**
 * Derives a 256-bit AES key from the master password using PBKDF2
 * @param {string} masterPassword
 * @param {Uint8Array} salt - 16 random bytes (stored per user)
 * @returns {Promise<CryptoKey>}
 */
export async function deriveKey(masterPassword, salt) {
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(masterPassword),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  )

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100_000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,       // not extractable — key never leaves crypto subsystem
    ['encrypt', 'decrypt']
  )
}

// ─── Encryption ────────────────────────────────────────────────────────────────

/**
 * Encrypts plaintext using AES-256-GCM
 * @param {string} plaintext
 * @param {CryptoKey} key
 * @returns {Promise<{ciphertext: string, iv: string}>} base64-encoded strings
 */
export async function encrypt(plaintext, key) {
  if (!plaintext) return { ciphertext: '', iv: '' }

  const encoder = new TextEncoder()
  const iv = crypto.getRandomValues(new Uint8Array(12))  // 96-bit IV for GCM

  const ciphertextBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(plaintext)
  )

  return {
    ciphertext: arrayBufferToBase64(ciphertextBuffer),
    iv: arrayBufferToBase64(iv),
  }
}

/**
 * Decrypts AES-256-GCM ciphertext
 * @param {string} ciphertext - base64 encoded
 * @param {string} iv - base64 encoded
 * @param {CryptoKey} key
 * @returns {Promise<string>}
 */
export async function decrypt(ciphertext, iv, key) {
  if (!ciphertext || !iv) return ''

  try {
    const decoder = new TextDecoder()
    const plaintextBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: base64ToArrayBuffer(iv) },
      key,
      base64ToArrayBuffer(ciphertext)
    )
    return decoder.decode(plaintextBuffer)
  } catch (err) {
    console.error('Decryption failed — wrong key or corrupted data:', err.message)
    throw new Error('DECRYPTION_FAILED')
  }
}

// ─── Salt Management ───────────────────────────────────────────────────────────

/**
 * Generates a cryptographically secure random salt
 * @returns {string} base64-encoded 16-byte salt
 */
export function generateSalt() {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  return arrayBufferToBase64(salt)
}

/**
 * Converts a base64 salt string to Uint8Array for key derivation
 * @param {string} saltBase64
 * @returns {Uint8Array}
 */
export function saltFromBase64(saltBase64) {
  return new Uint8Array(base64ToArrayBuffer(saltBase64))
}

// ─── Password Generator ────────────────────────────────────────────────────────

const CHARS = {
  lower: 'abcdefghijklmnopqrstuvwxyz',
  upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  digits: '0123456789',
  symbols: '!@#$%^&*()_+-=[]{}|;:,.<>?',
  ambiguous: 'lI1O0',
}

/**
 * Generates a cryptographically secure random password
 * @param {Object} options
 * @returns {string}
 */
export function generatePassword({
  length = 20,
  upper = true,
  digits = true,
  symbols = true,
  noAmbiguous = true,
} = {}) {
  let charset = CHARS.lower
  if (upper) charset += CHARS.upper
  if (digits) charset += CHARS.digits
  if (symbols) charset += CHARS.symbols
  if (noAmbiguous) charset = charset.split('').filter(c => !CHARS.ambiguous.includes(c)).join('')

  const array = new Uint32Array(length)
  crypto.getRandomValues(array)

  let password = ''
  for (let i = 0; i < length; i++) {
    password += charset[array[i] % charset.length]
  }

  // Ensure at least one character from each required set
  const required = []
  if (upper) required.push(CHARS.upper.replace(/[lI1O0]/g, ''))
  if (digits) required.push(CHARS.digits.replace(/[01]/g, ''))
  if (symbols) required.push(CHARS.symbols)

  // Replace random positions with required chars
  const positions = new Uint32Array(required.length)
  crypto.getRandomValues(positions)

  let arr = password.split('')
  required.forEach((chars, i) => {
    const pos = positions[i] % length
    const charArray = chars.split('').filter(c => !noAmbiguous || !CHARS.ambiguous.includes(c))
    if (charArray.length > 0) {
      const idx = new Uint32Array(1)
      crypto.getRandomValues(idx)
      arr[pos] = charArray[idx[0] % charArray.length]
    }
  })

  return arr.join('')
}

// ─── Password Strength ─────────────────────────────────────────────────────────

/**
 * Calculates password strength score (0-100) and label
 * @param {string} password
 * @returns {{score: number, label: string, color: string, suggestions: string[]}}
 */
export function checkPasswordStrength(password) {
  if (!password) return { score: 0, label: 'Vacío', color: '#64748b', suggestions: [] }

  let score = 0
  const suggestions = []

  // Length
  if (password.length >= 8) score += 10
  if (password.length >= 12) score += 10
  if (password.length >= 16) score += 15
  if (password.length >= 20) score += 10
  if (password.length < 12) suggestions.push('Usa al menos 12 caracteres')

  // Character variety
  const hasLower = /[a-z]/.test(password)
  const hasUpper = /[A-Z]/.test(password)
  const hasDigit = /[0-9]/.test(password)
  const hasSymbol = /[^a-zA-Z0-9]/.test(password)

  if (hasLower) score += 10
  if (hasUpper) score += 10
  if (hasDigit) score += 10
  if (hasSymbol) score += 15

  if (!hasUpper) suggestions.push('Añade letras mayúsculas')
  if (!hasDigit) suggestions.push('Añade números')
  if (!hasSymbol) suggestions.push('Añade símbolos especiales')

  // Patterns (penalize)
  if (/(.)\1{2,}/.test(password)) { score -= 10; suggestions.push('Evita caracteres repetidos') }
  if (/^[a-zA-Z]+$/.test(password)) { score -= 5 }
  if (/^[0-9]+$/.test(password)) { score -= 10; suggestions.push('No uses solo números') }

  // Common patterns
  const common = /password|123456|qwerty|abc123|letmein|admin|welcome/i
  if (common.test(password)) { score -= 30; suggestions.push('Evita contraseñas comunes') }

  score = Math.max(0, Math.min(100, score))

  let label, color
  if (score < 25) { label = 'Muy débil'; color = '#ef4444' }
  else if (score < 50) { label = 'Débil'; color = '#f97316' }
  else if (score < 75) { label = 'Buena'; color = '#eab308' }
  else if (score < 90) { label = 'Fuerte'; color = '#22c55e' }
  else { label = 'Muy fuerte'; color = '#00ff88' }

  return { score, label, color, suggestions }
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  bytes.forEach(b => binary += String.fromCharCode(b))
  return btoa(binary)
}

function base64ToArrayBuffer(base64) {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

/**
 * Securely clears a string from memory (best-effort in JS)
 * @param {string} str
 */
export function secureWipe(str) {
  // JS strings are immutable, but we can overwrite the variable reference
  str = null
  // Suggest GC
  if (typeof globalThis.gc === 'function') globalThis.gc()
}
