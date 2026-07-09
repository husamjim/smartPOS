/**
 * auditLogger.ts — Centralized Audit Trail System
 * Logs all significant user actions to IndexedDB (auditLog table).
 */

export interface AuditEntry {
  id?: number;          // auto-increment
  timestamp: string;    // ISO 8601
  user: string;         // username
  role: string;         // owner | manager | cashier
  action: string;       // LOGIN, LOGOUT, CREATE_INVOICE, etc.
  entity: string;       // orders, products, users, settings, etc.
  entityId?: string;    // the affected record ID
  details: string;      // human-readable description (AR or EN)
  branch: string;       // branch name or ID
  result: 'success' | 'failure' | 'warning';
  device?: string;      // browser userAgent short
  sessionId?: string;   // session identifier
}

// Action constants for type safety
export const AUDIT_ACTIONS = {
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  CREATE_USER: 'CREATE_USER',
  UPDATE_USER: 'UPDATE_USER',
  DELETE_USER: 'DELETE_USER',
  CREATE_INVOICE: 'CREATE_INVOICE',
  UPDATE_INVOICE: 'UPDATE_INVOICE',
  DELETE_INVOICE: 'DELETE_INVOICE',
  CREATE_PRODUCT: 'CREATE_PRODUCT',
  UPDATE_PRODUCT: 'UPDATE_PRODUCT',
  DELETE_PRODUCT: 'DELETE_PRODUCT',
  UPDATE_PRICE: 'UPDATE_PRICE',
  INVENTORY_COUNT: 'INVENTORY_COUNT',
  OPEN_DRAWER: 'OPEN_DRAWER',
  OPEN_SHIFT: 'OPEN_SHIFT',
  CLOSE_SHIFT: 'CLOSE_SHIFT',
  BACKUP_CREATE: 'BACKUP_CREATE',
  BACKUP_RESTORE: 'BACKUP_RESTORE',
  IMPORT_DATA: 'IMPORT_DATA',
  CHANGE_SETTINGS: 'CHANGE_SETTINGS',
  CREATE_CUSTOMER: 'CREATE_CUSTOMER',
  UPDATE_CUSTOMER: 'UPDATE_CUSTOMER',
  DELETE_CUSTOMER: 'DELETE_CUSTOMER',
  CREATE_SUPPLIER: 'CREATE_SUPPLIER',
  UPDATE_SUPPLIER: 'UPDATE_SUPPLIER',
  DELETE_SUPPLIER: 'DELETE_SUPPLIER',
  REFUND: 'REFUND',
} as const;

export type AuditAction = typeof AUDIT_ACTIONS[keyof typeof AUDIT_ACTIONS];

// Short device descriptor
function getDeviceInfo(): string {
  const ua = navigator.userAgent;
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Safari')) return 'Safari';
  if (ua.includes('Edge')) return 'Edge';
  return 'Browser';
}

// Get or create session ID
function getSessionId(): string {
  let sid = sessionStorage.getItem('pos_session_id');
  if (!sid) {
    sid = Math.random().toString(36).slice(2, 10).toUpperCase();
    sessionStorage.setItem('pos_session_id', sid);
  }
  return sid;
}

class AuditLoggerService {
  private queue: AuditEntry[] = [];
  private flushing = false;

  async log(
    action: string,
    entity: string,
    details: string,
    result: 'success' | 'failure' | 'warning' = 'success',
    entityId?: string
  ): Promise<void> {
    // Read current user from sessionStorage
    let user = 'system';
    let role = 'system';
    let branch = 'main';
    try {
      const u = JSON.parse(sessionStorage.getItem('pos_current_user') || '{}');
      user = u.username || 'system';
      role = u.role || 'system';
    } catch { /* ignore */ }
    try {
      const b = JSON.parse(localStorage.getItem('pos_selected_branch') || '{}');
      branch = b.name_ar || b.name_en || 'main';
    } catch { /* ignore */ }

    const entry: AuditEntry = {
      timestamp: new Date().toISOString(),
      user,
      role,
      action,
      entity,
      entityId,
      details,
      branch,
      result,
      device: getDeviceInfo(),
      sessionId: getSessionId(),
    };

    this.queue.push(entry);
    if (!this.flushing) {
      this.flush();
    }
  }

  private async flush(): Promise<void> {
    this.flushing = true;
    try {
      const { db } = await import('../db/localDb');
      while (this.queue.length > 0) {
        const entry = this.queue.shift()!;
        await (db as any).auditLog?.add(entry).catch(() => {
          // DB table not yet available, store in localStorage fallback
          const fallback = JSON.parse(localStorage.getItem('pos_audit_fallback') || '[]');
          fallback.push(entry);
          // Keep only last 500 entries in localStorage fallback
          if (fallback.length > 500) fallback.splice(0, fallback.length - 500);
          localStorage.setItem('pos_audit_fallback', JSON.stringify(fallback));
        });
      }
    } catch {
      // Silently fail — audit should never break the app
    }
    this.flushing = false;
  }
}

export const AuditLogger = new AuditLoggerService();
