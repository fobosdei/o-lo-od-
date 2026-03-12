const { app, BrowserWindow, ipcMain, Menu, Tray, nativeImage, shell } = require('electron')
const path = require('path')
const { spawn } = require('child_process')

let mainWindow = null
let tray = null
let backendProcess = null
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

// ─── Security: prevent multiple instances ────────────────────────────────────
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
  process.exit(0)
}

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  }
})

// ─── Launch Express backend ───────────────────────────────────────────────────
function startBackend() {
  if (isDev) {
    // Dev: spawn separately so nodemon can hot-reload
    const backendPath = path.join(__dirname, '../backend/server.js')
    backendProcess = spawn('node', [backendPath], {
      env: { ...process.env, NODE_ENV: 'development' },
      stdio: 'pipe',
    })
    backendProcess.stdout.on('data', (d) => console.log('[Backend]', d.toString().trim()))
    backendProcess.stderr.on('data', (d) => console.error('[Backend Error]', d.toString().trim()))
    backendProcess.on('close', (code) => console.log(`[Backend] exited ${code}`))
  } else {
    // Production: require() directly — Electron already has Node.js, no spawn needed
    try {
      const backendRoot = path.join(process.resourcesPath, 'backend')
      // dotenv lives in backend/node_modules, NOT in root node_modules
      const dotenv = require(path.join(backendRoot, 'node_modules/dotenv'))
      dotenv.config({ path: path.join(process.resourcesPath, '.env') })
      require(path.join(backendRoot, 'server.js'))
      console.log('[Backend] Started in-process on port', process.env.BACKEND_PORT || 4000)
    } catch (err) {
      // Store error so renderer can display it once window is ready
      global.__backendError = err.message
      console.error('[Backend] Failed to start:', err.message, err.stack)
    }
  }
}

// ─── Create Main Window ────────────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    frame: false,             // custom titlebar
    transparent: false,
    backgroundColor: '#0a0a0f',
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,     // Security: isolate renderer
      nodeIntegration: false,     // Security: no node in renderer
      sandbox: true,              // Security: sandboxed renderer
      webSecurity: true,          // Security: same-origin policy
      allowRunningInsecureContent: false,
      experimentalFeatures: false,
    },
    icon: (() => {
      const p = path.join(__dirname, '../src/assets/icon.png')
      return require('fs').existsSync(p) ? p : undefined
    })(),
    show: false,  // show after ready-to-show
  })

  // Security: Prevent navigation to external URLs
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const parsedUrl = new URL(url)
    if (parsedUrl.origin !== 'http://localhost:5173' &&
        parsedUrl.origin !== 'file://') {
      event.preventDefault()
      shell.openExternal(url)
    }
  })

  // Security: Prevent opening new windows
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  // Load app
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  // Always open DevTools for now (debugging)
  mainWindow.webContents.openDevTools({ mode: 'detach' })

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
    mainWindow.focus()
    // Report backend crash to DevTools console if it failed
    if (global.__backendError) {
      mainWindow.webContents.executeJavaScript(
        `console.error('🔴 [Backend] Failed to start:', ${JSON.stringify(global.__backendError)})`
      )
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // Auto-lock on minimize (optional security feature)
  mainWindow.on('minimize', () => {
    mainWindow.webContents.send('app:minimize')
  })
}

// ─── System Tray ─────────────────────────────────────────────────────────────
function createTray() {
  const icon = nativeImage.createEmpty()
  tray = new Tray(icon)

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Abrir Vault', click: () => { mainWindow?.show(); mainWindow?.focus() } },
    { label: 'Bloquear', click: () => mainWindow?.webContents.send('app:lock') },
    { type: 'separator' },
    { label: 'Salir', click: () => { app.quit() } }
  ])

  tray.setToolTip('Vault — Password Manager')
  tray.setContextMenu(contextMenu)
  tray.on('double-click', () => { mainWindow?.show(); mainWindow?.focus() })
}

// ─── IPC Handlers ─────────────────────────────────────────────────────────────
// Window controls
ipcMain.handle('window:minimize', () => mainWindow?.minimize())
ipcMain.handle('window:maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize()
  } else {
    mainWindow?.maximize()
  }
})
ipcMain.handle('window:close', () => mainWindow?.close())
ipcMain.handle('window:isMaximized', () => mainWindow?.isMaximized())

// Clipboard (secure: clear after timeout)
ipcMain.handle('clipboard:write', async (event, text) => {
  const { clipboard } = require('electron')
  clipboard.writeText(text)
  // Auto-clear clipboard after 30 seconds for security
  setTimeout(() => {
    if (clipboard.readText() === text) {
      clipboard.writeText('')
    }
  }, 30000)
  return true
})

// App lock
ipcMain.handle('app:lock', () => {
  mainWindow?.webContents.send('app:lock')
})

// ─── App Events ───────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  // Security: set strict permissions
  app.setAsDefaultProtocolClient('vault-pm')

  startBackend()
  createWindow()
  createTray()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  if (backendProcess) {
    backendProcess.kill()
    backendProcess = null
  }
})

// Security: prevent resource loading from unexpected origins
app.on('web-contents-created', (event, contents) => {
  contents.on('will-attach-webview', (webContentsEvent) => {
    webContentsEvent.preventDefault()
  })
})
