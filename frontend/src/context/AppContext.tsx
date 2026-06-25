import React, { createContext, useContext, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { seedLocalDbIfEmpty } from '../db/localDb';

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

export type BusinessType = 'restaurant' | 'pharmacy' | 'retail' | 'wholesale' | 'warehouse';

export interface AppUser {
  id: string;
  username: string;
  displayName: string;
  role: 'owner' | 'manager' | 'cashier';
  password: string; // stored as plain-text (local offline app; bcrypt optional later)
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
  // Receipt customization
  storePhone: string;
  setStorePhone: (v: string) => void;
  storeAddress: string;
  setStoreAddress: (v: string) => void;
  receiptFooter: string;
  setReceiptFooter: (v: string) => void;
  storeLogo: string; // base64
  setStoreLogo: (v: string) => void;
  // User management
  users: AppUser[];
  addUser: (u: Omit<AppUser, 'id'>) => void;
  updateUser: (id: string, changes: Partial<AppUser>) => void;
  deleteUser: (id: string) => void;
  currentUser: AppUser | null;
  loginUser: (username: string, password: string) => boolean;
  logoutUser: () => void;
  // Shift management
  activeShift: ShiftRecord | null;
  openShift: (startCash: number) => void;
  closeShift: (endCash: number, totalSales: number, totalOrders: number) => ShiftRecord;
  shiftHistory: ShiftRecord[];
}

const defaultBranches: Branch[] = [
  { id: 'br_riyadh_main', name_en: 'Riyadh Main Branch', name_ar: 'فرع الرياض الرئيسي', location: 'Olaya, Riyadh' },
  { id: 'br_jeddah_mall', name_en: 'Jeddah Mall Branch', name_ar: 'فرع جدة مول', location: 'Tahlia St, Jeddah' }
];

const defaultWarehouses: Warehouse[] = [
  { id: 'wh_riyadh_1', name_en: 'Riyadh Primary Warehouse', name_ar: 'مستودع الرياض الأول', branch_id: 'br_riyadh_main' },
  { id: 'wh_riyadh_2', name_en: 'Riyadh Secondary Pharmacy Depot', name_ar: 'مستودع صيدلية الرياض', branch_id: 'br_riyadh_main' },
  { id: 'wh_jeddah_1', name_en: 'Jeddah Warehouse A', name_ar: 'مستودع جدة (أ)', branch_id: 'br_jeddah_mall' }
];

const DEFAULT_USERS: AppUser[] = [
  { id: 'u_owner', username: 'owner', displayName: 'المالك', role: 'owner', password: 'owner123', active: true },
  { id: 'u_manager', username: 'manager', displayName: 'المدير', role: 'manager', password: 'manager123', active: true },
  { id: 'u_cashier', username: 'cashier', displayName: 'الكاشير', role: 'cashier', password: 'cashier123', active: true },
];

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { i18n } = useTranslation();
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('theme') as 'light' | 'dark') || 'dark');
  const [language, setLanguage] = useState<string>(i18n.language || 'ar');
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [selectedBranch, setSelectedBranchState] = useState<Branch>(defaultBranches[0]);
  const [selectedWarehouse, setSelectedWarehouseState] = useState<Warehouse>(defaultWarehouses[0]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [businessType, setBusinessTypeState] = useState<BusinessType | null>(() => (localStorage.getItem('businessType') as BusinessType | null) || null);
  const [devices, setDevices] = useState({ scanner: true, printer: true, scale: true, drawer: true });

  // Store settings
  const [currency, setCurrencyState] = useState<string>(() => localStorage.getItem('pos_store_currency') || 'SAR');
  const [taxPercentage, setTaxPercentageState] = useState<number>(() => { const s = localStorage.getItem('pos_store_tax'); return s !== null ? parseFloat(s) : 15; });
  const [storeName, setStoreNameState] = useState<string>(() => localStorage.getItem('pos_store_name') || 'smart POS Store');
  const [vatNumber, setVatNumberState] = useState<string>(() => localStorage.getItem('pos_store_vat') || '300012345600003');

  // Receipt customization
  const [storePhone, setStorePhoneState] = useState<string>(() => localStorage.getItem('pos_store_phone') || '');
  const [storeAddress, setStoreAddressState] = useState<string>(() => localStorage.getItem('pos_store_address') || '');
  const [receiptFooter, setReceiptFooterState] = useState<string>(() => localStorage.getItem('pos_receipt_footer') || 'شكراً لزيارتكم • Thank you for your visit');
  const [storeLogo, setStoreLogoState] = useState<string>(() => localStorage.getItem('pos_store_logo') || '');

  // User management
  const [users, setUsers] = useState<AppUser[]>(() => {
    try {
      const saved = localStorage.getItem('pos_users');
      return saved ? JSON.parse(saved) : DEFAULT_USERS;
    } catch (e) {
      return DEFAULT_USERS;
    }
  });

  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => {
    try {
      const saved = localStorage.getItem('pos_current_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  // Shift management
  const [activeShift, setActiveShift] = useState<ShiftRecord | null>(() => {
    try {
      const s = localStorage.getItem('pos_active_shift');
      return s ? JSON.parse(s) : null;
    } catch (e) {
      return null;
    }
  });
  const [shiftHistory, setShiftHistory] = useState<ShiftRecord[]>(() => {
    try {
      const s = localStorage.getItem('pos_shift_history');
      return s ? JSON.parse(s) : [];
    } catch (e) {
      return [];
    }
  });

  // ── Effects ──────────────────────────────────────────────────────────────
  useEffect(() => {
    seedLocalDbIfEmpty();
    const root = window.document.documentElement;
    if (theme === 'dark') root.classList.add('dark'); else root.classList.remove('dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const up = () => { setIsOnline(true); triggerLocalSync(); };
    const down = () => setIsOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down); };
  }, []);

  // Persist users list
  useEffect(() => { localStorage.setItem('pos_users', JSON.stringify(users)); }, [users]);

  // ── Actions ──────────────────────────────────────────────────────────────
  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');
  const changeLanguage = (lng: string) => { i18n.changeLanguage(lng); setLanguage(lng); };
  const setSelectedBranch = (branch: Branch) => { setSelectedBranchState(branch); const mw = defaultWarehouses.find(w => w.branch_id === branch.id); if (mw) setSelectedWarehouseState(mw); };
  const setSelectedWarehouse = (wh: Warehouse) => setSelectedWarehouseState(wh);
  const toggleDevice = (device: 'scanner' | 'printer' | 'scale' | 'drawer') => setDevices(prev => ({ ...prev, [device]: !prev[device] }));
  const setBusinessType = (type: BusinessType | null) => { setBusinessTypeState(type); type ? localStorage.setItem('businessType', type) : localStorage.removeItem('businessType'); };

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
    const newUser: AppUser = { ...u, id: 'u_' + Math.random().toString(36).substr(2, 9) };
    setUsers(prev => [...prev, newUser]);
  };
  const updateUser = (id: string, changes: Partial<AppUser>) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...changes } : u));
    // Update currentUser if it's the logged-in user
    if (currentUser && currentUser.id === id) {
      const updated = { ...currentUser, ...changes };
      setCurrentUser(updated as AppUser);
      localStorage.setItem('pos_current_user', JSON.stringify(updated));
    }
  };
  const deleteUser = (id: string) => {
    if (users.filter(u => u.active).length <= 1) return; // always keep at least one
    setUsers(prev => prev.filter(u => u.id !== id));
  };

  const loginUser = (username: string, password: string): boolean => {
    const found = users.find(u => u.username.toLowerCase() === username.toLowerCase().trim() && u.password === password.trim() && u.active);
    if (found) {
      setCurrentUser(found);
      localStorage.setItem('pos_current_user', JSON.stringify(found));
      return true;
    }
    return false;
  };

  const logoutUser = () => { setCurrentUser(null); localStorage.removeItem('pos_current_user'); };

  // Shift management
  const openShift = (startCash: number) => {
    const shift: ShiftRecord = {
      id: 'sh_' + Date.now(),
      userId: currentUser?.id || 'unknown',
      startTime: new Date().toISOString(),
      startCash,
    };
    setActiveShift(shift);
    localStorage.setItem('pos_active_shift', JSON.stringify(shift));
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
    localStorage.removeItem('pos_active_shift');
    const updated = [closed, ...shiftHistory].slice(0, 50); // keep last 50
    setShiftHistory(updated);
    localStorage.setItem('pos_shift_history', JSON.stringify(updated));
    return closed;
  };

  // Sync engine
  const triggerLocalSync = async () => {
    if (!navigator.onLine) return;
    setIsSyncing(true);
    await new Promise(resolve => setTimeout(resolve, 1200));
    const { db } = await import('../db/localDb');
    const queue = await db.offlineQueue.toArray();
    if (queue.length > 0) {
      await db.offlineQueue.clear();
      await db.orders.where('is_synced').equals(0).modify({ is_synced: 1 });
    }
    setIsSyncing(false);
  };

  return (
    <AppContext.Provider value={{
      theme, toggleTheme, language, changeLanguage, isOnline,
      selectedBranch, setSelectedBranch, selectedWarehouse, setSelectedWarehouse,
      branches: defaultBranches, warehouses: defaultWarehouses,
      devices, toggleDevice, triggerLocalSync, isSyncing,
      businessType, setBusinessType,
      currency, setCurrency, taxPercentage, setTaxPercentage,
      storeName, setStoreName, vatNumber, setVatNumber,
      storePhone, setStorePhone, storeAddress, setStoreAddress,
      receiptFooter, setReceiptFooter, storeLogo, setStoreLogo,
      users, addUser, updateUser, deleteUser,
      currentUser, loginUser, logoutUser,
      activeShift, openShift, closeShift, shiftHistory,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
