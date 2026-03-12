import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Eye, EyeOff, Globe, Monitor, Github, Users,
  Landmark, Briefcase, Mail, Box, Layers, RefreshCw,
  Lock, User, Link, FileText,
} from 'lucide-react'
import toast from 'react-hot-toast'
import useVaultStore from '../store/useVaultStore'

const CATEGORIES = [
  { value: 'general',        label: 'General',    Icon: Layers    },
  { value: 'redes_sociales', label: 'Social',     Icon: Users     },
  { value: 'banco',          label: 'Banco',      Icon: Landmark  },
  { value: 'trabajo',        label: 'Trabajo',    Icon: Briefcase },
  { value: 'email',          label: 'Email',      Icon: Mail      },
  { value: 'juegos',         label: 'Juegos',     Icon: Monitor   },
  { value: 'otro',           label: 'Otro',       Icon: Box       },
]

/** Generate a secure random password */
function generatePassword(length = 16) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_=+'
  const arr = new Uint8Array(length)
  crypto.getRandomValues(arr)
  return Array.from(arr).map(b => chars[b % chars.length]).join('')
}

/** Password strength evaluator */
function checkStrength(pw) {
  if (!pw) return { score: 0, label: '', color: 'transparent' }
  let score = 0
  if (pw.length >= 8)  score += 20
  if (pw.length >= 14) score += 20
  if (/[A-Z]/.test(pw)) score += 15
  if (/[0-9]/.test(pw)) score += 15
  if (/[^a-zA-Z0-9]/.test(pw)) score += 30
  if (score < 40)  return { score, label: 'Débil', color: '#f87171' }
  if (score < 70)  return { score, label: 'Media', color: '#fb923c' }
  if (score < 90)  return { score, label: 'Fuerte', color: '#facc15' }
  return { score, label: 'Muy fuerte', color: '#4ade80' }
}

// Field component outside to avoid focus-loss bug
function Field({ label, icon: Icon, type = 'text', placeholder, value, onChange, rightSlot }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>{label}</label>
      <div style={{ position: 'relative' }}>
        <Icon size={14} style={{
          position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)',
          color: 'var(--text-muted)', pointerEvents: 'none',
        }} />
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          className="vault-input"
          style={{ paddingLeft: 32, paddingRight: rightSlot ? 36 : 12, fontSize: 13 }}
        />
        {rightSlot && (
          <div style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)' }}>
            {rightSlot}
          </div>
        )}
      </div>
    </div>
  )
}

export default function AddCredentialModal({ editEntry = null, onClose }) {
  const isEdit = !!editEntry
  const { addCredential, updateCredential, setShowAddModal, setShowEditModal } = useVaultStore()

  const [title, setTitle]       = useState(editEntry?.title || '')
  const [username, setUsername] = useState(editEntry?.username || '')
  const [password, setPassword] = useState(editEntry?.password || '')
  const [url, setUrl]           = useState(editEntry?.url || '')
  const [notes, setNotes]       = useState(editEntry?.notes || '')
  const [category, setCategory] = useState(editEntry?.category || 'general')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)

  const strength = checkStrength(password)

  const handleGenerate = () => {
    const pw = generatePassword()
    setPassword(pw)
    setShowPass(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim()) { toast.error('El nombre del servicio es requerido'); return }
    if (!password.trim()) { toast.error('La contraseña es requerida'); return }

    setLoading(true)
    try {
      if (isEdit) {
        await updateCredential(editEntry.id, { title, username, password, url, notes, category })
        toast.success('Credencial actualizada')
        setShowEditModal(false)
      } else {
        await addCredential({ title, username, password, url, notes, category })
        toast.success('Credencial guardada')
        setShowAddModal(false)
      }
      onClose?.()
    } catch (err) {
      toast.error(err.message || 'Error al guardar')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (isEdit) setShowEditModal(false)
    else setShowAddModal(false)
    onClose?.()
  }

  return (
    <AnimatePresence>
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '16px',
        }}
        onClick={e => { if (e.target === e.currentTarget) handleClose() }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.2 }}
          className="card"
          style={{ width: '100%', maxWidth: 460, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
        >
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '18px 20px 0',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: 'var(--accent-dim)',
                border: '1px solid rgba(99,102,241,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Lock size={15} style={{ color: 'var(--accent-light)' }} />
              </div>
              <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>
                {isEdit ? 'Editar credencial' : 'Nueva credencial'}
              </h3>
            </div>
            <button
              onClick={handleClose}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text-muted)', padding: 4, borderRadius: 6,
                display: 'flex', alignItems: 'center',
              }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Scrollable form */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 20px' }}>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Service name */}
              <Field
                label="Servicio / Sitio web *"
                icon={Globe}
                placeholder="Google, Netflix, Instagram..."
                value={title}
                onChange={e => setTitle(e.target.value)}
              />

              {/* Username */}
              <Field
                label="Usuario / Correo"
                icon={User}
                placeholder="tu@email.com o nombre de usuario"
                value={username}
                onChange={e => setUsername(e.target.value)}
              />

              {/* Password */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>
                  Contraseña *
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={14} style={{
                    position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)',
                    color: 'var(--text-muted)', pointerEvents: 'none',
                  }} />
                  <input
                    type={showPass ? 'text' : 'password'}
                    placeholder="Tu contraseña"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="vault-input"
                    style={{ paddingLeft: 32, paddingRight: 68, fontSize: 13, fontFamily: password && !showPass ? 'monospace' : 'inherit' }}
                  />
                  <div style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: 2 }}>
                    <button
                      type="button"
                      onClick={handleGenerate}
                      title="Generar contraseña segura"
                      style={{
                        background: 'var(--accent-dim)', border: '1px solid rgba(99,102,241,0.2)',
                        borderRadius: 5, cursor: 'pointer', padding: '3px 6px',
                        color: 'var(--accent-light)', display: 'flex', alignItems: 'center',
                      }}
                    >
                      <RefreshCw size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowPass(p => !p)}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'var(--text-muted)', display: 'flex', alignItems: 'center', padding: 4,
                      }}
                    >
                      {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                {/* Strength bar */}
                {password && (
                  <div>
                    <div style={{ height: 3, borderRadius: 99, background: 'var(--bg)', overflow: 'hidden' }}>
                      <motion.div
                        animate={{ width: `${strength.score}%` }}
                        transition={{ duration: 0.3 }}
                        style={{ height: '100%', borderRadius: 99, background: strength.color }}
                      />
                    </div>
                    <p style={{ fontSize: 11, color: strength.color, marginTop: 3 }}>{strength.label}</p>
                  </div>
                )}
              </div>

              {/* URL */}
              <Field
                label="URL del sitio"
                icon={Link}
                placeholder="https://google.com (opcional)"
                value={url}
                onChange={e => setUrl(e.target.value)}
              />

              {/* Category */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>Categoría</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => setCategory(cat.value)}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                        justifyContent: 'center', gap: 4,
                        padding: '8px 4px',
                        borderRadius: 8, border: '1px solid',
                        cursor: 'pointer', fontSize: 10, fontWeight: 500,
                        transition: 'all 0.15s',
                        background: category === cat.value ? 'var(--accent-dim)' : 'var(--bg-elevated)',
                        borderColor: category === cat.value ? 'rgba(99,102,241,0.4)' : 'var(--border)',
                        color: category === cat.value ? 'var(--accent-light)' : 'var(--text-secondary)',
                      }}
                    >
                      <cat.Icon size={14} />
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>
                  Notas (opcional)
                </label>
                <div style={{ position: 'relative' }}>
                  <FileText size={14} style={{
                    position: 'absolute', left: 11, top: 11,
                    color: 'var(--text-muted)', pointerEvents: 'none',
                  }} />
                  <textarea
                    placeholder="PIN, preguntas de seguridad, etc."
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    rows={2}
                    className="vault-input"
                    style={{ paddingLeft: 32, fontSize: 13, resize: 'vertical', minHeight: 60 }}
                  />
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="btn-primary"
                style={{ width: '100%', marginTop: 4 }}
              >
                {loading ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                      style={{
                        display: 'inline-block', width: 14, height: 14,
                        border: '2px solid rgba(255,255,255,0.3)',
                        borderTopColor: '#fff', borderRadius: '50%',
                      }}
                    />
                    Guardando...
                  </span>
                ) : isEdit ? 'Guardar cambios' : 'Guardar credencial'}
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
