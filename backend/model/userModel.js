/**
 * User Model — Supabase operations for user_profiles
 * Uses service_role key (bypasses RLS)
 */
const { getSupabaseAdmin } = require('../middleware/security')

const UserModel = {
  /**
   * Create a new user in Supabase Auth (admin API, no email confirmation)
   */
  async createAuthUser(email, password) {
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm so session works immediately
    })
    if (error) throw error
    return data.user
  },

  /**
   * Sign in user and return session tokens
   */
  async signInUser(email, password) {
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  },

  /**
   * Create user profile row
   */
  async createProfile(userId, email, masterSalt) {
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('user_profiles')
      .insert({ id: userId, email, master_salt: masterSalt })
      .select()
      .single()
    if (error) throw error
    return data
  },

  /**
   * Get profile by user ID
   */
  async getProfile(userId) {
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single()
    if (error && error.code !== 'PGRST116') throw error // PGRST116 = not found
    return data
  },

  /**
   * Update profile fields (master password sentinel, salt, etc.)
   */
  async updateProfile(userId, updates) {
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('user_profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single()
    if (error) throw error
    return data
  },

  /**
   * Check if an email already exists in Supabase Auth
   */
  async emailExists(email) {
    const supabase = getSupabaseAdmin()
    // Use admin API to list users by email
    const { data, error } = await supabase.auth.admin.listUsers()
    if (error) throw error
    return data.users.some(u => u.email === email)
  },

  /**
   * Delete user (for cleanup on failed registration)
   */
  async deleteAuthUser(userId) {
    const supabase = getSupabaseAdmin()
    await supabase.auth.admin.deleteUser(userId)
  },
}

module.exports = UserModel
