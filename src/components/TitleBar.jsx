import { useState, useEffect } from 'react'
import { Shield, Minus, Square, X } from 'lucide-react'

export default function TitleBar({ title = 'Vault' }) {
  const [isMaximized, setIsMaximized] = useState(false)
  const isElectron = !!window.electronAPI

  useEffect(() => {
    if (!isElectron) return
    window.electronAPI.window.isMaximized().then(setIsMaximized)
  }, [isElectron])

  const handleMinimize = () => isElectron && window.electronAPI.window.minimize()
  const handleMaximize = async () => {
    if (!isElectron) return
    await window.electronAPI.window.maximize()
    setIsMaximized(await window.electronAPI.window.isMaximized())
  }
  const handleClose = () => isElectron && window.electronAPI.window.close()

  return (
    <div
      className="titlebar"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 40,
        paddingLeft: 14,
        paddingRight: 4,
        background: 'rgba(9, 9, 11, 0.80)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        flexShrink: 0,
      }}
    >
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <Shield size={15} style={{ color: 'var(--accent-light)' }} />
        <span style={{
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--text-secondary)',
          letterSpacing: '0.02em',
        }}>
          {title}
        </span>
      </div>

      {/* Window controls */}
      {isElectron && (
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <WinBtn onClick={handleMinimize} title="Minimizar">
            <Minus size={11} />
          </WinBtn>
          <WinBtn onClick={handleMaximize} title={isMaximized ? 'Restaurar' : 'Maximizar'}>
            <Square size={10} />
          </WinBtn>
          <WinBtn onClick={handleClose} title="Cerrar" danger>
            <X size={12} />
          </WinBtn>
        </div>
      )}
    </div>
  )
}

function WinBtn({ onClick, title, children, danger }) {
  const [hover, setHover] = useState(false)
  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: 40, height: 40,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: hover ? (danger ? 'rgba(248,113,113,0.15)' : 'var(--bg-elevated)') : 'transparent',
        border: 'none',
        cursor: 'pointer',
        color: hover ? (danger ? 'var(--danger)' : 'var(--text)') : 'var(--text-muted)',
        transition: 'background 0.1s, color 0.1s',
        WebkitAppRegion: 'no-drag',
        borderRadius: 4,
      }}
    >
      {children}
    </button>
  )
}
