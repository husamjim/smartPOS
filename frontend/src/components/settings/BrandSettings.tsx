import React, { useState, useRef } from 'react';
import { Palette, Image, Type, Globe } from 'lucide-react';
import { AuditLogger } from '../../utils/auditLogger';

export interface BrandConfig {
  systemName: string;
  companyName: string;
  logoSystem: string;
  logoInvoice: string;
  logoLogin: string;
  colorPrimary: string;
  colorButton: string;
  colorSidebar: string;
  colorHeader: string;
  colorInvoice: string;
  defaultLang: string;
  currency: string;
  dateFormat: string;
  timeFormat: string;
  defaultFont: string;
}

export const BrandSettings: React.FC = () => {
  const [config, setConfig] = useState<BrandConfig>(() => {
    try {
      const saved = localStorage.getItem('pos_brand_config');
      if (saved) return JSON.parse(saved);
    } catch { /* ignore */ }
    return {
      systemName: 'smart POS',
      companyName: 'smart POS INC',
      logoSystem: '',
      logoInvoice: '',
      logoLogin: '',
      colorPrimary: '#3b82f6',
      colorButton: '#2563eb',
      colorSidebar: '#ffffff',
      colorHeader: '#ffffff',
      colorInvoice: '#3b82f6',
      defaultLang: 'ar',
      currency: 'SAR',
      dateFormat: 'YYYY-MM-DD',
      timeFormat: '12h',
      defaultFont: 'Inter'
    };
  });

  const [savedMsg, setSavedMsg] = useState('');

  const isRtl = document.documentElement.dir === 'rtl';

  const logoSysRef = useRef<HTMLInputElement>(null);
  const logoInvRef = useRef<HTMLInputElement>(null);
  const logoLogRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>, key: 'logoSystem' | 'logoInvoice' | 'logoLogin') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = ev => {
      if (ev.target?.result) {
        setConfig(prev => ({ ...prev, [key]: ev.target!.result as string }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    localStorage.setItem('pos_brand_config', JSON.stringify(config));
    
    // Inject dynamic CSS variable values onto DocumentElement
    const root = document.documentElement;
    root.style.setProperty('--pos-primary', config.colorPrimary);
    root.style.setProperty('--pos-btn-bg', config.colorButton);
    root.style.setProperty('--pos-sidebar-bg', config.colorSidebar);
    root.style.setProperty('--pos-header-bg', config.colorHeader);
    root.style.setProperty('--pos-inv-color', config.colorInvoice);
    root.style.setProperty('--pos-font-family', config.defaultFont);

    // Sync other values that are context-linked
    localStorage.setItem('pos_store_currency', config.currency);
    localStorage.setItem('pos_store_name', config.systemName);
    localStorage.setItem('theme_font', config.defaultFont);

    AuditLogger.log('CHANGE_SETTINGS', 'brand', 'Updated branding settings and custom styles', 'success');

    setSavedMsg(isRtl ? '✓ تم الحفظ وتطبيق السمات الحيوية!' : '✓ Theme updated and saved!');
    setTimeout(() => setSavedMsg(''), 3000);
  };

  return (
    <div className="space-y-6 text-right font-sans" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Brand Identity */}
      <div className="glass-card p-5 rounded-2xl border border-slate-200/40 dark:border-slate-800/40 space-y-4">
        <h4 className="font-bold text-xs text-indigo-500 uppercase tracking-wider flex items-center gap-1.5 justify-start">
          <Type className="h-4 w-4" />
          {isRtl ? 'اسم النظام والهوية التجارية' : 'Company & System Names'}
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold">
          <div>
            <label className="text-slate-400 block mb-1.5">{isRtl ? 'اسم النظام' : 'System Name'}</label>
            <input 
              type="text" 
              value={config.systemName}
              onChange={e => setConfig(prev => ({ ...prev, systemName: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none" 
            />
          </div>
          <div>
            <label className="text-slate-400 block mb-1.5">{isRtl ? 'اسم الشركة المالكة' : 'Company / Merchant Name'}</label>
            <input 
              type="text" 
              value={config.companyName}
              onChange={e => setConfig(prev => ({ ...prev, companyName: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none" 
            />
          </div>
        </div>
      </div>

      {/* Colors Override */}
      <div className="glass-card p-5 rounded-2xl border border-slate-200/40 dark:border-slate-800/40 space-y-4">
        <h4 className="font-bold text-xs text-indigo-500 uppercase tracking-wider flex items-center gap-1.5 justify-start">
          <Palette className="h-4 w-4" />
          {isRtl ? 'ألوان الواجهات وحزمة السمات' : 'System theme colors overrides'}
        </h4>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-xs font-semibold">
          {[
            { label: isRtl ? 'اللون الأساسي' : 'Primary color', key: 'colorPrimary' },
            { label: isRtl ? 'لون الأزرار' : 'Buttons color', key: 'colorButton' },
            { label: isRtl ? 'خلفية القائمة' : 'Sidebar BG', key: 'colorSidebar' },
            { label: isRtl ? 'خلفية الهيدر' : 'Header BG', key: 'colorHeader' },
            { label: isRtl ? 'لون الفواتير' : 'Invoice accent', key: 'colorInvoice' },
          ].map(color => (
            <div key={color.key} className="flex flex-col items-center gap-1.5 bg-slate-500/5 p-3 rounded-2xl border border-slate-200/20">
              <label className="text-[10px] text-slate-400 block">{color.label}</label>
              <input 
                type="color" 
                value={(config as any)[color.key]} 
                onChange={e => setConfig(prev => ({ ...prev, [color.key]: e.target.value }))}
                className="w-10 h-10 rounded-lg cursor-pointer border border-slate-200/50 dark:border-slate-700" 
              />
              <span className="text-[9px] font-mono text-slate-400">{ (config as any)[color.key] }</span>
            </div>
          ))}
        </div>
      </div>

      {/* Logos Upload */}
      <div className="glass-card p-5 rounded-2xl border border-slate-200/40 dark:border-slate-800/40 space-y-4">
        <h4 className="font-bold text-xs text-indigo-500 uppercase tracking-wider flex items-center gap-1.5 justify-start">
          <Image className="h-4 w-4" />
          {isRtl ? 'شعارات الواجهات والمطبوعات' : 'Logo upload registry'}
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-semibold">
          {[
            { label: isRtl ? 'شعار النظام الجانبي' : 'Sidebar main logo', key: 'logoSystem', ref: logoSysRef },
            { label: isRtl ? 'شعار الفواتير الحرارية' : 'Receipt invoice logo', key: 'logoInvoice', ref: logoInvRef },
            { label: isRtl ? 'شعار شاشة تسجيل الدخول' : 'Login screen logo', key: 'logoLogin', ref: logoLogRef },
          ].map(logo => (
            <div key={logo.key} className="flex flex-col items-center p-4 bg-slate-500/5 border border-slate-200/20 rounded-2xl gap-3">
              <span className="text-[10px] text-slate-400 font-bold">{logo.label}</span>
              <div className="w-16 h-16 rounded-xl border border-dashed border-slate-350 dark:border-slate-700 flex items-center justify-center overflow-hidden bg-white/50 dark:bg-slate-900/50">
                { (config as any)[logo.key] ? (
                  <img src={(config as any)[logo.key]} className="w-full h-full object-contain" alt="preview" />
                ) : (
                  <span className="text-xl">🏪</span>
                )}
              </div>
              <input type="file" ref={logo.ref} accept="image/*" className="hidden" onChange={e => handleLogoUpload(e, logo.key as any)} />
              <button 
                type="button"
                onClick={() => logo.ref.current?.click()}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[10px] font-bold"
              >
                {isRtl ? 'رفع الشعار' : 'Choose logo'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Localization Settings */}
      <div className="glass-card p-5 rounded-2xl border border-slate-200/40 dark:border-slate-800/40 space-y-4">
        <h4 className="font-bold text-xs text-indigo-500 uppercase tracking-wider flex items-center gap-1.5 justify-start">
          <Globe className="h-4 w-4" />
          {isRtl ? 'اللغة والعملة وتنسيق المطبوعات' : 'Regional settings configuration'}
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold">
          <div>
            <label className="text-slate-400 block mb-1.5">{isRtl ? 'الخط الافتراضي للنظام' : 'System Default Font'}</label>
            <select 
              value={config.defaultFont}
              onChange={e => setConfig(prev => ({ ...prev, defaultFont: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none"
            >
              <option value="Inter">Inter (Classic clean)</option>
              <option value="Cairo">Cairo (Modern Arabic)</option>
              <option value="Tajawal">Tajawal (Elegant Arabic)</option>
              <option value="Roboto">Roboto (Technical Sans)</option>
            </select>
          </div>
          
          <div>
            <label className="text-slate-400 block mb-1.5">{isRtl ? 'العملة الافتراضية للبيع' : 'Base Currency Symbol'}</label>
            <input 
              type="text" 
              value={config.currency}
              onChange={e => setConfig(prev => ({ ...prev, currency: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none font-mono" 
            />
          </div>

          <div>
            <label className="text-slate-400 block mb-1.5">{isRtl ? 'تنسيق التاريخ' : 'Date Format'}</label>
            <select 
              value={config.dateFormat}
              onChange={e => setConfig(prev => ({ ...prev, dateFormat: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none font-mono"
            >
              <option value="YYYY-MM-DD">YYYY-MM-DD (e.g. 2026-07-09)</option>
              <option value="DD/MM/YYYY">DD/MM/YYYY (e.g. 09/07/2026)</option>
              <option value="MM-DD-YYYY">MM-DD-YYYY (e.g. 07-09-2026)</option>
            </select>
          </div>

          <div>
            <label className="text-slate-400 block mb-1.5">{isRtl ? 'تنسيق الوقت' : 'Time Format'}</label>
            <select 
              value={config.timeFormat}
              onChange={e => setConfig(prev => ({ ...prev, timeFormat: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none"
            >
              <option value="12h">{isRtl ? '12 ساعة (ص/م)' : '12-Hour (AM/PM)'}</option>
              <option value="24h">{isRtl ? '24 ساعة' : '24-Hour clock'}</option>
            </select>
          </div>
        </div>
      </div>

      {savedMsg && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-center rounded-xl font-bold text-xs">
          {savedMsg}
        </div>
      )}

      <button
        onClick={handleSave}
        className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-all shadow-md"
      >
        {isRtl ? '💾 حفظ وتطبيق سمات الهوية التجارية' : '💾 Save & Apply Branding Styles'}
      </button>
    </div>
  );
};
