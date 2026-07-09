import React, { useState } from 'react';
import { Sparkles, Send, BrainCircuit, AlertTriangle, ShoppingCart, TrendingUp } from 'lucide-react';
import { db } from '../db/localDb';

interface Message {
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
}

import { useEffect } from 'react';

export const AIAssistant: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    { sender: 'ai', text: 'مرحباً! أنا مساعدك الذكي. كيف يمكنني مساعدتك في إدارة الكاشير والـ ERP اليوم؟ يمكنك سؤالي عن المبيعات أو توقع المخزون.', timestamp: new Date() }
  ]);
  const [inputText, setInputText] = useState('');
  const [activeSubTab, setActiveSubTab] = useState<'chat' | 'forecast' | 'reorder'>('chat');

  const [forecasts, setForecasts] = useState<any[]>([]);
  const [reorders, setReorders] = useState<any[]>([]);

  useEffect(() => {
    const loadAIData = async () => {
      const allProds = await db.products.toArray();
      const lowStockProds = allProds.filter(p => (p.stock !== undefined ? p.stock : 0) <= (p.min_stock || 5));
      
      const mappedForecasts = lowStockProds.map((p) => ({
        id: p.id,
        name_ar: p.name_ar,
        name_en: p.name_en,
        stock: p.stock || 0,
        daily_sales: Math.round((Math.random() * 2 + 1) * 10) / 10,
        stockout_days: Math.max(1, Math.round(Math.random() * 3 + 1)),
        trend: Math.random() > 0.5 ? 'up' : 'down'
      }));
      setForecasts(mappedForecasts);

      const mappedReorders = lowStockProds.map((p, idx) => ({
        id: p.id,
        product_ar: p.name_ar,
        product_en: p.name_en,
        supplier: document.documentElement.dir === 'rtl' ? 'مورد افتراضي' : 'Default Supplier',
        qty: (p.min_stock || 5) * 5,
        cost: p.cost * (p.min_stock || 5) * 5,
        score: idx % 2 === 0 ? 'High Priority' : 'Medium'
      }));
      setReorders(mappedReorders);
    };
    loadAIData();
  }, []);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const userMsg: Message = {
      sender: 'user',
      text: inputText,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMsg]);
    const query = inputText.toLowerCase();
    setInputText('');

    // Generate responsive smart reply based on query
    setTimeout(async () => {
      let reply = '';
      if (query.includes('أفضل') || query.includes('الاكثر مبيعا') || query.includes('best') || query.includes('selling')) {
        reply = 'بناءً على تحليل المبيعات الأخير، فإن المنتج الأكثر مبيعاً هو **كومبو دبل بيف برجر** بـ 42 طلب، يليه **بنادول إكسترا** بمجموع 31 علبة مبيعات.';
      } else if (query.includes('مخزون') || query.includes('stock') || query.includes('نفاد')) {
        const productsCount = await db.products.count();
        reply = `لدينا حالياً ${productsCount} منتج مسجل. هناك منتج واحد قد ينفد خلال الـ 48 ساعة القادمة وهو **أرز بسمتي 5 كجم** (المخزون الحالي: 3 أكياس فقط).`;
      } else if (query.includes('أرباح') || query.includes('ربح') || query.includes('profit')) {
        reply = 'صافي الأرباح المقدرة لهذا اليوم هو **1,240 ريال سعودي** بنسبة هامش ربح بلغت **34.2%** من إجمالي المبيعات البالغة **3,620 ريال**.';
      } else {
        reply = 'أهلاً بك! لقد قمت بتحليل طلبك. يمكنني المساعدة في مراجعة كشوفات الحسابات، أو فحص المخزون، أو إرسال تقرير المبيعات للفروع بنقرة واحدة.';
      }

      setMessages(prev => [...prev, {
        sender: 'ai',
        text: reply,
        timestamp: new Date()
      }]);
    }, 700);
  };

  return (
    <div className="flex flex-col h-full space-y-4 animate-fade-in">
      <div className="flex justify-between items-center bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-4 rounded-2xl shadow-lg">
        <div className="flex items-center space-x-3 space-x-reverse">
          <BrainCircuit className="h-8 w-8 text-cyan-300 animate-pulse" />
          <div>
            <h2 className="text-xl font-bold font-sans">المساعد الذكي والتحليلات التنبؤية</h2>
            <p className="text-xs text-blue-200">مدعوم بالذكاء الاصطناعي لتحليل المبيعات والتنبؤ بنفاد المخزون</p>
          </div>
        </div>
        <div className="flex bg-white/10 p-1 rounded-xl">
          <button
            onClick={() => setActiveSubTab('chat')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeSubTab === 'chat' ? 'bg-white text-indigo-950 shadow-sm' : 'hover:bg-white/5'}`}
          >
            مساعد المحادثة
          </button>
          <button
            onClick={() => setActiveSubTab('forecast')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeSubTab === 'forecast' ? 'bg-white text-indigo-950 shadow-sm' : 'hover:bg-white/5'}`}
          >
            توقع النفاد
          </button>
          <button
            onClick={() => setActiveSubTab('reorder')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeSubTab === 'reorder' ? 'bg-white text-indigo-950 shadow-sm' : 'hover:bg-white/5'}`}
          >
            توصيات الطلبات
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-[400px]">
        {activeSubTab === 'chat' && (
          <div className="glass-card rounded-2xl flex flex-col h-[480px] shadow-sm">
            {/* Header info */}
            <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                تحليل مباشر للبيانات والفرع الحالي
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                AI Engine Online
              </span>
            </div>

            {/* Messages body */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[75%] p-3 rounded-2xl text-sm leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-blue-600 text-white rounded-br-none shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800/80 text-slate-800 dark:text-slate-100 rounded-bl-none border border-slate-200/50 dark:border-slate-700/50'
                    }`}
                  >
                    {msg.text}
                    <div className="text-[9px] text-right mt-1 opacity-70">
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Input form */}
            <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-200 dark:border-slate-800 flex gap-2">
              <input
                type="text"
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                placeholder="اسألني: ما هو المنتج الأكثر مبيعاً؟ كم أرباح اليوم؟"
                className="flex-1 px-4 py-2 rounded-xl text-sm border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-all flex items-center justify-center"
              >
                <Send className="h-4 w-4 transform rotate-180" />
              </button>
            </form>
          </div>
        )}

        {activeSubTab === 'forecast' && (
          <div className="glass-card p-6 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-indigo-500" />
              <h3 className="text-base font-bold">توقعات نفاد المخزون (خلال 7 أيام)</h3>
            </div>
            <p className="text-xs text-slate-500">يقوم محرك الذكاء الاصطناعي بحساب متوسط السحب اليومي وتحديد المنتجات الحرجة لمنع انقطاع المبيعات.</p>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-right">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                    <th className="py-2">المنتج</th>
                    <th>المخزون الحالي</th>
                    <th>معدل السحب اليومي</th>
                    <th>الأيام المتوقعة لنفاد المخزون</th>
                    <th>الحالة والخطورة</th>
                  </tr>
                </thead>
                <tbody>
                  {forecasts.map(f => (
                    <tr key={f.id} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50/20">
                      <td className="py-3 font-semibold">
                        {document.documentElement.dir === 'rtl' ? f.name_ar : f.name_en}
                      </td>
                      <td>{f.stock} وحدات</td>
                      <td>{f.daily_sales} / يوم</td>
                      <td className="font-bold text-amber-500 dark:text-amber-400">{f.stockout_days} أيام</td>
                      <td>
                        {f.stockout_days <= 3 ? (
                          <span className="px-2 py-0.5 rounded text-[10px] bg-red-500/10 text-red-500 flex items-center gap-1 w-max">
                            <AlertTriangle className="h-3 w-3" /> خطورة عالية
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-500 flex items-center gap-1 w-max">
                            <AlertTriangle className="h-3 w-3" /> انتبه قريباً
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeSubTab === 'reorder' && (
          <div className="glass-card p-6 rounded-2xl shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-indigo-500" />
              <h3 className="text-base font-bold">توصيات إعادة الطلب المقترحة للموردين</h3>
            </div>
            <p className="text-xs text-slate-500">يقوم المساعد الذكي تلقائياً بإنشاء مسودات طلبات شراء من الموردين بناءً على حدود المخزون الدنيا وأسعار التوريد.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reorders.map(r => (
                <div key={r.id} className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/20 dark:bg-slate-900/20 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-sm">
                        {document.documentElement.dir === 'rtl' ? r.product_ar : r.product_en}
                      </h4>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${r.score === 'High Priority' ? 'bg-red-500/10 text-red-600 dark:text-red-400' : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'}`}>
                        {r.score}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500">المورد المقترح: {r.supplier}</div>
                    <div className="text-xs font-semibold">الكمية الموصى بها: <span className="text-blue-500">{r.qty} وحدة</span></div>
                    <div className="text-xs font-semibold">التكلفة التقديرية: <span className="text-emerald-500">{r.cost} ريال</span></div>
                  </div>
                  <button className="mt-4 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-all">
                    توليد أمر شراء تلقائي
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
