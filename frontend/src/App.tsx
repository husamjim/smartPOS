import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from './context/AppContext';
import { useCart } from './context/CartContext';
import { telemetry } from './utils/telemetry';
import { SetupWizard } from './pages/SetupWizard';
import { CompanyManager } from './components/settings/CompanyManager';
// React.lazy dynamic code-splitting imports for all heavy ERP & POS pages
const Dashboard = React.lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const POS = React.lazy(() => import('./pages/POS').then(m => ({ default: m.POS })));
const ERP = React.lazy(() => import('./pages/ERP').then(m => ({ default: m.ERP })));
const CRM = React.lazy(() => import('./pages/CRM').then(m => ({ default: m.CRM })));
const Kitchen = React.lazy(() => import('./pages/Kitchen').then(m => ({ default: m.Kitchen })));
const Reports = React.lazy(() => import('./pages/Reports').then(m => ({ default: m.Reports })));
const Settings = React.lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));
const AIAssistant = React.lazy(() => import('./pages/AIAssistant').then(m => ({ default: m.AIAssistant })));
const DataImport = React.lazy(() => import('./pages/DataImport').then(m => ({ default: m.DataImport })));
import { BusinessSelector } from './components/shared/BusinessSelector';
import { HardwareService } from './services/hardware';
import { NotificationBell } from './components/NotificationBell';

// Icons
import {
  LayoutDashboard,
  Monitor,
  Database,
  Users,
  ChefHat,
  BarChart3,
  Sparkles,
  Settings as SettingsIcon,
  Wifi,
  WifiOff,
  Languages,
  Sun,
  Moon,
  Printer,
  ChevronLeft,
  ChevronRight,
  Store,
  Upload,
  AlertCircle
} from 'lucide-react';



export default function App() {
  const { t } = useTranslation();
  const {
    theme,
    toggleTheme,
    language,
    changeLanguage,
    isOnline,
    selectedBranch,
    isSyncing,
    triggerLocalSync,
    devices,
    businessType,
    currentUser,
    loginUser,
    logoutUser,
    companies,
    activeCompanyId,
    selectCompany,
    createCompany,
  } = useApp();

  const { receiptPreview, setReceiptPreview } = useCart();

  const [activeTab, setActiveTab] = useState<'dashboard' | 'pos' | 'erp' | 'crm' | 'kds' | 'reports' | 'ai_assistant' | 'settings' | 'data_import'>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showHardwareSim, setShowHardwareSim] = useState(false);
  const [scanInput, setScanInput] = useState('');

  // Detect first-run: show SetupWizard if no companies registered yet
  const isFirstRun = companies.length === 0;
  const [showNewSetupWizard, setShowNewSetupWizard] = useState<boolean>(isFirstRun);
  const [showCompanyManager, setShowCompanyManager] = useState<boolean>(false);




  // Login form local states
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Derive RTL flag - always computed regardless of render path
  const isRtl = language === 'ar';

  // Native Splash Screen states
  const [showSplash, setShowSplash] = useState(true);
  const [splashFade, setSplashFade] = useState(false);

  useEffect(() => {
    // Record react loaded time
    telemetry.reactLoaded = Date.now();

    const timer = setTimeout(() => {
      if (!telemetry.dbInitialized || telemetry.dbInitialized === telemetry.bootStart) {
        telemetry.dbInitialized = Date.now();
      }
      telemetry.loginRendered = Date.now();
      telemetry.printProfile();

      // Trigger fade out transition
      setSplashFade(true);
      const fadeTimer = setTimeout(() => {
        setShowSplash(false);
      }, 500);

      return () => clearTimeout(fadeTimer);
    }, 1500); // 1.5s splash visibility for premium feel

    return () => clearTimeout(timer);
  }, []);

  // Reset tab if businessType switches and hides KDS
  useEffect(() => {
    if (activeTab === 'kds' && businessType !== 'restaurant') {
      setActiveTab('dashboard');
    }
  }, [businessType, activeTab]);

  // Force active tab to POS if cashier tries to access restricted tabs
  useEffect(() => {
    if (currentUser?.role === 'cashier') {
      const restricted = ['erp', 'reports', 'ai_assistant', 'settings'];
      if (restricted.includes(activeTab)) {
        setActiveTab('pos');
      }
    }
  }, [currentUser, activeTab]);

  // Handle global barcode simulator submit
  const handleBarcodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanInput.trim()) return;

    // Trigger keyboard scanner listener emulation on POS screen
    const { db } = await import('./db/localDb');
    const matched = await db.products.where('barcode').equals(scanInput.trim()).first();
    if (matched) {
      // If POS screen is active, append to cart
      if (activeTab === 'pos') {
        // Simple global trigger event simulation or popup
        alert(`جهاز مسح الباركود المتصل: تم مسح المنتج ${matched.name_ar} بنجاح.`);
        // Add item
        const { db: loadedDb } = await import('./db/localDb');
        // Check batch
        let batch = undefined;
        if (matched.is_pharmaceutical === 1) {
          const batches = await loadedDb.batches.where('product_id').equals(matched.id).toArray();
          if (batches.length > 0) batch = batches[0];
        }
        
        // Find cart context via hook fallback
        window.dispatchEvent(new CustomEvent('barcode-scanned', { detail: { product: matched, batch } }));
      } else {
        alert(`تم التعرف على المنتج: ${matched.name_ar} (سعر البيع: ${matched.price} ريال)`);
      }
    } else {
      alert(`الباركود الممسوح (${scanInput}) غير مطابق لأي منتج في المستودع.`);
    }
    setScanInput('');
  };

  if (showSplash) {
    return (
      <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#090d16] text-white font-sans transition-opacity duration-500 ${splashFade ? 'opacity-0' : 'opacity-100'}`} dir={t('ltr')}>
        {/* Elegant Glowing Spheres */}
        <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-emerald-600/10 rounded-full blur-[120px] pointer-events-none animate-pulse" style={{ animationDelay: '1s' }} />

        <div className="text-center space-y-6 max-w-sm w-full px-6">
          <div className="relative animate-pulse">
            <img src="./logo.png" alt="smartPOS" className="h-28 mx-auto object-contain filter drop-shadow-[0_0_20px_rgba(59,130,246,0.35)]" />
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-black bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-500 bg-clip-text text-transparent tracking-wide">
              {t('smart_pos')}
            </h1>
            <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase">
              {t('native_enterprise_pos_erp')}
            </p>
          </div>

          {/* Elegant Progress Bar */}
          <div className="relative h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
            <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-500 rounded-full animate-progress" />
          </div>

          <div className="flex justify-between items-center text-[9px] text-slate-500 font-mono px-1">
            <span>{t('initializing_db_modules')}</span>
            <span>v1.0.1</span>
          </div>
        </div>
      </div>
    );
  }

  // Show new SetupWizard on very first run
  if (showNewSetupWizard) {
    return (
      <SetupWizard
        onComplete={async (wizardData) => {
          await createCompany(
            wizardData.companyName,
            wizardData.storeName,
            wizardData.activity,
            wizardData.ownerName,
            wizardData.ownerEmail,
            wizardData.ownerPassword,
            {
              phone: wizardData.phone,
              address: wizardData.address,
              logoBase64: wizardData.logoBase64,
              taxRate: wizardData.taxRate,
              invoicePrefix: wizardData.invoicePrefix,
              paperSize: wizardData.paperSize
            }
          );
          setShowNewSetupWizard(false);
        }}
      />
    );
  }

  if (currentUser === null) {
    if (showCompanyManager) {
      return (
        <div className={`min-h-screen flex items-center justify-center p-6 ${theme === 'dark' ? 'dark bg-[#090d16]' : 'bg-slate-50'}`}>
          <CompanyManager 
            onClose={() => setShowCompanyManager(false)}
            onOpenCompany={(compId) => {
              selectCompany(compId);
              setShowCompanyManager(false);
            }}
          />
        </div>
      );
    }

    const activeCompany = companies.find(c => c.id === activeCompanyId);

    return (
      <div className={`min-h-screen flex items-center justify-center p-6 ${theme === 'dark' ? 'dark bg-[#090d16]' : 'bg-slate-50'}`}>
        <div className="glass-card p-8 rounded-2xl max-w-sm w-full space-y-5 border border-slate-200/50 dark:border-slate-800/50 text-right">
          
          {/* Card Top Actions */}
          <div className="flex justify-between items-center border-b border-slate-200/20 dark:border-slate-850/45 pb-3" dir={t('ltr')}>
            <span className="text-[10px] font-bold text-slate-400">smart POS</span>
            <select 
              value={language} 
              onChange={(e) => changeLanguage(e.target.value)}
              className="bg-transparent border border-slate-200 dark:border-slate-850 rounded-lg text-[10px] focus:outline-none cursor-pointer px-2 py-1 text-slate-600 dark:text-slate-300"
            >
              <option value="ar" className="bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200">العربية</option>
              <option value="en" className="bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200">English</option>
            </select>
          </div>

          {/* 1. If multiple companies exist and no active company is selected, show company selection grid */}
          {!activeCompanyId && companies.length > 0 ? (
            <div className="space-y-4">
              <div className="text-center space-y-2">
                <img src="./logo.png" alt="smart POS" className="h-20 mx-auto object-contain mb-2 filter drop-shadow-[0_0_15px_rgba(59,130,246,0.2)]" />
                <h2 className="text-md font-bold text-slate-250">
                  {t('select_company_to_start')}
                </h2>
                <p className="text-[10px] text-slate-500">
                  {t('multiple_companies_registered_on_this_device')}
                </p>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {companies.map(comp => (
                  <button
                    key={comp.id}
                    onClick={() => selectCompany(comp.id)}
                    className="w-full p-3 rounded-xl border border-slate-800/80 bg-slate-950/20 hover:border-blue-500/40 hover:bg-slate-950/60 transition-all text-right flex items-center gap-3"
                  >
                    {comp.logoBase64 ? (
                      <img src={comp.logoBase64} alt="" className="w-8 h-8 rounded object-contain bg-white/5 p-0.5 border border-slate-800" />
                    ) : (
                      <div className="w-8 h-8 rounded bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center font-bold text-white text-xs">
                        {comp.name.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="text-xs font-bold text-slate-200">{comp.name}</p>
                      <p className="text-[9px] text-slate-500 capitalize">{comp.activity}</p>
                    </div>
                  </button>
                ))}
              </div>

              <div className="border-t border-slate-800/60 pt-3 space-y-2">
                <button
                  onClick={() => setShowNewSetupWizard(true)}
                  className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all shadow-md"
                >
                  + {t('create_new_company')}
                </button>
                <button
                  onClick={() => setShowCompanyManager(true)}
                  className="w-full py-2 rounded-xl border border-slate-805 hover:bg-slate-850/40 text-slate-400 text-xs font-bold transition-all"
                >
                  {t('company_manager')}
                </button>
              </div>
            </div>
          ) : !activeCompanyId ? (
            /* No company registered at all (fallback for first run) */
            <div className="text-center space-y-5 py-6">
              <img src="./logo.png" alt="smart POS" className="h-24 mx-auto object-contain filter drop-shadow-[0_0_15px_rgba(59,130,246,0.2)]" />
              <div className="space-y-1">
                <h2 className="text-lg font-black text-slate-100">{t('welcome_to_smart_pos')}</h2>
                <p className="text-xs text-slate-400">{t('please_start_by_creating_your_first_company')}</p>
              </div>
              <button
                onClick={() => setShowNewSetupWizard(true)}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg transition-all"
              >
                + {t('create_new_company')}
              </button>
            </div>
          ) : (
            /* Active company selected - show standard login page with no Register link */
            <>
              <div className="text-center space-y-1">
                {activeCompany?.logoBase64 ? (
                  <img src={activeCompany.logoBase64} alt="" className="h-20 mx-auto object-contain mb-2 bg-white/5 p-1 rounded-lg border border-slate-800" />
                ) : (
                  <img src="./logo.png" alt="smart POS" className="h-20 mx-auto object-contain mb-2 filter drop-shadow-[0_0_15px_rgba(59,130,246,0.2)]" />
                )}
                <h2 className="text-sm font-bold text-slate-200">
                  {isRtl ? `تسجيل الدخول - ${activeCompany?.name}` : `Login - ${activeCompany?.name}`}
                </h2>
                <p className="text-[10px] text-slate-500 capitalize">
                  {isRtl ? `نشاط: ${activeCompany?.activity}` : `Activity: ${activeCompany?.activity}`}
                </p>
              </div>

              {loginError && (
                <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-center text-xs text-red-500 font-bold flex items-center justify-center gap-1.5 animate-pulse">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  {loginError}
                </div>
              )}

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const success = await loginUser(loginUsername, loginPassword);
                  if (success) {
                    setLoginUsername('');
                    setLoginPassword('');
                    setLoginError('');
                  } else {
                    setLoginError(t('incorrect_username_or_password'));
                  }
                }}
                className="space-y-4 text-xs font-semibold"
              >
                <div className={t('text_left')}>
                  <label className="text-slate-400 block mb-1">{t('username_email')}</label>
                  <input
                    type="text"
                    placeholder={t('ownerexamplecom')}
                    value={loginUsername}
                    onChange={e => setLoginUsername(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-850 bg-slate-950 focus:outline-none text-slate-200 font-sans"
                  />
                </div>
                <div className={t('text_left')}>
                  <label className="text-slate-400 block mb-1">{t('password')}</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-850 bg-slate-950 focus:outline-none text-slate-200"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all shadow-md text-xs mt-2"
                >
                  {t('login')}
                </button>
              </form>

              <div className="border-t border-slate-800/60 pt-3 space-y-2">
                {companies.length > 1 && (
                  <button
                    onClick={() => selectCompany('')}
                    className="w-full py-2 rounded-xl bg-slate-950/40 hover:bg-slate-800/40 text-slate-300 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                  >
                    {t('switch_company')}
                  </button>
                )}
                <button
                  onClick={() => setShowNewSetupWizard(true)}
                  className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all shadow-md"
                >
                  + {t('create_new_company')}
                </button>
                <button
                  onClick={() => setShowCompanyManager(true)}
                  className="w-full py-2 rounded-xl border border-slate-800 hover:bg-slate-850/40 text-slate-400 text-xs font-bold transition-all"
                >
                  {t('company_manager')}
                </button>
              </div>
            </>
          )}

          {/* Smart POS ERP Version Info Badge at Bottom */}
          <div className="pt-2 border-t border-slate-800/50 text-center text-[9px] text-slate-600 font-mono tracking-wider">
            Smart POS ERP • Version 1.0.0 • Build 2026.07
          </div>

        </div>
      </div>
    );
  }



  if (businessType === null) {
    return <BusinessSelector />;
  }

  // isRtl already declared above

  const menuItems: Array<{ id: typeof activeTab; label: string; icon: any; color?: string }> = [
    { id: 'dashboard', label: t('dashboard'), icon: LayoutDashboard },
    { id: 'pos', label: t('pos'), icon: Monitor },
    ...((currentUser?.role !== 'cashier') ? [{ id: 'erp' as const, label: t('erp'), icon: Database }] : []),
    { id: 'crm', label: t('crm'), icon: Users },
    ...(businessType === 'restaurant' ? [{ id: 'kds' as const, label: t('kds'), icon: ChefHat }] : []),
    ...((currentUser?.role !== 'cashier') ? [
      { id: 'reports' as const, label: t('reports'), icon: BarChart3 },
      { id: 'ai_assistant' as const, label: t('ai_assistant'), icon: Sparkles, color: 'text-cyan-500' },
      { id: 'data_import' as const, label: t('import_data'), icon: Upload },
      { id: 'settings' as const, label: t('settings'), icon: SettingsIcon }
    ] : [])
  ];

  return (
    <div className={`min-h-screen flex text-slate-800 dark:text-slate-100 ${theme === 'dark' ? 'dark bg-[#090d16]' : 'bg-slate-50'}`}>
      
      {/* Sidebar Navigation */}
      <aside
        className={`glass-card border-slate-200/50 dark:border-slate-800/50 transition-all duration-300 flex flex-col justify-between ${
          sidebarCollapsed ? 'w-16' : 'w-60'
        } ${t('border_r')}`}
      >
        <div className="flex flex-col space-y-6 pt-5">
          {/* Logo Brand */}
          <div className="px-4 flex items-center justify-between">
            {!sidebarCollapsed && (
              <span className="font-extrabold text-base tracking-wide bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-500 bg-clip-text text-transparent flex items-center gap-2 font-sans">
                <img src="./logo.png" alt="smart POS" className="h-10 w-10 object-contain" />
                <span>{t('smart_pos')}</span>
              </span>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1.5 rounded-lg hover:bg-slate-150 dark:hover:bg-slate-800 text-slate-400 transition-all"
            >
              {sidebarCollapsed ? (isRtl ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />) : (isRtl ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />)}
            </button>
          </div>

          {/* Links navigation */}
          <nav className="flex flex-col space-y-1.5 px-2.5">
            {menuItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full py-2.5 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center gap-3 select-none ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-850'
                  }`}
                >
                  <Icon className={`h-4.5 w-4.5 shrink-0 ${item.color || ''}`} />
                  {!sidebarCollapsed && <span>{item.label}</span>}
                </button>
              );
            })}
          </nav>
        </div>

        {/* User profile & logout */}
        <div className="px-3 py-2 mt-auto border-t border-slate-200/50 dark:border-slate-850">
          <div className="flex items-center justify-between bg-slate-100/50 dark:bg-slate-900/30 p-2.5 rounded-xl border border-slate-200/40 dark:border-slate-800/40 text-xs">
            {!sidebarCollapsed ? (
              <div className="min-w-0 flex-1">
                <p className="font-bold truncate text-slate-800 dark:text-slate-200 capitalize">👤 {currentUser?.username}</p>
                <p className="text-[9px] text-blue-500 font-extrabold uppercase mt-0.5">{currentUser?.role}</p>
              </div>
            ) : null}
            <button
              type="button"
              onClick={logoutUser}
              className={`p-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all ${sidebarCollapsed ? 'w-full flex justify-center' : ''}`}
              title={t('logout')}
            >
              ➔
            </button>
          </div>
        </div>

        {/* Sync panel indicator */}
        <div className="p-3 border-t border-slate-200/50 dark:border-slate-850">
          {!sidebarCollapsed ? (
            <div className="p-3 rounded-xl bg-slate-150/50 dark:bg-slate-900/30 border border-slate-200/40 dark:border-slate-800/40 space-y-2 text-[10px]">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-slate-500">{t('branch_node')}</span>
                <span className={`px-1.5 py-0.5 rounded-full font-bold flex items-center gap-0.5 ${isOnline ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                  {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                  {isOnline ? 'ONLINE' : 'OFFLINE'}
                </span>
              </div>
              <p className="text-[9px] text-slate-400 font-bold">{isRtl ? selectedBranch.name_ar : selectedBranch.name_en}</p>
              <button
                onClick={triggerLocalSync}
                disabled={isSyncing || !isOnline}
                className="w-full py-1 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-all disabled:opacity-50 text-[9px]"
              >
                {isSyncing ? (t('syncing')) : (t('sync_cloud'))}
              </button>
            </div>
          ) : (
            <div className="flex justify-center text-slate-400">
              {isOnline ? <Wifi className="h-4.5 w-4.5 text-emerald-500" /> : <WifiOff className="h-4.5 w-4.5 text-red-500" />}
            </div>
          )}
        </div>
      </aside>

      {/* Main page block */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="glass-card h-16 border-b border-slate-200/50 dark:border-slate-800/50 px-6 flex justify-between items-center select-none">
          <div className="flex items-center gap-2.5 text-xs font-bold text-slate-400">
            <span>{t('terminal_node')}</span>
            <span className="text-slate-800 dark:text-slate-100 bg-slate-150 dark:bg-slate-850 px-2.5 py-1.5 rounded-lg">
              {isRtl ? selectedBranch.name_ar : selectedBranch.name_en}
            </span>
            <span className="text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1.5 rounded-lg flex items-center gap-1 text-[10px] uppercase font-black font-sans">
              <Store className="h-3.5 w-3.5" />
              {businessType === 'restaurant' ? (t('restaurant_caf')) :
               businessType === 'supermarket' ? (t('supermarket')) :
               businessType === 'pharmacy' ? (t('pharmacy')) :
               businessType === 'clothing' ? (t('clothing_store')) :
               (t('electronics_store'))}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <NotificationBell />

            {/* Devices controller link shortcut */}
            {import.meta.env.DEV && (
              <button
                onClick={() => setShowHardwareSim(!showHardwareSim)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 transition-all shadow-xs"
              >
                🖥️ {t('devices_emulator')}
              </button>
            )}

            {/* Language switches */}
            <button
              onClick={() => changeLanguage(language === 'ar' ? 'en' : 'ar')}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-all flex items-center gap-1 text-xs font-bold"
            >
              <Languages className="h-4 w-4" />
              <span>{language === 'ar' ? 'English' : 'العربية'}</span>
            </button>

            {/* Theme switcher */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-all"
            >
              {theme === 'dark' ? <Sun className="h-4.5 w-4.5 text-amber-500" /> : <Moon className="h-4.5 w-4.5" />}
            </button>
          </div>
        </header>

        {/* Content Router frame */}
        <main className="flex-1 p-6 overflow-y-auto">
          <React.Suspense fallback={
            <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
              <div className="h-10 w-10 rounded-full border-4 border-t-blue-500 border-r-transparent border-b-blue-500 border-l-transparent animate-spin"></div>
              <p className="text-xs font-bold text-slate-400">جاري تحميل الصفحة...</p>
            </div>
          }>
            {activeTab === 'dashboard' && <Dashboard />}
            {activeTab === 'pos' && <POS />}
            {activeTab === 'erp' && <ERP />}
            {activeTab === 'crm' && <CRM />}
            {activeTab === 'kds' && <Kitchen />}
            {activeTab === 'reports' && <Reports />}
            {activeTab === 'ai_assistant' && <AIAssistant />}
            {activeTab === 'settings' && <Settings />}
            {activeTab === 'data_import' && <DataImport />}
          </React.Suspense>
        </main>
      </div>

      {/* Floating Hardware Simulator panel */}
      {import.meta.env.DEV && showHardwareSim && (
        <div className={`fixed bottom-4 z-40 bg-slate-900 text-white p-5 rounded-2xl shadow-2xl w-80 space-y-4 border border-slate-700 font-sans transition-all animate-fade-in ${t('right_4')}`}>
          <div className="flex justify-between items-center border-b border-slate-700 pb-2">
            <h4 className="font-extrabold text-sm flex items-center gap-1.5">
              📟 {t('peripheral_device_panel')}
            </h4>
            <button
              onClick={() => setShowHardwareSim(false)}
              className="text-slate-400 hover:text-white font-bold"
            >
              ✕
            </button>
          </div>

          {/* Device indicators status list */}
          <div className="grid grid-cols-2 gap-2 text-[10px] font-bold">
            <div className={`p-2 rounded border border-slate-800 flex justify-between ${devices.scanner ? 'bg-blue-950/40 text-blue-400' : 'opacity-40'}`}>
              <span>قارئ الباركود</span>
              <span>{devices.scanner ? 'ON' : 'OFF'}</span>
            </div>
            <div className={`p-2 rounded border border-slate-800 flex justify-between ${devices.scale ? 'bg-blue-950/40 text-blue-400' : 'opacity-40'}`}>
              <span>ميزان الوزن</span>
              <span>{devices.scale ? 'ON' : 'OFF'}</span>
            </div>
            <div className={`p-2 rounded border border-slate-800 flex justify-between ${devices.printer ? 'bg-blue-950/40 text-blue-400' : 'opacity-40'}`}>
              <span>الطابعة الحرارية</span>
              <span>{devices.printer ? 'ON' : 'OFF'}</span>
            </div>
            <div className={`p-2 rounded border border-slate-800 flex justify-between ${devices.drawer ? 'bg-blue-950/40 text-blue-400' : 'opacity-40'}`}>
              <span>درج النقود</span>
              <span>{devices.drawer ? 'OPEN' : 'CLOSED'}</span>
            </div>
          </div>

          {/* Barcode typing emulation */}
          {devices.scanner && (
            <form onSubmit={handleBarcodeSubmit} className="space-y-2">
              <label className="text-[10px] text-slate-400 block font-semibold">محاكاة مسح باركود سلعة (Barcode Scanner):</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={scanInput}
                  onChange={e => setScanInput(e.target.value)}
                  placeholder="أدخل باركود (مثال: 62811001)"
                  className="flex-1 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-white focus:outline-none text-xs text-center font-mono"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-bold"
                >
                  مسح
                </button>
              </div>
            </form>
          )}

          <p className="text-[9px] text-slate-500">
            * قم بتنشيط شاشة الكاشير لمشاهدة إضافة المبيعات تلقائياً بعد مسح الباركود.
          </p>
        </div>
      )}

      {/* Printed thermal receipt preview display popup */}
      {receiptPreview && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="glass-card p-5 rounded-2xl max-w-sm w-full space-y-4 animate-fade-in text-center flex flex-col items-center">
            <div className="flex justify-between w-full border-b pb-2">
              <span className="text-xs font-bold flex items-center gap-1.5">
                <Printer className="h-4 w-4 text-indigo-500" />
                معاينة الفاتورة الحرارية المطبوعة
              </span>
              <button
                onClick={() => setReceiptPreview(null)}
                className="text-slate-400 hover:text-slate-900 dark:hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            {/* Simulated paper sheet paper design styling */}
            <div 
              className="bg-white p-4 rounded-md shadow-inner max-h-[360px] overflow-y-auto border border-slate-200"
              dangerouslySetInnerHTML={{ __html: receiptPreview }}
            />

            <div className="flex gap-2 justify-end w-full border-t pt-3">
              <button
                onClick={async () => {
                  if (HardwareService.isPrinterConnected()) {
                    const temp = document.createElement('div');
                    temp.innerHTML = receiptPreview;
                    const plainText = temp.innerText || temp.textContent || '';
                    try {
                      await HardwareService.printRawESCPOSText(plainText);
                      alert(t('successfully_sent_receipt_to_physical_printer'));
                    } catch (e: any) {
                      alert(isRtl ? 'فشلت الطباعة المادية: ' + e.message : 'Physical print failed: ' + e.message);
                    }
                  } else {
                    const printWin = window.open('', '_blank');
                    if (printWin) {
                      printWin.document.write(`<html><head><title>Print Receipt</title></head><body onload="window.print();window.close();">${receiptPreview}</body></html>`);
                      printWin.document.close();
                    }
                  }
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm flex-1"
              >
                🖨️ {t('print_receipt')}
              </button>
              <button
                onClick={() => setReceiptPreview(null)}
                className="px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs font-semibold"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}



    </div>
  );
}
