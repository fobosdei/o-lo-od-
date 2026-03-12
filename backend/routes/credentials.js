/**
 * Credentials Routes — Full CRUD for the password vault
 * All routes require authentication (Bearer token)
 * All sensitive data is encrypted by the frontend before sending
 *
 * GET    /api/credentials          — Get all credentials
 * POST   /api/credentials          — Create credential
 * PUT    /api/credentials/:id      — Update credential
 * DELETE /api/credentials/:id      — Delete credential
 * PATCH  /api/credentials/:id/fav  — Toggle favorite
 * POST   /api/credentials/log      — Log audit event
 * GET    /api/credentials/health   — Security health summary
 */
const router = require('express').Router()
const { body, param } = require('express-validator')
const { requireAuth, getSupabaseAdmin } = require('../middleware/security')
const CredentialController = require('../control/credentialController')

// All routes require auth
router.use(requireAuth)

/**
 * GET /api/credentials
 */
router.get('/', async (req, res) => {
  try {
    const entries = await CredentialController.getAll(req.user.id)
    res.json({ credentials: entries })
  } catch (err) {
    console.error('[Credentials GET]', err.message)
    res.status(500).json({ error: 'Error al obtener credenciales' })
  }
})

/**
 * POST /api/credentials
 */
router.post('/', [
  body('title').notEmpty().trim().withMessage('Título requerido'),
  body('encrypted_password').notEmpty().withMessage('Contraseña cifrada requerida'),
  body('iv').notEmpty().withMessage('IV requerido'),
], async (req, res) => {
  try {
    const entry = await CredentialController.create(req.user.id, req.body, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    })
    res.status(201).json({ credential: entry })
  } catch (err) {
    console.error('[Credentials POST]', err.message)
    res.status(500).json({ error: err.message || 'Error al crear credencial' })
  }
})

/**
 * PUT /api/credentials/:id
 */
router.put('/:id', [
  param('id').isUUID(),
], async (req, res) => {
  try {
    const entry = await CredentialController.update(req.params.id, req.user.id, req.body, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    })
    res.json({ credential: entry })
  } catch (err) {
    console.error('[Credentials PUT]', err.message)
    res.status(500).json({ error: err.message || 'Error al actualizar credencial' })
  }
})

/**
 * DELETE /api/credentials/:id
 */
router.delete('/:id', [
  param('id').isUUID(),
], async (req, res) => {
  try {
    await CredentialController.remove(req.params.id, req.user.id, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    })
    res.json({ success: true })
  } catch (err) {
    console.error('[Credentials DELETE]', err.message)
    res.status(500).json({ error: err.message || 'Error al eliminar credencial' })
  }
})

/**
 * PATCH /api/credentials/:id/fav — Toggle favorite
 */
router.patch('/:id/fav', [
  param('id').isUUID(),
  body('is_favorite').isBoolean(),
], async (req, res) => {
  try {
    const entry = await CredentialController.update(
      req.params.id, req.user.id,
      { is_favorite: req.body.is_favorite },
      { ip: req.ip, userAgent: req.headers['user-agent'] },
    )
    res.json({ credential: entry })
  } catch (err) {
    res.status(500).json({ error: err.message || 'Error al actualizar favorito' })
  }
})

/**
 * POST /api/credentials/log — Audit event
 */
router.post('/log', async (req, res) => {
  const { credentialId, action } = req.body
  const ALLOWED = ['copy_password', 'copy_username', 'view_password', 'create', 'update', 'delete']
  if (!ALLOWED.includes(action)) return res.status(400).json({ error: 'Acción no válida' })

  const supabase = getSupabaseAdmin()
  try {
    await supabase.from('audit_logs').insert({
      user_id: req.user.id,
      credential_id: credentialId || null,
      action,
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
    })
    res.json({ logged: true })
  } catch (err) {
    res.json({ logged: false })
  }
})

/**
 * GET /api/credentials/health — Security summary
 */
router.get('/health', async (req, res) => {
  try {
    const entries = await CredentialController.getAll(req.user.id)
    const total = entries.length
    const now = new Date()
    const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())

    const old = entries.filter(c => new Date(c.updated_at) < oneYearAgo).length
    const byCategory = entries.reduce((acc, c) => {
      acc[c.category] = (acc[c.category] || 0) + 1
      return acc
    }, {})

    res.json({
      total,
      favorites: entries.filter(c => c.is_favorite).length,
      byCategory,
      security: { old, upToDate: total - old },
      healthScore: total === 0 ? 100 : Math.round(((total - old) / total) * 100),
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
