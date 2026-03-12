/**
 * Auth Controller — Business logic for authentication
 * Orchestrates UserModel + AuditModel
 */
const UserModel = require('../model/userModel')
const AuditModel = require('../model/auditModel')
const crypto = require('crypto')

const AuthController = {
  /**
   * Register a new user
   * 1. Check email doesn't exist
   * 2. Create auth user (admin API, auto-confirmed)
   * 3. Generate salt & create profile
   * 4. Log the event
   */
  async register(email, password, meta = {}) {
    // Check duplicate email
    const exists = await UserModel.emailExists(email)
    if (exists) {
      const err = new Error('El correo electrónico ya está registrado')
      err.status = 409
      throw err
    }

    // Generate master salt for future PBKDF2 derivation
    const masterSalt = crypto.randomBytes(32).toString('base64')

    // Create auth user (auto-confirmed, no email verification needed)
    let authUser
    try {
      authUser = await UserModel.createAuthUser(email, password)
    } catch (err) {
      if (err.message?.includes('already registered')) {
        const e = new Error('El correo electrónico ya está registrado')
        e.status = 409
        throw e
      }
      throw err
    }

    // Create profile
    try {
      await UserModel.createProfile(authUser.id, email, masterSalt)
    } catch (profileErr) {
      // Rollback: delete the auth user if profile creation fails
      console.error('[AuthController] Profile creation failed, rolling back auth user')
      await UserModel.deleteAuthUser(authUser.id)
      throw profileErr
    }

    // Audit log
    await AuditModel.log(authUser.id, 'login', meta)

    console.log(`[Auth] User registered: ${authUser.id}`)
    return { userId: authUser.id, email }
  },

  /**
   * Login user
   * 1. Sign in with Supabase auth
   * 2. Fetch profile (check if master password is set)
   * 3. Return session tokens + profile info
   */
  async login(email, password, meta = {}) {
    const authData = await UserModel.signInUser(email, password)
    const user = authData.user
    const session = authData.session

    // Fetch profile to check master password status
    const profile = await UserModel.getProfile(user.id)

    const isNewUser = !profile?.encrypted_check
    const hasMasterPassword = !!profile?.encrypted_check

    // Audit log
    await AuditModel.log(user.id, 'login', meta)

    console.log(`[Auth] User logged in: ${user.id} (isNew: ${isNewUser})`)
    return {
      user: { id: user.id, email: user.email },
      session: {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_at: session.expires_at,
      },
      profile: {
        master_salt: profile?.master_salt || null,
        isNewUser,
        hasMasterPassword,
      },
    }
  },

  /**
   * Get user profile (for session restore)
   */
  async getProfile(userId) {
    const profile = await UserModel.getProfile(userId)
    if (!profile) {
      const err = new Error('Perfil no encontrado')
      err.status = 404
      throw err
    }
    return {
      id: profile.id,
      email: profile.email,
      master_salt: profile.master_salt,
      isNewUser: !profile.encrypted_check,
      hasMasterPassword: !!profile.encrypted_check,
    }
  },

  /**
   * Save master password sentinel (encrypted check + iv)
   */
  async saveMasterSentinel(userId, encryptedCheck, ivCheck) {
    await UserModel.updateProfile(userId, {
      encrypted_check: encryptedCheck,
      iv_check: ivCheck,
    })
    console.log(`[Auth] Master password set for user: ${userId}`)
    return true
  },

  /**
   * Get sentinel data for master password verification
   */
  async getSentinel(userId) {
    const profile = await UserModel.getProfile(userId)
    if (!profile) {
      const err = new Error('Perfil no encontrado')
      err.status = 404
      throw err
    }
    return {
      master_salt: profile.master_salt,
      encrypted_check: profile.encrypted_check,
      iv_check: profile.iv_check,
    }
  },
}

module.exports = AuthController
