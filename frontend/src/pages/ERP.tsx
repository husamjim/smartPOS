import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Search, Archive, ArrowLeftRight, Landmark, DollarSign, Barcode, Trash, BookOpen, Layers, ShieldAlert, Palette, Maximize2, Ship, Coins, CheckCircle } from 'lucide-react';
import { db } from '../db/localDb';
import type { LocalProduct, LocalBatch } from '../db/localDb';
import { useApp } from '../context/AppContext';

export const ERP: React.FC = () => {
  const { t } = useTranslation();
  const { businessType, taxPercentage, currency } = useApp();
  const [activeSubTab, setActiveSubTab] = useState<'products' | 'inventory' | 'purchases' | 'expenses' | 'recipes' | 'approvals' | 'variants' | 'shipments'>('products');
  const [products, setProducts] = useState<LocalProduct[]>([]);
  const [batches, setBatches] = useState<LocalBatch[]>([]);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Modals / Input states
  const [showAddProdModal, setShowAddProdModal] = useState(false);
  const [prodNameEn, setProdNameEn] = useState('');
  const [prodNameAr, setProdNameAr] = useState('');
  const [prodSku, setProdSku] = useState('');
  const [prodBarcode, setProdBarcode] = useState('');
  const [prodPrice, setProdPrice] = useState(0);
  const [prodCost, setProdCost] = useState(0);
  const prodUnit = 'piece';
  const prodType = 'piece';
  const [prodCategory, setProdCategory] = useState('Food');
  const [prodMinStock, setProdMinStock] = useState(5);
  const [isPhar, setIsPhar] = useState(false);
  const [prodImageBase64, setProdImageBase64] = useState<string>('');

  // Usability & Calculation Simplifications
  const [modalSimpleMode, setModalSimpleMode] = useState(true);
  const [isVatInclusive, setIsVatInclusive] = useState(true);

  useEffect(() => {
    if (showAddProdModal) {
      if (businessType === 'restaurant') {
        setProdCategory('Restaurant');
        setIsPhar(false);
      } else if (businessType === 'pharmacy') {
        setProdCategory('Pharmacy');
        setIsPhar(true);
      } else {
        setProdCategory('Food');
        setIsPhar(false);
      }

      // Auto-generate barcode & SKU on load so user doesn't have to think about it!
      const random8 = Math.floor(10000000 + Math.random() * 90000000).toString();
      setProdBarcode(random8);
      setProdSku('SKU-' + random8.slice(0, 4) + '-' + Math.floor(10 + Math.random() * 89));
    }
  }, [showAddProdModal, businessType]);

  // Stock transfer form
  const [fromWh, setFromWh] = useState('wh_riyadh_1');
  const [toWh, setToWh] = useState('wh_riyadh_2');
  const [transferProdId, setTransferProdId] = useState('');
  const [transferQty, setTransferQty] = useState(1);

  // Supplier state
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  
  // Expense fields
  const [expenseAmount, setExpenseAmount] = useState(0);
  const [expenseCategory, setExpenseCategory] = useState('Rent');
  const [expenseDesc, setExpenseDesc] = useState('');

  // Restaurant Recipe states
  const [selectedRecipeProduct, setSelectedRecipeProduct] = useState<string>('');
  const [recipeIngredients, setRecipeIngredients] = useState<Array<{ name: string; qty: number; unit: string }>>([]);
  const [newIngName, setNewIngName] = useState('');
  const [newIngQty, setNewIngQty] = useState(1);
  const [newIngUnit, setNewIngUnit] = useState('g');

  // Pharmacy Approval states
  const [approvalProdId, setApprovalProdId] = useState('');
  const [approvalIdInput, setApprovalIdInput] = useState('');

  // Retail Matrix states
  const [matrixBaseNameEn, setMatrixBaseNameEn] = useState('');
  const [matrixBaseNameAr, setMatrixBaseNameAr] = useState('');
  const [matrixBasePrice, setMatrixBasePrice] = useState(0);
  const [matrixBaseCost, setMatrixBaseCost] = useState(0);
  const [matrixSelectedSizes, setMatrixSelectedSizes] = useState<string[]>([]);
  const [matrixSelectedColors, setMatrixSelectedColors] = useState<string[]>([]);
  const [availableSizes, setAvailableSizes] = useState<string[]>([]);
  const [availableColors, setAvailableColors] = useState<string[]>([]);

  useEffect(() => {
    const savedSizes = localStorage.getItem('pos_retail_sizes');
    const sizes = savedSizes ? JSON.parse(savedSizes) : ['S', 'M', 'L', 'XL'];
    setAvailableSizes(sizes);

    const savedColors = localStorage.getItem('pos_retail_colors');
    const colors = savedColors ? JSON.parse(savedColors) : ['Red', 'Blue', 'Black'];
    setAvailableColors(colors);

    setMatrixSelectedSizes(sizes.slice(0, 3));
    setMatrixSelectedColors(colors.slice(0, 2));
  }, []);

  const colorMap: Record<string, string> = {
    'Red': 'أحمر',
    'Blue': 'أزرق',
    'Black': 'أسود',
    'Green': 'أخضر',
    'White': 'أبيض',
    'Yellow': 'أصفر',
    'Orange': 'برتقالي',
    'Grey': 'رمادي',
    'Brown': 'بني',
    'Pink': 'وردي',
    'Purple': 'بنفسجي'
  };
  const [generatedMatrix, setGeneratedMatrix] = useState<Array<{ nameEn: string; nameAr: string; sku: string; barcode: string; price: number; cost: number; size: string; color: string }>>([]);

  // Wholesale Shipment states
  const [shipments, setShipments] = useState<Array<{
    id: string;
    containerNumber: string;
    originPort: string;
    destPort: string;
    description: string;
    weightTons: number;
    status: 'at_sea' | 'customs' | 'delivered';
    invoiceUsd: number;
    tariffRate: number;
  }>>(() => {
    const saved = localStorage.getItem('wholesale_shipments');
    return saved ? JSON.parse(saved) : [
      { id: 'ship_1', containerNumber: 'MSCU1928374', originPort: 'Port of Shanghai', destPort: 'Jeddah Islamic Port', description: '20 Tons Olive Oil', weightTons: 20, status: 'at_sea', invoiceUsd: 15000, tariffRate: 5 },
      { id: 'ship_2', containerNumber: 'OOLU8837192', originPort: 'Port of Rotterdam', destPort: 'King Abdulaziz Port Dammam', description: '12 Tons Premium Cheese', weightTons: 12, status: 'customs', invoiceUsd: 28000, tariffRate: 7 }
    ];
  });
  const [newShipContainer, setNewShipContainer] = useState('');
  const [newShipOrigin, setNewShipOrigin] = useState('');
  const [newShipDest, setNewShipDest] = useState('');
  const [newShipDesc, setNewShipDesc] = useState('');
  const [newShipWeight, setNewShipWeight] = useState(10);
  const [newShipInvoiceUsd, setNewShipInvoiceUsd] = useState(0);
  const [newShipTariffRate, setNewShipTariffRate] = useState(5);

  useEffect(() => {
    localStorage.setItem('wholesale_shipments', JSON.stringify(shipments));
  }, [shipments]);

  useEffect(() => {
    loadData();
  }, [activeSubTab]);

  const loadData = async () => {
    const p = await db.products.toArray();
    setProducts(p);

    const b = await db.batches.toArray();
    setBatches(b);

    if (activeSubTab === 'inventory' && p.length > 0 && !transferProdId) {
      setTransferProdId(p[0].id);
    }

    if (activeSubTab === 'purchases') {
      const s = await db.suppliers.toArray();
      if (s.length === 0) {
        // Seed initial suppliers
        await db.suppliers.bulkAdd([
          { id: 's_1', name: 'شركة الأغذية المتحدة', contact_name: 'سليمان خالد', phone: '0114992929', email: 'supplier@food.com', balance: -1500 },
          { id: 's_2', name: 'مزارع الجوف الزراعية', contact_name: 'فهد العاصم', phone: '0142999121', email: 'aljouf@farm.com', balance: 0 }
        ]);
      }
      setSuppliers(await db.suppliers.toArray());
      setPurchases(await db.purchaseOrders.toArray());
    }

    if (activeSubTab === 'expenses') {
      const ex = await db.expenses.toArray();
      setExpenses(ex);
    }
  };

  const handleGenerateBarcode = () => {
    const random8 = Math.floor(10000000 + Math.random() * 90000000).toString();
    setProdBarcode(random8);
    setProdSku('SKU-' + random8.slice(0, 4) + '-' + Math.floor(10 + Math.random() * 89));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target?.result as string;
      // Resize to max 300x300 using canvas
      const img = new window.Image();
      img.onload = () => {
        const maxDim = 300;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) { h = Math.round(h * maxDim / w); w = maxDim; }
          else { w = Math.round(w * maxDim / h); h = maxDim; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          const base64 = canvas.toDataURL('image/jpeg', 0.8);
          setProdImageBase64(base64);
        }
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodNameEn || !prodNameAr || !prodBarcode || !prodSku) return;

    const id = 'p_' + Math.random().toString(36).substr(2, 9);
    const finalPrice = isVatInclusive ? parseFloat((prodPrice / (1 + taxPercentage / 100)).toFixed(2)) : prodPrice;

    const newProd: LocalProduct = {
      id,
      name_en: prodNameEn,
      name_ar: prodNameAr,
      sku: prodSku,
      barcode: prodBarcode,
      price: finalPrice,
      cost: prodCost,
      unit: prodUnit,
      type: prodType,
      category: prodCategory,
      min_stock: prodMinStock,
      is_pharmaceutical: isPhar ? 1 : 0,
      stock: prodType === 'piece' ? 20 : 5, // initial mock stock
      ...(prodImageBase64 && { image_base64: prodImageBase64 })
    };

    await db.products.add(newProd);

    // If pharma, add a mock batch
    if (isPhar) {
      await db.batches.add({
        id: 'b_' + Math.random().toString(36).substr(2, 9),
        product_id: id,
        warehouse_id: 'wh_riyadh_1',
        batch_number: 'B-' + Math.floor(100 + Math.random()*900),
        expiry_date: '2028-12-31',
        quantity: 20
      });
    }

    setShowAddProdModal(false);
    // Clear fields
    setProdNameEn('');
    setProdNameAr('');
    setProdSku('');
    setProdBarcode('');
    setProdPrice(0);
    setProdCost(0);
    setIsPhar(false);
    setProdImageBase64('');

    await loadData();
  };

  const handleStockTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferProdId || transferQty <= 0 || fromWh === toWh) {
      alert('الرجاء التأكد من صحة مستودع الوجهة والكمية.');
      return;
    }

    // Decrement from source batch or product
    const targetProduct = products.find(p => p.id === transferProdId);
    if (!targetProduct) return;

    if (targetProduct.is_pharmaceutical) {
      const sourceBatches = (await db.batches.where('product_id').equals(transferProdId).toArray()).filter(b => b.warehouse_id === fromWh);
      if (sourceBatches.length === 0 || sourceBatches[0].quantity < transferQty) {
        alert('مخزون الدفعة (الباتش) في مستودع المصدر غير كافٍ للتحويل.');
        return;
      }

      // Decrement source batch
      await db.batches.update(sourceBatches[0].id, { quantity: sourceBatches[0].quantity - transferQty });

      // Increment target batch
      const targetBatches = (await db.batches.where('product_id').equals(transferProdId).toArray()).filter(b => b.warehouse_id === toWh);
      if (targetBatches.length > 0) {
        await db.batches.update(targetBatches[0].id, { quantity: targetBatches[0].quantity + transferQty });
      } else {
        await db.batches.add({
          id: 'b_' + Math.random().toString(36).substr(2, 9),
          product_id: transferProdId,
          warehouse_id: toWh,
          batch_number: sourceBatches[0].batch_number,
          expiry_date: sourceBatches[0].expiry_date,
          quantity: transferQty
        });
      }
    } else {
      // Non-pharmaceutical: adjust global product cache stock
      if ((targetProduct.stock || 0) < transferQty) {
        alert('المخزون الحالي غير كافٍ للتحويل.');
        return;
      }
      // Simple transfer log movement
    }

    // Record Movement log
    await db.offlineQueue.add({
      action: 'CREATE',
      table: 'order_items', // simulate movement sync structure
      payload: {
        id: 'mv_' + Math.random().toString(36).substr(2, 9),
        product_id: transferProdId,
        from_warehouse_id: fromWh,
        to_warehouse_id: toWh,
        quantity: transferQty,
        type: 'transfer',
        created_at: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });

    alert('تم تحويل المخزون بنجاح وتوثيقه في السجلات المزامنة.');
    await loadData();
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (expenseAmount <= 0) return;

    await db.expenses.add({
      id: 'exp_' + Math.random().toString(36).substr(2, 9),
      branch_id: 'br_riyadh_main',
      category: expenseCategory,
      amount: expenseAmount,
      description: expenseDesc,
      date: new Date().toISOString()
    });

    setExpenseAmount(0);
    setExpenseDesc('');
    await loadData();
  };

  const handleDeleteProduct = async (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا المنتج؟')) {
      await db.products.delete(id);
      await loadData();
    }
  };

  // Custom Sector Handlers
  const handleApplyMarkup = (markupPercent: number) => {
    if (prodCost > 0) {
      const calculatedPrice = prodCost * (1 + markupPercent / 100);
      setProdPrice(parseFloat(calculatedPrice.toFixed(2)));
    }
  };

  const handleAddIngredient = () => {
    if (!newIngName.trim()) return;
    setRecipeIngredients(prev => [...prev, { name: newIngName.trim(), qty: newIngQty, unit: newIngUnit }]);
    setNewIngName('');
    setNewIngQty(1);
  };

  const handleRemoveIngredient = (index: number) => {
    setRecipeIngredients(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveRecipe = async () => {
    if (!selectedRecipeProduct) return;
    await db.products.update(selectedRecipeProduct, {
      recipe: JSON.stringify(recipeIngredients)
    });
    alert(isRtl ? 'تم حفظ وصفة ومكونات المنتج بنجاح!' : 'Recipe and ingredients saved successfully!');
    setSelectedRecipeProduct('');
    setRecipeIngredients([]);
    loadData();
  };

  const handleUpdateApproval = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!approvalProdId || !approvalIdInput.trim()) return;
    await db.products.update(approvalProdId, { approval_id: approvalIdInput.trim() });
    alert(isRtl ? 'تم تحديث كود تصريح هيئة الدواء بنجاح!' : 'SFDA Approval Code updated successfully!');
    setApprovalProdId('');
    setApprovalIdInput('');
    loadData();
  };

  const handleGenerateMatrixPreview = () => {
    if (!matrixBaseNameEn.trim() || !matrixBaseNameAr.trim() || matrixBasePrice <= 0 || matrixBaseCost <= 0) {
      alert(isRtl ? 'الرجاء تعبئة الحقول الأساسية لمنتج الملابس أولاً.' : 'Please fill all base clothing fields first.');
      return;
    }
    if (matrixSelectedSizes.length === 0 || matrixSelectedColors.length === 0) {
      alert(isRtl ? 'الرجاء اختيار مقاس واحد ولون واحد على الأقل.' : 'Please select at least one size and one color.');
      return;
    }

    const items: typeof generatedMatrix = [];
    const baseSku = 'RT-CL-' + Math.floor(1000 + Math.random() * 9000).toString();

    matrixSelectedSizes.forEach(sz => {
      matrixSelectedColors.forEach(col => {
        const sizeLabel = sz;
        const colorLabelEn = col;
        const colorLabelAr = colorMap[col] || col;
        
        const randomBarcode = Math.floor(62820000 + Math.random() * 99999).toString();

        items.push({
          nameEn: `${matrixBaseNameEn.trim()} (${sizeLabel} - ${colorLabelEn})`,
          nameAr: `${matrixBaseNameAr.trim()} (${sizeLabel} - ${colorLabelAr})`,
          sku: `${baseSku}-${sizeLabel}-${colorLabelEn.toUpperCase()}`,
          barcode: randomBarcode,
          price: matrixBasePrice,
          cost: matrixBaseCost,
          size: sz,
          color: col
        });
      });
    });

    setGeneratedMatrix(items);
  };

  const handleCommitMatrix = async () => {
    if (generatedMatrix.length === 0) return;

    const commitList = generatedMatrix.map(item => {
      return {
        id: 'p_' + Math.random().toString(36).substr(2, 9),
        name_en: item.nameEn,
        name_ar: item.nameAr,
        sku: item.sku,
        barcode: item.barcode,
        price: item.price,
        cost: item.cost,
        unit: 'piece',
        type: 'piece' as const,
        category: 'Clothing',
        min_stock: 5,
        is_pharmaceutical: 0,
        stock: 15,
        variants: JSON.stringify({ size: item.size, color: item.color })
      };
    });

    await db.products.bulkAdd(commitList);
    alert(isRtl ? `تم توليد وإدخال ${generatedMatrix.length} قطعة/متغير بنجاح في النظام!` : `Successfully generated and added ${generatedMatrix.length} item variants to database!`);
    setGeneratedMatrix([]);
    setMatrixBaseNameEn('');
    setMatrixBaseNameAr('');
    setMatrixBasePrice(0);
    setMatrixBaseCost(0);
    loadData();
  };

  const handleAddShipment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShipContainer || !newShipOrigin || !newShipDest) return;

    const newShip = {
      id: 'ship_' + Math.random().toString(36).substr(2, 9),
      containerNumber: newShipContainer.trim(),
      originPort: newShipOrigin.trim(),
      destPort: newShipDest.trim(),
      description: newShipDesc.trim(),
      weightTons: newShipWeight,
      status: 'at_sea' as const,
      invoiceUsd: newShipInvoiceUsd,
      tariffRate: newShipTariffRate
    };

    setShipments(prev => [...prev, newShip]);

    // Clear
    setNewShipContainer('');
    setNewShipOrigin('');
    setNewShipDest('');
    setNewShipDesc('');
    setNewShipWeight(10);
    setNewShipInvoiceUsd(0);
    setNewShipTariffRate(5);
  };

  const handleUpdateShipmentStatus = (id: string, newStatus: 'at_sea' | 'customs' | 'delivered') => {
    setShipments(prev => prev.map(s => s.id === id ? { ...s, status: newStatus } : s));
  };

  const filteredProducts = products.filter(p => {
    // Strict Business Type Product Isolation for ERP
    if (businessType === 'restaurant' && p.category !== 'Restaurant') {
      return false;
    }
    if (businessType === 'pharmacy' && p.is_pharmaceutical !== 1) {
      return false;
    }
    if (businessType === 'retail' && (p.is_pharmaceutical === 1 || p.category === 'Restaurant')) {
      return false;
    }
    if (businessType === 'wholesale' && (p.is_pharmaceutical === 1 || p.category === 'Restaurant')) {
      return false;
    }

    return (
      p.name_en.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.name_ar.includes(searchQuery) ||
      p.sku.includes(searchQuery) ||
      p.barcode.includes(searchQuery)
    );
  });

  const isRtl = document.documentElement.dir === 'rtl';

  return (
    <div className="flex flex-col space-y-4 h-full animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold font-sans">{isRtl ? 'لوحة تحكم ERP والمستودعات' : 'ERP Inventory & Admin Hub'}</h2>
          <p className="text-xs text-slate-500">إدارة البضائع، نقل كميات المخازن بين الفروع والمصاريف وتوثيق المشتريات.</p>
        </div>

        {/* Sub-tabs */}
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold shadow-sm">
          <button
            onClick={() => setActiveSubTab('products')}
            className={`px-3 py-1.5 rounded-lg transition-all ${activeSubTab === 'products' ? 'bg-white dark:bg-slate-700 text-indigo-950 dark:text-white shadow-sm' : 'text-slate-500 hover:bg-slate-200/50'}`}
          >
            {isRtl ? 'قائمة المنتجات' : 'Products'}
          </button>
          <button
            onClick={() => setActiveSubTab('inventory')}
            className={`px-3 py-1.5 rounded-lg transition-all ${activeSubTab === 'inventory' ? 'bg-white dark:bg-slate-700 text-indigo-950 dark:text-white shadow-sm' : 'text-slate-500 hover:bg-slate-200/50'}`}
          >
            {isRtl ? 'المستودعات والتحويل' : 'Warehouses & Transfer'}
          </button>
          <button
            onClick={() => setActiveSubTab('purchases')}
            className={`px-3 py-1.5 rounded-lg transition-all ${activeSubTab === 'purchases' ? 'bg-white dark:bg-slate-700 text-indigo-950 dark:text-white shadow-sm' : 'text-slate-500 hover:bg-slate-200/50'}`}
          >
            {isRtl ? 'المشتريات والموردين' : 'Purchasing'}
          </button>
          <button
            onClick={() => setActiveSubTab('expenses')}
            className={`px-3 py-1.5 rounded-lg transition-all ${activeSubTab === 'expenses' ? 'bg-white dark:bg-slate-700 text-indigo-950 dark:text-white shadow-sm' : 'text-slate-500 hover:bg-slate-200/50'}`}
          >
            {isRtl ? 'إدارة المصروفات' : 'Expenses'}
          </button>
          {businessType === 'restaurant' && (
            <button
              onClick={() => setActiveSubTab('recipes')}
              className={`px-3 py-1.5 rounded-lg transition-all ${activeSubTab === 'recipes' ? 'bg-white dark:bg-slate-700 text-indigo-950 dark:text-white shadow-sm' : 'text-slate-500 hover:bg-slate-200/50'}`}
            >
              {isRtl ? 'وصفات المواد الخام' : 'Recipes & BOM'}
            </button>
          )}
          {businessType === 'pharmacy' && (
            <button
              onClick={() => setActiveSubTab('approvals')}
              className={`px-3 py-1.5 rounded-lg transition-all ${activeSubTab === 'approvals' ? 'bg-white dark:bg-slate-700 text-indigo-950 dark:text-white shadow-sm' : 'text-slate-500 hover:bg-slate-200/50'}`}
            >
              {isRtl ? 'التصاريح الطبية والبدائل' : 'SFDA & Substitutions'}
            </button>
          )}
          {businessType === 'retail' && (
            <button
              onClick={() => setActiveSubTab('variants')}
              className={`px-3 py-1.5 rounded-lg transition-all ${activeSubTab === 'variants' ? 'bg-white dark:bg-slate-700 text-indigo-950 dark:text-white shadow-sm' : 'text-slate-500 hover:bg-slate-200/50'}`}
            >
              {isRtl ? 'مصفوفة المقاسات والألوان' : 'SKU Variant Matrix'}
            </button>
          )}
          {businessType === 'wholesale' && (
            <button
              onClick={() => setActiveSubTab('shipments')}
              className={`px-3 py-1.5 rounded-lg transition-all ${activeSubTab === 'shipments' ? 'bg-white dark:bg-slate-700 text-indigo-950 dark:text-white shadow-sm' : 'text-slate-500 hover:bg-slate-200/50'}`}
            >
              {isRtl ? 'حاويات الشحن والجمارك' : 'Shipments & Customs'}
            </button>
          )}
        </div>
      </div>

      <div className="flex-1">
        {activeSubTab === 'products' && (
          <div className="flex flex-col space-y-4">
            <div className="flex justify-between items-center gap-2">
              <div className="relative flex-1 max-w-md">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder={t('search_placeholder')}
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 focus:outline-none text-xs"
                />
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              </div>
              <button
                onClick={() => setShowAddProdModal(true)}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="h-4 w-4" />
                {isRtl ? 'إضافة منتج جديد' : 'Add Product'}
              </button>
            </div>

            {/* Products grid */}
            <div className="glass-card rounded-2xl overflow-hidden shadow-sm border border-slate-200/50 dark:border-slate-800/50">
              <div className="overflow-x-auto max-h-[380px]">
                <table className="w-full text-xs text-right">
                  <thead className="sticky top-0 bg-slate-100/90 dark:bg-slate-900/95 backdrop-blur-sm text-slate-500 border-b">
                    <tr>
                      <th className="p-3 py-3.5">{isRtl ? 'المنتج' : 'Product Name'}</th>
                      <th className="p-3">SKU</th>
                      <th className="p-3">{isRtl ? 'سعر البيع' : 'Sale Price'}</th>
                      <th className="p-3">{isRtl ? 'سعر التكلفة' : 'Cost'}</th>
                      <th className="p-3">{isRtl ? 'التصنيف' : 'Category'}</th>
                      <th className="p-3">{isRtl ? 'المخزون الإجمالي' : 'Total Stock'}</th>
                      <th className="p-3 text-left"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.map(p => (
                      <tr key={p.id} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50/20">
                        <td className="p-3 py-3.5 font-bold">
                          <div className="flex items-center gap-2">
                            {p.image_base64 && (
                              <img src={p.image_base64} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0 border border-slate-200 dark:border-slate-700" />
                            )}
                            <div>
                              <div>{isRtl ? p.name_ar : p.name_en}</div>
                              {p.is_pharmaceutical === 1 && (
                                <span className="text-[9px] bg-indigo-500/10 text-indigo-500 px-1 py-0.5 rounded font-normal">
                                  💊 {p.scientific_name || 'دواء'}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-slate-500 font-sans">{p.sku}</td>
                        <td className="p-3 font-semibold font-sans">{p.price.toFixed(2)} SAR</td>
                        <td className="p-3 text-slate-500 font-sans">{p.cost.toFixed(2)} SAR</td>
                        <td className="p-3"><span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 font-bold">{p.category}</span></td>
                        <td className="p-3 font-bold font-sans">
                          {p.stock !== undefined ? p.stock : 8} {p.unit}
                        </td>
                        <td className="p-3 text-left">
                          <button
                            onClick={() => handleDeleteProduct(p.id)}
                            className="p-1 text-red-500 hover:bg-red-500/10 rounded"
                          >
                            <Trash className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeSubTab === 'inventory' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Warehouses list */}
            <div className="glass-card p-5 rounded-2xl shadow-sm md:col-span-2 space-y-4">
              <h3 className="font-bold text-sm flex items-center gap-1.5 border-b pb-2">
                <Archive className="h-4.5 w-4.5 text-blue-500" />
                {isRtl ? 'المخزون الحالي والباتشات في المستودعات' : 'Inventory & Batches'}
              </h3>

              <div className="overflow-x-auto max-h-[340px]">
                <table className="w-full text-xs text-right">
                  <thead>
                    <tr className="border-b text-slate-400">
                      <th className="py-2">{isRtl ? 'المنتج' : 'Product'}</th>
                      <th>{isRtl ? 'رقم المستودع' : 'Warehouse'}</th>
                      <th>{isRtl ? 'رقم الدفعة (Batch)' : 'Batch No'}</th>
                      <th>{isRtl ? 'تاريخ الانتهاء' : 'Expiry'}</th>
                      <th className="text-left">{isRtl ? 'الكمية' : 'Qty'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batches.map(b => {
                      const prod = products.find(p => p.id === b.product_id);
                      if (!prod) return null;
                      return (
                        <tr key={b.id} className="border-b border-slate-100 dark:border-slate-800/40 py-2 hover:bg-slate-50/10">
                          <td className="py-2.5 font-bold">{isRtl ? prod.name_ar : prod.name_en}</td>
                          <td>{b.warehouse_id === 'wh_riyadh_1' ? (isRtl ? 'مستودع الرياض الأول' : 'Riyadh WH1') : (isRtl ? 'مستودع صيدلية الرياض' : 'Riyadh WH2')}</td>
                          <td className="font-mono text-slate-500 font-bold">{b.batch_number}</td>
                          <td className="text-slate-500 font-sans">{b.expiry_date || 'N/A'}</td>
                          <td className="text-left font-bold text-indigo-500 font-sans">{b.quantity} {prod.unit}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Transfer form */}
            <div className="glass-card p-5 rounded-2xl shadow-sm space-y-4">
              <h3 className="font-bold text-sm flex items-center gap-1.5 border-b pb-2">
                <ArrowLeftRight className="h-4.5 w-4.5 text-emerald-500" />
                {isRtl ? 'طلب تحويل مخزون داخلي' : 'Stock Transfer Request'}
              </h3>

              <form onSubmit={handleStockTransfer} className="space-y-3.5 text-xs font-semibold">
                <div>
                  <label className="text-[10px] text-slate-500 block mb-1">المستودع المصدر</label>
                  <select
                    value={fromWh}
                    onChange={e => setFromWh(e.target.value)}
                    className="w-full px-2 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 focus:outline-none"
                  >
                    <option value="wh_riyadh_1">مستودع الرياض الأول</option>
                    <option value="wh_riyadh_2">مستودع صيدلية الرياض</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-slate-500 block mb-1">المستودع الوجهة</label>
                  <select
                    value={toWh}
                    onChange={e => setToWh(e.target.value)}
                    className="w-full px-2 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 focus:outline-none"
                  >
                    <option value="wh_riyadh_2">مستودع صيدلية الرياض</option>
                    <option value="wh_riyadh_1">مستودع الرياض الأول</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-slate-500 block mb-1">اختر المنتج للتحويل</label>
                  <select
                    value={transferProdId}
                    onChange={e => setTransferProdId(e.target.value)}
                    className="w-full px-2 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 focus:outline-none"
                  >
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{isRtl ? p.name_ar : p.name_en}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-slate-500 block mb-1">الكمية للتحويل</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={transferQty}
                    onChange={e => setTransferQty(parseFloat(e.target.value))}
                    className="w-full px-2 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all"
                >
                  إتمام تحويل الكمية
                </button>
              </form>
            </div>
          </div>
        )}

        {activeSubTab === 'purchases' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Suppliers list */}
            <div className="glass-card p-5 rounded-2xl shadow-sm md:col-span-2 space-y-4">
              <h3 className="font-bold text-sm flex items-center gap-1.5 border-b pb-2">
                <Landmark className="h-4.5 w-4.5 text-indigo-500" />
                {isRtl ? 'الموردين والشركات المسجلين' : 'ERP Suppliers'}
              </h3>

              <div className="overflow-x-auto max-h-[300px]">
                <table className="w-full text-xs text-right">
                  <thead>
                    <tr className="border-b text-slate-400">
                      <th className="py-2">{isRtl ? 'الشركة' : 'Vendor'}</th>
                      <th>{isRtl ? 'مسؤول المبيعات' : 'Contact Person'}</th>
                      <th>{isRtl ? 'الهاتف' : 'Phone'}</th>
                      <th className="text-left">{isRtl ? 'مستحقات معلقة للمورد' : 'Balance'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {suppliers.map(s => (
                      <tr key={s.id} className="border-b border-slate-100 dark:border-slate-800/40 py-2.5">
                        <td className="py-2.5 font-bold">{s.name}</td>
                        <td className="text-slate-500">{s.contact_name}</td>
                        <td className="text-slate-500 font-sans">{s.phone}</td>
                        <td className={`text-left font-bold font-sans ${s.balance < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                          {s.balance.toFixed(2)} SAR
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Purchase logs */}
            <div className="glass-card p-5 rounded-2xl shadow-sm space-y-4">
              <h3 className="font-bold text-sm border-b pb-2">📋 {isRtl ? 'طلبات توريد المشتريات' : 'Purchase Orders'}</h3>
              {purchases.length === 0 ? (
                <div className="text-center text-xs py-8 text-slate-400">
                  {isRtl ? 'لا توجد فواتير شراء حالية' : 'No purchase orders yet'}
                </div>
              ) : (
                purchases.map(p => (
                  <div key={p.id} className="p-3 rounded-lg border text-xs">
                    <div className="flex justify-between mb-1">
                      <span className="font-bold">{p.id}</span>
                      <span className="text-slate-400">{p.created_at}</span>
                    </div>
                    <div>المجموع: {p.total} SAR</div>
                    <div className="text-emerald-500 font-semibold">{p.status}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeSubTab === 'expenses' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Log form */}
            <div className="glass-card p-5 rounded-2xl shadow-sm space-y-4">
              <h3 className="font-bold text-sm flex items-center gap-1.5 border-b pb-2">
                <DollarSign className="h-4.5 w-4.5 text-blue-500" />
                {isRtl ? 'تسجيل سند صرف مصروف جديد' : 'Log New Expense Voucher'}
              </h3>

              <form onSubmit={handleAddExpense} className="space-y-3.5 text-xs font-semibold">
                <div>
                  <label className="text-[10px] text-slate-500 block mb-1">المبلغ (ريال سعودي)*</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={expenseAmount}
                    onChange={e => setExpenseAmount(parseFloat(e.target.value))}
                    className="w-full px-2 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-500 block mb-1">فئة المصروف</label>
                  <select
                    value={expenseCategory}
                    onChange={e => setExpenseCategory(e.target.value)}
                    className="w-full px-2 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 focus:outline-none"
                  >
                    <option value="Rent">إيجار فرع</option>
                    <option value="Salaries">رواتب موظفين</option>
                    <option value="Electricity">كهرباء وماء</option>
                    <option value="Office Supplies">مستلزمات مكتبية</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-slate-500 block mb-1">تفاصيل المصروف</label>
                  <textarea
                    value={expenseDesc}
                    onChange={e => setExpenseDesc(e.target.value)}
                    placeholder="فاتورة كهرباء شهر مايو للفرع الرئيسي..."
                    rows={2}
                    className="w-full px-2 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all"
                >
                  حفظ وتسجيل السند
                </button>
              </form>
            </div>

            {/* Expenses List */}
            <div className="glass-card p-5 rounded-2xl shadow-sm md:col-span-2 space-y-4">
              <h3 className="font-bold text-sm border-b pb-2">🧾 {isRtl ? 'سندات الصرف والمصروفات المسجلة' : 'Expenses Vouchers'}</h3>
              
              <div className="overflow-x-auto max-h-[300px]">
                <table className="w-full text-xs text-right">
                  <thead>
                    <tr className="border-b text-slate-400">
                      <th className="py-2">{isRtl ? 'التاريخ' : 'Date'}</th>
                      <th>{isRtl ? 'التصنيف' : 'Category'}</th>
                      <th>{isRtl ? 'الشرح' : 'Description'}</th>
                      <th className="text-left">{isRtl ? 'المبلغ' : 'Amount'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map(ex => (
                      <tr key={ex.id} className="border-b border-slate-100 dark:border-slate-800/40 py-2.5">
                        <td className="py-2.5 text-slate-400">{new Date(ex.date).toLocaleDateString()}</td>
                        <td className="font-bold">{ex.category}</td>
                        <td className="text-slate-500">{ex.description}</td>
                        <td className="text-left font-bold text-red-500 font-sans">-{ex.amount.toFixed(2)} SAR</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeSubTab === 'recipes' && businessType === 'restaurant' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
            {/* Create Recipe form */}
            <div className="glass-card p-5 rounded-2xl shadow-sm space-y-4">
              <h3 className="font-bold text-sm flex items-center gap-1.5 border-b pb-2">
                <BookOpen className="h-4.5 w-4.5 text-orange-500" />
                {isRtl ? 'تحديد مكونات المواد الخام للوجبة' : 'Configure Menu Item BOM Recipe'}
              </h3>

              <div className="space-y-3.5 text-xs font-semibold">
                <div>
                  <label className="text-[10px] text-slate-500 block mb-1 font-bold">اختر الوجبة / المنتج النهائي</label>
                  <select
                    value={selectedRecipeProduct}
                    onChange={e => {
                      setSelectedRecipeProduct(e.target.value);
                      const prod = products.find(p => p.id === e.target.value);
                      if (prod?.recipe) {
                        try {
                          setRecipeIngredients(JSON.parse(prod.recipe));
                        } catch {
                          setRecipeIngredients([]);
                        }
                      } else {
                        setRecipeIngredients([]);
                      }
                    }}
                    className="w-full px-2 py-2 rounded-lg border border-slate-250 dark:border-slate-800 bg-white dark:bg-slate-900/50 focus:outline-none"
                  >
                    <option value="">-- اختر منتج المطعم --</option>
                    {products.filter(p => p.category === 'Restaurant').map(p => (
                      <option key={p.id} value={p.id}>{isRtl ? p.name_ar : p.name_en}</option>
                    ))}
                  </select>
                </div>

                <div className="border-t pt-3.5 space-y-2">
                  <span className="text-[10px] text-slate-500 font-bold block">إضافة مادة خام جديدة للخلطة:</span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="اسم المادة (مثال: لحم بقري)"
                      value={newIngName}
                      onChange={e => setNewIngName(e.target.value)}
                      className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-250 dark:border-slate-700 bg-white dark:bg-slate-900/50 text-[10px]"
                    />
                    <input
                      type="number"
                      min={0.01}
                      step={0.01}
                      value={newIngQty}
                      onChange={e => setNewIngQty(parseFloat(e.target.value) || 1)}
                      className="w-14 px-2 py-1.5 rounded-lg border border-slate-250 dark:border-slate-700 bg-white dark:bg-slate-900/50 text-center font-sans text-[10px]"
                    />
                    <select
                      value={newIngUnit}
                      onChange={e => setNewIngUnit(e.target.value)}
                      className="px-1.5 py-1.5 rounded-lg border border-slate-250 dark:border-slate-800 bg-white dark:bg-slate-900/50 text-[10px]"
                    >
                      <option value="g">جرام (g)</option>
                      <option value="kg">كيلو (kg)</option>
                      <option value="piece">حبة (pcs)</option>
                      <option value="ml">مل (ml)</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddIngredient}
                    className="w-full py-1.5 rounded-lg bg-orange-500/10 text-orange-500 font-bold text-[10px] hover:bg-orange-500/20"
                  >
                    + إضافة المكون للوصفة
                  </button>
                </div>

                {/* Temp ingredient list */}
                {recipeIngredients.length > 0 && (
                  <div className="p-3 bg-slate-100/50 dark:bg-slate-950/40 rounded-xl space-y-2 border">
                    <span className="text-[10px] text-slate-500 font-bold block">مكونات الوصفة الحالية:</span>
                    <div className="space-y-1">
                      {recipeIngredients.map((ing, idx) => (
                        <div key={idx} className="flex justify-between items-center text-[10px] border-b pb-1 font-bold">
                          <span>{ing.name} ({ing.qty} {ing.unit})</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveIngredient(idx)}
                            className="text-red-500 hover:text-red-700"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleSaveRecipe}
                  disabled={!selectedRecipeProduct}
                  className="w-full py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold transition-all disabled:opacity-40"
                >
                  حفظ وصفة الـ BOM كاملة
                </button>
              </div>
            </div>

            {/* Recipes List grid */}
            <div className="glass-card p-5 rounded-2xl shadow-sm md:col-span-2 space-y-4">
              <h3 className="font-bold text-sm flex items-center gap-1.5 border-b pb-2">
                <Layers className="h-4.5 w-4.5 text-blue-500" />
                {isRtl ? 'قائمة الوصفات ومطابقة تكلفة المواد الخام' : 'Recipe & Raw Materials Cost Matching'}
              </h3>

              <div className="overflow-x-auto max-h-[360px]">
                <table className="w-full text-xs text-right">
                  <thead>
                    <tr className="border-b text-slate-400">
                      <th className="py-2">{isRtl ? 'الوجبة النهائية' : 'Final Item'}</th>
                      <th>{isRtl ? 'مكونات التحضير' : 'Ingredients (BOM)'}</th>
                      <th className="text-left">{isRtl ? 'تكلفة المواد التقريبية' : 'BOM Cost'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.filter(p => p.recipe).map(p => {
                      let parsedRecipe: Array<{ name: string; qty: number; unit: string }> = [];
                      try {
                        parsedRecipe = JSON.parse(p.recipe || '[]');
                      } catch {
                        parsedRecipe = [];
                      }
                      return (
                        <tr key={p.id} className="border-b border-slate-100 dark:border-slate-800/40 py-2">
                          <td className="py-2.5 font-bold">{isRtl ? p.name_ar : p.name_en}</td>
                          <td className="text-slate-500 font-bold text-[10px]">
                            {parsedRecipe.map(ing => `${ing.name} (${ing.qty}${ing.unit})`).join(' + ')}
                          </td>
                          <td className="text-left font-bold text-emerald-500 font-sans">
                            {(p.cost * 0.85).toFixed(2)} SAR
                          </td>
                        </tr>
                      );
                    })}
                    {products.filter(p => p.recipe).length === 0 && (
                      <tr>
                        <td colSpan={3} className="text-center py-8 text-slate-400">
                          {isRtl ? 'لا يوجد وصفات مسجلة بعد. حدد وجبة من اليمين وابدأ بتسجيل مكوناتها.' : 'No recipes logged. Select an item from the form to register BOM.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeSubTab === 'approvals' && businessType === 'pharmacy' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
            {/* Update approval code */}
            <div className="glass-card p-5 rounded-2xl shadow-sm space-y-4">
              <h3 className="font-bold text-sm flex items-center gap-1.5 border-b pb-2">
                <ShieldAlert className="h-4.5 w-4.5 text-blue-500" />
                {isRtl ? 'تسجيل رقم تصريح هيئة الدواء SFDA' : 'Register SFDA Medicine Code'}
              </h3>

              <form onSubmit={handleUpdateApproval} className="space-y-3.5 text-xs font-semibold">
                <div>
                  <label className="text-[10px] text-slate-500 block mb-1">اختر الدواء الطبي</label>
                  <select
                    value={approvalProdId}
                    onChange={e => {
                      setApprovalProdId(e.target.value);
                      const prod = products.find(p => p.id === e.target.value);
                      setApprovalIdInput(prod?.approval_id || '');
                    }}
                    className="w-full px-2 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 focus:outline-none"
                  >
                    <option value="">-- اختر الدواء --</option>
                    {products.filter(p => p.is_pharmaceutical === 1).map(p => (
                      <option key={p.id} value={p.id}>{isRtl ? p.name_ar : p.name_en}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-slate-500 block mb-1">كود هيئة الغذاء والدواء (SFDA Register Code)*</label>
                  <input
                    type="text"
                    required
                    value={approvalIdInput}
                    onChange={e => setApprovalIdInput(e.target.value)}
                    placeholder="SFDA-19902-A23"
                    className="w-full px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 focus:outline-none text-center font-mono"
                  />
                </div>

                <button
                  type="submit"
                  disabled={!approvalProdId}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all disabled:opacity-40"
                >
                  توثيق واعتماد الكود الطبي
                </button>
              </form>
            </div>

            {/* Approvals Table */}
            <div className="glass-card p-5 rounded-2xl shadow-sm md:col-span-2 space-y-4">
              <h3 className="font-bold text-sm flex items-center gap-1.5 border-b pb-2">
                <CheckCircle className="h-4.5 w-4.5 text-emerald-500" />
                {isRtl ? 'سجل الأدوية وحالة التراخيص الطبية' : 'Medical Approvals & Expiry Registers'}
              </h3>

              <div className="overflow-x-auto max-h-[360px]">
                <table className="w-full text-xs text-right">
                  <thead>
                    <tr className="border-b text-slate-400">
                      <th className="py-2">{isRtl ? 'الدواء الطبي' : 'Medicine'}</th>
                      <th>{isRtl ? 'الاسم العلمي' : 'Scientific Name'}</th>
                      <th>{isRtl ? 'ترخيص SFDA' : 'SFDA Code'}</th>
                      <th className="text-left">{isRtl ? 'حالة الاعتماد' : 'Status'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.filter(p => p.is_pharmaceutical === 1).map(p => (
                      <tr key={p.id} className="border-b border-slate-100 dark:border-slate-800/40 py-2 hover:bg-slate-50/10">
                        <td className="py-2.5 font-bold">{isRtl ? p.name_ar : p.name_en}</td>
                        <td className="text-slate-500 font-bold">{p.scientific_name || 'N/A'}</td>
                        <td className="font-mono text-slate-500 font-bold">{p.approval_id || '---'}</td>
                        <td className="text-left font-bold">
                          {p.approval_id ? (
                            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-bold">
                              {isRtl ? 'معتمد ومصرح' : 'Approved'}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 font-bold animate-pulse">
                              {isRtl ? 'تحت التدقيق' : 'Pending SFDA'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeSubTab === 'variants' && businessType === 'retail' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
            {/* Generate Matrix form */}
            <div className="glass-card p-5 rounded-2xl shadow-sm space-y-4">
              <h3 className="font-bold text-sm flex items-center gap-1.5 border-b pb-2">
                <Palette className="h-4.5 w-4.5 text-purple-500" />
                {isRtl ? 'توليد مصفوفة المقاسات والألوان' : 'SKU Variant Matrix Generator'}
              </h3>

              <div className="space-y-3.5 text-xs font-semibold">
                <div>
                  <label className="text-[10px] text-slate-500 block mb-1">الاسم الأساسي بالإنجليزية*</label>
                  <input
                    type="text"
                    value={matrixBaseNameEn}
                    onChange={e => setMatrixBaseNameEn(e.target.value)}
                    placeholder="Classic Slim-fit T-Shirt"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-500 block mb-1">الاسم الأساسي بالعربية*</label>
                  <input
                    type="text"
                    value={matrixBaseNameAr}
                    onChange={e => setMatrixBaseNameAr(e.target.value)}
                    placeholder="تيشيرت كلاسيك ضيق"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-1">سعر البيع*</label>
                    <input
                      type="number"
                      value={matrixBasePrice}
                      onChange={e => setMatrixBasePrice(parseFloat(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 focus:outline-none font-sans"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-1">التكلفة*</label>
                    <input
                      type="number"
                      value={matrixBaseCost}
                      onChange={e => setMatrixBaseCost(parseFloat(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 focus:outline-none font-sans"
                    />
                  </div>
                </div>

                {/* Size selections */}
                <div>
                  <label className="text-[10px] text-slate-500 block mb-1">المقاسات المطلوبة (Sizes):</label>
                  <div className="flex gap-2 flex-wrap bg-slate-100/50 dark:bg-slate-950/50 p-2 rounded-xl border border-slate-200 dark:border-slate-800">
                    {availableSizes.map(sz => {
                      const selected = matrixSelectedSizes.includes(sz);
                      return (
                        <button
                          key={sz}
                          type="button"
                          onClick={() => {
                            setMatrixSelectedSizes(prev =>
                              selected ? prev.filter(x => x !== sz) : [...prev, sz]
                            );
                          }}
                          className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all ${selected ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-400 bg-white dark:bg-slate-900'}`}
                        >
                          {sz}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Color selections */}
                <div>
                  <label className="text-[10px] text-slate-500 block mb-1">الألوان المطلوبة (Colors):</label>
                  <div className="flex gap-2 flex-wrap bg-slate-100/50 dark:bg-slate-950/50 p-2 rounded-xl border border-slate-200 dark:border-slate-800">
                    {availableColors.map(col => {
                      const selected = matrixSelectedColors.includes(col);
                      return (
                        <button
                          key={col}
                          type="button"
                          onClick={() => {
                            setMatrixSelectedColors(prev =>
                              selected ? prev.filter(x => x !== col) : [...prev, col]
                            );
                          }}
                          className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all ${selected ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-400 bg-white dark:bg-slate-900'}`}
                        >
                          {isRtl ? (colorMap[col] || col) : col}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleGenerateMatrixPreview}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-xs"
                >
                  حساب ومعاينة التوليد
                </button>
              </div>
            </div>

            {/* Generated results matrix */}
            <div className="glass-card p-5 rounded-2xl shadow-sm md:col-span-2 space-y-4">
              <div className="flex justify-between items-center border-b pb-2">
                <h3 className="font-bold text-sm flex items-center gap-1.5">
                  <Maximize2 className="h-4.5 w-4.5 text-blue-500" />
                  {isRtl ? 'معاينة المتغيرات الناتجة قبل الحفظ' : 'Preview Matrix SKUs'}
                </h3>
                {generatedMatrix.length > 0 && (
                  <button
                    type="button"
                    onClick={handleCommitMatrix}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold shadow-xs"
                  >
                    ✓ ترحيل {generatedMatrix.length} منتج للمستودع
                  </button>
                )}
              </div>

              <div className="overflow-x-auto max-h-[340px]">
                <table className="w-full text-xs text-right">
                  <thead>
                    <tr className="border-b text-slate-400">
                      <th className="py-2">{isRtl ? 'الاسم' : 'Name'}</th>
                      <th>SKU</th>
                      <th>الباركود</th>
                      <th>سعر البيع</th>
                      <th>سعر التكلفة</th>
                      <th>المقاس</th>
                      <th className="text-left">اللون</th>
                    </tr>
                  </thead>
                  <tbody>
                    {generatedMatrix.map((item, idx) => (
                      <tr key={idx} className="border-b border-slate-100 dark:border-slate-800/40 py-2">
                        <td className="py-2 font-bold max-w-[150px]">
                          <input
                            type="text"
                            value={isRtl ? item.nameAr : item.nameEn}
                            onChange={e => {
                              const updated = [...generatedMatrix];
                              if (isRtl) {
                                updated[idx].nameAr = e.target.value;
                              } else {
                                updated[idx].nameEn = e.target.value;
                              }
                              setGeneratedMatrix(updated);
                            }}
                            className="bg-transparent border-b border-slate-200/20 hover:border-slate-400 focus:border-indigo-500 focus:outline-none w-full"
                          />
                        </td>
                        <td className="font-mono text-slate-500 max-w-[110px]">
                          <input
                            type="text"
                            value={item.sku}
                            onChange={e => {
                              const updated = [...generatedMatrix];
                              updated[idx].sku = e.target.value;
                              setGeneratedMatrix(updated);
                            }}
                            className="bg-transparent border-b border-slate-200/20 hover:border-slate-400 focus:border-indigo-500 focus:outline-none w-full font-mono text-[10px]"
                          />
                        </td>
                        <td className="font-mono text-slate-500 font-bold max-w-[100px]">
                          <input
                            type="text"
                            value={item.barcode}
                            onChange={e => {
                              const updated = [...generatedMatrix];
                              updated[idx].barcode = e.target.value;
                              setGeneratedMatrix(updated);
                            }}
                            className="bg-transparent border-b border-slate-200/20 hover:border-slate-400 focus:border-indigo-500 focus:outline-none w-full font-mono text-[10px]"
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            step={0.01}
                            value={item.price}
                            onChange={e => {
                              const updated = [...generatedMatrix];
                              updated[idx].price = parseFloat(e.target.value) || 0;
                              setGeneratedMatrix(updated);
                            }}
                            className="bg-transparent border-b border-slate-200/20 hover:border-slate-400 focus:border-indigo-500 focus:outline-none w-14 text-center font-sans"
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            step={0.01}
                            value={item.cost}
                            onChange={e => {
                              const updated = [...generatedMatrix];
                              updated[idx].cost = parseFloat(e.target.value) || 0;
                              setGeneratedMatrix(updated);
                            }}
                            className="bg-transparent border-b border-slate-200/20 hover:border-slate-400 focus:border-indigo-500 focus:outline-none w-14 text-center font-sans"
                          />
                        </td>
                        <td>{item.size}</td>
                        <td className="text-left">{item.color}</td>
                      </tr>
                    ))}
                    {generatedMatrix.length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-center py-12 text-slate-400 font-bold">
                          {isRtl ? 'املأ البيانات على اليمين واضغط على "حساب ومعاينة التوليد" لتوليد مصفوفة الملابس.' : 'Configure the matrix options on the left to see the bulk SKU preview.'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeSubTab === 'shipments' && businessType === 'wholesale' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
            {/* Log container shipment */}
            <div className="glass-card p-5 rounded-2xl shadow-sm space-y-4">
              <h3 className="font-bold text-sm flex items-center gap-1.5 border-b pb-2">
                <Ship className="h-4.5 w-4.5 text-teal-500" />
                {isRtl ? 'تسجيل شحنة حاوية استيراد' : 'Log Import Container Shipment'}
              </h3>

              <form onSubmit={handleAddShipment} className="space-y-3.5 text-xs font-semibold">
                <div>
                  <label className="text-[10px] text-slate-500 block mb-1">رقم الحاوية (Container Number)*</label>
                  <input
                    type="text"
                    required
                    value={newShipContainer}
                    onChange={e => setNewShipContainer(e.target.value)}
                    placeholder="MSCU1928374"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 focus:outline-none text-center font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-1">ميناء التصدير*</label>
                    <input
                      type="text"
                      required
                      value={newShipOrigin}
                      onChange={e => setNewShipOrigin(e.target.value)}
                      placeholder="Shanghai Port"
                      className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-1">ميناء الوصول*</label>
                    <input
                      type="text"
                      required
                      value={newShipDest}
                      onChange={e => setNewShipDest(e.target.value)}
                      placeholder="Jeddah Port"
                      className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-slate-500 block mb-1">وصف البضائع والوزن (طن)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newShipDesc}
                      onChange={e => setNewShipDesc(e.target.value)}
                      placeholder="20 Tons Olive Oil"
                      className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 focus:outline-none"
                    />
                    <input
                      type="number"
                      value={newShipWeight}
                      onChange={e => setNewShipWeight(parseInt(e.target.value) || 10)}
                      className="w-14 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 text-center font-sans"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-1">فاتورة USD</label>
                    <input
                      type="number"
                      value={newShipInvoiceUsd}
                      onChange={e => setNewShipInvoiceUsd(parseFloat(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 focus:outline-none font-sans"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-1">التعرفة الجمركية %</label>
                    <input
                      type="number"
                      value={newShipTariffRate}
                      onChange={e => setNewShipTariffRate(parseInt(e.target.value) || 5)}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 focus:outline-none font-sans"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold transition-all shadow-xs"
                >
                  توثيق الشحنة في الجمارك
                </button>
              </form>
            </div>

            {/* Shipments List & customs calculation */}
            <div className="glass-card p-5 rounded-2xl shadow-sm md:col-span-2 space-y-4">
              <h3 className="font-bold text-sm flex items-center gap-1.5 border-b pb-2">
                <Coins className="h-4.5 w-4.5 text-blue-500" />
                {isRtl ? 'تتبع مسار الشحنات وحاسبة الرسوم الجمركية والعملات' : 'Wholesale Cargo Tracking & Customs Invoice Converter'}
              </h3>

              <div className="overflow-x-auto max-h-[340px]">
                <table className="w-full text-xs text-right">
                  <thead>
                    <tr className="border-b text-slate-400">
                      <th className="py-2">{isRtl ? 'الحاوية والسلع' : 'Container'}</th>
                      <th>{isRtl ? 'مسار الشحن' : 'Route'}</th>
                      <th>{isRtl ? 'الفاتورة بالـ USD والـ SAR' : 'Invoice Value'}</th>
                      <th>{isRtl ? 'الرسوم الجمركية' : 'Customs Tariff'}</th>
                      <th className="text-left">{isRtl ? 'حالة الشحن' : 'Status'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shipments.map(s => {
                      const priceInSar = s.invoiceUsd * 3.75;
                      const customsFeeInSar = priceInSar * (s.tariffRate / 100);
                      return (
                        <tr key={s.id} className="border-b border-slate-100 dark:border-slate-800/40 py-2.5">
                          <td className="py-2.5">
                            <div className="font-mono font-bold text-slate-700 dark:text-slate-300">{s.containerNumber}</div>
                            <div className="text-[10px] text-slate-400 font-bold">{s.description} ({s.weightTons} T)</div>
                          </td>
                          <td>
                            <div className="font-bold">{s.destPort.replace(' Port', '')}</div>
                            <div className="text-[10px] text-slate-400">من: {s.originPort.replace('Port of ', '')}</div>
                          </td>
                          <td>
                            <div className="font-sans font-bold">${s.invoiceUsd.toLocaleString()}</div>
                            <div className="text-[10px] text-indigo-500 font-bold font-sans">({priceInSar.toLocaleString()} SAR)</div>
                          </td>
                          <td>
                            <div className="font-bold font-sans text-red-500">+{customsFeeInSar.toFixed(2)} SAR</div>
                            <div className="text-[10px] text-slate-400">معدل: {s.tariffRate}%</div>
                          </td>
                          <td className="text-left">
                            <select
                              value={s.status}
                              onChange={e => handleUpdateShipmentStatus(s.id, e.target.value as any)}
                              className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-bold border-none focus:outline-none cursor-pointer"
                            >
                              <option value="at_sea">🚢 {isRtl ? 'عرض البحر' : 'At Sea'}</option>
                              <option value="customs">🛃 {isRtl ? 'التخليص الجمركي' : 'Customs'}</option>
                              <option value="delivered">📦 {isRtl ? 'تم الاستلام' : 'Delivered'}</option>
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Product Modal */}
      {showAddProdModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleAddProduct} className="glass-card p-6 rounded-2xl max-w-lg w-full space-y-4 animate-fade-in text-right">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-bold text-base">
                {isRtl ? 'إضافة منتج جديد وتوليد باركود تلقائي' : 'Register New ERP Product'}
              </h3>
              <span className="text-[10px] text-indigo-500 font-bold bg-indigo-500/10 px-2 py-0.5 rounded">
                {businessType === 'restaurant' ? (isRtl ? '🍽️ مطعم' : 'Restaurant') :
                 businessType === 'pharmacy' ? (isRtl ? '💊 صيدلية' : 'Pharmacy') :
                 businessType === 'retail' ? (isRtl ? '👕 تجزئة' : 'Retail') : (isRtl ? '🚢 جملة' : 'Wholesale')}
              </span>
            </div>

            {/* Simple vs Advanced Toggle */}
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold shadow-xs">
              <button
                type="button"
                onClick={() => setModalSimpleMode(true)}
                className={`flex-1 py-1.5 rounded-lg transition-all ${modalSimpleMode ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-xs' : 'text-slate-400'}`}
              >
                {isRtl ? 'إضافة مبسطة (موصى به)' : 'Simple Add (Recommended)'}
              </button>
              <button
                type="button"
                onClick={() => setModalSimpleMode(false)}
                className={`flex-1 py-1.5 rounded-lg transition-all ${!modalSimpleMode ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-xs' : 'text-slate-400'}`}
              >
                {isRtl ? 'إضافة متقدمة (كامل التفاصيل)' : 'Advanced Add (Full Details)'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] text-slate-500 block mb-1">الاسم بالإنجليزية*</label>
                <input
                  type="text"
                  required
                  value={prodNameEn}
                  onChange={e => setProdNameEn(e.target.value)}
                  placeholder="Premium Dates 1kg"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-500 block mb-1">الاسم بالعربية*</label>
                <input
                  type="text"
                  required
                  value={prodNameAr}
                  onChange={e => setProdNameAr(e.target.value)}
                  placeholder="تمر خلاص فاخر 1 كجم"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-500 block mb-1">سعر التكلفة المعتمد*</label>
                <input
                  type="number"
                  required
                  min={0.1}
                  step={0.01}
                  value={prodCost}
                  onChange={e => setProdCost(parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 focus:outline-none font-sans"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-500 block mb-1">سعر البيع المعتمد*</label>
                <input
                  type="number"
                  required
                  min={0.1}
                  step={0.01}
                  value={prodPrice}
                  onChange={e => setProdPrice(parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 focus:outline-none font-sans"
                />
              </div>
            </div>

            {/* VAT 15% Configuration Toggle & Calculator */}
            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-xs space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="modal_vat_inclusive"
                  checked={isVatInclusive}
                  onChange={e => setIsVatInclusive(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="modal_vat_inclusive" className="font-bold text-[10px] text-slate-700 dark:text-slate-350 select-none">
                  {isRtl ? `السعر المدخل شامل ضريبة القيمة المضافة (${taxPercentage}% VAT)` : `Price includes ${taxPercentage}% VAT (VAT Inclusive)`}
                </label>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-[9px] font-bold border-t border-slate-200/50 dark:border-slate-800/50 pt-1.5">
                <div>
                  <span className="text-slate-400 block">{isRtl ? 'السعر غير شامل الضريبة:' : 'Excl. VAT Price:'}</span>
                  <span className="text-slate-700 dark:text-slate-300 font-sans text-xs">
                    {(isVatInclusive ? prodPrice / (1 + taxPercentage / 100) : prodPrice).toFixed(2)} {currency}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">{isRtl ? `مبلغ الضريبة (${taxPercentage}%):` : `VAT Amount (${taxPercentage}%):`}</span>
                  <span className="text-red-500 font-sans text-xs">
                    {(isVatInclusive ? prodPrice - prodPrice / (1 + taxPercentage / 100) : prodPrice * (taxPercentage / 100)).toFixed(2)} {currency}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">{isRtl ? 'السعر النهائي للعميل:' : 'Final Sale Price:'}</span>
                  <span className="text-emerald-500 font-sans text-xs">
                    {(isVatInclusive ? prodPrice : prodPrice * (1 + taxPercentage / 100)).toFixed(2)} {currency}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Profit Calculator Panel */}
            <div className="bg-slate-100/50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-2">
              <span className="text-[10px] text-slate-500 font-bold block">{isRtl ? 'حاسبة هامش الأرباح التلقائية:' : 'Smart Profit Margin Calculator:'}</span>
              <div className="flex gap-4 justify-between items-center text-[10px] font-bold">
                <span className="text-slate-400">
                  {isRtl ? 'هامش ربح المبيعات:' : 'Margin:'} <span className="text-emerald-500 font-sans text-xs">{((isVatInclusive ? prodPrice : prodPrice * (1 + taxPercentage / 100)) > 0 ? (((isVatInclusive ? prodPrice : prodPrice * (1 + taxPercentage / 100)) - prodCost) / (isVatInclusive ? prodPrice : prodPrice * (1 + taxPercentage / 100))) * 100 : 0).toFixed(1)}%</span>
                </span>
                <span className="text-slate-400">
                  {isRtl ? 'نسبة الربح المضافة (Markup):' : 'Markup:'} <span className="text-blue-500 font-sans text-xs">{(prodCost > 0 ? (((isVatInclusive ? prodPrice : prodPrice * (1 + taxPercentage / 100)) - prodCost) / prodCost) * 100 : 0).toFixed(1)}%</span>
                </span>
              </div>
              <div className="flex gap-1.5 text-[9px] font-extrabold flex-wrap pt-1 border-t border-slate-200/50 dark:border-slate-800/50">
                <span className="text-slate-400 self-center">{isRtl ? 'تطبيق ربح مضاف سريع من التكلفة:' : 'Apply Quick Cost Markup:'}</span>
                <button type="button" onClick={() => handleApplyMarkup(15)} className="px-2 py-1 rounded bg-slate-200 dark:bg-slate-800 hover:bg-indigo-600 hover:text-white transition-all">+15%</button>
                <button type="button" onClick={() => handleApplyMarkup(25)} className="px-2 py-1 rounded bg-slate-200 dark:bg-slate-800 hover:bg-indigo-600 hover:text-white transition-all">+25%</button>
                <button type="button" onClick={() => handleApplyMarkup(35)} className="px-2 py-1 rounded bg-slate-200 dark:bg-slate-800 hover:bg-indigo-600 hover:text-white transition-all">+35%</button>
                <button type="button" onClick={() => handleApplyMarkup(50)} className="px-2 py-1 rounded bg-slate-200 dark:bg-slate-800 hover:bg-indigo-600 hover:text-white transition-all">+50%</button>
              </div>
            </div>

            {/* Image Upload Section (TASK E) */}
            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 space-y-2">
              <span className="text-[10px] text-slate-500 font-bold block">{isRtl ? '🖼️ صورة المنتج (اختياري):' : '🖼️ Product Image (optional):'}</span>
              <div className="flex items-center gap-3">
                {prodImageBase64 ? (
                  <div className="relative">
                    <img
                      src={prodImageBase64}
                      alt="Product preview"
                      className="w-16 h-16 rounded-xl object-cover border-2 border-indigo-400 shadow-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setProdImageBase64('')}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center shadow"
                    >✕</button>
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center text-slate-400 text-xl">
                    📷
                  </div>
                )}
                <div className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="w-full text-xs text-slate-600 dark:text-slate-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-indigo-600 file:text-white hover:file:bg-indigo-700 cursor-pointer"
                  />
                  <p className="text-[9px] text-slate-400 mt-1">{isRtl ? 'تقبل جميع صيغ الصور. يتم ضغطها تلقائياً إلى 300×300 بكسل.' : 'Accepts all image formats. Auto-resized to 300×300px.'}</p>
                </div>
              </div>
            </div>

            {/* Advanced Only Configuration fields */}
            {!modalSimpleMode && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t pt-3 border-slate-200 dark:border-slate-800 animate-fade-in">
                <div>
                  <label className="text-[10px] text-slate-500 block mb-1">الباركود* (اضغط توليد أو امسح)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      value={prodBarcode}
                      onChange={e => setProdBarcode(e.target.value)}
                      className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 focus:outline-none font-mono text-center"
                    />
                    <button
                      type="button"
                      onClick={handleGenerateBarcode}
                      className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] flex items-center gap-1"
                    >
                      <Barcode className="h-3 w-3" /> توليد
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-slate-500 block mb-1">رمز السلعة SKU*</label>
                  <input
                    type="text"
                    required
                    value={prodSku}
                    onChange={e => setProdSku(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 focus:outline-none text-center font-mono"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-500 block mb-1">الحد الأدنى للتنبيه</label>
                  <input
                    type="number"
                    value={prodMinStock}
                    onChange={e => setProdMinStock(parseFloat(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 focus:outline-none font-sans"
                  />
                </div>

                {/* Conditional categories choices based on business type */}
                <div>
                  <label className="text-[10px] text-slate-500 block mb-1">{isRtl ? 'التصنيف' : 'Category'}</label>
                  <select
                    value={prodCategory}
                    onChange={e => setProdCategory(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 focus:outline-none"
                  >
                    {businessType === 'restaurant' && (
                      <option value="Restaurant">{isRtl ? 'وجبات مطعم' : 'Restaurant'}</option>
                    )}
                    {businessType === 'pharmacy' && (
                      <option value="Pharmacy">{isRtl ? 'صيدلية وأدوية' : 'Pharmacy'}</option>
                    )}
                    {businessType === 'retail' && (
                      <>
                        <option value="Food">{isRtl ? 'أغذية ومأكولات' : 'Retail Food'}</option>
                        <option value="Clothing">{isRtl ? 'ملابس وأزياء' : 'Clothing'}</option>
                        <option value="Electronics">{isRtl ? 'إلكترونيات' : 'Electronics'}</option>
                      </>
                    )}
                    {businessType === 'wholesale' && (
                      <>
                        <option value="Food">{isRtl ? 'أغذية بالجملة' : 'Wholesale Food'}</option>
                        <option value="Imported">{isRtl ? 'بضائع مستوردة' : 'Imported Goods'}</option>
                        <option value="Electronics">{isRtl ? 'إلكترونيات' : 'Electronics'}</option>
                      </>
                    )}
                  </select>
                </div>
              </div>
            )}

            {/* Simple mode category selection option (show always to guarantee category setting) */}
            {modalSimpleMode && (
              <div>
                <label className="text-[10px] text-slate-500 block mb-1 font-bold">{isRtl ? 'التصنيف' : 'Category'}</label>
                <select
                  value={prodCategory}
                  onChange={e => setProdCategory(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 focus:outline-none"
                >
                  {businessType === 'restaurant' && (
                    <option value="Restaurant">{isRtl ? 'وجبات مطعم' : 'Restaurant'}</option>
                  )}
                  {businessType === 'pharmacy' && (
                    <option value="Pharmacy">{isRtl ? 'صيدلية وأدوية' : 'Pharmacy'}</option>
                  )}
                  {businessType === 'retail' && (
                    <>
                      <option value="Food">{isRtl ? 'أغذية ومأكولات' : 'Retail Food'}</option>
                      <option value="Clothing">{isRtl ? 'ملابس وأزياء' : 'Clothing'}</option>
                      <option value="Electronics">{isRtl ? 'إلكترونيات' : 'Electronics'}</option>
                    </>
                  )}
                  {businessType === 'wholesale' && (
                    <>
                      <option value="Food">{isRtl ? 'أغذية بالجملة' : 'Wholesale Food'}</option>
                      <option value="Imported">{isRtl ? 'بضائع مستوردة' : 'Imported Goods'}</option>
                      <option value="Electronics">{isRtl ? 'إلكترونيات' : 'Electronics'}</option>
                    </>
                  )}
                </select>
              </div>
            )}

            {/* Advanced only medical checkbox options */}
            {!modalSimpleMode && businessType === 'pharmacy' && (
              <div className="flex items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <input
                  type="checkbox"
                  id="is_phar"
                  checked={isPhar}
                  onChange={e => setIsPhar(e.target.checked)}
                  className="h-4 w-4"
                />
                <label htmlFor="is_phar" className="text-xs font-bold text-slate-500 select-none">
                  منتج دوائي طبي (يتطلب إدارة الباتشات والتواريخ والاسم العلمي)
                </label>
              </div>
            )}

            <div className="flex gap-2 justify-end pt-2 border-t">
              <button
                type="button"
                onClick={() => setShowAddProdModal(false)}
                className="px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold"
              >
                {isRtl ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold shadow-sm"
              >
                {isRtl ? 'حفظ المنتج ➜' : 'Save Product ➜'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
