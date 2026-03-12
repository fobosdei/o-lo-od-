/**
 * Vault — Global State Management (Zustand)
 *
 * Auth flow (via Backend API):
 *   1. AuthScreen → signUp / signIn → backend creates user + profile
 *   2. LockScreen → setupMasterPassword() or unlockVault()
 *   3. Dashboard (vault unlocked — manage credentials)
 *
 * All auth via backend (service_role). Crypto on client. Credentials via backend API.
 */
import { create } from 'zustand'
import { deriveKey, encrypt, decrypt, generateSalt, saltFromBase64 } from '../utils/crypto'

const API = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? 'http://127.0.0.1:4000' : 'http://localhost:4000')
const INACTIVITY_TIMEOUT = 5 * 60 * 1000
const SENTINEL = 'VAULT_OK_v1'

/** Helper: call backend API with auto Bearer token */
async function api(path, options = {}) {
  const token = localStorage.getItem('vault_token')
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`)
    err.status = res.status
    throw err
  }
  return data
}

const useVaultStore = create((set, get) => ({
  // ─── Auth ─────────────────────────────────────────────────────
  user: null,
  token: null,
  isLoading: true,
  isNewUser: false,

  // ─── Vault ────────────────────────────────────────────────────
  isLocked: true,
  cryptoKey: null,

  // ─── Data ─────────────────────────────────────────────────────
  credentials: [],
  searchQuery: '',
  selectedCategory: 'all',

  // ─── UI ───────────────────────────────────────────────────────
  showAddModal: false,
  showEditModal: false,
  editingEntry: null,

  // ─── Inactivity ────────────────────────────────────────────────
  _inactivityTimer: null,

  resetInactivityTimer() {
    const { _inactivityTimer } = get()
    if (_inactivityTimer) clearTimeout(_inactivityTimer)
    const timer = setTimeout(() => get().lockVault('inactividad'), INACTIVITY_TIMEOUT)
    set({ _inactivityTimer: timer })
  },

  clearInactivityTimer() {
    const { _inactivityTimer } = get()
    if (_inactivityTimer) clearTimeout(_inactivityTimer)
    set({ _inactivityTimer: null })
  },

  // ─── Auth Methods ──────────────────────────────────────────────

  async initAuth() {
    const token = localStorage.getItem('vault_token')
    if (!token) {
      set({ isLoading: false })
      return
    }
    try {
      const profile = await api('/api/auth/me')
      set({
        user: { id: profile.id, email: profile.email },
        token,
        isNewUser: profile.isNewUser,
        isLoading: false,
      })
    } catch {
      localStorage.removeItem('vault_token')
      localStorage.removeItem('vault_refresh_token')
      set({ user: null, token: null, isLoading: false })
    }
  },

  async signUp(email, password) {
    await api('/api/auth/register', { method: 'POST', body: { email, password } })
    const loginResult = await api('/api/auth/login', { method: 'POST', body: { email, password } })
    localStorage.setItem('vault_token', loginResult.session.access_token)
    localStorage.setItem('vault_refresh_token', loginResult.session.refresh_token)
    set({ user: loginResult.user, token: loginResult.session.access_token, isNewUser: true })
    return loginResult
  },

  async signIn(email, password) {
    const result = await api('/api/auth/login', { method: 'POST', body: { email, password } })
    localStorage.setItem('vault_token', result.session.access_token)
    localStorage.setItem('vault_refresh_token', result.session.refresh_token)
    set({
      user: result.user,
      token: result.session.access_token,
      isNewUser: result.profile.isNewUser,
      isLocked: true,
    })
    return result
  },

  async signOut() {
    try { await api('/api/auth/logout', { method: 'POST' }) } catch {}
    get().lockVault('cierre_sesión')
    localStorage.removeItem('vault_token')
    localStorage.removeItem('vault_refresh_token')
    set({ user: null, token: null, credentials: [], isNewUser: false })
  },

  // ─── Vault Lock/Unlock ──────────────────────────────────────────

  lockVault(reason = 'manual') {
    console.log('[Vault] Locked:', reason)
    get().clearInactivityTimer()
    set({ isLocked: true, cryptoKey: null, credentials: [], editingEntry: null })
  },

  async setupMasterPassword(masterPassword) {
    const { user } = get()
    if (!user) throw new Error('No hay sesión activa')

    const sentinelData = await api('/api/auth/sentinel')
    if (!sentinelData?.master_salt) throw new Error('Salt no encontrado. Registra tu cuenta nuevamente.')

    const salt = saltFromBase64(sentinelData.master_salt)
    const key = await deriveKey(masterPassword, salt)
    const { ciphertext, iv } = await encrypt(SENTINEL, key)

    await api('/api/auth/sentinel', {
      method: 'POST',
      body: { encrypted_check: ciphertext, iv_check: iv },
    })

    set({ cryptoKey: key, isLocked: false, isNewUser: false })
    get().resetInactivityTimer()
    await get().fetchCredentials()
  },

  async unlockVault(masterPassword) {
    const { user } = get()
    if (!user) throw new Error('No hay sesión activa')

    const sentinel = await api('/api/auth/sentinel')
    if (!sentinel?.master_salt) throw new Error('Perfil no encontrado')

    const salt = saltFromBase64(sentinel.master_salt)
    const key = await deriveKey(masterPassword, salt)

    if (sentinel.encrypted_check) {
      try {
        const decrypted = await decrypt(sentinel.encrypted_check, sentinel.iv_check, key)
        if (decrypted !== SENTINEL) throw new Error('fail')
      } catch {
        throw new Error('Contraseña maestra incorrecta')
      }
    }

    set({ cryptoKey: key, isLocked: false })
    get().resetInactivityTimer()
    await get().fetchCredentials()
  },

  // ─── Credentials CRUD ──────────────────────────────────────────

  async fetchCredentials() {
    const { user, cryptoKey } = get()
    if (!user || !cryptoKey) return

    const { credentials: raw } = await api('/api/credentials')

    const decrypted = await Promise.all(
      (raw || []).map(async (entry) => {
        try {
          const password = await decrypt(entry.encrypted_password, entry.iv, cryptoKey)
          const username = entry.encrypted_username
            ? await decrypt(entry.encrypted_username, entry.iv_username, cryptoKey)
            : ''
          const url = entry.encrypted_url
            ? await decrypt(entry.encrypted_url, entry.iv_url, cryptoKey)
            : ''
          const notes = entry.encrypted_notes
            ? await decrypt(entry.encrypted_notes, entry.iv_notes, cryptoKey)
            : ''
          return {
            id: entry.id,
            title: entry.title,
            username,
            password,
            url,
            notes,
            category: entry.category || 'general',
            is_favorite: entry.is_favorite || false,
            created_at: entry.created_at,
            updated_at: entry.updated_at,
          }
        } catch {
          return {
            id: entry.id, title: entry.title,
            username: '', password: '', url: '', notes: '',
            category: entry.category || 'general',
            is_favorite: false, created_at: entry.created_at,
            updated_at: entry.updated_at, _error: true,
          }
        }
      })
    )

    set({ credentials: decrypted })
    get().resetInactivityTimer()
  },

  async addCredential({ title, username, password, url, notes, category = 'general' }) {
    const { cryptoKey } = get()
    if (!cryptoKey) throw new Error('Vault bloqueado')

    // Encrypt each field separately
    const { ciphertext: enc_password, iv } = await encrypt(password, cryptoKey)

    const body = {
      title: title.trim(),
      encrypted_password: enc_password,
      iv,
      category,
    }

    if (username?.trim()) {
      const { ciphertext: enc_username, iv: iv_username } = await encrypt(username.trim(), cryptoKey)
      body.encrypted_username = enc_username
      body.iv_username = iv_username
    }
    if (url?.trim()) {
      const { ciphertext: enc_url, iv: iv_url } = await encrypt(url.trim(), cryptoKey)
      body.encrypted_url = enc_url
      body.iv_url = iv_url
    }
    if (notes?.trim()) {
      const { ciphertext: enc_notes, iv: iv_notes } = await encrypt(notes.trim(), cryptoKey)
      body.encrypted_notes = enc_notes
      body.iv_notes = iv_notes
    }

    const { credential } = await api('/api/credentials', { method: 'POST', body })

    const newEntry = {
      id: credential.id,
      title: title.trim(),
      username: username?.trim() || '',
      password,
      url: url?.trim() || '',
      notes: notes?.trim() || '',
      category,
      is_favorite: false,
      created_at: credential.created_at,
      updated_at: credential.updated_at,
    }

    set(state => ({ credentials: [newEntry, ...state.credentials] }))
    get().resetInactivityTimer()
    return credential
  },

  async updateCredential(id, updates) {
    const { cryptoKey } = get()
    if (!cryptoKey) throw new Error('Vault bloqueado')

    const body = {}

    if (updates.title !== undefined) body.title = updates.title.trim()
    if (updates.category !== undefined) body.category = updates.category
    if (updates.is_favorite !== undefined) body.is_favorite = updates.is_favorite

    if (updates.password !== undefined) {
      const { ciphertext, iv } = await encrypt(updates.password, cryptoKey)
      body.encrypted_password = ciphertext
      body.iv = iv
    }
    if (updates.username !== undefined) {
      const { ciphertext, iv } = await encrypt(updates.username, cryptoKey)
      body.encrypted_username = ciphertext
      body.iv_username = iv
    }
    if (updates.url !== undefined) {
      const { ciphertext, iv } = await encrypt(updates.url, cryptoKey)
      body.encrypted_url = ciphertext
      body.iv_url = iv
    }
    if (updates.notes !== undefined) {
      const { ciphertext, iv } = await encrypt(updates.notes, cryptoKey)
      body.encrypted_notes = ciphertext
      body.iv_notes = iv
    }

    await api(`/api/credentials/${id}`, { method: 'PUT', body })

    set(state => ({
      credentials: state.credentials.map(e =>
        e.id === id ? { ...e, ...updates } : e
      )
    }))
    get().resetInactivityTimer()
  },

  async deleteCredential(id) {
    await api(`/api/credentials/${id}`, { method: 'DELETE' })
    set(state => ({ credentials: state.credentials.filter(e => e.id !== id) }))
    get().resetInactivityTimer()
  },

  async toggleFavorite(id) {
    const entry = get().credentials.find(e => e.id === id)
    if (!entry) return
    await get().updateCredential(id, { is_favorite: !entry.is_favorite })
  },

  getFilteredCredentials() {
    const { credentials, searchQuery, selectedCategory } = get()
    return credentials.filter(e => {
      const q = searchQuery.toLowerCase()
      const matchesSearch = !q ||
        e.title.toLowerCase().includes(q) ||
        e.username.toLowerCase().includes(q) ||
        (e.url && e.url.toLowerCase().includes(q))
      const matchesCategory = selectedCategory === 'all' ||
        (selectedCategory === 'favorites' ? e.is_favorite : e.category === selectedCategory)
      return matchesSearch && matchesCategory
    })
  },

  // ─── UI Setters ────────────────────────────────────────────────
  setSearchQuery:      (q) => set({ searchQuery: q }),
  setSelectedCategory: (c) => set({ selectedCategory: c }),
  setShowAddModal:     (v) => set({ showAddModal: v }),
  setShowEditModal:    (v) => set({ showEditModal: v }),
  setEditingEntry:     (e) => set({ editingEntry: e }),
}))

export default useVaultStore
