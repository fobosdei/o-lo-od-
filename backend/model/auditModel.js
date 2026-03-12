/**
 * Audit Model — Supabase operations for audit_logs
 * Uses service_role key (bypasses RLS)
 */
const { getSupabaseAdmin } = require('../middleware/security')

const AuditModel = {
  /**
   * Log a security event
   */
  async log(userId, action, meta = {}) {
    const supabase = getSupabaseAdmin()
    const { error } = await supabase.from('audit_logs').insert({
      user_id: userId,
      credential_id: meta.credentialId || null,
      action,
      ip_address: meta.ip || null,
      user_agent: meta.userAgent || null,
    })
    if (error) console.error('[AuditModel] log error:', error.message)
  },

  /**
   * Get audit logs for a user
   */
  async getForUser(userId, limit = 50) {
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) throw error
    return data || []
  },
}

module.exports = AuditModel
