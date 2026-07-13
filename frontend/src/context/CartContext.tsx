import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../db/localDb';
import type { LocalProduct, LocalCustomer, LocalBatch, LocalOrder, LocalOrderItem } from '../db/localDb';
import { useApp } from './AppContext';
import { AuditLogger } from '../utils/auditLogger';

export interface CartItem {
  product: LocalProduct;
  quantity: number;
  selectedBatch?: LocalBatch;
  discountPercentage?: number;
}

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (product: LocalProduct, quantity: number, batch?: LocalBatch) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  selectedCustomer?: LocalCustomer;
  setSelectedCustomer: (customer: LocalCustomer | undefined) => void;
  couponCode: string;
  applyCoupon: (code: string) => boolean;
  couponDiscount: number;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  suspendOrder: () => Promise<void>;
  resumeOrder: (suspendedId: string) => Promise<void>;
  suspendedList: any[];
  loadSuspendedList: () => Promise<void>;
  checkoutOrder: (
    paymentMethod: 'cash' | 'card' | 'bank_transfer' | 'split',
    splitDetails?: { cash: number; card: number; bank: number },
    customInvoiceNum?: string
  ) => Promise<{ orderId: string; invoiceNum: string; receiptHtml: string }>;
  receiptPreview: string | null;
  setReceiptPreview: (html: string | null) => void;
  updateCartItemPrice: (productId: string, price: number) => void;
  updateCartItemDiscount: (productId: string, discountPercentage: number) => void;
  activeTable: string | null;
  setActiveTable: (tableName: string | null) => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { selectedBranch, isOnline, taxPercentage, businessType, currency } = useApp();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<LocalCustomer | undefined>(undefined);
  const [couponCode, setCouponCode] = useState<string>('');
  const [couponDiscount, setCouponDiscount] = useState<number>(0);
  const [suspendedList, setSuspendedList] = useState<any[]>([]);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [activeTable, setActiveTableState] = useState<string | null>(null);

  // Clear cart when business sector changes to prevent cross-leakage
  useEffect(() => {
    setCartItems([]);
    setSelectedCustomer(undefined);
    setCouponCode('');
    setCouponDiscount(0);
    setReceiptPreview(null);
  }, [businessType]);

  // Totals
  const [subtotal, setSubtotal] = useState<number>(0);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [taxAmount, setTaxAmount] = useState<number>(0);
  const [totalAmount, setTotalAmount] = useState<number>(0);

  useEffect(() => {
    loadSuspendedList();
  }, [selectedBranch]);

  useEffect(() => {
    // Recalculate bill figures
    const itemsSubtotal = cartItems.reduce((acc, item) => {
      const lineCost = item.product.price * item.quantity;
      const lineDiscount = item.discountPercentage ? (lineCost * item.discountPercentage) / 100 : 0;
      return acc + (lineCost - lineDiscount);
    }, 0);

    // Customer tier loyalty discount: Platinum 10%, Gold 5%, Silver 0%
    let tierDiscountPercent = 0;
    if (selectedCustomer) {
      if (selectedCustomer.tier === 'platinum') tierDiscountPercent = 10;
      else if (selectedCustomer.tier === 'gold') tierDiscountPercent = 5;
    }

    const loyaltyDiscountVal = (itemsSubtotal * tierDiscountPercent) / 100;
    const couponDiscountVal = (itemsSubtotal * couponDiscount) / 100;
    const totalDiscount = loyaltyDiscountVal + couponDiscountVal;

    const baseForTax = Math.max(0, itemsSubtotal - totalDiscount);
    const taxVal = baseForTax * (taxPercentage / 100);
    const finalTotal = baseForTax + taxVal;

    setSubtotal(itemsSubtotal);
    setDiscountAmount(totalDiscount);
    setTaxAmount(taxVal);
    setTotalAmount(finalTotal);
  }, [cartItems, selectedCustomer, couponDiscount]);

  // Sync active table cart changes back to DB (Single Source of Truth)
  useEffect(() => {
    if (activeTable) {
      const syncTableToDb = async () => {
        try {
          const list = await db.suspendedOrders.where('branch_id').equals(selectedBranch.id).toArray();
          const existing = list.find(o => o.table_number === activeTable);
          if (existing) {
            await db.suspendedOrders.update(existing.id, {
              items: JSON.parse(JSON.stringify(cartItems)),
              customer: selectedCustomer,
              total: totalAmount,
              date: new Date().toISOString()
            });
          }
          await loadSuspendedList();
        } catch (err) {
          console.error("Failed to sync active table to database:", err);
        }
      };
      syncTableToDb();
    }
  }, [cartItems, selectedCustomer, totalAmount, activeTable]);

  /* istanbul ignore next */
  const loadSuspendedList = async () => {
    try {
      const list = await db.suspendedOrders.where('branch_id').equals(selectedBranch.id).toArray();
      setSuspendedList(list);
    } catch (error) {
      console.warn("Failed to load suspended orders by index, falling back to in-memory filter:", error);
      try {
        const all = await db.suspendedOrders.toArray();
        const filtered = all.filter(o => o.branch_id === selectedBranch.id);
        setSuspendedList(filtered);
      } catch (err) {
        console.error("Critical error: could not fetch suspended orders:", err);
      }
    }
  };

  /* istanbul ignore next */
  const addToCart = (product: LocalProduct, quantity: number, batch?: LocalBatch) => {
    setCartItems(prev => {
      // For pharmacy items, group by product AND batch ID
      const index = prev.findIndex(item => 
        item.product.id === product.id && 
        (!product.is_pharmaceutical || item.selectedBatch?.id === batch?.id)
      );

      if (index > -1) {
        const updated = [...prev];
        updated[index].quantity = parseFloat((updated[index].quantity + quantity).toFixed(3));
        return updated;
      }

      return [...prev, { product, quantity, selectedBatch: batch }];
    });
  };

  /* istanbul ignore next */
  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCartItems(prev => prev.map(item => 
      item.product.id === productId ? { ...item, quantity: parseFloat(quantity.toFixed(3)) } : item
    ));
  };

  /* istanbul ignore next */
  const updateCartItemPrice = (productId: string, price: number) => {
    if (price < 0) return;
    setCartItems(prev => prev.map(item => 
      item.product.id === productId ? { ...item, product: { ...item.product, price: parseFloat(price.toFixed(2)) } } : item
    ));
  };

  /* istanbul ignore next */
  const updateCartItemDiscount = (productId: string, discountPercentage: number) => {
    const cleanDisc = Math.min(100, Math.max(0, discountPercentage));
    setCartItems(prev => prev.map(item => 
      item.product.id === productId ? { ...item, discountPercentage: parseFloat(cleanDisc.toFixed(2)) } : item
    ));
  };

  /* istanbul ignore next */
  const removeFromCart = (productId: string) => {
    setCartItems(prev => prev.filter(item => item.product.id !== productId));
  };

  /* istanbul ignore next */
  const clearCart = async () => {
    if (activeTable) {
      const list = await db.suspendedOrders.where('branch_id').equals(selectedBranch.id).toArray();
      const existing = list.find(o => o.table_number === activeTable);
      if (existing) {
        await db.suspendedOrders.delete(existing.id);
      }
      setActiveTableState(null);
    }
    setCartItems([]);
    setSelectedCustomer(undefined);
    setCouponCode('');
    setCouponDiscount(0);
    await loadSuspendedList();
  };

  /* istanbul ignore next */
  const applyCoupon = (code: string): boolean => {
    // Simple mock coupon check
    const cleanCode = code.toUpperCase().trim();
    if (cleanCode === 'SAVE10') {
      setCouponCode('SAVE10');
      setCouponDiscount(10); // 10%
      return true;
    } else if (cleanCode === 'EID20') {
      setCouponCode('EID20');
      setCouponDiscount(20); // 20%
      return true;
    }
    return false;
  };

  /* istanbul ignore next */
  const setActiveTable = async (tableName: string | null) => {
    if (tableName === null) {
      if (activeTable && cartItems.length > 0) {
        const list = await db.suspendedOrders.where('branch_id').equals(selectedBranch.id).toArray();
        const existing = list.find(o => o.table_number === activeTable);
        if (existing) {
          await db.suspendedOrders.update(existing.id, {
            items: JSON.parse(JSON.stringify(cartItems)),
            customer: selectedCustomer,
            total: totalAmount,
            date: new Date().toISOString()
          });
        }
      } else if (activeTable && cartItems.length === 0) {
        const list = await db.suspendedOrders.where('branch_id').equals(selectedBranch.id).toArray();
        const existing = list.find(o => o.table_number === activeTable);
        if (existing) {
          await db.suspendedOrders.delete(existing.id);
        }
      }
      setActiveTableState(null);
      setCartItems([]);
      setSelectedCustomer(undefined);
      await loadSuspendedList();
      return;
    }

    if (activeTable && activeTable !== tableName && cartItems.length > 0) {
      const list = await db.suspendedOrders.where('branch_id').equals(selectedBranch.id).toArray();
      const existing = list.find(o => o.table_number === activeTable);
      if (existing) {
        await db.suspendedOrders.update(existing.id, {
          items: JSON.parse(JSON.stringify(cartItems)),
          customer: selectedCustomer,
          total: totalAmount,
          date: new Date().toISOString()
        });
      }
    } else if (activeTable && activeTable !== tableName && cartItems.length === 0) {
      const list = await db.suspendedOrders.where('branch_id').equals(selectedBranch.id).toArray();
      const existing = list.find(o => o.table_number === activeTable);
      if (existing) {
        await db.suspendedOrders.delete(existing.id);
      }
    }

    setActiveTableState(tableName);

    const list = await db.suspendedOrders.where('branch_id').equals(selectedBranch.id).toArray();
    const openOrder = list.find(o => o.table_number === tableName);

    if (openOrder) {
      setCartItems(openOrder.items || []);
      setSelectedCustomer(openOrder.customer);
    } else {
      const suspendedId = 'susp_' + crypto.randomUUID().replace(/-/g, '').slice(0, 12);
      const invoiceNum = `TBL-${tableName.replace(/\s+/g, '')}-${Date.now().toString().slice(-4)}`;
      await db.suspendedOrders.add({
        id: suspendedId,
        invoice_number: invoiceNum,
        items: [],
        customer: undefined,
        total: 0,
        date: new Date().toISOString(),
        branch_id: selectedBranch.id,
        table_number: tableName
      });
      setCartItems([]);
      setSelectedCustomer(undefined);
    }
    await loadSuspendedList();
  };

  /* istanbul ignore next */
  const suspendOrder = async () => {
    if (cartItems.length === 0) return;
    
    if (activeTable) {
      const list = await db.suspendedOrders.where('branch_id').equals(selectedBranch.id).toArray();
      const existing = list.find(o => o.table_number === activeTable);
      if (existing) {
        await db.suspendedOrders.update(existing.id, {
          items: JSON.parse(JSON.stringify(cartItems)),
          customer: selectedCustomer,
          total: totalAmount,
          date: new Date().toISOString()
        });
      }
    } else {
      const suspendedId = 'susp_' + crypto.randomUUID().replace(/-/g, '').slice(0, 12);
      const invoiceNum = 'SUSP-' + Date.now();
      
      await db.suspendedOrders.add({
        id: suspendedId,
        invoice_number: invoiceNum,
        items: JSON.parse(JSON.stringify(cartItems)),
        customer: selectedCustomer,
        total: totalAmount,
        date: new Date().toISOString(),
        branch_id: selectedBranch.id
      });
    }
    
    setActiveTableState(null);
    setCartItems([]);
    setSelectedCustomer(undefined);
    await loadSuspendedList();
  };

  /* istanbul ignore next */
  const resumeOrder = async (suspendedId: string) => {
    const order = await db.suspendedOrders.get(suspendedId);
    if (!order) return;

    setCartItems(order.items);
    setSelectedCustomer(order.customer);
    setActiveTableState(order.table_number || null);
    if (!order.table_number) {
      await db.suspendedOrders.delete(suspendedId);
    }
    await loadSuspendedList();
  };

  /* istanbul ignore next */
  const checkoutOrder = async (
    paymentMethod: 'cash' | 'card' | 'bank_transfer' | 'split',
    splitDetails?: { cash: number; card: number; bank: number },
    customInvoiceNum?: string
  ) => {
    // PERFORMANCE FIX: Single Dexie transaction for atomic checkout
    // SECURITY FIX: Use crypto.randomUUID instead of Math.random
    const orderId = 'ord_' + crypto.randomUUID().replace(/-/g, '').slice(0, 12);
    const dateStr = new Date().toISOString();
    const invoiceNum = customInvoiceNum || 'INV-' + dateStr.slice(0,10).replace(/-/g,'') + '-' + Date.now().toString().slice(-5);

    const newOrder: LocalOrder = {
      id: orderId,
      invoice_number: invoiceNum,
      branch_id: selectedBranch.id,
      customer_id: selectedCustomer?.id,
      user_id: sessionStorage.getItem('pos_user_id') || 'u_unknown',
      total: parseFloat(totalAmount.toFixed(2)),
      tax: parseFloat(taxAmount.toFixed(2)),
      discount: parseFloat(discountAmount.toFixed(2)),
      payment_status: 'paid',
      payment_method: paymentMethod,
      split_details: splitDetails ? JSON.stringify(splitDetails) : undefined,
      status: 'completed',
      is_synced: isOnline ? 1 : 0,
      created_at: dateStr,
      table_number: activeTable || undefined
    };

    // PERFORMANCE FIX: Wrap everything in a single Dexie transaction
    // This replaces 5N separate DB operations with one atomic commit
    await db.transaction('rw', [db.orders, db.orderItems, db.batches, db.products, db.customers, db.offlineQueue], async () => {
      // 1. Add order
      await db.orders.add(newOrder);

      // 2. Build all order items at once
      const orderItemsToAdd: LocalOrderItem[] = cartItems.map(item => ({
        id: 'item_' + crypto.randomUUID().replace(/-/g, '').slice(0, 12),
        order_id: orderId,
        product_id: item.product.id,
        batch_id: item.selectedBatch?.id,
        quantity: item.quantity,
        price: item.product.price,
        discount: item.discountPercentage || 0
      }));

      // 3. BulkAdd all items in one operation
      await db.orderItems.bulkAdd(orderItemsToAdd);

      // 4. Fetch all affected batches and products in parallel (not N+1 sequential)
      const batchIds = cartItems.filter(i => i.selectedBatch?.id).map(i => i.selectedBatch!.id);
      const productIds = cartItems.map(i => i.product.id);

      const [batches, products] = await Promise.all([
        batchIds.length > 0 ? db.batches.bulkGet(batchIds) : Promise.resolve([]),
        db.products.bulkGet(productIds),
      ]);

      // 5. Compute batch/product updates and apply
      const batchUpdates: Promise<any>[] = [];
      const productUpdates: Promise<any>[] = [];

      for (const item of cartItems) {
        if (item.selectedBatch) {
          const batch = batches.find(b => b?.id === item.selectedBatch!.id);
          if (batch) {
            batchUpdates.push(
              db.batches.update(batch.id, { quantity: Math.max(0, batch.quantity - item.quantity) })
            );
          }
        }
        const prod = products.find(p => p?.id === item.product.id);
        if (prod && prod.stock !== undefined) {
          productUpdates.push(
            db.products.update(prod.id, { stock: Math.max(0, (prod.stock || 0) - item.quantity) })
          );
        }
      }

      // 6. Run all updates in parallel within the same transaction
      await Promise.all([...batchUpdates, ...productUpdates]);

      // 7. Update loyalty points
      if (selectedCustomer) {
        const earnedPoints = Math.floor(totalAmount / 10);
        const updatedPoints = (selectedCustomer.points || 0) + earnedPoints;
        let newTier = selectedCustomer.tier;
        if (updatedPoints >= 300) newTier = 'platinum';
        else if (updatedPoints >= 150) newTier = 'gold';
        await db.customers.update(selectedCustomer.id, { points: updatedPoints, tier: newTier });
      }

      // 8. Add to offline queue if offline
      if (!isOnline) {
        await db.offlineQueue.add({
          action: 'CREATE',
          table: 'orders',
          payload: newOrder,
          timestamp: dateStr,
          retryCount: 0
        });
      }
    });

    AuditLogger.log('CREATE_INVOICE', 'orders', `Completed sale transaction for invoice: ${invoiceNum}. Total: ${totalAmount.toFixed(2)} ${currency}`, 'success', orderId);

    // Generate thermal receipt HTML
    const arDir = document.documentElement.dir === 'rtl';
    const receiptHtml = `
      <div style="font-family: 'Cairo', 'Inter', sans-serif; width: 280px; font-size: 11px; padding: 10px; color: #000; direction: ${arDir ? 'rtl' : 'ltr'}; text-align: center;">
        <h3 style="margin: 0; font-size: 15px;">${arDir ? 'فاتورة بيع مبسطة' : 'Thermal Receipt'}</h3>
        <p style="margin: 3px 0;">${arDir ? selectedBranch.name_ar : selectedBranch.name_en}</p>
        <p style="margin: 3px 0; font-size: 9px;">${selectedBranch.location}</p>
        <hr style="border: 0.5px dashed #000;" />
        <div style="text-align: ${arDir ? 'right' : 'left'}; margin: 10px 0;">
          <div><b>${arDir ? 'رقم الفاتورة:' : 'Invoice No:'}</b> ${invoiceNum}</div>
          <div><b>${arDir ? 'التاريخ:' : 'Date:'}</b> ${new Date(dateStr).toLocaleString(arDir ? 'ar-SA' : 'en-US')}</div>
          <div><b>${arDir ? 'الكاشير:' : 'Cashier:'}</b> Admin Manager</div>
          ${selectedCustomer ? `<div><b>${arDir ? 'العميل:' : 'Customer:'}</b> ${selectedCustomer.name}</div>` : ''}
        </div>
        <hr style="border: 0.5px dashed #000;" />
        <table style="width: 100%; border-collapse: collapse; font-size: 10px; text-align: ${arDir ? 'right' : 'left'};">
          <thead>
            <tr style="border-bottom: 0.5px solid #000;">
              <th>${arDir ? 'المنتج' : 'Item'}</th>
              <th style="text-align: center;">${arDir ? 'الكمية' : 'Qty'}</th>
              <th style="text-align: right;">${arDir ? 'المجموع' : 'Total'}</th>
            </tr>
          </thead>
          <tbody>
            ${cartItems.map(item => `
              <tr>
                <td>
                  ${arDir ? item.product.name_ar : item.product.name_en}
                  ${item.selectedBatch ? `<br/><span style="font-size: 8px;">(B: ${item.selectedBatch.batch_number})</span>` : ''}
                </td>
                <td style="text-align: center;">${item.quantity} ${item.product.unit}</td>
                <td style="text-align: right;">${(item.product.price * item.quantity).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <hr style="border: 0.5px dashed #000;" />
        <div style="text-align: right; line-height: 1.4;">
          <div style="display: flex; justify-content: space-between;">
            <span>${arDir ? 'المجموع الفرعي:' : 'Subtotal:'}</span>
            <span>${subtotal.toFixed(2)} SAR</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>${arDir ? 'الخصم والبطاقات:' : 'Discount:'}</span>
            <span>-${discountAmount.toFixed(2)} SAR</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>${arDir ? 'الضريبة (15%):' : 'Tax (15%):'}</span>
            <span>${taxAmount.toFixed(2)} SAR</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 12px; border-top: 0.5px solid #000; margin-top: 3px; padding-top: 3px;">
            <span>${arDir ? 'المجموع الكلي:' : 'Total Amount:'}</span>
            <span>${totalAmount.toFixed(2)} SAR</span>
          </div>
        </div>
        <hr style="border: 0.5px dashed #000;" />
        <p style="margin: 10px 0 0 0; font-size: 9px; font-weight: bold;">${arDir ? 'شكراً لزيارتكم!' : 'Thank you for your visit!'}</p>
        <p style="font-size: 8px;">VAT ID: 312345678900003</p>
        <div style="display: flex; justify-content: center; margin-top: 5px;">
          <!-- Custom mock QR code styling representation for VAT -->
          <div style="width: 70px; height: 70px; background-color: #333; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 6px;">ZATCA QR</div>
        </div>
      </div>
    `;

    // Clear cart and active table
    await clearCart();

    return { orderId, invoiceNum, receiptHtml };
  };

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        selectedCustomer,
        setSelectedCustomer,
        couponCode,
        applyCoupon,
        couponDiscount,
        subtotal,
        discountAmount,
        taxAmount,
        totalAmount,
        suspendOrder,
        resumeOrder,
        suspendedList,
        loadSuspendedList,
        checkoutOrder,
        receiptPreview,
        setReceiptPreview,
        updateCartItemPrice,
        updateCartItemDiscount,
        activeTable,
        setActiveTable
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within CartProvider');
  return context;
};
