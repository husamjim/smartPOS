/**
 * preload.js — Electron Preload Script
 * 
 * Runs in renderer context but has access to Node APIs.
 * Exposes only specific safe APIs to the renderer via contextBridge.
 * 
 * SECURITY: Never expose require() or any Node APIs directly.
 */

const { contextBridge, ipcRenderer } = require('electron');

// Log that preload loaded successfully
console.log('[PRELOAD] Preload script loaded successfully');

// Expose a safe, minimal API to the renderer (window.electronAPI)
contextBridge.exposeInMainWorld('electronAPI', {
  // Send an error from renderer to main (for disk logging)
  reportError: (message, stack, source) => {
    ipcRenderer.send('renderer-error', { message, stack, source });
  },

  // Get the path to the log file
  getLogFilePath: () => ipcRenderer.invoke('get-log-file'),

  // Open the log file in the system's default text editor
  openLogFile: () => ipcRenderer.invoke('open-log-file'),

  // Platform info
  platform: process.platform,
  isElectron: true,
});

// Report preload loaded to main process (for log)
ipcRenderer.send('renderer-error', {
  message: 'PRELOAD OK — contextBridge initialized',
  stack: '',
  source: 'preload.js'
});
