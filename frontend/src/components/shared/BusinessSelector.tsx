import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import type { BusinessType } from '../../context/AppContext';
import { 
  ChefHat, 
  Pill, 
  Shirt, 
  Ship, 
  Sparkles, 
  ArrowRight, 
  ArrowLeft, 
  Store, 
  Coins,
  CheckCircle2,
  Building2,
  Percent,
  Phone
} from 'lucide-react';

export const BusinessSelector: React.FC = () => {
  const { 
    setBusinessType, 
    language,
    setStoreName,
    setCurrency,
    setTaxPercentage,
    setVatNumber,
    setStorePhone,
    setStoreAddress
  } = useApp();

  const isRtl = language === 'ar';

  // Wizard state
  const [step, setStep] = useState<number>(1);
  
  // Form states
  const [selectedSector, setSelectedSector] = useState<BusinessType | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [businessScale, setBusinessScale] = useState('single'); // single, medium, large
  const [selectedCurrency, setSelectedCurrency] = useState('SAR');
  const [vat, setVat] = useState('300012345600003');
  const [taxPercent, setTaxPercent] = useState<number>(15);
  const [integrationNeeds, setIntegrationNeeds] = useState({
    scanner: true,
    printer: true,
    scale: false,
    ai: true
  });

  const sectors = [
    {
      id: 'restaurant' as BusinessType,
      title_ar: 'المطاعم والمقاهي',
      title_en: 'Restaurants & Cafés',
      desc_ar: 'إدارة الطاولات، التقسيم والدمج، شاشة المطبخ KDS، وتفاصيل الوجبات السريعة.',
      desc_en: 'Table layouts, splitting bills, Kitchen Display Screen (KDS), and custom modifiers.',
      icon: ChefHat,
      color: 'from-orange-500 to-amber-600 border-orange-500/20'
    },
    {
      id: 'pharmacy' as BusinessType,
      title_ar: 'الصيدليات والمراكز الطبية',
      title_en: 'Pharmacies & Medical Centers',
      desc_ar: 'تتبع الباتشات والتواريخ، البدائل العلمية للأدوية، وتنبيهات انتهاء الصلاحية.',
      desc_en: 'Batch tracking, drug scientific substitutions, expiry indicators, and prescription logs.',
      icon: Pill,
      color: 'from-blue-500 to-emerald-600 border-blue-500/20'
    },
    {
      id: 'retail' as BusinessType,
      title_ar: 'التجزئة ومحلات الملابس',
      title_en: 'Retail & Clothing Stores',
      desc_ar: 'إدارة مقاسات وألوان السلع، طباعة ملصقات الباركود، وإتمام مبيعات التجزئة السريعة.',
      desc_en: 'Inventory metrics by sizes and colors, custom barcode labels printing, and retail workflows.',
      icon: Shirt,
      color: 'from-purple-500 to-pink-600 border-purple-500/20'
    },
    {
      id: 'wholesale' as BusinessType,
      title_ar: 'الاستيراد والتصدير والجملة',
      title_en: 'Import, Export & Wholesale',
      desc_ar: 'تتبع شحنات الحاويات، حساب جمارك الموانئ، والتحويل متعدد العملات للطلبيات الضخمة.',
      desc_en: 'Container cargo shipping tracker, customs tariff calculations, and multi-currency registers.',
      icon: Ship,
      color: 'from-teal-500 to-emerald-600 border-teal-500/20'
    }
  ];

  const currencies = [
    { code: 'SAR', name_ar: 'ريال سعودي', name_en: 'Saudi Riyal' },
    { code: 'AED', name_ar: 'درهم إماراتي', name_en: 'UAE Dirham' },
    { code: 'KWD', name_ar: 'دينار كويتي', name_en: 'Kuwaiti Dinar' },
    { code: 'EGP', name_ar: 'جنيه مصري', name_en: 'Egyptian Pound' },
    { code: 'USD', name_ar: 'دولار أمريكي', name_en: 'US Dollar' },
    { code: 'EUR', name_ar: 'يورو', name_en: 'Euro' }
  ];

  const handleNext = () => {
    if (step === 1 && !selectedSector) return;
    setStep(prev => prev + 1);
  };

  const handleBack = () => {
    setStep(prev => prev - 1);
  };

  const handleFinish = () => {
    if (!selectedSector) return;
    
    // Save configuration to AppContext state
    if (name.trim()) setStoreName(name.trim());
    if (phone.trim()) setStorePhone(phone.trim());
    if (address.trim()) setStoreAddress(address.trim());
    
    setCurrency(selectedCurrency);
    setTaxPercentage(taxPercent);
    setVatNumber(vat.trim());
    
    // Activate the selected business type
    setBusinessType(selectedSector);
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-6 bg-[#090d16] text-white">
      <div className="max-w-3xl w-full space-y-6">
        
        {/* Top brand header */}
        <div className="text-center space-y-3">
          <img src="/logo.png" alt="smart POS Logo" className="h-36 mx-auto object-contain mb-4 filter drop-shadow-[0_0_20px_rgba(59,130,246,0.25)]" />
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-[10px] font-bold animate-pulse">
            <Sparkles className="h-3.5 w-3.5" />
            {isRtl ? 'إعداد وتهيئة نظام smart POS الذكي' : 'Setup smart POS Intelligent System'}
          </div>
          <h1 className="text-xl md:text-2xl font-extrabold tracking-tight font-sans">
            {isRtl ? 'تخصيص النظام لنشاطك التجاري' : 'Customize System for Your Business'}
          </h1>
          
          {/* Progress Bar Indicators */}
          <div className="flex items-center justify-center gap-2 pt-4 max-w-xs mx-auto">
            {[1, 2, 3, 4].map(s => (
              <div 
                key={s} 
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  s === step 
                    ? 'w-8 bg-blue-500' 
                    : s < step 
                      ? 'w-4 bg-emerald-500' 
                      : 'w-4 bg-slate-800'
                }`} 
              />
            ))}
          </div>
        </div>

        {/* Wizard Panel */}
        <div className="glass-card p-6 md:p-8 rounded-3xl border border-slate-800/80 bg-slate-900/40 shadow-2xl relative overflow-hidden min-h-[380px] flex flex-col justify-between">
          
          {/* STEP 1: Select Sector */}
          {step === 1 && (
            <div className="space-y-4 animate-fade-in">
              <div className="text-center space-y-1">
                <h2 className="text-lg font-bold text-slate-200">
                  {isRtl ? '1. ما هو مجال نشاطك التجاري؟' : '1. What is your business sector?'}
                </h2>
                <p className="text-xs text-slate-400">
                  {isRtl ? 'سنقوم بتهيئة واجهات البيع والمخازن فوراً لتناسب طبيعة السلع لديك.' : 'We will instantly adapt the sales & ERP forms to fit your catalog.'}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {sectors.map(sec => {
                  const Icon = sec.icon;
                  const isSelected = selectedSector === sec.id;
                  return (
                    <div
                      key={sec.id}
                      onClick={() => setSelectedSector(sec.id)}
                      className={`group relative rounded-xl border p-4 text-right cursor-pointer transition-all duration-300 flex items-start gap-3.5 h-28 ${
                        isSelected 
                          ? 'border-blue-500 bg-blue-600/10 shadow-lg shadow-blue-500/5' 
                          : 'border-slate-800 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-950/80'
                      }`}
                      style={{ direction: isRtl ? 'rtl' : 'ltr', textAlign: isRtl ? 'right' : 'left' }}
                    >
                      <div className={`p-2.5 rounded-lg bg-gradient-to-br ${sec.color} text-white shrink-0 mt-0.5`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="space-y-1 min-w-0">
                        <h3 className={`font-bold text-sm transition-colors ${isSelected ? 'text-blue-400' : 'text-slate-200'}`}>
                          {isRtl ? sec.title_ar : sec.title_en}
                        </h3>
                        <p className="text-[11px] text-slate-400 leading-normal line-clamp-2">
                          {isRtl ? sec.desc_ar : sec.desc_en}
                        </p>
                      </div>
                      {isSelected && (
                        <div className={`absolute top-2.5 ${isRtl ? 'left-3.5' : 'right-3.5'} text-blue-500 animate-pulse`}>
                          <CheckCircle2 className="h-4.5 w-4.5" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 2: Business Info & Scale */}
          {step === 2 && (
            <div className="space-y-4 animate-fade-in text-right" style={{ direction: isRtl ? 'rtl' : 'ltr' }}>
              <div className="text-center space-y-1">
                <h2 className="text-lg font-bold text-slate-200">
                  {isRtl ? '2. تفاصيل وحجم النشاط التجاري' : '2. Business Details & Scale'}
                </h2>
                <p className="text-xs text-slate-400">
                  {isRtl ? 'الرجاء إدخال المعلومات الأساسية للمنشأة لتضمينها في الفواتير.' : 'Please input the basic details to be printed on receipts.'}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 text-xs font-semibold text-slate-200">
                <div className="space-y-1">
                  <label className="flex items-center gap-1.5 text-slate-300 font-bold">
                    <Store className="h-3.5 w-3.5 text-blue-400" />
                    {isRtl ? 'اسم المنشأة / العلامة التجارية' : 'Store / Brand Name'}
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder={isRtl ? "مثال: بقالة النخبة، مطعم الضيافة" : "e.g. Elite Supermarket"}
                    className="w-full px-3 py-2 rounded-xl border border-slate-600 bg-slate-950 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-sans"
                  />
                </div>

                <div className="space-y-1">
                  <label className="flex items-center gap-1.5 text-slate-300 font-bold">
                    <Phone className="h-3.5 w-3.5 text-blue-400" />
                    {isRtl ? 'رقم الهاتف للتواصل' : 'Contact Phone Number'}
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="e.g. +966 50 123 4567"
                    className="w-full px-3 py-2 rounded-xl border border-slate-600 bg-slate-950 text-white placeholder-slate-400 text-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-sans"
                  />
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="flex items-center gap-1.5 text-slate-300 font-bold">
                    {isRtl ? 'عنوان المنشأة الرئيسي' : 'Main Store Address'}
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    placeholder={isRtl ? "مثال: طريق العليا، الرياض، المملكة العربية السعودية" : "e.g. Olaya St, Riyadh, KSA"}
                    className="w-full px-3 py-2 rounded-xl border border-slate-600 bg-slate-950 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-sans"
                  />
                </div>

                <div className="space-y-2 md:col-span-2 pt-2">
                  <label className="flex items-center gap-1.5 text-slate-400 mb-1">
                    <Building2 className="h-3.5 w-3.5 text-blue-400" />
                    {isRtl ? 'حجم ونطاق المنشأة' : 'Business Scale'}
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: 'single', label_ar: 'فرع واحد', label_en: 'Single Store' },
                      { id: 'medium', label_ar: '2 - 5 فروع', label_en: '2 - 5 Branches' },
                      { id: 'large', label_ar: 'سلسلة فروع كبرى', label_en: 'Enterprise chain' }
                    ].map(scale => (
                      <button
                        key={scale.id}
                        type="button"
                        onClick={() => setBusinessScale(scale.id)}
                        className={`py-2 px-3 rounded-xl border transition-all text-[11px] ${
                          businessScale === scale.id
                            ? 'border-blue-500 bg-blue-600/10 text-blue-400 font-bold'
                            : 'border-slate-850 bg-slate-950/30 text-slate-400 hover:bg-slate-950/60'
                        }`}
                      >
                        {isRtl ? scale.label_ar : scale.label_en}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Currency & Taxes */}
          {step === 3 && (
            <div className="space-y-4 animate-fade-in text-right" style={{ direction: isRtl ? 'rtl' : 'ltr' }}>
              <div className="text-center space-y-1">
                <h2 className="text-lg font-bold text-slate-200">
                  {isRtl ? '3. الإعدادات الضريبية والمالية' : '3. Financial & Tax Settings'}
                </h2>
                <p className="text-xs text-slate-400">
                  {isRtl ? 'تحديد عملة الكاشير الأساسية ونسبة ضريبة القيمة المضافة لحساب المبيعات.' : 'Choose the checkout currency and local VAT configurations.'}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 text-xs font-semibold text-slate-200">
                <div className="space-y-1">
                  <label className="flex items-center gap-1.5 text-slate-300 font-bold">
                    <Coins className="h-3.5 w-3.5 text-blue-400" />
                    {isRtl ? 'العملة الافتراضية' : 'Default Currency'}
                  </label>
                  <select
                    value={selectedCurrency}
                    onChange={e => setSelectedCurrency(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-600 bg-slate-950 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-sans"
                  >
                    {currencies.map(c => (
                      <option key={c.code} value={c.code} className="bg-slate-900 text-white">
                        {c.code} - {isRtl ? c.name_ar : c.name_en}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="flex items-center gap-1.5 text-slate-300 font-bold">
                    <Percent className="h-3.5 w-3.5 text-blue-400" />
                    {isRtl ? 'نسبة الضريبة (%)' : 'VAT Percentage (%)'}
                  </label>
                  <input
                    type="number"
                    value={taxPercent}
                    onChange={e => setTaxPercent(parseFloat(e.target.value) || 0)}
                    placeholder="15"
                    className="w-full px-3 py-2 rounded-xl border border-slate-600 bg-slate-950 text-white placeholder-slate-400 text-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-sans"
                  />
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="flex items-center gap-1.5 text-slate-300 font-bold">
                    {isRtl ? 'الرقم الضريبي للمنشأة' : 'VAT Number'}
                  </label>
                  <input
                    type="text"
                    value={vat}
                    onChange={e => setVat(e.target.value)}
                    placeholder="e.g. 300012345600003"
                    className="w-full px-3 py-2 rounded-xl border border-slate-600 bg-slate-950 text-white placeholder-slate-400 focus:outline-none text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-sans"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Features & Integrations */}
          {step === 4 && (
            <div className="space-y-4 animate-fade-in text-right" style={{ direction: isRtl ? 'rtl' : 'ltr' }}>
              <div className="text-center space-y-1">
                <h2 className="text-lg font-bold text-slate-200">
                  {isRtl ? '4. تخصيص ميزات ومعدات الكاشير' : '4. POS Features & Integrations'}
                </h2>
                <p className="text-xs text-slate-400">
                  {isRtl ? 'اختر الأدوات الإضافية التي ترغب في تفعيلها بمحاكي سطح المكتب.' : 'Toggle components you wish to enable in desktop peripherals emulation.'}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-xs font-semibold">
                {[
                  { id: 'scanner', label_ar: 'تفعيل مسح الباركود', label_en: 'Enable Barcode Scanner', desc_ar: 'يدعم محاكاة قراءة سريعة للسلع بالمسدس.', desc_en: 'Emulate laser gun to scan product inventory.' },
                  { id: 'printer', label_ar: 'طابعة الفواتير الحرارية', label_en: 'Thermal Receipt Printing', desc_ar: 'توليد ومعاينة إيصالات ورقية حرارية 80 مم.', desc_en: 'Generate standard 80mm thermal cashier receipts.' },
                  { id: 'scale', label_ar: 'ميزان السلع الإلكتروني', label_en: 'Electronic Weighing Scale', desc_ar: 'محاكاة وزن السلع الطازجة والخضروات.', desc_en: 'Emulate weight reading for fresh goods.' },
                  { id: 'ai', label_ar: 'محرك التحليلات التنبؤية بالذكاء الاصطناعي', label_en: 'AI Forecast & Analytics', desc_ar: 'التنبؤ التلقائي بمواعيد نفاد السلع وسحب المنتجات.', desc_en: 'Predict stockout days and auto-draft supplier orders.' }
                ].map(item => {
                  const val = integrationNeeds[item.id as keyof typeof integrationNeeds];
                  return (
                    <div
                      key={item.id}
                      onClick={() => setIntegrationNeeds(prev => ({ ...prev, [item.id]: !val }))}
                      className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 ${
                        val 
                          ? 'border-blue-500/40 bg-blue-600/5' 
                          : 'border-slate-800 bg-slate-950/20 hover:border-slate-750'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={val}
                        readOnly
                        className="mt-1 accent-blue-500 pointer-events-none"
                      />
                      <div className="space-y-0.5">
                        <h4 className={`font-bold ${val ? 'text-blue-400' : 'text-slate-200'}`}>
                          {isRtl ? item.label_ar : item.label_en}
                        </h4>
                        <p className="text-[10px] text-slate-500 leading-normal">
                          {isRtl ? item.desc_ar : item.desc_en}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Navigation Controls */}
          <div className="flex justify-between items-center pt-6 border-t border-slate-800/60 mt-6 gap-3">
            {step > 1 ? (
              <button
                type="button"
                onClick={handleBack}
                className="px-4 py-2 border border-slate-750 hover:bg-slate-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
              >
                {isRtl ? <ArrowRight className="h-3.5 w-3.5" /> : <ArrowLeft className="h-3.5 w-3.5" />}
                {isRtl ? 'السابق' : 'Back'}
              </button>
            ) : (
              <div />
            )}

            {step < 4 ? (
              <button
                type="button"
                onClick={handleNext}
                disabled={step === 1 && !selectedSector}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-blue-500/10"
              >
                {isRtl ? 'التالي' : 'Next'}
                {isRtl ? <ArrowLeft className="h-3.5 w-3.5" /> : <ArrowRight className="h-3.5 w-3.5" />}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinish}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-emerald-500/10 animate-pulse"
              >
                {isRtl ? 'إنهاء الإعداد وتفعيل النظام ➜' : 'Finish & Activate smart POS ➜'}
              </button>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
