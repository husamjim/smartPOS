import React, { useState } from 'react';
import { Info, Copy, Check, Award, ShieldCheck } from 'lucide-react';
import { AuditLogger } from '../../utils/auditLogger';
import { telemetry } from '../../utils/telemetry';

export const AboutSystem: React.FC = () => {
  const [copied, setCopied] = useState(false);

  const isRtl = document.documentElement.dir === 'rtl';

  const specs = {
    name: 'smart POS',
    version: 'v1.1.0',
    build: '20260709.1',
    date: '2026-07-09',
    database: 'IndexedDB (Dexie Transactions v5)',
    licenseType: isRtl ? 'ترخيص تجاري مدى الحياة' : 'Lifetime Commercial Enterprise License',
    licenseKey: 'SP-7839-8291-RC101',
    licenseStatus: isRtl ? 'نشط بالكامل وموثق' : 'Fully Activated & Verified',
    developer: 'smartPOS INC & Google DeepMind Team',
    copyright: `© ${new Date().getFullYear()} smart POS. ${isRtl ? 'جميع الحقوق محفوظة.' : 'All rights reserved.'}`
  };

  const libraries = [
    { name: 'Dexie.js', desc: 'Robust IndexedDB wrapper with transaction support' },
    { name: 'React', desc: 'Declarative component-based UI library' },
    { name: 'Vite', desc: 'Fast local building environment' },
    { name: 'Chart.js', desc: 'Interactive HTML5 responsive charts' },
    { name: 'TailwindCSS', desc: 'Utility-first presentation styles layout' },
    { name: 'SheetJS (xlsx)', desc: 'Client-side Excel parsing & mapping support' },
    { name: 'Lucide Icons', desc: 'Clean vectorized iconography framework' }
  ];

  const handleCopy = () => {
    const text = `
System Specifications:
----------------------
Name: ${specs.name}
Version: ${specs.version}
Build: ${specs.build}
Release Date: ${specs.date}
Database: ${specs.database}
License: ${specs.licenseType} (${specs.licenseStatus})
Developer: ${specs.developer}
Copyright: ${specs.copyright}
    `.trim();

    navigator.clipboard.writeText(text);
    setCopied(true);
    AuditLogger.log('CHANGE_SETTINGS', 'system', 'Copied system info specifications to clipboard', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 text-right font-sans" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Specs Panel */}
      <div className="glass-card p-6 rounded-3xl border border-slate-200/40 dark:border-slate-800/40 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">
          <div className="flex items-center gap-2 border-b pb-2">
            <Info className="h-5 w-5 text-indigo-500" />
            <h4 className="font-extrabold text-sm text-slate-850 dark:text-slate-200">{isRtl ? 'مواصفات وإصدار النظام' : 'System Specifications'}</h4>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs font-semibold">
            {[
              { label: isRtl ? 'اسم المنتج' : 'Product Name', val: specs.name },
              { label: isRtl ? 'الإصدار المعتمد' : 'Version', val: specs.version },
              { label: isRtl ? 'رقم البناء' : 'Build Number', val: specs.build },
              { label: isRtl ? 'تاريخ الإطلاق' : 'Release Date', val: specs.date },
              { label: isRtl ? 'محرك قاعدة البيانات' : 'Database engine', val: specs.database },
            ].map(spec => (
              <div key={spec.label} className="space-y-1">
                <span className="text-[10px] text-slate-400 block">{spec.label}</span>
                <span className="text-slate-800 dark:text-slate-250 font-bold font-mono">{spec.val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* License details */}
        <div className="p-5 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <h5 className="font-bold text-xs text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5 justify-start">
              <Award className="h-4 w-4" />
              {isRtl ? 'تفاصيل الترخيص التجاري' : 'Commercial License'}
            </h5>
            
            <div className="space-y-2 text-[11px] font-semibold text-slate-500">
              <div className="flex justify-between">
                <span>{isRtl ? 'نوع الترخيص:' : 'Type:'}</span>
                <span className="font-bold text-slate-700 dark:text-slate-200">{specs.licenseType}</span>
              </div>
              <div className="flex justify-between">
                <span>{isRtl ? 'المفتاح:' : 'Serial Key:'}</span>
                <span className="font-bold font-mono text-slate-700 dark:text-slate-200">{specs.licenseKey}</span>
              </div>
              <div className="flex justify-between">
                <span>{isRtl ? 'الحالة:' : 'Status:'}</span>
                <span className="font-bold text-emerald-500">{specs.licenseStatus}</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleCopy}
            className="w-full py-2 rounded-xl border border-indigo-500/20 bg-indigo-500/5 text-indigo-500 font-bold text-xs hover:bg-indigo-500/10 transition-all flex items-center justify-center gap-1.5"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? (isRtl ? 'تم النسخ!' : 'Copied!') : (isRtl ? 'نسخ مواصفات النظام' : 'Copy System Info')}
          </button>
        </div>
      </div>

      {/* active libraries list */}
      <div className="glass-card p-5 rounded-2xl border border-slate-200/40 dark:border-slate-800/40 space-y-4">
        <h4 className="font-bold text-xs text-slate-400 border-b pb-2 flex items-center gap-1.5 justify-start">
          <ShieldCheck className="h-4 w-4 text-indigo-500" />
          {isRtl ? 'المكتبات البرمجية مفتوحة المصدر' : 'Core libraries registry'}
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold">
          {libraries.map(lib => (
            <div key={lib.name} className="p-3 bg-slate-500/5 border border-slate-200/20 rounded-2xl space-y-1">
              <h5 className="font-extrabold text-slate-800 dark:text-slate-200 font-mono">{lib.name}</h5>
              <p className="text-[10px] text-slate-400 leading-relaxed">{lib.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Startup Profiling Report */}
      <div className="glass-card p-6 rounded-3xl border border-slate-200/40 dark:border-slate-800/40 space-y-4">
        <div className="flex items-center gap-2 border-b pb-2">
          <Info className="h-5 w-5 text-emerald-500" />
          <h4 className="font-extrabold text-sm text-slate-850 dark:text-slate-200">
            {isRtl ? 'تشخيصات سرعة الإقلاع (Startup Profile)' : 'Startup Speed Diagnostics'}
          </h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-semibold">
          <div className="p-4 rounded-2xl bg-slate-100/50 dark:bg-slate-900/30 border border-slate-200/30 dark:border-slate-800/30 space-y-2">
            <span className="text-[10px] text-slate-400 block">{isRtl ? 'إقلاع محرك Electron' : 'Electron Started'}</span>
            <span className="text-lg font-black font-mono text-blue-500">{telemetry.getTimeline().electronReady}ms</span>
            <p className="text-[9px] text-slate-450 leading-relaxed">
              {isRtl ? 'زمن تشغيل كود Main Process وتهيئة الملحقات.' : 'Main process boot and context initialization.'}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-100/50 dark:bg-slate-900/30 border border-slate-200/30 dark:border-slate-800/30 space-y-2">
            <span className="text-[10px] text-slate-400 block">{isRtl ? 'إنشاء النافذة الرسومية' : 'Window Creation'}</span>
            <span className="text-lg font-black font-mono text-cyan-500">{telemetry.getTimeline().windowCreation}ms</span>
            <p className="text-[9px] text-slate-450 leading-relaxed">
              {isRtl ? 'زمن تهيئة نافذة Chromium وفك حزمة الأصول.' : 'Chromium BrowserWindow instantiation.'}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-100/50 dark:bg-slate-900/30 border border-slate-200/30 dark:border-slate-800/30 space-y-2">
            <span className="text-[10px] text-slate-400 block">{isRtl ? 'تهيئة قاعدة البيانات' : 'Database Initialization'}</span>
            <span className="text-lg font-black font-mono text-emerald-500">{telemetry.getTimeline().dbInit}ms</span>
            <p className="text-[9px] text-slate-450 leading-relaxed">
              {isRtl ? 'زمن فتح قاعدة بيانات IndexedDB والتحقق من الهجرة.' : 'IndexedDB connection and migration check.'}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-100/50 dark:bg-slate-900/30 border border-slate-200/30 dark:border-slate-800/30 space-y-2">
            <span className="text-[10px] text-slate-400 block">{isRtl ? 'تحميل بيئة React' : 'React Bootstrap'}</span>
            <span className="text-lg font-black font-mono text-purple-500">{telemetry.getTimeline().reactLoad}ms</span>
            <p className="text-[9px] text-slate-450 leading-relaxed">
              {isRtl ? 'زمن فك تشغيل الكود المصدري وتجميع المكونات.' : 'Mounting virtual DOM and resolving assets.'}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-100/50 dark:bg-slate-900/30 border border-slate-200/30 dark:border-slate-800/30 space-y-2">
            <span className="text-[10px] text-slate-400 block">{isRtl ? 'رسم واجهة الدخول' : 'First Interactive'}</span>
            <span className="text-lg font-black font-mono text-indigo-500">{telemetry.getTimeline().loginRender}ms</span>
            <p className="text-[9px] text-slate-450 leading-relaxed">
              {isRtl ? 'زمن فك تشفير شاشة الدخول وتجهيز المدخلات.' : 'Drawing login inputs and styling layers.'}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-100/50 dark:bg-slate-900/30 border border-slate-200/30 dark:border-slate-800/30 space-y-2">
            <span className="text-[10px] text-slate-400 block">{isRtl ? 'تحميل لوحة التحكم المالي' : 'Dashboard Load'}</span>
            <span className="text-lg font-black font-mono text-amber-500">{isRtl ? 'في الخلفية' : 'Background'}</span>
            <p className="text-[9px] text-slate-450 leading-relaxed">
              {isRtl ? 'مؤجل بالكامل ليعمل في الخلفية (Lazy) دون تعطيل الإقلاع.' : 'Fully deferred to load lazily after first paint.'}
            </p>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-bold text-emerald-600 dark:text-emerald-400 flex justify-between items-center">
          <span>{isRtl ? '🚀 إجمالي زمن الإقلاع الحقيقي (Native Boot Time):' : '🚀 Total Native Boot Time:'}</span>
          <span className="font-mono text-sm font-black">{telemetry.getTimeline().totalBoot}ms</span>
        </div>
      </div>

      {/* Copyright */}
      <div className="text-center text-[10px] text-slate-400">
        <p>{specs.copyright}</p>
        <p className="mt-1">{isRtl ? 'مرخص بموجب اتفاقية استخدام smartPOS التجارية.' : 'Licensed under corporate smartPOS utilization agreements.'}</p>
      </div>
    </div>
  );
};
