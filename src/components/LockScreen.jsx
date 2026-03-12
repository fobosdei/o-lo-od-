import { useState } from 'react'
import { motion } from 'framer-motion'
import { Lock, Eye, EyeOff, ShieldCheck, AlertCircle, KeyRound } from 'lucide-react'
import toast from 'react-hot-toast'
import useVaultStore from '../store/useVaultStore'
import { checkPasswordStrength } from '../utils/crypto'
export default function LockScreen() {
  const { unlockVault, setupMasterPassword, signOut, user, isNewUser } = useVaultStore()

  const [masterPassword, setMasterPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPass, setShowPass]         = useState(false)
  const [showConfirm, setShowConfirm]   = useState(false)
  const [loading, setLoading]           = useState(false)
  const [attempts, setAttempts]         = useState(0)
  const [errors, setErrors]             = useState({})

  const MAX_ATTEMPTS = 5
  const strength = checkPasswordStrength(masterPassword)

  const validate = () => {
    const e = {}
    if (!masterPassword) {
      e.master = 'Ingresa tu contraseña maestra'
    } else if (isNewUser) {
      if (strength.score < 40) e.master = 'La contraseña debe ser más fuerte'
      if (masterPassword !== confirmPassword) e.confirm = 'Las contraseñas no coinciden'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    if (attempts >= MAX_ATTEMPTS) return

    setLoading(true)
    try {
      if (isNewUser) {
        await setupMasterPassword(masterPassword)
        toast.success('Contraseña maestra configurada ✓')
      } else {
        await unlockVault(masterPassword)
        toast.success('Vault desbloqueado')
      }
    } catch (err) {
      if (!isNewUser) {
        const next = attempts + 1
        setAttempts(next)
        if (next >= MAX_ATTEMPTS) {
          toast.error('Demasiados intentos. Cierra sesión.')
        } else {
          toast.error(`Contraseña incorrecta (${next}/${MAX_ATTEMPTS})`)
        }
        setMasterPassword('')
      } else {
        toast.error(err.message || 'Error al configurar')
      }
    } finally {
      setLoading(false)
    }
  }

  const blocked = attempts >= MAX_ATTEMPTS

  // Icon accent based on state
  const iconBg    = isNewUser ? 'rgba(22,101,52,0.2)'  : 'rgba(251,146,60,0.15)'
  const iconBorder= isNewUser ? 'rgba(22,163,74,0.45)' : 'rgba(251,146,60,0.35)'
  const iconGlow  = isNewUser ? 'rgba(22,101,52,0.25)' : 'rgba(251,146,60,0.2)'
  const iconColor = isNewUser ? '#86efac'               : '#fbbf24'

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
          style={{ width: '100%', maxWidth: 360 }}
        >
          {/* Icon + title */}
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 56,
              height: 56,
              borderRadius: 16,
              background: iconBg,
              border: `1px solid ${iconBorder}`,
              backdropFilter: 'blur(12px)',
              marginBottom: 16,
              boxShadow: `0 0 32px ${iconGlow}`,
            }}>
              {isNewUser
                ? <KeyRound size={24} style={{ color: iconColor }} />
                : <Lock size={24} style={{ color: iconColor }} />
              }
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 6, letterSpacing: '-0.01em' }}>
              {isNewUser ? 'Crear contraseña maestra' : 'Vault bloqueado'}
            </h2>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
              {isNewUser
                ? 'Esta contraseña cifrará todos tus códigos 2FA localmente'
                : user?.email}
            </p>
          </div>

          {/* Liquid glass card */}
          <div style={{
            background: 'rgba(9,9,11,0.45)',
            backdropFilter: 'blur(32px) saturate(180%)',
            WebkitBackdropFilter: 'blur(32px) saturate(180%)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 18,
            padding: 24,
            boxShadow: `
              0 20px 60px rgba(0,0,0,0.5),
              0 1px 0 rgba(255,255,255,0.06) inset,
              0 -1px 0 rgba(0,0,0,0.3) inset
            `,
          }}>

            {/* Step indicator for new users */}
            {isNewUser && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '9px 12px',
                borderRadius: 10,
                background: 'rgba(22,101,52,0.15)',
                border: '1px solid rgba(22,163,74,0.25)',
                marginBottom: 20,
                fontSize: 12,
                color: '#86efac',
              }}>
                <ShieldCheck size={14} />
                Paso 2 de 2: Configura tu contraseña maestra
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Master password input */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.55)' }}>
                  {isNewUser ? 'Nueva contraseña maestra' : 'Contraseña maestra'}
                </label>
                <div style={{ position: 'relative' }}>
                  <Lock size={15} style={{
                    position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                    color: 'rgba(255,255,255,0.35)', pointerEvents: 'none',
                  }} />
                  <input
                    type={showPass ? 'text' : 'password'}
                    placeholder={isNewUser ? 'Mínimo 8 caracteres, fuerte' : 'Ingresa tu contraseña maestra'}
                    value={masterPassword}
                    onChange={e => setMasterPassword(e.target.value)}
                    autoFocus
                    disabled={blocked}
                    className={`vault-input glass-input ${errors.master ? 'error' : ''}`}
                    style={{ paddingLeft: 36, paddingRight: 36 }}
                    autoComplete="new-password"
                  />
                  <button type="button" onClick={() => setShowPass(p => !p)}
                    style={{
                      position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'rgba(255,255,255,0.4)', padding: 0, display: 'flex',
                    }}>
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>

                {/* Strength bar */}
                {isNewUser && masterPassword && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ marginTop: 4 }}>
                    <div style={{
                      height: 3, borderRadius: 99,
                      background: 'rgba(255,255,255,0.08)',
                      overflow: 'hidden',
                    }}>
                      <motion.div
                        animate={{ width: `${strength.score}%` }}
                        transition={{ duration: 0.3 }}
                        style={{ height: '100%', borderRadius: 99, background: strength.color }}
                      />
                    </div>
                    <p style={{ fontSize: 11, color: strength.color, marginTop: 4 }}>{strength.label}</p>
                  </motion.div>
                )}

                {errors.master && (
                  <p style={{ fontSize: 12, color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <AlertCircle size={12} /> {errors.master}
                  </p>
                )}
              </div>

              {/* Confirm (only for new user setup) */}
              {isNewUser && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.55)' }}>
                    Confirmar contraseña maestra
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={15} style={{
                      position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                      color: 'rgba(255,255,255,0.35)', pointerEvents: 'none',
                    }} />
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      placeholder="Repite la contraseña"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      className={`vault-input glass-input ${errors.confirm ? 'error' : ''}`}
                      style={{ paddingLeft: 36, paddingRight: 36 }}
                      autoComplete="new-password"
                    />
                    <button type="button" onClick={() => setShowConfirm(p => !p)}
                      style={{
                        position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: 'rgba(255,255,255,0.4)', padding: 0, display: 'flex',
                      }}>
                      {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {errors.confirm && (
                    <p style={{ fontSize: 12, color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <AlertCircle size={12} /> {errors.confirm}
                    </p>
                  )}
                </div>
              )}

              {/* Security notice for new users */}
              {isNewUser && (
                <div style={{
                  padding: '10px 12px',
                  borderRadius: 10,
                  background: 'rgba(251,146,60,0.08)',
                  border: '1px solid rgba(251,146,60,0.2)',
                  fontSize: 12,
                  color: 'rgba(255,255,255,0.55)',
                  lineHeight: 1.6,
                }}>
                  ⚠ Esta contraseña <strong style={{ color: 'rgba(255,255,255,0.85)' }}>nunca se guarda</strong> en ningún
                  servidor. Si la olvidas, <strong style={{ color: 'var(--danger)' }}>no podrás recuperar tus códigos.</strong>
                </div>
              )}

              {/* Max attempts warning */}
              {blocked && (
                <div style={{
                  padding: '10px 12px',
                  borderRadius: 10,
                  background: 'rgba(248,113,113,0.08)',
                  border: '1px solid rgba(248,113,113,0.25)',
                  fontSize: 12,
                  color: 'var(--danger)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}>
                  <AlertCircle size={13} /> Máximo de intentos alcanzado
                </div>
              )}

              {/* Attempt counter */}
              {!isNewUser && attempts > 0 && !blocked && (
                <p style={{ fontSize: 11, color: 'rgba(251,146,60,0.8)', textAlign: 'center' }}>
                  {attempts}/{MAX_ATTEMPTS} intentos
                </p>
              )}

              <button
                type="submit"
                disabled={loading || blocked}
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
                    {isNewUser ? 'Configurando...' : 'Verificando...'}
                  </span>
                ) : isNewUser ? 'Crear contraseña maestra' : 'Desbloquear Vault'}
              </button>
            </form>
          </div>

          {/* Sign out link */}
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <button
              onClick={() => { signOut(); toast('Sesión cerrada') }}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 12, color: 'rgba(255,255,255,0.3)',
                transition: 'color 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--danger)'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.3)'}
            >
              Cerrar sesión · {user?.email}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
