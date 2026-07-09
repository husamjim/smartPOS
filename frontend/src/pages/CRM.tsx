import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, UserPlus, Gift, MessageSquare, Send, Mail } from 'lucide-react';
import { db } from '../db/localDb';
import type { LocalCustomer } from '../db/localDb';

interface CommLog {
  id: string;
  type: 'sms' | 'email';
  message: string;
  date: string;
}

export const CRM: React.FC = () => {
  const { t } = useTranslation();
  const [customers, setCustomers] = useState<LocalCustomer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCust, setSelectedCust] = useState<LocalCustomer | null>(null);
  const [purchaseHistory, setPurchaseHistory] = useState<any[]>([]);

  // Client-side pagination states for native performance
  const [customersPage, setCustomersPage] = useState(1);
  const customersPerPage = 10;

  // Modals / Communication forms
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustEmail, setNewCustEmail] = useState('');
  const [newCustNotes, setNewCustNotes] = useState('');

  const [commType, setCommType] = useState<'sms' | 'email'>('sms');
  const [commMsg, setCommMsg] = useState('');
  const [commLogs, setCommLogs] = useState<Record<string, CommLog[]>>({
    'c_1': [
      { id: '1', type: 'sms', message: 'مرحباً أحمد، كود الخصم الجديد الخاص بك هو SAVE10 للحصول على 10% خصم.', date: '2026-06-15T12:00:00.000Z' }
    ]
  });

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    setCustomersPage(1);
  }, [searchQuery]);

  const loadCustomers = async () => {
    const data = await db.customers.toArray();
    setCustomers(data);
    if (data.length > 0 && !selectedCust) {
      handleSelectCustomer(data[0]);
    }
  };

  const handleSelectCustomer = async (cust: LocalCustomer) => {
    setSelectedCust(cust);
    // Fetch purchase history from orders table
    const orders = await db.orders.where('customer_id').equals(cust.id).toArray();
    setPurchaseHistory(orders);
  };

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName || !newCustPhone) return;

    const id = 'c_' + Math.random().toString(36).substr(2, 9);
    const newCust: LocalCustomer = {
      id,
      name: newCustName,
      phone: newCustPhone,
      email: newCustEmail || undefined,
      points: 0,
      tier: 'silver',
      notes: newCustNotes || undefined
    };

    await db.customers.add(newCust);
    setShowAddModal(false);
    setNewCustName('');
    setNewCustPhone('');
    setNewCustEmail('');
    setNewCustNotes('');
    
    await loadCustomers();
    handleSelectCustomer(newCust);
  };

  const handleSendCommunication = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCust || !commMsg.trim()) return;

    const log: CommLog = {
      id: Math.random().toString(),
      type: commType,
      message: commMsg,
      date: new Date().toISOString()
    };

    setCommLogs(prev => ({
      ...prev,
      [selectedCust.id]: [log, ...(prev[selectedCust.id] || [])]
    }));
    setCommMsg('');
    alert(commType === 'sms' ? 'تم إرسال الرسالة القصيرة SMS بنجاح (محاكاة)' : 'تم إرسال البريد الإلكتروني بنجاح (محاكاة)');
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone.includes(searchQuery)
  );

  const totalCustomersPages = Math.max(1, Math.ceil(filteredCustomers.length / customersPerPage));
  const paginatedCustomers = filteredCustomers.slice((customersPage - 1) * customersPerPage, customersPage * customersPerPage);

  const isRtl = document.documentElement.dir === 'rtl';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full animate-fade-in">
      {/* Customers List Column */}
      <div className="lg:col-span-2 flex flex-col space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold font-sans">{isRtl ? 'إدارة علاقات العملاء CRM' : 'Customer Relationship (CRM)'}</h2>
            <p className="text-xs text-slate-500">تتبع مشتريات العملاء، قسائم الخصم، ونقاط الولاء.</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
          >
            <UserPlus className="h-4 w-4" />
            {isRtl ? 'إضافة عميل جديد' : 'New Customer'}
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={t('search_placeholder')}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
        </div>

        {/* Customer Directory Table */}
        <div className="glass-card flex-1 rounded-2xl overflow-hidden shadow-sm border border-slate-200/50 dark:border-slate-800/50">
          <div className="overflow-y-auto max-h-[460px]">
            <table className="w-full text-sm text-right">
              <thead className="sticky top-0 bg-slate-100/80 dark:bg-slate-900/80 backdrop-blur-md text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3 py-3">{isRtl ? 'الاسم' : 'Name'}</th>
                  <th className="p-3">{isRtl ? 'الهاتف' : 'Phone'}</th>
                  <th className="p-3">{isRtl ? 'النقاط' : 'Loyalty Points'}</th>
                  <th className="p-3">{isRtl ? 'الفئة' : 'Tier'}</th>
                </tr>
              </thead>
              <tbody>
                {paginatedCustomers.map(c => (
                  <tr
                    key={c.id}
                    onClick={() => handleSelectCustomer(c)}
                    className={`border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50/20 cursor-pointer transition-all ${selectedCust?.id === c.id ? 'bg-blue-500/10 hover:bg-blue-500/15' : ''}`}
                  >
                    <td className="p-3 py-3.5 font-semibold">{c.name}</td>
                    <td className="p-3 text-slate-500">{c.phone}</td>
                    <td className="p-3 font-semibold text-indigo-500">{c.points} {isRtl ? 'نقطة' : 'pts'}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        c.tier === 'platinum' ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400' :
                        c.tier === 'gold' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' :
                        'bg-slate-500/10 text-slate-600 dark:text-slate-400'
                      }`}>
                        {c.tier.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Client-side pagination controls */}
          {totalCustomersPages > 1 && (
            <div className="flex justify-between items-center px-4 py-3 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 text-xs select-none">
              <button
                onClick={() => setCustomersPage(prev => Math.max(1, prev - 1))}
                disabled={customersPage === 1}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all font-bold disabled:opacity-40"
              >
                {isRtl ? 'السابق' : 'Previous'}
              </button>
              <span className="font-bold text-slate-500">
                {isRtl ? `الصفحة ${customersPage} من ${totalCustomersPages}` : `Page ${customersPage} of ${totalCustomersPages}`}
              </span>
              <button
                onClick={() => setCustomersPage(prev => Math.min(totalCustomersPages, prev + 1))}
                disabled={customersPage === totalCustomersPages}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all font-bold disabled:opacity-40"
              >
                {isRtl ? 'التالي' : 'Next'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Selected Customer Details & Communications Panel */}
      <div className="flex flex-col space-y-4">
        {selectedCust ? (
          <>
            {/* Customer profile summary */}
            <div className="glass-card p-5 rounded-2xl shadow-sm space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-bold text-lg">
                  {selectedCust.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-base">{selectedCust.name}</h3>
                  <p className="text-xs text-slate-400">{selectedCust.phone} | {selectedCust.email || 'No Email'}</p>
                </div>
              </div>

              {/* Loyalty Tier Gauge */}
              <div className="p-4 rounded-xl bg-slate-100/50 dark:bg-slate-800/40 border border-slate-200/40 dark:border-slate-700/40 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-500">{isRtl ? 'درجة ولاء العميل' : 'Loyalty Status'}</span>
                  <span className="font-bold text-amber-500 flex items-center gap-1">
                    <Gift className="h-3.5 w-3.5" />
                    {selectedCust.tier.toUpperCase()}
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-amber-500 h-full transition-all" 
                    style={{ width: `${Math.min(100, (selectedCust.points / 400) * 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[9px] text-slate-400">
                  <span>{selectedCust.points} {isRtl ? 'نقطة حالية' : 'pts'}</span>
                  <span>{isRtl ? 'المستوى القادم: 400 نقطة' : 'Next: 400 pts'}</span>
                </div>
              </div>

              {/* Purchase History list */}
              <div className="space-y-2 pt-2 border-t border-slate-200/40 dark:border-slate-700/40">
                <span className="text-[10px] font-bold text-slate-500 block">🛍️ {isRtl ? 'سجل مشتريات العميل:' : 'Order Purchase History:'}</span>
                {purchaseHistory.length === 0 ? (
                  <div className="text-[10px] text-slate-400 text-center py-2 bg-slate-100/30 dark:bg-slate-800/20 rounded-lg">
                    {isRtl ? 'لا توجد مبيعات سابقة مسجلة' : 'No purchase records found'}
                  </div>
                ) : (
                  <div className="space-y-1 max-h-[90px] overflow-y-auto pr-1">
                    {purchaseHistory.map(ord => (
                      <div key={ord.id} className="flex justify-between text-[10px] p-1.5 bg-slate-100/30 dark:bg-slate-800/20 border rounded-lg">
                        <span className="font-bold">{ord.invoice_number}</span>
                        <span className="text-slate-400 font-sans">{new Date(ord.created_at).toLocaleDateString()}</span>
                        <span className="font-bold text-blue-500 font-sans">{ord.total.toFixed(2)} SAR</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {selectedCust.notes && (
                <div className="text-xs text-slate-500 dark:text-slate-400 bg-amber-500/5 p-3 rounded-lg border border-amber-500/10">
                  <b>{isRtl ? 'ملاحظة:' : 'Note:'}</b> {selectedCust.notes}
                </div>
              )}
            </div>

            {/* Comm Emulator */}
            <div className="glass-card p-5 rounded-2xl shadow-sm flex-1 flex flex-col space-y-3">
              <h4 className="font-bold text-sm flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-blue-500" />
                {isRtl ? 'إرسال حملة ترويجية أو تنبيه' : 'Send Alert / Promo'}
              </h4>

              <form onSubmit={handleSendCommunication} className="space-y-3">
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs">
                  <button
                    type="button"
                    onClick={() => setCommType('sms')}
                    className={`flex-1 py-1 rounded-md font-semibold flex justify-center items-center gap-1 ${commType === 'sms' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'}`}
                  >
                    <Send className="h-3 w-3" /> SMS
                  </button>
                  <button
                    type="button"
                    onClick={() => setCommType('email')}
                    className={`flex-1 py-1 rounded-md font-semibold flex justify-center items-center gap-1 ${commType === 'email' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'}`}
                  >
                    <Mail className="h-3 w-3" /> Email
                  </button>
                </div>

                <textarea
                  value={commMsg}
                  onChange={e => setCommMsg(e.target.value)}
                  placeholder={commType === 'sms' ? 'اكتب رسالة SMS الترويجية هنا...' : 'اكتب رسالة البريد الإلكتروني...'}
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                <button
                  type="submit"
                  className="w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex justify-center items-center gap-1 transition-all"
                >
                  <Send className="h-3.5 w-3.5" />
                  {isRtl ? 'إرسال الآن' : 'Send Message'}
                </button>
              </form>

              {/* Logs */}
              <div className="flex-1 overflow-y-auto space-y-2 max-h-[140px] pt-2 border-t border-slate-200 dark:border-slate-800">
                <span className="text-[10px] font-semibold text-slate-400 block">{isRtl ? 'سجل الاتصالات السابق:' : 'Communication Log:'}</span>
                {(commLogs[selectedCust.id] || []).length === 0 ? (
                  <div className="text-[10px] text-slate-400 text-center py-4">{isRtl ? 'لا توجد مراسلات سابقة' : 'No previous communications'}</div>
                ) : (
                  commLogs[selectedCust.id].map(log => (
                    <div key={log.id} className="p-2 rounded bg-slate-100/50 dark:bg-slate-800/30 text-[10px] border border-slate-200/30">
                      <div className="flex justify-between font-bold mb-1">
                        <span className="text-blue-500 uppercase">{log.type}</span>
                        <span className="text-slate-400">{new Date(log.date).toLocaleDateString()}</span>
                      </div>
                      <p className="text-slate-700 dark:text-slate-300">{log.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="glass-card p-8 rounded-2xl text-center text-slate-400">
            {isRtl ? 'اختر عميلاً لعرض التفاصيل' : 'Select a customer to view logs'}
          </div>
        )}
      </div>

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleAddCustomer} className="glass-card p-6 rounded-2xl max-w-md w-full space-y-4 animate-fade-in text-right">
            <h3 className="font-bold text-base border-b border-slate-200 dark:border-slate-800 pb-2">
              {isRtl ? 'إضافة عميل جديد إلى قاعدة البيانات' : 'Register New CRM Client'}
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-500 font-semibold block mb-1">الاسم الكامل*</label>
                <input
                  type="text"
                  required
                  value={newCustName}
                  onChange={e => setNewCustName(e.target.value)}
                  placeholder="محمد العتيبي"
                  className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-500 font-semibold block mb-1">رقم الجوال*</label>
                <input
                  type="text"
                  required
                  value={newCustPhone}
                  onChange={e => setNewCustPhone(e.target.value)}
                  placeholder="05xxxxxxx"
                  className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-slate-500 font-semibold block mb-1">البريد الإلكتروني</label>
                <input
                  type="email"
                  value={newCustEmail}
                  onChange={e => setNewCustEmail(e.target.value)}
                  placeholder="client@email.com"
                  className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-slate-500 font-semibold block mb-1">ملاحظات إضافية</label>
                <textarea
                  value={newCustNotes}
                  onChange={e => setNewCustNotes(e.target.value)}
                  placeholder="ملاحظات حول طريقة الدفع المفضلة أو المشتريات..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm"
              >
                حفظ العميل
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
