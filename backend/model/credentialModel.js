/**
 * Credential Model — Supabase operations for credentials table
 * Uses service_role key (bypasses RLS)
 * All actual data is encrypted — backend only stores ciphertext
 */
const { getSupabaseAdmin } = require('../middleware/security')

const CredentialModel = {
  async getAll(userId) {
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('credentials')
      .select('*')
      .eq('user_id', userId)
      .order('is_favorite', { ascending: false })
      .order('title', { ascending: true })
    if (error) throw error
    return data || []
  },

  async create(entry) {
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('credentials')
      .insert(entry)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async update(id, userId, updates) {
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('credentials')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async remove(id, userId) {
    const supabase = getSupabaseAdmin()
    const { error } = await supabase
      .from('credentials')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
    if (error) throw error
    return true
  },
}

module.exports = CredentialModel
