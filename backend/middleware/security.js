/**
 * Security Middleware Stack
 * Protects against common web vulnerabilities
 */
const rateLimit = require('express-rate-limit')
const helmet = require('helmet')
const { createClient } = require('@supabase/supabase-js')

// ─── Supabase Admin Client ────────────────────────────────────────────────────
let supabaseAdmin = null

function getSupabaseAdmin() {
  if (!supabaseAdmin) {
    supabaseAdmin = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,  // Admin key — never expose to frontend
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
  }
  return supabaseAdmin
}

// ─── Helmet Security Headers ──────────────────────────────────────────────────
const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
    }
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
  }
})

// ─── Rate Limiters ────────────────────────────────────────────────────────────

// General API rate limit
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes. Intenta en 15 minutos.' },
  keyGenerator: (req) => req.ip + ':' + (req.headers['x-user-id'] || 'anon'),
})

// Strict limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,   // 15 minutes
  max: 10,                     // Only 10 auth attempts per window
  message: { error: 'Demasiados intentos de autenticación.' },
  keyGenerator: (req) => req.ip,
  skipSuccessfulRequests: true, // Don't count successful logins
})

// Vault unlock limiter
const unlockLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,    // 5 minutes
  max: 5,                      // Only 5 unlock attempts
  message: { error: 'Demasiados intentos de desbloqueo. Espera 5 minutos.' },
  keyGenerator: (req) => req.ip + ':' + (req.user?.id || 'anon'),
})

// ─── JWT Auth Middleware ──────────────────────────────────────────────────────

/**
 * Verifies Supabase JWT token from Authorization header
 * Attaches the verified user to req.user
 */
async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de autorización requerido' })
    }

    const token = authHeader.substring(7)
    const supabase = getSupabaseAdmin()

    // Verify token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
      return res.status(401).json({ error: 'Token inválido o expirado' })
    }

    req.user = user
    req.token = token
    next()
  } catch (err) {
    console.error('[Auth Middleware]', err.message)
    res.status(500).json({ error: 'Error de autenticación' })
  }
}

// ─── Request Logger ───────────────────────────────────────────────────────────

function requestLogger(req, res, next) {
  const start = Date.now()
  const { method, url, ip } = req
  const userAgent = req.headers['user-agent'] || 'unknown'

  res.on('finish', () => {
    const duration = Date.now() - start
    const userId = req.user?.id?.substring(0, 8) || 'anon'
    const logLevel = res.statusCode >= 400 ? 'WARN' : 'INFO'
    console.log(`[${logLevel}] ${method} ${url} ${res.statusCode} ${duration}ms — ${userId} — ${ip}`)
  })

  next()
}

// ─── Sanitize Input ───────────────────────────────────────────────────────────

function sanitizeInput(req, res, next) {
  // Prevent path traversal
  const sanitizeString = (str) => {
    if (typeof str !== 'string') return str
    return str
      .replace(/\.\.\//g, '')
      .replace(/\.\//g, '')
      .trim()
  }

  if (req.body) {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = sanitizeString(req.body[key])
      }
    })
  }

  next()
}

module.exports = {
  helmetConfig,
  generalLimiter,
  authLimiter,
  unlockLimiter,
  requireAuth,
  requestLogger,
  sanitizeInput,
  getSupabaseAdmin,
}
