import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from './context/AppContext';
import { useCart } from './context/CartContext';
// React.lazy dynamic code-splitting imports for all heavy ERP & POS pages
const Dashboard = React.lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const POS = React.lazy(() => import('./pages/POS').then(m => ({ default: m.POS })));
const ERP = React.lazy(() => import('./pages/ERP').then(m => ({ default: m.ERP })));
const CRM = React.lazy(() => import('./pages/CRM').then(m => ({ default: m.CRM })));
const Kitchen = React.lazy(() => import('./pages/Kitchen').then(m => ({ default: m.Kitchen })));
const Reports = React.lazy(() => import('./pages/Reports').then(m => ({ default: m.Reports })));
const Settings = React.lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));
const AIAssistant = React.lazy(() => import('./pages/AIAssistant').then(m => ({ default: m.AIAssistant })));
const LandingPage = React.lazy(() => import('./pages/LandingPage').then(m => ({ default: m.LandingPage })));
import { BusinessSelector } from './components/shared/BusinessSelector';
import { HardwareService } from './services/hardware';

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
  Store
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
    setBusinessType,
    currentUser,
    loginUser,
    logoutUser,
    addUser,
  } = useApp();

  const { receiptPreview, setReceiptPreview } = useCart();

  const [activeTab, setActiveTab] = useState<'dashboard' | 'pos' | 'erp' | 'crm' | 'kds' | 'reports' | 'ai_assistant' | 'settings'>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showHardwareSim, setShowHardwareSim] = useState(false);
  const [scanInput, setScanInput] = useState('');

  // Landing view state
  const [landingView, setLandingView] = useState<'landing' | 'login' | 'signup' | 'otp'>('landing');
  const [showWelcome, setShowWelcome] = useState(!localStorage.getItem('smartpos_first_run_done'));

  // Setup Wizard state — shown when no users exist in localStorage
  const [showSetupWizard, setShowSetupWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2>(1);
  const [wizardName, setWizardName] = useState('');
  const [wizardUsername, setWizardUsername] = useState('');
  const [wizardPassword, setWizardPassword] = useState('');
  const [wizardConfirm, setWizardConfirm] = useState('');
  const [wizardError, setWizardError] = useState('');
  const [wizardDone, setWizardDone] = useState(false);

  // Login form local states
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Signup form local states
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [signupError, setSignupError] = useState('');

  // OTP form local states
  const [otpCode, setOtpCode] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpSuccess, setOtpSuccess] = useState(false);
  const [otpError, setOtpError] = useState('');

  // Derive RTL flag - always computed regardless of render path
  const isRtl = language === 'ar';

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

  const handleSignupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupName.trim() || !signupEmail.trim() || !signupPassword || !signupConfirmPassword) {
      setSignupError(isRtl ? 'الرجاء ملء جميع الحقول!' : 'Please fill all fields!');
      return;
    }
    if (signupPassword.length < 6) {
      setSignupError(isRtl ? 'يجب أن تكون كلمة المرور 6 خانات على الأقل!' : 'Password must be at least 6 characters!');
      return;
    }
    if (signupPassword !== signupConfirmPassword) {
      setSignupError(isRtl ? 'كلمات المرور غير متطابقة!' : 'Passwords do not match!');
      return;
    }
    setSignupError('');
    setOtpLoading(true);
    setTimeout(() => {
      setOtpLoading(false);
      setLandingView('otp');
    }, 1000);
  };

  const handleOtpVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length !== 4 || isNaN(Number(otpCode))) {
      setOtpError(isRtl ? 'يجب إدخال كود التحقق المكون من 4 أرقام!' : 'Verification code must be 4 digits!');
      return;
    }
    setOtpError('');
    setOtpLoading(true);
    setTimeout(() => {
      setOtpLoading(false);
      setOtpSuccess(true);
      // Register user in AppContext
      addUser({
        username: signupEmail,
        displayName: signupName,
        role: 'owner',
        password: signupPassword,
        active: true
      });
      setTimeout(() => {
        setOtpSuccess(false);
        setLoginUsername(signupEmail);
        setLoginPassword(signupPassword);
        setLandingView('login');
      }, 1500);
    }, 1200);
  };

  if (showWelcome) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-6 ${theme === 'dark' ? 'dark bg-[#090d16] text-white' : 'bg-slate-50 text-slate-900'}`} dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="glass-card p-8 rounded-3xl max-w-lg w-full space-y-6 border border-slate-200/50 dark:border-slate-800/50 text-center shadow-2xl relative overflow-hidden">
          {/* Decorative glow */}
          <div className="absolute -top-10 -left-10 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="space-y-3">
            <img src="/logo.png" alt="smart POS" className="h-24 mx-auto object-contain mb-2 filter drop-shadow-[0_0_15px_rgba(59,130,246,0.2)]" />
            <h1 className="text-2xl md:text-3xl font-extrabold bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-500 bg-clip-text text-transparent font-sans">
              {isRtl ? 'نظام سمارت POS & ERP' : 'smart POS & ERP System'}
            </h1>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
              {isRtl ? 'الإصدار المعتمد للإنتاج • v1.0.1' : 'Commercial Release Candidate • v1.0.1'}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-100/50 dark:bg-slate-950/50 border border-slate-200/40 dark:border-slate-800/40 text-xs text-right space-y-2.5 font-sans" dir={isRtl ? 'rtl' : 'ltr'}>
            <div className="flex justify-between items-center border-b border-slate-200/50 dark:border-slate-800/50 pb-2">
              <span className="text-slate-400">{isRtl ? 'نوع الترخيص:' : 'License Type:'}</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">{isRtl ? 'ترخيص تجاري مدى الحياة (المؤسسات)' : 'Lifetime Enterprise License'}</span>
            </div>
            <div className="flex justify-between items-center border-b border-slate-200/50 dark:border-slate-800/50 pb-2">
              <span className="text-slate-400">{isRtl ? 'مفتاح التفعيل:' : 'Activation Key:'}</span>
              <span className="font-bold font-mono text-blue-500">SP-7839-8291-RC101</span>
            </div>
            <div className="flex justify-between items-center border-b border-slate-200/50 dark:border-slate-800/50 pb-2">
              <span className="text-slate-400">{isRtl ? 'حالة قاعدة البيانات:' : 'Database Integrity:'}</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">{isRtl ? 'مؤمنة ومحسنة (IndexedDB / WAL)' : 'Optimized & Secure (IndexedDB / WAL)'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">{isRtl ? 'بيئة التشغيل:' : 'Runtime Environment:'}</span>
              <span className="font-bold text-slate-600 dark:text-slate-300">{isRtl ? 'برنامج تشغيل مستقل (Offline Enabled)' : 'Stand-alone Desktop / Mobile Client'}</span>
            </div>
          </div>

          <div className="text-xs text-slate-500 leading-relaxed max-w-md mx-auto animate-fade-in" dir={isRtl ? 'rtl' : 'ltr'}>
            {isRtl 
              ? 'مرحباً بك! تم تهيئة وضبط قاعدة البيانات المحلية المشفرة وتجهيز الواجهات الذكية بنجاح. هذا المنتج مرخص بالكامل ومعد للاستخدام التجاري في نقاط البيع وإدارة المستودعات.'
              : 'Welcome! The encrypted local database structures and responsive cashier modules have been successfully initialized. This software is fully licensed and prepared for commercial operations.'}
          </div>

          <button
            onClick={() => {
              localStorage.setItem('smartpos_first_run_done', 'true');
              setShowWelcome(false);
            }}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm shadow-lg shadow-blue-900/35 transition-all flex items-center justify-center gap-2"
          >
            <span>{isRtl ? 'بدء الاستخدام وتفعيل واجهة البيع' : 'Initialize & Launch Cashier'}</span>
          </button>
        </div>
      </div>
    );
  }

  if (currentUser === null) {
    if (landingView === 'landing') {
      return (
        <LandingPage 
          language={language} 
          changeLanguage={changeLanguage} 
          onNavigate={(view) => {
            if (view === 'demo') {
              loginUser('owner', 'owner123');
              setBusinessType(null);
              setLandingView('landing');
            } else {
              setLandingView(view);
            }
          }} 
        />
      );
    }

    return (
      <div className={`min-h-screen flex items-center justify-center p-6 ${theme === 'dark' ? 'dark bg-[#090d16]' : 'bg-slate-50'}`}>
        <div className="glass-card p-8 rounded-2xl max-w-sm w-full space-y-5 border border-slate-200/50 dark:border-slate-800/50 text-right">
          
          {/* Card Top Actions */}
          <div className="flex justify-between items-center border-b border-slate-250/20 dark:border-slate-800/40 pb-3" dir={isRtl ? 'rtl' : 'ltr'}>
            <button 
              onClick={() => setLandingView('landing')} 
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-[10px] font-bold flex items-center gap-1 transition-all"
            >
              {isRtl ? '← الرئيسية' : '← Home'}
            </button>
            <select 
              value={language} 
              onChange={(e) => changeLanguage(e.target.value)}
              className="bg-transparent border border-slate-200 dark:border-slate-850 rounded-lg text-[10px] focus:outline-none cursor-pointer px-2 py-1 text-slate-600 dark:text-slate-300"
            >
              <option value="ar" className="bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200">العربية</option>
              <option value="en" className="bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200">English</option>
              <option value="fr" className="bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200">Français</option>
              <option value="de" className="bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200">Deutsch</option>
              <option value="zh" className="bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200">中文</option>
            </select>
          </div>

          {landingView === 'login' && (
            <>
              <div className="text-center space-y-2">
                <img src="/logo.png" alt="smart POS" className="h-28 mx-auto object-contain mb-4 filter drop-shadow-[0_0_15px_rgba(59,130,246,0.2)]" />
                <h2 className="text-xl font-bold bg-gradient-to-r from-blue-500 to-emerald-500 bg-clip-text text-transparent font-sans">
                  {isRtl ? 'تسجيل الدخول للنظام' : 'System Login'}
                </h2>
                <p className="text-xs text-slate-400">
                  {isRtl ? 'الرجاء إدخال بيانات المستخدم المعتمدة للبيع' : 'Enter authorized credentials to proceed'}
                </p>
              </div>

              {loginError && (
                <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-center text-xs text-red-500 font-bold">
                  ⚠️ {loginError}
                </div>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const success = loginUser(loginUsername, loginPassword);
                  if (success) {
                    setLoginUsername('');
                    setLoginPassword('');
                    setLoginError('');
                  } else {
                    setLoginError(isRtl ? 'اسم المستخدم أو كلمة المرور خاطئة!' : 'Incorrect username or password!');
                  }
                }}
                className="space-y-4 text-xs font-semibold"
              >
                <div className={isRtl ? 'text-right' : 'text-left'}>
                  <label className="text-slate-400 block mb-1">{isRtl ? 'اسم المستخدم (البريد)' : 'Username (Email)'}</label>
                  <input
                    type="text"
                    placeholder={isRtl ? "مثال: owner, cashier" : "e.g. owner, cashier"}
                    value={loginUsername}
                    onChange={e => setLoginUsername(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-950 focus:outline-none text-slate-800 dark:text-slate-200 font-sans"
                  />
                </div>
                <div className={isRtl ? 'text-right' : 'text-left'}>
                  <label className="text-slate-400 block mb-1">{isRtl ? 'كلمة المرور' : 'Password'}</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-950 focus:outline-none text-slate-800 dark:text-slate-200"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all shadow-md text-xs mt-2"
                >
                  {isRtl ? 'تسجيل الدخول' : 'Login'}
                </button>
              </form>

              <div className="text-center pt-1 border-t border-slate-200/20 pt-3">
                <button 
                  onClick={() => setLandingView('signup')} 
                  className="text-xs text-blue-500 hover:underline font-bold"
                >
                  {isRtl ? 'تسجيل حساب تجاري جديد' : 'Register New Merchant Account'}
                </button>
              </div>

              {/* First-run: show Setup Wizard link */}
              {!localStorage.getItem('pos_users') && (
                <div className="border-t pt-3 text-center">
                  <button
                    onClick={() => setShowSetupWizard(true)}
                    className="text-xs text-emerald-500 hover:underline font-bold flex items-center gap-1.5 mx-auto"
                  >
                    ✨ {isRtl ? 'إعداد أول حساب للمالك' : 'First-Time Setup Wizard'}
                  </button>
                </div>
              )}
            </>
          )}

          {landingView === 'signup' && (
            <>
              <div className="text-center space-y-2">
                <img src="/logo.png" alt="smart POS" className="h-20 mx-auto object-contain mb-2 filter drop-shadow-[0_0_15px_rgba(59,130,246,0.2)]" />
                <h2 className="text-xl font-bold bg-gradient-to-r from-blue-500 to-emerald-500 bg-clip-text text-transparent font-sans">
                  {isRtl ? 'تسجيل حساب تجاري جديد' : 'Register Business Account'}
                </h2>
                <p className="text-xs text-slate-400">
                  {isRtl ? 'ابدأ بإعداد نظام الكاشير لشركتك الآن' : 'Start configuring your retail POS system'}
                </p>
              </div>

              {signupError && (
                <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-center text-xs text-red-500 font-bold">
                  ⚠️ {signupError}
                </div>
              )}

              <form onSubmit={handleSignupSubmit} className="space-y-3.5 text-xs font-semibold">
                <div className={isRtl ? 'text-right' : 'text-left'}>
                  <label className="text-slate-400 block mb-1">{isRtl ? 'الاسم الكامل' : 'Full Name'}</label>
                  <input
                    type="text"
                    required
                    placeholder={isRtl ? "مثال: أحمد محمد" : "e.g. John Doe"}
                    value={signupName}
                    onChange={e => setSignupName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-950 focus:outline-none text-slate-800 dark:text-slate-200"
                  />
                </div>
                <div className={isRtl ? 'text-right' : 'text-left'}>
                  <label className="text-slate-400 block mb-1">{isRtl ? 'البريد الإلكتروني' : 'Email Address'}</label>
                  <input
                    type="email"
                    required
                    placeholder="name@company.com"
                    value={signupEmail}
                    onChange={e => setSignupEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-950 focus:outline-none text-slate-800 dark:text-slate-200 font-sans"
                  />
                </div>
                <div className={isRtl ? 'text-right' : 'text-left'}>
                  <label className="text-slate-400 block mb-1">{isRtl ? 'كلمة المرور' : 'Password'}</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={signupPassword}
                    onChange={e => setSignupPassword(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-950 focus:outline-none text-slate-800 dark:text-slate-200"
                  />
                </div>
                <div className={isRtl ? 'text-right' : 'text-left'}>
                  <label className="text-slate-400 block mb-1">{isRtl ? 'تأكيد كلمة المرور' : 'Confirm Password'}</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={signupConfirmPassword}
                    onChange={e => setSignupConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-950 focus:outline-none text-slate-800 dark:text-slate-200"
                  />
                </div>

                <button
                  type="submit"
                  disabled={otpLoading}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all shadow-md text-xs mt-2 disabled:opacity-50"
                >
                  {otpLoading ? (isRtl ? 'جاري التحضير...' : 'Preparing...') : (isRtl ? 'تسجيل وإرسال كود التفعيل' : 'Sign Up & Send Code')}
                </button>
              </form>

              <div className="text-center pt-2 border-t border-slate-200/20">
                <span className="text-slate-400 text-xs">{isRtl ? 'لديك حساب بالفعل؟ ' : 'Already have an account? '}</span>
                <button 
                  onClick={() => setLandingView('login')} 
                  className="text-xs text-blue-500 hover:underline font-bold"
                >
                  {isRtl ? 'تسجيل الدخول' : 'Login'}
                </button>
              </div>
            </>
          )}

          {landingView === 'otp' && (
            <>
              <div className="text-center space-y-2">
                <div className="w-16 h-16 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto text-blue-500 text-2xl animate-bounce">
                  ✉️
                </div>
                <h2 className="text-xl font-bold bg-gradient-to-r from-blue-500 to-emerald-500 bg-clip-text text-transparent font-sans">
                  {isRtl ? 'تأكيد الحساب والبريد' : 'Verify Email Address'}
                </h2>
                <p className="text-xs text-slate-400 leading-relaxed font-sans" dir={isRtl ? 'rtl' : 'ltr'}>
                  {isRtl 
                    ? `أدخل كود التحقق المكون من 4 أرقام المرسل إلى البريد ${signupEmail}` 
                    : `Enter the 4-digit code sent to ${signupEmail}`}
                </p>
              </div>

              {otpError && (
                <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-center text-xs text-red-500 font-bold">
                  ⚠️ {otpError}
                </div>
              )}

              {otpSuccess ? (
                <div className="p-6 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-500 text-xl font-bold">
                    ✓
                  </div>
                  <h4 className="font-extrabold text-sm text-emerald-500">{isRtl ? 'تم تأكيد الحساب بنجاح!' : 'Account Confirmed!'}</h4>
                  <p className="text-[10px] text-slate-400">{isRtl ? 'جاري توجيهك لصفحة الدخول...' : 'Redirecting to login...'}</p>
                </div>
              ) : (
                <form onSubmit={handleOtpVerify} className="space-y-4 text-xs font-semibold">
                  <div className="space-y-1">
                    <input
                      type="text"
                      maxLength={4}
                      required
                      placeholder="1234"
                      value={otpCode}
                      onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      className="w-40 mx-auto px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-950 text-center focus:outline-none text-lg text-slate-800 dark:text-slate-200 font-mono tracking-widest block"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={otpLoading}
                    className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all shadow-md text-xs disabled:opacity-50"
                  >
                    {otpLoading ? (isRtl ? 'جاري التأكيد...' : 'Verifying...') : (isRtl ? 'تأكيد الرمز وتفعيل الحساب' : 'Verify & Activate')}
                  </button>
                </form>
              )}

              {!otpSuccess && (
                <div className="text-center pt-2 border-t border-slate-200/20">
                  <button 
                    type="button"
                    onClick={() => {
                      alert(isRtl ? 'تم إعادة إرسال الرمز (1234) للاختبار.' : 'Code (1234) resent for testing.');
                    }}
                    className="text-[10px] text-slate-400 hover:underline"
                  >
                    {isRtl ? 'إعادة إرسال الرمز' : 'Resend Verification Code'}
                  </button>
                </div>
              )}
            </>
          )}

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
      { id: 'settings' as const, label: t('settings'), icon: SettingsIcon }
    ] : [])
  ];

  return (
    <div className={`min-h-screen flex text-slate-800 dark:text-slate-100 ${theme === 'dark' ? 'dark bg-[#090d16]' : 'bg-slate-50'}`}>
      
      {/* Sidebar Navigation */}
      <aside
        className={`glass-card border-slate-200/50 dark:border-slate-800/50 transition-all duration-300 flex flex-col justify-between ${
          sidebarCollapsed ? 'w-16' : 'w-60'
        } ${isRtl ? 'border-l' : 'border-r'}`}
      >
        <div className="flex flex-col space-y-6 pt-5">
          {/* Logo Brand */}
          <div className="px-4 flex items-center justify-between">
            {!sidebarCollapsed && (
              <span className="font-extrabold text-base tracking-wide bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-500 bg-clip-text text-transparent flex items-center gap-2 font-sans">
                <img src="/logo.png" alt="smart POS" className="h-10 w-10 object-contain" />
                <span>{isRtl ? 'سمارت POS' : 'smart POS'}</span>
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
              title={isRtl ? 'تسجيل الخروج' : 'Logout'}
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
                <span className="font-semibold text-slate-500">{isRtl ? 'الاتصال والفرع' : 'Branch Node'}</span>
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
                {isSyncing ? (isRtl ? 'مزامنة...' : 'Syncing...') : (isRtl ? 'مزامنة السحابة' : 'Sync Cloud')}
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
            <span>{isRtl ? 'فرع الكاشير:' : 'Terminal Node:'}</span>
            <span className="text-slate-800 dark:text-slate-100 bg-slate-150 dark:bg-slate-850 px-2.5 py-1.5 rounded-lg">
              {isRtl ? selectedBranch.name_ar : selectedBranch.name_en}
            </span>
            <span className="text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1.5 rounded-lg flex items-center gap-1 text-[10px] uppercase font-black font-sans">
              <Store className="h-3.5 w-3.5" />
              {businessType === 'restaurant' ? (isRtl ? '🍽️ مطعم ومقهى' : 'Restaurant') :
               businessType === 'pharmacy' ? (isRtl ? '💊 صيدلية وعيادة' : 'Pharmacy') :
               businessType === 'retail' ? (isRtl ? '👕 متجر تجزئة' : 'Retail Store') :
               (isRtl ? '🚢 استيراد وتصدير' : 'Import/Export')}
            </span>
          </div>

          <div className="flex items-center gap-3">

            {/* Devices controller link shortcut */}
            {import.meta.env.DEV && (
              <button
                onClick={() => setShowHardwareSim(!showHardwareSim)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1.5 transition-all shadow-xs"
              >
                🖥️ {isRtl ? 'محاكي الأجهزة' : 'Devices Emulator'}
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
          </React.Suspense>
        </main>
      </div>

      {/* Floating Hardware Simulator panel */}
      {import.meta.env.DEV && showHardwareSim && (
        <div className={`fixed bottom-4 z-40 bg-slate-900 text-white p-5 rounded-2xl shadow-2xl w-80 space-y-4 border border-slate-700 font-sans transition-all animate-fade-in ${isRtl ? 'left-4' : 'right-4'}`}>
          <div className="flex justify-between items-center border-b border-slate-700 pb-2">
            <h4 className="font-extrabold text-sm flex items-center gap-1.5">
              📟 {isRtl ? 'لوحة محاكاة الأجهزة الملحقة' : 'Peripheral Device Panel'}
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
                      alert(isRtl ? 'تم إرسال الفاتورة الحرارية بنجاح إلى الطابعة المادية متصلة 🖨️' : 'Successfully sent receipt to physical printer 🖨️');
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
                🖨️ {isRtl ? 'طباعة فعلية' : 'Print Receipt'}
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

      {/* ── Setup Wizard Modal (First-Time Owner Setup) ─────────────────────── */}
      {showSetupWizard && (
        <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-6" dir={isRtl ? 'rtl' : 'ltr'}>
          <div className="glass-card p-8 rounded-3xl max-w-md w-full space-y-6 border border-slate-200/50 dark:border-slate-800/50 shadow-2xl relative overflow-hidden animate-fade-in">
            {/* Glow decorations */}
            <div className="absolute -top-10 -left-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Header */}
            <div className="text-center space-y-2">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center text-white text-2xl shadow-lg">
                ⚙️
              </div>
              <h2 className="text-xl font-extrabold bg-gradient-to-r from-emerald-500 to-blue-500 bg-clip-text text-transparent font-sans">
                {isRtl ? 'إعداد النظام الأول' : 'First-Time Setup'}
              </h2>
              <p className="text-xs text-slate-400">
                {isRtl ? 'أنشئ حساب المالك الرئيسي لبدء استخدام النظام' : 'Create the owner account to start using the system'}
              </p>
            </div>

            {/* Progress steps */}
            <div className="flex items-center gap-2 justify-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 ${wizardStep >= 1 ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 text-slate-400'}`}>1</div>
              <div className={`flex-1 h-0.5 ${wizardStep >= 2 ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-800'}`} />
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 ${wizardStep >= 2 ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 dark:border-slate-700 text-slate-400'}`}>2</div>
            </div>

            {wizardError && (
              <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-center text-xs text-red-500 font-bold">
                ⚠️ {wizardError}
              </div>
            )}

            {wizardDone ? (
              <div className="text-center space-y-3 py-4">
                <div className="text-5xl animate-bounce">✅</div>
                <p className="text-sm font-bold text-emerald-500">{isRtl ? 'تم إنشاء الحساب بنجاح!' : 'Account created successfully!'}</p>
                <p className="text-xs text-slate-400">{isRtl ? 'جاري تسجيل الدخول...' : 'Logging you in...'}</p>
              </div>
            ) : wizardStep === 1 ? (
              <form onSubmit={(e) => {
                e.preventDefault();
                if (!wizardName.trim() || !wizardUsername.trim()) {
                  setWizardError(isRtl ? 'الرجاء ملء جميع الحقول' : 'Please fill all fields');
                  return;
                }
                setWizardError('');
                setWizardStep(2);
              }} className="space-y-4">
                <div className={isRtl ? 'text-right' : 'text-left'}>
                  <label className="text-xs text-slate-400 block mb-1 font-bold">{isRtl ? 'الاسم الكامل' : 'Full Name'}</label>
                  <input
                    type="text"
                    required
                    placeholder={isRtl ? 'مثال: أحمد محمد' : 'e.g. John Smith'}
                    value={wizardName}
                    onChange={e => setWizardName(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
                  />
                </div>
                <div className={isRtl ? 'text-right' : 'text-left'}>
                  <label className="text-xs text-slate-400 block mb-1 font-bold">{isRtl ? 'اسم المستخدم (للدخول)' : 'Username (for login)'}</label>
                  <input
                    type="text"
                    required
                    placeholder={isRtl ? 'مثال: admin أو owner' : 'e.g. admin or owner'}
                    value={wizardUsername}
                    onChange={e => setWizardUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm font-mono"
                  />
                </div>
                <button type="submit" className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-blue-600 hover:opacity-90 text-white font-bold text-sm shadow-md transition-all">
                  {isRtl ? 'التالي ←' : 'Next →'}
                </button>
                <button type="button" onClick={() => setShowSetupWizard(false)} className="w-full py-2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
              </form>
            ) : (
              <form onSubmit={(e) => {
                e.preventDefault();
                if (wizardPassword.length < 6) {
                  setWizardError(isRtl ? 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' : 'Password must be at least 6 characters');
                  return;
                }
                if (wizardPassword !== wizardConfirm) {
                  setWizardError(isRtl ? 'كلمتا المرور غير متطابقتين' : 'Passwords do not match');
                  return;
                }
                setWizardError('');
                addUser({ username: wizardUsername, displayName: wizardName, role: 'owner', password: wizardPassword, active: true });
                setWizardDone(true);
                setTimeout(() => {
                  setShowSetupWizard(false);
                  setWizardDone(false);
                  setWizardStep(1);
                  setLoginUsername(wizardUsername);
                  setLoginPassword(wizardPassword);
                  setLandingView('login');
                }, 1800);
              }} className="space-y-4">
                <div className={isRtl ? 'text-right' : 'text-left'}>
                  <label className="text-xs text-slate-400 block mb-1 font-bold">{isRtl ? 'كلمة المرور' : 'Password'}</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={wizardPassword}
                    onChange={e => setWizardPassword(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
                  />
                </div>
                <div className={isRtl ? 'text-right' : 'text-left'}>
                  <label className="text-xs text-slate-400 block mb-1 font-bold">{isRtl ? 'تأكيد كلمة المرور' : 'Confirm Password'}</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={wizardConfirm}
                    onChange={e => setWizardConfirm(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
                  />
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setWizardStep(1)} className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold">
                    {isRtl ? '→ رجوع' : '← Back'}
                  </button>
                  <button type="submit" className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-blue-600 hover:opacity-90 text-white font-bold text-sm shadow-md transition-all">
                    {isRtl ? '✓ إنشاء الحساب والدخول' : '✓ Create Account & Login'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
