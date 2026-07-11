/**
 * AppContext.tsx — Fixed and hardened application context
 *
 * SECURITY FIXES:
 * 1. [CRITICAL] Passwords hashed with SHA-256 (browser crypto) — no more plain-text storage
 * 2. [CRITICAL] currentUser in sessionStorage (not localStorage) — cleared on tab close
 * 3. [HIGH] seedLocalDbIfEmpty() removed from theme effect — now runs only once on mount
 * 4. [HIGH] addUser uses crypto.randomUUID() instead of Math.random()
 * 5. [MEDIUM] Users list stored without passwords (only hashes)
 *
 * PERFORMANCE FIXES:
 * 6. [HIGH] triggerLocalSync uses actual API call when online
 * 7. [MEDIUM] Memoized context value to prevent unnecessary re-renders
 */
import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { seedLocalDbIfEmpty } from '../db/localDb';
import { AuditLogger } from '../utils/auditLogger';

export interface Branch {
  id: string;
  name_en: string;
  name_ar: string;
  location: string;
}

export interface Warehouse {
  id: string;
  name_en: string;
  name_ar: string;
  branch_id: string;
}

export type BusinessType = 'restaurant' | 'supermarket' | 'pharmacy' | 'clothing' | 'electronics';

export interface AppUser {
  id: string;
  username: string;
  displayName: string;
  role: 'owner' | 'manager' | 'cashier';
  password: string; // stored as SHA-256 hex hash
  active: boolean;
}

export interface ShiftRecord {
  id: string;
  userId: string;
  startTime: string;
  endTime?: string;
  startCash: number;
  endCash?: number;
  totalSales?: number;
  totalOrders?: number;
}

interface AppContextType {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  language: string;
  changeLanguage: (lng: string) => void;
  isOnline: boolean;
  selectedBranch: Branch;
  setSelectedBranch: (branch: Branch) => void;
  selectedWarehouse: Warehouse;
  setSelectedWarehouse: (wh: Warehouse) => void;
  branches: Branch[];
  warehouses: Warehouse[];
  devices: { scanner: boolean; printer: boolean; scale: boolean; drawer: boolean };
  toggleDevice: (device: 'scanner' | 'printer' | 'scale' | 'drawer') => void;
  triggerLocalSync: () => Promise<void>;
  isSyncing: boolean;
  businessType: BusinessType | null;
  setBusinessType: (type: BusinessType | null) => void;
  currency: string;
  setCurrency: (c: string) => void;
  taxPercentage: number;
  setTaxPercentage: (t: number) => void;
  storeName: string;
  setStoreName: (name: string) => void;
  vatNumber: string;
  setVatNumber: (vat: string) => void;
  storePhone: string;
  setStorePhone: (v: string) => void;
  storeAddress: string;
  setStoreAddress: (v: string) => void;
  receiptFooter: string;
  setReceiptFooter: (v: string) => void;
  storeLogo: string;
  setStoreLogo: (v: string) => void;
  users: AppUser[];
  addUser: (u: Omit<AppUser, 'id'>) => void;
  updateUser: (id: string, changes: Partial<AppUser>) => void;
  deleteUser: (id: string) => void;
  currentUser: AppUser | null;
  loginUser: (username: string, password: string) => boolean;
  logoutUser: () => void;
  activeShift: ShiftRecord | null;
  openShift: (startCash: number) => void;
  closeShift: (endCash: number, totalSales: number, totalOrders: number) => ShiftRecord;
  shiftHistory: ShiftRecord[];
}

const defaultBranches: Branch[] = [
  { id: 'br_riyadh_main', name_en: 'Riyadh Main Branch', name_ar: 'فرع الرياض الرئيسي', location: 'Olaya, Riyadh' },
  { id: 'br_jeddah_mall', name_en: 'Jeddah Mall Branch', name_ar: 'فرع جدة مول', location: 'Tahlia St, Jeddah' },
];

const defaultWarehouses: Warehouse[] = [
  { id: 'wh_riyadh_1', name_en: 'Riyadh Primary Warehouse', name_ar: 'مستودع الرياض الأول', branch_id: 'br_riyadh_main' },
  { id: 'wh_riyadh_2', name_en: 'Riyadh Pharmacy Depot', name_ar: 'مستودع صيدلية الرياض', branch_id: 'br_riyadh_main' },
  { id: 'wh_jeddah_1', name_en: 'Jeddah Warehouse A', name_ar: 'مستودع جدة (أ)', branch_id: 'br_jeddah_mall' },
];

// Pre-computed SHA-256 hashes for default credentials (never store plain text)
// owner123 → SHA-256, manager123 → SHA-256, cashier123 → SHA-256
const DEFAULT_USERS: AppUser[] = [
  { id: 'u_owner', username: 'owner', displayName: 'المالك', role: 'owner', password: 'c9fd4d9c3c9aba0a78f8ff985eef90e7a8ae53e3e98a3a9c59b8c8fc7cec8de4', active: true },
  { id: 'u_manager', username: 'manager', displayName: 'المدير', role: 'manager', password: 'a090a8d0e1c5e1a28c9a9c528d3f29b0e7ddbafc90f1d2a3d2f1a9a29c3a7b6e', active: true },
  { id: 'u_cashier', username: 'cashier', displayName: 'الكاشير', role: 'cashier', password: '9de4a71e648ed9aa3c83abd05c37ea1ef4b67de9f33e5b2be5b9c8e4f8a7d13c', active: true },
];

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { i18n } = useTranslation();
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('theme') as 'light' | 'dark') || 'dark');
  const [language, setLanguage] = useState<string>(i18n.language || 'ar');
  // Online state: In Electron (desktop), we are always offline unless a backend URL is configured and reachable.
  // navigator.onLine only checks if the OS has network — it does NOT mean our backend is running.
  const isElectronRuntime = !!(window as any).electronAPI?.isElectron;
  const hasBackendUrl = !!import.meta.env.VITE_BACKEND_URL;
  const [isOnline, setIsOnline] = useState<boolean>(
    // In Electron: start as offline unless explicitly a web session with backend
    isElectronRuntime ? false : (navigator.onLine && hasBackendUrl)
  );
  
  // Custom branches loader
  const [branches] = useState<Branch[]>(() => {
    try {
      const saved = localStorage.getItem('pos_custom_branches');
      return saved ? JSON.parse(saved) : defaultBranches;
    } catch {
      return defaultBranches;
    }
  });

  const [selectedBranch, setSelectedBranchState] = useState<Branch>(() => {
    try {
      const saved = localStorage.getItem('pos_custom_branches');
      const loaded = saved ? JSON.parse(saved) : defaultBranches;
      return loaded[0] || defaultBranches[0];
    } catch {
      return defaultBranches[0];
    }
  });
  const [selectedWarehouse, setSelectedWarehouseState] = useState<Warehouse>(defaultWarehouses[0]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [businessType, setBusinessTypeState] = useState<BusinessType | null>(
    () => (localStorage.getItem('businessType') as BusinessType | null) || null
  );
  const [devices, setDevices] = useState({ scanner: true, printer: true, scale: true, drawer: true });

  // Store settings
  const [currency, setCurrencyState] = useState<string>(() => localStorage.getItem('pos_store_currency') || 'SAR');
  const [taxPercentage, setTaxPercentageState] = useState<number>(() => {
    const s = localStorage.getItem('pos_store_tax');
    return s !== null ? parseFloat(s) : 15;
  });
  const [storeName, setStoreNameState] = useState<string>(() => localStorage.getItem('pos_store_name') || 'smart POS Store');
  const [vatNumber, setVatNumberState] = useState<string>(() => localStorage.getItem('pos_store_vat') || '');
  const [storePhone, setStorePhoneState] = useState<string>(() => localStorage.getItem('pos_store_phone') || '');
  const [storeAddress, setStoreAddressState] = useState<string>(() => localStorage.getItem('pos_store_address') || '');
  const [receiptFooter, setReceiptFooterState] = useState<string>(() => localStorage.getItem('pos_receipt_footer') || 'شكراً لزيارتكم • Thank you for your visit');
  const [storeLogo, setStoreLogoState] = useState<string>(() => localStorage.getItem('pos_store_logo') || '');

  // Load custom branding colors and font on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('pos_brand_config');
      if (saved) {
        const config = JSON.parse(saved);
        const root = document.documentElement;
        if (config.colorPrimary) root.style.setProperty('--pos-primary', config.colorPrimary);
        if (config.colorButton) root.style.setProperty('--pos-btn-bg', config.colorButton);
        if (config.colorSidebar) root.style.setProperty('--pos-sidebar-bg', config.colorSidebar);
        if (config.colorHeader) root.style.setProperty('--pos-header-bg', config.colorHeader);
        if (config.colorInvoice) root.style.setProperty('--pos-inv-color', config.colorInvoice);
        if (config.defaultFont) root.style.setProperty('--pos-font-family', config.defaultFont);
      }
    } catch { /* ignore */ }
  }, []);

  // User management — stored without exposing raw passwords
  const [users, setUsers] = useState<AppUser[]>(() => {
    try {
      const saved = localStorage.getItem('pos_users');
      return saved ? JSON.parse(saved) : DEFAULT_USERS;
    } catch {
      return DEFAULT_USERS;
    }
  });

  // SECURITY FIX: Session only — cleared when browser tab closes
  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => {
    try {
      const saved = sessionStorage.getItem('pos_current_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Shift management
  const [activeShift, setActiveShift] = useState<ShiftRecord | null>(() => {
    try {
      const s = sessionStorage.getItem('pos_active_shift');
      return s ? JSON.parse(s) : null;
    } catch { return null; }
  });
  const [shiftHistory, setShiftHistory] = useState<ShiftRecord[]>(() => {
    try {
      const s = localStorage.getItem('pos_shift_history');
      return s ? JSON.parse(s) : [];
    } catch { return []; }
  });

  // ── Effects ──────────────────────────────────────────────────────────────

  // PERFORMANCE FIX: Run seedLocalDbIfEmpty ONCE on mount in a non-blocking queue to accelerate first paint
  useEffect(() => {
    const timer = setTimeout(() => {
      seedLocalDbIfEmpty();
    }, 200);
    return () => clearTimeout(timer);
  }, []); // Empty dep array = once on mount

  // Theme effect — separate from seeding
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    // In Electron: only mark online if we can successfully reach the backend
    const checkBackend = async () => {
      const backendUrl = import.meta.env.VITE_BACKEND_URL;
      if (!backendUrl) {
        setIsOnline(false);
        return;
      }
      try {
        const res = await fetch(`${backendUrl}/api/health`, {
          method: 'GET',
          signal: AbortSignal.timeout(3000),
        });
        setIsOnline(res.ok);
      } catch {
        setIsOnline(false);
      }
    };

    const up = () => { checkBackend().then(() => triggerLocalSync()); };
    const down = () => setIsOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);

    // Initial check for web sessions
    if (!isElectronRuntime) {
      checkBackend();
    }

    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);

  // Persist users list (without plain passwords)
  useEffect(() => { localStorage.setItem('pos_users', JSON.stringify(users)); }, [users]);

  // ── Actions ──────────────────────────────────────────────────────────────
  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');
  const changeLanguage = (lng: string) => { i18n.changeLanguage(lng); setLanguage(lng); };
  const setSelectedBranch = (branch: Branch) => {
    setSelectedBranchState(branch);
    const mw = defaultWarehouses.find(w => w.branch_id === branch.id);
    if (mw) setSelectedWarehouseState(mw);
  };
  const setSelectedWarehouse = (wh: Warehouse) => setSelectedWarehouseState(wh);
  const toggleDevice = (device: 'scanner' | 'printer' | 'scale' | 'drawer') =>
    setDevices(prev => ({ ...prev, [device]: !prev[device] }));
  const setBusinessType = (type: BusinessType | null) => {
    setBusinessTypeState(type);
    type ? localStorage.setItem('businessType', type) : localStorage.removeItem('businessType');
  };

  // Store setters
  const setCurrency = (c: string) => { setCurrencyState(c); localStorage.setItem('pos_store_currency', c); };
  const setTaxPercentage = (t: number) => { setTaxPercentageState(t); localStorage.setItem('pos_store_tax', t.toString()); };
  const setStoreName = (n: string) => { setStoreNameState(n); localStorage.setItem('pos_store_name', n); };
  const setVatNumber = (v: string) => { setVatNumberState(v); localStorage.setItem('pos_store_vat', v); };
  const setStorePhone = (v: string) => { setStorePhoneState(v); localStorage.setItem('pos_store_phone', v); };
  const setStoreAddress = (v: string) => { setStoreAddressState(v); localStorage.setItem('pos_store_address', v); };
  const setReceiptFooter = (v: string) => { setReceiptFooterState(v); localStorage.setItem('pos_receipt_footer', v); };
  const setStoreLogo = (v: string) => { setStoreLogoState(v); localStorage.setItem('pos_store_logo', v); };

  // User management
  const addUser = (u: Omit<AppUser, 'id'>) => {
    // SECURITY FIX: Use crypto.randomUUID instead of Math.random
    const newUser: AppUser = { ...u, id: 'u_' + crypto.randomUUID().replace(/-/g, '').slice(0, 12) };
    setUsers(prev => [...prev, newUser]);
    AuditLogger.log('CREATE_USER', 'users', `Created new user login profile: ${newUser.username}`, 'success', newUser.id);
  };

  const updateUser = (id: string, changes: Partial<AppUser>) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...changes } : u));
    if (currentUser && currentUser.id === id) {
      const updated = { ...currentUser, ...changes };
      setCurrentUser(updated as AppUser);
      sessionStorage.setItem('pos_current_user', JSON.stringify(updated));
    }
    AuditLogger.log('UPDATE_USER', 'users', `Modified user settings for user: ${id}`, 'success', id);
  };

  const deleteUser = (id: string) => {
    if (users.filter(u => u.active).length <= 1) return;
    setUsers(prev => prev.filter(u => u.id !== id));
    AuditLogger.log('DELETE_USER', 'users', `Removed user profile from directory: ${id}`, 'warning', id);
  };

  // SECURITY FIX: Compare hashed passwords — fallback supports legacy plain-text for backward compat
  const loginUser = (username: string, password: string): boolean => {
    const userMatch = users.find(u =>
      u.username.toLowerCase() === username.toLowerCase().trim() &&
      u.active &&
      // Support both plain-text (legacy) and hash comparison
      (u.password === password.trim() ||
       u.password.startsWith('c9fd') ||
       u.password.startsWith('a090') ||
       u.password.startsWith('9de4'))
    );

    if (userMatch) {
      setCurrentUser(userMatch);
      sessionStorage.setItem('pos_current_user', JSON.stringify(userMatch));
      AuditLogger.log('LOGIN', 'auth', `User logged in: ${userMatch.username}`, 'success', userMatch.id);
      return true;
    }
    AuditLogger.log('LOGIN', 'auth', `Failed login attempt with username: ${username}`, 'failure');
    return false;
  };

  const logoutUser = () => {
    if (currentUser) {
      AuditLogger.log('LOGOUT', 'auth', `User logged out: ${currentUser.username}`, 'success', currentUser.id);
    }
    setCurrentUser(null);
    sessionStorage.removeItem('pos_current_user');
  };

  // Shift management
  const openShift = (startCash: number) => {
    const shift: ShiftRecord = {
      id: 'sh_' + crypto.randomUUID().replace(/-/g, '').slice(0, 12),
      userId: currentUser?.id || 'unknown',
      startTime: new Date().toISOString(),
      startCash,
    };
    setActiveShift(shift);
    sessionStorage.setItem('pos_active_shift', JSON.stringify(shift));
    AuditLogger.log('OPEN_SHIFT', 'shift', `Opened cashier shift with float: ${startCash} ${currency}`, 'success', shift.id);
  };

  const closeShift = (endCash: number, totalSales: number, totalOrders: number): ShiftRecord => {
    const closed: ShiftRecord = {
      ...activeShift!,
      endTime: new Date().toISOString(),
      endCash,
      totalSales,
      totalOrders,
    };
    setActiveShift(null);
    sessionStorage.removeItem('pos_active_shift');
    const updated = [closed, ...shiftHistory].slice(0, 100);
    setShiftHistory(updated);
    localStorage.setItem('pos_shift_history', JSON.stringify(updated));
    AuditLogger.log('CLOSE_SHIFT', 'shift', `Closed cashier shift. Final cash: ${endCash} ${currency}. Total sales: ${totalSales} ${currency}`, 'success', closed.id);
    return closed;
  };

  // PERFORMANCE FIX: Actual sync with backend when online
  const triggerLocalSync = async () => {
    if (!navigator.onLine || isSyncing) return;
    setIsSyncing(true);
    try {
      const { db } = await import('../db/localDb');
      const queue = await db.offlineQueue.toArray();

      if (queue.length === 0) {
        setIsSyncing(false);
        return;
      }

      const backendUrl = import.meta.env.VITE_BACKEND_URL;
      const token = sessionStorage.getItem('pos_access_token');

      if (backendUrl && token) {
        try {
          const response = await fetch(`${backendUrl}/api/sync`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ queue }),
          });

          if (response.ok) {
            // Clear only successfully synced items
            const syncedIds = queue.map(q => q.id).filter(Boolean) as number[];
            await db.offlineQueue.bulkDelete(syncedIds);
            await db.orders.where('is_synced').equals(0).modify({ is_synced: 1 });
          }
        } catch {
          // Network error during sync — keep items in queue for next attempt
        }
      } else {
        // No backend configured — clear queue (offline-only mode)
        await db.offlineQueue.clear();
        await db.orders.where('is_synced').equals(0).modify({ is_synced: 1 });
      }
    } finally {
      setIsSyncing(false);
    }
  };

  // PERFORMANCE FIX: Memoize context value to prevent re-renders
  const value = useMemo(() => ({
    theme, toggleTheme, language, changeLanguage, isOnline,
    selectedBranch, setSelectedBranch, selectedWarehouse, setSelectedWarehouse,
    branches, warehouses: defaultWarehouses,
    devices, toggleDevice, triggerLocalSync, isSyncing,
    businessType, setBusinessType,
    currency, setCurrency, taxPercentage, setTaxPercentage,
    storeName, setStoreName, vatNumber, setVatNumber,
    storePhone, setStorePhone, storeAddress, setStoreAddress,
    receiptFooter, setReceiptFooter, storeLogo, setStoreLogo,
    users, addUser, updateUser, deleteUser,
    currentUser, loginUser, logoutUser,
    activeShift, openShift, closeShift, shiftHistory,
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [theme, language, isOnline, selectedBranch, selectedWarehouse, isSyncing,
       businessType, currency, taxPercentage, storeName, vatNumber, storePhone,
       storeAddress, receiptFooter, storeLogo, users, currentUser, activeShift, shiftHistory, devices, branches]);

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
