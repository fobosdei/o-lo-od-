/**
 * TOTP Routes — CRUD for TOTP entries (encrypted)
 * All routes require authentication (Bearer token)
 *
 * GET    /api/totp          — Get all entries
 * POST   /api/totp          — Create entry
 * PUT    /api/totp/:id      — Update entry
 * DELETE /api/totp/:id      — Delete entry
 * PATCH  /api/totp/:id/fav  — Toggle favorite
 */
const router = require('express').Router()
const { body, param } = require('express-validator')
const { requireAuth } = require('../middleware/security')
const TOTPController = require('../control/totpController')

// All TOTP routes require auth
router.use(requireAuth)

/**
 * GET /api/totp
 */
router.get('/', async (req, res) => {
  try {
    const entries = await TOTPController.getEntries(req.user.id)
    res.json({ entries })
  } catch (err) {
    console.error('[TOTP GET]', err.message)
    res.status(500).json({ error: 'Error al obtener entradas' })
  }
})

/**
 * POST /api/totp
 */
router.post('/', [
  body('issuer').notEmpty().trim(),
  body('account').notEmpty().trim(),
  body('encrypted_secret').notEmpty(),
  body('iv_secret').notEmpty(),
], async (req, res) => {
  try {
    const entry = await TOTPController.createEntry(req.user.id, req.body, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    })
    res.status(201).json({ entry })
  } catch (err) {
    console.error('[TOTP POST]', err.message)
    res.status(500).json({ error: 'Error al crear entrada' })
  }
})

/**
 * PUT /api/totp/:id
 */
router.put('/:id', [
  param('id').isUUID(),
], async (req, res) => {
  try {
    const entry = await TOTPController.updateEntry(req.params.id, req.user.id, req.body, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    })
    res.json({ entry })
  } catch (err) {
    console.error('[TOTP PUT]', err.message)
    res.status(500).json({ error: 'Error al actualizar entrada' })
  }
})

/**
 * DELETE /api/totp/:id
 */
router.delete('/:id', [
  param('id').isUUID(),
], async (req, res) => {
  try {
    await TOTPController.deleteEntry(req.params.id, req.user.id, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    })
    res.json({ success: true })
  } catch (err) {
    console.error('[TOTP DELETE]', err.message)
    res.status(500).json({ error: 'Error al eliminar entrada' })
  }
})

/**
 * PATCH /api/totp/:id/fav
 */
router.patch('/:id/fav', [
  param('id').isUUID(),
  body('is_favorite').isBoolean(),
], async (req, res) => {
  try {
    const entry = await TOTPController.updateEntry(
      req.params.id,
      req.user.id,
      { is_favorite: req.body.is_favorite },
      { ip: req.ip, userAgent: req.headers['user-agent'] },
    )
    res.json({ entry })
  } catch (err) {
    console.error('[TOTP FAV]', err.message)
    res.status(500).json({ error: 'Error al actualizar favorito' })
  }
})

module.exports = router
