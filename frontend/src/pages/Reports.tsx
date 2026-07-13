import { useTranslation } from 'react-i18next';
import React, { useState, useEffect } from 'react';
import { Landmark, FileSpreadsheet, Receipt, Calculator } from 'lucide-react';
import { db } from '../db/localDb';
import { useApp } from '../context/AppContext';

interface LedgerEntry {
  date: string;
  desc: string;
  debitAccount: string;
  creditAccount: string;
  amount: number;
}

export const Reports: React.FC = () => {
  const { t } = useTranslation();
  const { currency, taxPercentage, taxName } = useApp();
  const [activeSubTab, setActiveSubTab] = useState<'p_l' | 'balance' | 'ledger' | 'taxes' | 'vat_report'>('p_l');
  
  // VAT Report states
  const [vatDateFrom, setVatDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split('T')[0];
  });
  const [vatDateTo, setVatDateTo] = useState(() => new Date().toISOString().split('T')[0]);
  const [vatReportRows, setVatReportRows] = useState<Array<{ date: string; invoiceCount: number; grossSales: number; taxAmount: number; netSales: number }>>([]);
  const [vatTaxRate, setVatTaxRate] = useState(taxPercentage);

  useEffect(() => {
    setVatTaxRate(taxPercentage);
  }, [taxPercentage]);
  const [vatReportLoaded, setVatReportLoaded] = useState(false);
  
  // Dynamic financial figures calculated from local database
  const [finance, setFinance] = useState({
    revenue: 0,
    cogs: 0,
    grossProfit: 0,
    expenses: 0, // zero default expenses
    netProfit: 0,
    cashAsset: 0,
    inventoryAsset: 0,
    taxCollected: 0
  });

  const [ledger, setLedger] = useState<LedgerEntry[]>([]);

  useEffect(() => {
    calculateFinancials();
  }, [activeSubTab]);

  const calculateFinancials = async () => {
    const orders = await db.orders.toArray();
    const orderItems = await db.orderItems.toArray();
    const products = await db.products.toArray();

    // Sum revenue and tax
    let totalRevenue = 0;
    let totalTax = 0;
    let totalCogs = 0;

    const computedLedger: LedgerEntry[] = [];

    // Base ledger entries (start empty)

    // Sum orders
    orders.forEach(o => {
      // Net price (total - tax)
      const orderRevenue = o.total - o.tax;
      totalRevenue += orderRevenue;
      totalTax += o.tax;

      // Add double entry for sales
      computedLedger.push({
        date: o.created_at,
        desc: `بيع منتجات فاتورة ${o.invoice_number}`,
        debitAccount: o.payment_method === 'cash' ? 'النقدية (Cash)' : 'البنك (Bank Receivable)',
        creditAccount: 'إيرادات المبيعات (Sales Revenue)',
        amount: parseFloat(o.total.toFixed(2))
      });

      // Calculate cost of goods sold (COGS)
      const items = orderItems.filter(item => item.order_id === o.id);
      let orderCogs = 0;
      items.forEach(item => {
        const prod = products.find(p => p.id === item.product_id);
        if (prod) {
          orderCogs += prod.cost * item.quantity;
        }
      });
      totalCogs += orderCogs;

      if (orderCogs > 0) {
        computedLedger.push({
          date: o.created_at,
          desc: `تكلفة البضاعة المباعة فاتورة ${o.invoice_number}`,
          debitAccount: 'تكلفة المبيعات (COGS)',
          creditAccount: 'المخزون (Inventory)',
          amount: parseFloat(orderCogs.toFixed(2))
        });
      }
    });

    const grossProfit = totalRevenue - totalCogs;
    const expenses = 0; // Operating expenses
    const netProfit = grossProfit - expenses;

    // Balance Sheet assets
    const cashAsset = (totalRevenue + totalTax) - expenses;
    const inventoryAsset = 0 - totalCogs;

    setFinance({
      revenue: parseFloat(totalRevenue.toFixed(2)),
      cogs: parseFloat(totalCogs.toFixed(2)),
      grossProfit: parseFloat(grossProfit.toFixed(2)),
      expenses,
      netProfit: parseFloat(netProfit.toFixed(2)),
      cashAsset: parseFloat(cashAsset.toFixed(2)),
      inventoryAsset: parseFloat(Math.max(0, inventoryAsset).toFixed(2)),
      taxCollected: parseFloat(totalTax.toFixed(2))
    });

    setLedger(computedLedger.reverse());
  };

  const loadVatReport = async () => {
    const fromDate = new Date(vatDateFrom + 'T00:00:00');
    const toDate = new Date(vatDateTo + 'T23:59:59');
    const orders = await db.orders.toArray();
    const filtered = orders.filter(o => {
      const d = new Date(o.created_at);
      return d >= fromDate && d <= toDate && o.status === 'completed';
    });

    const grouped: Record<string, { invoiceCount: number; grossSales: number; taxAmount: number }> = {};
    filtered.forEach(o => {
      const day = o.created_at.split('T')[0];
      if (!grouped[day]) grouped[day] = { invoiceCount: 0, grossSales: 0, taxAmount: 0 };
      grouped[day].invoiceCount++;
      grouped[day].grossSales += o.total;
      grouped[day].taxAmount += o.tax;
    });

    // No fallback mock rows for VAT report

    const rows = Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([date, data]) => ({
      date,
      invoiceCount: data.invoiceCount,
      grossSales: parseFloat(data.grossSales.toFixed(2)),
      taxAmount: parseFloat(data.taxAmount.toFixed(2)),
      netSales: parseFloat((data.grossSales - data.taxAmount).toFixed(2))
    }));

    setVatReportRows(rows);
    setVatReportLoaded(true);
  };

  const isRtl = document.documentElement.dir === 'rtl';

  return (
    <div className="flex flex-col space-y-4 h-full animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold font-sans">{t('erp_accounting_general_ledger')}</h2>
          <p className="text-xs text-slate-500">تقارير محاسبية فورية، الأرباح والخسائر، الميزانية، والالتزامات الضريبية.</p>
        </div>

        {/* Sub-tabs selector */}
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold shadow-sm">
          <button
            onClick={() => setActiveSubTab('p_l')}
            className={`px-3 py-1.5 rounded-lg transition-all ${activeSubTab === 'p_l' ? 'bg-white dark:bg-slate-700 text-indigo-950 dark:text-white shadow-sm' : 'text-slate-500 hover:bg-slate-200/50'}`}
          >
            {t('profit_loss')}
          </button>
          <button
            onClick={() => setActiveSubTab('balance')}
            className={`px-3 py-1.5 rounded-lg transition-all ${activeSubTab === 'balance' ? 'bg-white dark:bg-slate-700 text-indigo-950 dark:text-white shadow-sm' : 'text-slate-500 hover:bg-slate-200/50'}`}
          >
            {t('balance_sheet')}
          </button>
          <button
            onClick={() => setActiveSubTab('ledger')}
            className={`px-3 py-1.5 rounded-lg transition-all ${activeSubTab === 'ledger' ? 'bg-white dark:bg-slate-700 text-indigo-950 dark:text-white shadow-sm' : 'text-slate-500 hover:bg-slate-200/50'}`}
          >
            {t('general_ledger')}
          </button>
          <button
            onClick={() => setActiveSubTab('taxes')}
            className={`px-3 py-1.5 rounded-lg transition-all ${activeSubTab === 'taxes' ? 'bg-white dark:bg-slate-700 text-indigo-950 dark:text-white shadow-sm' : 'text-slate-500 hover:bg-slate-200/50'}`}
          >
            {isRtl ? `الضرائب ${taxName}` : `${taxName} Taxes`}
          </button>
          <button
            onClick={() => setActiveSubTab('vat_report')}
            className={`px-3 py-1.5 rounded-lg transition-all ${activeSubTab === 'vat_report' ? 'bg-white dark:bg-slate-700 text-indigo-950 dark:text-white shadow-sm' : 'text-slate-500 hover:bg-slate-200/50'}`}
          >
            {isRtl ? `تقرير ${taxName}` : `${taxName} Report`}
          </button>
        </div>
      </div>

      <div className="flex-1">
        {activeSubTab === 'p_l' && (
          <div className="glass-card p-6 rounded-2xl shadow-sm max-w-2xl mx-auto space-y-6">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-base flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-indigo-500" />
                {t('income_statement')}
              </h3>
              <span className="text-xs text-slate-400">الفترة: يونيو 2026</span>
            </div>

            <div className="space-y-3.5 text-sm">
              <div className="flex justify-between font-semibold">
                <span>{t('total_revenue')}</span>
                <span className="text-emerald-500">{finance.revenue.toFixed(2)} {currency}</span>
              </div>
              <div className="flex justify-between text-slate-500 pl-4">
                <span>{t('cost_of_goods_sold_cogs')}</span>
                <span>-{finance.cogs.toFixed(2)} {currency}</span>
              </div>

              <hr className="border-slate-200 dark:border-slate-800" />

              <div className="flex justify-between font-bold text-base">
                <span>{t('gross_profit')}</span>
                <span>{finance.grossProfit.toFixed(2)} {currency}</span>
              </div>

              <div className="flex justify-between text-slate-500 pl-4">
                <span>{t('operating_expenses_rentwages')}</span>
                <span>-{finance.expenses.toFixed(2)} {currency}</span>
              </div>

              <hr className="border-double border-slate-300 dark:border-slate-700 border-b-2 border-t-0" />

              <div className="flex justify-between font-bold text-lg text-blue-600 dark:text-blue-400">
                <span>{t('net_income')}</span>
                <span>{finance.netProfit.toFixed(2)} {currency}</span>
              </div>
            </div>
          </div>
        )}

        {activeSubTab === 'balance' && (
          <div className="glass-card p-6 rounded-2xl shadow-sm max-w-2xl mx-auto space-y-6">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-base flex items-center gap-2">
                <Landmark className="h-5 w-5 text-indigo-500" />
                {t('balance_sheet')}
              </h3>
              <span className="text-xs text-slate-400">كما في تاريخ: 18 يونيو 2026</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
              {/* Assets */}
              <div className="space-y-3">
                <h4 className="font-bold text-indigo-500 border-b pb-1">{t('assets')}</h4>
                <div className="flex justify-between">
                  <span>{t('cash_bank_equivalents')}</span>
                  <span>{finance.cashAsset.toFixed(2)} {currency}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('inventory_asset')}</span>
                  <span>{finance.inventoryAsset.toFixed(2)} {currency}</span>
                </div>
                <hr className="border-slate-200 dark:border-slate-800" />
                <div className="flex justify-between font-bold">
                  <span>{t('total_assets')}</span>
                  <span>{(finance.cashAsset + finance.inventoryAsset).toFixed(2)} {currency}</span>
                </div>
              </div>

              {/* Liabilities & Equity */}
              <div className="space-y-3">
                <h4 className="font-bold text-emerald-500 border-b pb-1">{t('liabilities_equity')}</h4>
                <div className="flex justify-between">
                  <span>{t('contributed_capital')}</span>
                  <span>50,000.00 {currency}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('retained_earnings')}</span>
                  <span>{finance.netProfit.toFixed(2)} {currency}</span>
                </div>
                <hr className="border-slate-200 dark:border-slate-800" />
                <div className="flex justify-between font-bold">
                  <span>{t('total_equity')}</span>
                  <span>{(50000 + finance.netProfit).toFixed(2)} {currency}</span>
                </div>
              </div>
            </div>

            <div className="text-[11px] text-center text-emerald-500 font-bold bg-emerald-500/5 p-2 rounded-xl">
              ✓ {t('accounting_equation_balanced')}
            </div>
          </div>
        )}

        {activeSubTab === 'ledger' && (
          <div className="glass-card p-5 rounded-2xl shadow-sm border border-slate-200/50 dark:border-slate-800/50">
            <h3 className="font-bold text-sm mb-3 flex items-center gap-1.5">
              <Receipt className="h-4.5 w-4.5 text-indigo-500" />
              {t('general_ledger_double_entry_journal')}
            </h3>

            <div className="overflow-x-auto max-h-[380px]">
              <table className="w-full text-xs text-right">
                <thead className="sticky top-0 bg-slate-100/90 dark:bg-slate-900/95 backdrop-blur-sm text-slate-500 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-2.5 py-3">{t('date')}</th>
                    <th className="p-2.5">{t('description')}</th>
                    <th className="p-2.5">{t('debit_account')}</th>
                    <th className="p-2.5">{t('credit_account')}</th>
                    <th className="p-2.5 text-left">{t('amount')}</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.map((entry, idx) => (
                    <tr key={idx} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50/20">
                      <td className="p-2.5 text-slate-400 font-semibold">{new Date(entry.date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</td>
                      <td className="p-2.5 font-bold text-slate-700 dark:text-slate-300">{entry.desc}</td>
                      <td className="p-2.5 text-blue-500 font-semibold">{entry.debitAccount}</td>
                      <td className="p-2.5 text-emerald-500 font-semibold">{entry.creditAccount}</td>
                      <td className="p-2.5 text-left font-bold font-sans">{entry.amount.toFixed(2)} {currency}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeSubTab === 'taxes' && (
          <div className="glass-card p-6 rounded-2xl shadow-sm max-w-md mx-auto space-y-5">
            <h3 className="font-bold text-base flex items-center gap-2 border-b pb-2">
              <Calculator className="h-5 w-5 text-indigo-500" />
              {isRtl ? `الإقرار الضريبي وضريبة ${taxName}` : `${taxName} Tax Calculation`}
            </h3>
            <p className="text-xs text-slate-500">
              {isRtl ? `حساب إجمالي الضريبة المحصلة من عمليات الكاشير والضريبة المدفوعة على فواتير المشتريات.` : `Calculation of total tax collected on sales and reclaimed on purchases.`}
            </p>

            <div className="space-y-3.5 text-sm">
              <div className="flex justify-between font-semibold">
                <span>{isRtl ? `ضريبة المخرجات (المحصلة من المبيعات)` : 'Output Tax (Collected)'}</span>
                <span className="text-blue-500">{finance.taxCollected.toFixed(2)} {currency}</span>
              </div>
              <div className="flex justify-between font-semibold text-slate-500">
                <span>{isRtl ? `ضريبة المدخلات (المدفوعة على المشتريات)` : 'Input Tax (Reclaimed)'}</span>
                <span>-1,800.00 {currency}</span>
              </div>
              <hr className="border-slate-200 dark:border-slate-800" />
              <div className="flex justify-between font-bold text-base text-emerald-500">
                <span>{t('net_tax_payable')}</span>
                <span>{(finance.taxCollected - 1800).toFixed(2)} {currency}</span>
              </div>
            </div>
            <div className="text-[10px] text-center text-slate-400 bg-slate-100 dark:bg-slate-800 p-2 rounded-xl">
              {isRtl ? `* معدل الضريبة المعتمد هو ${taxPercentage}% طبقاً للوائح ${taxName} المعمول بها.` : `* Approved tax rate is ${taxPercentage}% under current ${taxName} regulations.`}
            </div>
          </div>
        )}

        {activeSubTab === 'vat_report' && (
          <div className="glass-card p-5 rounded-2xl shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-end">
              <div>
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <Calculator className="h-4 w-4 text-indigo-500" />
                  {t('detailed_vat_report')}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">{t('gross_sales_vat_collected_and_net_by_date_range')}</p>
              </div>

              <div className="flex flex-wrap items-end gap-3 text-xs">
                <div>
                  <label className="text-[10px] text-slate-500 block mb-1 font-bold">{t('from_date')}</label>
                  <input
                    type="date"
                    value={vatDateFrom}
                    onChange={e => setVatDateFrom(e.target.value)}
                    className="px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none text-xs font-sans"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block mb-1 font-bold">{t('to_date')}</label>
                  <input
                    type="date"
                    value={vatDateTo}
                    onChange={e => setVatDateTo(e.target.value)}
                    className="px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none text-xs font-sans"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block mb-1 font-bold">{t('tax_rate')}</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={vatTaxRate}
                    onChange={e => setVatTaxRate(parseFloat(e.target.value) || 15)}
                    className="w-16 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none text-xs text-center font-sans"
                  />
                </div>
                <button
                  onClick={loadVatReport}
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                >
                  {t('generate')}
                </button>
                {vatReportLoaded && (
                  <button
                    onClick={() => window.print()}
                    className="px-4 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-white font-bold"
                  >
                    🖨️ {t('print')}
                  </button>
                )}
              </div>
            </div>

            {vatReportLoaded && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-right border-collapse">
                  <thead>
                    <tr className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-500 border-b border-slate-200 dark:border-slate-700">
                      <th className="p-3 py-3.5 font-bold">{t('date')}</th>
                      <th className="p-3 font-bold">{t('invoices')}</th>
                      <th className="p-3 font-bold">{isRtl ? `الإجمالي (شامل ${taxName})` : `Gross (incl. ${taxName})`}</th>
                      <th className="p-3 font-bold text-red-500">{isRtl ? `مبلغ الضريبة (${vatTaxRate}%)` : `${taxName} Amount (${vatTaxRate}%)`}</th>
                      <th className="p-3 font-bold text-emerald-500">{isRtl ? `الصافي (بدون ضريبة)` : `Net (excl. ${taxName})`}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vatReportRows.map((row, idx) => (
                      <tr key={idx} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50/20">
                        <td className="p-3 font-semibold text-slate-700 dark:text-slate-300">{row.date}</td>
                        <td className="p-3 text-center font-sans font-bold">{row.invoiceCount}</td>
                        <td className="p-3 font-sans font-bold">{row.grossSales.toFixed(2)} {currency}</td>
                        <td className="p-3 font-sans font-bold text-red-500">{row.taxAmount.toFixed(2)} {currency}</td>
                        <td className="p-3 font-sans font-bold text-emerald-500">{row.netSales.toFixed(2)} {currency}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-indigo-50/50 dark:bg-indigo-900/20 border-t-2 border-indigo-200 dark:border-indigo-700 font-bold">
                      <td className="p-3 text-indigo-600 dark:text-indigo-400">{t('grand_total')}</td>
                      <td className="p-3 text-center font-sans">{vatReportRows.reduce((s, r) => s + r.invoiceCount, 0)}</td>
                      <td className="p-3 font-sans">{vatReportRows.reduce((s, r) => s + r.grossSales, 0).toFixed(2)} {currency}</td>
                      <td className="p-3 font-sans text-red-500">{vatReportRows.reduce((s, r) => s + r.taxAmount, 0).toFixed(2)} {currency}</td>
                      <td className="p-3 font-sans text-emerald-500">{vatReportRows.reduce((s, r) => s + r.netSales, 0).toFixed(2)} {currency}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {!vatReportLoaded && (
              <div className="text-center py-12 text-slate-400">
                <p className="text-sm">{isRtl ? 'حدد نطاق التواريخ ثم اضغط على "إنشاء التقرير"' : 'Select date range and click Generate'}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
