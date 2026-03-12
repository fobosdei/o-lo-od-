/**
 * TOTP Model — Supabase operations for totp_entries
 * Uses service_role key (bypasses RLS)
 */
const { getSupabaseAdmin } = require('../middleware/security')

const TOTPModel = {
  /**
   * Get all TOTP entries for a user
   */
  async getAll(userId) {
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('totp_entries')
      .select('*')
      .eq('user_id', userId)
      .order('is_favorite', { ascending: false })
      .order('issuer', { ascending: true })
    if (error) throw error
    return data || []
  },

  /**
   * Create a new TOTP entry
   */
  async create(entry) {
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('totp_entries')
      .insert(entry)
      .select()
      .single()
    if (error) throw error
    return data
  },

  /**
   * Update a TOTP entry (must belong to user)
   */
  async update(entryId, userId, updates) {
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('totp_entries')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', entryId)
      .eq('user_id', userId)
      .select()
      .single()
    if (error) throw error
    return data
  },

  /**
   * Delete a TOTP entry (must belong to user)
   */
  async remove(entryId, userId) {
    const supabase = getSupabaseAdmin()
    const { error } = await supabase
      .from('totp_entries')
      .delete()
      .eq('id', entryId)
      .eq('user_id', userId)
    if (error) throw error
    return true
  },
}

module.exports = TOTPModel
