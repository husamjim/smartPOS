import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
      defaultLang: 'en',
      currency: 'USD',
      dateFormat: 'YYYY-MM-DD',
      timeFormat: '12h',
      defaultFont: 'Inter'
    };
  });

  const [savedMsg, setSavedMsg] = useState('');

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
    localStorage.setItem('pos_store_name', 'smart POS');
    localStorage.setItem('theme_font', config.defaultFont);

    AuditLogger.log('CHANGE_SETTINGS', 'brand', 'Updated branding settings and custom styles', 'success');

    setSavedMsg(t('theme_updated_and_saved'));
    setTimeout(() => setSavedMsg(''), 3000);
  };

  return (
    <div className="space-y-6 text-right font-sans" dir={t('ltr')}>
      {/* Brand Identity */}
      <div className="glass-card p-5 rounded-2xl border border-slate-200/40 dark:border-slate-800/40 space-y-4">
        <h4 className="font-bold text-xs text-indigo-500 uppercase tracking-wider flex items-center gap-1.5 justify-start">
          <Type className="h-4 w-4" />
          {t('company_system_names')}
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold">
          <div>
            <label className="text-slate-400 block mb-1.5">{t('system_name')}</label>
            <input 
              type="text" 
              value="smart POS"
              disabled
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 text-slate-500 cursor-not-allowed focus:outline-none" 
            />
          </div>
          <div>
            <label className="text-slate-400 block mb-1.5">{t('company_merchant_name')}</label>
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
          {t('system_theme_colors_overrides')}
        </h4>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-xs font-semibold">
          {[
            { label: t('primary_color'), key: 'colorPrimary' },
            { label: t('buttons_color'), key: 'colorButton' },
            { label: t('sidebar_bg'), key: 'colorSidebar' },
            { label: t('header_bg'), key: 'colorHeader' },
            { label: t('invoice_accent'), key: 'colorInvoice' },
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
          {t('logo_upload_registry')}
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-semibold">
          {[
            { label: t('sidebar_main_logo'), key: 'logoSystem', ref: logoSysRef },
            { label: t('receipt_invoice_logo'), key: 'logoInvoice', ref: logoInvRef },
            { label: t('login_screen_logo'), key: 'logoLogin', ref: logoLogRef },
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
                {t('choose_logo')}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Localization Settings */}
      <div className="glass-card p-5 rounded-2xl border border-slate-200/40 dark:border-slate-800/40 space-y-4">
        <h4 className="font-bold text-xs text-indigo-500 uppercase tracking-wider flex items-center gap-1.5 justify-start">
          <Globe className="h-4 w-4" />
          {t('regional_settings_configuration')}
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold">
          <div>
            <label className="text-slate-400 block mb-1.5">{t('system_default_font')}</label>
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
            <label className="text-slate-400 block mb-1.5">{t('base_currency_symbol')}</label>
            <input 
              type="text" 
              value={config.currency}
              onChange={e => setConfig(prev => ({ ...prev, currency: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none font-mono" 
            />
          </div>

          <div>
            <label className="text-slate-400 block mb-1.5">{t('date_format')}</label>
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
            <label className="text-slate-400 block mb-1.5">{t('time_format')}</label>
            <select 
              value={config.timeFormat}
              onChange={e => setConfig(prev => ({ ...prev, timeFormat: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none"
            >
              <option value="12h">{t('12_hour_ampm')}</option>
              <option value="24h">{t('24_hour_clock')}</option>
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
        {t('save_apply_branding_styles')}
      </button>
    </div>
  );
};
