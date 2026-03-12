/**
 * Credential Controller — business logic for password vault entries
 */
const CredentialModel = require('../model/credentialModel')
const AuditModel = require('../model/auditModel')

const CredentialController = {
  async getAll(userId) {
    return await CredentialModel.getAll(userId)
  },

  async create(userId, data, meta = {}) {
    const entry = {
      user_id: userId,
      title: data.title.trim(),
      category: data.category || 'general',
      // Encrypted blobs from frontend
      encrypted_password: data.encrypted_password,
      iv: data.iv,
      encrypted_username: data.encrypted_username || null,
      iv_username: data.iv_username || null,
      encrypted_url: data.encrypted_url || null,
      iv_url: data.iv_url || null,
      encrypted_notes: data.encrypted_notes || null,
      iv_notes: data.iv_notes || null,
    }
    const created = await CredentialModel.create(entry)
    await AuditModel.log(userId, 'create', { credentialId: created.id, ...meta })
    return created
  },

  async update(id, userId, data, meta = {}) {
    const allowed = [
      'title', 'category', 'is_favorite',
      'encrypted_password', 'iv',
      'encrypted_username', 'iv_username',
      'encrypted_url', 'iv_url',
      'encrypted_notes', 'iv_notes',
    ]
    const updates = {}
    allowed.forEach(k => { if (data[k] !== undefined) updates[k] = data[k] })
    if (updates.title) updates.title = updates.title.trim()
    const updated = await CredentialModel.update(id, userId, updates)
    await AuditModel.log(userId, 'update', { credentialId: id, ...meta })
    return updated
  },

  async remove(id, userId, meta = {}) {
    await CredentialModel.remove(id, userId)
    await AuditModel.log(userId, 'delete', { credentialId: id, ...meta })
    return true
  },
}

module.exports = CredentialController
