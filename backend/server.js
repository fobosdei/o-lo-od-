/**
 * ╔═══════════════════════════════════════════════════════════════╗
 * ║  Vault Backend — Express.js Security Server                   ║
 * ║  Provides auth layer, rate limiting, and audit logging        ║
 * ║  Runs on localhost:4000 within Electron                       ║
 * ╚═══════════════════════════════════════════════════════════════╝
 */
// In dev, dotenv is loaded from the root .env by the dev:backend script.
// In production, dotenv is loaded by electron/main.js before requiring this file.
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config({ path: require('path').join(__dirname, '../.env') })
}

const express = require('express')
const cors = require('cors')
const morgan = require('morgan')
const path = require('path')

const {
  helmetConfig,
  generalLimiter,
  requestLogger,
  sanitizeInput,
} = require('./middleware/security')

const authRoutes = require('./routes/auth')
const credentialRoutes = require('./routes/credentials')
const totpRoutes = require('./routes/totp')

const app = express()
const PORT = process.env.BACKEND_PORT || 4000
const isDev = process.env.NODE_ENV === 'development'

// ─── Security Middleware ────────────────────────────────────────────────────
app.use(helmetConfig)

// CORS — allow Electron renderer (origin is null when loaded from file://)
// and localhost for dev server
app.use(cors({
  origin: (origin, callback) => {
    const allowed = ['http://localhost:5173', 'http://localhost:4000', 'http://127.0.0.1:5173']
    // origin is null when the request comes from a file:// Electron page
    if (!origin || allowed.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-User-Id'],
  credentials: true,
  maxAge: 86400,
}))

// Trust proxy for rate limiting (Electron uses localhost)
app.set('trust proxy', 1)

// Body parsing with size limits
app.use(express.json({ limit: '50kb' }))         // Prevent large payload attacks
app.use(express.urlencoded({ extended: false, limit: '50kb' }))

// Sanitize inputs
app.use(sanitizeInput)

// Logging
if (isDev) {
  app.use(morgan('dev'))
}
app.use(requestLogger)

// General rate limiting
app.use('/api/', generalLimiter)

// ─── Security Headers ───────────────────────────────────────────────────────
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('X-XSS-Protection', '1; mode=block')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.removeHeader('X-Powered-By')
  next()
})

// ─── Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes)
app.use('/api/credentials', credentialRoutes)
app.use('/api/totp', totpRoutes)

// ─── Health check ───────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'vault-backend',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  })
})

// ─── 404 Handler ────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' })
})

// ─── Global Error Handler ───────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[Error]', err.stack)

  // Don't leak error details in production
  const message = isDev ? err.message : 'Error interno del servidor'
  res.status(err.status || 500).json({ error: message })
})

// ─── Start Server ───────────────────────────────────────────────────────────
app.listen(PORT, '127.0.0.1', () => {
  console.log(`
╔══════════════════════════════════════════╗
║  Vault Backend v1.0.0                    ║
║  Listening on http://127.0.0.1:${PORT}   ║
║  Environment: ${isDev ? 'development   ' : 'production    '}           ║
╚══════════════════════════════════════════╝
  `)
})

module.exports = app
