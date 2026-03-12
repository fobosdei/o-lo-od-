import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Eye, EyeOff, Copy, Star, Trash2, Pencil, ExternalLink,
  Globe, Monitor, Github, Users, Landmark, Briefcase, Mail, Box, Layers,
} from 'lucide-react'
import toast from 'react-hot-toast'
import useVaultStore from '../store/useVaultStore'

// Category icon map
const CATEGORY_ICONS = {
  general:        Layers,
  redes_sociales: Users,
  banco:          Landmark,
  trabajo:        Briefcase,
  email:          Mail,
  juegos:         Monitor,
  otro:           Box,
}

// Auto-detect service icon by title keywords
function ServiceIcon({ title }) {
  const t = title.toLowerCase()
  let Icon = Globe
  let color = '#6366f1'

  if (t.includes('google') || t.includes('gmail')) { Icon = Globe; color = '#4285f4' }
  else if (t.includes('github')) { Icon = Github; color = '#f0f6fc' }
  else if (t.includes('microsoft') || t.includes('outlook') || t.includes('xbox')) { Icon = Monitor; color = '#0078d4' }
  else if (t.includes('facebook') || t.includes('instagram') || t.includes('twitter') || t.includes('x.com')) { Icon = Users; color = '#1877f2' }
  else if (t.includes('bank') || t.includes('banco') || t.includes('paypal')) { Icon = Landmark; color = '#4ade80' }
  else if (t.includes('mail') || t.includes('email') || t.includes('correo')) { Icon = Mail; color = '#f59e0b' }

  return (
    <div style={{
      width: 40, height: 40, borderRadius: 10,
      background: `${color}18`,
      border: `1px solid ${color}30`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      <Icon size={18} style={{ color }} />
    </div>
  )
}

/** Copy text to clipboard */
async function copyToClipboard(text, label) {
  try {
    await navigator.clipboard.writeText(text)
    toast.success(`${label} copiado`)
  } catch {
    toast.error('Error al copiar')
  }
}

export default function CredentialCard({ entry, index = 0 }) {
  const [showPassword, setShowPassword] = useState(false)
  const { toggleFavorite, deleteCredential, setEditingEntry, setShowEditModal } = useVaultStore()

  const CategoryIcon = CATEGORY_ICONS[entry.category] || Globe

  const handleDelete = async () => {
    if (!confirm(`¿Eliminar "${entry.title}"?`)) return
    try {
      await deleteCredential(entry.id)
      toast.success('Credencial eliminada')
    } catch (err) {
      toast.error(err.message || 'Error al eliminar')
    }
  }

  const handleEdit = () => {
    setEditingEntry(entry)
    setShowEditModal(true)
  }

  const maskedPassword = '•'.repeat(Math.min(entry.password?.length || 10, 16))

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.03 }}
      className="totp-card"
      style={{ padding: '14px 16px' }}
    >
      {/* Top row: icon + title + actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <ServiceIcon title={entry.title} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <h3 style={{
              fontSize: 14, fontWeight: 600, color: 'var(--text)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {entry.title}
            </h3>
            <CategoryIcon size={11} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          </div>
          {entry.username && (
            <p style={{
              fontSize: 12, color: 'var(--text-secondary)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {entry.username}
            </p>
          )}
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          {entry.url && (
            <ActionBtn
              icon={<ExternalLink size={13} />}
              title="Abrir sitio"
              onClick={() => window.open(entry.url.startsWith('http') ? entry.url : `https://${entry.url}`, '_blank')}
            />
          )}
          <ActionBtn
            icon={<Star size={13} style={{ fill: entry.is_favorite ? 'var(--warning)' : 'none' }} />}
            title={entry.is_favorite ? 'Quitar favorito' : 'Favorito'}
            onClick={() => toggleFavorite(entry.id)}
            style={{ color: entry.is_favorite ? 'var(--warning)' : 'var(--text-muted)' }}
          />
          <ActionBtn icon={<Pencil size={13} />} title="Editar" onClick={handleEdit} />
          <ActionBtn icon={<Trash2 size={13} />} title="Eliminar" onClick={handleDelete} danger />
        </div>
      </div>

      {/* Password row */}
      <div style={{
        marginTop: 12,
        padding: '8px 12px',
        borderRadius: 8,
        background: 'var(--bg)',
        border: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <Lock size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
        <span style={{
          flex: 1,
          fontFamily: showPassword ? "'JetBrains Mono', monospace" : 'inherit',
          fontSize: showPassword ? 12 : 14,
          color: 'var(--text)',
          letterSpacing: showPassword ? '0.05em' : '0.2em',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {showPassword ? entry.password : maskedPassword}
        </span>
        <button
          onClick={() => setShowPassword(p => !p)}
          title={showPassword ? 'Ocultar' : 'Mostrar'}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 2 }}
        >
          {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
        </button>
        <button
          onClick={() => copyToClipboard(entry.password, 'Contraseña')}
          title="Copiar contraseña"
          style={{
            background: 'var(--accent-dim)',
            border: '1px solid rgba(99,102,241,0.2)',
            borderRadius: 5,
            cursor: 'pointer', padding: '3px 8px',
            color: 'var(--accent-light)', display: 'flex', alignItems: 'center', gap: 4,
            fontSize: 11, fontWeight: 500,
          }}
        >
          <Copy size={11} /> Copiar
        </button>
      </div>

      {/* Username copy (if present) */}
      {entry.username && (
        <button
          onClick={() => copyToClipboard(entry.username, 'Usuario')}
          style={{
            marginTop: 6, width: '100%', background: 'none',
            border: 'none', cursor: 'pointer', textAlign: 'left',
            color: 'var(--text-muted)', fontSize: 11,
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '2px 0',
          }}
        >
          <Copy size={10} /> Copiar usuario
        </button>
      )}
    </motion.div>
  )
}

function ActionBtn({ icon, title, onClick, danger, style: extraStyle = {} }) {
  const [hover, setHover] = useState(false)
  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: hover ? (danger ? 'var(--danger-dim)' : 'var(--bg-elevated)') : 'transparent',
        border: 'none', borderRadius: 6,
        cursor: 'pointer', padding: 5,
        color: danger ? (hover ? 'var(--danger)' : 'var(--text-muted)') : (hover ? 'var(--text)' : 'var(--text-muted)'),
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.12s',
        ...extraStyle,
      }}
    >
      {icon}
    </button>
  )
}

// Import for the lock icon inside password row
function Lock({ size, style }) {
  return <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
}
