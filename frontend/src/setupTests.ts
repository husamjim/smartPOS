import '@testing-library/jest-dom';
import { vi } from 'vitest';

// ── Web Crypto API Polyfill for JSDOM ────────────────────────────────────────
if (!globalThis.crypto) {
  const nodeCrypto = require('crypto');
  globalThis.crypto = nodeCrypto.webcrypto as any;
}

// ── Mock MatchMedia ──────────────────────────────────────────────────────────
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// ── Mock HTML Canvas (for ChartJS/Barcodes) ──────────────────────────────────
HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
  fillRect: vi.fn(),
  clearRect: vi.fn(),
  getImageData: vi.fn(() => ({ data: new Uint8ClampedArray() })),
  putImageData: vi.fn(),
  createImageData: vi.fn(),
  setTransform: vi.fn(),
  drawImage: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  beginPath: vi.fn(),
  arc: vi.fn(),
  stroke: vi.fn(),
  translate: vi.fn(),
  scale: vi.fn(),
  rotate: vi.fn(),
  fillText: vi.fn(),
  measureText: vi.fn(() => ({ width: 0 })),
  transform: vi.fn(),
  rect: vi.fn(),
  clip: vi.fn(),
});

// ── Mock Dexie/IndexedDB ─────────────────────────────────────────────────────
// Mock global indexedDB to avoid Dexie throws in environment without IndexedDB
if (!globalThis.indexedDB) {
  const mockDB = {
    open: vi.fn().mockReturnValue({
      onupgradeneeded: null,
      onsuccess: null,
      onerror: null
    })
  };
  Object.defineProperty(globalThis, 'indexedDB', {
    value: mockDB,
    writable: true
  });
}
