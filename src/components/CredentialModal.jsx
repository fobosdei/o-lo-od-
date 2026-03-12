import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Eye, EyeOff, Globe, User, Lock, FileText, Tag, Zap, Save, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import useVaultStore from '../store/useVaultStore'
import { checkPasswordStrength } from '../utils/crypto'
import PasswordGenerator from './PasswordGenerator'

const CATEGORY_LABELS = {
  general: '🔒 General',
  redes_sociales: '📱 Redes sociales',
  banco: '🏦 Banco',
  trabajo: '💼 Trabajo',
  email: '📧 Email',
  juegos: '🎮 Juegos',
  otro: '📦 Otro',
}

const CATEGORY_COLORS = {
  general: 'text-vault-muted border-vault-muted/30 bg-vault-muted/10',
  redes_sociales: 'text-blue-400 border-blue-400/30 bg-blue-400/10',
  banco: 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10',
  trabajo: 'text-purple-400 border-purple-400/30 bg-purple-400/10',
  email: 'text-orange-400 border-orange-400/30 bg-orange-400/10',
  juegos: 'text-pink-400 border-pink-400/30 bg-pink-400/10',
  otro: 'text-cyan-400 border-cyan-400/30 bg-cyan-400/10',
}

export default function CredentialModal({ mode = 'add', credential = null, onClose }) {
  const { addCredential, updateCredential, deleteCredential, categories } = useVaultStore()

  const [form, setForm] = useState({
    title: credential?.title || '',
    username: credential?.username || '',
    password: credential?.password || '',
    url: credential?.url || '',
    notes: credential?.notes || '',
    category: credential?.category || 'general',
  })
  const [showPass, setShowPass] = useState(false)
  const [showGenerator, setShowGenerator] = useState(false)
  const [loading, setLoading] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const strength = checkPasswordStrength(form.password)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) return toast.error('El título es obligatorio')
    if (!form.password.trim()) return toast.error('La contraseña es obligatoria')

    setLoading(true)
    try {
      if (mode === 'add') {
        await addCredential(form)
        toast.success('Credencial guardada', { icon: '🔐' })
      } else {
        await updateCredential(credential.id, form)
        toast.success('Credencial actualizada', { icon: '✅' })
      }
      onClose()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true)
      setTimeout(() => setConfirmDelete(false), 3000)
      return
    }
    setLoading(true)
    try {
      await deleteCredential(credential.id)
      toast.success('Credencial eliminada')
      onClose()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        onClick={e => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ scale: 0.92, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.92, y: 20 }}
          className="glass rounded-2xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col"
          style={{ boxShadow: '0 0 50px rgba(0,0,0,0.6)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-vault-border">
            <div className="flex items-center gap-2">
              <Lock size={16} className="text-vault-accent" />
              <h2 className="font-mono font-bold text-vault-text text-sm uppercase tracking-widest">
                {mode === 'add' ? 'Nueva credencial' : 'Editar credencial'}
              </h2>
            </div>
            <button onClick={onClose} className="text-vault-muted hover:text-vault-text transition-colors">
              <X size={18} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* Title */}
            <div>
              <label className="text-xs font-mono text-vault-muted uppercase tracking-widest block mb-1">Título *</label>
              <input
                type="text"
                placeholder="ej. GitHub, Gmail, Netflix..."
                value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                className="vault-input"
                autoFocus
              />
            </div>

            {/* Category */}
            <div>
              <label className="text-xs font-mono text-vault-muted uppercase tracking-widest block mb-1">Categoría</label>
              <div className="flex flex-wrap gap-2">
                {categories.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setForm(p => ({ ...p, category: cat }))}
                    className={`px-3 py-1 rounded-full text-xs font-mono border transition-all ${
                      form.category === cat
                        ? CATEGORY_COLORS[cat] + ' font-semibold'
                        : 'text-vault-muted border-vault-border hover:border-vault-muted/50'
                    }`}
                  >
                    {CATEGORY_LABELS[cat]}
                  </button>
                ))}
              </div>
            </div>

            {/* Username */}
            <div>
              <label className="text-xs font-mono text-vault-muted uppercase tracking-widest block mb-1">Usuario / Email</label>
              <div className="relative">
                <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-vault-muted" />
                <input
                  type="text"
                  placeholder="usuario@email.com"
                  value={form.username}
                  onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
                  className="vault-input pl-9"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-mono text-vault-muted uppercase tracking-widest">Contraseña *</label>
                <button
                  type="button"
                  onClick={() => setShowGenerator(true)}
                  className="flex items-center gap-1 text-xs font-mono text-vault-accent hover:text-vault-accent/80 transition-colors"
                >
                  <Zap size={11} /> Generar
                </button>
              </div>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-vault-muted" />
                <input
                  type={showPass ? 'text' : 'password'}
                  placeholder="Contraseña"
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  className="vault-input pl-9 pr-10 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-vault-muted hover:text-vault-accent"
                >
                  {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              {form.password && (
                <div className="mt-2">
                  <div className="h-1 bg-vault-border rounded-full overflow-hidden">
                    <motion.div
                      animate={{ width: `${strength.score}%` }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: strength.color }}
                    />
                  </div>
                  <p className="text-xs font-mono mt-0.5" style={{ color: strength.color }}>{strength.label}</p>
                </div>
              )}
            </div>

            {/* URL */}
            <div>
              <label className="text-xs font-mono text-vault-muted uppercase tracking-widest block mb-1">URL / Sitio web</label>
              <div className="relative">
                <Globe size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-vault-muted" />
                <input
                  type="text"
                  placeholder="https://ejemplo.com"
                  value={form.url}
                  onChange={e => setForm(p => ({ ...p, url: e.target.value }))}
                  className="vault-input pl-9"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs font-mono text-vault-muted uppercase tracking-widest block mb-1">Notas</label>
              <div className="relative">
                <FileText size={14} className="absolute left-3 top-3 text-vault-muted" />
                <textarea
                  placeholder="Notas adicionales (cifradas)..."
                  value={form.notes}
                  onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  rows={3}
                  className="vault-input pl-9 resize-none"
                />
              </div>
            </div>
          </form>

          {/* Footer */}
          <div className="flex items-center gap-2 p-5 border-t border-vault-border">
            {mode === 'edit' && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-mono transition-all ${
                  confirmDelete
                    ? 'bg-vault-danger/20 border border-vault-danger text-vault-danger'
                    : 'bg-vault-surface border border-vault-border text-vault-muted hover:border-vault-danger hover:text-vault-danger'
                }`}
              >
                <Trash2 size={14} />
                {confirmDelete ? '¿Confirmar?' : 'Eliminar'}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-lg text-sm font-mono bg-vault-surface border border-vault-border text-vault-muted hover:text-vault-text transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-mono font-semibold
                bg-vault-accent/10 border border-vault-accent/40 text-vault-accent
                hover:bg-vault-accent/20 hover:border-vault-accent hover:shadow-neon
                disabled:opacity-40 transition-all duration-300"
            >
              <Save size={14} />
              {loading ? 'Guardando...' : mode === 'add' ? 'Guardar' : 'Actualizar'}
            </button>
          </div>
        </motion.div>
      </motion.div>

      {/* Password Generator */}
      <AnimatePresence>
        {showGenerator && (
          <PasswordGenerator
            onUse={pwd => setForm(p => ({ ...p, password: pwd }))}
            onClose={() => setShowGenerator(false)}
          />
        )}
      </AnimatePresence>
    </>
  )
}
