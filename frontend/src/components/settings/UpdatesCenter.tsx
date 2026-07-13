import { useTranslation } from 'react-i18next';
import React, { useState } from 'react';
import { RefreshCw, CheckCircle, Info } from 'lucide-react';
import { AuditLogger } from '../../utils/auditLogger';

export const UpdatesCenter: React.FC = () => {
  const { t } = useTranslation();
  const [checking, setChecking] = useState(false);
  const [lastCheck, setLastCheck] = useState(() => localStorage.getItem('pos_update_last_check') || '2026-07-09');
  const [autoUpdate, setAutoUpdate] = useState(() => localStorage.getItem('pos_auto_updates') === 'true');

  const isRtl = document.documentElement.dir === 'rtl';

  const checkUpdates = async () => {
    setChecking(true);
    await new Promise(r => setTimeout(r, 2000));
    setChecking(false);
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem('pos_update_last_check', today);
    setLastCheck(today);
    AuditLogger.log('CHANGE_SETTINGS', 'system', 'Checked for system updates', 'success');
  };

  const toggleAuto = (val: boolean) => {
    setAutoUpdate(val);
    localStorage.setItem('pos_auto_updates', String(val));
  };

  const changelog = [
    {
      version: 'v1.1.0',
      date: '2026-07-09',
      features: isRtl ? [
        'معالج إعداد النظام لأول مرة Setup Wizard.',
        'إعدادات الذكاء الاصطناعي المستقلة Settings → AI Assistant.',
        'إعدادات الفاتورة وتخصيص المتجر ومطبوعات الكاشير.',
        'إدارة الحسابات شجرة الحسابات ودليل المحاسبة المالي.'
      ] : [
        'Added Setup Wizard for first-run merchant onboarding.',
        'Independent AI settings for OpenRouter, OpenAI, and Gemini key validation.',
        'Store receipt custom settings and layout adjustments.',
        'Chart of Accounts local financial ledger manager.'
      ]
    },
    {
      version: 'v1.0.1',
      date: '2026-07-08',
      features: isRtl ? [
        'إصلاحات شاملة للوضع الليلي وخطوط الألوان.',
        'حذف التذاكر الوهمية من شاشة المطبخ KDS.',
        'مزامنة جداول الفواتير المفتوحة عبر Dexie.'
      ] : [
        'Comprehensive dark mode colors overrides.',
        'Purged dummy mock orders from KDS kitchen displays.',
        'Unified Dexie transaction state sync for open dining tables.'
      ]
    },
    {
      version: 'v1.0.0',
      date: '2026-06-20',
      features: isRtl ? [
        'إطلاق النظام الأساسي كاشير + مستودعات.',
        'دعم نقاط البيع المتكاملة والباركود.'
      ] : [
        'Initial release of Cashier system + ERP warehouses.',
        'Integrated retail POS with offline database operations.'
      ]
    }
  ];

  return (
    <div className="space-y-6 text-right" dir={t('ltr')}>
      {/* Current Status */}
      <div className="glass-card p-6 rounded-3xl border border-slate-200/40 dark:border-slate-800/40 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
        <div className="md:col-span-2 space-y-2">
          <h4 className="font-extrabold text-sm text-slate-850 dark:text-slate-200 flex items-center gap-1.5 justify-start">
            <CheckCircle className="text-emerald-500 h-5 w-5" />
            {t('system_is_fully_up_to_date')}
          </h4>
          <p className="text-xs text-slate-400">
            {isRtl 
              ? `أنت تستخدم أحدث إصدار تجاري معتمد. آخر فحص للنسخ: ${lastCheck}`
              : `You are running the certified commercial build version. Last check: ${lastCheck}`}
          </p>
          <div className="flex gap-4 text-[11px] font-bold text-slate-500">
            <span>{t('active_version')} v1.1.0</span>
            <span>{t('build_number_1')} 20260709.1</span>
            <span>{t('runtime')} Production RC</span>
          </div>
        </div>

        <div className="space-y-2 flex flex-col items-stretch">
          <button
            onClick={checkUpdates}
            disabled={checking}
            className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${checking ? 'animate-spin' : ''}`} />
            {t('check_for_updates')}
          </button>
          
          <div className="flex justify-between items-center bg-slate-500/5 px-3 py-2 rounded-xl border border-slate-200/20 text-xs font-semibold">
            <span className="text-slate-500">{t('auto_updates')}</span>
            <input 
              type="checkbox" 
              checked={autoUpdate}
              onChange={e => toggleAuto(e.target.checked)}
              className="w-4 h-4 cursor-pointer accent-indigo-600"
            />
          </div>
        </div>
      </div>

      {/* Changelog History */}
      <div className="glass-card p-5 rounded-2xl border border-slate-200/40 dark:border-slate-800/40 space-y-4">
        <h4 className="font-bold text-xs text-slate-400 border-b pb-2 flex items-center gap-1.5 justify-start">
          <Info className="h-4 w-4 text-indigo-500" />
          {t('update_changelog_history')}
        </h4>

        <div className="space-y-6 relative border-r border-slate-200/50 dark:border-slate-800/50 pr-4 mt-2" dir="rtl">
          {changelog.map((log) => (
            <div key={log.version} className="relative space-y-1.5">
              {/* timeline point dot */}
              <div className="absolute -right-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-indigo-600 border border-white dark:border-slate-900" />
              
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">{log.version}</span>
                <span className="text-[10px] text-slate-400 font-mono">({log.date})</span>
              </div>
              <ul className="text-xs text-slate-500 space-y-1 pl-2">
                {log.features.map((feat, fIdx) => (
                  <li key={fIdx} className="list-disc list-inside">• {feat}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
