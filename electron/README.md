# Antigravity POS Desktop Wrapper (Electron)

This folder contains the Electron desktop shell that wraps the Vite frontend.

## How to Build the Desktop App

### Prerequisites
1. Install Node.js 18+ from https://nodejs.org
2. From the **root** folder (`cashier system/`), run:

```bash
# Install root-level Electron dependencies
npm install

# Build the frontend (Vite production bundle)
npm run build:frontend

# Package as a Windows installer (.exe)
npm run build:all
```

The built installer will appear in: `dist-electron/`

### Quick Launch (without building installer)
```bash
# First build the frontend once
npm run build:frontend

# Then launch directly via Electron
npm start
```

## Development Mode (Hot Reload)
Open two terminals:

**Terminal 1** – Run the frontend dev server:
```bash
npm run dev-frontend
```

**Terminal 2** – Run the backend:
```bash
npm run dev-backend
```

Then open http://localhost:5173 in Chrome/Edge for development (no Electron needed).

## App Icon
Place your icon files at:
- `electron/assets/icon.ico`  (Windows)
- `electron/assets/icon.icns` (macOS)
- `electron/assets/icon.png`  (Linux, 512x512)

Then uncomment the `icon` line in `electron/main.js`.

## Default Login Credentials
| Username | Password    | Role    |
|----------|-------------|---------|
| owner    | owner123    | Owner   |
| manager  | manager123  | Manager |
| cashier  | cashier123  | Cashier |

> ⚠️ Change these before production deployment!
