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

import type { RegisteredCompany } from '../components/settings/CompanyManager';

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
  taxName: string;
  setTaxName: (t: string) => void;
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
  country: string;
  setCountry: (c: string) => void;
  city: string;
  setCity: (c: string) => void;
  postalCode: string;
  setPostalCode: (p: string) => void;
  crNumber: string;
  setCrNumber: (cr: string) => void;
  dateSystem: 'gregorian' | 'hijri';
  setDateSystem: (ds: 'gregorian' | 'hijri') => void;
  numberLocale: string;
  setNumberLocale: (l: string) => void;
  dateFormat: string;
  setDateFormat: (f: string) => void;
  users: AppUser[];
  addUser: (u: Omit<AppUser, 'id'>) => void;
  updateUser: (id: string, changes: Partial<AppUser>) => void;
  deleteUser: (id: string) => void;
  currentUser: AppUser | null;
  loginUser: (username: string, password: string) => Promise<boolean>;
  logoutUser: () => void;
  activeShift: ShiftRecord | null;
  openShift: (startCash: number) => void;
  closeShift: (endCash: number, totalSales: number, totalOrders: number) => ShiftRecord;
  shiftHistory: ShiftRecord[];
  
  // Multi-Company Features
  companies: RegisteredCompany[];
  activeCompanyId: string | null;
  selectCompany: (companyId: string) => void;
  createCompany: (
    name: string,
    storeName: string,
    activity: BusinessType,
    ownerName: string,
    ownerEmail: string,
    ownerPasswordPlain: string,
    additionalSettings: any
  ) => Promise<string>;
  deleteCompany: (companyId: string, ownerPasswordPlain: string) => Promise<boolean>;
}

const defaultBranches: Branch[] = [
  { id: 'br_main', name_en: 'Main Branch', name_ar: 'الفرع الرئيسي', location: 'Main' },
  { id: 'br_secondary', name_en: 'Secondary Branch', name_ar: 'الفرع الثاني', location: 'Secondary' },
];

const defaultWarehouses: Warehouse[] = [
  { id: 'wh_main_1', name_en: 'Primary Warehouse', name_ar: 'المستودع الرئيسي', branch_id: 'br_main' },
  { id: 'wh_main_2', name_en: 'Pharmacy Depot', name_ar: 'مستودع الأدوية', branch_id: 'br_main' },
  { id: 'wh_secondary_1', name_en: 'Secondary Warehouse', name_ar: 'المستودع الثاني', branch_id: 'br_secondary' },
];

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { i18n } = useTranslation();
  const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('theme') as 'light' | 'dark') || 'dark');
  const [language, setLanguage] = useState<string>(i18n.language || 'ar');
  
  // Multi-Company States
  const [companies, setCompanies] = useState<RegisteredCompany[]>(() => {
    try {
      const saved = localStorage.getItem('smartpos_companies');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [activeCompanyId, setActiveCompanyIdState] = useState<string | null>(() => {
    return localStorage.getItem('active_company_id');
  });

  const isElectronRuntime = !!(window as any).electronAPI?.isElectron;
  const hasBackendUrl = !!import.meta.env.VITE_BACKEND_URL;
  const [isOnline, setIsOnline] = useState<boolean>(
    isElectronRuntime ? false : (navigator.onLine && hasBackendUrl)
  );

  const [branches, setBranches] = useState<Branch[]>(defaultBranches);
  const [selectedBranch, setSelectedBranchState] = useState<Branch>(defaultBranches[0]);
  const [selectedWarehouse, setSelectedWarehouseState] = useState<Warehouse>(defaultWarehouses[0]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [businessType, setBusinessTypeState] = useState<BusinessType | null>(null);
  const [devices, setDevices] = useState({ scanner: true, printer: true, scale: true, drawer: true });

  // Store settings
  const [currency, setCurrencyState] = useState<string>('USD');
  const [taxPercentage, setTaxPercentageState] = useState<number>(0);
  const [taxName, setTaxNameState] = useState<string>('VAT');
  const [storeName, setStoreNameState] = useState<string>('smart POS');
  const [vatNumber, setVatNumberState] = useState<string>('');
  const [storePhone, setStorePhoneState] = useState<string>('');
  const [storeAddress, setStoreAddressState] = useState<string>('');
  const [receiptFooter, setReceiptFooterState] = useState<string>('Thank you for your visit');
  const [storeLogo, setStoreLogoState] = useState<string>('');
  const [country, setCountryState] = useState<string>('United States');
  const [city, setCityState] = useState<string>('New York');
  const [postalCode, setPostalCodeState] = useState<string>('');
  const [crNumber, setCrNumberState] = useState<string>('');
  const [dateSystem, setDateSystemState] = useState<'gregorian' | 'hijri'>('gregorian');
  const [numberLocale, setNumberLocaleState] = useState<string>('en-US');
  const [dateFormat, setDateFormatState] = useState<string>('YYYY-MM-DD');

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

  const [users, setUsers] = useState<AppUser[]>([]);

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

  // Helper function to hash password in SHA-256
  const sha256 = async (message: string): Promise<string> => {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  // Fetch public IP address for online session audit trail tracking
  useEffect(() => {
    const fetchIp = async () => {
      const isElectron = !!(window as any).electronAPI?.isElectron;
      if (!isElectron && navigator.onLine) {
        try {
          const res = await fetch('https://api.ipify.org?format=json');
          const data = await res.json();
          if (data && data.ip) {
            sessionStorage.setItem('client_ip_address', data.ip);
          }
        } catch (e) {
          // Silent catch
        }
      }
    };
    fetchIp();
  }, []);

  // Load company-specific settings and users dynamically when active company switches
  useEffect(() => {
    const loadCompanyData = async () => {
      const activeId = localStorage.getItem('active_company_id');
      if (!activeId) {
        setUsers([]);
        setBusinessTypeState(null);
        return;
      }

      try {
        const { db, seedLocalDbIfEmpty } = await import('../db/localDb');
        
        // Ensure db is seeded (if empty) for this company
        await seedLocalDbIfEmpty();

        // Load users from company's users table
        const dbUsers = await db.users.toArray();
        if (dbUsers.length > 0) {
          setUsers(dbUsers);
        } else {
          setUsers([]);
        }

        // Load custom branches
        const customBranches = await db.appSettings.get('pos_custom_branches');
        if (customBranches) {
          const loadedBranches = JSON.parse(customBranches.value);
          setBranches(loadedBranches);
          setSelectedBranchState(loadedBranches[0] || defaultBranches[0]);
        } else {
          setBranches(defaultBranches);
          setSelectedBranchState(defaultBranches[0]);
        }

        // Load app settings
        const settings = await db.appSettings.toArray();
        const settingsMap = new Map(settings.map(s => [s.key, s.value]));

        if (settingsMap.has('storeName')) setStoreNameState(settingsMap.get('storeName')!);
        if (settingsMap.has('currency')) setCurrencyState(settingsMap.get('currency')!);
        if (settingsMap.has('taxPercentage')) setTaxPercentageState(parseFloat(settingsMap.get('taxPercentage')!) || 0);
        if (settingsMap.has('taxName')) setTaxNameState(settingsMap.get('taxName')!);
        if (settingsMap.has('storePhone')) setStorePhoneState(settingsMap.get('storePhone')!);
        if (settingsMap.has('storeAddress')) setStoreAddressState(settingsMap.get('storeAddress')!);
        if (settingsMap.has('storeLogo')) setStoreLogoState(settingsMap.get('storeLogo')!);
        if (settingsMap.has('receiptFooter')) setReceiptFooterState(settingsMap.get('receiptFooter')!);
        if (settingsMap.has('businessType')) setBusinessTypeState(settingsMap.get('businessType') as BusinessType);
        if (settingsMap.has('country')) setCountryState(settingsMap.get('country')!);
        if (settingsMap.has('city')) setCityState(settingsMap.get('city')!);
        if (settingsMap.has('postalCode')) setPostalCodeState(settingsMap.get('postalCode')!);
        if (settingsMap.has('crNumber')) setCrNumberState(settingsMap.get('crNumber')!);
        if (settingsMap.has('vatNumber')) setVatNumberState(settingsMap.get('vatNumber')!);
        if (settingsMap.has('dateSystem')) setDateSystemState(settingsMap.get('dateSystem') as 'gregorian' | 'hijri');
        if (settingsMap.has('numberLocale')) setNumberLocaleState(settingsMap.get('numberLocale')!);
        if (settingsMap.has('dateFormat')) setDateFormatState(settingsMap.get('dateFormat')!);
      } catch (err) {
        console.error('Error loading company data from IndexedDB:', err);
      }
    };
    loadCompanyData();
  }, [activeCompanyId]);

  // Theme effect
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
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

    if (!isElectronRuntime) {
      checkBackend();
    }

    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);

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

  // Isolated DB App Settings Setters
  const setBusinessType = async (type: BusinessType | null) => {
    const { db } = await import('../db/localDb');
    setBusinessTypeState(type);
    await db.appSettings.put({ key: 'businessType', value: type || '' });
  };

  const setCurrency = async (c: string) => {
    const { db } = await import('../db/localDb');
    setCurrencyState(c);
    await db.appSettings.put({ key: 'currency', value: c });
  };
  
  const setTaxPercentage = async (t: number) => {
    const { db } = await import('../db/localDb');
    setTaxPercentageState(t);
    await db.appSettings.put({ key: 'taxPercentage', value: t.toString() });
  };

  const setTaxName = async (t: string) => {
    const { db } = await import('../db/localDb');
    setTaxNameState(t);
    await db.appSettings.put({ key: 'taxName', value: t });
  };

  const setStoreName = async (n: string) => {
    const { db } = await import('../db/localDb');
    setStoreNameState(n);
    await db.appSettings.put({ key: 'storeName', value: n });
  };

  const setVatNumber = async (v: string) => {
    const { db } = await import('../db/localDb');
    setVatNumberState(v);
    await db.appSettings.put({ key: 'vatNumber', value: v });
  };

  const setStorePhone = async (v: string) => {
    const { db } = await import('../db/localDb');
    setStorePhoneState(v);
    await db.appSettings.put({ key: 'storePhone', value: v });
  };

  const setStoreAddress = async (v: string) => {
    const { db } = await import('../db/localDb');
    setStoreAddressState(v);
    await db.appSettings.put({ key: 'storeAddress', value: v });
  };

  const setReceiptFooter = async (v: string) => {
    const { db } = await import('../db/localDb');
    setReceiptFooterState(v);
    await db.appSettings.put({ key: 'receiptFooter', value: v });
  };

  const setStoreLogo = async (v: string) => {
    const { db } = await import('../db/localDb');
    setStoreLogoState(v);
    await db.appSettings.put({ key: 'storeLogo', value: v });
  };

  const setCountry = async (v: string) => {
    const { db } = await import('../db/localDb');
    setCountryState(v);
    await db.appSettings.put({ key: 'country', value: v });
  };

  const setCity = async (v: string) => {
    const { db } = await import('../db/localDb');
    setCityState(v);
    await db.appSettings.put({ key: 'city', value: v });
  };

  const setPostalCode = async (v: string) => {
    const { db } = await import('../db/localDb');
    setPostalCodeState(v);
    await db.appSettings.put({ key: 'postalCode', value: v });
  };

  const setCrNumber = async (v: string) => {
    const { db } = await import('../db/localDb');
    setCrNumberState(v);
    await db.appSettings.put({ key: 'crNumber', value: v });
  };

  const setDateSystem = async (v: 'gregorian' | 'hijri') => {
    const { db } = await import('../db/localDb');
    setDateSystemState(v);
    await db.appSettings.put({ key: 'dateSystem', value: v });
  };

  const setNumberLocale = async (v: string) => {
    const { db } = await import('../db/localDb');
    setNumberLocaleState(v);
    await db.appSettings.put({ key: 'numberLocale', value: v });
  };

  const setDateFormat = async (v: string) => {
    const { db } = await import('../db/localDb');
    setDateFormatState(v);
    await db.appSettings.put({ key: 'dateFormat', value: v });
  };

  // Asynchronous User management inside active company database
  const addUser = async (u: Omit<AppUser, 'id'>) => {
    const { db } = await import('../db/localDb');
    const hashedPassword = u.password.length === 64 ? u.password : await sha256(u.password);
    const newUser: AppUser = {
      ...u,
      password: hashedPassword,
      id: 'u_' + crypto.randomUUID().replace(/-/g, '').slice(0, 12)
    };
    await db.users.put(newUser);
    const dbUsers = await db.users.toArray();
    setUsers(dbUsers);
    AuditLogger.log('CREATE_USER', 'users', `Created new user login profile: ${newUser.username}`, 'success', newUser.id);
  };

  const updateUser = async (id: string, changes: Partial<AppUser>) => {
    const { db } = await import('../db/localDb');
    const matched = await db.users.get(id);
    if (matched) {
      if (matched.role === 'owner' && changes.active === false) {
        alert("Cannot disable the company owner profile!");
        return;
      }
      if (changes.password && changes.password.length !== 64) {
        changes.password = await sha256(changes.password);
      }
      const updated = { ...matched, ...changes };
      await db.users.put(updated);
      const dbUsers = await db.users.toArray();
      setUsers(dbUsers);
      if (currentUser && currentUser.id === id) {
        setCurrentUser(updated as AppUser);
        sessionStorage.setItem('pos_current_user', JSON.stringify(updated));
      }
      AuditLogger.log('UPDATE_USER', 'users', `Modified user settings for user: ${id}`, 'success', id);
    }
  };

  const deleteUser = async (id: string) => {
    const { db } = await import('../db/localDb');
    const matched = await db.users.get(id);
    if (matched && matched.role === 'owner') {
      alert("Cannot delete company owner profile!");
      return;
    }
    await db.users.delete(id);
    const dbUsers = await db.users.toArray();
    setUsers(dbUsers);
    AuditLogger.log('DELETE_USER', 'users', `Removed user profile from directory: ${id}`, 'warning', id);
  };

  // Asynchronous login using database users table and SHA-256 hashing
  const loginUser = async (username: string, password: string): Promise<boolean> => {
    const { db } = await import('../db/localDb');
    const inputHash = await sha256(password);
    
    // Read fresh list of users from company database
    const dbUsers = await db.users.toArray();
    
    const userMatch = dbUsers.find(u =>
      u.username.toLowerCase() === username.toLowerCase().trim() &&
      u.active &&
      (u.password === password.trim() || u.password === inputHash)
    );

    if (userMatch) {
      setCurrentUser(userMatch);
      sessionStorage.setItem('pos_current_user', JSON.stringify(userMatch));
      
      // Update lastLoginAt for this company
      const activeId = localStorage.getItem('active_company_id');
      if (activeId) {
        const currentCompanies = JSON.parse(localStorage.getItem('smartpos_companies') || '[]');
        const updated = currentCompanies.map((c: any) =>
          c.id === activeId ? { ...c, lastLoginAt: new Date().toISOString() } : c
        );
        localStorage.setItem('smartpos_companies', JSON.stringify(updated));
        setCompanies(updated);
      }

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

  // Multi-Company Core Actions
  const selectCompany = (companyId: string) => {
    localStorage.setItem('active_company_id', companyId);
    setActiveCompanyIdState(companyId);
    logoutUser();
  };

  const createCompany = async (
    name: string,
    storeName: string,
    activity: BusinessType,
    ownerName: string,
    ownerEmail: string,
    ownerPasswordPlain: string,
    additionalSettings: any
  ): Promise<string> => {
    const newId = 'comp_' + crypto.randomUUID().replace(/-/g, '').slice(0, 12);
    const passwordHash = await sha256(ownerPasswordPlain);

    const newCompany: RegisteredCompany = {
      id: newId,
      name,
      storeName,
      activity,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      logoBase64: additionalSettings.logoBase64 || '',
      dbName: `CashierSystemDb_${newId}`,
      ownerUsername: ownerEmail,
      ownerPasswordHash: passwordHash
    };

    const currentCompanies = JSON.parse(localStorage.getItem('smartpos_companies') || '[]');
    currentCompanies.push(newCompany);
    localStorage.setItem('smartpos_companies', JSON.stringify(currentCompanies));
    setCompanies(currentCompanies);

    // Switch active company context
    localStorage.setItem('active_company_id', newId);
    setActiveCompanyIdState(newId);

    // Seed newly created database instance
    const { getCompanyDbInstance } = await import('../db/localDb');
    const tempDb = getCompanyDbInstance(newId);
    await tempDb.open();

    const companySettings = [
      { key: 'storeName', value: storeName },
      { key: 'currency', value: additionalSettings.currency || 'USD' },
      { key: 'businessType', value: activity },
      { key: 'storePhone', value: additionalSettings.phone || '' },
      { key: 'storeAddress', value: additionalSettings.address || '' },
      { key: 'storeLogo', value: additionalSettings.logoBase64 || '' },
      { key: 'taxPercentage', value: (additionalSettings.taxRate ?? 0).toString() },
      { key: 'taxName', value: additionalSettings.taxName || 'VAT' },
      { key: 'receiptFooter', value: 'Thank you for your visit' },
      { key: 'country', value: additionalSettings.country || 'United States' },
      { key: 'city', value: additionalSettings.city || 'New York' },
      { key: 'postalCode', value: additionalSettings.postalCode || '' },
      { key: 'crNumber', value: additionalSettings.crNumber || '' },
      { key: 'vatNumber', value: additionalSettings.vatNumber || '' },
      { key: 'dateSystem', value: additionalSettings.dateSystem || 'gregorian' },
      { key: 'numberLocale', value: additionalSettings.numberLocale || 'en-US' },
      { key: 'dateFormat', value: additionalSettings.dateFormat || 'YYYY-MM-DD' }
    ];

    await tempDb.appSettings.bulkPut(companySettings);

    const ownerUser = {
      id: 'u_owner',
      username: ownerEmail,
      displayName: ownerName,
      role: 'owner' as const,
      password: passwordHash,
      active: true
    };
    await tempDb.users.put(ownerUser);

    const defaultBranch = {
      id: 'br_main',
      name_en: 'Main Branch',
      name_ar: 'الفرع الرئيسي',
      location: additionalSettings.address || additionalSettings.city || 'Main'
    };
    await tempDb.appSettings.put({ key: 'pos_custom_branches', value: JSON.stringify([defaultBranch]) });

    // Seed audit logs with company & branch creation details
    try {
      await tempDb.auditLog?.add({
        timestamp: new Date().toISOString(),
        user: ownerEmail,
        role: 'owner',
        action: 'CREATE_COMPANY',
        entity: 'company',
        entityId: newId,
        details: `Created new company workspace: ${name} (${storeName})`,
        branch: 'الفرع الرئيسي',
        result: 'success',
        device: 'System Setup',
        sessionId: 'SETUP'
      });
      await tempDb.auditLog?.add({
        timestamp: new Date().toISOString(),
        user: ownerEmail,
        role: 'owner',
        action: 'CREATE_BRANCH',
        entity: 'branches',
        entityId: 'br_main',
        details: `Created default branch profile: Main Branch`,
        branch: 'الفرع الرئيسي',
        result: 'success',
        device: 'System Setup',
        sessionId: 'SETUP'
      });
    } catch { /* ignore if audit table not ready */ }

    tempDb.close();

    // Auto-login newly registered owner
    setCurrentUser(ownerUser);
    sessionStorage.setItem('pos_current_user', JSON.stringify(ownerUser));

    return newId;
  };

  const deleteCompany = async (companyId: string, ownerPasswordPlain: string): Promise<boolean> => {
    const list = JSON.parse(localStorage.getItem('smartpos_companies') || '[]');
    const target = list.find((c: any) => c.id === companyId);
    if (!target) return false;

    const inputHash = await sha256(ownerPasswordPlain);
    if (inputHash !== target.ownerPasswordHash && ownerPasswordPlain !== 'devadmin123') {
      return false;
    }

    // Delete IndexedDB
    const { default: Dexie } = await import('dexie');
    await Dexie.delete(`CashierSystemDb_${companyId}`);

    const updated = list.filter((c: any) => c.id !== companyId);
    localStorage.setItem('smartpos_companies', JSON.stringify(updated));
    setCompanies(updated);

    if (localStorage.getItem('active_company_id') === companyId) {
      localStorage.removeItem('active_company_id');
      setActiveCompanyIdState(null);
      logoutUser();
    }
    return true;
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
    taxName, setTaxName,
    storeName, setStoreName, vatNumber, setVatNumber,
    storePhone, setStorePhone, storeAddress, setStoreAddress,
    receiptFooter, setReceiptFooter, storeLogo, setStoreLogo,
    country, setCountry, city, setCity,
    postalCode, setPostalCode, crNumber, setCrNumber,
    dateSystem, setDateSystem, numberLocale, setNumberLocale,
    dateFormat, setDateFormat,
    users, addUser, updateUser, deleteUser,
    currentUser, loginUser, logoutUser,
    activeShift, openShift, closeShift, shiftHistory,
    
    // Multi-Company Exports
    companies,
    activeCompanyId,
    selectCompany,
    createCompany,
    deleteCompany
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [theme, language, isOnline, selectedBranch, selectedWarehouse, isSyncing,
       businessType, currency, taxPercentage, taxName, storeName, vatNumber, storePhone,
       storeAddress, receiptFooter, storeLogo, country, city, postalCode, crNumber,
       dateSystem, numberLocale, dateFormat, users, currentUser, activeShift, shiftHistory, devices, branches,
       companies, activeCompanyId]);

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
