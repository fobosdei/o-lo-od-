import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Copy, Star, Edit2, Trash2, Check } from 'lucide-react'
import { generateTOTP, secondsRemaining, periodProgress } from '../utils/totp'

// Issuer name → accent color
const ISSUER_COLORS = {
  google:    '#ef4444',
  microsoft: '#3b82f6',
  github:    '#e2e8f0',
  apple:     '#e2e8f0',
  amazon:    '#f97316',
  facebook:  '#3b82f6',
  twitter:   '#60a5fa',
  instagram: '#ec4899',
  discord:   '#818cf8',
  slack:     '#4ade80',
}

function getAccentColor(issuer = '') {
  const key = issuer.toLowerCase()
  for (const [name, color] of Object.entries(ISSUER_COLORS)) {
    if (key.includes(name)) return color
  }
  return '#6366f1'
}

function getServiceIcon(issuer = '') {
  const lower = issuer.toLowerCase()
  if (lower.includes('google'))                              return '🔴'
  if (lower.includes('microsoft') || lower.includes('azure') || lower.includes('outlook')) return '🔷'
  if (lower.includes('github'))                              return '🐙'
  if (lower.includes('apple'))                               return '🍎'
  if (lower.includes('facebook') || lower.includes('meta')) return '🔵'
  if (lower.includes('twitter') || lower.includes('x.com')) return '🐦'
  if (lower.includes('instagram'))                           return '📸'
  if (lower.includes('discord'))                             return '💬'
  if (lower.includes('slack'))                               return '💼'
  if (lower.includes('amazon') || lower.includes('aws'))    return '📦'
  if (lower.includes('bank') || lower.includes('banco') || lower.includes('paypal')) return '🏦'
  return '🔐'
}

const RING_R    = 18
const RING_CIRC = 2 * Math.PI * RING_R

export default function TOTPCard({ entry, onEdit, onDelete, onToggleFavorite }) {
  const [code, setCode]     = useState('------')
  const [secs, setSecs]     = useState(entry.period || 30)
  const [progress, setProgress] = useState(1)
  const [copied, setCopied] = useState(false)
  const intervalRef = useRef(null)

  const accent  = getAccentColor(entry.issuer)
  const isUrgent = secs <= 5

  useEffect(() => {
    if (!entry.secret || entry._error) return

    const tick = async () => {
      try {
        const newCode = await generateTOTP(entry.secret, entry.digits, entry.period)
        const s = secondsRemaining(entry.period)
        const p = periodProgress(entry.period)
        setCode(newCode)
        setSecs(s)
        setProgress(p)
      } catch {
        setCode('ERROR')
      }
    }

    tick()
    intervalRef.current = setInterval(tick, 500)
    return () => clearInterval(intervalRef.current)
  }, [entry.secret, entry.digits, entry.period])

  const copyCode = async (e) => {
    e.stopPropagation()
    const raw = code.replace(/\s/g, '')
    try {
      if (window.electronAPI) {
        await window.electronAPI.clipboard.writeSecure(raw)
      } else {
        await navigator.clipboard.writeText(raw)
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {}
  }

  const formattedCode = code.length === 6
    ? `${code.slice(0, 3)} ${code.slice(3)}`
    : code.length === 8
    ? `${code.slice(0, 4)} ${code.slice(4)}`
    : code

  const dashOffset = RING_CIRC * (1 - progress)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      className="totp-card"
      style={{ padding: '16px 18px' }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            background: `${accent}18`,
            border: `1px solid ${accent}35`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18,
          }}>
            {getServiceIcon(entry.issuer)}
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {entry.issuer}
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {entry.account}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
          <IconBtn
            onClick={e => { e.stopPropagation(); onToggleFavorite(entry.id) }}
            active={entry.is_favorite} activeColor="#fbbf24" title="Favorito"
          >
            <Star size={13} fill={entry.is_favorite ? 'currentColor' : 'none'} />
          </IconBtn>
          <IconBtn onClick={e => { e.stopPropagation(); onEdit(entry) }} title="Editar">
            <Edit2 size={13} />
          </IconBtn>
          <IconBtn onClick={e => { e.stopPropagation(); onDelete(entry) }} title="Eliminar" hoverColor="var(--danger)">
            <Trash2 size={13} />
          </IconBtn>
        </div>
      </div>

      {/* Code row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <AnimatePresence mode="wait">
            <motion.span
              key={code}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
              className="totp-code"
              style={{ color: isUrgent ? 'var(--danger)' : 'var(--success)', display: 'block' }}
            >
              {entry._error ? '⚠ ERROR' : formattedCode}
            </motion.span>
          </AnimatePresence>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            {entry.digits} dígitos · {entry.period}s
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Countdown ring */}
          <div style={{ position: 'relative', width: 44, height: 44 }}>
            <svg width={44} height={44} style={{ position: 'absolute', inset: 0 }}>
              <circle cx={22} cy={22} r={RING_R} fill="none" stroke="var(--border)" strokeWidth={2.5} />
              <circle
                cx={22} cy={22} r={RING_R}
                fill="none"
                stroke={isUrgent ? 'var(--danger)' : accent}
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeDasharray={RING_CIRC}
                strokeDashoffset={dashOffset}
                className="totp-ring"
                style={{ transition: 'stroke-dashoffset 0.5s linear, stroke 0.3s' }}
              />
            </svg>
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{
                fontSize: 12, fontWeight: 700,
                fontFamily: 'JetBrains Mono, monospace',
                color: isUrgent ? 'var(--danger)' : 'var(--text-secondary)',
              }}>
                {secs}
              </span>
            </div>
          </div>

          {/* Copy */}
          <button
            onClick={copyCode}
            title="Copiar código"
            style={{
              width: 36, height: 36, borderRadius: 9,
              border: '1px solid var(--border)',
              background: copied ? 'rgba(74,222,128,0.1)' : 'var(--bg-elevated)',
              color: copied ? 'var(--success)' : 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s', flexShrink: 0,
            }}
          >
            <AnimatePresence mode="wait">
              {copied
                ? <motion.span key="c" initial={{ scale: 0.6 }} animate={{ scale: 1 }}><Check size={14} /></motion.span>
                : <motion.span key="cc" initial={{ scale: 0.6 }} animate={{ scale: 1 }}><Copy size={14} /></motion.span>
              }
            </AnimatePresence>
          </button>
        </div>
      </div>
    </motion.div>
  )
}

function IconBtn({ onClick, children, title, active, activeColor, hoverColor }) {
  const [hover, setHover] = useState(false)
  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: 28, height: 28, borderRadius: 6, border: 'none',
        background: hover ? 'var(--bg-elevated)' : 'transparent',
        color: active ? activeColor : hover ? (hoverColor || 'var(--text)') : 'var(--text-muted)',
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.1s',
      }}
    >
      {children}
    </button>
  )
}
