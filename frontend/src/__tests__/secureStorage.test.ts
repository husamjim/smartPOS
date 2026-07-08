import { describe, it, expect, beforeAll, vi } from 'vitest';
import { 
  encryptData, 
  decryptData, 
  setSecureSessionItem, 
  getSecureSessionItem,
  setSecureLocalItem,
  getSecureLocalItem
} from '../services/secureStorage';

describe('SecureStorage Encryption Helper Tests', () => {
  beforeAll(() => {
    // Setup simple mock session storage if needed (JSDOM handles it)
    sessionStorage.clear();
  });

  it('should encrypt and decrypt string data correctly', async () => {
    const originalText = 'Secret POS Credentials 123';
    const encrypted = await encryptData(originalText);
    expect(encrypted).toBeDefined();
    expect(encrypted).not.toBe(originalText);

    const decrypted = await decryptData(encrypted);
    expect(decrypted).toBe(originalText);
  });

  it('should successfully store and retrieve items from secure session storage', async () => {
    const payload = { userId: 'u_test_999', role: 'admin', active: true };
    await setSecureSessionItem('test_key', payload);

    const retrieved = await getSecureSessionItem<typeof payload>('test_key');
    expect(retrieved).toEqual(payload);
  });

  it('should successfully store and retrieve items from secure local storage', async () => {
    const payload = { branchId: 'br_riyadh_2', name: 'Riyadh Branch' };
    await setSecureLocalItem('local_test_key', payload);

    const retrieved = await getSecureLocalItem<typeof payload>('local_test_key');
    expect(retrieved).toEqual(payload);
  });

  it('should fallback to base64 when encryption fails', async () => {
    const originalEncrypt = crypto.subtle.encrypt;
    crypto.subtle.encrypt = vi.fn().mockRejectedValue(new Error('Mock Crypto Error'));

    const originalText = 'Fallback Text';
    const encrypted = await encryptData(originalText);
    expect(encrypted).toBe(btoa(unescape(encodeURIComponent(originalText))));

    crypto.subtle.encrypt = originalEncrypt;
  });

  it('should fallback to base64 decode when decryption fails', async () => {
    const originalDecrypt = crypto.subtle.decrypt;
    crypto.subtle.decrypt = vi.fn().mockRejectedValue(new Error('Mock Decrypt Error'));

    const originalText = 'Fallback Text';
    const encrypted = btoa(unescape(encodeURIComponent(originalText)));
    const decrypted = await decryptData(encrypted);
    expect(decrypted).toBe(originalText);

    crypto.subtle.decrypt = originalDecrypt;
  });

  it('should handle JSON parse failures in session storage fetch', async () => {
    sessionStorage.setItem('malformed_key', 'malformed_hex_or_base64');
    const retrieved = await getSecureSessionItem('malformed_key');
    expect(retrieved).toBeNull();
  });

  it('should handle JSON parse failures in local storage fetch', async () => {
    localStorage.setItem('malformed_key', 'malformed_hex_or_base64');
    const retrieved = await getSecureLocalItem('malformed_key');
    expect(retrieved).toBeNull();
  });
});
