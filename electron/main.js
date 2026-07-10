global.bootStartTime = Date.now();

const { app, BrowserWindow, Menu, shell, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

// ============================================================
// PROFESSIONAL STARTUP LOGGING
// Writes to a log file so we can debug production issues
// ============================================================
const logDir = path.join(app.getPath('userData'), 'logs');
let logFile;

function initLog() {
  try {
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
    const date = new Date().toISOString().slice(0, 10);
    logFile = path.join(logDir, `startup-${date}.log`);
    log('='.repeat(60));
    log(`smartPOS Started — ${new Date().toISOString()}`);
    log(`Platform: ${process.platform} ${os.release()}`);
    log(`Electron: ${process.versions.electron}`);
    log(`Node: ${process.versions.node}`);
    log(`App version: ${app.getVersion()}`);
    log('='.repeat(60));
  } catch (e) {
    console.error('[LOG INIT ERROR]', e);
  }
}

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  try {
    if (logFile) fs.appendFileSync(logFile, line + '\n');
  } catch (e) { /* ignore write errors */ }
}

initLog();
log(`STEP 1 — Boot start: ${global.bootStartTime}`);

// Prevent multiple instances
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  log('Second instance detected — quitting.');
  app.quit();
}

let mainWindow;

function createWindow() {
  log('STEP 3 — Creating BrowserWindow');

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 640,
    title: 'smart POS',
    backgroundColor: '#0f172a',
    show: false, // Don't show until ready-to-show fires
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // Build the correct path to the built frontend
  const indexPath = path.join(__dirname, '..', 'frontend', 'dist', 'index.html');
  log(`STEP 4 — Loading index from: ${indexPath}`);

  // Check the file actually exists before loading it
  if (!fs.existsSync(indexPath)) {
    const errMsg = `CRITICAL: index.html not found at: ${indexPath}`;
    log(errMsg);
    showCrashScreen(errMsg, indexPath);
    return;
  }

  const appReadyTime = global.appReadyTime || Date.now();
  const windowCreatedTime = Date.now();
  log(`STEP 4b — Window creation time: ${windowCreatedTime - appReadyTime}ms`);

  mainWindow.loadFile(indexPath, {
    query: {
      bootStart: String(global.bootStartTime || (appReadyTime - 120)),
      appReady: String(appReadyTime),
      windowCreated: String(windowCreatedTime),
      logFile: String(logFile || '')
    }
  });

  // ============================================================
  // TIMEOUT GUARD: If ready-to-show never fires, force show after 8s
  // This prevents invisible windows when React crashes on startup
  // ============================================================
  const showTimeout = setTimeout(() => {
    if (mainWindow && !mainWindow.isVisible()) {
      log('WARNING — ready-to-show timed out after 8s, forcing window visible');
      mainWindow.show();
    }
  }, 8000);

  mainWindow.once('ready-to-show', () => {
    clearTimeout(showTimeout);
    log(`STEP 5 — Window ready-to-show (Total main: ${Date.now() - global.bootStartTime}ms)`);
    mainWindow.show();
    // Only open DevTools in development (not in packaged build)
    if (!app.isPackaged) {
      mainWindow.webContents.openDevTools();
    }
  });

  mainWindow.webContents.on('did-finish-load', () => {
    log('STEP 6 — Renderer: did-finish-load fired');
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDesc, validatedURL) => {
    log(`ERROR — did-fail-load: [${errorCode}] ${errorDesc} (URL: ${validatedURL})`);
  });

  mainWindow.webContents.on('render-process-gone', (event, details) => {
    log(`CRASH — render-process-gone: reason=${details.reason} exitCode=${details.exitCode}`);
  });

  mainWindow.webContents.on('unresponsive', () => {
    log('WARNING — Renderer became unresponsive');
  });

  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    if (level >= 2) { // 2=warning, 3=error
      log(`RENDERER[${level === 3 ? 'ERROR' : 'WARN'}] ${message} (${sourceId}:${line})`);
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
    log('Window closed');
    mainWindow = null;
  });
}

// ============================================================
// IPC HANDLERS
// ============================================================

// Renderer can send errors to main process to be written to log
ipcMain.on('renderer-error', (event, { message, stack, source }) => {
  log(`RENDERER CRASH — ${message}`);
  log(`  Source: ${source}`);
  log(`  Stack: ${stack}`);
});

// Renderer can request the log file path
ipcMain.handle('get-log-file', () => logFile || null);

// Renderer can request to open the log file in Notepad
ipcMain.handle('open-log-file', () => {
  if (logFile && fs.existsSync(logFile)) {
    shell.openPath(logFile);
    return true;
  }
  return false;
});

// ============================================================
// CRASH SCREEN — shown if index.html is missing from the package
// ============================================================
function showCrashScreen(message, expectedPath) {
  const crashHtml = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>خطأ في التشغيل</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #0f172a; color: #f1f5f9; font-family: system-ui, sans-serif;
           display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .card { background: #1e293b; border: 1px solid #ef4444; border-radius: 16px;
            padding: 40px; max-width: 600px; width: 90%; text-align: center; }
    .icon { font-size: 64px; margin-bottom: 20px; }
    h1 { color: #ef4444; font-size: 22px; margin-bottom: 12px; }
    p { color: #94a3b8; margin-bottom: 8px; font-size: 14px; line-height: 1.6; }
    code { background: #0f172a; padding: 12px 16px; border-radius: 8px; display: block;
           margin: 16px 0; font-size: 12px; color: #fbbf24; text-align: left; word-break: break-all; }
    .btn { padding: 10px 24px; border-radius: 8px; border: none; cursor: pointer;
           font-size: 14px; font-weight: bold; margin: 8px; transition: opacity 0.2s; }
    .btn:hover { opacity: 0.8; }
    .btn-retry { background: #3b82f6; color: white; }
    .btn-log { background: #334155; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">⚠️</div>
    <h1>خطأ في تحميل التطبيق</h1>
    <p>لم يتم العثور على ملفات واجهة التطبيق.</p>
    <p>المسار المتوقع:</p>
    <code>${expectedPath.replace(/\\/g, '\\\\')}</code>
    <p style="color:#ef4444; font-weight:bold;">${message}</p>
    <div style="margin-top:24px;">
      <button class="btn btn-retry" onclick="location.reload()">إعادة المحاولة</button>
      <button class="btn btn-log" onclick="openLog()">فتح ملف السجل</button>
    </div>
  </div>
  <script>
    function openLog() {
      if (window.electronAPI && window.electronAPI.openLogFile) {
        window.electronAPI.openLogFile();
      }
    }
  </script>
</body>
</html>`;

  const tmpCrash = path.join(logDir, 'crash.html');
  try {
    fs.writeFileSync(tmpCrash, crashHtml);
    mainWindow.loadFile(tmpCrash);
    mainWindow.once('ready-to-show', () => mainWindow.show());
  } catch (e) {
    log(`Failed to show crash screen: ${e.message}`);
    mainWindow.show();
  }
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

app.whenReady().then(() => {
  global.appReadyTime = Date.now();
  log(`STEP 2 — app.whenReady() fired (${global.appReadyTime - global.bootStartTime}ms from boot)`);
  createWindow();
});

app.on('window-all-closed', () => {
  log('All windows closed');
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

process.on('uncaughtException', (error) => {
  log(`UNCAUGHT EXCEPTION: ${error.message}`);
  log(`Stack: ${error.stack}`);
});
