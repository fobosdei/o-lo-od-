import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { RefreshCw, Copy, Check, X, Zap } from 'lucide-react'
import toast from 'react-hot-toast'
import { generatePassword, checkPasswordStrength } from '../utils/crypto'

export default function PasswordGenerator({ onUse, onClose }) {
  const [options, setOptions] = useState({ length: 20, upper: true, digits: true, symbols: true, noAmbiguous: true })
  const [password, setPassword] = useState(() => generatePassword({ length: 20, upper: true, digits: true, symbols: true, noAmbiguous: true }))
  const [copied, setCopied] = useState(false)

  const strength = checkPasswordStrength(password)

  const regenerate = useCallback(() => {
    setPassword(generatePassword(options))
    setCopied(false)
  }, [options])

  const handleOptionChange = (key, value) => {
    const newOpts = { ...options, [key]: value }
    setOptions(newOpts)
    setPassword(generatePassword(newOpts))
    setCopied(false)
  }

  const handleCopy = async () => {
    if (window.electronAPI) {
      await window.electronAPI.clipboard.writeSecure(password)
    } else {
      await navigator.clipboard.writeText(password)
    }
    setCopied(true)
    toast.success('Copiado (se borrará en 30s)', { icon: '📋' })
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="glass rounded-2xl p-6 w-full max-w-md mx-4"
        style={{ boxShadow: '0 0 50px rgba(0,255,136,0.15)' }}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Zap size={18} className="text-vault-accent" />
            <h3 className="text-vault-text font-mono font-bold">Generador de Contraseñas</h3>
          </div>
          <button onClick={onClose} className="text-vault-muted hover:text-vault-text transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Password display */}
        <div className="bg-vault-surface rounded-xl p-4 mb-4 border border-vault-border font-mono text-sm break-all text-vault-text tracking-wider">
          {password}
        </div>

        {/* Strength */}
        <div className="mb-4">
          <div className="h-1.5 bg-vault-border rounded-full overflow-hidden mb-1">
            <motion.div
              animate={{ width: `${strength.score}%` }}
              className="h-full rounded-full transition-all duration-500"
              style={{ backgroundColor: strength.color }}
            />
          </div>
          <div className="flex justify-between text-xs font-mono">
            <span style={{ color: strength.color }}>{strength.label}</span>
            <span className="text-vault-muted">{strength.score}/100</span>
          </div>
        </div>

        {/* Length slider */}
        <div className="mb-4 space-y-2">
          <div className="flex justify-between text-xs font-mono text-vault-muted">
            <span>Longitud</span>
            <span className="text-vault-accent">{options.length}</span>
          </div>
          <input
            type="range"
            min={8} max={64}
            value={options.length}
            onChange={e => handleOptionChange('length', parseInt(e.target.value))}
            className="w-full accent-vault-accent"
          />
        </div>

        {/* Options */}
        <div className="grid grid-cols-2 gap-2 mb-5">
          {[
            { key: 'upper', label: 'Mayúsculas (A-Z)' },
            { key: 'digits', label: 'Números (0-9)' },
            { key: 'symbols', label: 'Símbolos (!@#...)' },
            { key: 'noAmbiguous', label: 'Sin ambiguos (lI1O0)' },
          ].map(({ key, label }) => (
            <label key={key} className="flex items-center gap-2 text-xs font-mono text-vault-muted cursor-pointer hover:text-vault-text transition-colors">
              <input
                type="checkbox"
                checked={options[key]}
                onChange={e => handleOptionChange(key, e.target.checked)}
                className="accent-vault-accent"
              />
              {label}
            </label>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={regenerate}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-mono
              bg-vault-surface border border-vault-border text-vault-muted
              hover:border-vault-accent hover:text-vault-accent transition-all"
          >
            <RefreshCw size={14} /> Regenerar
          </button>
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-mono
              bg-vault-surface border border-vault-border text-vault-muted
              hover:border-vault-accent3 hover:text-vault-accent3 transition-all"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? '¡Copiado!' : 'Copiar'}
          </button>
          {onUse && (
            <button
              onClick={() => { onUse(password); onClose() }}
              className="flex-1 py-2 rounded-lg text-sm font-mono font-semibold
                bg-vault-accent/10 border border-vault-accent/40 text-vault-accent
                hover:bg-vault-accent/20 hover:border-vault-accent hover:shadow-neon transition-all"
            >
              Usar esta
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
