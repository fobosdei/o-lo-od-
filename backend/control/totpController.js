/**
 * TOTP Controller — Business logic for TOTP entries
 * All crypto (encrypt/decrypt) happens on the frontend.
 * Backend just stores the encrypted blobs.
 */
const TOTPModel = require('../model/totpModel')
const AuditModel = require('../model/auditModel')

const TOTPController = {
  /**
   * Get all entries for a user
   */
  async getEntries(userId) {
    return await TOTPModel.getAll(userId)
  },

  /**
   * Create a new TOTP entry
   */
  async createEntry(userId, entryData, meta = {}) {
    const entry = {
      user_id: userId,
      issuer: entryData.issuer.trim(),
      account: entryData.account.trim(),
      encrypted_secret: entryData.encrypted_secret,
      iv_secret: entryData.iv_secret,
      digits: entryData.digits || 6,
      period: entryData.period || 30,
      category: entryData.category || 'other',
      icon: entryData.icon || null,
    }

    const created = await TOTPModel.create(entry)
    await AuditModel.log(userId, 'create', { ...meta, credentialId: created.id })
    return created
  },

  /**
   * Update a TOTP entry
   */
  async updateEntry(entryId, userId, updates, meta = {}) {
    const dbUpdate = {}
    if (updates.issuer !== undefined)          dbUpdate.issuer = updates.issuer.trim()
    if (updates.account !== undefined)         dbUpdate.account = updates.account.trim()
    if (updates.encrypted_secret !== undefined) dbUpdate.encrypted_secret = updates.encrypted_secret
    if (updates.iv_secret !== undefined)       dbUpdate.iv_secret = updates.iv_secret
    if (updates.digits !== undefined)          dbUpdate.digits = updates.digits
    if (updates.period !== undefined)          dbUpdate.period = updates.period
    if (updates.category !== undefined)        dbUpdate.category = updates.category
    if (updates.icon !== undefined)            dbUpdate.icon = updates.icon
    if (updates.is_favorite !== undefined)     dbUpdate.is_favorite = updates.is_favorite

    const updated = await TOTPModel.update(entryId, userId, dbUpdate)
    await AuditModel.log(userId, 'update', { ...meta, credentialId: entryId })
    return updated
  },

  /**
   * Delete a TOTP entry
   */
  async deleteEntry(entryId, userId, meta = {}) {
    await TOTPModel.remove(entryId, userId)
    await AuditModel.log(userId, 'delete', { ...meta, credentialId: entryId })
    return true
  },
}

module.exports = TOTPController
