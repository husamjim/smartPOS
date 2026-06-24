/**
 * Antigravity POS – Electron Desktop Main Process
 * Loads the Vite-built frontend from ./frontend/dist
 * Works 100% offline after first build.
 */

const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('path');

// Prevent multiple instances
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
}

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 640,
    title: 'Antigravity POS',
    // icon: path.join(__dirname, 'assets/icon.png'), // Uncomment after adding icon.png
    backgroundColor: '#0f172a', // dark slate background
    show: false, // don't show until ready-to-show
    webPreferences: {
      nodeIntegration: false,        // Security: no direct Node API in renderer
      contextIsolation: true,        // Security: isolate preload script
      sandbox: false,                // Allow WebUSB and Web Serial
      // preload: path.join(__dirname, 'preload.js'),
    },
  });

  // Load the built frontend
  const indexPath = path.join(__dirname, '..', 'frontend', 'dist', 'index.html');
  mainWindow.loadFile(indexPath);

  // Show window gracefully once ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (process.env.NODE_ENV === 'development') {
      mainWindow.webContents.openDevTools();
    }
  });

  // Open external links in system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Handle second instance (focus existing window)
app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

// Remove default menu bar (POS apps don't need it)
Menu.setApplicationMenu(null);

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  // On macOS it's common to keep app running
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
