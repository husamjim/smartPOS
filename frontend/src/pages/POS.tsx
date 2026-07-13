import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, ShoppingCart, User } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useApp } from '../context/AppContext';
import { db } from '../db/localDb';
import type { LocalProduct, LocalBatch, LocalCustomer, LocalOrder, LocalOrderItem, LocalRefund } from '../db/localDb';
import { HardwareService } from '../services/hardware';
import { AuditLogger } from '../utils/auditLogger';

export const POS: React.FC = () => {
  const { t } = useTranslation();
  const { devices, businessType, currency, activeShift, openShift, closeShift, currentUser, taxPercentage } = useApp();
  const {
    cartItems,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    selectedCustomer,
    setSelectedCustomer,
    applyCoupon,
    subtotal,
    discountAmount,
    taxAmount,
    totalAmount,
    suspendOrder,
    resumeOrder,
    suspendedList,
    checkoutOrder,
    setReceiptPreview,
    updateCartItemPrice,
    updateCartItemDiscount,
    activeTable,
    setActiveTable
  } = useCart();

  // Search & Categories
  const [products, setProducts] = useState<LocalProduct[]>([]);
  const [batches, setBatches] = useState<LocalBatch[]>([]);
  const [customers, setCustomers] = useState<LocalCustomer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('ALL');

  // Interactive UI modals
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentType, setPaymentType] = useState<'cash' | 'card' | 'bank_transfer' | 'split'>('cash');
  
  // Split payment fields
  const [splitCash, setSplitCash] = useState(0);
  const [splitCard, setSplitCard] = useState(0);
  const [splitBank, setSplitBank] = useState(0);
  
  // Coupon input
  const [couponInput, setCouponInput] = useState('');
  const [popularProducts, setPopularProducts] = useState<LocalProduct[]>([]);
  
  // Medicine substitution modal
  const [substProduct, setSubstProduct] = useState<LocalProduct | null>(null);
  const [alternatives, setAlternatives] = useState<LocalProduct[]>([]);

  // Scale mock weight slider
  const [mockScaleWeight, setMockScaleWeight] = useState<number>(1.25);

  // Sector Specific States
  const [tables, setTables] = useState<string[]>(() => {
    const saved = localStorage.getItem('pos_restaurant_tables');
    return saved ? JSON.parse(saved) : ['Table 1', 'Table 2', 'Table 3', 'Table 4', 'Table 5', 'Table 6'];
  });
  const [targetCurrency, setTargetCurrency] = useState<string>(currency || 'USD');
  useEffect(() => { setTargetCurrency(currency || 'USD'); }, [currency]);
  const [customsTariff] = useState(5);

  // Clothing card variant local isolations & tag print modals
  const [availableSizes, setAvailableSizes] = useState<string[]>(() => {
    const saved = localStorage.getItem('pos_retail_sizes');
    return saved ? JSON.parse(saved) : ['S', 'M', 'L', 'XL'];
  });
  const [availableColors, setAvailableColors] = useState<string[]>(() => {
    const saved = localStorage.getItem('pos_retail_colors');
    return saved ? JSON.parse(saved) : ['Red', 'Blue', 'Black'];
  });
  const [localVariants, setLocalVariants] = useState<Record<string, { size: string, color: string }>>({});
  const [printTagProduct, setPrintTagProduct] = useState<{ product: LocalProduct, size: string, color: string } | null>(null);

  // Customization modals states
  const [showManageTablesModal, setShowManageTablesModal] = useState(false);
  const [showManageVariantsModal, setShowManageVariantsModal] = useState(false);
  const [newTableName, setNewTableName] = useState('');
  const [newSizeName, setNewSizeName] = useState('');
  const [newColorName, setNewColorName] = useState('');

  // ===== TASK A: Shift Open/Close =====
  const [showOpenShiftModal, setShowOpenShiftModal] = useState(false);
  const [showCloseShiftModal, setShowCloseShiftModal] = useState(false);
  const [shiftStartCashInput, setShiftStartCashInput] = useState(0);
  const [shiftEndCashInput, setShiftEndCashInput] = useState(0);
  const [shiftClosedReport, setShiftClosedReport] = useState<null | { endCash: number; totalSales: number; totalOrders: number; startTime: string; endTime: string; difference: number }>(null);

  // ===== TASK B: Refund/Void =====
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundInvoiceSearch, setRefundInvoiceSearch] = useState('');
  const [refundFoundOrder, setRefundFoundOrder] = useState<LocalOrder | null>(null);
  const [refundOrderItems, setRefundOrderItems] = useState<Array<LocalOrderItem & { productName: string }>>([]);
  const [refundSelectedItems, setRefundSelectedItems] = useState<Record<string, { qty: number; selected: boolean }>>({});
  const [refundReason, setRefundReason] = useState('');
  const [refundSuccess, setRefundSuccess] = useState(false);
  const [refundLoading, setRefundLoading] = useState(false);

  // ===== TASK C: Split Bill =====
  const [showSplitBillModal, setShowSplitBillModal] = useState(false);
  const [splitPeople, setSplitPeople] = useState(2);
  const [splitAssignments, setSplitAssignments] = useState<Record<string, number>>({}); // productId -> personIndex (1-based)
  const [splitBillSuccess, setSplitBillSuccess] = useState(false);

  // Color Translation Map
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

  // Restaurant Order Modifier Modal
  const [showModifierModal, setShowModifierModal] = useState(false);
  const [pendingModifierProduct, setPendingModifierProduct] = useState<LocalProduct | null>(null);
  const [selectedModifiers, setSelectedModifiers] = useState<string[]>([]);
  const [customModifierNote, setCustomModifierNote] = useState('');

  // Default modifier presets (customizable from Settings in future)
  const modifierPresets = [
    { id: 'spicy',        ar: '🌶️ حار',          en: 'Spicy' },
    { id: 'extra_spicy', ar: '🔥 حار جداً',       en: 'Extra Spicy' },
    { id: 'no_ketchup',  ar: '🚫 بدون كاتشب',    en: 'No Ketchup' },
    { id: 'no_pickles',  ar: '🚫 بدون مخلل',     en: 'No Pickles' },
    { id: 'no_onion',    ar: '🚫 بدون بصل',      en: 'No Onions' },
    { id: 'no_garlic',   ar: '🚫 بدون ثوم',      en: 'No Garlic' },
    { id: 'no_mayo',     ar: '🚫 بدون مايونيز',  en: 'No Mayo' },
    { id: 'no_cheese',   ar: '🚫 بدون جبن',      en: 'No Cheese' },
    { id: 'extra_sauce', ar: '➕ صوص زيادة',     en: 'Extra Sauce' },
    { id: 'extra_cheese',ar: '➕ جبن زيادة',     en: 'Extra Cheese' },
    { id: 'well_done',   ar: '🔆 ويل دون',       en: 'Well Done' },
    { id: 'medium',      ar: '🔅 ميديوم',        en: 'Medium' },
    { id: 'no_bread',    ar: '🚫 بدون خبز',      en: 'No Bread' },
    { id: 'gluten_free', ar: '🌾 خالي من الغلوتين', en: 'Gluten Free' },
    { id: 'sugar_free',  ar: '🍬 بدون سكر',      en: 'Sugar Free' },
    { id: 'extra_ice',   ar: '🧊 ثلج زيادة',     en: 'Extra Ice' },
    { id: 'no_ice',      ar: '🚫 بدون ثلج',      en: 'No Ice' },
    { id: 'takeaway',    ar: '📦 تيك أواي',       en: 'Takeaway' },
  ];

  const toggleModifier = (id: string) => {
    setSelectedModifiers(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const confirmModifiers = () => {
    if (!pendingModifierProduct) return;
    const finalProduct = { ...pendingModifierProduct };
    const tags = selectedModifiers.map(id => {
      const m = modifierPresets.find(p => p.id === id);
      return isRtl ? m?.ar ?? id : m?.en ?? id;
    });
    if (customModifierNote.trim()) tags.push(customModifierNote.trim());
    if (tags.length > 0) {
      finalProduct.name_ar = `${pendingModifierProduct.name_ar} (${tags.join(', ')})`;
      finalProduct.name_en = `${pendingModifierProduct.name_en} (${tags.join(', ')})`;
    }
    addToCart(finalProduct, 1);
    setShowModifierModal(false);
    setPendingModifierProduct(null);
    setSelectedModifiers([]);
    setCustomModifierNote('');
  };

  // Sync to LocalStorage
  useEffect(() => {
    localStorage.setItem('pos_restaurant_tables', JSON.stringify(tables));
  }, [tables]);

  useEffect(() => {
    localStorage.setItem('pos_retail_sizes', JSON.stringify(availableSizes));
  }, [availableSizes]);

  useEffect(() => {
    localStorage.setItem('pos_retail_colors', JSON.stringify(availableColors));
  }, [availableColors]);
  // Cash Change Calculator states
  const [cashReceived, setCashReceived] = useState<number | ''>('');

  // Supermarket Price Checker widget states
  const [showPriceChecker, setShowPriceChecker] = useState(false);
  const [priceCheckBarcode, setPriceCheckBarcode] = useState('');
  const [priceCheckProduct, setPriceCheckProduct] = useState<LocalProduct | null>(null);

  // Retail Sub-Mode & Supermarket/Wholesale custom states
  const [numpadQty, setNumpadQty] = useState<number>(1);
  const [wholesaleRows, setWholesaleRows] = useState<Array<{
    id: string;
    productId: string;
    unit: 'carton' | 'palette' | 'container';
    qty: number;
    tariff: number;
  }>>([
    { id: 'row_1', productId: 'p_1', unit: 'carton', qty: 5, tariff: 5 }
  ]);

  // Load products and customers
  useEffect(() => {
    loadPOSData();
  }, []);

  useEffect(() => {
    const loadPopular = async () => {
      try {
        const allOrderItems = await db.orderItems.toArray();
        
        // Filter products of this business type
        const activeProducts = products.filter(prod => {
          if (businessType === 'restaurant') {
            return ['meal', 'sandwich', 'drink', 'dessert', 'salad', 'appetizer', 'Restaurant'].includes(prod.category);
          } else if (businessType === 'pharmacy') {
            return prod.is_pharmaceutical === 1;
          } else {
            return prod.is_pharmaceutical !== 1 && !['meal', 'sandwich', 'drink', 'dessert', 'salad', 'appetizer', 'Restaurant', 'raw_material'].includes(prod.category);
          }
        });
        const activeProdIds = new Set(activeProducts.map(prod => prod.id));

        const productCounts: { [key: string]: number } = {};
        for (const item of allOrderItems) {
          if (activeProdIds.has(item.product_id)) {
            productCounts[item.product_id] = (productCounts[item.product_id] || 0) + item.quantity;
          }
        }

        // Sort by popularity
        const sortedProdIds = Object.keys(productCounts).sort((a, b) => productCounts[b] - productCounts[a]);
        
        const topProducts: LocalProduct[] = [];
        // Get the top 2
        for (const pid of sortedProdIds) {
          const prod = activeProducts.find(prod => prod.id === pid);
          if (prod) {
            topProducts.push(prod);
            if (topProducts.length >= 2) break;
          }
        }

        // If we don't have enough orders to determine top 2, fall back to the first 2 products of this business type
        if (topProducts.length < 2) {
          for (const prod of activeProducts) {
            if (!topProducts.some(tp => tp.id === prod.id)) {
              topProducts.push(prod);
              if (topProducts.length >= 2) break;
            }
          }
        }

        setPopularProducts(topProducts);
      } catch (err) {
        console.error("Failed to load popular products:", err);
      }
    };

    if (products.length > 0) {
      loadPopular();
    }
  }, [businessType, products]);

  const loadPOSData = async () => {
    const p = await db.products.toArray();
    setProducts(p);

    const b = await db.batches.toArray();
    setBatches(b);

    const c = await db.customers.toArray();
    setCustomers(c);
  };

  // Sync wholesale spreadsheet table to the checkout cart
  useEffect(() => {
    if (businessType === 'electronics' && products.length > 0) {
      clearCart();
      wholesaleRows.forEach(row => {
        const prod = products.find(p => p.id === row.productId);
        if (prod) {
          const qtyFactor = row.unit === 'container' ? 100 : row.unit === 'palette' ? 20 : 1;
          const finalQty = row.qty * qtyFactor;
          
          // Wholesale pricing adjustments
          const basePrice = targetCurrency === 'USD' ? prod.price / 3.75 : prod.price;
          const customsAdjusted = basePrice * (1 + row.tariff / 100);
          
          const adjustedProd = {
            ...prod,
            price: parseFloat(customsAdjusted.toFixed(2)),
            name_en: `${prod.name_en} (${row.unit.toUpperCase()})`,
            name_ar: `${prod.name_ar} (جملة - ${row.unit === 'container' ? 'حاوية' : row.unit === 'palette' ? 'طبلية' : 'كرتون'})`
          };
          addToCart(adjustedProd, finalQty);
        }
      });
    }
  }, [wholesaleRows, targetCurrency, products, businessType]);

  const handleProductClick = async (product: LocalProduct) => {
    // 1. Weighing Scale integration
    let qty = 1;
    if (product.type === 'weight') {
      if (HardwareService.isScaleConnected()) {
        let scaleWeight = 0;
        try {
          await HardwareService.startReadingWeight(
            (w) => { scaleWeight = w; },
            (err) => { console.error(err); }
          );
          // Wait 300ms for data transfer
          await new Promise(r => setTimeout(r, 300));
          await HardwareService.stopReadingScale();
        } catch (e) {
          console.warn(e);
        }
        qty = scaleWeight || mockScaleWeight;
        alert(isRtl ? `تم جلب الوزن تلقائياً من الميزان الإلكتروني المادي المتصل: ${qty.toFixed(3)} كجم.` : `Fetched weight from connected physical scale: ${qty.toFixed(3)} kg.`);
      } else if (devices.scale) {
        qty = mockScaleWeight;
        alert(isRtl ? `تم جلب الوزن تلقائياً من الميزان الإلكتروني المحاكي: ${qty} كجم.` : `Fetched weight from virtual scale: ${qty} kg.`);
      } else {
        const inputWeight = prompt(t('enter_product_weight_in_kg_by_weight'), '1.0');
        if (!inputWeight) return;
        qty = parseFloat(inputWeight) || 1;
      }
    }

    // Dynamic Business Adaptations
    const finalProduct = { ...product };

    if (businessType === 'clothing') {
      const variant = localVariants[product.id] || { 
        size: availableSizes[0] || 'M', 
        color: availableColors[0] || 'Red' 
      };
      const colorAr = colorMap[variant.color] || variant.color;
      finalProduct.name_ar = `${product.name_ar} (${variant.size} - ${colorAr})`;
      finalProduct.name_en = `${product.name_en} (${variant.size} - ${variant.color})`;
    } else if (businessType === 'restaurant') {
      // Open modifier modal instead of prompt()
      setPendingModifierProduct(finalProduct);
      setSelectedModifiers([]);
      setCustomModifierNote('');
      setShowModifierModal(true);
      return; // addToCart will be called after modal confirm
    } else if (businessType === 'electronics') {
      const convertedPrice = targetCurrency === 'USD' ? product.price / 3.75 : product.price;
      const customsAdjusted = convertedPrice * (1 + customsTariff / 100);
      finalProduct.price = parseFloat(customsAdjusted.toFixed(2));
      finalProduct.name_en = `${product.name_en} (Wholesale - ${targetCurrency})`;
      finalProduct.name_ar = `${product.name_ar} (جملة - ${targetCurrency})`;
    }

    // 2. Pharmacy Batch verification
    if (product.is_pharmaceutical === 1) {
      const productBatches = batches.filter(b => b.product_id === product.id && b.quantity > 0);
      if (productBatches.length === 0) {
        alert('تنبيه: لا يوجد باتشات متوفرة بالمستودع لهذا الدواء.');
        return;
      }

      const sortedBatches = [...productBatches].sort((a,b) => {
        if (!a.expiry_date) return 1;
        if (!b.expiry_date) return -1;
        return new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime();
      });

      const chosenBatch = sortedBatches[0];
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 30);

      if (chosenBatch.expiry_date && new Date(chosenBatch.expiry_date) <= tomorrow) {
        const proceed = confirm(`⚠️ تنبيه: دفعة الدواء المختارة (الباتش ${chosenBatch.batch_number}) تنتهي قريباً بتاريخ ${chosenBatch.expiry_date}. هل تريد المتابعة؟`);
        if (!proceed) return;
      }

      addToCart(finalProduct, qty, chosenBatch);
    } else {
      addToCart(finalProduct, qty);
    }
  };

  const handleSubstSearch = (product: LocalProduct) => {
    if (!product.scientific_name) return;
    const matches = products.filter(p => 
      p.id !== product.id && 
      p.scientific_name?.toLowerCase() === product.scientific_name?.toLowerCase()
    );
    setSubstProduct(product);
    setAlternatives(matches);
  };

  const handleCouponSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const success = applyCoupon(couponInput);
    if (success) {
      alert('تم تطبيق قسيمة الخصم بنجاح.');
    } else {
      alert('عذراً، قسيمة الخصم هذه غير صالحة أو منتهية.');
    }
  };

  const handleCheckoutSubmit = async () => {
    const details = paymentType === 'split' ? { cash: splitCash, card: splitCard, bank: splitBank } : undefined;
    const result = await checkoutOrder(paymentType, details);
    
    setShowPaymentModal(false);
    setReceiptPreview(result.receiptHtml);
    setCashReceived('');
    await loadPOSData();
  };

  const handleBarcodeScanSim = (barcode: string) => {
    const matched = products.find(p => p.barcode === barcode);
    if (matched) {
      handleProductClick(matched);
      setSearchQuery('');
    } else {
      alert(`الباركود الممسوح (${barcode}) غير مطابق لأي منتج.`);
    }
  };

  // Dynamically set categories based on businessType
  const getCategoriesForBusiness = () => {
    switch (businessType) {
      case 'restaurant':
        return ['ALL', 'meal', 'drink', 'dessert', 'addition', 'size', 'table', 'kitchen', 'item'];
      case 'supermarket':
        return ['ALL', 'food', 'cleaner', 'drink', 'frozen', 'bakery', 'vegetable', 'fruit'];
      case 'pharmacy':
        return ['ALL', 'medicine', 'supplement', 'cosmetic', 'medical_device', 'prescription', 'pharma_company'];
      case 'clothing':
        return ['ALL', 'men', 'women', 'kids', 'shoes', 'bags', 'size', 'color'];
      case 'electronics':
        return ['ALL', 'mobile', 'computer', 'accessory', 'printer', 'screen'];
      default:
        return ['ALL', 'food', 'medicine', 'clothing', 'electronics'];
    }
  };

  const getCategoryLabel = (cat: string) => {
    if (cat === 'ALL') return t('all');
    switch (cat) {
      // Restaurant
      case 'meal': return t('meals');
      case 'drink': return t('drinks');
      case 'dessert': return t('desserts');
      case 'addition': return t('additions');
      case 'size': return t('sizes');
      case 'table': return t('tables');
      case 'kitchen': return t('kitchen');
      case 'item': return t('items');
      // Supermarket
      case 'food': return t('food_items');
      case 'cleaner': return t('cleaning_agents');
      case 'frozen': return t('frozen_foods');
      case 'bakery': return t('bakery');
      case 'vegetable': return t('vegetables');
      case 'fruit': return t('fruits');
      // Pharmacy
      case 'medicine': return t('medicines');
      case 'supplement': return t('supplements');
      case 'cosmetic': return t('cosmetics');
      case 'medical_device': return t('medical_devices');
      case 'prescription': return t('prescriptions');
      case 'pharma_company': return t('pharma_companies');
      // Clothing
      case 'men': return t('mens_wear');
      case 'women': return t('womens_wear');
      case 'kids': return t('kids_wear');
      case 'shoes': return t('shoes');
      case 'bags': return t('bags');
      case 'color': return t('colors');
      // Electronics
      case 'mobile': return t('mobiles');
      case 'computer': return t('computers');
      case 'accessory': return t('accessories');
      case 'printer': return t('printers');
      case 'screen': return t('screens');
      default: return cat;
    }
  };

  const categories = getCategoriesForBusiness();

  const filteredProducts = products.filter(p => {
    // 1. Strict Business Type Product Isolation
    if (businessType === 'restaurant') {
      const restaurantCategories = ['meal', 'drink', 'dessert', 'addition', 'size', 'table', 'kitchen', 'item'];
      if (!restaurantCategories.includes(p.category)) return false;
    } else if (businessType === 'supermarket') {
      const supermarketCategories = ['food', 'cleaner', 'drink', 'frozen', 'bakery', 'vegetable', 'fruit'];
      if (!supermarketCategories.includes(p.category)) return false;
    } else if (businessType === 'pharmacy') {
      const pharmacyCategories = ['medicine', 'supplement', 'cosmetic', 'medical_device', 'prescription', 'pharma_company'];
      if (!pharmacyCategories.includes(p.category) && p.is_pharmaceutical !== 1) return false;
    } else if (businessType === 'clothing') {
      const clothingCategories = ['men', 'women', 'kids', 'shoes', 'bags', 'size', 'color'];
      if (!clothingCategories.includes(p.category)) return false;
    } else if (businessType === 'electronics') {
      const electronicsCategories = ['mobile', 'computer', 'accessory', 'printer', 'screen'];
      if (!electronicsCategories.includes(p.category)) return false;
    }

    // 2. Category Tab Filter
    const matchCategory = activeCategory === 'ALL' || p.category === activeCategory;

    // 3. Search Query Filter
    const matchQuery = searchQuery.trim() === '' ||
      p.name_en.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.name_ar.includes(searchQuery) ||
      p.barcode.includes(searchQuery) ||
      (p.scientific_name && p.scientific_name.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchCategory && matchQuery;
  });

  const calculateWholesaleTotals = () => {
    let totalWeight = 0;
    let totalCustomsFeeSar = 0;
    let totalCostSar = 0;
    let totalRevenueSar = 0;

    wholesaleRows.forEach(row => {
      const prod = products.find(p => p.id === row.productId);
      if (!prod) return;

      const qtyFactor = row.unit === 'container' ? 100 : row.unit === 'palette' ? 20 : 1;
      const finalQty = row.qty * qtyFactor;

      const unitWeight = row.unit === 'container' ? 20 : row.unit === 'palette' ? 0.4 : 0.02;
      totalWeight += row.qty * unitWeight;

      const costVal = prod.cost;
      const basePrice = prod.price; 
      const priceSar = basePrice * (1 + row.tariff / 100);
      const lineCustomsFee = (basePrice * (row.tariff / 100)) * finalQty;

      totalCustomsFeeSar += lineCustomsFee;
      totalCostSar += costVal * finalQty;
      totalRevenueSar += priceSar * finalQty;
    });

    const gpMargin = totalRevenueSar > 0 ? ((totalRevenueSar - totalCostSar) / totalRevenueSar) * 100 : 0;

    return {
      totalWeight,
      totalCustomsFeeSar,
      gpMargin
    };
  };

  // ===== TASK A Handlers: Shift =====
  const handleOpenShift = () => {
    openShift(shiftStartCashInput);
    setShowOpenShiftModal(false);
    setShiftStartCashInput(0);
  };

  const handleCloseShift = () => {
    const totalOrdersCount = cartItems.length; // approximate
    const closed = closeShift(shiftEndCashInput, totalAmount, totalOrdersCount);
    const expectedCash = (closed.startCash || 0) + (closed.totalSales || 0);
    const difference = shiftEndCashInput - expectedCash;
    setShiftClosedReport({
      endCash: shiftEndCashInput,
      totalSales: closed.totalSales || 0,
      totalOrders: closed.totalOrders || 0,
      startTime: closed.startTime,
      endTime: closed.endTime || new Date().toISOString(),
      difference
    });
    setShowCloseShiftModal(false);
  };

  // ===== TASK B Handlers: Refund =====
  const handleRefundSearch = async () => {
    if (!refundInvoiceSearch.trim()) return;
    const orders = await db.orders.toArray();
    const found = orders.find(o => o.invoice_number === refundInvoiceSearch.trim() && o.status === 'completed');
    if (!found) {
      alert(t('invoice_not_found_or_already_returned'));
      return;
    }
    setRefundFoundOrder(found);
    const items = await db.orderItems.where('order_id').equals(found.id).toArray();
    const products = await db.products.toArray();
    const enriched = items.map(item => {
      const prod = products.find(p => p.id === item.product_id);
      return { ...item, productName: prod ? (isRtl ? prod.name_ar : prod.name_en) : item.product_id };
    });
    setRefundOrderItems(enriched);
    const initialSel: Record<string, { qty: number; selected: boolean }> = {};
    enriched.forEach(item => { initialSel[item.id] = { qty: item.quantity, selected: true }; });
    setRefundSelectedItems(initialSel);
    setRefundSuccess(false);
  };

  const handleConfirmRefund = async () => {
    if (!refundFoundOrder) return;
    setRefundLoading(true);
    try {
      const selectedList = refundOrderItems.filter(item => refundSelectedItems[item.id]?.selected);
      if (selectedList.length === 0) {
        alert(t('please_select_items_to_refund'));
        setRefundLoading(false);
        return;
      }
      const refundTotal = selectedList.reduce((sum, item) => {
        const qty = refundSelectedItems[item.id]?.qty || item.quantity;
        return sum + (item.price * qty);
      }, 0);
      const refundTax = refundTotal * (taxPercentage / 100);

      const refundOrderId = 'ord_rf_' + Date.now();
      const refundOrderInvoice = 'RF-' + refundFoundOrder.invoice_number;

      // Create negative order
      await db.orders.add({
        id: refundOrderId,
        invoice_number: refundOrderInvoice,
        branch_id: refundFoundOrder.branch_id,
        customer_id: refundFoundOrder.customer_id,
        user_id: currentUser?.id || 'unknown',
        total: -(refundTotal + refundTax),
        tax: -refundTax,
        discount: 0,
        payment_status: 'paid',
        payment_method: refundFoundOrder.payment_method,
        status: 'returned',
        is_synced: 0,
        created_at: new Date().toISOString(),
        refund_of_order_id: refundFoundOrder.id,
        refund_note: refundReason
      });

      // Create refund record
      const refundRecord: LocalRefund = {
        id: 'ref_' + Date.now(),
        original_order_id: refundFoundOrder.id,
        refund_order_id: refundOrderId,
        items: JSON.stringify(selectedList.map(item => ({ id: item.product_id, qty: refundSelectedItems[item.id]?.qty || item.quantity }))),
        total: refundTotal + refundTax,
        reason: refundReason,
        created_at: new Date().toISOString(),
        user_id: currentUser?.id || 'unknown'
      };
      await db.refunds.add(refundRecord);

      AuditLogger.log(
        'REFUND',
        'orders',
        `Processed refund for invoice: ${refundFoundOrder.invoice_number}. Refund total: ${(refundTotal + refundTax).toFixed(2)} ${currency}. Reason: ${refundReason}`,
        'warning',
        refundOrderId
      );

      setRefundSuccess(true);
      setRefundFoundOrder(null);
      setRefundOrderItems([]);
      setRefundReason('');
      setRefundInvoiceSearch('');
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء تسجيل الإرجاع.');
    }
    setRefundLoading(false);
  };

  // ===== TASK C Handlers: Split Bill =====
  const handleConfirmSplitBill = () => {
    if (cartItems.length === 0) return;
    // Create suspended mini-orders for each person
    const assignedPeople = Array.from({ length: splitPeople }, (_, i) => i + 1);
    assignedPeople.forEach(personIdx => {
      const personItems = cartItems.filter(item => {
        const assigned = splitAssignments[item.product.id];
        return assigned === personIdx || (personIdx === 1 && assigned === undefined);
      });
      if (personItems.length > 0) {
        suspendOrder();
      }
    });
    setSplitBillSuccess(true);
    setTimeout(() => {
      setSplitBillSuccess(false);
      setShowSplitBillModal(false);
      setSplitAssignments({});
    }, 2000);
  };

  const isRtl = document.documentElement.dir === 'rtl';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 h-full animate-fade-in">

      {/* ===== TASK A: Shift Banner ===== */}
      <div className="lg:col-span-3">
        {activeShift ? (
          <div className="flex items-center justify-between px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs font-bold">
            <span className="text-emerald-600 dark:text-emerald-400">
              🟢 {t('shift_open_since')}: {new Date(activeShift.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} &nbsp;|&nbsp;
              {t('start_cash')} <span className="font-sans">{activeShift.startCash.toFixed(2)} {currency}</span>
              {currentUser && <span className="mx-2 text-emerald-500">| 👤 {currentUser.displayName}</span>}
            </span>
            <button
              type="button"
              onClick={() => setShowCloseShiftModal(true)}
              className="px-3 py-1 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 font-bold transition-all"
            >
              🔒 {t('close_shift')}
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs font-bold">
            <span className="text-amber-600 dark:text-amber-400">
              🟡 {t('no_active_shift_open_a_shift_to_begin_selling')}
            </span>
            <button
              type="button"
              onClick={() => setShowOpenShiftModal(true)}
              className="px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 font-bold transition-all"
            >
              🟢 {t('open_shift')}
            </button>
          </div>
        )}
      </div>

      {/* Products Catalog Screen */}
      <div className="lg:col-span-2 flex flex-col space-y-4">
        {businessType === 'electronics' && (
          <div className="glass-card p-5 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 bg-white/40 dark:bg-slate-900/40 flex-1 flex flex-col justify-between space-y-4 animate-fade-in">
            <div>
              <div className="flex justify-between items-center border-b pb-3 mb-2">
                <span className="font-extrabold text-sm flex items-center gap-1">🚢 {t('wholesale_bulk_order_spreadsheet')}</span>
                <button
                  type="button"
                  onClick={() => {
                    setWholesaleRows(prev => [
                      ...prev,
                      { id: 'row_' + Math.random().toString(36).substr(2, 9), productId: products[0]?.id || '', unit: 'carton', qty: 5, tariff: 5 }
                    ]);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-[10px] flex items-center gap-1 shadow-sm font-sans"
                >
                  + {t('add_item_line')}
                </button>
              </div>

              <div className="overflow-x-auto max-h-[300px]">
                <table className="w-full text-[10px] text-right">
                  <thead>
                    <tr className="border-b text-slate-400 font-extrabold">
                      <th className="py-2 pr-1">{t('productsku')}</th>
                      <th>{t('shipping_unit')}</th>
                      <th>{t('qty')}</th>
                      <th>{t('customs_1')}</th>
                      <th>{t('price_usd')}</th>
                      <th>{isRtl ? `السعر (${currency})` : `Price (${currency})`}</th>
                      <th>{t('unit_cost')}</th>
                      <th className="text-left">{t('gp')}</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {wholesaleRows.map((row, idx) => {
                      const prod = products.find(p => p.id === row.productId);
                      const costVal = prod ? prod.cost : 0;
                      const basePrice = prod ? prod.price : 0;
                      
                      const priceUsd = targetCurrency === 'USD' ? basePrice / 3.75 : basePrice;
                      const tariffAdjustedPriceUsd = priceUsd * (1 + row.tariff / 100);
                      const priceLocal = targetCurrency === 'USD' ? basePrice * (1 + row.tariff / 100) : basePrice * (1 + row.tariff / 100);
                      
                      const gpMargin = priceLocal > 0 ? ((priceLocal - costVal) / priceLocal) * 100 : 0;

                      return (
                        <tr key={row.id} className="border-b border-slate-100 dark:border-slate-800/40 py-2">
                          <td className="py-2 max-w-[150px]">
                            <select
                              value={row.productId}
                              onChange={e => {
                                const updated = [...wholesaleRows];
                                updated[idx].productId = e.target.value;
                                setWholesaleRows(updated);
                              }}
                              className="w-full bg-white dark:bg-slate-900 border dark:border-slate-800 rounded px-1.5 py-1 text-[10px] font-bold focus:outline-none"
                            >
                              {products.filter(p => p.is_pharmaceutical !== 1).map(p => (
                                <option key={p.id} value={p.id}>{isRtl ? p.name_ar : p.name_en}</option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <select
                              value={row.unit}
                              onChange={e => {
                                const updated = [...wholesaleRows];
                                updated[idx].unit = e.target.value as any;
                                setWholesaleRows(updated);
                              }}
                              className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded px-1.5 py-1 text-[10px] focus:outline-none"
                            >
                              <option value="carton">{t('carton')}</option>
                              <option value="palette">{t('palette')}</option>
                              <option value="container">{t('container')}</option>
                            </select>
                          </td>
                          <td>
                            <input
                              type="number"
                              min={1}
                              value={row.qty}
                              onChange={e => {
                                const updated = [...wholesaleRows];
                                updated[idx].qty = parseInt(e.target.value) || 1;
                                setWholesaleRows(updated);
                              }}
                              className="w-12 text-center bg-white dark:bg-slate-900 border dark:border-slate-800 rounded py-1 text-[10px] font-sans focus:outline-none"
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              min={0}
                              max={50}
                              value={row.tariff}
                              onChange={e => {
                                const updated = [...wholesaleRows];
                                updated[idx].tariff = parseInt(e.target.value) || 0;
                                setWholesaleRows(updated);
                              }}
                              className="w-10 text-center bg-white dark:bg-slate-900 border dark:border-slate-800 rounded py-1 text-[10px] font-sans focus:outline-none"
                            />
                          </td>
                          <td className="font-sans text-slate-500">${tariffAdjustedPriceUsd.toFixed(2)}</td>
                          <td className="font-sans font-bold text-indigo-500">{priceLocal.toFixed(2)} {currency}</td>
                          <td className="font-sans text-slate-400">{costVal.toFixed(2)}</td>
                          <td className="text-left">
                            <span className={`px-1.5 py-0.5 rounded font-bold text-[9px] ${gpMargin > 20 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                              {gpMargin.toFixed(0)}%
                            </span>
                          </td>
                          <td className="text-left pl-1">
                            <button
                              type="button"
                              onClick={() => {
                                setWholesaleRows(prev => prev.filter(r => r.id !== row.id));
                              }}
                              className="text-red-500 hover:text-red-700"
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Wholesale conversion & tariff quick controls */}
            {(() => {
              const { totalWeight, totalCustomsFeeSar: totalCustomsFeeLocal, gpMargin } = calculateWholesaleTotals();
              return (
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-900/30 text-xs flex flex-col sm:flex-row justify-between items-center gap-4">
                  {/* Stats block */}
                  <div className="flex gap-4 items-center flex-wrap text-[10px] font-bold">
                    <span className="text-slate-400">
                      {t('total_weight')} <span className="text-indigo-500 font-sans">{totalWeight.toFixed(2)} Tons</span>
                    </span>
                    <span className="text-slate-400">
                      {t('total_customs')} <span className="text-red-500 font-sans">{totalCustomsFeeLocal.toFixed(2)} {currency}</span>
                    </span>
                    <span className="text-slate-400">
                      {t('total_gp_margin')} <span className={`font-sans px-1.5 py-0.5 rounded ${gpMargin > 20 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>{gpMargin.toFixed(1)}%</span>
                    </span>
                  </div>

                  <div className="flex gap-4 font-bold items-center shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 font-semibold">{t('currency')}</span>
                      <div className="flex bg-slate-250 dark:bg-slate-950 p-1 rounded-lg">
                        {([currency || 'USD', 'USD'] as const).map(curr => (
                          <button
                            key={curr}
                            type="button"
                            onClick={() => setTargetCurrency(curr)}
                            className={`px-2 py-0.5 rounded text-[9px] font-bold ${targetCurrency === curr ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-500'}`}
                          >
                            {curr}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {businessType === 'supermarket' && (
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
            {/* Left Column: Categories and Fast Items */}
            <div className="glass-card p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 bg-white/40 dark:bg-slate-900/40 flex flex-col space-y-3">
              <div className="flex justify-between items-center border-b pb-2">
                <span className="font-extrabold text-xs">{t('fast_selling_items')}</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPriceChecker(true)}
                    className="px-2.5 py-1 rounded bg-blue-600/10 text-blue-500 hover:bg-blue-600/20 font-bold text-[9px] flex items-center gap-1 font-sans"
                  >
                    {t('price_checker')}
                  </button>
                </div>
              </div>

              {/* Fast Add items Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 flex-1 overflow-y-auto max-h-[300px] pr-1">
                {products.filter(p => p.category === 'Food').map(p => (
                  <div
                    key={p.id}
                    onClick={() => addToCart(p, numpadQty)}
                    className="p-2.5 rounded-xl border border-slate-255/30 dark:border-slate-800/30 hover:border-blue-500 hover:bg-blue-500/5 cursor-pointer text-center flex flex-col justify-between h-20 transition-all select-none"
                  >
                    <span className="text-[10px] font-bold text-slate-800 dark:text-slate-100 truncate">{isRtl ? p.name_ar : p.name_en}</span>
                    <span className="font-bold text-[10px] text-blue-500 font-sans">{p.price.toFixed(2)} {currency}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right/Center Column: Cashier Terminal console (Numpad, scanner typing) */}
            <div className="glass-card p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 bg-white/40 dark:bg-slate-900/40 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                {/* Barcode scanner input simulating typing */}
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 block font-bold">📷 {t('barcode_scanner_input')}</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder={t('type_barcode_press_enter')}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          handleBarcodeScanSim((e.target as HTMLInputElement).value);
                          (e.target as HTMLInputElement).value = '';
                        }
                      }}
                      className="flex-1 px-3 py-1.5 rounded-lg border border-slate-255 dark:border-slate-800 bg-white dark:bg-slate-950 text-center text-xs focus:outline-none font-mono"
                    />
                  </div>
                </div>

                {/* Numpad configuration for quick quantities */}
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 block font-bold">🔢 {t('set_multiplier_qty')}</label>
                  <div className="flex gap-2 items-center bg-slate-100/50 dark:bg-slate-950/50 p-2 rounded-xl border border-slate-200 dark:border-slate-850">
                    <button type="button" onClick={() => setNumpadQty(prev => Math.max(1, prev - 1))} className="h-6 w-6 rounded bg-slate-250 dark:bg-slate-800 font-bold flex items-center justify-center">-</button>
                    <span className="font-bold font-sans text-xs text-blue-500 px-2">{numpadQty}</span>
                    <button type="button" onClick={() => setNumpadQty(prev => prev + 1)} className="h-6 w-6 rounded bg-slate-250 dark:bg-slate-800 font-bold flex items-center justify-center">+</button>
                    <div className="flex gap-1.5 pr-2 mr-2 border-r text-[9px] font-extrabold flex-1 justify-end">
                      <button type="button" onClick={() => setNumpadQty(1)} className="px-2 py-0.5 rounded bg-slate-250 dark:bg-slate-855">x1</button>
                      <button type="button" onClick={() => setNumpadQty(5)} className="px-2 py-0.5 rounded bg-slate-250 dark:bg-slate-855">x5</button>
                      <button type="button" onClick={() => setNumpadQty(10)} className="px-2 py-0.5 rounded bg-slate-250 dark:bg-slate-855">x10</button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Discount tools */}
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/30">
                <span className="text-[10px] text-slate-500 font-bold block mb-1.5">{t('supermarket_quick_discount')}</span>
                <div className="grid grid-cols-3 gap-1.5 text-center font-bold text-[9px] font-sans">
                  <button type="button" onClick={() => applyCoupon('SAVE10')} className="py-2 rounded bg-indigo-650/10 text-indigo-500 hover:bg-indigo-600/20">🏷️ {t('10_off')}</button>
                  <button type="button" onClick={() => applyCoupon('EID20')} className="py-2 rounded bg-indigo-655/10 text-indigo-500 hover:bg-indigo-600/20">🏷️ {t('20_off')}</button>
                  <button
                    type="button"
                    onClick={() => {
                      const customDisc = prompt(t('enter_custom_coupon_code'));
                      if (customDisc) applyCoupon(customDisc);
                    }}
                    className="py-2 rounded bg-slate-250 dark:bg-slate-800 hover:bg-slate-300 dark:text-white"
                  >
                    {t('apply_code')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {businessType === 'clothing' && (
          <div className="flex-1 flex flex-col space-y-4 animate-fade-in">
            {/* Header toggles */}
            <div className="flex justify-between items-center bg-white/40 dark:bg-slate-900/40 p-3 rounded-2xl border border-slate-200/50 dark:border-slate-800/50">
              <span className="font-extrabold text-xs flex items-center gap-1.5">{t('fashion_clothing_boutique_terminal')}</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowManageVariantsModal(true)}
                  className="px-2.5 py-1.5 rounded-xl bg-teal-650/10 text-teal-500 hover:bg-teal-600/20 font-bold text-[10px] flex items-center gap-1 font-sans"
                >
                  {t('sizes_colors')}
                </button>
                {/* Price Checker Trigger Button */}
                <button
                  type="button"
                  onClick={() => setShowPriceChecker(true)}
                  className="px-2.5 py-1.5 rounded-xl bg-blue-600/10 text-blue-500 hover:bg-blue-600/20 font-bold text-[10px] flex items-center gap-1 font-sans"
                >
                  {t('price_checker')}
                </button>
              </div>
            </div>

            {/* Clothing Items Catalog */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 overflow-y-auto max-h-[300px] pr-1">
              {products.filter(p => p.category === 'Clothing').map(p => {
                const variant = localVariants[p.id] || { 
                  size: availableSizes[0] || 'M', 
                  color: availableColors[0] || 'Red' 
                };
                return (
                  <div key={p.id} className="glass-card p-4 rounded-2xl border border-slate-200/30 dark:border-slate-800/30 hover:border-indigo-500/40 flex flex-col justify-between h-44 transition-all">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-extrabold text-xs text-slate-800 dark:text-slate-100">{isRtl ? p.name_ar : p.name_en}</h4>
                        <span className="text-[9px] font-mono text-slate-400 block mt-0.5">SKU: {p.sku} | Barcode: {p.barcode}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setPrintTagProduct({ product: p, size: variant.size, color: variant.color });
                        }}
                        className="p-1.5 rounded bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-500 text-[9px] font-bold font-sans"
                      >
                        🏷️ {t('print_tag')}
                      </button>
                    </div>

                    {/* Inline Variant Customizations */}
                    <div className="flex justify-between items-center pt-2 border-t border-slate-150 dark:border-slate-850">
                      <div className="flex gap-4 font-bold text-[10px]">
                        {/* Size pills */}
                        <div className="flex items-center gap-1">
                          <span className="text-slate-400 font-semibold">{t('size')}</span>
                          <div className="flex bg-slate-100 dark:bg-slate-950 rounded p-0.5 border">
                            {availableSizes.map(sz => (
                              <button
                                key={sz}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setLocalVariants(prev => ({
                                    ...prev,
                                    [p.id]: { ...(prev[p.id] || { color: availableColors[0] || 'Red' }), size: sz }
                                  }));
                                }}
                                className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${variant.size === sz ? 'bg-indigo-650 text-white shadow-xs' : 'text-slate-500'}`}
                              >
                                {sz}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Colors select */}
                      <div className="flex items-center gap-1 text-[10px]">
                        <span className="text-slate-400 font-semibold">{t('color')}</span>
                        <select
                          value={variant.color}
                          onChange={e => {
                            const val = e.target.value;
                            setLocalVariants(prev => ({
                              ...prev,
                              [p.id]: { ...(prev[p.id] || { size: availableSizes[0] || 'M' }), color: val }
                            }));
                          }}
                          className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-950 border text-[8px] focus:outline-none text-slate-800 dark:text-slate-200"
                        >
                          {availableColors.map(color => (
                            <option key={color} value={color}>
                              {isRtl ? (colorMap[color] || color) : color}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Add block */}
                    <div className="flex justify-between items-end border-t pt-2 border-slate-100 dark:border-slate-850 mt-1">
                      <span className="font-extrabold text-indigo-500 font-sans text-xs">{p.price.toFixed(2)} {currency}</span>
                      <button
                        type="button"
                        onClick={() => {
                          const colorAr = colorMap[variant.color] || variant.color;
                          const finalProduct = {
                            ...p,
                            name_ar: `${p.name_ar} (${variant.size} - ${colorAr})`,
                            name_en: `${p.name_en} (${variant.size} - ${variant.color})`
                          };
                          addToCart(finalProduct, 1);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-indigo-650 hover:bg-indigo-700 text-white font-bold text-[9px] transition-all shadow-xs"
                      >
                        + {t('add_to_cart')}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Restaurant & Pharmacy Layouts (Generic catalog with widgets) */}
        {(businessType === 'restaurant' || businessType === 'pharmacy' || businessType === 'electronics') && (
          <>
            {/* Active Industry Custom Sub-panels */}
            {businessType === 'restaurant' && (
              <div className="p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 bg-white/40 dark:bg-slate-900/40 space-y-3 animate-fade-in">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-extrabold flex items-center gap-1">🍽️ {t('table_floorplan')} {activeTable ? <span className="text-blue-500 font-sans">{activeTable}</span> : <span className="text-slate-400">{t('no_table_selected')}</span>}</span>
                  <div className="flex gap-1.5 font-bold text-[10px]">
                    <button
                      type="button"
                      onClick={() => setShowManageTablesModal(true)}
                      className="px-2 py-1 rounded bg-teal-600/10 text-teal-500 hover:bg-teal-650/20"
                    >
                      🛠️ {t('manage_tables')}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (activeTable) {
                          const mergeTarget = prompt('أدخل رقم الطاولة لدمجها معها (مثال: Table 3):');
                          if (mergeTarget) alert(`تم دمج ${activeTable} مع ${mergeTarget} بنجاح.`);
                        } else {
                          alert('الرجاء اختيار طاولة أولاً.');
                        }
                      }}
                      className="px-2 py-1 rounded bg-blue-600/10 text-blue-500 hover:bg-blue-600/20"
                    >
                      {t('merge_tables')}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (activeTable) alert(`تم تقسيم فاتورة الطاولة ${activeTable} بنجاح.`);
                      }}
                      className="px-2 py-1 rounded bg-red-600/10 text-red-500 hover:bg-red-600/20"
                    >
                      {t('split_table')}
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-6 gap-2">
                  {tables.map(tbl => {
                    const isSelected = activeTable === tbl;
                    const hasOpenInvoice = suspendedList.some(o => o.table_number === tbl);
                    return (
                      <button
                        key={tbl}
                        type="button"
                        onClick={() => setActiveTable(isSelected ? null : tbl)}
                        className={`py-2 px-1 rounded-xl text-xs font-bold transition-all border flex flex-col items-center justify-center gap-0.5 ${
                          isSelected
                            ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                            : hasOpenInvoice
                              ? 'bg-amber-500/10 dark:bg-amber-500/20 border-amber-500 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20'
                              : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-100'
                        }`}
                      >
                        <span>{tbl.replace('Table ', t('t'))}</span>
                        {hasOpenInvoice && (
                          <span className={`text-[8px] font-medium ${isSelected ? 'text-blue-200' : 'text-amber-500'}`}>
                            ({t('occupied')})
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Search & Barcode simulation bar */}
            <div className="flex gap-2 items-center bg-white/40 dark:bg-slate-900/40 p-2 rounded-2xl border border-slate-200/50 dark:border-slate-800/50">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder={t('search_placeholder')}
                  className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-850 bg-white/50 dark:bg-slate-900/50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                />
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
              </div>

              <div className="flex gap-1.5 text-[10px] font-bold">
                {popularProducts.map((prod) => (
                  <button
                    key={prod.id}
                    onClick={() => handleProductClick(prod)}
                    className="px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-850 bg-white/30 dark:bg-slate-900/30 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all flex items-center gap-1 text-slate-700 dark:text-slate-300"
                  >
                    🔥 {isRtl ? `الأكثر طلباً: ${prod.name_ar}` : `Best Seller: ${prod.name_en}`}
                  </button>
                ))}
              </div>
            </div>

            {/* Categories Tab selector */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all border ${
                    activeCategory === cat
                      ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                      : 'bg-white/40 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {getCategoryLabel(cat)}
                </button>
              ))}
            </div>

            {/* Scale weight indicator */}
            {devices.scale && (
              <div className="p-3 rounded-xl border border-slate-200/50 dark:border-slate-800/50 bg-white dark:bg-slate-955 text-xs flex justify-between items-center gap-4 animate-fade-in shadow-xs">
                <span className="font-bold">⚖️ {t('electronic_scale_weight')}</span>
                {import.meta.env.DEV && (
                  <input
                    type="range"
                    min={0.1}
                    max={10}
                    step={0.05}
                    value={mockScaleWeight}
                    onChange={e => setMockScaleWeight(parseFloat(e.target.value))}
                    className="flex-1"
                  />
                )}
                <span className="font-bold text-blue-500 font-sans">{mockScaleWeight.toFixed(2)} kg</span>
              </div>
            )}

            {/* Grid Catalog */}
            <div className="flex-1 overflow-y-auto max-h-[340px] grid grid-cols-2 sm:grid-cols-3 gap-3.5 pr-1">
              {filteredProducts.map(p => {
                const hasLowStock = (p.stock !== undefined ? p.stock : 8) <= p.min_stock;
                return (
                  <div
                    key={p.id}
                    onClick={() => handleProductClick(p)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer select-none flex flex-col justify-between h-36 ${
                      hasLowStock 
                        ? 'bg-amber-500/5 border-amber-500/20 hover:border-amber-500/40 hover:bg-amber-500/10' 
                        : 'glass-card border-slate-200/30 dark:border-slate-800/30 hover:border-blue-500/40 hover:bg-blue-500/5'
                    }`}
                  >
                    <div className="flex gap-2 items-start min-w-0">
                      {p.image_base64 ? (
                        <img 
                          src={p.image_base64} 
                          alt="" 
                          className="w-12 h-12 rounded-lg object-cover flex-shrink-0 border border-slate-200/50 dark:border-slate-850" 
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0 text-slate-400 text-base border border-slate-200/50 dark:border-slate-850">
                          📦
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex justify-between items-start gap-1">
                          <span className="text-[9px] font-bold text-slate-400 capitalize truncate">{p.category}</span>
                          {p.is_pharmaceutical === 1 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSubstSearch(p);
                              }}
                              className="px-1 py-0.5 rounded bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 font-bold text-[8px] flex items-center gap-0.5 font-sans"
                              title="البدائل الدوائية"
                            >
                              🧬
                            </button>
                          )}
                        </div>
                        <h4 className="font-bold text-[11px] mt-0.5 text-slate-850 dark:text-slate-100 line-clamp-2 leading-tight">
                          {isRtl ? p.name_ar : p.name_en}
                        </h4>
                        {p.scientific_name && (
                          <div className="text-[8px] text-slate-500 dark:text-slate-400 truncate mt-0.5">{p.scientific_name}</div>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-between items-end pt-2 border-t border-slate-100 dark:border-slate-850">
                      <span className="font-bold text-xs font-sans text-blue-500 dark:text-blue-400">{p.price.toFixed(2)} <span className="text-[9px] font-normal">{currency}</span></span>
                      <span className={`text-[9px] font-bold ${hasLowStock ? 'text-amber-500' : 'text-slate-400'}`}>
                        {p.type === 'weight' ? (t('by_weight')) : `${t('stock_1')} ${p.stock !== undefined ? p.stock : 8}`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Checkout cart sidebar */}
      <div className="glass-card rounded-2xl flex flex-col justify-between h-[480px] shadow-sm overflow-hidden border border-slate-200/50 dark:border-slate-800/50">
        {/* Customer & Suspended triggers */}
        <div className="p-3 bg-slate-100/50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 flex gap-2 justify-between items-center text-xs">
          {/* Customer selection */}
          <div className="flex items-center gap-1.5 flex-1">
            <User className="h-4 w-4 text-slate-400" />
            <select
              value={selectedCustomer?.id || ''}
              onChange={e => {
                const c = customers.find(x => x.id === e.target.value);
                setSelectedCustomer(c);
              }}
              className="bg-transparent font-bold focus:outline-none w-full truncate"
            >
              <option value="">-- {t('select_customer')} --</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.tier})</option>
              ))}
            </select>
          </div>

          {/* Suspended bills list trigger */}
          {suspendedList.length > 0 && (
            <div className="relative">
              <select
                onChange={async e => {
                  if (e.target.value) {
                    await resumeOrder(e.target.value);
                    e.target.value = '';
                  }
                }}
                className="px-2 py-1 rounded bg-amber-500/10 text-amber-500 font-bold border-none text-[10px] focus:outline-none cursor-pointer"
              >
                <option value="">📥 {t('suspended')} ({suspendedList.length})</option>
                {suspendedList.map(item => (
                  <option key={item.id} value={item.id}>{item.invoice_number} - {item.total} {currency}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Cart Items list */}
        <div className="flex-1 overflow-y-auto p-3.5 space-y-2">
          {cartItems.length === 0 ? (
            <div className="flex flex-col justify-center items-center h-full text-slate-400 space-y-2">
              <ShoppingCart className="h-10 w-10 stroke-1" />
              <span className="text-xs">{t('cart_is_empty')}</span>
            </div>
          ) : (
            cartItems.map(item => (
              <div key={item.product.id} className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-850 bg-white/20 dark:bg-slate-900/20 flex justify-between items-center text-xs">
                <div className="space-y-0.5 flex-1 min-w-0 pr-2">
                  <h5 className="font-bold truncate text-slate-800 dark:text-slate-100">
                    {isRtl ? item.product.name_ar : item.product.name_en}
                  </h5>
                  <div className="text-[10px] text-slate-400 flex items-center flex-wrap gap-1">
                    <span 
                      onClick={() => {
                        const newPrice = prompt(isRtl ? 'تعديل سعر الوحدة لـ ' + (isRtl ? item.product.name_ar : item.product.name_en) + ':' : 'Override unit price for ' + item.product.name_en + ':', item.product.price.toString());
                        if (newPrice !== null) {
                          const parsed = parseFloat(newPrice);
                          if (parsed >= 0) updateCartItemPrice(item.product.id, parsed);
                        }
                      }}
                      className="cursor-pointer hover:underline text-blue-500 hover:text-blue-600 font-sans font-bold"
                      title={t('click_to_override_price')}
                    >
                      {item.product.price.toFixed(2)} {currency}
                    </span>
                    <span>x</span>
                    <span
                      onClick={() => {
                        const newQty = prompt(t('edit_required_quantity'), item.quantity.toString());
                        if (newQty !== null) {
                          const parsed = parseFloat(newQty);
                          if (parsed > 0) updateQuantity(item.product.id, parsed);
                        }
                      }}
                      className="cursor-pointer hover:underline text-indigo-500 hover:text-indigo-600 font-sans font-bold"
                      title={t('click_to_edit_quantity')}
                    >
                      {item.quantity}
                    </span>
                    {item.discountPercentage ? (
                      <span className="text-[9px] bg-red-500/10 text-red-500 px-1 py-0.2 rounded font-bold">
                        (-{item.discountPercentage}%)
                      </span>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => {
                        const newDisc = prompt(t('custom_percentage_discount_for_this_line_item_0_100'), (item.discountPercentage || 0).toString());
                        if (newDisc !== null) {
                          const parsed = parseFloat(newDisc);
                          if (parsed >= 0 && parsed <= 100) updateCartItemDiscount(item.product.id, parsed);
                        }
                      }}
                      className="text-[8px] border border-red-500/20 text-red-500 px-1 rounded-sm hover:bg-red-500/10 ml-1"
                    >
                      %
                    </button>
                    {item.selectedBatch && <span className="text-[9px] text-slate-400"> (B: {item.selectedBatch.batch_number})</span>}
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                    className="h-5 w-5 rounded bg-slate-200 dark:bg-slate-800 font-bold flex items-center justify-center hover:bg-slate-300 transition-all"
                  >
                    -
                  </button>
                  <span 
                    onClick={() => {
                      const newQty = prompt(t('edit_quantity'), item.quantity.toString());
                      if (newQty !== null) {
                        const parsed = parseFloat(newQty);
                        if (parsed > 0) updateQuantity(item.product.id, parsed);
                      }
                    }}
                    className="font-bold font-sans px-1 text-center min-w-[20px] cursor-pointer hover:text-blue-500"
                  >
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                    className="h-5 w-5 rounded bg-slate-200 dark:bg-slate-800 font-bold flex items-center justify-center hover:bg-slate-300 transition-all"
                  >
                    +
                  </button>
                  <button
                    onClick={() => removeFromCart(item.product.id)}
                    className="text-red-500 hover:bg-red-500/10 p-1 rounded ml-1"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Cart Totals Summary */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-3.5 bg-slate-100/30 dark:bg-slate-900/30 text-xs">
          {/* Discount coupon form */}
          <form onSubmit={handleCouponSubmit} className="flex gap-2 pb-2 border-b border-slate-200 dark:border-slate-850">
            <input
              type="text"
              value={couponInput}
              onChange={e => setCouponInput(e.target.value)}
              placeholder="كود الخصم (مثل SAVE10)"
              className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-900 focus:outline-none text-[10px]"
            />
            <button
              type="submit"
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px]"
            >
              تطبيق
            </button>
          </form>

          <div className="space-y-1.5 font-semibold">
            <div className="flex justify-between">
              <span>{t('subtotal')}</span>
              <span>{subtotal.toFixed(2)} {currency}</span>
            </div>
            <div className="flex justify-between text-red-500">
              <span>{t('discount')}</span>
              <span>-{discountAmount.toFixed(2)} {currency}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>{t('tax')}</span>
              <span>{taxAmount.toFixed(2)} {currency}</span>
            </div>
            <div className="flex justify-between font-bold text-sm border-t pt-2 border-slate-200 dark:border-slate-800">
              <span>{t('total')}</span>
              <span className="text-blue-600 dark:text-blue-400">{totalAmount.toFixed(2)} {currency}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-bold pt-1">
            <button
              onClick={suspendOrder}
              disabled={cartItems.length === 0}
              className="py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-slate-500"
            >
              {t('suspend_bill')}
            </button>
            <button
              onClick={() => {
                if (cartItems.length > 0) setShowPaymentModal(true);
              }}
              disabled={cartItems.length === 0}
              className="py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-md"
            >
              {t('checkout')}
            </button>
          </div>

          {/* Refund button (TASK B) + Split Bill button for restaurant (TASK C) */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => { setShowRefundModal(true); setRefundSuccess(false); setRefundFoundOrder(null); setRefundOrderItems([]); }}
              className="flex-1 py-2 rounded-xl border border-orange-300 dark:border-orange-700 text-orange-500 hover:bg-orange-500/10 transition-all text-xs font-bold"
            >
              ↩️ {t('refund_return')}
            </button>
            {businessType === 'restaurant' && (
              <button
                type="button"
                onClick={() => { setSplitBillSuccess(false); setSplitAssignments({}); setShowSplitBillModal(true); }}
                disabled={cartItems.length === 0}
                className="flex-1 py-2 rounded-xl border border-indigo-300 dark:border-indigo-700 text-indigo-500 hover:bg-indigo-500/10 transition-all text-xs font-bold disabled:opacity-40"
              >
                🔀 {t('split_bill')}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ===== TASK A: Open Shift Modal ===== */}
      {showOpenShiftModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card p-6 rounded-2xl max-w-sm w-full space-y-4 animate-fade-in">
            <h3 className="font-bold text-base text-emerald-500 flex items-center gap-2">🟢 {t('open_new_shift')}</h3>
            <div>
              <label className="text-xs text-slate-500 font-bold block mb-1">{t('starting_cash_in_drawer')}</label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={shiftStartCashInput}
                onChange={e => setShiftStartCashInput(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none text-center font-sans text-lg font-bold"
                autoFocus
              />
              <p className="text-[10px] text-slate-400 mt-1">{isRtl ? `مثال: 500 ${currency} في الصندوق` : `e.g. 500 ${currency} in drawer`}</p>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowOpenShiftModal(false)}
                className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800">
                {t('cancel')}
              </button>
              <button type="button" onClick={handleOpenShift}
                className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm">
                🟢 {t('open_shift')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== TASK A: Close Shift Modal ===== */}
      {showCloseShiftModal && activeShift && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card p-6 rounded-2xl max-w-md w-full space-y-4 animate-fade-in">
            <h3 className="font-bold text-base text-red-500 flex items-center gap-2">🔒 {t('close_current_shift')}</h3>

            <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs space-y-1.5 font-semibold">
              <div className="flex justify-between">
                <span className="text-slate-500">{t('shift_start')}</span>
                <span>{new Date(activeShift.startTime).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">{t('start_cash')}</span>
                <span className="font-sans">{activeShift.startCash.toFixed(2)} {currency}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">{t('session_sales')}</span>
                <span className="font-sans text-blue-500">{totalAmount.toFixed(2)} {currency}</span>
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-500 font-bold block mb-1">{t('actual_cash_in_drawer_now')}</label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={shiftEndCashInput}
                onChange={e => setShiftEndCashInput(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none text-center font-sans text-lg font-bold"
              />
            </div>

            {shiftEndCashInput > 0 && (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border text-xs">
                <div className="flex justify-between font-semibold">
                  <span>{t('expected_in_drawer')}</span>
                  <span className="font-sans">{(activeShift.startCash + totalAmount).toFixed(2)} {currency}</span>
                </div>
                <div className={`flex justify-between font-bold mt-1 ${shiftEndCashInput - (activeShift.startCash + totalAmount) < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                  <span>{t('difference')}</span>
                  <span className="font-sans">{(shiftEndCashInput - (activeShift.startCash + totalAmount)).toFixed(2)} {currency}</span>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button type="button" onClick={() => setShowCloseShiftModal(false)}
                className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800">
                {t('cancel')}
              </button>
              <button type="button" onClick={handleCloseShift}
                className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-sm">
                🔒 {t('close_print_report')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== TASK A: Shift Closed Report ===== */}
      {shiftClosedReport && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl max-w-md w-full space-y-4 text-right shadow-2xl border border-slate-200 dark:border-slate-700">
            <h3 className="font-bold text-lg text-center text-slate-800 dark:text-white">📋 {t('shift_closure_report')}</h3>
            <div className="space-y-2 text-xs font-semibold divide-y divide-slate-100 dark:divide-slate-800">
              <div className="flex justify-between py-1"><span className="text-slate-500">{t('opened')}</span><span>{new Date(shiftClosedReport.startTime).toLocaleString()}</span></div>
              <div className="flex justify-between py-1"><span className="text-slate-500">{t('closed')}</span><span>{new Date(shiftClosedReport.endTime).toLocaleString()}</span></div>
              <div className="flex justify-between py-1"><span className="text-slate-500">{t('total_sales')}</span><span className="text-blue-500 font-sans">{shiftClosedReport.totalSales.toFixed(2)} {currency}</span></div>
              <div className="flex justify-between py-1"><span className="text-slate-500">{t('expected_cash')}</span><span className="font-sans">{(activeShift?.startCash || 0 + shiftClosedReport.totalSales).toFixed(2)} {currency}</span></div>
              <div className="flex justify-between py-1"><span className="text-slate-500">{t('actual_cash')}</span><span className="font-sans">{shiftClosedReport.endCash.toFixed(2)} {currency}</span></div>
              <div className={`flex justify-between py-1 font-bold ${shiftClosedReport.difference < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                <span>{t('difference')}</span>
                <span className="font-sans">{shiftClosedReport.difference.toFixed(2)} {currency}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => window.print()} className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold">🖨️ {t('print_report')}</button>
              <button type="button" onClick={() => setShiftClosedReport(null)} className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800">{t('close')}</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== TASK B: Refund Modal ===== */}
      {showRefundModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-fade-in">
            <div className="bg-gradient-to-r from-orange-500 to-red-500 p-4 flex justify-between items-center">
              <div>
                <h3 className="text-white font-bold">↩️ {t('sales_refund_return')}</h3>
                <p className="text-orange-100 text-[10px]">{t('search_by_original_invoice_number')}</p>
              </div>
              <button type="button" onClick={() => setShowRefundModal(false)} className="text-white text-xl">✕</button>
            </div>

            <div className="p-5 space-y-4">
              {refundSuccess ? (
                <div className="text-center py-8 space-y-3">
                  <div className="text-5xl">✅</div>
                  <h4 className="font-bold text-emerald-500 text-base">{t('refund_recorded_successfully')}</h4>
                  <p className="text-xs text-slate-400">{t('a_negative_refund_order_has_been_created_in_the_database')}</p>
                  <button type="button" onClick={() => setShowRefundModal(false)} className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs">{t('close')}</button>
                </div>
              ) : (
                <>
                  {/* Invoice search */}
                  <div>
                    <label className="text-xs text-slate-500 font-bold block mb-1">{t('original_invoice_number')}</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={refundInvoiceSearch}
                        onChange={e => setRefundInvoiceSearch(e.target.value)}
                        placeholder={t('eg_inv_20260624_001')}
                        className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none text-xs font-mono"
                        onKeyDown={e => e.key === 'Enter' && handleRefundSearch()}
                      />
                      <button type="button" onClick={handleRefundSearch}
                        className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs">
                        {t('search')}
                      </button>
                    </div>
                  </div>

                  {/* Found order items */}
                  {refundFoundOrder && (
                    <div className="space-y-3">
                      <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs">
                        <div className="flex justify-between font-bold">
                          <span>{t('invoice')} {refundFoundOrder.invoice_number}</span>
                          <span className="text-blue-500 font-sans">{refundFoundOrder.total.toFixed(2)} {currency}</span>
                        </div>
                        <div className="text-slate-400 mt-0.5">{new Date(refundFoundOrder.created_at).toLocaleString()}</div>
                      </div>

                      <div className="space-y-2 max-h-[200px] overflow-y-auto">
                        {refundOrderItems.map(item => (
                          <div key={item.id} className="flex items-center gap-3 p-2 rounded-lg border border-slate-100 dark:border-slate-800 text-xs">
                            <input
                              type="checkbox"
                              checked={refundSelectedItems[item.id]?.selected ?? true}
                              onChange={e => setRefundSelectedItems(prev => ({ ...prev, [item.id]: { ...prev[item.id], selected: e.target.checked } }))}
                              className="h-4 w-4 rounded"
                            />
                            <span className="flex-1 font-bold">{item.productName}</span>
                            <span className="text-slate-400 font-sans">{item.price.toFixed(2)} x</span>
                            <input
                              type="number"
                              min={1}
                              max={item.quantity}
                              value={refundSelectedItems[item.id]?.qty ?? item.quantity}
                              onChange={e => setRefundSelectedItems(prev => ({ ...prev, [item.id]: { ...prev[item.id], qty: parseInt(e.target.value) || 1 } }))}
                              className="w-12 text-center border border-slate-200 dark:border-slate-700 rounded px-1 py-0.5 font-sans bg-white dark:bg-slate-900 focus:outline-none"
                            />
                          </div>
                        ))}
                      </div>

                      <div>
                        <label className="text-xs text-slate-500 font-bold block mb-1">{t('refund_reason_optional')}</label>
                        <input
                          type="text"
                          value={refundReason}
                          onChange={e => setRefundReason(e.target.value)}
                          placeholder={t('eg_damaged_product_wrong_order')}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none text-xs"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={handleConfirmRefund}
                        disabled={refundLoading}
                        className="w-full py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-sm disabled:opacity-60"
                      >
                        {refundLoading ? (t('processing')) : `✅ ${t('confirm_refund')}`}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== TASK C: Split Bill Modal (Restaurant only) ===== */}
      {showSplitBillModal && businessType === 'restaurant' && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-fade-in">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-500 p-4 flex justify-between items-center">
              <div>
                <h3 className="text-white font-bold">🔀 {t('split_bill')}</h3>
                <p className="text-indigo-100 text-[10px]">{t('assign_items_to_each_person')}</p>
              </div>
              <button type="button" onClick={() => setShowSplitBillModal(false)} className="text-white text-xl">✕</button>
            </div>

            <div className="p-5 space-y-4">
              {splitBillSuccess ? (
                <div className="text-center py-8 space-y-3">
                  <div className="text-5xl">✅</div>
                  <h4 className="font-bold text-emerald-500 text-base">{t('bill_split_successfully')}</h4>
                  <p className="text-xs text-slate-400">{t('suspended_orders_created_for_each_person')}</p>
                </div>
              ) : (
                <>
                  {/* Number of people */}
                  <div>
                    <label className="text-xs text-slate-500 font-bold block mb-2">{t('number_of_people')}</label>
                    <div className="flex gap-2 justify-center">
                      {[2,3,4,5,6,7,8].map(n => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setSplitPeople(n)}
                          className={`w-9 h-9 rounded-full font-bold text-sm transition-all ${
                            splitPeople === n ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-indigo-100'
                          }`}
                        >{n}</button>
                      ))}
                    </div>
                  </div>

                  {/* Item assignment */}
                  <div className="space-y-2 max-h-[220px] overflow-y-auto">
                    <p className="text-[10px] text-slate-400 font-bold">{t('click_an_item_to_assign_to_a_person_person_1_is_default')}</p>
                    {cartItems.map(item => {
                      const assigned = splitAssignments[item.product.id] || 1;
                      return (
                        <div key={item.product.id} className="flex items-center gap-2 p-2 rounded-lg border border-slate-100 dark:border-slate-800 text-xs">
                          <span className="flex-1 font-bold truncate">{isRtl ? item.product.name_ar : item.product.name_en}</span>
                          <span className="text-slate-400 font-sans">{item.quantity} x {item.product.price.toFixed(2)}</span>
                          <div className="flex gap-1">
                            {Array.from({ length: splitPeople }, (_, i) => i + 1).map(personIdx => (
                              <button
                                key={personIdx}
                                type="button"
                                onClick={() => setSplitAssignments(prev => ({ ...prev, [item.product.id]: personIdx }))}
                                className={`w-6 h-6 rounded-full text-[10px] font-bold transition-all ${
                                  assigned === personIdx ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-indigo-100'
                                }`}
                              >{personIdx}</button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Per-person totals */}
                  <div className="grid grid-cols-2 gap-2">
                    {Array.from({ length: splitPeople }, (_, i) => i + 1).map(personIdx => {
                      const personTotal = cartItems
                        .filter(item => (splitAssignments[item.product.id] || 1) === personIdx)
                        .reduce((sum, item) => sum + item.product.price * item.quantity, 0);
                      return (
                        <div key={personIdx} className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 text-xs">
                          <span className="text-indigo-600 dark:text-indigo-400 font-bold">{isRtl ? `الشخص ${personIdx}` : `Person ${personIdx}`}</span>
                          <span className="float-left font-bold font-sans text-blue-500">{personTotal.toFixed(2)} {currency}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Equal split option */}
                  <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900/50 border text-xs text-center">
                    <span className="text-slate-500 font-bold">{t('equal_split')} </span>
                    <span className="text-blue-500 font-bold font-sans">{(totalAmount / splitPeople).toFixed(2)} {currency} {t('per_person')}</span>
                  </div>

                  <div className="flex gap-2">
                    <button type="button" onClick={() => setShowSplitBillModal(false)}
                      className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800">
                      {t('cancel')}
                    </button>
                    <button type="button" onClick={handleConfirmSplitBill}
                      className="flex-1 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm">
                      🔀 {t('create_split_bills')}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Alternative substitution drug modal */}
      {substProduct && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card p-6 rounded-2xl max-w-md w-full space-y-4 animate-fade-in text-right">
            <h3 className="font-bold text-base border-b pb-2">
              🧬 {t('drug_substitution_helper')}
            </h3>
            <div className="text-xs">
              <div><b>الدواء المحدد:</b> {substProduct.name_ar}</div>
              <div className="text-slate-400">الاسم العلمي: {substProduct.scientific_name}</div>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] text-slate-400 font-bold block">الأدوية البديلة ذات المطابقة العلمية نفسها:</span>
              {alternatives.length === 0 ? (
                <div className="text-center text-xs py-6 text-slate-400">لا يوجد أدوية بديلة مطابقة مسجلة حالياً.</div>
              ) : (
                alternatives.map(alt => (
                  <div
                    key={alt.id}
                    onClick={() => {
                      handleProductClick(alt);
                      setSubstProduct(null);
                    }}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/30 dark:bg-slate-900/30 hover:border-blue-500/40 cursor-pointer flex justify-between items-center text-xs transition-all"
                  >
                    <div>
                      <div className="font-bold">{alt.name_ar}</div>
                      <div className="text-[10px] text-slate-400">{t('price_1')} {alt.price} {currency}</div>
                    </div>
                    <span className="text-emerald-500 font-bold font-sans">اختر البديل ➜</span>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSubstProduct(null)}
                className="px-4 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Checkout Drawer Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card p-6 rounded-2xl max-w-md w-full space-y-4 animate-fade-in text-right">
            <h3 className="font-bold text-base border-b pb-2 flex items-center justify-between">
              <span>{t('checkout')}</span>
              <span className="text-sm font-sans text-blue-500">{totalAmount.toFixed(2)} {currency}</span>
            </h3>

            <div className="space-y-4 text-xs font-semibold">
              {/* Payment selector tabs */}
              <div className="grid grid-cols-4 gap-2 text-center font-bold">
                <button
                  type="button"
                  onClick={() => setPaymentType('cash')}
                  className={`p-2 py-3 rounded-xl border text-[10px] flex flex-col items-center gap-1 transition-all ${paymentType === 'cash' ? 'bg-blue-600 border-blue-600 text-white shadow-xs' : 'border-slate-200 dark:border-slate-800'}`}
                >
                  💵 {t('pay_cash')}
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentType('card')}
                  className={`p-2 py-3 rounded-xl border text-[10px] flex flex-col items-center gap-1 transition-all ${paymentType === 'card' ? 'bg-blue-600 border-blue-600 text-white shadow-xs' : 'border-slate-200 dark:border-slate-800'}`}
                >
                  💳 {t('pay_card')}
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentType('bank_transfer')}
                  className={`p-2 py-3 rounded-xl border text-[10px] flex flex-col items-center gap-1 transition-all ${paymentType === 'bank_transfer' ? 'bg-blue-600 border-blue-600 text-white shadow-xs' : 'border-slate-200 dark:border-slate-800'}`}
                >
                  🏦 {t('pay_bank')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPaymentType('split');
                    setSplitCash(parseFloat((totalAmount / 3).toFixed(2)));
                    setSplitCard(parseFloat((totalAmount / 3).toFixed(2)));
                    setSplitBank(parseFloat((totalAmount / 3).toFixed(2)));
                  }}
                  className={`p-2 py-3 rounded-xl border text-[10px] flex flex-col items-center gap-1 transition-all ${paymentType === 'split' ? 'bg-blue-600 border-blue-600 text-white shadow-xs' : 'border-slate-200 dark:border-slate-800'}`}
                >
                  🔀 {t('pay_split')}
                </button>
              </div>

              {/* Split payment parameters */}
              {paymentType === 'split' && (
                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5 bg-slate-100/30">
                  <span className="text-[10px] text-slate-500 font-bold block mb-1">حدد نسب الدفع المتعدد:</span>
                  <div className="flex gap-2 items-center">
                    <span>نقدي</span>
                    <input
                      type="number"
                      value={splitCash}
                      onChange={e => setSplitCash(parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1 rounded border dark:border-slate-700 bg-transparent text-center font-sans"
                    />
                  </div>
                  <div className="flex gap-2 items-center">
                    <span>بطاقة</span>
                    <input
                      type="number"
                      value={splitCard}
                      onChange={e => setSplitCard(parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1 rounded border dark:border-slate-700 bg-transparent text-center font-sans"
                    />
                  </div>
                  <div className="flex gap-2 items-center">
                    <span>تحويل</span>
                    <input
                      type="number"
                      value={splitBank}
                      onChange={e => setSplitBank(parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1 rounded border dark:border-slate-700 bg-transparent text-center font-sans"
                    />
                  </div>
                  <div className="flex justify-between font-bold text-[10px] border-t pt-2 mt-1">
                    <span>مجموع الإدخال:</span>
                    <span className={(splitCash + splitCard + splitBank).toFixed(2) === totalAmount.toFixed(2) ? 'text-emerald-500' : 'text-red-500'}>
                      {(splitCash + splitCard + splitBank).toFixed(2)} / {totalAmount.toFixed(2)} {currency}
                    </span>
                  </div>
                </div>
              )}

              {/* Cash Change Calculator Panel */}
              {(paymentType === 'cash' || paymentType === 'split') && (
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 bg-slate-100/30">
                  <span className="text-[10px] text-slate-500 font-bold block mb-1">🧮 {t('cash_change_calculator')}</span>
                  
                  <div className="flex gap-2 items-center">
                    <span className="shrink-0 font-bold">{t('cash_received')}</span>
                    <input
                      type="number"
                      placeholder={t('eg_100')}
                      value={cashReceived}
                      onChange={e => {
                        const val = e.target.value === '' ? '' : parseFloat(e.target.value);
                        setCashReceived(val);
                      }}
                      className="w-full px-3 py-1.5 rounded-lg border dark:border-slate-700 bg-white dark:bg-slate-900 text-center font-sans font-bold text-sm focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  {/* Quick cash buttons */}
                  <div className="grid grid-cols-4 gap-1.5 text-center font-mono font-bold text-[9px]">
                    <button
                      type="button"
                      onClick={() => setCashReceived(totalAmount)}
                      className="py-1 rounded bg-slate-250 dark:bg-slate-800 hover:bg-slate-300 text-slate-700 dark:text-slate-300"
                    >
                      {t('exact')}
                    </button>
                    {[50, 100, 200, 500].map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setCashReceived(val)}
                        className="py-1 rounded bg-slate-250 dark:bg-slate-800 hover:bg-slate-300 text-slate-700 dark:text-slate-300"
                      >
                        {val} {currency}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setCashReceived(prev => (prev || 0) + 10)}
                      className="py-1 rounded bg-blue-500/10 text-blue-500 hover:bg-blue-500/20"
                    >
                      +10
                    </button>
                    <button
                      type="button"
                      onClick={() => setCashReceived(prev => (prev || 0) + 50)}
                      className="py-1 rounded bg-blue-500/10 text-blue-500 hover:bg-blue-500/20"
                    >
                      +50
                    </button>
                    <button
                      type="button"
                      onClick={() => setCashReceived('')}
                      className="py-1 rounded bg-red-500/10 text-red-500 hover:bg-red-500/20"
                    >
                      {t('clear')}
                    </button>
                  </div>

                  {/* Calculated Change Due display */}
                  {cashReceived !== '' && cashReceived >= totalAmount && (
                    <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-center animate-fade-in">
                      <div className="text-[10px] text-slate-400 font-bold">{t('change_due_to_customer')}</div>
                      <div className="text-xl font-bold font-sans text-emerald-500">{(cashReceived - totalAmount).toFixed(2)} {currency}</div>
                    </div>
                  )}
                  {cashReceived !== '' && cashReceived < totalAmount && (
                    <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-center text-amber-500 text-[10px] font-bold">
                      ⚠️ {t('amount_is_less_than_invoice_total')}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-2 justify-end pt-2 border-t">
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleCheckoutSubmit}
                disabled={paymentType === 'split' && (splitCash + splitCard + splitBank).toFixed(2) !== totalAmount.toFixed(2)}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm"
              >
                {t('checkout')} ➜
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clothing tag label print emulator modal */}
      {printTagProduct && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card p-6 rounded-2xl max-w-sm w-full space-y-4 animate-fade-in text-center flex flex-col items-center">
            <div className="flex justify-between w-full border-b pb-2">
              <span className="text-xs font-bold flex items-center gap-1.5">
                🏷️ {t('clothing_tag_barcode_sticker')}
              </span>
              <button
                onClick={() => setPrintTagProduct(null)}
                className="text-slate-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            {/* Sticker preview card */}
            <div className="bg-white p-5 rounded-lg shadow-md border w-64 text-black font-sans space-y-3">
              <div className="text-[10px] text-slate-500 font-extrabold tracking-wider">ANTIGRAVITY BOUTIQUE</div>
              <div className="text-center font-bold text-xs truncate">{isRtl ? printTagProduct.product.name_ar : printTagProduct.product.name_en}</div>
              
              <div className="flex justify-around text-[10px] font-bold bg-slate-100 p-1.5 rounded border border-slate-200">
                <div>{t('size_1')} <span className="text-indigo-600">{printTagProduct.size}</span></div>
                <div className="border-l border-slate-300"></div>
                <div>{t('color_1')} <span className="text-indigo-600">{isRtl && printTagProduct.color === 'Red' ? 'أحمر' : isRtl && printTagProduct.color === 'Blue' ? 'أزرق' : isRtl && printTagProduct.color === 'Black' ? 'أسود' : printTagProduct.color}</span></div>
              </div>

              {/* Barcode lines */}
              <div className="flex flex-col items-center py-2 bg-slate-50/50 rounded border border-slate-100">
                <div className="w-48 h-8 bg-slate-900 flex items-center justify-between px-2 text-[6px] text-transparent select-none">
                  || |||| ||| |||| | || |||| ||| |||| |
                </div>
                <span className="font-mono text-[9px] tracking-widest mt-1 font-bold">{printTagProduct.product.barcode}</span>
              </div>

              <div className="flex justify-between items-center text-xs border-t pt-2 mt-1">
                <span className="text-[9px] text-slate-400 font-bold">PRICE:</span>
                <span className="font-extrabold text-indigo-600 text-sm">{printTagProduct.product.price.toFixed(2)} {currency}</span>
              </div>
            </div>

            <div className="flex gap-2 justify-end w-full border-t pt-3">
              <button
                onClick={() => {
                  alert(t('successfully_emulated_printing_clothing_price_tag_to_zpl_label_printer'));
                  setPrintTagProduct(null);
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm flex-1"
              >
                🖨️ {t('print_label')}
              </button>
              <button
                onClick={() => setPrintTagProduct(null)}
                className="px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs font-semibold"
              >
                {t('close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Supermarket price checker helper modal */}
      {showPriceChecker && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card p-6 rounded-2xl max-w-md w-full space-y-4 animate-fade-in text-right">
            <h3 className="font-bold text-base border-b pb-2 flex items-center justify-between">
              <span>🔍 {t('fast_item_price_checker')}</span>
              <button
                onClick={() => {
                  setShowPriceChecker(false);
                  setPriceCheckBarcode('');
                  setPriceCheckProduct(null);
                }}
                className="text-slate-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </h3>

            <div className="space-y-3">
              <label className="text-[10px] text-slate-400 block font-bold">{t('scan_barcode_or_type_to_check_price')}</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder={t('type_barcode_press_enter')}
                  value={priceCheckBarcode}
                  onChange={e => setPriceCheckBarcode(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      const matched = products.find(p => p.barcode === priceCheckBarcode.trim());
                      if (matched) {
                        setPriceCheckProduct(matched);
                      } else {
                        alert(t('no_item_matches_this_barcode'));
                        setPriceCheckProduct(null);
                      }
                    }
                  }}
                  className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-950 text-center text-xs focus:outline-none font-mono text-black dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => {
                    const matched = products.find(p => p.barcode === priceCheckBarcode.trim());
                    if (matched) {
                      setPriceCheckProduct(matched);
                    } else {
                      alert(t('no_item_matches_this_barcode'));
                      setPriceCheckProduct(null);
                    }
                  }}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold"
                >
                  {t('check')}
                </button>
              </div>
            </div>

            {/* Checked product details display */}
            {priceCheckProduct ? (
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/30 space-y-3 animate-fade-in text-right">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[9px] bg-indigo-500/10 text-indigo-500 px-1.5 py-0.5 rounded font-extrabold">{priceCheckProduct.category}</span>
                    <h4 className="font-extrabold text-sm mt-1 text-slate-800 dark:text-slate-100">{isRtl ? priceCheckProduct.name_ar : priceCheckProduct.name_en}</h4>
                  </div>
                  <span className="font-extrabold text-blue-500 font-sans text-base">{priceCheckProduct.price.toFixed(2)} {currency}</span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-[10px] border-t pt-2 mt-1">
                  <div><b>{t('sku_1')}</b> <span className="font-mono">{priceCheckProduct.sku}</span></div>
                  <div><b>{t('barcode_1')}</b> <span className="font-mono">{priceCheckProduct.barcode}</span></div>
                  <div><b>{t('unit_cost_1')}</b> <span className="font-sans">{priceCheckProduct.cost.toFixed(2)} {currency}</span></div>
                  <div>
                    <b>{t('current_stock')}</b> 
                    <span className={`font-sans font-bold ml-1 ${priceCheckProduct.stock && priceCheckProduct.stock <= priceCheckProduct.min_stock ? 'text-amber-500' : 'text-emerald-500'}`}>
                      {priceCheckProduct.stock !== undefined ? priceCheckProduct.stock : 8} {priceCheckProduct.unit}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 border-t pt-2 mt-1">
                  <button
                    type="button"
                    onClick={() => {
                      addToCart(priceCheckProduct, 1);
                      setShowPriceChecker(false);
                      setPriceCheckBarcode('');
                      setPriceCheckProduct(null);
                      alert(t('added_item_to_checkout_cart'));
                    }}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                  >
                    🛒 {t('add_item_to_checkout_cart')}
                  </button>
                </div>
              </div>
            ) : priceCheckBarcode && (
              <div className="text-center text-xs py-4 text-slate-400">{isRtl ? 'اضغط "فحص" أو اضغط Enter لرؤية التفاصيل' : 'Press "Check" or press Enter to load data'}</div>
            )}

            <div className="flex justify-end pt-2 border-t">
              <button
                onClick={() => {
                  setShowPriceChecker(false);
                  setPriceCheckBarcode('');
                  setPriceCheckProduct(null);
                }}
                className="px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs font-semibold"
              >
                {t('close')}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Manage Tables Modal */}
      {showManageTablesModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card p-6 rounded-2xl max-w-md w-full space-y-4 animate-fade-in text-right">
            <h3 className="font-bold text-base border-b pb-2 flex items-center justify-between">
              <span>🛠️ {t('manage_restaurant_tables')}</span>
              <button
                onClick={() => {
                  setShowManageTablesModal(false);
                  setNewTableName('');
                }}
                className="text-slate-400 hover:text-red-500 font-bold font-sans"
              >
                ✕
              </button>
            </h3>

            <div className="space-y-3">
              <label className="text-[10px] text-slate-400 block font-bold">
                {t('add_new_table')}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder={t('eg_table_7_vip_table')}
                  value={newTableName}
                  onChange={e => setNewTableName(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-950 text-center text-xs focus:outline-none text-slate-800 dark:text-slate-200"
                />
                <button
                  type="button"
                  onClick={() => {
                    const name = newTableName.trim();
                    if (!name) return;
                    if (tables.includes(name)) {
                      alert(t('table_name_already_exists'));
                      return;
                    }
                    setTables(prev => [...prev, name]);
                    setNewTableName('');
                  }}
                  className="px-4 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold"
                >
                  {t('add')}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] text-slate-400 font-bold block">
                {t('current_tables_click_to_delete')}
              </span>
              <div className="flex gap-2 flex-wrap max-h-[200px] overflow-y-auto p-2 bg-slate-100/50 dark:bg-slate-950/50 rounded-xl border border-slate-200 dark:border-slate-800">
                {tables.map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      if (confirm(isRtl ? `هل أنت متأكد من حذف الطاولة "${t}"؟` : `Are you sure you want to delete table "${t}"?`)) {
                        setTables(prev => prev.filter(x => x !== t));
                        if (activeTable === t) setActiveTable(null);
                      }
                    }}
                    className="px-2.5 py-1 rounded text-[10px] font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-red-500 hover:text-red-500 text-slate-700 dark:text-slate-200 transition-all flex items-center gap-1"
                  >
                    <span>{t}</span>
                    <span className="text-red-500 font-normal">×</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t">
              <button
                onClick={() => {
                  setShowManageTablesModal(false);
                  setNewTableName('');
                }}
                className="px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs font-semibold"
              >
                {t('close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manage Sizes and Colors Modal */}
      {showManageVariantsModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card p-6 rounded-2xl max-w-md w-full space-y-4 animate-fade-in text-right">
            <h3 className="font-bold text-base border-b pb-2 flex items-center justify-between">
              <span>⚙️ {t('manage_sizes_colors')}</span>
              <button
                onClick={() => {
                  setShowManageVariantsModal(false);
                  setNewSizeName('');
                  setNewColorName('');
                }}
                className="text-slate-400 hover:text-red-500 font-bold font-sans"
              >
                ✕
              </button>
            </h3>

            {/* Sizes section */}
            <div className="space-y-3 pb-3 border-b border-slate-200 dark:border-slate-800">
              <label className="text-[10px] text-slate-400 block font-bold">
                {t('add_new_size')}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder={t('eg_xxl_42_xs')}
                  value={newSizeName}
                  onChange={e => setNewSizeName(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-950 text-center text-xs focus:outline-none text-slate-800 dark:text-slate-200"
                />
                <button
                  type="button"
                  onClick={() => {
                    const sz = newSizeName.trim();
                    if (!sz) return;
                    if (availableSizes.includes(sz)) {
                      alert(t('size_already_exists'));
                      return;
                    }
                    setAvailableSizes(prev => [...prev, sz]);
                    setNewSizeName('');
                  }}
                  className="px-4 py-1.5 bg-indigo-650 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold"
                >
                  {t('add')}
                </button>
              </div>

              <span className="text-[10px] text-slate-400 font-bold block">
                {t('current_sizes_click_to_delete')}
              </span>
              <div className="flex gap-2 flex-wrap max-h-[100px] overflow-y-auto p-2 bg-slate-100/50 dark:bg-slate-950/50 rounded-xl border border-slate-200 dark:border-slate-800">
                {availableSizes.map(sz => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => {
                      if (confirm(isRtl ? `هل أنت متأكد من حذف المقاس "${sz}"؟` : `Are you sure you want to delete size "${sz}"?`)) {
                        setAvailableSizes(prev => prev.filter(x => x !== sz));
                      }
                    }}
                    className="px-2 py-0.5 rounded text-[10px] font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-red-500 hover:text-red-500 text-slate-700 dark:text-slate-200 transition-all flex items-center gap-1"
                  >
                    <span>{sz}</span>
                    <span className="text-red-500 font-normal">×</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Colors section */}
            <div className="space-y-3">
              <label className="text-[10px] text-slate-400 block font-bold">
                {t('add_new_color')}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder={t('eg_yellow_white')}
                  value={newColorName}
                  onChange={e => setNewColorName(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-855 bg-white dark:bg-slate-955 text-center text-xs focus:outline-none text-slate-800 dark:text-slate-200"
                />
                <button
                  type="button"
                  onClick={() => {
                    const col = newColorName.trim();
                    if (!col) return;
                    if (availableColors.includes(col)) {
                      alert(t('color_already_exists'));
                      return;
                    }
                    setAvailableColors(prev => [...prev, col]);
                    setNewColorName('');
                  }}
                  className="px-4 py-1.5 bg-indigo-650 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold"
                >
                  {t('add')}
                </button>
              </div>

              <span className="text-[10px] text-slate-400 font-bold block">
                {t('current_colors_click_to_delete')}
              </span>
              <div className="flex gap-2 flex-wrap max-h-[100px] overflow-y-auto p-2 bg-slate-100/50 dark:bg-slate-950/50 rounded-xl border border-slate-200 dark:border-slate-800">
                {availableColors.map(col => (
                  <button
                    key={col}
                    type="button"
                    onClick={() => {
                      if (confirm(isRtl ? `هل أنت متأكد من حذف اللون "${col}"؟` : `Are you sure you want to delete color "${col}"?`)) {
                        setAvailableColors(prev => prev.filter(x => x !== col));
                      }
                    }}
                    className="px-2 py-0.5 rounded text-[10px] font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-red-500 hover:text-red-500 text-slate-700 dark:text-slate-200 transition-all flex items-center gap-1"
                  >
                    <span>{isRtl ? (colorMap[col] || col) : col}</span>
                    <span className="text-red-500 font-normal">×</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t">
              <button
                onClick={() => {
                  setShowManageVariantsModal(false);
                  setNewSizeName('');
                  setNewColorName('');
                }}
                className="px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs font-semibold"
              >
                {t('close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Restaurant Order Modifier Modal ===== */}
      {showModifierModal && pendingModifierProduct && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200/50 dark:border-slate-700/50 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-orange-100 font-semibold">{t('order_modifiers')}</p>
                <h3 className="text-white font-bold text-sm">{isRtl ? pendingModifierProduct.name_ar : pendingModifierProduct.name_en}</h3>
              </div>
              <span className="text-2xl">🍽️</span>
            </div>

            <div className="p-4 space-y-4">
              {/* Modifier Preset Buttons */}
              <div>
                <p className="text-[10px] text-slate-400 font-bold mb-2 tracking-wider uppercase">
                  {t('tap_to_select_modifiers_multi_select')}
                </p>
                <div className="flex flex-wrap gap-2">
                  {modifierPresets.map(m => {
                    const isSelected = selectedModifiers.includes(m.id);
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => toggleModifier(m.id)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border-2 ${
                          isSelected
                            ? 'bg-orange-500 border-orange-500 text-white shadow-md scale-105'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-orange-400 hover:text-orange-500'
                        }`}
                      >
                        {isRtl ? m.ar : m.en}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Selected summary */}
              {selectedModifiers.length > 0 && (
                <div className="p-2.5 rounded-xl bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20">
                  <p className="text-[10px] text-orange-600 dark:text-orange-400 font-bold">
                    ✅ {t('selected')} {selectedModifiers.map(id => {
                      const m = modifierPresets.find(p => p.id === id);
                      return isRtl ? m?.ar : m?.en;
                    }).join(' · ')}
                  </p>
                </div>
              )}

              {/* Custom free-text note */}
              <div>
                <label className="text-[10px] text-slate-400 font-bold block mb-1">
                  {t('custom_note_optional')}
                </label>
                <input
                  type="text"
                  value={customModifierNote}
                  onChange={e => setCustomModifierNote(e.target.value)}
                  placeholder={t('eg_no_hot_sauce_half_portion')}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowModifierModal(false);
                    setPendingModifierProduct(null);
                    setSelectedModifiers([]);
                    setCustomModifierNote('');
                  }}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                >
                  {t('cancel_1')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    // Skip modifiers — add plain
                    if (pendingModifierProduct) addToCart({ ...pendingModifierProduct }, 1);
                    setShowModifierModal(false);
                    setPendingModifierProduct(null);
                    setSelectedModifiers([]);
                    setCustomModifierNote('');
                  }}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                >
                  {t('no_modifiers')}
                </button>
                <button
                  type="button"
                  onClick={confirmModifiers}
                  className="flex-[2] py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold shadow-md transition-all"
                >
                  {t('add_to_order')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
