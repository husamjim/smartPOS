import { useTranslation } from 'react-i18next';
import React from 'react';
import { Settings as SettingsIcon, Building2, Languages, Sun, Moon, ToggleLeft, ToggleRight, Database, Printer, HardDrive, Users, UserPlus, Trash2, Edit3, Eye, EyeOff, Image, Shield, Receipt, Brain, Landmark, History, Bell, RotateCw, HelpCircle, Info, Palette, Store, Shirt } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { db, seedLocalDbIfEmpty } from '../db/localDb';
import { HardwareService } from '../services/hardware';
import { COUNTRIES } from '../utils/countries';

// New Sub-components Imports
import { BackupCenter } from '../components/settings/BackupCenter';
import { AuditLogPanel } from '../components/settings/AuditLogPanel';
import { NotificationCenter } from '../components/settings/NotificationCenter';
import { UpdatesCenter } from '../components/settings/UpdatesCenter';
import { SupportCenter } from '../components/settings/SupportCenter';
import { BrandSettings } from '../components/settings/BrandSettings';
import { AboutSystem } from '../components/settings/AboutSystem';
import { CompanyManager } from '../components/settings/CompanyManager';

export const Settings: React.FC = () => {
  const { t } = useTranslation();
  const [settingsTab, setSettingsTab] = React.useState<'general' | 'brand' | 'invoice' | 'users' | 'ai' | 'backup' | 'accounts' | 'companies' | 'audit' | 'notifications' | 'updates' | 'support' | 'about'>('general');

  const {
    theme,
    toggleTheme,
    language,
    changeLanguage,
    selectedBranch,
    setSelectedBranch,
    branches,
    devices,
    toggleDevice,
    businessType,
    currency,
    setCurrency,
    taxPercentage,
    setTaxPercentage,
    taxName,
    setTaxName,
    storeName,
    setStoreName,
    vatNumber,
    setVatNumber,
    users,
    addUser,
    updateUser,
    deleteUser,
    currentUser,
    storePhone,
    setStorePhone,
    storeAddress,
    setStoreAddress,
    receiptFooter,
    setReceiptFooter,
    storeLogo,
    setStoreLogo,
    selectCompany,
    country,
    setCountry,
    city,
    setCity,
    postalCode,
    setPostalCode,
    crNumber,
    setCrNumber,
    dateSystem,
    setDateSystem,
    numberLocale,
    setNumberLocale,
    dateFormat,
    setDateFormat
  } = useApp();

  const [tables, setTables] = React.useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('pos_restaurant_tables');
      return saved ? JSON.parse(saved) : ['Table 1', 'Table 2', 'Table 3', 'Table 4', 'Table 5', 'Table 6'];
    } catch (e) {
      return ['Table 1', 'Table 2', 'Table 3', 'Table 4', 'Table 5', 'Table 6'];
    }
  });
  const [availableSizes, setAvailableSizes] = React.useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('pos_retail_sizes');
      return saved ? JSON.parse(saved) : ['S', 'M', 'L', 'XL'];
    } catch (e) {
      return ['S', 'M', 'L', 'XL'];
    }
  });
  const [availableColors, setAvailableColors] = React.useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('pos_retail_colors');
      return saved ? JSON.parse(saved) : ['Red', 'Blue', 'Black'];
    } catch (e) {
      return ['Red', 'Blue', 'Black'];
    }
  });

  const [newTableName, setNewTableName] = React.useState('');
  const [newSizeName, setNewSizeName] = React.useState('');
  const [newColorName, setNewColorName] = React.useState('');

  // ── Task A: User Management state ──────────────────────────────────────────
  const [showAddUser, setShowAddUser] = React.useState(false);
  const [editingUserId, setEditingUserId] = React.useState<string | null>(null);
  const [userForm, setUserForm] = React.useState({ displayName: '', username: '', password: '', role: 'cashier' as 'owner' | 'manager' | 'cashier' });
  const [showUserPassword, setShowUserPassword] = React.useState(false);

  const resetUserForm = () => {
    setUserForm({ displayName: '', username: '', password: '', role: 'cashier' });
    setShowAddUser(false);
    setEditingUserId(null);
    setShowUserPassword(false);
  };

  const handleSaveUser = () => {
    if (!userForm.displayName.trim() || !userForm.username.trim()) {
      alert(t('display_name_and_username_are_required'));
      return;
    }
    if (editingUserId) {
      updateUser(editingUserId, {
        displayName: userForm.displayName.trim(),
        username: userForm.username.trim(),
        role: userForm.role,
        ...(userForm.password ? { password: userForm.password } : {})
      });
    } else {
      if (!userForm.password.trim()) {
        alert(t('password_is_required_for_a_new_user'));
        return;
      }
      addUser({
        displayName: userForm.displayName.trim(),
        username: userForm.username.trim(),
        password: userForm.password.trim(),
        role: userForm.role,
        active: true
      });
    }
    resetUserForm();
  };

  const handleEditUser = (u: any) => {
    setEditingUserId(u.id);
    setUserForm({ displayName: u.displayName, username: u.username, password: '', role: u.role });
    setShowAddUser(true);
  };

  const handleDeleteUser = (u: any) => {
    if (u.id === currentUser?.id) {
      alert(t('you_cannot_delete_your_own_account'));
      return;
    }
    const activeUsers = (users || []).filter(x => x.active);
    if (activeUsers.length <= 1 && u.active) {
      alert(t('cannot_delete_the_last_active_user'));
      return;
    }
    if (confirm(isRtl ? `هل تريد حذف المستخدم "${u.displayName}"؟` : `Delete user "${u.displayName}"?`)) {
      deleteUser(u.id);
    }
  };

  // ── Task C: Restaurant Modifiers state ────────────────────────────────────
  const [modifiers, setModifiers] = React.useState<{ id: string; ar: string; en: string }[]>(() => {
    const saved = localStorage.getItem('pos_restaurant_modifiers');
    return saved ? JSON.parse(saved) : [
      { id: '1', ar: 'بدون بصل', en: 'No Onion' },
      { id: '2', ar: 'حار جداً', en: 'Extra Spicy' },
      { id: '3', ar: 'بدون ثوم', en: 'No Garlic' },
      { id: '4', ar: 'إضافي جبن', en: 'Extra Cheese' }
    ];
  });
  const [newModAr, setNewModAr] = React.useState('');
  const [newModEn, setNewModEn] = React.useState('');

  React.useEffect(() => {
    localStorage.setItem('pos_restaurant_modifiers', JSON.stringify(modifiers));
  }, [modifiers]);

  const handleAddModifier = () => {
    const ar = newModAr.trim();
    const en = newModEn.trim();
    if (!ar && !en) return;
    const newMod = { id: Date.now().toString(), ar, en };
    setModifiers(prev => [...prev, newMod]);
    setNewModAr('');
    setNewModEn('');
  };

  const handleDeleteModifier = (id: string) => {
    setModifiers(prev => prev.filter(m => m.id !== id));
  };

  // ── Logo file input ref ────────────────────────────────────────────────────
  const logoInputRef = React.useRef<HTMLInputElement>(null);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) setStoreLogo(ev.target.result as string);
    };
    reader.readAsDataURL(file);
  };

  React.useEffect(() => {
    localStorage.setItem('pos_restaurant_tables', JSON.stringify(tables));
  }, [tables]);

  React.useEffect(() => {
    localStorage.setItem('pos_retail_sizes', JSON.stringify(availableSizes));
  }, [availableSizes]);

  React.useEffect(() => {
    localStorage.setItem('pos_retail_colors', JSON.stringify(availableColors));
  }, [availableColors]);

  const colorMap: Record<string, string> = {
    'Red': 'أحمر',
    'Blue': 'أزرق',
    'Black': 'أسود',
    'Green': 'أخضر',
    'White': 'أبيض',
    'Yellow': 'أصفر',
    'Orange': 'برتقالي',
    'Grey': 'رمادي',
    'Brown': 'بني',
    'Pink': 'وردي',
    'Purple': 'بنفسجي'
  };

  const majorCurrencies = [
    { code: 'USD', name: 'US Dollar (دولار أمريكي)' },
    { code: 'SAR', name: 'Saudi Riyal (ريال سعودي)' },
    { code: 'EUR', name: 'Euro (يورو)' },
    { code: 'GBP', name: 'British Pound (جنيه إسترليني)' },
    { code: 'AED', name: 'UAE Dirham (درهم إماراتي)' },
    { code: 'EGP', name: 'Egyptian Pound (جنيه مصري)' },
    { code: 'KWD', name: 'Kuwaiti Dinar (دينار كويتي)' },
    { code: 'QAR', name: 'Qatari Riyal (ريال قطري)' },
    { code: 'OMR', name: 'Omani Rial (ريال عماني)' },
    { code: 'BHD', name: 'Bahraini Dinar (دينار بحريني)' },
    { code: 'JOD', name: 'Jordanian Dinar (دينار أردني)' },
    { code: 'LBP', name: 'Lebanese Pound (ليرة لبنانية)' },
    { code: 'DZD', name: 'Algerian Dinar (دينار جزائري)' },
    { code: 'MAD', name: 'Moroccan Dirham (درهم مغربي)' },
    { code: 'SDG', name: 'Sudanese Pound (جنيه سوداني)' },
    { code: 'IQD', name: 'Iraqi Dinar (دينار عراقي)' },
    { code: 'YER', name: 'Yemeni Rial (ريال يمني)' },
    { code: 'LYD', name: 'Libyan Dinar (دينار ليبي)' },
    { code: 'TND', name: 'Tunisian Dinar (دينار تونسي)' },
    { code: 'CAD', name: 'Canadian Dollar (دولار كندي)' },
    { code: 'AUD', name: 'Australian Dollar (دولار أسترالي)' },
    { code: 'CHF', name: 'Swiss Franc (فرنك سويسري)' },
    { code: 'CNY', name: 'Chinese Yuan (يوان صيني)' },
    { code: 'JPY', name: 'Japanese Yen (ين ياباني)' },
    { code: 'INR', name: 'Indian Rupee (روبية هندية)' },
    { code: 'RUB', name: 'Russian Ruble (روبل روسي)' },
    { code: 'TRY', name: 'Turkish Lira (ليرة تركية)' },
    { code: 'ZAR', name: 'South African Rand (راند جنوب أفريقي)' },
    { code: 'NZD', name: 'New Zealand Dollar (دولار نيوزيلندي)' },
    { code: 'SGD', name: 'Singapore Dollar (دولار سنغافوري)' },
    { code: 'HKD', name: 'Hong Kong Dollar (دولار هونغ كونغ)' },
    { code: 'KRW', name: 'South Korean Won (وون كوري)' },
    { code: 'BRL', name: 'Brazilian Real (ريال برازيلي)' },
    { code: 'MXN', name: 'Mexican Peso (بيزو مكسيكي)' },
    { code: 'PKR', name: 'Pakistani Rupee (روبية باكستانية)' },
    { code: 'BDT', name: 'Bangladeshi Taka (تاكا بنغلاديشي)' },
    { code: 'IDR', name: 'Indonesian Rupiah (روبية إندونيسية)' },
    { code: 'MYR', name: 'Malaysian Ringgit (رينغيت ماليزي)' },
    { code: 'PHP', name: 'Philippine Peso (بيزو فلبيني)' },
    { code: 'THB', name: 'Thai Baht (بات تايلاندي)' },
    { code: 'VND', name: 'Vietnamese Dong (دونغ فيتنامي)' },
    { code: 'SEK', name: 'Swedish Krona (كرونة سويدية)' },
    { code: 'NOK', name: 'Norwegian Krone (كرونة نرويجية)' },
    { code: 'DKK', name: 'Danish Krone (كرونة دنماركية)' },
    { code: 'PLN', name: 'Polish Zloty (زلوتي بولندي)' },
    { code: 'ILS', name: 'Israeli Shekel (شيكل جديد)' },
    { code: 'ZWD', name: 'Zimbabwean Dollar (دولار زيمبابوي)' },
    { code: 'NGN', name: 'Nigerian Naira (نايرا نيجيرية)' },
    { code: 'GHS', name: 'Ghanaian Cedi (سيدي غاني)' },
    { code: 'KES', name: 'Kenyan Shilling (شلن كيني)' }
  ];



  const [isPrinterConnecting, setIsPrinterConnecting] = React.useState(false);
  const [isScaleConnecting, setIsScaleConnecting] = React.useState(false);
  const [connectedPrinterName, setConnectedPrinterName] = React.useState(HardwareService.isPrinterConnected() ? 'USB Printer' : '');
  const [connectedScaleName, setConnectedScaleName] = React.useState(HardwareService.isScaleConnected() ? 'Serial Scale' : '');

  const handleConnectPrinter = async () => {
    setIsPrinterConnecting(true);
    try {
      const name = await HardwareService.connectPrinter();
      setConnectedPrinterName(name);
      alert(isRtl ? `تم التوصيل بنجاح بطابعة: ${name}` : `Successfully connected to printer: ${name}`);
    } catch (e: any) {
      alert(t('no_physical_printer_found_defaulting_to_simulator'));
    } finally {
      setIsPrinterConnecting(false);
    }
  };

  const handleConnectScale = async () => {
    setIsScaleConnecting(true);
    try {
      const name = await HardwareService.connectScale();
      setConnectedScaleName(name);
      alert(isRtl ? `تم التوصيل بنجاح بميزان: ${name}` : `Successfully connected to scale: ${name}`);
    } catch (e: any) {
      alert(t('no_scale_connection_detected_defaulting_to_simulator'));
    } finally {
      setIsScaleConnecting(false);
    }
  };

  const handleTestPrint = () => {
    if (HardwareService.isPrinterConnected()) {
      HardwareService.printRawESCPOSText('ANTIGRAVITY POS TEST PRINT\n--------------------------\nDevice connection functional.\nArabic/English CP864 font online.');
    } else {
      alert('طابعة الفاتورة الحرارية: تم إرسال صفحة اختبار الطباعة ESC/POS بنجاح (محاكاة).');
    }
  };

  const handleTestDrawer = () => {
    // Play a mock cash drawer sound
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    
    osc.connect(gain);
    gain.connect(audioContext.destination);
    
    osc.frequency.setValueAtTime(800, audioContext.currentTime); // Ding frequency
    gain.gain.setValueAtTime(0.1, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.5); // Decay
    
    osc.start();
    osc.stop(audioContext.currentTime + 0.5);
    
    alert('درج النقود: تم إرسال إشارة فتح الدرج بنجاح (محاكاة + صوت دينغ).');
  };

  const handleSeedOptional = async () => {
    if (confirm(isRtl ? 'هل تريد تحميل البيانات التجريبية الاختيارية (أصناف ديمو، عملاء، موردين، وباتشات مستودعات)؟' : 'Do you want to load optional demo dataset (mock products, customers, suppliers, batches)?')) {
      const { seedLocalDbOptional } = await import('../db/localDb');
      await seedLocalDbOptional();
      alert(t('demo_data_populated_successfully'));
      window.location.reload();
    }
  };

  const handleResetDatabase = async () => {
    if (confirm('هل أنت متأكد من مسح وإعادة تهيئة قاعدة البيانات المحلية؟ سيتم حذف جميع المبيعات والعملاء غير المزامنين.')) {
      await db.delete();
      await db.open();
      await seedLocalDbIfEmpty();
      alert('تمت إعادة تهيئة قاعدة البيانات المحلية بنجاح.');
      window.location.reload();
    }
  };

  const isRtl = document.documentElement.dir === 'rtl';

  // ── AI Assistant Settings state ───────────────────────────────────────────
  const [aiProvider, setAiProvider] = React.useState(() => {
    try { const c = JSON.parse(atob(localStorage.getItem('pos_ai_config') || '')); return c.provider || 'openai'; } catch { return 'openai'; }
  });
  const [aiKeyRaw, setAiKeyRaw] = React.useState('');
  const [aiBaseUrl, setAiBaseUrl] = React.useState(() => {
    try { const c = JSON.parse(atob(localStorage.getItem('pos_ai_config') || '')); return c.baseUrl || ''; } catch { return ''; }
  });
  const [aiModel, setAiModel] = React.useState(() => {
    try { const c = JSON.parse(atob(localStorage.getItem('pos_ai_config') || '')); return c.model || ''; } catch { return ''; }
  });
  const [aiSaved, setAiSaved] = React.useState(!!localStorage.getItem('pos_ai_config'));
  const [aiTesting, setAiTesting] = React.useState(false);
  const [aiTestResult, setAiTestResult] = React.useState<'idle' | 'ok' | 'fail'>('idle');

  const AI_MODELS: Record<string, {label: string; models: string[]}> = {
    openai: { label: 'OpenAI', models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'] },
    gemini: { label: 'Google Gemini', models: ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'] },
    anthropic: { label: 'Anthropic Claude', models: ['claude-opus-4-5', 'claude-sonnet-4-5', 'claude-haiku-3-5'] },
    openrouter: { label: 'OpenRouter', models: ['openai/gpt-4o', 'anthropic/claude-opus-4-5', 'meta-llama/llama-3.1-405b'] },
  };

  const handleSaveAi = () => {
    const keyToSave = aiKeyRaw.trim() || (aiSaved ? JSON.parse(atob(localStorage.getItem('pos_ai_config') || 'e30=')).key : '');
    if (!keyToSave) { alert(t('please_enter_an_api_key')); return; }
    const cfg = { provider: aiProvider, key: keyToSave, baseUrl: aiBaseUrl, model: aiModel };
    localStorage.setItem('pos_ai_config', btoa(JSON.stringify(cfg)));
    setAiKeyRaw('');
    setAiSaved(true);
    setAiTestResult('idle');
    alert(t('ai_settings_saved_successfully'));
  };

  const handleTestAi = async () => {
    const savedCfg = localStorage.getItem('pos_ai_config');
    if (!savedCfg) { alert(t('save_settings_first')); return; }
    setAiTesting(true);
    setAiTestResult('idle');
    try {
      const cfg = JSON.parse(atob(savedCfg));
      let url = '';
      let headers: Record<string,string> = { 'Content-Type': 'application/json' };
      let body: any;
      if (cfg.provider === 'openai') {
        url = (cfg.baseUrl || 'https://api.openai.com') + '/v1/chat/completions';
        headers['Authorization'] = `Bearer ${cfg.key}`;
        body = { model: cfg.model || 'gpt-4o-mini', messages: [{role: 'user', content: 'ping'}], max_tokens: 1 };
      } else if (cfg.provider === 'gemini') {
        url = `https://generativelanguage.googleapis.com/v1beta/models/${cfg.model || 'gemini-1.5-flash'}:generateContent?key=${cfg.key}`;
        body = { contents: [{parts: [{text: 'ping'}]}], generationConfig: {maxOutputTokens: 1} };
      } else if (cfg.provider === 'anthropic') {
        url = 'https://api.anthropic.com/v1/messages';
        headers['x-api-key'] = cfg.key;
        headers['anthropic-version'] = '2023-06-01';
        body = { model: cfg.model || 'claude-haiku-3-5', max_tokens: 1, messages: [{role:'user', content:'ping'}] };
      } else {
        url = (cfg.baseUrl || 'https://openrouter.ai/api') + '/v1/chat/completions';
        headers['Authorization'] = `Bearer ${cfg.key}`;
        body = { model: cfg.model || 'openai/gpt-4o', messages: [{role:'user', content:'ping'}], max_tokens: 1 };
      }
      const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
      setAiTestResult(res.ok || res.status === 400 ? 'ok' : 'fail');
    } catch { setAiTestResult('fail'); }
    setAiTesting(false);
  };

  // ── Invoice / Store Settings state ────────────────────────────────────────
  const [invPhone2, setInvPhone2] = React.useState(() => localStorage.getItem('pos_store_phone2') || '');
  const [invEmail, setInvEmail] = React.useState(() => localStorage.getItem('pos_store_email') || '');
  const [invWebsite, setInvWebsite] = React.useState(() => localStorage.getItem('pos_store_website') || '');
  const [invCrNumber, setInvCrNumber] = React.useState(() => localStorage.getItem('pos_store_cr') || '');
  const [invPaperSize, setInvPaperSize] = React.useState(() => localStorage.getItem('pos_invoice_paper') || '80mm');
  const [invReturnPolicy, setInvReturnPolicy] = React.useState(() => localStorage.getItem('pos_return_policy') || '');
  const [invShowLogo, setInvShowLogo] = React.useState(() => localStorage.getItem('pos_inv_show_logo') !== 'false');
  const [invShowAddress, setInvShowAddress] = React.useState(() => localStorage.getItem('pos_inv_show_address') !== 'false');
  const [invShowPhone, setInvShowPhone] = React.useState(() => localStorage.getItem('pos_inv_show_phone') !== 'false');
  const [invShowTax, setInvShowTax] = React.useState(() => localStorage.getItem('pos_inv_show_tax') !== 'false');
  const [invShowQr, setInvShowQr] = React.useState(() => localStorage.getItem('pos_inv_show_qr') !== 'false');
  const [invShowCr, setInvShowCr] = React.useState(() => localStorage.getItem('pos_inv_show_cr') !== 'false');
  const [invColor, setInvColor] = React.useState(() => localStorage.getItem('pos_inv_color') || '#3b82f6');
  const [invSavedMsg, setInvSavedMsg] = React.useState('');

  const handleSaveInvoice = () => {
    localStorage.setItem('pos_store_phone2', invPhone2);
    localStorage.setItem('pos_store_email', invEmail);
    localStorage.setItem('pos_store_website', invWebsite);
    localStorage.setItem('pos_store_cr', invCrNumber);
    localStorage.setItem('pos_invoice_paper', invPaperSize);
    localStorage.setItem('pos_return_policy', invReturnPolicy);
    localStorage.setItem('pos_inv_show_logo', String(invShowLogo));
    localStorage.setItem('pos_inv_show_address', String(invShowAddress));
    localStorage.setItem('pos_inv_show_phone', String(invShowPhone));
    localStorage.setItem('pos_inv_show_tax', String(invShowTax));
    localStorage.setItem('pos_inv_show_qr', String(invShowQr));
    localStorage.setItem('pos_inv_show_cr', String(invShowCr));
    localStorage.setItem('pos_inv_color', invColor);
    setInvSavedMsg(t('saved'));
    setTimeout(() => setInvSavedMsg(''), 2500);
  };

  // ── Chart of Accounts state ───────────────────────────────────────────────
  type Account = { id: string; code: string; name_ar: string; name_en: string; type: string; parent: string };
  const [accounts, setAccounts] = React.useState<Account[]>(() => {
    try { return JSON.parse(localStorage.getItem('pos_chart_of_accounts') || '[]'); } catch { return []; }
  });
  const [showAccForm, setShowAccForm] = React.useState(false);
  const [editingAccId, setEditingAccId] = React.useState<string | null>(null);
  const [accForm, setAccForm] = React.useState({ code: '', name_ar: '', name_en: '', type: 'asset', parent: '' });
  const [accSearch, setAccSearch] = React.useState('');

  React.useEffect(() => {
    localStorage.setItem('pos_chart_of_accounts', JSON.stringify(accounts));
  }, [accounts]);

  const handleSaveAccount = () => {
    if (!accForm.code.trim() || !accForm.name_ar.trim()) {
      alert(t('account_code_and_arabic_name_are_required'));
      return;
    }
    if (editingAccId) {
      setAccounts(prev => prev.map(a => a.id === editingAccId ? { ...a, ...accForm } : a));
    } else {
      setAccounts(prev => [...prev, { id: Date.now().toString(), ...accForm }]);
    }
    setAccForm({ code: '', name_ar: '', name_en: '', type: 'asset', parent: '' });
    setEditingAccId(null);
    setShowAccForm(false);
  };

  const handleDeleteAccount = (id: string) => {
    if (confirm(t('delete_this_account'))) {
      setAccounts(prev => prev.filter(a => a.id !== id));
    }
  };

  const handleExportAccounts = () => {
    const csv = ['Code,Name AR,Name EN,Type,Parent', ...accounts.map(a => `${a.code},${a.name_ar},${a.name_en},${a.type},${a.parent}`)].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = 'chart_of_accounts.csv';
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportAccounts = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const imported = JSON.parse(ev.target?.result as string);
        if (Array.isArray(imported)) { setAccounts(imported); alert(t('imported_successfully')); }
      } catch { alert(t('invalid_file_must_be_json')); }
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-2 pb-4 border-b border-slate-200 dark:border-slate-800">
        <SettingsIcon className="h-6 w-6 text-indigo-500" />
        <div>
          <h2 className="text-xl font-bold font-sans">{t('system_device_settings')}</h2>
          <p className="text-xs text-slate-500">تخصيص واجهات الكاشير واللغة وتعريف الأجهزة الملحقة وطباعة الاختبار.</p>
        </div>
      </div>

      {/* Settings Navigation Tabs */}
      <div className="flex gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-3 overflow-x-auto text-[11px] font-bold">
        {[
          { id: 'general', label: t('general_peripherals'), icon: SettingsIcon },
          { id: 'brand', label: t('branding_theme'), icon: Palette },
          { id: 'invoice', label: t('invoice_settings'), icon: Receipt },
          ...(currentUser?.role === 'owner' ? [{ id: 'users', label: t('user_accounts'), icon: Users }] : []),
          { id: 'ai', label: t('ai_assistant'), icon: Brain },
          { id: 'backup', label: t('backup_center'), icon: Database },
          ...(currentUser?.role === 'owner' ? [{ id: 'accounts', label: t('chart_of_accounts'), icon: Landmark }] : []),
          ...(currentUser?.role === 'owner' ? [{ id: 'companies', label: t('company_manager'), icon: Building2 }] : []),
          ...(currentUser?.role === 'owner' ? [{ id: 'audit', label: t('activity_trail_log'), icon: History }] : []),
          { id: 'notifications', label: t('notifications'), icon: Bell },
          { id: 'updates', label: t('system_updates'), icon: RotateCw },
          { id: 'support', label: t('technical_support'), icon: HelpCircle },
          { id: 'about', label: t('about_system'), icon: Info },
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setSettingsTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl border transition-all whitespace-nowrap flex items-center gap-1.5 ${
                settingsTab === tab.id
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm font-bold'
                  : 'border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 font-semibold'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Conditionally Rendered Panels */}
      {settingsTab === 'general' && (
        <div className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Appearance & Localization */}
        <div className="glass-card p-5 rounded-2xl shadow-sm space-y-5">
          <h3 className="font-bold text-sm flex items-center gap-1.5 border-b pb-2">
            <Languages className="h-4.5 w-4.5 text-blue-500" />
            {t('appearance_localization')}
          </h3>
          <div className="space-y-4 text-xs font-semibold">
            <div className="flex justify-between items-center">
              <span>{t('system_language')}</span>
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                <select 
                  value={language} 
                  onChange={(e) => changeLanguage(e.target.value)}
                  className="bg-transparent border-none text-xs focus:outline-none cursor-pointer px-2 py-1 text-slate-800 dark:text-slate-200"
                >
                  <option value="ar" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">العربية</option>
                  <option value="en" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">English</option>
                  <option value="fr" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Français</option>
                  <option value="es" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Español</option>
                  <option value="tr" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Türkçe</option>
                  <option value="de" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Deutsch</option>
                  <option value="zh" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">中文</option>
                </select>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span>{t('visual_color_mode')}</span>
              <button onClick={toggleTheme} className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1 text-[11px]">
                {theme === 'dark' ? (<><Moon className="h-3.5 w-3.5 text-cyan-400" /><span>الوضع الداكن</span></>) : (<><Sun className="h-3.5 w-3.5 text-amber-500" /><span>الوضع الفاتح</span></>)}
              </button>
            </div>
            <div className="flex justify-between items-center">
              <span>{t('active_branch_location')}</span>
              <select value={selectedBranch.id} onChange={e => { const b = branches.find(x => x.id === e.target.value); if (b) setSelectedBranch(b); }} className="px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 focus:outline-none">
                {branches.map(b => (<option key={b.id} value={b.id}>{isRtl ? b.name_ar : b.name_en}</option>))}
              </select>
            </div>
          </div>
        </div>

        {/* Store & Tax Configuration */}
        <div className="glass-card p-5 rounded-2xl shadow-sm space-y-4">
          <h3 className="font-bold text-sm flex items-center gap-1.5 border-b pb-2">
            <span className="text-base">🏢</span>
            {t('store_setup_global_localization')}
          </h3>
          <div className="space-y-3 text-xs font-semibold">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-slate-500 dark:text-slate-400 text-[10px]">{t('store_business_name')}</label>
                <input type="text" value={storeName} onChange={e => setStoreName(e.target.value)} className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans text-xs" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-slate-500 dark:text-slate-400 text-[10px]">{t('store_phone')}</label>
                <input type="text" value={storePhone ?? ''} onChange={e => setStorePhone(e.target.value)} className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans text-xs" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-slate-500 dark:text-slate-400 text-[10px]">{t('country')}</label>
                <select
                  value={country}
                  onChange={e => {
                    const matched = COUNTRIES.find(c => c.code === e.target.value);
                    if (matched) {
                      setCountry(matched.code);
                      setCurrency(matched.currency);
                      setCity(matched.cities[0] || '');
                      setNumberLocale(matched.locale);
                    }
                  }}
                  className="px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs"
                >
                  {COUNTRIES.map(c => (
                    <option key={c.code} value={c.code}>{c.flag} {isRtl ? c.name_ar : c.name_en}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-slate-500 dark:text-slate-400 text-[10px]">{t('city')}</label>
                <input
                  list="settings-cities-list"
                  type="text"
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans text-xs"
                />
                <datalist id="settings-cities-list">
                  {(COUNTRIES.find(c => c.code === country)?.cities || []).map(cit => (
                    <option key={cit} value={cit} />
                  ))}
                </datalist>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-slate-500 dark:text-slate-400 text-[10px]">{t('postal_code')}</label>
                <input type="text" value={postalCode ?? ''} onChange={e => setPostalCode(e.target.value)} className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans text-xs" />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-slate-500 dark:text-slate-400 text-[10px]">{t('detailed_address')}</label>
              <input type="text" value={storeAddress ?? ''} onChange={e => setStoreAddress(e.target.value)} className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans text-xs" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-slate-500 dark:text-slate-400 text-[10px]">{t('commercial_registry_cr')}</label>
                <input type="text" value={crNumber ?? ''} onChange={e => setCrNumber(e.target.value)} className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans text-xs" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-slate-500 dark:text-slate-400 text-[10px]">{t('tax_identification_number')}</label>
                <input type="text" value={vatNumber} onChange={e => setVatNumber(e.target.value)} className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans text-xs" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-slate-500 dark:text-slate-400 text-[10px]">{t('tax_name_eg_vat_gst')}</label>
                <input type="text" value={taxName ?? 'VAT'} onChange={e => setTaxName(e.target.value)} placeholder="VAT" className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans text-xs" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-slate-500 dark:text-slate-400 text-[10px]">{t('currency_1')}</label>
                <select value={currency} onChange={e => setCurrency(e.target.value)} className="px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs">
                  {majorCurrencies.map(c => (<option key={c.code} value={c.code}>{c.code} — {c.name.split(' (')[0]}</option>))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-slate-500 dark:text-slate-400 text-[10px]">{t('tax_rate_1')}</label>
                <input type="number" min={0} max={100} step={0.5} value={taxPercentage} onChange={e => setTaxPercentage(parseFloat(e.target.value) || 0)} className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans text-xs" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-slate-500 dark:text-slate-400 text-[10px]">{t('calendar_system')}</label>
                <select value={dateSystem} onChange={e => setDateSystem(e.target.value as 'gregorian' | 'hijri')} className="px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs">
                  <option value="gregorian">{t('gregorian')}</option>
                  <option value="hijri">{t('hijri')}</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-slate-500 dark:text-slate-400 text-[10px]">{t('number_currency_locale')}</label>
                <select value={numberLocale} onChange={e => setNumberLocale(e.target.value)} className="px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs">
                  <option value="en-US">en-US (1,234.50)</option>
                  <option value="de-DE">de-DE (1.234,50)</option>
                  <option value="fr-FR">fr-FR (1 234,50)</option>
                  <option value="ar-SA">ar-SA (١٬٢٣٤٫٥٠)</option>
                  <option value="ar-EG">ar-EG (١,٢٣٤.٥٠)</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-slate-500 dark:text-slate-400 text-[10px]">{t('date_format')}</label>
                <select value={dateFormat} onChange={e => setDateFormat(e.target.value)} className="px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs">
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-slate-500 dark:text-slate-400 text-[10px]">{t('receipt_footer_message')}</label>
              <textarea value={receiptFooter ?? ''} onChange={e => setReceiptFooter(e.target.value)} rows={2} placeholder={t('thank_you_for_your_visit')} className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans text-xs resize-none" />
            </div>
            
            <div className="flex flex-col gap-1">
              <label className="text-slate-500 dark:text-slate-400 text-[10px] flex items-center gap-1">
                <Image className="h-3 w-3" />
                {t('store_logo_shown_on_receipt')}
              </label>
              {storeLogo && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-100/60 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <img src={storeLogo} alt="Store Logo" className="h-16 rounded object-contain border border-slate-200 dark:border-slate-700" />
                  <button
                    type="button"
                    onClick={() => { setStoreLogo(''); if (logoInputRef.current) logoInputRef.current.value = ''; }}
                    className="ml-auto px-2 py-1 rounded-lg text-[10px] font-bold bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 border border-red-500/20 flex items-center gap-1"
                  >
                    <Trash2 className="h-3 w-3" />
                    {t('remove_logo')}
                  </button>
                </div>
              )}
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                className="text-[10px] text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-indigo-500/10 file:text-indigo-600 dark:file:text-indigo-400 hover:file:bg-indigo-500/20 cursor-pointer"
              />
            </div>

            <p className="text-[9px] text-slate-400 pt-1 font-normal">{isRtl ? `✅ الإعدادات محفوظة تلقائياً وتنعكس فوراً في جميع أوجه النظام (الكاشير، ERP، الفواتير).` : '✅ Settings auto-save and instantly apply across POS, ERP and receipts.'}</p>
          </div>
        </div>

        {/* Hardware Devices Simulation Toggles */}
        <div className="glass-card p-5 rounded-2xl shadow-sm space-y-5">
          <h3 className="font-bold text-sm flex items-center gap-1.5 border-b pb-2">
            <HardDrive className="h-4.5 w-4.5 text-emerald-500" />
            {t('peripherals_simulation_mode')}
          </h3>
          <div className="space-y-3.5 text-xs font-semibold">
            <div className="flex justify-between items-center">
              <span>{t('usb_barcode_scanner')}</span>
              <button onClick={() => toggleDevice('scanner')}>{devices.scanner ? <ToggleRight className="h-6 w-6 text-blue-500" /> : <ToggleLeft className="h-6 w-6 text-slate-400" />}</button>
            </div>
            <div className="flex justify-between items-center">
              <span>{t('weighing_scale')}</span>
              <button onClick={() => toggleDevice('scale')}>{devices.scale ? <ToggleRight className="h-6 w-6 text-blue-500" /> : <ToggleLeft className="h-6 w-6 text-slate-400" />}</button>
            </div>
            <div className="flex justify-between items-center">
              <span>{t('thermal_escpos_printer')}</span>
              <button onClick={() => toggleDevice('printer')}>{devices.printer ? <ToggleRight className="h-6 w-6 text-blue-500" /> : <ToggleLeft className="h-6 w-6 text-slate-400" />}</button>
            </div>
            <div className="flex justify-between items-center">
              <span>{t('automatic_cash_drawer')}</span>
              <button onClick={() => toggleDevice('drawer')}>{devices.drawer ? <ToggleRight className="h-6 w-6 text-blue-500" /> : <ToggleLeft className="h-6 w-6 text-slate-400" />}</button>
            </div>
          </div>
        </div>

        {/* Physical Hardware Connection */}
        <div className="glass-card p-5 rounded-2xl shadow-sm space-y-4">
          <h3 className="font-bold text-sm flex items-center gap-1.5 border-b pb-2">
            <Printer className="h-4.5 w-4.5 text-violet-500" />
            {t('real_hardware_integration_webusbserial')}
          </h3>
          <div className="space-y-4 text-xs">
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-normal leading-relaxed">
              {isRtl ? 'توصيل مباشر بالطابعة والميزان المادي. في حالة الفشل يعمل النظام تلقائياً بالمحاكاة.' : 'Direct pairing with physical printer/scale. System falls back to simulation on failure.'}
            </p>
            <div className="flex items-center justify-between gap-2 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
              <div>
                <div className="font-bold">{t('escpos_printer_usb')}</div>
                <div className={`text-[10px] mt-0.5 ${connectedPrinterName ? 'text-emerald-500' : 'text-slate-400'}`}>
                  {connectedPrinterName ? `✅ ${connectedPrinterName}` : (t('disconnected_simulation_active'))}
                </div>
              </div>
              <button onClick={handleConnectPrinter} disabled={isPrinterConnecting}
                className={`flex-shrink-0 px-3 py-1.5 rounded-lg font-bold text-[10px] transition-all ${connectedPrinterName ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'}`}>
                {isPrinterConnecting ? <span className="animate-spin inline-block h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full" /> : connectedPrinterName ? (t('change')) : (t('pair_via_usb'))}
              </button>
            </div>
            <div className="flex items-center justify-between gap-2 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
              <div>
                <div className="font-bold">{t('weighing_scale_serial')}</div>
                <div className={`text-[10px] mt-0.5 ${connectedScaleName ? 'text-emerald-500' : 'text-slate-400'}`}>
                  {connectedScaleName ? `✅ ${connectedScaleName}` : (t('disconnected_simulation_active'))}
                </div>
              </div>
              <button onClick={handleConnectScale} disabled={isScaleConnecting}
                className={`flex-shrink-0 px-3 py-1.5 rounded-lg font-bold text-[10px] transition-all ${connectedScaleName ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'}`}>
                {isScaleConnecting ? <span className="animate-spin inline-block h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full" /> : connectedScaleName ? (t('change')) : (t('pair_via_serial'))}
              </button>
            </div>
          </div>
        </div>
      </div>
      </div>
      )}

      {settingsTab === 'brand' && <BrandSettings />}

      {settingsTab === 'backup' && <BackupCenter />}

      {settingsTab === 'audit' && <AuditLogPanel />}

      {settingsTab === 'notifications' && <NotificationCenter />}

      {settingsTab === 'updates' && <UpdatesCenter />}

      {settingsTab === 'support' && <SupportCenter />}

      {settingsTab === 'about' && <AboutSystem />}

      {settingsTab === 'companies' && currentUser?.role === 'owner' && (
        <CompanyManager onOpenCompany={(compId) => selectCompany(compId)} />
      )}

      {/* TASK A – User Management Panel (owner-only) */}
      {settingsTab === 'users' && currentUser?.role === 'owner' && (
        <div className="glass-card p-5 rounded-2xl shadow-sm space-y-4 animate-fade-in">
          <h3 className="font-bold text-sm flex items-center gap-1.5 border-b pb-2">
            <Users className="h-4.5 w-4.5 text-purple-500" />
            {t('user_management')}
          </h3>

          {/* Users table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[10px] text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <th className="pb-1.5 font-bold text-start">{t('name')}</th>
                  <th className="pb-1.5 font-bold text-start">{t('username_1')}</th>
                  <th className="pb-1.5 font-bold text-start">{t('role')}</th>
                  <th className="pb-1.5 font-bold text-center">{t('status_1')}</th>
                  <th className="pb-1.5 font-bold text-center">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {(users || []).map(u => (
                  <tr key={u.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-2 font-semibold">{u.displayName}</td>
                    <td className="py-2 text-slate-500 font-mono">{u.username}</td>
                    <td className="py-2">
                      <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[9px] font-bold ${
                        u.role === 'owner' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' :
                        u.role === 'manager' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' :
                        'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                      }`}>
                        <Shield className="h-2.5 w-2.5" />
                        {isRtl ? (u.role === 'owner' ? 'مالك' : u.role === 'manager' ? 'مدير' : 'كاشير') : u.role}
                      </span>
                    </td>
                    <td className="py-2 text-center">
                      <button
                        onClick={() => u.role !== 'owner' && updateUser(u.id, { active: !u.active })}
                        disabled={u.role === 'owner'}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border disabled:opacity-60 disabled:cursor-not-allowed ${
                          u.active
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-800 border-slate-300 dark:border-slate-700'
                        }`}
                      >
                        {u.active ? (t('active')) : (t('inactive'))}
                      </button>
                    </td>
                    <td className="py-2">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleEditUser(u)}
                          className="p-1 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-indigo-500 transition-colors"
                          title={t('edit')}
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(u)}
                          disabled={u.role === 'owner' || u.id === currentUser?.id}
                          className="p-1 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 text-red-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          title={t('delete')}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Add/Edit user form toggle */}
          {!showAddUser ? (
            <button
              onClick={() => { setEditingUserId(null); setUserForm({ displayName: '', username: '', password: '', role: 'cashier' }); setShowAddUser(true); }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-dashed border-indigo-400 dark:border-indigo-600 text-indigo-600 dark:text-indigo-400 font-bold text-xs hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all"
            >
              <UserPlus className="h-3.5 w-3.5" />
              {t('add_new_user')}
            </button>
          ) : (
            <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-700 bg-indigo-50/50 dark:bg-indigo-900/10 space-y-3">
              <h4 className="font-bold text-xs text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                {editingUserId ? <Edit3 className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}
                {isRtl ? (editingUserId ? 'تعديل بيانات المستخدم' : 'إضافة مستخدم جديد') : (editingUserId ? 'Edit User' : 'Add New User')}
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-slate-500">{t('display_name')}</label>
                  <input
                    type="text"
                    value={userForm.displayName}
                    onChange={e => setUserForm(f => ({ ...f, displayName: e.target.value }))}
                    placeholder={t('john_doe')}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-slate-500">{t('username_1')}</label>
                  <input
                    type="text"
                    value={userForm.username}
                    onChange={e => setUserForm(f => ({ ...f, username: e.target.value }))}
                    placeholder="ahmed.m"
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-slate-500">{isRtl ? (editingUserId ? 'كلمة مرور جديدة (اتركها فارغة للإبقاء)' : 'كلمة المرور') : (editingUserId ? 'New Password (leave blank to keep)' : 'Password')}</label>
                  <div className="relative">
                    <input
                      type={showUserPassword ? 'text' : 'password'}
                      value={userForm.password}
                      onChange={e => setUserForm(f => ({ ...f, password: e.target.value }))}
                      placeholder="••••••"
                      className="w-full px-2.5 py-1.5 pr-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <button type="button" onClick={() => setShowUserPassword(v => !v)} className="absolute end-2 top-1/2 -translate-y-1/2 text-slate-400">
                      {showUserPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-slate-500">{t('role')}</label>
                  <select
                    value={userForm.role}
                    onChange={e => setUserForm(f => ({ ...f, role: e.target.value as any }))}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="owner">{t('owner')}</option>
                    <option value="manager">{t('manager')}</option>
                    <option value="cashier">{t('cashier')}</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveUser}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors"
                >
                  {t('save_1')}
                </button>
                <button
                  onClick={resetUserForm}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  {t('cancel')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Restaurant Tables Management (Conditionally shown) */}
      {settingsTab === 'general' && businessType === 'restaurant' && (
        <div className="glass-card p-5 rounded-2xl shadow-sm space-y-4 animate-fade-in">
          <h3 className="font-bold text-sm flex items-center gap-1.5 border-b pb-2">
            <span className="text-xl">🍽️</span>
            {t('restaurant_tables_configuration')}
          </h3>
          
          <div className="space-y-4">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder={t('enter_table_name_eg_table_vip')}
                value={newTableName}
                onChange={e => setNewTableName(e.target.value)}
                className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 focus:outline-none text-xs text-slate-800 dark:text-slate-200"
              />
              <button
                type="button"
                onClick={() => {
                  const name = newTableName.trim();
                  if (!name) return;
                  if (tables.includes(name)) {
                    alert(t('table_name_already_exists'));
                    return;
                  }
                  setTables(prev => [...prev, name]);
                  setNewTableName('');
                }}
                className="px-4 py-1.5 bg-teal-650 hover:bg-teal-700 text-white rounded-lg text-xs font-bold font-sans"
              >
                {t('add_table')}
              </button>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] text-slate-400 font-bold block">
                {t('configured_restaurant_tables_click_to_delete')}
              </span>
              <div className="flex gap-2 flex-wrap p-3 bg-slate-100/50 dark:bg-slate-955/50 rounded-xl border border-slate-200 dark:border-slate-800">
                {tables.map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      if (confirm(isRtl ? `هل أنت متأكد من حذف الطاولة "${t}"؟` : `Are you sure you want to delete table "${t}"?`)) {
                        setTables(prev => prev.filter(x => x !== t));
                      }
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 hover:border-red-500 hover:text-red-500 text-slate-700 dark:text-slate-200 transition-all flex items-center gap-1.5 shadow-sm font-sans"
                  >
                    <span>{t}</span>
                    <span className="text-red-500 font-normal">×</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TASK C – Restaurant Modifiers Panel (Conditionally shown) */}
      {settingsTab === 'general' && businessType === 'restaurant' && (
        <div className="glass-card p-5 rounded-2xl shadow-sm space-y-4 animate-fade-in">
          <h3 className="font-bold text-sm flex items-center gap-1.5 border-b pb-2">
            <span className="text-xl">🍽️</span>
            {t('order_modifiers_restaurant')}
          </h3>
          <p className="text-[10px] text-slate-400 font-normal leading-relaxed">
            {isRtl ? 'أضف أو احذف مواصفات الطلبات التي تظهر في شاشة الكاشير (مثل: بدون بصل، حار جداً).' : 'Add or remove order modifiers shown in the POS screen (e.g. No Onion, Extra Spicy).'}
          </p>

          {/* Current modifiers chips */}
          <div className="flex gap-2 flex-wrap p-3 bg-slate-100/50 dark:bg-slate-900/30 rounded-xl border border-slate-200 dark:border-slate-800 min-h-[48px]">
            {modifiers.length === 0 && (
              <span className="text-[10px] text-slate-400">{t('no_modifiers_yet_add_one_below')}</span>
            )}
            {modifiers.map(m => (
              <span
                key={m.id}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold shadow-sm"
              >
                {isRtl ? m.ar || m.en : m.en || m.ar}
                <button
                  type="button"
                  onClick={() => handleDeleteModifier(m.id)}
                  className="text-red-400 hover:text-red-600 transition-colors"
                  title={t('delete')}
                >
                  ×
                </button>
              </span>
            ))}
          </div>

          {/* Add modifier form */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{t('add_new_modifier')}</span>
            <div className="flex gap-2 flex-wrap">
              <input
                type="text"
                value={newModAr}
                onChange={e => setNewModAr(e.target.value)}
                placeholder={t('arabic_text_eg')}
                className="flex-1 min-w-[140px] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 focus:outline-none text-xs"
              />
              <input
                type="text"
                value={newModEn}
                onChange={e => setNewModEn(e.target.value)}
                placeholder={t('english_text_eg_no_onion')}
                className="flex-1 min-w-[140px] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 focus:outline-none text-xs"
              />
              <button
                type="button"
                onClick={handleAddModifier}
                disabled={!newModAr.trim() && !newModEn.trim()}
                className="px-4 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {t('add_modifier')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clothing Retail Customization settings (Conditionally shown) */}
      {settingsTab === 'general' && businessType === 'clothing' && (
        <div className="glass-card p-5 rounded-2xl shadow-sm space-y-6 animate-fade-in">
          <h3 className="font-bold text-sm flex items-center gap-1.5 border-b pb-2">
            <Shirt className="h-4.5 w-4.5 text-blue-500" />
            {t('clothing_boutique_variants_configuration')}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Sizes section */}
            <div className="space-y-4">
              <h4 className="font-bold text-xs text-indigo-500">{t('manage_sizes')}</h4>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder={t('eg_xxl_44')}
                  value={newSizeName}
                  onChange={e => setNewSizeName(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 focus:outline-none text-xs text-slate-800 dark:text-slate-200"
                />
                <button
                  type="button"
                  onClick={() => {
                    const sz = newSizeName.trim();
                    if (!sz) return;
                    if (availableSizes.includes(sz)) {
                      alert(t('size_already_exists'));
                      return;
                    }
                    setAvailableSizes(prev => [...prev, sz]);
                    setNewSizeName('');
                  }}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold font-sans"
                >
                  {t('add')}
                </button>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] text-slate-400 font-bold block">{t('current_sizes_click_to_delete')}</span>
                <div className="flex gap-2 flex-wrap p-2.5 bg-slate-100/50 dark:bg-slate-955/50 rounded-xl border border-slate-200 dark:border-slate-805">
                  {availableSizes.map(sz => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => {
                        if (confirm(isRtl ? `هل أنت متأكد من حذف المقاس "${sz}"؟` : `Are you sure you want to delete size "${sz}"?`)) {
                          setAvailableSizes(prev => prev.filter(x => x !== sz));
                        }
                      }}
                      className="px-2.5 py-1 rounded text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 hover:border-red-500 hover:text-red-500 text-slate-700 dark:text-slate-200 transition-all flex items-center gap-1 font-sans"
                    >
                      <span>{sz}</span>
                      <span className="text-red-500 font-normal">×</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Colors section */}
            <div className="space-y-4">
              <h4 className="font-bold text-xs text-indigo-500">{t('manage_colors')}</h4>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder={t('eg_yellow_white')}
                  value={newColorName}
                  onChange={e => setNewColorName(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 focus:outline-none text-xs text-slate-800 dark:text-slate-200"
                />
                <button
                  type="button"
                  onClick={() => {
                    const col = newColorName.trim();
                    if (!col) return;
                    if (availableColors.includes(col)) {
                      alert(t('color_already_exists'));
                      return;
                    }
                    setAvailableColors(prev => [...prev, col]);
                    setNewColorName('');
                  }}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold font-sans"
                >
                  {t('add')}
                </button>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] text-slate-400 font-bold block">{t('current_colors_click_to_delete')}</span>
                <div className="flex gap-2 flex-wrap p-2.5 bg-slate-100/50 dark:bg-slate-955/50 rounded-xl border border-slate-200 dark:border-slate-805">
                  {availableColors.map(col => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => {
                        if (confirm(isRtl ? `هل أنت متأكد من حذف اللون "${col}"؟` : `Are you sure you want to delete color "${col}"?`)) {
                          setAvailableColors(prev => prev.filter(x => x !== col));
                        }
                      }}
                      className="px-2.5 py-1 rounded text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 hover:border-red-500 hover:text-red-500 text-slate-700 dark:text-slate-200 transition-all flex items-center gap-1 font-sans"
                    >
                      <span>{isRtl ? (colorMap[col] || col) : col}</span>
                      <span className="text-red-500 font-normal">×</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Diagnostics / Testing block */}
      {settingsTab === 'general' && import.meta.env.DEV && (
        <div className="glass-card p-5 rounded-2xl shadow-sm space-y-4">
          <h3 className="font-bold text-sm flex items-center gap-1.5 border-b pb-2">
            <Database className="h-4.5 w-4.5 text-amber-500" />
            {t('diagnostics_system_actions')}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <button
              onClick={handleTestPrint}
              className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/30 dark:bg-slate-900/30 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs flex flex-col items-center gap-2 transition-all shadow-xs"
            >
              <Printer className="h-5 w-5 text-indigo-500" />
              {t('test_receipt_print')}
            </button>

            <button
              onClick={handleTestDrawer}
              className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/30 dark:bg-slate-900/30 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs flex flex-col items-center gap-2 transition-all shadow-xs"
            >
              <span className="text-xl">💰</span>
              {t('test_open_cash_drawer')}
            </button>

            <button
              onClick={handleSeedOptional}
              className="p-3 rounded-xl border border-blue-500/10 bg-blue-500/5 hover:bg-blue-500/10 font-bold text-xs text-blue-600 dark:text-blue-400 flex flex-col items-center gap-2 transition-all shadow-xs"
            >
              <span className="text-xl">⚡</span>
              {t('seed_demo_data')}
            </button>

            <button
              onClick={handleResetDatabase}
              className="p-3 rounded-xl border border-red-500/10 bg-red-500/5 hover:bg-red-500/10 font-bold text-xs text-red-600 dark:text-red-400 flex flex-col items-center gap-2 transition-all shadow-xs"
            >
              <Database className="h-5 w-5" />
              {t('format_indexeddb')}
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          AI ASSISTANT SETTINGS
      ══════════════════════════════════════════════════════════════ */}
      {settingsTab === 'ai' && (
        <div className="glass-card p-5 rounded-2xl shadow-sm space-y-5">
        <h3 className="font-bold text-sm flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-3">
          <span className="text-lg">🤖</span>
          {t('ai_assistant_configuration')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Provider */}
          <div>
            <label className="text-xs text-slate-400 font-bold block mb-1.5">{t('provider')}</label>
            <select value={aiProvider} onChange={e => { setAiProvider(e.target.value); setAiModel(''); }}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40">
              {Object.entries(AI_MODELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          {/* Model */}
          <div>
            <label className="text-xs text-slate-400 font-bold block mb-1.5">{t('model')}</label>
            <select value={aiModel} onChange={e => setAiModel(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40">
              <option value="">{t('select_model')}</option>
              {AI_MODELS[aiProvider]?.models.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          {/* API Key */}
          <div className="md:col-span-2">
            <label className="text-xs text-slate-400 font-bold block mb-1.5">
              {t('api_key')}
              {aiSaved && <span className="ml-2 text-emerald-500 text-[10px]">({t('saved_encrypted')})</span>}
            </label>
            <input
              type="password"
              placeholder={aiSaved ? '••••••••••••••••••••••••' : (t('sk_or_googleanthropic_key'))}
              value={aiKeyRaw}
              onChange={e => setAiKeyRaw(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 font-mono"
            />
            {aiSaved && !aiKeyRaw && <p className="text-[10px] text-slate-400 mt-1">{t('key_is_saved_type_a_new_key_to_update_it')}</p>}
          </div>
          {/* Base URL */}
          <div className="md:col-span-2">
            <label className="text-xs text-slate-400 font-bold block mb-1.5">{t('base_url_optional_for_openroutercustom')}</label>
            <input
              type="url"
              placeholder="https://api.openai.com"
              value={aiBaseUrl}
              onChange={e => setAiBaseUrl(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 font-mono"
            />
          </div>
        </div>

        {/* Test Result banner */}
        {aiTestResult !== 'idle' && (
          <div className={`p-3 rounded-xl text-xs font-bold text-center border ${
            aiTestResult === 'ok' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400'
          }`}>
            {aiTestResult === 'ok'
              ? (t('connection_successful_key_is_valid'))
              : (t('connection_failed_check_your_key_and_provider'))}
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={handleTestAi} disabled={aiTesting}
            className="px-4 py-2 rounded-xl border border-blue-500/20 bg-blue-500/5 text-blue-600 dark:text-blue-400 text-xs font-bold hover:bg-blue-500/10 transition-all disabled:opacity-50 flex items-center gap-2">
            {aiTesting ? <span className="animate-spin">⟳</span> : '🔌'}
            {t('test_connection')}
          </button>
          <button onClick={handleSaveAi}
            className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm">
            {t('save_ai_settings')}
          </button>
        </div>
      </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          INVOICE / STORE SETTINGS
      ══════════════════════════════════════════════════════════════ */}
      {settingsTab === 'invoice' && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start animate-fade-in text-right font-sans" dir={t('ltr')}>
          {/* Settings panel */}
          <div className="lg:col-span-3 glass-card p-5 rounded-2xl shadow-sm space-y-5">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-sm flex items-center gap-1.5">
                <Receipt className="h-4.5 w-4.5 text-indigo-500" />
                {t('invoice_store_settings')}
              </h3>
              {invSavedMsg && <span className="text-xs font-bold text-emerald-500 animate-fade-in">{invSavedMsg}</span>}
            </div>

            {/* Logo + Store Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2 flex items-center gap-4">
                <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center overflow-hidden bg-slate-50 dark:bg-slate-900 shrink-0">
                  {storeLogo ? <img src={storeLogo} className="w-full h-full object-contain" alt="logo" /> : <Store className="h-8 w-8 text-slate-400" />}
                </div>
                <div className="space-y-2 flex-1">
                  <p className="text-xs text-slate-400 font-bold">{t('store_logo')}</p>
                  <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                  <button onClick={() => logoInputRef.current?.click()}
                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-all flex items-center gap-2">
                    <Image className="h-3.5 w-3.5" />
                    {t('upload_logo')}
                  </button>
                  {storeLogo && <button onClick={() => setStoreLogo('')} className="text-[10px] text-red-400 hover:underline">{t('remove_logo')}</button>}
                </div>
              </div>

              {[{label: t('store_name'), val: storeName, set: setStoreName, ph: t('eg_my_store')},
                {label: t('vat_number'), val: vatNumber, set: setVatNumber, ph: '312345678900003'},
                {label: t('commercial_reg_no'), val: invCrNumber, set: setInvCrNumber, ph: '1010234567'},
                {label: t('phone_1'), val: storePhone, set: setStorePhone, ph: '+12025550143'},
                {label: t('phone_2'), val: invPhone2, set: setInvPhone2, ph: '+12025550199'},
                {label: t('email'), val: invEmail, set: setInvEmail, ph: 'store@example.com'},
                {label: t('website'), val: invWebsite, set: setInvWebsite, ph: 'https://store.com'},
                {label: t('address'), val: storeAddress, set: setStoreAddress, ph: t('main_branch_commercial_st')},
              ].map(({label, val, set, ph}) => (
                <div key={label}>
                  <label className="text-xs text-slate-400 font-bold block mb-1.5">{label}</label>
                  <input type="text" placeholder={ph} value={val}
                    onChange={e => set(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 text-slate-800 dark:text-slate-200" />
                </div>
              ))}
            </div>

            {/* Receipt texts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-400 font-bold block mb-1.5">{t('receipt_footer')}</label>
                <textarea rows={2} value={receiptFooter} onChange={e => setReceiptFooter(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/40 text-slate-800 dark:text-slate-200" />
              </div>
              <div>
                <label className="text-xs text-slate-400 font-bold block mb-1.5">{t('return_policy')}</label>
                <textarea rows={2} value={invReturnPolicy} onChange={e => setInvReturnPolicy(e.target.value)}
                  placeholder={t('eg_no_returns_after_7_days')}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/40 text-slate-800 dark:text-slate-200" />
              </div>
            </div>

            {/* Paper size + Color */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-400 font-bold block mb-1.5">{t('paper_size')}</label>
                <div className="flex gap-2">
                  {['A4', '80mm', '58mm'].map(s => (
                    <button key={s} onClick={() => setInvPaperSize(s)}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                        invPaperSize === s ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' : 'border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500'
                      }`}>{s}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400 font-bold block mb-1.5">{t('invoice_color')}</label>
                <div className="flex items-center gap-3">
                  <input type="color" value={invColor} onChange={e => setInvColor(e.target.value)}
                    className="w-12 h-10 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer bg-transparent" />
                  <span className="text-sm font-mono text-slate-500">{invColor}</span>
                  {['#3b82f6','#10b981','#8b5cf6','#f59e0b','#ef4444','#0f172a'].map(c => (
                    <button key={c} onClick={() => setInvColor(c)}
                      style={{background: c}} className="w-6 h-6 rounded-full border-2 border-white dark:border-slate-900 shadow-sm"/>
                  ))}
                </div>
              </div>
            </div>

            {/* Show/Hide toggles */}
            <div>
              <p className="text-xs text-slate-400 font-bold mb-3">{t('invoice_elements_show_hide')}</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {[
                  {label: t('logo'), val: invShowLogo, set: setInvShowLogo},
                  {label: t('address'), val: invShowAddress, set: setInvShowAddress},
                  {label: t('phone'), val: invShowPhone, set: setInvShowPhone},
                  {label: t('tax_line'), val: invShowTax, set: setInvShowTax},
                  {label: t('qr_code'), val: invShowQr, set: setInvShowQr},
                  {label: t('cr_number'), val: invShowCr, set: setInvShowCr},
                ].map(({label, val, set}) => (
                  <button key={label} onClick={() => set(!val)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition-all ${
                      val ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-600 dark:text-indigo-400' : 'border-slate-200 dark:border-slate-700 text-slate-400'
                    }`}>
                    <span className="w-3.5 h-3.5 rounded border border-slate-400 flex items-center justify-center text-[8px] font-black">
                      {val ? '✓' : ''}
                    </span>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={handleSaveInvoice}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold transition-all shadow-sm flex items-center justify-center gap-2">
              <Printer className="h-4 w-4" />
              {t('save_invoice_settings')}
            </button>
          </div>

          {/* Live Preview Panel */}
          <div className="lg:col-span-2 flex flex-col items-center space-y-4">
            <div className="w-full glass-card p-3 rounded-2xl border border-slate-200/40 dark:border-slate-800/40 text-center">
              <span className="text-xs font-bold text-slate-400">{t('invoice_live_preview')}</span>
            </div>
            
            {/* Mock Print Paper */}
            <div 
              style={{
                width: '100%',
                maxWidth: invPaperSize === 'A4' ? '340px' : invPaperSize === '80mm' ? '280px' : '220px',
                fontSize: invPaperSize === 'A4' ? '12px' : invPaperSize === '80mm' ? '10px' : '9px',
                borderColor: invColor,
              }}
              className="bg-white text-slate-900 p-4 rounded-xl border-t-8 shadow-xl transition-all duration-300 space-y-3 font-mono"
            >
              {/* Header */}
              <div className="text-center space-y-1">
                {invShowLogo && storeLogo && (
                  <img src={storeLogo} className="h-10 mx-auto object-contain mb-1" alt="logo preview" />
                )}
                <h4 className="font-extrabold text-slate-900" style={{ fontSize: invPaperSize === 'A4' ? '14px' : '11px' }}>
                  {storeName || (t('store_name'))}
                </h4>
                {invShowCr && invCrNumber && (
                  <p className="text-slate-500">{isRtl ? `س.ت: ${invCrNumber}` : `CR: ${invCrNumber}`}</p>
                )}
                {invShowPhone && (storePhone || invPhone2) && (
                  <p className="text-slate-500">
                    {t('tel')}
                    {[storePhone, invPhone2].filter(Boolean).join(' / ')}
                  </p>
                )}
                {invShowAddress && storeAddress && (
                  <p className="text-slate-500">{storeAddress}</p>
                )}
              </div>

              {/* Invoice Meta */}
              <div className="border-t border-b border-dashed border-slate-300 py-2 space-y-1 text-slate-600">
                <div className="flex justify-between">
                  <span>{t('inv_no')}</span>
                  <span className="font-bold">INV-2026-0001</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('date_time_1')}</span>
                  <span>{new Date().toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US')}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('payment')}</span>
                  <span>{t('cash')}</span>
                </div>
              </div>

              {/* Items Table */}
              <div className="space-y-1">
                <div className="flex justify-between font-bold border-b border-slate-200 pb-1 text-slate-800">
                  <span>{t('item')}</span>
                  <span>{t('amt')}</span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>{t('1x_sample_product_a')}</span>
                  <span>50.00</span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>{t('2x_sample_product_b')}</span>
                  <span>25.00</span>
                </div>
              </div>

              {/* Totals */}
              <div className="border-t border-dashed border-slate-300 pt-2 space-y-1">
                <div className="flex justify-between text-slate-600">
                  <span>{t('subtotal_1')}</span>
                  <span>75.00</span>
                </div>
                {invShowTax && (
                  <div className="flex justify-between text-slate-600">
                    <span>{isRtl ? `الضريبة (${taxPercentage}%):` : `VAT (${taxPercentage}%):`}</span>
                    <span>{(75 * taxPercentage / 100).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-extrabold text-slate-900 border-t border-slate-200 pt-1" style={{ fontSize: invPaperSize === 'A4' ? '13px' : '11px' }}>
                  <span>{t('total_1')}</span>
                  <span>{(75 + (invShowTax ? (75 * taxPercentage / 100) : 0)).toFixed(2)} {currency}</span>
                </div>
              </div>

              {/* QR and Return Policy / Footer */}
              {(invShowQr || invReturnPolicy || receiptFooter) && (
                <div className="border-t border-dashed border-slate-300 pt-3 text-center space-y-2">
                  {invShowQr && (
                    <div className="w-20 h-20 bg-slate-100 border border-slate-200 rounded mx-auto flex items-center justify-center text-slate-400 text-[10px]">
                      [ QR Code ]
                    </div>
                  )}
                  {invReturnPolicy && (
                    <p className="text-slate-500 italic whitespace-pre-wrap">{invReturnPolicy}</p>
                  )}
                  {receiptFooter && (
                    <p className="text-slate-500 font-bold whitespace-pre-wrap">{receiptFooter}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          CHART OF ACCOUNTS
      ══════════════════════════════════════════════════════════════ */}
      {settingsTab === 'accounts' && currentUser?.role === 'owner' && (
        <div className="glass-card p-5 rounded-2xl shadow-sm space-y-5">
          <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
            <h3 className="font-bold text-sm flex items-center gap-1.5">
              <Landmark className="h-4.5 w-4.5 text-blue-500" />
              {t('chart_of_accounts')}
            </h3>
            <div className="flex gap-2">
              <button onClick={handleExportAccounts}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
                {t('export_csv')}
              </button>
              <label className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer">
                {t('import_json')}
                <input type="file" accept=".json" className="hidden" onChange={handleImportAccounts} />
              </label>
              <button onClick={() => { setAccForm({ code: '', name_ar: '', name_en: '', type: 'asset', parent: '' }); setEditingAccId(null); setShowAccForm(true); }}
                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm">
                + {t('add_account')}
              </button>
            </div>
          </div>

          {/* Add/Edit Form */}
          {showAccForm && (
            <div className="p-4 rounded-2xl border border-blue-500/20 bg-blue-500/5 space-y-3 animate-fade-in">
              <h4 className="text-xs font-bold text-blue-600 dark:text-blue-400">
                {editingAccId ? (t('edit_account')) : (t('new_account'))}
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">{t('code')}</label>
                  <input type="text" placeholder="1001" value={accForm.code} onChange={e => setAccForm(p => ({...p, code: e.target.value}))}
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-mono focus:outline-none" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">{t('name_arabic')}</label>
                  <input type="text" placeholder={t('eg')} value={accForm.name_ar} onChange={e => setAccForm(p => ({...p, name_ar: e.target.value}))}
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs focus:outline-none" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">{t('name_english')}</label>
                  <input type="text" placeholder="Cash" value={accForm.name_en} onChange={e => setAccForm(p => ({...p, name_en: e.target.value}))}
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs focus:outline-none" />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">{t('type_1')}</label>
                  <select value={accForm.type} onChange={e => setAccForm(p => ({...p, type: e.target.value}))}
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs focus:outline-none">
                    <option value="asset">{t('asset')}</option>
                    <option value="liability">{t('liability')}</option>
                    <option value="equity">{t('equity')}</option>
                    <option value="revenue">{t('revenue')}</option>
                    <option value="expense">{t('expense')}</option>
                  </select>
                </div>
                <div className="md:col-span-4">
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">{t('parent_account_optional')}</label>
                  <input type="text" placeholder={t('parent_code_eg_1000')} value={accForm.parent} onChange={e => setAccForm(p => ({...p, parent: e.target.value}))}
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs focus:outline-none" />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={handleSaveAccount}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm">
                  {t('save_2')}
                </button>
                <button onClick={() => { setShowAccForm(false); setEditingAccId(null); }}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800">
                  {t('cancel')}
                </button>
              </div>
            </div>
          )}

          {/* Search */}
          <input type="text" placeholder={t('search_accounts')}
            value={accSearch} onChange={e => setAccSearch(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm focus:outline-none" />

          {/* Accounts table */}
          {accounts.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <History className="h-10 w-10 text-slate-400 mb-2 mx-auto" />
              <p className="text-sm font-bold">{t('no_accounts_yet')}</p>
              <p className="text-xs mt-1">{isRtl ? 'اضغط "إضافة حساب" لإنشاء دليل الحسابات' : 'Click "Add Account" to build your chart of accounts'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className={`py-2 font-bold text-slate-400 ${t('text_left')}`}>{t('code_1')}</th>
                    <th className={`py-2 font-bold text-slate-400 ${t('text_left')}`}>{t('name')}</th>
                    <th className={`py-2 font-bold text-slate-400 ${t('text_left')} hidden md:table-cell`}>{t('type_1')}</th>
                    <th className={`py-2 font-bold text-slate-400 ${t('text_left')} hidden md:table-cell`}>{t('parent')}</th>
                    <th className="py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {accounts.filter(a => !accSearch || a.code.includes(accSearch) || a.name_ar.includes(accSearch) || a.name_en.toLowerCase().includes(accSearch.toLowerCase())).map(a => (
                    <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                      <td className="py-2 font-mono font-bold text-blue-500">{a.code}</td>
                      <td className="py-2">
                        <div className="font-bold">{a.name_ar}</div>
                        {a.name_en && <div className="text-slate-400 text-[10px]">{a.name_en}</div>}
                      </td>
                      <td className="py-2 hidden md:table-cell">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          a.type === 'asset' ? 'bg-blue-500/10 text-blue-600' :
                          a.type === 'liability' ? 'bg-red-500/10 text-red-600' :
                          a.type === 'equity' ? 'bg-purple-500/10 text-purple-600' :
                          a.type === 'revenue' ? 'bg-emerald-500/10 text-emerald-600' :
                          'bg-amber-500/10 text-amber-600'
                        }`}>
                          {isRtl
                            ? {asset:'أصول',liability:'التزامات',equity:'حقوق ملكية',revenue:'إيرادات',expense:'مصروفات'}[a.type]
                            : a.type}
                        </span>
                      </td>
                      <td className="py-2 font-mono text-slate-400 hidden md:table-cell">{a.parent || '—'}</td>
                      <td className="py-2">
                        <div className="flex gap-1 justify-end">
                          <button onClick={() => { setAccForm({code:a.code,name_ar:a.name_ar,name_en:a.name_en,type:a.type,parent:a.parent}); setEditingAccId(a.id); setShowAccForm(true); }}
                            className="p-1.5 rounded-lg hover:bg-blue-500/10 text-blue-500 transition-colors flex items-center justify-center">
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => handleDeleteAccount(a.id)}
                            className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-500 transition-colors flex items-center justify-center">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

    </div>
  );
};
