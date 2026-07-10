/**
 * SetupWizard.tsx
 * First-launch experience for smartPOS Desktop.
 * 8-step wizard shown ONLY on first install when no company/user exists.
 * Cannot be skipped. After completion, never shown again.
 */
import React, { useState } from 'react';
import {
  CheckCircle, ChevronRight, ChevronLeft, Building2,
  GitBranch, User, Receipt, Star, Shield, AlertCircle, Upload,
  Languages
} from 'lucide-react';

const CURRENCIES = ['SAR', 'USD', 'EUR', 'GBP', 'AED', 'KWD', 'BHD', 'QAR', 'OMR', 'JOD', 'EGP', 'TRY'];
const TIMEZONES = [
  'Asia/Riyadh', 'Asia/Dubai', 'Asia/Kuwait', 'Asia/Bahrain', 'Asia/Qatar',
  'Asia/Muscat', 'Asia/Amman', 'Africa/Cairo', 'Europe/London', 'Europe/Paris',
  'America/New_York', 'America/Los_Angeles', 'Asia/Istanbul'
];

interface WizardData {
  language: string;
  licenseAccepted: boolean;
  companyName: string;
  storeName: string;
  phone: string;
  email: string;
  address: string;
  country: string;
  city: string;
  currency: string;
  timezone: string;
  branchName: string;
  branchPhone: string;
  branchAddress: string;
  branchManager: string;
  ownerName: string;
  ownerEmail: string;
  ownerPassword: string;
  ownerConfirm: string;
  paperSize: '58mm' | '80mm' | 'A4';
  taxRate: number;
  invoicePrefix: string;
  logoBase64: string;
}

interface SetupWizardProps {
  onComplete: (data: WizardData) => void;
}

const LICENSE_TEXT = `اتفاقية ترخيص المستخدم النهائي (EULA)
نظام smart POS — الإصدار 1.0

بالضغط على "أوافق وأكمل"، أنت توافق على الشروط التالية:

1. الترخيص
يمنحك هذا البرنامج ترخيصاً غير قابل للتحويل لاستخدام هذا البرنامج على الأجهزة المرخّصة فقط.

2. القيود
- لا يجوز نسخ البرنامج أو توزيعه دون إذن كتابي.
- لا يجوز إجراء هندسة عكسية أو تعديل الكود المصدري.
- لا يجوز استخدامه لأغراض غير مشروعة.

3. الخصوصية والبيانات
- جميع البيانات تُخزَّن محلياً على جهازك.
- لا ترسل بياناتك التجارية أو العملاء إلى أي خادم دون إذنك.

4. الضمان والمسؤولية
- يُقدَّم البرنامج "كما هو" دون ضمانات صريحة.
- لا تتحمل الشركة المسؤولية عن أي أضرار تجارية.

5. التحديثات
- تشمل التحديثات المستقبلية هذه الاتفاقية.

للمزيد من المعلومات: support@smartpos.app`;

const steps = [
  { id: 1, title_ar: 'مرحباً', title_en: 'Welcome', icon: Star },
  { id: 2, title_ar: 'اللغة', title_en: 'Language', icon: Languages },
  { id: 3, title_ar: 'اتفاقية الترخيص', title_en: 'License', icon: Shield },
  { id: 4, title_ar: 'إعداد الشركة', title_en: 'Company', icon: Building2 },
  { id: 5, title_ar: 'إعداد الفرع', title_en: 'Branch', icon: GitBranch },
  { id: 6, title_ar: 'حساب المالك', title_en: 'Owner Account', icon: User },
  { id: 7, title_ar: 'إعداد الفاتورة', title_en: 'Invoice', icon: Receipt },
  { id: 8, title_ar: 'اكتمل', title_en: 'Complete', icon: CheckCircle },
];

export const SetupWizard: React.FC<SetupWizardProps> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [data, setData] = useState<WizardData>({
    language: 'ar',
    licenseAccepted: false,
    companyName: '',
    storeName: '',
    phone: '',
    email: '',
    address: '',
    country: 'المملكة العربية السعودية',
    city: '',
    currency: 'SAR',
    timezone: 'Asia/Riyadh',
    branchName: '',
    branchPhone: '',
    branchAddress: '',
    branchManager: '',
    ownerName: '',
    ownerEmail: '',
    ownerPassword: '',
    ownerConfirm: '',
    paperSize: '80mm',
    taxRate: 15,
    invoicePrefix: 'INV',
    logoBase64: '',
  });

  const isRtl = data.language === 'ar';

  const update = (field: keyof WizardData, value: any) => {
    setData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => { const e = { ...prev }; delete e[field]; return e; });
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (step === 3 && !data.licenseAccepted) {
      e.license = isRtl ? 'يجب الموافقة على الاتفاقية للمتابعة.' : 'You must accept the license agreement to continue.';
    }
    if (step === 4) {
      if (!data.companyName.trim()) e.companyName = isRtl ? 'اسم الشركة مطلوب.' : 'Company name is required.';
      if (!data.storeName.trim()) e.storeName = isRtl ? 'اسم المتجر مطلوب.' : 'Store name is required.';
      if (!data.currency) e.currency = isRtl ? 'العملة مطلوبة.' : 'Currency is required.';
    }
    if (step === 5) {
      if (!data.branchName.trim()) e.branchName = isRtl ? 'اسم الفرع مطلوب.' : 'Branch name is required.';
    }
    if (step === 6) {
      if (!data.ownerName.trim()) e.ownerName = isRtl ? 'الاسم مطلوب.' : 'Name is required.';
      if (!data.ownerEmail.trim()) e.ownerEmail = isRtl ? 'البريد الإلكتروني مطلوب.' : 'Email is required.';
      if (data.ownerPassword.length < 6) e.ownerPassword = isRtl ? 'كلمة المرور 6 أحرف على الأقل.' : 'Password must be at least 6 characters.';
      if (data.ownerPassword !== data.ownerConfirm) e.ownerConfirm = isRtl ? 'كلمتا المرور غير متطابقتين.' : 'Passwords do not match.';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => { if (validate()) setStep(s => Math.min(8, s + 1)); };
  const back = () => { setStep(s => Math.max(1, s - 1)); setErrors({}); };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => update('logoBase64', reader.result as string);
    reader.readAsDataURL(file);
  };

  // Invoice preview paper size dims
  const paperStyle: React.CSSProperties = data.paperSize === 'A4'
    ? { width: '210px', minHeight: '297px', fontSize: '11px' }
    : data.paperSize === '80mm'
    ? { width: '200px', minHeight: '280px', fontSize: '9px' }
    : { width: '145px', minHeight: '220px', fontSize: '8px' };

  const inputClass = `w-full px-3 py-2.5 rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-all`;
  const labelClass = `block text-xs font-semibold text-slate-500 mb-1`;
  const errorClass = `text-xs text-red-500 mt-1 flex items-center gap-1`;

  return (
    <div
      className="min-h-screen bg-[#090d16] flex items-center justify-center p-4"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* Ambient glows */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/8 rounded-full blur-[150px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-600/8 rounded-full blur-[150px]" />
      </div>

      <div className="w-full max-w-2xl relative z-10">
        {/* Header */}
        {step < 8 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                  <Star className="w-4 h-4 text-white" />
                </div>
                <span className="text-white font-bold text-sm">smart POS</span>
                <span className="text-slate-500 text-xs">v1.0</span>
              </div>
              <span className="text-slate-500 text-xs">
                {isRtl ? `الخطوة ${step} من 7` : `Step ${step} of 7`}
              </span>
            </div>

            {/* Progress bar */}
            <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${((step - 1) / 7) * 100}%` }}
              />
            </div>

            {/* Step indicators */}
            <div className="flex justify-between mt-3">
              {steps.slice(0, 7).map(s => {
                const Icon = s.icon;
                const active = s.id === step;
                const done = s.id < step;
                return (
                  <div key={s.id} className="flex flex-col items-center gap-1">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                      done ? 'bg-emerald-500' : active ? 'bg-blue-500 ring-2 ring-blue-400/40' : 'bg-slate-800'
                    }`}>
                      {done ? <CheckCircle className="w-3.5 h-3.5 text-white" /> : <Icon className="w-3 h-3 text-white" />}
                    </div>
                    <span className={`text-[9px] font-bold hidden sm:block ${active ? 'text-blue-400' : done ? 'text-emerald-400' : 'text-slate-600'}`}>
                      {isRtl ? s.title_ar : s.title_en}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Card */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 shadow-2xl">

          {/* Step 1: Welcome */}
          {step === 1 && (
            <div className="text-center space-y-6 py-4">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mx-auto shadow-lg shadow-blue-500/25">
                <Star className="w-10 h-10 text-white" />
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-black text-white">smart POS</h1>
                <p className="text-slate-400 text-sm">
                  {isRtl
                    ? 'نظام إدارة المبيعات والمخازن المتكامل'
                    : 'Integrated Point of Sale & ERP System'}
                </p>
                <span className="inline-block px-3 py-1 rounded-full bg-slate-800 text-slate-400 text-xs font-mono">
                  v1.0.0 — Commercial Release
                </span>
              </div>
              <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/50 text-sm text-slate-400 text-right space-y-2">
                <p className="font-semibold text-slate-300">
                  {isRtl ? 'سيرشدك هذا المعالج خلال:' : 'This wizard will guide you through:'}
                </p>
                {[
                  isRtl ? 'اختيار لغة النظام' : 'System language selection',
                  isRtl ? 'الموافقة على اتفاقية الترخيص' : 'License agreement',
                  isRtl ? 'إعداد بيانات شركتك' : 'Company setup',
                  isRtl ? 'إنشاء أول فرع' : 'First branch creation',
                  isRtl ? 'إنشاء حساب المالك' : 'Owner account creation',
                  isRtl ? 'إعدادات الفاتورة' : 'Invoice configuration',
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={next}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-blue-900/40 transition-all flex items-center justify-center gap-2"
              >
                {isRtl ? 'ابدأ الإعداد' : 'Get Started'}
                {isRtl ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
            </div>
          )}

          {/* Step 2: Language */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <Languages className="w-10 h-10 text-blue-400 mx-auto" />
                <h2 className="text-xl font-bold text-white">
                  {isRtl ? 'اختيار اللغة' : 'Language Selection'}
                </h2>
                <p className="text-slate-400 text-sm">
                  {isRtl ? 'اختر لغة واجهة النظام' : 'Choose your system interface language'}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { code: 'ar', label: 'العربية', sub: 'Arabic', flag: '🇸🇦' },
                  { code: 'en', label: 'English', sub: 'الإنجليزية', flag: '🇬🇧' },
                ].map(lang => (
                  <button
                    key={lang.code}
                    onClick={() => update('language', lang.code)}
                    className={`p-5 rounded-xl border-2 transition-all text-center space-y-2 ${
                      data.language === lang.code
                        ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                        : 'border-slate-700 hover:border-slate-600 text-slate-400'
                    }`}
                  >
                    <span className="text-3xl">{lang.flag}</span>
                    <div>
                      <p className="font-bold text-white">{lang.label}</p>
                      <p className="text-xs text-slate-500">{lang.sub}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: License */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="text-center space-y-2">
                <Shield className="w-10 h-10 text-blue-400 mx-auto" />
                <h2 className="text-xl font-bold text-white">
                  {isRtl ? 'اتفاقية الترخيص' : 'License Agreement'}
                </h2>
              </div>
              <div className="bg-slate-800/80 rounded-xl p-4 h-48 overflow-y-auto border border-slate-700/50">
                <pre className="text-xs text-slate-400 whitespace-pre-wrap font-sans leading-relaxed">
                  {LICENSE_TEXT}
                </pre>
              </div>
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={data.licenseAccepted}
                  onChange={e => update('licenseAccepted', e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-slate-600 accent-blue-500"
                />
                <span className="text-sm text-slate-300 group-hover:text-white transition-colors">
                  {isRtl
                    ? 'أوافق على شروط اتفاقية الترخيص وأقر بأنني قرأت وفهمت بنودها.'
                    : 'I agree to the terms of the license agreement and acknowledge that I have read and understood all its provisions.'}
                </span>
              </label>
              {errors.license && (
                <div className={errorClass}>
                  <AlertCircle className="w-3 h-3" />
                  {errors.license}
                </div>
              )}
            </div>
          )}

          {/* Step 4: Company Setup */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="text-center space-y-1 mb-2">
                <Building2 className="w-8 h-8 text-blue-400 mx-auto" />
                <h2 className="text-xl font-bold text-white">
                  {isRtl ? 'إعداد بيانات الشركة' : 'Company Setup'}
                </h2>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>{isRtl ? 'اسم الشركة *' : 'Company Name *'}</label>
                  <input className={inputClass} value={data.companyName} onChange={e => update('companyName', e.target.value)} placeholder={isRtl ? 'شركة النجاح التجارية' : 'Success Trading Co.'} />
                  {errors.companyName && <p className={errorClass}><AlertCircle className="w-3 h-3" />{errors.companyName}</p>}
                </div>
                <div>
                  <label className={labelClass}>{isRtl ? 'اسم المتجر *' : 'Store Name *'}</label>
                  <input className={inputClass} value={data.storeName} onChange={e => update('storeName', e.target.value)} placeholder={isRtl ? 'متجر النجاح' : 'Success Store'} />
                  {errors.storeName && <p className={errorClass}><AlertCircle className="w-3 h-3" />{errors.storeName}</p>}
                </div>
                <div>
                  <label className={labelClass}>{isRtl ? 'الهاتف' : 'Phone'}</label>
                  <input className={inputClass} value={data.phone} onChange={e => update('phone', e.target.value)} placeholder="+966 5x xxx xxxx" dir="ltr" />
                </div>
                <div>
                  <label className={labelClass}>{isRtl ? 'البريد الإلكتروني' : 'Email'}</label>
                  <input className={inputClass} value={data.email} onChange={e => update('email', e.target.value)} placeholder="info@example.com" dir="ltr" />
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>{isRtl ? 'العنوان' : 'Address'}</label>
                  <input className={inputClass} value={data.address} onChange={e => update('address', e.target.value)} placeholder={isRtl ? 'شارع العليا، الرياض' : 'Al Olaya Street, Riyadh'} />
                </div>
                <div>
                  <label className={labelClass}>{isRtl ? 'الدولة' : 'Country'}</label>
                  <input className={inputClass} value={data.country} onChange={e => update('country', e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>{isRtl ? 'المدينة' : 'City'}</label>
                  <input className={inputClass} value={data.city} onChange={e => update('city', e.target.value)} placeholder={isRtl ? 'الرياض' : 'Riyadh'} />
                </div>
                <div>
                  <label className={labelClass}>{isRtl ? 'العملة *' : 'Currency *'}</label>
                  <select className={inputClass} value={data.currency} onChange={e => update('currency', e.target.value)}>
                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  {errors.currency && <p className={errorClass}><AlertCircle className="w-3 h-3" />{errors.currency}</p>}
                </div>
                <div>
                  <label className={labelClass}>{isRtl ? 'المنطقة الزمنية' : 'Timezone'}</label>
                  <select className={inputClass} value={data.timezone} onChange={e => update('timezone', e.target.value)}>
                    {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>{isRtl ? 'شعار الشركة' : 'Company Logo'}</label>
                  <div className="flex items-center gap-4">
                    {data.logoBase64 && (
                      <img src={data.logoBase64} alt="Logo" className="h-14 w-14 object-contain rounded-lg border border-slate-700" />
                    )}
                    <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-slate-600 hover:border-blue-500 cursor-pointer text-sm text-slate-400 hover:text-blue-400 transition-all">
                      <Upload className="w-4 h-4" />
                      {isRtl ? 'رفع الشعار' : 'Upload Logo'}
                      <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Branch Setup */}
          {step === 5 && (
            <div className="space-y-4">
              <div className="text-center space-y-1 mb-2">
                <GitBranch className="w-8 h-8 text-blue-400 mx-auto" />
                <h2 className="text-xl font-bold text-white">
                  {isRtl ? 'إعداد أول فرع' : 'First Branch Setup'}
                </h2>
                <p className="text-slate-400 text-xs">
                  {isRtl ? 'يمكنك إضافة فروع أخرى لاحقاً من الإعدادات' : 'You can add more branches later in Settings'}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className={labelClass}>{isRtl ? 'اسم الفرع *' : 'Branch Name *'}</label>
                  <input className={inputClass} value={data.branchName} onChange={e => update('branchName', e.target.value)} placeholder={isRtl ? 'الفرع الرئيسي' : 'Main Branch'} />
                  {errors.branchName && <p className={errorClass}><AlertCircle className="w-3 h-3" />{errors.branchName}</p>}
                </div>
                <div>
                  <label className={labelClass}>{isRtl ? 'هاتف الفرع' : 'Branch Phone'}</label>
                  <input className={inputClass} value={data.branchPhone} onChange={e => update('branchPhone', e.target.value)} placeholder="+966 5x xxx xxxx" dir="ltr" />
                </div>
                <div>
                  <label className={labelClass}>{isRtl ? 'المدير المسؤول' : 'Branch Manager'}</label>
                  <input className={inputClass} value={data.branchManager} onChange={e => update('branchManager', e.target.value)} placeholder={isRtl ? 'اسم المدير' : 'Manager Name'} />
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>{isRtl ? 'عنوان الفرع' : 'Branch Address'}</label>
                  <input className={inputClass} value={data.branchAddress} onChange={e => update('branchAddress', e.target.value)} placeholder={isRtl ? 'عنوان الفرع التفصيلي' : 'Detailed branch address'} />
                </div>
              </div>
            </div>
          )}

          {/* Step 6: Owner Account */}
          {step === 6 && (
            <div className="space-y-4">
              <div className="text-center space-y-1 mb-2">
                <User className="w-8 h-8 text-blue-400 mx-auto" />
                <h2 className="text-xl font-bold text-white">
                  {isRtl ? 'إنشاء حساب المالك' : 'Create Owner Account'}
                </h2>
                <p className="text-slate-400 text-xs">
                  {isRtl ? 'هذا الحساب لديه صلاحيات كاملة على النظام' : 'This account has full system permissions'}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>
                  {isRtl
                    ? 'لن يتم إنشاء أي حسابات افتراضية. هذا الحساب فقط هو الذي سيتمكن من الدخول مبدئياً.'
                    : 'No default accounts will be created. Only this owner account will have initial access.'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className={labelClass}>{isRtl ? 'الاسم الكامل *' : 'Full Name *'}</label>
                  <input className={inputClass} value={data.ownerName} onChange={e => update('ownerName', e.target.value)} placeholder={isRtl ? 'محمد أحمد الغامدي' : 'John Smith'} />
                  {errors.ownerName && <p className={errorClass}><AlertCircle className="w-3 h-3" />{errors.ownerName}</p>}
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>{isRtl ? 'البريد الإلكتروني / اسم المستخدم *' : 'Email / Username *'}</label>
                  <input className={inputClass} value={data.ownerEmail} onChange={e => update('ownerEmail', e.target.value)} placeholder="owner@example.com" dir="ltr" />
                  {errors.ownerEmail && <p className={errorClass}><AlertCircle className="w-3 h-3" />{errors.ownerEmail}</p>}
                </div>
                <div>
                  <label className={labelClass}>{isRtl ? 'كلمة المرور *' : 'Password *'}</label>
                  <input type="password" className={inputClass} value={data.ownerPassword} onChange={e => update('ownerPassword', e.target.value)} placeholder="••••••••" />
                  {errors.ownerPassword && <p className={errorClass}><AlertCircle className="w-3 h-3" />{errors.ownerPassword}</p>}
                </div>
                <div>
                  <label className={labelClass}>{isRtl ? 'تأكيد كلمة المرور *' : 'Confirm Password *'}</label>
                  <input type="password" className={inputClass} value={data.ownerConfirm} onChange={e => update('ownerConfirm', e.target.value)} placeholder="••••••••" />
                  {errors.ownerConfirm && <p className={errorClass}><AlertCircle className="w-3 h-3" />{errors.ownerConfirm}</p>}
                </div>
              </div>
            </div>
          )}

          {/* Step 7: Invoice Setup */}
          {step === 7 && (
            <div className="space-y-4">
              <div className="text-center space-y-1 mb-2">
                <Receipt className="w-8 h-8 text-blue-400 mx-auto" />
                <h2 className="text-xl font-bold text-white">
                  {isRtl ? 'إعداد الفاتورة' : 'Invoice Setup'}
                </h2>
              </div>
              <div className="grid grid-cols-5 gap-4">
                {/* Settings column */}
                <div className="col-span-3 space-y-4">
                  <div>
                    <label className={labelClass}>{isRtl ? 'حجم ورق الطباعة' : 'Paper Size'}</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['58mm', '80mm', 'A4'] as const).map(size => (
                        <button key={size} onClick={() => update('paperSize', size)}
                          className={`py-2 rounded-lg border text-xs font-bold transition-all ${data.paperSize === size ? 'border-blue-500 bg-blue-500/15 text-blue-400' : 'border-slate-700 text-slate-500 hover:border-slate-600'}`}>
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>{isRtl ? 'نسبة ضريبة القيمة المضافة (%)' : 'VAT Rate (%)'}</label>
                    <input type="number" className={inputClass} value={data.taxRate} onChange={e => update('taxRate', parseFloat(e.target.value) || 0)} min={0} max={100} step={0.5} />
                  </div>
                  <div>
                    <label className={labelClass}>{isRtl ? 'بادئة رقم الفاتورة' : 'Invoice Number Prefix'}</label>
                    <input className={inputClass} value={data.invoicePrefix} onChange={e => update('invoicePrefix', e.target.value)} placeholder="INV" dir="ltr" />
                  </div>
                </div>

                {/* Preview column */}
                <div className="col-span-2">
                  <p className={`${labelClass} text-center`}>{isRtl ? 'معاينة' : 'Preview'}</p>
                  <div className="flex justify-center">
                    <div
                      className="bg-white rounded border border-slate-300 shadow-sm p-2 overflow-hidden"
                      style={paperStyle}
                    >
                      {/* Receipt preview */}
                      <div className="text-center border-b border-dashed border-gray-300 pb-2 mb-2">
                        {data.logoBase64 && <img src={data.logoBase64} alt="" className="h-8 mx-auto mb-1 object-contain" />}
                        <p className="font-black text-gray-800 text-center" style={{ fontSize: 'inherit' }}>
                          {data.storeName || (isRtl ? 'اسم المتجر' : 'Store Name')}
                        </p>
                        {data.phone && <p className="text-gray-500" style={{ fontSize: 'inherit' }}>{data.phone}</p>}
                        {data.address && <p className="text-gray-500" style={{ fontSize: 'inherit' }}>{data.address}</p>}
                      </div>
                      <div className="space-y-1 border-b border-dashed border-gray-300 pb-2 mb-2">
                        <div className="flex justify-between text-gray-700">
                          <span>{isRtl ? 'فاتورة رقم:' : 'Invoice:'}</span>
                          <span>{data.invoicePrefix}-00001</span>
                        </div>
                        <div className="flex justify-between text-gray-500">
                          <span>{isRtl ? 'التاريخ:' : 'Date:'}</span>
                          <span>{new Date().toLocaleDateString('ar-SA')}</span>
                        </div>
                      </div>
                      <div className="space-y-0.5 border-b border-dashed border-gray-300 pb-2 mb-2">
                        <div className="flex justify-between text-gray-700">
                          <span>{isRtl ? 'منتج تجريبي' : 'Sample Item'}</span>
                          <span>100.00</span>
                        </div>
                        <div className="flex justify-between text-gray-500">
                          <span>{isRtl ? `ضريبة ${data.taxRate}%` : `VAT ${data.taxRate}%`}</span>
                          <span>{(100 * data.taxRate / 100).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between font-black text-gray-900">
                          <span>{isRtl ? 'الإجمالي' : 'Total'}</span>
                          <span>{(100 + 100 * data.taxRate / 100).toFixed(2)} {data.currency}</span>
                        </div>
                      </div>
                      <div className="flex justify-center my-1">
                        <div className="w-14 h-14 bg-gray-200 rounded flex items-center justify-center text-gray-400" style={{ fontSize: '8px' }}>QR</div>
                      </div>
                      <p className="text-center text-gray-400 text-center" style={{ fontSize: 'inherit' }}>
                        {isRtl ? 'شكراً لزيارتكم' : 'Thank you for your visit'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 8: Complete */}
          {step === 8 && (
            <div className="text-center space-y-6 py-4">
              <div className="w-20 h-20 rounded-full bg-emerald-500/15 border-2 border-emerald-500/40 flex items-center justify-center mx-auto">
                <CheckCircle className="w-10 h-10 text-emerald-400" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-black text-white">
                  {isRtl ? 'اكتمل الإعداد!' : 'Setup Complete!'}
                </h2>
                <p className="text-slate-400 text-sm">
                  {isRtl ? 'تم تهيئة النظام بنجاح وهو جاهز للاستخدام.' : 'The system has been configured and is ready to use.'}
                </p>
              </div>
              <div className="grid grid-cols-1 gap-2 text-sm text-right">
                {[
                  { label: isRtl ? 'الشركة' : 'Company', value: data.companyName, done: true },
                  { label: isRtl ? 'الفرع' : 'Branch', value: data.branchName, done: true },
                  { label: isRtl ? 'المالك' : 'Owner', value: data.ownerName, done: true },
                  { label: isRtl ? 'العملة' : 'Currency', value: data.currency, done: true },
                  { label: isRtl ? 'حجم الورق' : 'Paper', value: data.paperSize, done: true },
                ].map((item, i) => (
                  <div key={i} className="flex justify-between items-center p-3 rounded-xl bg-slate-800/50 border border-slate-700/50">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                      <span className="text-slate-400 text-xs">{item.label}</span>
                    </div>
                    <span className="font-bold text-white text-xs">{item.value}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => onComplete(data)}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-900/40 transition-all"
              >
                {isRtl ? 'الدخول إلى لوحة التحكم' : 'Enter Dashboard'}
              </button>
            </div>
          )}

          {/* Navigation buttons */}
          {step > 1 && step < 8 && (
            <div className="flex justify-between mt-6 pt-4 border-t border-slate-700/50">
              <button
                onClick={back}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-700 text-slate-400 hover:text-white hover:border-slate-600 transition-all text-sm font-semibold"
              >
                {isRtl ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                {isRtl ? 'رجوع' : 'Back'}
              </button>
              <button
                onClick={step === 7 ? next : next}
                className="flex items-center gap-2 px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition-all"
              >
                {step === 7
                  ? (isRtl ? 'إنهاء الإعداد' : 'Finish Setup')
                  : (isRtl ? 'التالي' : 'Next')}
                {isRtl ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
