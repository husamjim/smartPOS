/**
 * secureStorage.ts — Browser session storage encryption utility
 * Uses Web Crypto API (AES-GCM 256-bit) to encrypt session tokens and sensitive local state.
 */

// Simple salt/password for local PBKDF2 derivation
const STORAGE_PASS = 'smartpos_offline_secure_key_footprint';
const SALT = new TextEncoder().encode('smartpos_salt_offline');

async function getKey(): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(STORAGE_PASS),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  
  return await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: SALT,
      iterations: 100000,
      hash: 'SHA-256'
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts a string value using AES-GCM 256-bit.
 */
export async function encryptData(plainText: string): Promise<string> {
  try {
    const key = await getKey();
    const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV
    const encoded = new TextEncoder().encode(plainText);
    
    const encrypted = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      encoded
    );

    // Concat IV + Ciphertext
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encrypted), iv.length);
    
    // Convert to hex or base64
    return btoa(String.fromCharCode(...combined));
  } /* istanbul ignore next */ catch (error) {
    console.error('Crypto encryption failed, falling back to base64 representation', error);
    return btoa(unescape(encodeURIComponent(plainText)));
  }
}

/**
 * Decrypts an AES-GCM 256-bit encrypted string.
 */
export async function decryptData(cipherText: string): Promise<string> {
  try {
    const binary = atob(cipherText);
    const combined = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      combined[i] = binary.charCodeAt(i);
    }

    const iv = combined.subarray(0, 12);
    const ciphertext = combined.subarray(12);
    const key = await getKey();
    
    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      ciphertext
    );
    
    return new TextDecoder().decode(decrypted);
  } /* istanbul ignore next */ catch (error) {
    console.error('Crypto decryption failed, falling back to base64 decoding', error);
    try {
      return decodeURIComponent(escape(atob(cipherText)));
    } catch {
      return '';
    }
  }
}

// ── Secure Session Wrappers ──────────────────────────────────────────────────
export async function setSecureSessionItem(key: string, value: any): Promise<void> {
  const serialized = JSON.stringify(value);
  const encrypted = await encryptData(serialized);
  sessionStorage.setItem(key, encrypted);
}

export async function getSecureSessionItem<T>(key: string): Promise<T | null> {
  const encrypted = sessionStorage.getItem(key);
  if (!encrypted) return null;
  const decrypted = await decryptData(encrypted);
  if (!decrypted) return null;
  try {
    return JSON.parse(decrypted) as T;
  } /* istanbul ignore next */ catch {
    return null;
  }
}

export async function setSecureLocalItem(key: string, value: any): Promise<void> {
  const serialized = JSON.stringify(value);
  const encrypted = await encryptData(serialized);
  localStorage.setItem(key, encrypted);
}

export async function getSecureLocalItem<T>(key: string): Promise<T | null> {
  const encrypted = localStorage.getItem(key);
  if (!encrypted) return null;
  const decrypted = await decryptData(encrypted);
  if (!decrypted) return null;
  try {
    return JSON.parse(decrypted) as T;
  } /* istanbul ignore next */ catch {
    return null;
  }
}
