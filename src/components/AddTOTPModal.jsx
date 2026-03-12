import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Key, Scan, AlertCircle, Globe, Monitor, Github, Users, Landmark, Briefcase, Mail, Box } from 'lucide-react'
import toast from 'react-hot-toast'
import useVaultStore from '../store/useVaultStore'
import { validateSecret, parseOtpAuthUrl } from '../utils/totp'

const CATEGORIES = [
  { value: 'google',    label: 'Google',    Icon: Globe     },
  { value: 'microsoft', label: 'Microsoft', Icon: Monitor   },
  { value: 'github',    label: 'GitHub',    Icon: Github    },
  { value: 'social',    label: 'Social',    Icon: Users     },
  { value: 'bank',      label: 'Banco',     Icon: Landmark  },
  { value: 'work',      label: 'Trabajo',   Icon: Briefcase },
  { value: 'email',     label: 'Email',     Icon: Mail      },
  { value: 'other',     label: 'Otro',      Icon: Box       },
]

export default function AddTOTPModal({ onClose, editEntry = null }) {
  const { addTOTPEntry, updateTOTPEntry } = useVaultStore()
  const isEdit = !!editEntry
  const [tab, setTab] = useState('manual')
  const [otpUrl, setOtpUrl] = useState('')

  const [form, setForm] = useState({
    issuer:   editEntry?.issuer   || '',
    account:  editEntry?.account  || '',
    secret:   editEntry?.secret   || '',
    digits:   editEntry?.digits   || 6,
    period:   editEntry?.period   || 30,
    category: editEntry?.category || 'other',
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  const setF = (field) => (e) => setForm(p => ({ ...p, [field]: e.target.value }))
  const setV = (field, val) => setForm(p => ({ ...p, [field]: val }))

  const handleParseUrl = () => {
    const parsed = parseOtpAuthUrl(otpUrl.trim())
    if (!parsed) { toast.error('URL otpauth:// inválida'); return }
    setForm(p => ({
      ...p,
      issuer:  parsed.issuer  || p.issuer,
      account: parsed.account || p.account,
      secret:  parsed.secret  || p.secret,
      digits:  parsed.digits  || p.digits,
      period:  parsed.period  || p.period,
    }))
    setTab('manual')
    toast.success('Datos importados')
  }

  const validate = () => {
    const e = {}
    if (!form.issuer.trim())        e.issuer  = 'Nombre del servicio requerido'
    if (!form.account.trim())       e.account = 'Cuenta requerida'
    if (!validateSecret(form.secret)) e.secret = 'Secreto base32 inválido'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      if (isEdit) {
        await updateTOTPEntry(editEntry.id, form)
        toast.success('Guardado')
      } else {
        await addTOTPEntry(form)
        toast.success(`${form.issuer} agregado`)
      }
      onClose()
    } catch (err) {
      toast.error(err.message || 'Error al guardar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        style={{
          position: 'fixed', inset: 0, zIndex: 50,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)',
          padding: 16,
        }}
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ type: 'spring', damping: 24, stiffness: 320 }}
          className="card"
          style={{ width: '100%', maxWidth: 440, overflow: 'hidden' }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid var(--border)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Key size={16} style={{ color: 'var(--accent-light)' }} />
              <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>
                {isEdit ? 'Editar autenticador' : 'Nuevo autenticador'}
              </span>
            </div>
            <button onClick={onClose} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', display: 'flex', alignItems: 'center',
              borderRadius: 6, padding: 4, transition: 'color 0.1s',
            }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
            >
              <X size={16} />
            </button>
          </div>

          <div style={{ padding: '18px 20px', maxHeight: '72vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Tab selector */}
            {!isEdit && (
              <div style={{
                display: 'flex', background: 'var(--bg)',
                borderRadius: 8, padding: 3,
              }}>
                {[
                  { key: 'manual', icon: <Key size={12} />, label: 'Manual' },
                  { key: 'url',    icon: <Scan size={12} />, label: 'URL / QR' },
                ].map(t => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setTab(t.key)}
                    style={{
                      flex: 1, padding: '7px 12px',
                      borderRadius: 6, fontSize: 13, fontWeight: 500,
                      cursor: 'pointer', border: 'none',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      background: tab === t.key ? 'var(--bg-card)' : 'transparent',
                      color: tab === t.key ? 'var(--text)' : 'var(--text-muted)',
                      boxShadow: tab === t.key ? '0 1px 4px rgba(0,0,0,0.3)' : 'none',
                      transition: 'all 0.15s',
                    }}
                  >
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>
            )}

            {/* URL tab */}
            {tab === 'url' && !isEdit && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <FieldLabel>URL otpauth://</FieldLabel>
                <textarea
                  rows={3}
                  placeholder="otpauth://totp/Issuer:email?secret=XXXXX&issuer=Issuer"
                  value={otpUrl}
                  onChange={e => setOtpUrl(e.target.value)}
                  className="vault-input"
                  style={{ resize: 'none', fontFamily: 'JetBrains Mono, monospace', fontSize: 12 }}
                />
                <button
                  type="button"
                  onClick={handleParseUrl}
                  className="btn-ghost"
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  Importar datos desde URL
                </button>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <FieldLabel>Servicio</FieldLabel>
                  <input
                    type="text" placeholder="Google, GitHub..."
                    value={form.issuer} onChange={setF('issuer')}
                    className={`vault-input ${errors.issuer ? 'error' : ''}`}
                  />
                  <FieldError error={errors.issuer} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <FieldLabel>Cuenta</FieldLabel>
                  <input
                    type="text" placeholder="tu@email.com"
                    value={form.account} onChange={setF('account')}
                    className={`vault-input ${errors.account ? 'error' : ''}`}
                  />
                  <FieldError error={errors.account} />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <FieldLabel>Secreto (Base32)</FieldLabel>
                <input
                  type="text" placeholder="JBSWY3DPEHPK3PXP"
                  value={form.secret} onChange={setF('secret')}
                  className={`vault-input ${errors.secret ? 'error' : ''}`}
                  style={{ fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.08em' }}
                />
                <FieldError error={errors.secret} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <FieldLabel>Categoría</FieldLabel>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => setV('category', cat.value)}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center',
                        gap: 3, padding: '8px 4px', borderRadius: 8, cursor: 'pointer',
                        border: form.category === cat.value
                          ? '1px solid rgba(99,102,241,0.4)'
                          : '1px solid var(--border)',
                        background: form.category === cat.value
                          ? 'var(--accent-dim)'
                          : 'var(--bg-elevated)',
                        color: form.category === cat.value
                          ? 'var(--accent-light)' : 'var(--text-muted)',
                        transition: 'all 0.1s',
                      }}
                    >
                      <cat.Icon size={15} />
                      <span style={{ fontSize: 10 }}>{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <FieldLabel>Dígitos</FieldLabel>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {[6, 8].map(d => (
                      <button key={d} type="button" onClick={() => setV('digits', d)}
                        style={segBtn(form.digits === d)}>{d}</button>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <FieldLabel>Período</FieldLabel>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {[30, 60].map(p => (
                      <button key={p} type="button" onClick={() => setV('period', p)}
                        style={segBtn(form.period === p)}>{p}s</button>
                    ))}
                  </div>
                </div>
              </div>

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
                ) : isEdit ? 'Guardar cambios' : 'Agregar al Vault'}
              </button>
            </form>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

const segBtn = (active) => ({
  flex: 1, padding: '8px 0', borderRadius: 7, border: 'none', cursor: 'pointer',
  fontSize: 13, fontWeight: 500, transition: 'all 0.1s',
  background: active ? 'var(--accent-dim)' : 'var(--bg-elevated)',
  color:      active ? 'var(--accent-light)' : 'var(--text-muted)',
  outline:    active ? '1px solid rgba(99,102,241,0.35)' : '1px solid var(--border)',
})

function FieldLabel({ children }) {
  return <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>{children}</label>
}

function FieldError({ error }) {
  if (!error) return null
  return (
    <p style={{ fontSize: 11, color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 4 }}>
      <AlertCircle size={11} /> {error}
    </p>
  )
}
