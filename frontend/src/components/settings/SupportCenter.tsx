import { useTranslation } from 'react-i18next';
import React, { useState } from 'react';
import { HelpCircle, BookOpen, Video, PhoneCall, MessageSquare } from 'lucide-react';
import { AuditLogger } from '../../utils/auditLogger';

export const SupportCenter: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'faq' | 'guide' | 'videos' | 'contact' | 'ticket'>('faq');
  const [search, setSearch] = useState('');
  
  // Contacts configuration (could be updated in Settings and saved)
  const supportPhone = localStorage.getItem('pos_support_phone') || '+966 50 123 4567';
  const supportEmail = localStorage.getItem('pos_support_email') || 'support@smartpos.com';
  const supportWhatsapp = localStorage.getItem('pos_support_whatsapp') || '+966501234567';

  // Ticket Form
  const [ticketType, setTicketType] = useState<'bug' | 'feature'>('bug');
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketBody, setTicketBody] = useState('');
  const [ticketSuccess, setTicketSuccess] = useState(false);

  const isRtl = document.documentElement.dir === 'rtl';

  const faq = [
    {
      qAr: 'كيف يمكنني تهيئة الكاشير لأول مرة؟',
      qEn: 'How to configure POS for the first time?',
      aAr: 'عند فتح التطبيق لأول مرة بدون مستخدمين، سيظهر معالج الإعداد التلقائي لإنشاء أول حساب للمالك، ثم يمكنك اختيار الفروع والمستودعات من الإعدادات.',
      aEn: 'On first launch without users, the Setup Wizard appears. Walk through it to create the owner login, then add branches and warehouse depots in settings.'
    },
    {
      qAr: 'هل يحتاج النظام للاتصال بالإنترنت؟',
      qEn: 'Does the system require an active internet connection?',
      aAr: 'لا، يعمل النظام بشكل محلي بالكامل (Offline First) ويخزن البيانات على متصفحك أو جهازك عبر قاعدة بيانات Dexie/IndexedDB المشفرة.',
      aEn: 'No. The system is designed offline-first. All data, batches, and open invoices are written locally to your device storage via secure Dexie IndexedDB transactions.'
    },
    {
      qAr: 'كيف أقوم بأخذ نسخة احتياطية من مبيعاتي؟',
      qEn: 'How do I generate a database backup?',
      aAr: 'اذهب إلى الإعدادات ← النسخ الاحتياطي، واضغط على "تنزيل نسخة احتياطية فورية" لحفظ ملف قاعدة البيانات كملف JSON آمن ومحمي.',
      aEn: 'Navigate to Settings -> Backup Center. Click "Create & Download Backup Now" to compile and save your entire system dataset as a secure .json file.'
    },
    {
      qAr: 'كيف أقوم بربط طابعة الفواتير الحرارية؟',
      qEn: 'How to connect physical ESC/POS thermal printers?',
      aAr: 'اذهب إلى الإعدادات ← تعريف الملحقات، ثم اضغط على "توصيل طابعة USB الحرارية" ليقوم النظام بالبحث عن الأجهزة المتوافقة وتعريفها.',
      aEn: 'Go to Settings -> Hardware connection. Click "Connect USB Printer" to search, authorize, and sync matching physical hardware nodes.'
    }
  ];

  const handleTicketSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject.trim() || !ticketBody.trim()) return;

    // Save ticket locally for sync later
    const tickets = JSON.parse(localStorage.getItem('pos_support_tickets') || '[]');
    const newTicket = {
      id: Math.random().toString(36).substring(2, 9),
      type: ticketType,
      subject: ticketSubject,
      body: ticketBody,
      timestamp: new Date().toISOString(),
      status: 'pending'
    };
    tickets.push(newTicket);
    localStorage.setItem('pos_support_tickets', JSON.stringify(tickets));

    AuditLogger.log(
      ticketType === 'bug' ? 'CHANGE_SETTINGS' : 'CHANGE_SETTINGS',
      'support',
      `Submitted ticket [${ticketType.toUpperCase()}]: ${ticketSubject}`,
      'success'
    );

    setTicketSubject('');
    setTicketBody('');
    setTicketSuccess(true);
    setTimeout(() => setTicketSuccess(false), 3000);
  };

  const filteredFaq = faq.filter(item => {
    const q = isRtl ? item.qAr : item.qEn;
    const a = isRtl ? item.aAr : item.aEn;
    return q.toLowerCase().includes(search.toLowerCase()) || a.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="space-y-6 text-right font-sans" dir={t('ltr')}>
      {/* Sub Tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800 pb-3 overflow-x-auto">
        {[
          { id: 'faq', label: t('faq_accordion'), icon: HelpCircle },
          { id: 'guide', label: t('user_manual'), icon: BookOpen },
          { id: 'videos', label: t('video_tutorials'), icon: Video },
          { id: 'contact', label: t('contact_support'), icon: PhoneCall },
          { id: 'ticket', label: t('submit_ticket'), icon: MessageSquare },
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap border ${
                activeTab === tab.id 
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' 
                  : 'border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab: FAQ */}
      {activeTab === 'faq' && (
        <div className="space-y-4">
          <div className="relative">
            <input 
              type="text" 
              placeholder={t('search_faqs')}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full px-3 py-2 pr-8 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none text-xs"
            />
          </div>

          <div className="space-y-3">
            {filteredFaq.map((item, idx) => (
              <div key={idx} className="glass-card p-4 rounded-2xl border border-slate-200/40 dark:border-slate-800/40 space-y-2">
                <h4 className="font-extrabold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-2 justify-start">
                  <span className="w-5 h-5 rounded-lg bg-indigo-500/10 text-indigo-500 text-[10px] font-black flex items-center justify-center">Q</span>
                  {isRtl ? item.qAr : item.qEn}
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed pr-7">
                  {isRtl ? item.aAr : item.aEn}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Guide */}
      {activeTab === 'guide' && (
        <div className="glass-card p-5 rounded-2xl border border-slate-200/40 dark:border-slate-800/40 space-y-4 text-xs">
          <div className="space-y-3 leading-relaxed">
            <h4 className="font-bold text-sm text-slate-850 dark:text-slate-200 border-b pb-2">{t('quick_start_pos_documentation')}</h4>
            
            <div className="space-y-3 text-slate-500">
              <p><strong>1. {t('item_setup')}</strong> {isRtl ? 'اذهب لـ ERP ← المنتجات، ثم أضف الباركود والسعر والتكلفة وحد الطلب الأدنى.' : 'Add items via ERP Products tab specifying the barcode, price, unit type, and reorder levels.'}</p>
              <p><strong>2. {t('open_pos_session')}</strong> {t('start_the_pos_cashier_layout_and_input_the_initial_float_cash_drawer_value')}</p>
              <p><strong>3. {t('completing_sale')}</strong> {isRtl ? 'امسح الباركود، اختر طريقة الدفع (كاش، بطاقة، دفع مقسم)، ثم اطبع الفاتورة الحرارية.' : 'Scan barcode, select payment method (cash, card, split billing), and submit the receipt.'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Videos */}
      {activeTab === 'videos' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { title: t('store_setup_guide'), duration: '3:45' },
            { title: t('pos_checkout_walkthrough'), duration: '5:20' }
          ].map((vid, idx) => (
            <div key={idx} className="glass-card p-4 rounded-2xl border border-slate-200/40 dark:border-slate-800/40 space-y-3 flex flex-col justify-between">
              <div className="aspect-video bg-slate-900/10 dark:bg-slate-900 rounded-xl flex items-center justify-center relative overflow-hidden border border-slate-200/20">
                <span className="text-4xl">▶️</span>
                <span className="absolute bottom-2 left-2 bg-slate-950 text-white font-mono text-[9px] px-1.5 py-0.5 rounded font-black">{vid.duration}</span>
              </div>
              <div>
                <h4 className="font-bold text-xs text-slate-800 dark:text-slate-250">{vid.title}</h4>
                <p className="text-[10px] text-slate-400 mt-1">{t('detailed_video_tutorial_walk_through')}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab: Contact */}
      {activeTab === 'contact' && (
        <div className="glass-card p-5 rounded-2xl border border-slate-200/40 dark:border-slate-800/40 space-y-4 text-xs font-semibold">
          <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 border-b pb-2">{t('enterprise_support_channels')}</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/15 space-y-1">
              <span className="text-2xl">☎️</span>
              <p className="text-slate-400 block text-[10px]">{t('direct_phone')}</p>
              <p className="text-slate-800 dark:text-slate-250 font-mono">{supportPhone}</p>
            </div>
            <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/15 space-y-1">
              <span className="text-2xl">✉️</span>
              <p className="text-slate-400 block text-[10px]">{t('email_address')}</p>
              <p className="text-slate-800 dark:text-slate-250 font-mono">{supportEmail}</p>
            </div>
            <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/15 space-y-1">
              <span className="text-2xl">💬</span>
              <p className="text-slate-400 block text-[10px]">{t('whatsapp_chat')}</p>
              <a 
                href={`https://wa.me/${supportWhatsapp.replace(/\+/g, '').replace(/\s/g, '')}`} 
                target="_blank" 
                rel="noreferrer"
                className="text-indigo-500 hover:underline font-mono"
              >
                {supportWhatsapp}
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Ticket Form */}
      {activeTab === 'ticket' && (
        <form onSubmit={handleTicketSubmit} className="glass-card p-5 rounded-2xl border border-slate-200/40 dark:border-slate-800/40 space-y-4 text-xs">
          <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 border-b pb-2">{t('submit_technical_ticket_or_feature_idea')}</h4>
          
          {ticketSuccess && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-center rounded-xl font-bold">
              {t('ticket_submitted_successfully')}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-slate-400 block mb-1 font-bold">{t('ticket_type')}</label>
              <select 
                value={ticketType}
                onChange={e => setTicketType(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none"
              >
                <option value="bug">{t('report_technical_issue')}</option>
                <option value="feature">{t('suggest_product_feature')}</option>
              </select>
            </div>

            <div>
              <label className="text-slate-400 block mb-1 font-bold">{t('subject')}</label>
              <input 
                type="text"
                required
                placeholder={t('brief_subject_summary')}
                value={ticketSubject}
                onChange={e => setTicketSubject(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none text-slate-800 dark:text-slate-200"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-slate-400 block mb-1 font-bold">{t('explanation_details')}</label>
              <textarea 
                rows={4}
                required
                placeholder={t('detail_the_issue_sequence_or_concept_idea')}
                value={ticketBody}
                onChange={e => setTicketBody(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 focus:outline-none text-slate-800 dark:text-slate-200 resize-none"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all shadow-md"
          >
            {t('submit_ticket_1')}
          </button>
        </form>
      )}
    </div>
  );
};
