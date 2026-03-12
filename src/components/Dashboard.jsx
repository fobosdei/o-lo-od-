import { useState, useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
import {
  Search, Plus, Lock, LogOut, Shield,
  Layers, Star, Users, Landmark, Briefcase, Mail, Box, Monitor,
} from 'lucide-react'
import useVaultStore from '../store/useVaultStore'
import CredentialCard from './CredentialCard'
import AddCredentialModal from './AddCredentialModal'

const CATEGORIES = [
  { value: 'all',            label: 'Todas',     Icon: Layers    },
  { value: 'favorites',      label: 'Favoritos', Icon: Star      },
  { value: 'general',        label: 'General',   Icon: Shield    },
  { value: 'redes_sociales', label: 'Social',    Icon: Users     },
  { value: 'banco',          label: 'Banco',     Icon: Landmark  },
  { value: 'trabajo',        label: 'Trabajo',   Icon: Briefcase },
  { value: 'email',          label: 'Email',     Icon: Mail      },
  { value: 'juegos',         label: 'Juegos',    Icon: Monitor   },
  { value: 'otro',           label: 'Otro',      Icon: Box       },
]

export default function Dashboard() {
  const {
    user, credentials, searchQuery, selectedCategory,
    showAddModal, showEditModal, editingEntry,
    setSearchQuery, setSelectedCategory, setShowAddModal,
    fetchCredentials, lockVault, signOut,
  } = useVaultStore()

  useEffect(() => { fetchCredentials() }, [])

  const filtered = useVaultStore(s => s.getFilteredCredentials())

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>

      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside style={{
        width: 200,
        background: 'rgba(12, 12, 15, 0.78)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', flexDirection: 'column',
        flexShrink: 0, overflow: 'hidden',
      }}>
        {/* Brand */}
        <div style={{ padding: '16px 14px 12px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 7,
              background: 'var(--accent-dim)',
              border: '1px solid rgba(99,102,241,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Shield size={14} style={{ color: 'var(--accent-light)' }} />
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', lineHeight: 1.2 }}>Vault</p>
              <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>Password Manager</p>
            </div>
          </div>
        </div>

        {/* Categories */}
        <div style={{ flex: 1, padding: '10px 8px', overflowY: 'auto' }}>
          <p style={{
            fontSize: 10, fontWeight: 600, color: 'var(--text-muted)',
            letterSpacing: '0.06em', marginBottom: 6, paddingLeft: 4,
          }}>
            CATEGORÍAS
          </p>
          {CATEGORIES.map(cat => {
            const isActive = selectedCategory === cat.value
            const count = cat.value === 'all'
              ? credentials.length
              : cat.value === 'favorites'
                ? credentials.filter(e => e.is_favorite).length
                : credentials.filter(e => e.category === cat.value).length

            return (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className={`nav-item ${isActive ? 'active' : ''}`}
                style={{ width: '100%', marginBottom: 1 }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13 }}>
                  <cat.Icon size={13} style={{ flexShrink: 0 }} />
                  <span>{cat.label}</span>
                </span>
                {count > 0 && (
                  <span style={{
                    fontSize: 10, fontWeight: 600,
                    color: isActive ? 'var(--accent-light)' : 'var(--text-muted)',
                    background: isActive ? 'rgba(99,102,241,0.15)' : 'transparent',
                    padding: '1px 5px', borderRadius: 4,
                  }}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* User + actions */}
        <div style={{ padding: '10px 8px', borderTop: '1px solid var(--border)' }}>
          <div style={{ padding: '6px 10px', marginBottom: 4 }}>
            <p style={{
              fontSize: 11, color: 'var(--text-muted)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {user?.email}
            </p>
          </div>
          <SidebarAction icon={<Lock size={13} />} label="Bloquear" onClick={() => lockVault('manual')} />
          <SidebarAction
            icon={<LogOut size={13} />} label="Cerrar sesión" danger
            onClick={() => { if (confirm('¿Cerrar sesión?')) signOut() }}
          />
        </div>
      </aside>

      {/* ── Main Content ─────────────────────────────────────── */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Toolbar */}
        <div style={{
          padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'rgba(12, 12, 15, 0.72)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={14} style={{
              position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
              color: 'var(--text-muted)', pointerEvents: 'none',
            }} />
            <input
              type="text"
              placeholder="Buscar credenciales..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="vault-input"
              style={{ paddingLeft: 32, fontSize: 13, height: 36 }}
            />
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary"
            style={{ height: 36, padding: '0 14px', gap: 6, whiteSpace: 'nowrap' }}
          >
            <Plus size={15} /> Nueva
          </button>
        </div>

        {/* Header */}
        <div style={{ padding: '12px 16px 8px' }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>
            {CATEGORIES.find(c => c.value === selectedCategory)?.label || 'Todas'}
          </h2>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {filtered.length} {filtered.length === 1 ? 'credencial' : 'credenciales'}
          </p>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 16px' }}>
          {filtered.length === 0 ? (
            <EmptyState query={searchQuery} category={selectedCategory} onAdd={() => setShowAddModal(true)} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filtered.map((entry, i) => (
                <CredentialCard key={entry.id} entry={entry} index={i} />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* ── Modals ───────────────────────────────────────────── */}
      <AnimatePresence>
        {showAddModal && <AddCredentialModal />}
        {showEditModal && editingEntry && <AddCredentialModal editEntry={editingEntry} />}
      </AnimatePresence>
    </div>
  )
}

function EmptyState({ query, category, onAdd }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '55%', textAlign: 'center', padding: 32,
    }}>
      <div style={{
        width: 52, height: 52, borderRadius: 14,
        background: 'var(--bg-elevated)', border: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
      }}>
        <Shield size={22} style={{ color: 'var(--text-muted)' }} />
      </div>
      <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
        {query ? 'Sin resultados' : 'Sin credenciales'}
      </h3>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20, maxWidth: 240, lineHeight: 1.6 }}>
        {query
          ? `No encontramos resultados para "${query}"`
          : category === 'favorites'
            ? 'Marca credenciales con ★ para verlas aquí'
            : 'Agrega tu primera credencial con el botón Nueva'}
      </p>
      {!query && category !== 'favorites' && (
        <button onClick={onAdd} className="btn-primary" style={{ gap: 6 }}>
          <Plus size={14} /> Nueva credencial
        </button>
      )}
    </div>
  )
}

function SidebarAction({ icon, label, onClick, danger }) {
  const [hover, setHover] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 7,
        padding: '7px 10px', borderRadius: 8, border: 'none',
        background: hover ? (danger ? 'var(--danger-dim)' : 'var(--bg-card)') : 'transparent',
        color: danger ? (hover ? 'var(--danger)' : 'var(--text-muted)') : (hover ? 'var(--text)' : 'var(--text-muted)'),
        cursor: 'pointer', fontSize: 13, transition: 'all 0.12s', marginBottom: 1,
      }}
    >
      {icon} {label}
    </button>
  )
}
