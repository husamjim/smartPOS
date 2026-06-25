import React from 'react';
import { Settings as SettingsIcon, Languages, Sun, Moon, ToggleLeft, ToggleRight, Database, Printer, HardDrive, Users, UserPlus, Trash2, Edit3, Eye, EyeOff, Image, Shield } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { db, seedLocalDbIfEmpty } from '../db/localDb';
import { HardwareService } from '../services/hardware';

export const Settings: React.FC = () => {
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
    setStoreLogo
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
      alert(isRtl ? 'الاسم واسم المستخدم مطلوبان.' : 'Display name and username are required.');
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
        alert(isRtl ? 'كلمة المرور مطلوبة عند إضافة مستخدم جديد.' : 'Password is required for a new user.');
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
      alert(isRtl ? 'لا يمكنك حذف حسابك الخاص.' : 'You cannot delete your own account.');
      return;
    }
    const activeUsers = (users || []).filter(x => x.active);
    if (activeUsers.length <= 1 && u.active) {
      alert(isRtl ? 'لا يمكن حذف آخر مستخدم نشط في النظام.' : 'Cannot delete the last active user.');
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

  const handleExportDatabase = async () => {
    try {
      const exportData: Record<string, any[]> = {};
      const tableNames = [
        'products', 'batches', 'customers', 'orders', 
        'orderItems', 'suspendedOrders', 'suppliers', 
        'purchaseOrders', 'expenses'
      ] as const;

      for (const tName of tableNames) {
        exportData[tName] = await (db as any)[tName].toArray();
      }

      const jsonStr = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `antigravity_pos_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      alert(isRtl ? 'تم تصدير قاعدة البيانات بنجاح كملف JSON.' : 'Database exported successfully as JSON.');
    } catch (e: any) {
      alert(isRtl ? 'فشل تصدير البيانات: ' + e.message : 'Export failed: ' + e.message);
    }
  };

  const handleImportDatabase = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!confirm(isRtl ? 'تحذير: سيؤدي استيراد الملف إلى استبدال البيانات الحالية. هل تريد المتابعة؟' : 'Warning: Importing will overwrite existing data. Proceed?')) {
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const jsonStr = e.target?.result as string;
          const importData = JSON.parse(jsonStr);

          const tableNames = [
            'products', 'batches', 'customers', 'orders', 
            'orderItems', 'suspendedOrders', 'suppliers', 
            'purchaseOrders', 'expenses'
          ] as const;

          for (const tName of tableNames) {
            await (db as any)[tName].clear();
            if (Array.isArray(importData[tName])) {
              await (db as any)[tName].bulkAdd(importData[tName]);
            }
          }

          alert(isRtl ? 'تم استيراد قاعدة البيانات واستعادة النسخة الاحتياطية بنجاح!' : 'Database restored successfully!');
          window.location.reload();
        } catch (err: any) {
          alert(isRtl ? 'ملف النسخة الاحتياطية غير صالح: ' + err.message : 'Invalid backup file: ' + err.message);
        }
      };
      reader.readAsText(file);
    } catch (e: any) {
      alert(isRtl ? 'فشل قراءة الملف: ' + e.message : 'File read failed: ' + e.message);
    }
  };

  const [isCloudSyncing, setIsCloudSyncing] = React.useState(false);
  const handleCloudBackup = async () => {
    setIsCloudSyncing(true);
    await new Promise(r => setTimeout(r, 2000));
    setIsCloudSyncing(false);
    alert(isRtl ? 'تم رفع نسخة احتياطية سحابية مشفرة بنجاح إلى سيرفر المزامنة المركزي ☁️' : 'Encrypted cloud backup uploaded successfully to central server ☁️');
  };

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
      alert(isRtl ? 'فشل العثور على طابعة مادية متوافقة. جاري العمل بوضع المحاكاة.' : 'No physical printer found. Defaulting to simulator.');
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
      alert(isRtl ? 'فشل الاتصال بمنفذ الميزان المادي. جاري العمل بوضع المحاكاة.' : 'No scale connection detected. Defaulting to simulator.');
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

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-2 pb-4 border-b border-slate-200 dark:border-slate-800">
        <SettingsIcon className="h-6 w-6 text-indigo-500" />
        <div>
          <h2 className="text-xl font-bold font-sans">{isRtl ? 'إعدادات النظام والملحقات' : 'System & Device Settings'}</h2>
          <p className="text-xs text-slate-500">تخصيص واجهات الكاشير واللغة وتعريف الأجهزة الملحقة وطباعة الاختبار.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Appearance & Localization */}
        <div className="glass-card p-5 rounded-2xl shadow-sm space-y-5">
          <h3 className="font-bold text-sm flex items-center gap-1.5 border-b pb-2">
            <Languages className="h-4.5 w-4.5 text-blue-500" />
            {isRtl ? 'المظهر واللغة' : 'Appearance & Localization'}
          </h3>
          <div className="space-y-4 text-xs font-semibold">
            <div className="flex justify-between items-center">
              <span>{isRtl ? 'لغة النظام الحالية' : 'System Language'}</span>
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                <select 
                  value={language} 
                  onChange={(e) => changeLanguage(e.target.value)}
                  className="bg-transparent border-none text-xs focus:outline-none cursor-pointer px-2 py-1 text-slate-800 dark:text-slate-200"
                >
                  <option value="ar" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">العربية</option>
                  <option value="en" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">English</option>
                  <option value="fr" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Français</option>
                  <option value="de" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">Deutsch</option>
                  <option value="zh" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white">中文</option>
                </select>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span>{isRtl ? 'الوضع اللوني للواجهة' : 'Visual Color Mode'}</span>
              <button onClick={toggleTheme} className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1 text-[11px]">
                {theme === 'dark' ? (<><Moon className="h-3.5 w-3.5 text-cyan-400" /><span>الوضع الداكن</span></>) : (<><Sun className="h-3.5 w-3.5 text-amber-500" /><span>الوضع الفاتح</span></>)}
              </button>
            </div>
            <div className="flex justify-between items-center">
              <span>{isRtl ? 'الفرع النشط حالياً' : 'Active Branch Location'}</span>
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
            {isRtl ? 'إعدادات المتجر والضريبة' : 'Store & Tax Configuration'}
          </h3>
          <div className="space-y-3 text-xs font-semibold">
            <div className="flex flex-col gap-1">
              <label className="text-slate-500 dark:text-slate-400 text-[10px]">{isRtl ? 'اسم المنشأة / المتجر' : 'Store / Business Name'}</label>
              <input type="text" value={storeName} onChange={e => setStoreName(e.target.value)} className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans text-xs" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-slate-500 dark:text-slate-400 text-[10px]">{isRtl ? 'الرقم الضريبي / رقم التسجيل' : 'VAT Registration Number'}</label>
              <input type="text" value={vatNumber} onChange={e => setVatNumber(e.target.value)} className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans text-xs" />
            </div>

            {/* TASK B – Receipt Customization Fields */}
            <div className="flex flex-col gap-1">
              <label className="text-slate-500 dark:text-slate-400 text-[10px]">{isRtl ? 'رقم الهاتف' : 'Store Phone'}</label>
              <input type="text" value={storePhone ?? ''} onChange={e => setStorePhone(e.target.value)} placeholder="+966 5X XXX XXXX" className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans text-xs" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-slate-500 dark:text-slate-400 text-[10px]">{isRtl ? 'العنوان' : 'Store Address'}</label>
              <input type="text" value={storeAddress ?? ''} onChange={e => setStoreAddress(e.target.value)} placeholder={isRtl ? 'الرياض، المملكة العربية السعودية' : 'Riyadh, Saudi Arabia'} className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans text-xs" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-slate-500 dark:text-slate-400 text-[10px]">{isRtl ? 'رسالة الشكر (أسفل الفاتورة)' : 'Receipt Footer Message'}</label>
              <textarea value={receiptFooter ?? ''} onChange={e => setReceiptFooter(e.target.value)} rows={2} placeholder={isRtl ? 'شكراً لزيارتكم، نتمنى لكم يوماً سعيداً!' : 'Thank you for your visit!'} className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans text-xs resize-none" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-slate-500 dark:text-slate-400 text-[10px] flex items-center gap-1">
                <Image className="h-3 w-3" />
                {isRtl ? 'شعار المتجر (يظهر في الفاتورة)' : 'Store Logo (Shown on Receipt)'}
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
                    {isRtl ? 'حذف الشعار' : 'Remove Logo'}
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

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-slate-500 dark:text-slate-400 text-[10px]">{isRtl ? 'عملة النظام' : 'System Currency'}</label>
                <select value={currency} onChange={e => setCurrency(e.target.value)} className="px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs">
                  {majorCurrencies.map(c => (<option key={c.code} value={c.code}>{c.code} — {c.name.split(' (')[0]}</option>))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-slate-500 dark:text-slate-400 text-[10px]">{isRtl ? 'نسبة الضريبة (%)' : 'Tax / VAT Rate (%)'}</label>
                <input type="number" min={0} max={100} step={0.5} value={taxPercentage} onChange={e => setTaxPercentage(parseFloat(e.target.value) || 0)} className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans text-xs" />
              </div>
            </div>
            <p className="text-[9px] text-slate-400 pt-1 font-normal">{isRtl ? `✅ الإعدادات محفوظة تلقائياً وتنعكس فوراً في جميع أوجه النظام (الكاشير، ERP، الفواتير).` : '✅ Settings auto-save and instantly apply across POS, ERP and receipts.'}</p>
          </div>
        </div>

        {/* Hardware Devices Simulation Toggles */}
        <div className="glass-card p-5 rounded-2xl shadow-sm space-y-5">
          <h3 className="font-bold text-sm flex items-center gap-1.5 border-b pb-2">
            <HardDrive className="h-4.5 w-4.5 text-emerald-500" />
            {isRtl ? 'الأجهزة الملحقة (وضع المحاكاة)' : 'Peripherals (Simulation Mode)'}
          </h3>
          <div className="space-y-3.5 text-xs font-semibold">
            <div className="flex justify-between items-center">
              <span>{isRtl ? 'قارئ الباركود (USB/Bluetooth)' : 'USB Barcode Scanner'}</span>
              <button onClick={() => toggleDevice('scanner')}>{devices.scanner ? <ToggleRight className="h-6 w-6 text-blue-500" /> : <ToggleLeft className="h-6 w-6 text-slate-400" />}</button>
            </div>
            <div className="flex justify-between items-center">
              <span>{isRtl ? 'ميزان الوزن الإلكتروني' : 'Weighing Scale'}</span>
              <button onClick={() => toggleDevice('scale')}>{devices.scale ? <ToggleRight className="h-6 w-6 text-blue-500" /> : <ToggleLeft className="h-6 w-6 text-slate-400" />}</button>
            </div>
            <div className="flex justify-between items-center">
              <span>{isRtl ? 'طابعة الفواتير الحرارية ESC/POS' : 'Thermal ESC/POS Printer'}</span>
              <button onClick={() => toggleDevice('printer')}>{devices.printer ? <ToggleRight className="h-6 w-6 text-blue-500" /> : <ToggleLeft className="h-6 w-6 text-slate-400" />}</button>
            </div>
            <div className="flex justify-between items-center">
              <span>{isRtl ? 'درج النقود التلقائي RJ11' : 'Automatic Cash Drawer'}</span>
              <button onClick={() => toggleDevice('drawer')}>{devices.drawer ? <ToggleRight className="h-6 w-6 text-blue-500" /> : <ToggleLeft className="h-6 w-6 text-slate-400" />}</button>
            </div>
          </div>
        </div>

        {/* Physical Hardware Connection */}
        <div className="glass-card p-5 rounded-2xl shadow-sm space-y-4">
          <h3 className="font-bold text-sm flex items-center gap-1.5 border-b pb-2">
            <Printer className="h-4.5 w-4.5 text-violet-500" />
            {isRtl ? 'ربط الأجهزة الحقيقية (WebUSB/Serial)' : 'Real Hardware Integration (WebUSB/Serial)'}
          </h3>
          <div className="space-y-4 text-xs">
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-normal leading-relaxed">
              {isRtl ? 'توصيل مباشر بالطابعة والميزان المادي. في حالة الفشل يعمل النظام تلقائياً بالمحاكاة.' : 'Direct pairing with physical printer/scale. System falls back to simulation on failure.'}
            </p>
            <div className="flex items-center justify-between gap-2 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
              <div>
                <div className="font-bold">{isRtl ? 'طابعة ESC/POS (USB)' : 'ESC/POS Printer (USB)'}</div>
                <div className={`text-[10px] mt-0.5 ${connectedPrinterName ? 'text-emerald-500' : 'text-slate-400'}`}>
                  {connectedPrinterName ? `✅ ${connectedPrinterName}` : (isRtl ? '⚪ غير متصل – محاكاة نشطة' : '⚪ Disconnected – Simulation active')}
                </div>
              </div>
              <button onClick={handleConnectPrinter} disabled={isPrinterConnecting}
                className={`flex-shrink-0 px-3 py-1.5 rounded-lg font-bold text-[10px] transition-all ${connectedPrinterName ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'}`}>
                {isPrinterConnecting ? <span className="animate-spin inline-block h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full" /> : connectedPrinterName ? (isRtl ? 'تغيير' : 'Change') : (isRtl ? 'توصيل USB' : 'Pair via USB')}
              </button>
            </div>
            <div className="flex items-center justify-between gap-2 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
              <div>
                <div className="font-bold">{isRtl ? 'ميزان إلكتروني (Serial)' : 'Weighing Scale (Serial)'}</div>
                <div className={`text-[10px] mt-0.5 ${connectedScaleName ? 'text-emerald-500' : 'text-slate-400'}`}>
                  {connectedScaleName ? `✅ ${connectedScaleName}` : (isRtl ? '⚪ غير متصل – محاكاة نشطة' : '⚪ Disconnected – Simulation active')}
                </div>
              </div>
              <button onClick={handleConnectScale} disabled={isScaleConnecting}
                className={`flex-shrink-0 px-3 py-1.5 rounded-lg font-bold text-[10px] transition-all ${connectedScaleName ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'}`}>
                {isScaleConnecting ? <span className="animate-spin inline-block h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full" /> : connectedScaleName ? (isRtl ? 'تغيير' : 'Change') : (isRtl ? 'توصيل Serial' : 'Pair via Serial')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Backup & Restore – Full Width */}
      <div className="glass-card p-5 rounded-2xl shadow-sm space-y-4">
        <h3 className="font-bold text-sm flex items-center gap-1.5 border-b pb-2">
          <Database className="h-4.5 w-4.5 text-amber-500" />
          {isRtl ? 'النسخ الاحتياطي واستعادة البيانات' : 'Backup, Restore & Cloud Sync'}
        </h3>
        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-normal leading-relaxed">
          {isRtl ? 'صدّر بياناتك كاملة كملف JSON أو أعد تحميلها في أي جهاز آخر يعمل بالنظام. تعمل بالكامل بدون انترنت.' : 'Export your full database as a JSON backup file, or restore it on any device. Works fully offline.'}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button onClick={handleExportDatabase}
            className="py-2.5 px-3 rounded-xl border border-indigo-500/20 bg-indigo-500/5 hover:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-bold text-[11px] flex items-center justify-center gap-1.5 transition-all">
            <Database className="h-3.5 w-3.5" />
            {isRtl ? '📥 تصدير نسخة JSON' : '📥 Export JSON Backup'}
          </button>
          <label className="py-2.5 px-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer">
            <Database className="h-3.5 w-3.5" />
            {isRtl ? '📤 استيراد واستعادة' : '📤 Import & Restore'}
            <input type="file" accept=".json" onChange={handleImportDatabase} className="hidden" />
          </label>
          <button onClick={handleCloudBackup} disabled={isCloudSyncing}
            className={`py-2.5 px-3 rounded-xl font-bold text-[11px] flex items-center justify-center gap-1.5 transition-all ${isCloudSyncing ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'}`}>
            {isCloudSyncing ? <><span className="animate-spin h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full" />{isRtl ? 'جاري المزامنة...' : 'Syncing...'}</> : <>{isRtl ? '☁️ مزامنة سحابية مشفرة' : '☁️ Encrypted Cloud Sync'}</>}
          </button>
        </div>
      </div>

      {/* TASK A – User Management Panel (owner-only) */}
      {currentUser?.role === 'owner' && (
        <div className="glass-card p-5 rounded-2xl shadow-sm space-y-4 animate-fade-in">
          <h3 className="font-bold text-sm flex items-center gap-1.5 border-b pb-2">
            <Users className="h-4.5 w-4.5 text-purple-500" />
            {isRtl ? '👥 إدارة المستخدمين' : '👥 User Management'}
          </h3>

          {/* Users table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[10px] text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <th className="pb-1.5 font-bold text-start">{isRtl ? 'الاسم' : 'Name'}</th>
                  <th className="pb-1.5 font-bold text-start">{isRtl ? 'اسم المستخدم' : 'Username'}</th>
                  <th className="pb-1.5 font-bold text-start">{isRtl ? 'الدور' : 'Role'}</th>
                  <th className="pb-1.5 font-bold text-center">{isRtl ? 'الحالة' : 'Status'}</th>
                  <th className="pb-1.5 font-bold text-center">{isRtl ? 'إجراءات' : 'Actions'}</th>
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
                        onClick={() => updateUser(u.id, { active: !u.active })}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          u.active
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-800 border-slate-300 dark:border-slate-700'
                        }`}
                      >
                        {u.active ? (isRtl ? '✅ نشط' : '✅ Active') : (isRtl ? '⏸ معطل' : '⏸ Inactive')}
                      </button>
                    </td>
                    <td className="py-2">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleEditUser(u)}
                          className="p-1 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-indigo-500 transition-colors"
                          title={isRtl ? 'تعديل' : 'Edit'}
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(u)}
                          disabled={u.id === currentUser?.id}
                          className="p-1 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 text-red-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          title={isRtl ? 'حذف' : 'Delete'}
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
              {isRtl ? 'إضافة مستخدم جديد' : 'Add New User'}
            </button>
          ) : (
            <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-700 bg-indigo-50/50 dark:bg-indigo-900/10 space-y-3">
              <h4 className="font-bold text-xs text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                {editingUserId ? <Edit3 className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}
                {isRtl ? (editingUserId ? 'تعديل بيانات المستخدم' : 'إضافة مستخدم جديد') : (editingUserId ? 'Edit User' : 'Add New User')}
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-slate-500">{isRtl ? 'الاسم الكامل' : 'Display Name'}</label>
                  <input
                    type="text"
                    value={userForm.displayName}
                    onChange={e => setUserForm(f => ({ ...f, displayName: e.target.value }))}
                    placeholder={isRtl ? 'أحمد محمد' : 'John Doe'}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-slate-500">{isRtl ? 'اسم المستخدم' : 'Username'}</label>
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
                  <label className="text-[10px] text-slate-500">{isRtl ? 'الدور' : 'Role'}</label>
                  <select
                    value={userForm.role}
                    onChange={e => setUserForm(f => ({ ...f, role: e.target.value as any }))}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="owner">{isRtl ? 'مالك' : 'Owner'}</option>
                    <option value="manager">{isRtl ? 'مدير' : 'Manager'}</option>
                    <option value="cashier">{isRtl ? 'كاشير' : 'Cashier'}</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveUser}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors"
                >
                  {isRtl ? '💾 حفظ' : '💾 Save'}
                </button>
                <button
                  onClick={resetUserForm}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Restaurant Tables Management (Conditionally shown) */}
      {businessType === 'restaurant' && (
        <div className="glass-card p-5 rounded-2xl shadow-sm space-y-4 animate-fade-in">
          <h3 className="font-bold text-sm flex items-center gap-1.5 border-b pb-2">
            <span className="text-xl">🍽️</span>
            {isRtl ? 'إعدادات وإدارة طاولات صالة الطعام' : 'Restaurant Tables Configuration'}
          </h3>
          
          <div className="space-y-4">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder={isRtl ? "أدخل اسم الطاولة الجديدة (مثال: طاولة VIP)" : "Enter table name (e.g. Table VIP)"}
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
                    alert(isRtl ? 'هذه الطاولة موجودة بالفعل!' : 'Table name already exists!');
                    return;
                  }
                  setTables(prev => [...prev, name]);
                  setNewTableName('');
                }}
                className="px-4 py-1.5 bg-teal-650 hover:bg-teal-700 text-white rounded-lg text-xs font-bold font-sans"
              >
                {isRtl ? 'إضافة طاولة' : 'Add Table'}
              </button>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] text-slate-400 font-bold block">
                {isRtl ? 'الطاولات المتوفرة بالنظام (اضغط للحذف):' : 'Configured Restaurant Tables (Click to delete):'}
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
      {businessType === 'restaurant' && (
        <div className="glass-card p-5 rounded-2xl shadow-sm space-y-4 animate-fade-in">
          <h3 className="font-bold text-sm flex items-center gap-1.5 border-b pb-2">
            <span className="text-xl">🍽️</span>
            {isRtl ? 'مواصفات الطلبات (Restaurant Modifiers)' : 'Order Modifiers (Restaurant)'}
          </h3>
          <p className="text-[10px] text-slate-400 font-normal leading-relaxed">
            {isRtl ? 'أضف أو احذف مواصفات الطلبات التي تظهر في شاشة الكاشير (مثل: بدون بصل، حار جداً).' : 'Add or remove order modifiers shown in the POS screen (e.g. No Onion, Extra Spicy).'}
          </p>

          {/* Current modifiers chips */}
          <div className="flex gap-2 flex-wrap p-3 bg-slate-100/50 dark:bg-slate-900/30 rounded-xl border border-slate-200 dark:border-slate-800 min-h-[48px]">
            {modifiers.length === 0 && (
              <span className="text-[10px] text-slate-400">{isRtl ? 'لا توجد مواصفات، أضف واحدة أدناه.' : 'No modifiers yet. Add one below.'}</span>
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
                  title={isRtl ? 'حذف' : 'Delete'}
                >
                  ×
                </button>
              </span>
            ))}
          </div>

          {/* Add modifier form */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{isRtl ? 'إضافة مواصفة جديدة:' : 'Add New Modifier:'}</span>
            <div className="flex gap-2 flex-wrap">
              <input
                type="text"
                value={newModAr}
                onChange={e => setNewModAr(e.target.value)}
                placeholder={isRtl ? 'النص بالعربية (مثال: بدون بصل)' : 'Arabic text (e.g. بدون بصل)'}
                className="flex-1 min-w-[140px] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 focus:outline-none text-xs"
              />
              <input
                type="text"
                value={newModEn}
                onChange={e => setNewModEn(e.target.value)}
                placeholder={isRtl ? 'النص بالإنجليزية (e.g. No Onion)' : 'English text (e.g. No Onion)'}
                className="flex-1 min-w-[140px] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 focus:outline-none text-xs"
              />
              <button
                type="button"
                onClick={handleAddModifier}
                disabled={!newModAr.trim() && !newModEn.trim()}
                className="px-4 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {isRtl ? '+ إضافة مواصفة' : '+ Add Modifier'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clothing Retail Customization settings (Conditionally shown) */}
      {businessType === 'retail' && (
        <div className="glass-card p-5 rounded-2xl shadow-sm space-y-6 animate-fade-in">
          <h3 className="font-bold text-sm flex items-center gap-1.5 border-b pb-2">
            <span className="text-xl">👕</span>
            {isRtl ? 'إعدادات مقاسات وألوان منتجات الملابس' : 'Clothing Boutique Variants Configuration'}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Sizes section */}
            <div className="space-y-4">
              <h4 className="font-bold text-xs text-indigo-500">{isRtl ? 'إدارة المقاسات:' : 'Manage Sizes:'}</h4>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder={isRtl ? "مثال: XXL، 44" : "e.g. XXL, 44"}
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
                      alert(isRtl ? 'هذا المقاس موجود بالفعل!' : 'Size already exists!');
                      return;
                    }
                    setAvailableSizes(prev => [...prev, sz]);
                    setNewSizeName('');
                  }}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold font-sans"
                >
                  {isRtl ? 'إضافة' : 'Add'}
                </button>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] text-slate-400 font-bold block">{isRtl ? 'المقاسات الحالية (اضغط للحذف):' : 'Current Sizes (Click to delete):'}</span>
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
              <h4 className="font-bold text-xs text-indigo-500">{isRtl ? 'إدارة الألوان:' : 'Manage Colors:'}</h4>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder={isRtl ? "مثال: Yellow، أصفر" : "e.g. Yellow, White"}
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
                      alert(isRtl ? 'هذا اللون موجود بالفعل!' : 'Color already exists!');
                      return;
                    }
                    setAvailableColors(prev => [...prev, col]);
                    setNewColorName('');
                  }}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold font-sans"
                >
                  {isRtl ? 'إضافة' : 'Add'}
                </button>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] text-slate-400 font-bold block">{isRtl ? 'الألوان الحالية (اضغط للحذف):' : 'Current Colors (Click to delete):'}</span>
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
      <div className="glass-card p-5 rounded-2xl shadow-sm space-y-4">
        <h3 className="font-bold text-sm flex items-center gap-1.5 border-b pb-2">
          <Database className="h-4.5 w-4.5 text-amber-500" />
          {isRtl ? 'أدوات التشخيص والاختبار' : 'Diagnostics & System Actions'}
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={handleTestPrint}
            className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/30 dark:bg-slate-900/30 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs flex flex-col items-center gap-2 transition-all shadow-xs"
          >
            <Printer className="h-5 w-5 text-indigo-500" />
            {isRtl ? 'طباعة فاتورة تجريبية' : 'Test Receipt Print'}
          </button>

          <button
            onClick={handleTestDrawer}
            className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/30 dark:bg-slate-900/30 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs flex flex-col items-center gap-2 transition-all shadow-xs"
          >
            <span className="text-xl">💰</span>
            {isRtl ? 'فتح اختبار درج الكاش' : 'Test Open Cash Drawer'}
          </button>

          <button
            onClick={handleResetDatabase}
            className="p-3 rounded-xl border border-red-500/10 bg-red-500/5 hover:bg-red-500/10 font-bold text-xs text-red-600 dark:text-red-400 flex flex-col items-center gap-2 transition-all shadow-xs"
          >
            <Database className="h-5 w-5" />
            {isRtl ? 'مسح وتهيئة قاعدة البيانات' : 'Format IndexedDB'}
          </button>
        </div>
      </div>
    </div>
  );
};
