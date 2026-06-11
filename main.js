const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')
const fs = require('fs')
const { autoUpdater } = require('electron-updater')

let mainWindow
let currentFilePath = null

// ====== Auto Updater Config ======
autoUpdater.autoDownload = false
autoUpdater.autoInstallOnAppQuit = true

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 750,
    minWidth: 600,
    minHeight: 400,
    icon: path.join(__dirname, 'assets', 'icon.png'),
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#0f0f1a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  })

  mainWindow.loadFile('src/index.html')
}

// ====== File Operations ======

// Mở file
ipcMain.handle('open-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Text Files', extensions: ['txt', 'md', 'js', 'html', 'css', 'json'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  })
  if (!result.canceled && result.filePaths.length > 0) {
    currentFilePath = result.filePaths[0]
    const content = fs.readFileSync(currentFilePath, 'utf-8')
    return { filePath: currentFilePath, content }
  }
  return null
})

// Lưu file
ipcMain.handle('save-file', async (event, content) => {
  if (currentFilePath) {
    fs.writeFileSync(currentFilePath, content, 'utf-8')
    return { filePath: currentFilePath }
  }
  return await saveFileAs(content)
})

// Lưu file mới (Save As)
ipcMain.handle('save-file-as', async (event, content) => {
  return await saveFileAs(content)
})

async function saveFileAs(content) {
  const result = await dialog.showSaveDialog(mainWindow, {
    filters: [
      { name: 'Text Files', extensions: ['txt'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  })
  if (!result.canceled) {
    currentFilePath = result.filePath
    fs.writeFileSync(currentFilePath, content, 'utf-8')
    return { filePath: currentFilePath }
  }
  return null
}

// ====== Window Controls ======
ipcMain.handle('window-minimize', () => {
  mainWindow.minimize()
})

ipcMain.handle('window-maximize', () => {
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize()
  } else {
    mainWindow.maximize()
  }
})

ipcMain.handle('window-close', () => {
  mainWindow.close()
})

ipcMain.handle('window-is-maximized', () => {
  return mainWindow.isMaximized()
})

// ====== Auto Updater ======
ipcMain.handle('check-for-update', () => {
  autoUpdater.checkForUpdates()
})

ipcMain.handle('start-download', () => {
  autoUpdater.downloadUpdate()
})

ipcMain.handle('quit-and-install', () => {
  autoUpdater.quitAndInstall(false, true)
})

ipcMain.handle('get-app-version', () => {
  return app.getVersion()
})

function setupAutoUpdater() {
  autoUpdater.on('checking-for-update', () => {
    sendToRenderer('update-status', { status: 'checking' })
  })

  autoUpdater.on('update-available', (info) => {
    sendToRenderer('update-status', {
      status: 'available',
      version: info.version,
      releaseNotes: info.releaseNotes || ''
    })
  })

  autoUpdater.on('update-not-available', () => {
    sendToRenderer('update-status', { status: 'up-to-date' })
  })

  autoUpdater.on('download-progress', (progress) => {
    sendToRenderer('update-status', {
      status: 'downloading',
      percent: Math.round(progress.percent),
      transferred: progress.transferred,
      total: progress.total,
      bytesPerSecond: progress.bytesPerSecond
    })
  })

  autoUpdater.on('update-downloaded', () => {
    sendToRenderer('update-status', { status: 'downloaded' })
  })

  autoUpdater.on('error', (err) => {
    sendToRenderer('update-status', {
      status: 'error',
      message: err.message
    })
  })
}

function sendToRenderer(channel, data) {
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send(channel, data)
  }
}

// ====== App Lifecycle ======
app.whenReady().then(() => {
  createWindow()
  setupAutoUpdater()

  // Check for updates 3 seconds after launch
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(() => {})
  }, 3000)

  mainWindow.on('maximize', () => {
    sendToRenderer('window-state-changed', { isMaximized: true })
  })

  mainWindow.on('unmaximize', () => {
    sendToRenderer('window-state-changed', { isMaximized: false })
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})