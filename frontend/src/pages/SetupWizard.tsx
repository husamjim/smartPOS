import { useTranslation } from 'react-i18next';
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

import { COUNTRIES } from '../utils/countries';

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
  activity: 'restaurant' | 'supermarket' | 'pharmacy' | 'clothing' | 'electronics';
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
  const { t } = useTranslation();
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
    country: 'US',
    city: 'New York',
    currency: 'USD',
    timezone: 'America/New_York',
    branchName: '',
    branchPhone: '',
    branchAddress: '',
    branchManager: '',
    ownerName: '',
    ownerEmail: '',
    ownerPassword: '',
    ownerConfirm: '',
    paperSize: '80mm',
    taxRate: 0,
    invoicePrefix: 'INV',
    logoBase64: '',
    activity: 'supermarket',
  });

  const isRtl = data.language === 'ar';

  const update = (field: keyof WizardData, value: any) => {
    setData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => { const e = { ...prev }; delete e[field]; return e; });
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (step === 3 && !data.licenseAccepted) {
      e.license = t('you_must_accept_the_license_agreement_to_continue');
    }
    if (step === 4) {
      if (!data.companyName.trim()) e.companyName = t('company_name_is_required');
      if (!data.storeName.trim()) e.storeName = t('store_name_is_required');
      if (!data.currency) e.currency = t('currency_is_required');
    }
    if (step === 5) {
      if (!data.branchName.trim()) e.branchName = t('branch_name_is_required');
    }
    if (step === 6) {
      if (!data.ownerName.trim()) e.ownerName = t('name_is_required');
      if (!data.ownerEmail.trim()) e.ownerEmail = t('email_is_required');
      if (data.ownerPassword.length < 6) e.ownerPassword = t('password_must_be_at_least_6_characters');
      if (data.ownerPassword !== data.ownerConfirm) e.ownerConfirm = t('passwords_do_not_match');
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
      dir={t('ltr')}
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
                  {t('integrated_point_of_sale_erp_system')}
                </p>
                <span className="inline-block px-3 py-1 rounded-full bg-slate-800 text-slate-400 text-xs font-mono">
                  v1.0.0 — Commercial Release
                </span>
              </div>
              <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/50 text-sm text-slate-400 text-right space-y-2">
                <p className="font-semibold text-slate-300">
                  {t('this_wizard_will_guide_you_through')}
                </p>
                {[
                  t('system_language_selection'),
                  t('license_agreement'),
                  t('company_setup'),
                  t('first_branch_creation'),
                  t('owner_account_creation'),
                  t('invoice_configuration'),
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
                {t('get_started')}
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
                  {t('language_selection')}
                </h2>
                <p className="text-slate-400 text-sm">
                  {t('choose_your_system_interface_language')}
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
                  {t('license_agreement_1')}
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
                  {t('company_setup_1')}
                </h2>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>{t('company_name')}</label>
                  <input className={inputClass} value={data.companyName} onChange={e => update('companyName', e.target.value)} placeholder={t('success_trading_co')} />
                  {errors.companyName && <p className={errorClass}><AlertCircle className="w-3 h-3" />{errors.companyName}</p>}
                </div>
                <div>
                  <label className={labelClass}>{t('store_name_1')}</label>
                  <input className={inputClass} value={data.storeName} onChange={e => update('storeName', e.target.value)} placeholder={t('success_store')} />
                  {errors.storeName && <p className={errorClass}><AlertCircle className="w-3 h-3" />{errors.storeName}</p>}
                </div>
                <div>
                  <label className={labelClass}>{t('phone')}</label>
                  <input className={inputClass} value={data.phone} onChange={e => update('phone', e.target.value)} placeholder={(COUNTRIES.find(c => c.code === data.country)?.dialCode || '+1') + ' ...'} dir="ltr" />
                </div>
                <div>
                  <label className={labelClass}>{t('email')}</label>
                  <input className={inputClass} value={data.email} onChange={e => update('email', e.target.value)} placeholder="info@example.com" dir="ltr" />
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>{t('address')}</label>
                  <input className={inputClass} value={data.address} onChange={e => update('address', e.target.value)} placeholder={t('detailed_address')} />
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>{t('business_activity_type')}</label>
                  <select className={inputClass} value={data.activity} onChange={e => update('activity', e.target.value)}>
                    <option value="supermarket">{t('supermarket_grocery')}</option>
                    <option value="restaurant">{t('restaurant_cafe')}</option>
                    <option value="pharmacy">{t('pharmacy_medical')}</option>
                    <option value="clothing">{t('clothing_fashion')}</option>
                    <option value="electronics">{t('electronics_hardware')}</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>{t('country')}</label>
                  <select
                    className={inputClass}
                    value={data.country}
                    onChange={e => {
                      const code = e.target.value;
                      const matched = COUNTRIES.find(c => c.code === code);
                      if (matched) {
                        setData(prev => ({
                          ...prev,
                          country: code,
                          currency: matched.currency,
                          timezone: matched.timezones[0] || '',
                          city: matched.cities[0] || '',
                          phone: matched.dialCode + ' '
                        }));
                      }
                    }}
                  >
                    {COUNTRIES.map(c => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {isRtl ? c.name_ar : c.name_en}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>{t('city')}</label>
                  <input
                    list="cities-list"
                    className={inputClass}
                    value={data.city}
                    onChange={e => update('city', e.target.value)}
                    placeholder={t('select_or_type_city')}
                  />
                  <datalist id="cities-list">
                    {(COUNTRIES.find(c => c.code === data.country)?.cities || []).map(cit => (
                      <option key={cit} value={cit} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className={labelClass}>{t('currency_2')}</label>
                  <select
                    className={inputClass}
                    value={data.currency}
                    onChange={e => update('currency', e.target.value)}
                  >
                    {Array.from(new Set(COUNTRIES.map(c => c.currency))).map(curr => {
                      const info = COUNTRIES.find(c => c.currency === curr);
                      return (
                        <option key={curr} value={curr}>
                          {curr} ({isRtl ? info?.currency_name_ar : info?.currency_name_en})
                        </option>
                      );
                    })}
                  </select>
                  {errors.currency && <p className={errorClass}><AlertCircle className="w-3 h-3" />{errors.currency}</p>}
                </div>
                <div>
                  <label className={labelClass}>{t('timezone')}</label>
                  <select
                    className={inputClass}
                    value={data.timezone}
                    onChange={e => update('timezone', e.target.value)}
                  >
                    {(COUNTRIES.find(c => c.code === data.country)?.timezones || [data.timezone]).map(tz => (
                      <option key={tz} value={tz}>{tz}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>{t('company_logo')}</label>
                  <div className="flex items-center gap-4">
                    {data.logoBase64 && (
                      <img src={data.logoBase64} alt="Logo" className="h-14 w-14 object-contain rounded-lg border border-slate-700" />
                    )}
                    <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-slate-600 hover:border-blue-500 cursor-pointer text-sm text-slate-400 hover:text-blue-400 transition-all">
                      <Upload className="w-4 h-4" />
                      {t('upload_logo')}
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
                  {t('first_branch_setup')}
                </h2>
                <p className="text-slate-400 text-xs">
                  {t('you_can_add_more_branches_later_in_settings')}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className={labelClass}>{t('branch_name')}</label>
                  <input className={inputClass} value={data.branchName} onChange={e => update('branchName', e.target.value)} placeholder={t('main_branch')} />
                  {errors.branchName && <p className={errorClass}><AlertCircle className="w-3 h-3" />{errors.branchName}</p>}
                </div>
                <div>
                  <label className={labelClass}>{t('branch_phone')}</label>
                  <input className={inputClass} value={data.branchPhone} onChange={e => update('branchPhone', e.target.value)} placeholder={(COUNTRIES.find(c => c.code === data.country)?.dialCode || '+1') + ' ...'} dir="ltr" />
                </div>
                <div>
                  <label className={labelClass}>{t('branch_manager')}</label>
                  <input className={inputClass} value={data.branchManager} onChange={e => update('branchManager', e.target.value)} placeholder={t('manager_name')} />
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>{t('branch_address')}</label>
                  <input className={inputClass} value={data.branchAddress} onChange={e => update('branchAddress', e.target.value)} placeholder={t('detailed_branch_address')} />
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
                  {t('create_owner_account')}
                </h2>
                <p className="text-slate-400 text-xs">
                  {t('this_account_has_full_system_permissions')}
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
                  <label className={labelClass}>{t('full_name')}</label>
                  <input className={inputClass} value={data.ownerName} onChange={e => update('ownerName', e.target.value)} placeholder={t('john_smith')} />
                  {errors.ownerName && <p className={errorClass}><AlertCircle className="w-3 h-3" />{errors.ownerName}</p>}
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>{t('email_username')}</label>
                  <input className={inputClass} value={data.ownerEmail} onChange={e => update('ownerEmail', e.target.value)} placeholder="owner@example.com" dir="ltr" />
                  {errors.ownerEmail && <p className={errorClass}><AlertCircle className="w-3 h-3" />{errors.ownerEmail}</p>}
                </div>
                <div>
                  <label className={labelClass}>{t('password_1')}</label>
                  <input type="password" className={inputClass} value={data.ownerPassword} onChange={e => update('ownerPassword', e.target.value)} placeholder="••••••••" />
                  {errors.ownerPassword && <p className={errorClass}><AlertCircle className="w-3 h-3" />{errors.ownerPassword}</p>}
                </div>
                <div>
                  <label className={labelClass}>{t('confirm_password')}</label>
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
                  {t('invoice_setup')}
                </h2>
              </div>
              <div className="grid grid-cols-5 gap-4">
                {/* Settings column */}
                <div className="col-span-3 space-y-4">
                  <div>
                    <label className={labelClass}>{t('paper_size')}</label>
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
                    <label className={labelClass}>{t('vat_rate')}</label>
                    <input type="number" className={inputClass} value={data.taxRate} onChange={e => update('taxRate', parseFloat(e.target.value) || 0)} min={0} max={100} step={0.5} />
                  </div>
                  <div>
                    <label className={labelClass}>{t('invoice_number_prefix')}</label>
                    <input className={inputClass} value={data.invoicePrefix} onChange={e => update('invoicePrefix', e.target.value)} placeholder="INV" dir="ltr" />
                  </div>
                </div>

                {/* Preview column */}
                <div className="col-span-2">
                  <p className={`${labelClass} text-center`}>{t('preview')}</p>
                  <div className="flex justify-center">
                    <div
                      className="bg-white rounded border border-slate-300 shadow-sm p-2 overflow-hidden"
                      style={paperStyle}
                    >
                      {/* Receipt preview */}
                      <div className="text-center border-b border-dashed border-gray-300 pb-2 mb-2">
                        {data.logoBase64 && <img src={data.logoBase64} alt="" className="h-8 mx-auto mb-1 object-contain" />}
                        <p className="font-black text-gray-800 text-center" style={{ fontSize: 'inherit' }}>
                          {data.storeName || (t('store_name'))}
                        </p>
                        {data.phone && <p className="text-gray-500" style={{ fontSize: 'inherit' }}>{data.phone}</p>}
                        {data.address && <p className="text-gray-500" style={{ fontSize: 'inherit' }}>{data.address}</p>}
                      </div>
                      <div className="space-y-1 border-b border-dashed border-gray-300 pb-2 mb-2">
                        <div className="flex justify-between text-gray-700">
                          <span>{t('invoice')}</span>
                          <span>{data.invoicePrefix}-00001</span>
                        </div>
                        <div className="flex justify-between text-gray-500">
                          <span>{t('date_1')}</span>
                          <span>{new Date().toLocaleDateString('ar-SA')}</span>
                        </div>
                      </div>
                      <div className="space-y-0.5 border-b border-dashed border-gray-300 pb-2 mb-2">
                        <div className="flex justify-between text-gray-700">
                          <span>{t('sample_item')}</span>
                          <span>100.00</span>
                        </div>
                        <div className="flex justify-between text-gray-500">
                          <span>{isRtl ? `ضريبة ${data.taxRate}%` : `VAT ${data.taxRate}%`}</span>
                          <span>{(100 * data.taxRate / 100).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between font-black text-gray-900">
                          <span>{t('total')}</span>
                          <span>{(100 + 100 * data.taxRate / 100).toFixed(2)} {data.currency}</span>
                        </div>
                      </div>
                      <div className="flex justify-center my-1">
                        <div className="w-14 h-14 bg-gray-200 rounded flex items-center justify-center text-gray-400" style={{ fontSize: '8px' }}>QR</div>
                      </div>
                      <p className="text-center text-gray-400 text-center" style={{ fontSize: 'inherit' }}>
                        {t('thank_you_for_your_visit_1')}
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
                  {t('setup_complete')}
                </h2>
                <p className="text-slate-400 text-sm">
                  {t('the_system_has_been_configured_and_is_ready_to_use')}
                </p>
              </div>
              <div className="grid grid-cols-1 gap-2 text-sm text-right">
                {[
                  { label: t('company'), value: data.companyName, done: true },
                  { label: t('activity'), value: data.activity, done: true },
                  { label: t('branch'), value: data.branchName, done: true },
                  { label: t('owner'), value: data.ownerName, done: true },
                  { label: t('currency_1'), value: data.currency, done: true },
                  { label: t('paper'), value: data.paperSize, done: true },
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
                {t('enter_dashboard')}
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
                {t('back')}
              </button>
              <button
                onClick={step === 7 ? next : next}
                className="flex items-center gap-2 px-6 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition-all"
              >
                {step === 7
                  ? (t('finish_setup'))
                  : (t('next'))}
                {isRtl ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
