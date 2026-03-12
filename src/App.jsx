import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Toaster } from 'react-hot-toast'
import useVaultStore from './store/useVaultStore'
import TitleBar from './components/TitleBar'
import AuthScreen from './components/AuthScreen'
import LockScreen from './components/LockScreen'
import Dashboard from './components/Dashboard'
import ColorBends from './components/ColorBends'

function LoadingScreen() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <div style={{ textAlign: 'center' }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
          style={{
            width: 32, height: 32, margin: '0 auto 12px',
            border: '2px solid var(--border)',
            borderTopColor: 'var(--accent)',
            borderRadius: '50%',
          }}
        />
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Inicializando...</p>
      </div>
    </div>
  )
}

export default function App() {
  const { user, isLocked, isLoading, initAuth, lockVault } = useVaultStore()

  useEffect(() => { initAuth() }, [])

  useEffect(() => {
    if (!window.electronAPI) return
    const unlisten = window.electronAPI.app.onLock(() => lockVault('electron'))
    const unlistenMin = window.electronAPI.app.onMinimize(() => {})
    return () => { unlisten?.(); unlistenMin?.() }
  }, [lockVault])

  const getScreen = () => {
    if (isLoading) return 'loading'
    if (!user)     return 'auth'
    if (isLocked)  return 'lock'
    return 'dashboard'
  }
  const screen = getScreen()

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#09090b' }}>
      {/* Three.js animated background — always present behind everything */}
      <ColorBends
        colors={['#6366f1', '#8b5cf6', '#06b6d4', '#3b82f6', '#a855f7']}
        rotation={45}
        speed={0.18}
        scale={1}
        frequency={1}
        warpStrength={1}
        mouseInfluence={0.5}
        parallax={0.3}
        noise={0.04}
        autoRotate={0}
        transparent={false}
      />

      <TitleBar title="Vault" />

      <div style={{ flex: 1, overflow: 'hidden', position: 'relative', zIndex: 1 }}>
        <AnimatePresence mode="wait">
          {screen === 'loading' && (
            <motion.div key="loading" style={{ position: 'absolute', inset: 0 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <LoadingScreen />
            </motion.div>
          )}
          {screen === 'auth' && (
            <motion.div key="auth" style={{ position: 'absolute', inset: 0 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <AuthScreen />
            </motion.div>
          )}
          {screen === 'lock' && (
            <motion.div key="lock" style={{ position: 'absolute', inset: 0 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <LockScreen />
            </motion.div>
          )}
          {screen === 'dashboard' && (
            <motion.div key="dashboard" style={{ position: 'absolute', inset: 0 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Dashboard />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: 'rgba(24,24,27,0.85)',
            backdropFilter: 'blur(16px)',
            color: 'var(--text)',
            border: '1px solid rgba(255,255,255,0.08)',
            fontFamily: 'Inter, system-ui, sans-serif',
            fontSize: '13px',
            borderRadius: '10px',
          },
          success: { iconTheme: { primary: '#4ade80', secondary: 'var(--bg-elevated)' } },
          error:   { iconTheme: { primary: '#f87171', secondary: 'var(--bg-elevated)' } },
        }}
      />
    </div>
  )
}
