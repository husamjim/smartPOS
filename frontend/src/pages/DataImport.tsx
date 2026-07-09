import React, { useState } from 'react';
import { Download, Upload, AlertTriangle, Undo2, Play } from 'lucide-react';
import { downloadCSVTemplate } from '../utils/csvTemplates';
import { db } from '../db/localDb';
import * as XLSX from 'xlsx';
import { AuditLogger } from '../utils/auditLogger';

type EntityType = 'products' | 'customers' | 'suppliers' | 'employees' | 'accounts' | 'inventory' | 'branches';

interface ValidationError {
  row: number;
  col: string;
  message: string;
}

export const DataImport: React.FC = () => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [entityType, setEntityType] = useState<EntityType>('products');
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [importing, setImporting] = useState(false);
  const [lastImportedIds, setLastImportedIds] = useState<{ table: string; ids: string[] } | null>(null);
  const [fileName, setFileName] = useState('');

  const isRtl = document.documentElement.dir === 'rtl';

  const entityMetadata: Record<EntityType, { titleAr: string; titleEn: string; descAr: string; descEn: string }> = {
    products: {
      titleAr: '📦 المنتجات',
      titleEn: '📦 Products',
      descAr: 'استيراد المنتجات والأسعار والتصنيفات للمستودعات.',
      descEn: 'Import items, price levels, and barcode categories.'
    },
    customers: {
      titleAr: '👥 العملاء',
      titleEn: '👥 Customers',
      descAr: 'استيراد سجلات العملاء ونقاط الولاء الحالية.',
      descEn: 'Import customer registry and active loyalty points.'
    },
    suppliers: {
      titleAr: '🤝 الموردين',
      titleEn: '🤝 Suppliers',
      descAr: 'استيراد جهات اتصال الموردين والأرصدة الافتتاحية.',
      descEn: 'Import suppliers, contact names, and initial balances.'
    },
    employees: {
      titleAr: '👤 الموظفين',
      titleEn: '👤 Employees',
      descAr: 'استيراد مستخدمي الكاشير والمدراء للنظام المحلي.',
      descEn: 'Import cashiers and store manager local user logins.'
    },
    accounts: {
      titleAr: '📊 دليل الحسابات',
      titleEn: '📊 Chart of Accounts',
      descAr: 'إعداد شجرة الحسابات المحاسبية للمنشأة.',
      descEn: 'Initialize the corporate general ledger accounts.'
    },
    inventory: {
      titleAr: '🔋 المخزون والباتشات',
      titleEn: '🔋 Batches & Stock',
      descAr: 'استيراد كميات المخزون وتواريخ انتهاء الصلاحية.',
      descEn: 'Import product stock levels and lot expiry details.'
    },
    branches: {
      titleAr: '🏪 الفروع والمنافذ',
      titleEn: '🏪 Branches & Nodes',
      descAr: 'استيراد فروع البيع والمستودعات الإضافية.',
      descEn: 'Import sales nodes, outlets, and depots.'
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();

    if (file.name.endsWith('.csv')) {
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        parseCSVText(text);
      };
      reader.readAsText(file);
    } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      reader.onload = (ev) => {
        const data = new Uint8Array(ev.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        parseSheetData(jsonData);
      };
      reader.readAsArrayBuffer(file);
    } else {
      alert(isRtl ? 'ملف غير مدعوم! الرجاء رفع ملف CSV أو Excel.' : 'Unsupported format! Upload CSV or Excel.');
    }
  };

  const parseCSVText = (text: string) => {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line);
    if (lines.length === 0) return;
    
    // Parse CSV handling quotes
    const parsedLines = lines.map(line => {
      const result = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    });

    const fileHeaders = parsedLines[0];
    const dataRows = parsedLines.slice(1).map(row => {
      const obj: Record<string, string> = {};
      fileHeaders.forEach((h, idx) => {
        obj[h] = row[idx] || '';
      });
      return obj;
    });

    setHeaders(fileHeaders);
    validateData(dataRows, fileHeaders);
  };

  const parseSheetData = (sheetRows: any[]) => {
    if (sheetRows.length === 0) return;
    const fileHeaders = sheetRows[0].map((h: any) => String(h || '').trim());
    const dataRows = sheetRows.slice(1).map(row => {
      const obj: Record<string, string> = {};
      fileHeaders.forEach((h: string, idx: number) => {
        obj[h] = row[idx] !== undefined ? String(row[idx]).trim() : '';
      });
      return obj;
    });

    setHeaders(fileHeaders);
    validateData(dataRows, fileHeaders);
  };

  const validateData = (rows: any[], fileHeaders: string[]) => {
    const detectedErrors: ValidationError[] = [];
    
    // Define expected columns per entity
    const expectedHeaders: Record<EntityType, string[]> = {
      products: ['id', 'name_ar', 'name_en', 'sku', 'barcode', 'price', 'cost'],
      customers: ['id', 'name', 'phone'],
      suppliers: ['id', 'name', 'phone'],
      employees: ['id', 'username', 'displayName', 'role'],
      accounts: ['id', 'code', 'name_ar', 'type'],
      inventory: ['product_id', 'warehouse_id', 'quantity'],
      branches: ['id', 'name_ar', 'name_en']
    };

    const required = expectedHeaders[entityType];
    const missing = required.filter(h => !fileHeaders.includes(h));

    if (missing.length > 0) {
      detectedErrors.push({
        row: 0,
        col: 'Header',
        message: isRtl 
          ? `أعمدة مفقودة في الملف: ${missing.join(', ')}`
          : `Missing required columns: ${missing.join(', ')}`
      });
    }

    rows.forEach((row, index) => {
      required.forEach(col => {
        if (!row[col] || row[col].trim() === '') {
          detectedErrors.push({
            row: index + 2,
            col,
            message: isRtl ? `الحقل "${col}" مطلوب ولا يمكن تركه فارغاً.` : `Field "${col}" is required.`
          });
        }
      });

      // Price / Cost validation for products
      if (entityType === 'products') {
        if (row['price'] && isNaN(Number(row['price']))) {
          detectedErrors.push({ row: index + 2, col: 'price', message: isRtl ? 'السعر يجب أن يكون رقماً.' : 'Price must be a number.' });
        }
        if (row['cost'] && isNaN(Number(row['cost']))) {
          detectedErrors.push({ row: index + 2, col: 'cost', message: isRtl ? 'التكلفة يجب أن تكون رقماً.' : 'Cost must be a number.' });
        }
      }

      // Quantity validation for inventory
      if (entityType === 'inventory') {
        if (row['quantity'] && isNaN(Number(row['quantity']))) {
          detectedErrors.push({ row: index + 2, col: 'quantity', message: isRtl ? 'الكمية يجب أن تكون رقماً.' : 'Quantity must be a number.' });
        }
      }
    });

    setErrors(detectedErrors);
    setParsedData(rows);
    setStep(3);
  };

  const handleImport = async () => {
    if (errors.length > 0) {
      alert(isRtl ? 'الرجاء إصلاح أخطاء التحقق قبل المتابعة!' : 'Please fix validation errors before proceeding!');
      return;
    }

    setImporting(true);
    const importedIds: string[] = [];

    try {
      if (entityType === 'products') {
        for (const row of parsedData) {
          const item = {
            id: row.id || `p_${Math.random().toString(36).substring(2, 9)}`,
            name_ar: row.name_ar,
            name_en: row.name_en || row.name_ar,
            sku: row.sku || '',
            barcode: row.barcode || '',
            price: parseFloat(row.price) || 0,
            cost: parseFloat(row.cost) || 0,
            unit: row.unit || 'piece',
            type: row.type === 'weight' ? 'weight' : 'piece',
            category: row.category || 'General',
            min_stock: parseInt(row.min_stock) || 0,
            is_pharmaceutical: parseInt(row.is_pharmaceutical) || 0,
            created_at: new Date().toISOString()
          };
          await db.products.put(item as any);
          importedIds.push(item.id);
        }
      } else if (entityType === 'customers') {
        for (const row of parsedData) {
          const item = {
            id: row.id || `c_${Math.random().toString(36).substring(2, 9)}`,
            name: row.name,
            phone: row.phone,
            email: row.email || '',
            points: parseInt(row.points) || 0,
            tier: (row.tier || 'silver') as any,
            notes: row.notes || '',
            created_at: new Date().toISOString()
          };
          await db.customers.put(item);
          importedIds.push(item.id);
        }
      } else if (entityType === 'suppliers') {
        for (const row of parsedData) {
          const item = {
            id: row.id || `s_${Math.random().toString(36).substring(2, 9)}`,
            name: row.name,
            contact_name: row.contact_name || '',
            phone: row.phone || '',
            email: row.email || '',
            balance: parseFloat(row.balance) || 0
          };
          await db.suppliers.put(item);
          importedIds.push(item.id);
        }
      } else if (entityType === 'employees') {
        const savedUsers = JSON.parse(localStorage.getItem('pos_users') || '[]');
        for (const row of parsedData) {
          const newUser = {
            id: row.id || `u_${Math.random().toString(36).substring(2, 9)}`,
            username: row.username,
            displayName: row.displayName,
            role: row.role || 'cashier',
            active: row.active === 'false' ? false : true,
            password: 'c9fd4d9c3c9aba0a78f8ff985eef90e7a8ae53e3e98a3a9c59b8c8fc7cec8de4' // default owner123 hash
          };
          savedUsers.push(newUser);
          importedIds.push(newUser.id);
        }
        localStorage.setItem('pos_users', JSON.stringify(savedUsers));
      } else if (entityType === 'accounts') {
        const savedAccounts = JSON.parse(localStorage.getItem('pos_chart_of_accounts') || '[]');
        for (const row of parsedData) {
          const acc = {
            id: row.id || `acc_${Math.random().toString(36).substring(2, 9)}`,
            code: row.code,
            name_ar: row.name_ar,
            name_en: row.name_en || '',
            type: row.type || 'asset',
            parent: row.parent || ''
          };
          savedAccounts.push(acc);
          importedIds.push(acc.id);
        }
        localStorage.setItem('pos_chart_of_accounts', JSON.stringify(savedAccounts));
      } else if (entityType === 'inventory') {
        for (const row of parsedData) {
          const batch = {
            id: `b_${Math.random().toString(36).substring(2, 9)}`,
            product_id: row.product_id,
            warehouse_id: row.warehouse_id || 'wh_riyadh_1',
            batch_number: row.batch_number || 'DEFAULT-BATCH',
            expiry_date: row.expiry_date || '',
            quantity: parseFloat(row.quantity) || 0
          };
          await db.batches.put(batch);
          importedIds.push(batch.id);
        }
      } else if (entityType === 'branches') {
        // Mock branch import (write to AppContext branch array configuration)
        const savedBranches = JSON.parse(localStorage.getItem('pos_custom_branches') || '[]');
        for (const row of parsedData) {
          const branch = {
            id: row.id || `br_${Math.random().toString(36).substring(2, 9)}`,
            name_ar: row.name_ar,
            name_en: row.name_en || row.name_ar,
            location: row.location || ''
          };
          savedBranches.push(branch);
          importedIds.push(branch.id);
        }
        localStorage.setItem('pos_custom_branches', JSON.stringify(savedBranches));
      }

      setLastImportedIds({ table: entityType, ids: importedIds });
      AuditLogger.log('IMPORT_DATA', entityType, `Successfully imported ${importedIds.length} rows to ${entityType}`, 'success');
      setStep(4);
    } catch (err: any) {
      alert(isRtl ? `فشل الاستيراد: ${err.message}` : `Import failed: ${err.message}`);
    } finally {
      setImporting(false);
    }
  };

  const handleRollback = async () => {
    if (!lastImportedIds) return;
    try {
      const { table, ids } = lastImportedIds;
      if (table === 'products') {
        await Promise.all(ids.map(id => db.products.delete(id)));
      } else if (table === 'customers') {
        await Promise.all(ids.map(id => db.customers.delete(id)));
      } else if (table === 'suppliers') {
        await Promise.all(ids.map(id => db.suppliers.delete(id)));
      } else if (table === 'employees') {
        const users = JSON.parse(localStorage.getItem('pos_users') || '[]');
        const filtered = users.filter((u: any) => !ids.includes(u.id));
        localStorage.setItem('pos_users', JSON.stringify(filtered));
      } else if (table === 'accounts') {
        const accs = JSON.parse(localStorage.getItem('pos_chart_of_accounts') || '[]');
        const filtered = accs.filter((a: any) => !ids.includes(a.id));
        localStorage.setItem('pos_chart_of_accounts', JSON.stringify(filtered));
      } else if (table === 'inventory') {
        await Promise.all(ids.map(id => db.batches.delete(id)));
      } else if (table === 'branches') {
        const brs = JSON.parse(localStorage.getItem('pos_custom_branches') || '[]');
        const filtered = brs.filter((b: any) => !ids.includes(b.id));
        localStorage.setItem('pos_custom_branches', JSON.stringify(filtered));
      }

      AuditLogger.log('IMPORT_DATA', table, `Rolled back import of ${ids.length} rows from ${table}`, 'warning');
      alert(isRtl ? 'تم التراجع عن عملية الاستيراد وحذف البيانات بنجاح.' : 'Rollback completed. Imported rows removed.');
      setLastImportedIds(null);
      setStep(1);
    } catch (err: any) {
      alert(`Rollback failed: ${err.message}`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in font-sans">
      {/* Header */}
      <div className="flex justify-between items-center pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-bold">{isRtl ? 'استيراد البيانات لأول مرة' : 'Data Import Wizard'}</h2>
          <p className="text-xs text-slate-400 mt-1">{isRtl ? 'قم بتهيئة متجرك محلياً برفع ملفات العملاء، الموردين والمنتجات بضغطة واحدة.' : 'Quickly configure your store by importing products, customers, suppliers, and ledger cards.'}</p>
        </div>
        {lastImportedIds && (
          <button
            onClick={handleRollback}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-500 text-xs font-bold transition-all"
          >
            <Undo2 className="h-4 w-4" />
            {isRtl ? 'تراجع عن آخر استيراد' : 'Rollback Last Import'}
          </button>
        )}
      </div>

      {/* Steps Indicator */}
      <div className="flex items-center justify-between max-w-xl mx-auto py-2">
        {[1, 2, 3, 4].map(idx => (
          <React.Fragment key={idx}>
            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold border-2 ${
              step >= idx 
                ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' 
                : 'border-slate-200 dark:border-slate-800 text-slate-400'
            }`}>
              {idx}
            </div>
            {idx < 4 && (
              <div className={`flex-1 h-0.5 mx-2 ${
                step > idx ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-800'
              }`} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Step 1: Select Entity */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="text-center">
            <h3 className="font-bold text-sm text-slate-500">{isRtl ? 'الخطوة 1: اختر نوع البيانات التي تريد استيرادها' : 'Step 1: Choose data type to import'}</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(entityMetadata).map(([key, meta]) => (
              <button
                key={key}
                onClick={() => {
                  setEntityType(key as EntityType);
                  setStep(2);
                }}
                className="glass-card p-5 rounded-2xl border border-slate-200/40 dark:border-slate-800/40 text-right hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all text-right flex flex-col justify-between h-32"
                dir={isRtl ? 'rtl' : 'ltr'}
              >
                <div>
                  <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">{isRtl ? meta.titleAr : meta.titleEn}</h4>
                  <p className="text-xs text-slate-400 mt-1">{isRtl ? meta.descAr : meta.descEn}</p>
                </div>
                <div className="text-left w-full">
                  <span className="text-[10px] font-bold text-indigo-500 flex items-center justify-end gap-1">
                    {isRtl ? 'البدء والتنزيل ←' : 'Configure →'}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Download Template / Upload File */}
      {step === 2 && (
        <div className="glass-card p-6 rounded-3xl border border-slate-200/40 dark:border-slate-800/40 space-y-6">
          <div className="flex justify-between items-center border-b pb-3" dir={isRtl ? 'rtl' : 'ltr'}>
            <h3 className="font-bold text-sm flex items-center gap-1.5">
              <span>⬇️</span>
              {isRtl ? 'الخطوة 2: تحميل القالب ورفع الملف' : 'Step 2: Template & File Upload'}
            </h3>
            <button
              onClick={() => setStep(1)}
              className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              {isRtl ? '← رجوع لتحديد البيانات' : '← Back'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6" dir={isRtl ? 'rtl' : 'ltr'}>
            {/* Download Template */}
            <div className="p-5 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 space-y-4 flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-xs text-indigo-600 dark:text-indigo-400">{isRtl ? '1. تحميل قالب CSV المعتمد' : '1. Download standard CSV template'}</h4>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  {isRtl 
                    ? 'يحتوي الملف على الترويسات الصحيحة المطلوبة للنظام. قم بملء الحقول ثم حفظه لرفعه.'
                    : 'Download the prepared layout template, append your catalog rows, and save to re-upload.'}
                </p>
              </div>
              <button
                onClick={() => downloadCSVTemplate(entityType)}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2"
              >
                <Download className="h-4 w-4" />
                {isRtl ? 'تحميل قالب CSV' : 'Download Template'}
              </button>
            </div>

            {/* Upload File */}
            <div className="p-5 rounded-2xl bg-slate-500/5 border border-slate-500/10 space-y-4 flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-xs text-slate-600 dark:text-slate-400">{isRtl ? '2. رفع الملف المعد' : '2. Upload filled sheet'}</h4>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  {isRtl 
                    ? 'يدعم النظام استيراد ملفات CSV وملفات Excel المباشرة (.xlsx, .xls).'
                    : 'System accepts standard .csv format or multi-sheet Excel spreadsheet uploads (.xlsx, .xls).'}
                </p>
              </div>
              <label className="w-full py-2.5 rounded-xl border border-dashed border-slate-350 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2">
                <Upload className="h-4 w-4 text-slate-400" />
                <span>{fileName ? fileName : (isRtl ? 'اختر ملف CSV / Excel' : 'Choose CSV / Excel File')}</span>
                <input type="file" accept=".csv, .xlsx, .xls" className="hidden" onChange={handleFileUpload} />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Validate & Preview */}
      {step === 3 && (
        <div className="space-y-6">
          {/* Summary / Controls */}
          <div className="flex justify-between items-center glass-card p-4 rounded-2xl border border-slate-200/40 dark:border-slate-800/40" dir={isRtl ? 'rtl' : 'ltr'}>
            <div className="flex items-center gap-3">
              <span className={`px-2 py-1 rounded-lg text-xs font-bold ${errors.length > 0 ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                {errors.length > 0 
                  ? (isRtl ? `⚠️ وجد ${errors.length} أخطاء` : `⚠️ Found ${errors.length} errors`)
                  : (isRtl ? '✓ جاهز للاستيراد' : '✓ Ready to import')}
              </span>
              <span className="text-xs text-slate-400 font-bold font-mono">({parsedData.length} {isRtl ? 'صفاً مكتشفاً' : 'rows parsed'})</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setStep(2)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
              >
                {isRtl ? '← تغيير الملف' : '← Change File'}
              </button>
              <button
                onClick={handleImport}
                disabled={errors.length > 0 || importing}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md disabled:opacity-50 flex items-center gap-1.5"
              >
                {importing ? <span className="animate-spin">⟳</span> : <Play className="h-3.5 w-3.5" />}
                {isRtl ? 'تنفيذ الاستيراد الآن' : 'Execute Import'}
              </button>
            </div>
          </div>

          {/* Validation Errors Panel */}
          {errors.length > 0 && (
            <div className="p-4 bg-red-500/5 border border-red-500/15 rounded-2xl space-y-2 text-xs" dir={isRtl ? 'rtl' : 'ltr'}>
              <h4 className="font-bold text-red-500 flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4" />
                {isRtl ? 'قائمة الأخطاء المكتشفة في الملف (يجب إصلاحها أولاً):' : 'Validation Errors (requires correction):'}
              </h4>
              <div className="max-h-36 overflow-y-auto divide-y divide-red-500/10">
                {errors.map((err, idx) => (
                  <p key={idx} className="py-1 text-[11px] text-red-600 dark:text-red-400">
                    • {isRtl ? `الصف ${err.row} | العمود [${err.col}] : ${err.message}` : `Row ${err.row} | Col [${err.col}] : ${err.message}`}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Table Preview */}
          <div className="glass-card p-4 rounded-2xl border border-slate-200/40 dark:border-slate-800/40 overflow-hidden">
            <h4 className="font-bold text-xs text-slate-400 mb-3" dir={isRtl ? 'rtl' : 'ltr'}>📋 {isRtl ? 'معاينة البيانات قبل الحفظ:' : 'Data Sheet Preview:'}</h4>
            <div className="overflow-x-auto max-h-[300px]">
              <table className="w-full text-xs text-right" dir={isRtl ? 'rtl' : 'ltr'}>
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-850">
                    <th className="py-2 text-center text-slate-400 w-10">#</th>
                    {headers.map(h => (
                      <th key={h} className="py-2 px-3 font-bold text-slate-500 text-center">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-900">
                  {parsedData.slice(0, 100).map((row, idx) => {
                    const rowHasError = errors.some(e => e.row === idx + 2);
                    return (
                      <tr key={idx} className={`hover:bg-slate-50 dark:hover:bg-slate-900/50 ${rowHasError ? 'bg-red-500/5' : ''}`}>
                        <td className="py-2 text-center text-slate-400 font-mono">{idx + 2}</td>
                        {headers.map(h => {
                          const cellHasError = errors.some(e => e.row === idx + 2 && e.col === h);
                          return (
                            <td 
                              key={h} 
                              className={`py-2 px-3 text-center truncate max-w-[150px] font-medium ${
                                cellHasError ? 'text-red-500 border border-red-500/25 bg-red-500/5 font-bold' : ''
                              }`}
                            >
                              {row[h]}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {parsedData.length > 100 && (
              <p className="text-[10px] text-slate-400 text-center mt-3">* {isRtl ? 'يتم عرض أول 100 صف فقط للمعاينة.' : 'Previewing first 100 rows only.'}</p>
            )}
          </div>
        </div>
      )}

      {/* Step 4: Finished */}
      {step === 4 && (
        <div className="glass-card p-8 rounded-3xl border border-slate-200/40 dark:border-slate-800/40 text-center space-y-5 animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-500 text-3xl">
            ✓
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{isRtl ? 'تم استيراد البيانات بنجاح!' : 'Data Imported Successfully!'}</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              {isRtl 
                ? `تم كتابة وحفظ ${lastImportedIds?.ids.length} سجل في قاعدة البيانات المحلية المشفرة للمتجر.`
                : `Successfully verified and appended ${lastImportedIds?.ids.length} rows to the local secure databases.`}
            </p>
          </div>
          <div className="flex gap-2 justify-center max-w-xs mx-auto">
            <button
              onClick={handleRollback}
              className="flex-1 py-2 rounded-xl border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-500 text-xs font-bold transition-all"
            >
              {isRtl ? 'تراجع وحذف' : 'Rollback & Undo'}
            </button>
            <button
              onClick={() => {
                setParsedData([]);
                setFileName('');
                setStep(1);
              }}
              className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-sm"
            >
              {isRtl ? 'إنهاء واستيراد آخر' : 'Import More'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
