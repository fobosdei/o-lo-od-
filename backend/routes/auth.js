/**
 * Auth Routes — Registration, Login, Profile, Master Password
 * POST /api/auth/register   — Create account + profile
 * POST /api/auth/login      — Sign in, get tokens + profile
 * GET  /api/auth/me         — Get current user profile
 * POST /api/auth/sentinel   — Save master password sentinel
 * GET  /api/auth/sentinel   — Get sentinel for verification
 * POST /api/auth/logout     — Sign out
 */
const router = require('express').Router()
const { body, validationResult } = require('express-validator')
const { authLimiter, requireAuth } = require('../middleware/security')
const { checkDuplicateEmail } = require('../middleware/validateEmail')
const AuthController = require('../control/authController')

// ─── Validation Rules ─────────────────────────────────────────────

const registerValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Email inválido'),
  body('password').isLength({ min: 8 }).withMessage('Contraseña mínimo 8 caracteres'),
]

const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
]

const sentinelValidation = [
  body('encrypted_check').notEmpty().withMessage('encrypted_check requerido'),
  body('iv_check').notEmpty().withMessage('iv_check requerido'),
]

// Utility: extract validation errors
function handleValidation(req, res) {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    res.status(400).json({ error: errors.array()[0].msg, errors: errors.array() })
    return false
  }
  return true
}

// ─── Routes ───────────────────────────────────────────────────────

/**
 * POST /api/auth/register
 * Creates Supabase account + user profile with master salt
 */
router.post('/register', authLimiter, registerValidation, checkDuplicateEmail, async (req, res) => {
  if (!handleValidation(req, res)) return

  const { email, password } = req.body

  try {
    const result = await AuthController.register(email, password, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    })

    res.status(201).json({
      message: 'Cuenta creada exitosamente',
      userId: result.userId,
      email: result.email,
    })
  } catch (err) {
    console.error('[Route: register]', err.message)
    res.status(err.status || 500).json({ error: err.message || 'Error al crear la cuenta' })
  }
})

/**
 * POST /api/auth/login
 * Returns session tokens + profile status
 */
router.post('/login', authLimiter, loginValidation, async (req, res) => {
  if (!handleValidation(req, res)) return

  const { email, password } = req.body

  try {
    const result = await AuthController.login(email, password, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    })

    res.json(result)
  } catch (err) {
    console.error('[Route: login]', err.message)
    if (err.message?.includes('Invalid login')) {
      return res.status(401).json({ error: 'Credenciales inválidas' })
    }
    res.status(err.status || 500).json({ error: err.message || 'Error de autenticación' })
  }
})

/**
 * GET /api/auth/me
 * Returns current user profile (requires valid token)
 */
router.get('/me', requireAuth, async (req, res) => {
  try {
    const profile = await AuthController.getProfile(req.user.id)
    res.json(profile)
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message })
  }
})

/**
 * POST /api/auth/sentinel
 * Save encrypted master password sentinel
 */
router.post('/sentinel', requireAuth, sentinelValidation, async (req, res) => {
  if (!handleValidation(req, res)) return

  try {
    await AuthController.saveMasterSentinel(
      req.user.id,
      req.body.encrypted_check,
      req.body.iv_check,
    )
    res.json({ success: true, message: 'Contraseña maestra configurada' })
  } catch (err) {
    console.error('[Route: sentinel]', err.message)
    res.status(err.status || 500).json({ error: err.message })
  }
})

/**
 * GET /api/auth/sentinel
 * Get sentinel data for master password verification
 */
router.get('/sentinel', requireAuth, async (req, res) => {
  try {
    const sentinel = await AuthController.getSentinel(req.user.id)
    res.json(sentinel)
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message })
  }
})

/**
 * POST /api/auth/logout
 */
router.post('/logout', requireAuth, async (req, res) => {
  try {
    const { getSupabaseAdmin } = require('../middleware/security')
    const supabase = getSupabaseAdmin()
    await supabase.auth.admin.signOut(req.token)
  } catch { /* always succeed from client perspective */ }
  res.json({ message: 'Sesión cerrada' })
})

module.exports = router
