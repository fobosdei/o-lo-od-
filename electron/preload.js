/**
 * Preload Script — Secure IPC Bridge
 * Exposes ONLY specific APIs to the renderer process
 * No direct Node.js access from renderer for security
 */
const { contextBridge, ipcRenderer } = require('electron')

// Expose safe API to renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
  },

  // Secure clipboard (auto-clears after 30s)
  clipboard: {
    writeSecure: (text) => ipcRenderer.invoke('clipboard:write', text),
  },

  // App lock
  app: {
    lock: () => ipcRenderer.invoke('app:lock'),
    onLock: (callback) => {
      ipcRenderer.on('app:lock', callback)
      return () => ipcRenderer.removeListener('app:lock', callback)
    },
    onMinimize: (callback) => {
      ipcRenderer.on('app:minimize', callback)
      return () => ipcRenderer.removeListener('app:minimize', callback)
    },
  },
})
