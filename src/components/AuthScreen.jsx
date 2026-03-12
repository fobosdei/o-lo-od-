import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield, Eye, EyeOff, Mail, Lock, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import useVaultStore from '../store/useVaultStore'

// Field defined OUTSIDE so React never remounts it (fixes focus-loss bug)
function Field({ label, type, placeholder, icon: Icon, value, onChange, error, showToggle, showPass, onToggleShow }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.02em' }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <Icon size={15} style={{
          position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
          color: 'rgba(255,255,255,0.35)', pointerEvents: 'none',
        }} />
        <input
          type={showToggle ? (showPass ? 'text' : 'password') : type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          autoComplete={type === 'email' ? 'email' : 'current-password'}
          className={`vault-input glass-input ${error ? 'error' : ''}`}
          style={{ paddingLeft: 36, paddingRight: showToggle ? 36 : 14 }}
        />
        {showToggle && (
          <button
            type="button"
            onClick={onToggleShow}
            style={{
              position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'rgba(255,255,255,0.4)', padding: 0, display: 'flex',
            }}
          >
            {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        )}
      </div>
      {error && (
        <p style={{ fontSize: 12, color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 4 }}>
          <AlertCircle size={12} /> {error}
        </p>
      )}
    </div>
  )
}

export default function AuthScreen() {
  const [mode, setMode] = useState('login')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [errors, setErrors]     = useState({})

  const { signIn, signUp } = useVaultStore()

  const validate = () => {
    const e = {}
    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) e.email = 'Email inválido'
    if (password.length < 8) e.password = 'Mínimo 8 caracteres'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (ev) => {
    ev.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      if (mode === 'login') {
        await signIn(email, password)
      } else {
        await signUp(email, password)
        toast.success('Cuenta creada. Ahora crea tu contraseña maestra.', { duration: 5000 })
      }
    } catch (err) {
      toast.error(err.message || 'Error de autenticación')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      overflow: 'hidden',
    }}>
      {/* Scrollable content layer */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        overflowY: 'auto',
      }}>
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          style={{ width: '100%', maxWidth: 380 }}
        >
          {/* Brand */}
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 56,
              height: 56,
              borderRadius: 16,
              background: 'rgba(22,101,52,0.2)',
              border: '1px solid rgba(22,163,74,0.4)',
              backdropFilter: 'blur(12px)',
              marginBottom: 16,
              boxShadow: '0 0 32px rgba(22,101,52,0.25)',
            }}>
              <Shield size={26} style={{ color: '#86efac' }} />
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 6, letterSpacing: '-0.01em' }}>
              Vault Authenticator
            </h1>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
              {mode === 'login' ? 'Inicia sesión en tu cuenta' : 'Crea una cuenta nueva'}
            </p>
          </div>

          {/* Liquid glass card */}
          <div style={{
            background: 'rgba(9,9,11,0.45)',
            backdropFilter: 'blur(32px) saturate(180%)',
            WebkitBackdropFilter: 'blur(32px) saturate(180%)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 18,
            padding: 28,
            boxShadow: `
              0 20px 60px rgba(0,0,0,0.5),
              0 1px 0 rgba(255,255,255,0.06) inset,
              0 -1px 0 rgba(0,0,0,0.3) inset
            `,
          }}>

            {/* Mode tabs */}
            <div style={{
              display: 'flex',
              background: 'rgba(255,255,255,0.05)',
              borderRadius: 10,
              padding: 3,
              marginBottom: 24,
              border: '1px solid rgba(255,255,255,0.07)',
            }}>
              {['login', 'register'].map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => { setMode(m); setErrors({}) }}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: 7,
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: 'pointer',
                    border: 'none',
                    transition: 'all 0.18s',
                    background: mode === m ? 'rgba(22,101,52,0.4)' : 'transparent',
                    color: mode === m ? '#bbf7d0' : 'rgba(255,255,255,0.4)',
                    boxShadow: mode === m ? '0 1px 8px rgba(22,101,52,0.3)' : 'none',
                  }}
                >
                  {m === 'login' ? 'Iniciar sesión' : 'Registrarse'}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Field
                label="Correo electrónico" type="email"
                placeholder="tu@email.com" icon={Mail}
                value={email} onChange={e => setEmail(e.target.value)} error={errors.email}
              />
              <Field
                label="Contraseña" type="password"
                placeholder="Mínimo 8 caracteres" icon={Lock}
                showToggle showPass={showPass} onToggleShow={() => setShowPass(p => !p)}
                value={password} onChange={e => setPassword(e.target.value)} error={errors.password}
              />

              {/* Info banner for register */}
              <AnimatePresence>
                {mode === 'register' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    style={{
                      padding: '10px 13px',
                      borderRadius: 10,
                      background: 'rgba(22,101,52,0.12)',
                      border: '1px solid rgba(22,163,74,0.25)',
                      fontSize: 12,
                      color: 'rgba(255,255,255,0.6)',
                      lineHeight: 1.6,
                    }}
                  >
                    <strong style={{ color: '#86efac' }}>Paso 1 de 2:</strong> Crea tu cuenta.
                    Después configurarás una{' '}
                    <strong style={{ color: 'rgba(255,255,255,0.85)' }}>contraseña maestra</strong>{' '}
                    que cifrará todos tus códigos localmente.
                  </motion.div>
                )}
              </AnimatePresence>

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
                        display: 'inline-block',
                        width: 14, height: 14,
                        border: '2px solid rgba(255,255,255,0.3)',
                        borderTopColor: '#fff',
                        borderRadius: '50%',
                      }}
                    />
                    Procesando...
                  </span>
                ) : mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
              </button>
            </form>
          </div>

          <p style={{ textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 20 }}>
            Cifrado AES-256-GCM · Código abierto · Datos tuyos
          </p>
        </motion.div>
      </div>
    </div>
  )
}
