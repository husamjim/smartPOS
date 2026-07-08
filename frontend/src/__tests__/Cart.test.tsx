import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { CartProvider, useCart } from '../context/CartContext';

// Pre-defined static mock references to prevent infinite rendering loops in React context tests
const mockBranch = { id: 'br_test', name_en: 'Test Branch', name_ar: 'الفرع التجريبي', location: 'Riyadh' };
const mockUser = { id: 'u_test', username: 'test_user', displayName: 'Tester', role: 'cashier', active: true };

// ── Mock AppContext ──────────────────────────────────────────────────────────
vi.mock('../context/AppContext', () => {
  return {
    useApp: () => ({
      selectedBranch: mockBranch,
      isOnline: true,
      taxPercentage: 15,
      businessType: 'retail',
      currentUser: mockUser
    }),
    seedLocalDbIfEmpty: vi.fn(),
    db: {
      suspendedOrders: {
        where: () => ({
          equals: () => ({
            toArray: () => Promise.resolve([])
          })
        }),
        toArray: () => Promise.resolve([])
      }
    }
  };
});

// Mock Dexie DB completely
vi.mock('../db/localDb', () => {
  return {
    db: {
      orders: { add: vi.fn() },
      orderItems: { bulkAdd: vi.fn() },
      batches: { bulkGet: vi.fn(), update: vi.fn() },
      products: { bulkGet: vi.fn(), update: vi.fn() },
      customers: { update: vi.fn() },
      offlineQueue: { add: vi.fn() },
      suspendedOrders: {
        add: vi.fn(),
        delete: vi.fn(),
        toArray: () => Promise.resolve([]),
        where: () => ({
          equals: () => ({
            toArray: () => Promise.resolve([])
          })
        })
      }
    }
  };
});

// A dummy component to test useCart hooks
const CartConsumer: React.FC = () => {
  const { 
    cartItems, 
    addToCart, 
    updateQuantity, 
    removeFromCart, 
    clearCart, 
    applyCoupon, 
    subtotal, 
    taxAmount, 
    totalAmount, 
    couponDiscount 
  } = useCart();

  const handleAdd = () => {
    addToCart({
      id: 'p_test_1',
      name_en: 'Test Product',
      name_ar: 'منتج تجريبي',
      sku: 'SKU-001',
      barcode: '11111111',
      price: 10.00,
      cost: 5.00,
      unit: 'piece',
      type: 'piece',
      category: 'General',
      min_stock: 5,
      is_pharmaceutical: 0
    }, 2);
  };

  const handleUpdate = () => {
    updateQuantity('p_test_1', 5);
  };

  const handleRemove = () => {
    removeFromCart('p_test_1');
  };

  const handleClear = () => {
    clearCart();
  };

  const handleApplyCoupon = () => {
    applyCoupon('SAVE10');
  };

  return (
    <div>
      <span data-testid="cart-count">{cartItems.length}</span>
      <span data-testid="subtotal">{subtotal}</span>
      <span data-testid="tax">{taxAmount}</span>
      <span data-testid="total">{totalAmount}</span>
      <span data-testid="coupon-discount">{couponDiscount}</span>
      <button data-testid="add-btn" onClick={handleAdd}>Add Item</button>
      <button data-testid="update-btn" onClick={handleUpdate}>Update Qty</button>
      <button data-testid="remove-btn" onClick={handleRemove}>Remove Item</button>
      <button data-testid="clear-btn" onClick={handleClear}>Clear Cart</button>
      <button data-testid="coupon-btn" onClick={handleApplyCoupon}>Apply Coupon</button>
    </div>
  );
};

describe('Frontend Cart Context Integration Tests', () => {
  it('should start with an empty cart', () => {
    render(
      <CartProvider>
        <CartConsumer />
      </CartProvider>
    );

    expect(screen.getByTestId('cart-count').textContent).toBe('0');
    expect(screen.getByTestId('subtotal').textContent).toBe('0');
    expect(screen.getByTestId('total').textContent).toBe('0');
  });

  it('should successfully add an item to the cart and calculate totals', async () => {
    render(
      <CartProvider>
        <CartConsumer />
      </CartProvider>
    );

    const addBtn = screen.getByTestId('add-btn');
    const updateBtn = screen.getByTestId('update-btn');
    const couponBtn = screen.getByTestId('coupon-btn');
    const clearBtn = screen.getByTestId('clear-btn');

    // 1. Add item
    await act(async () => {
      addBtn.click();
    });

    expect(screen.getByTestId('cart-count').textContent).toBe('1');
    expect(screen.getByTestId('subtotal').textContent).toBe('20'); // 10.00 * 2 = 20
    expect(screen.getByTestId('tax').textContent).toBe('3');       // 20 * 15% = 3
    expect(screen.getByTestId('total').textContent).toBe('23');     // 20 + 3 = 23

    // 2. Apply coupon
    await act(async () => {
      couponBtn.click();
    });
    expect(screen.getByTestId('coupon-discount').textContent).toBe('10'); // 10% discount
    expect(screen.getByTestId('total').textContent).toBe('20.7'); // subtotal 20, disc 2, tax (18 * 15%) = 2.7 => total 20.7

    // 3. Update quantity
    await act(async () => {
      updateBtn.click();
    });
    expect(screen.getByTestId('subtotal').textContent).toBe('50'); // 10.00 * 5 = 50

    // 4. Clear cart
    await act(async () => {
      clearBtn.click();
    });
    expect(screen.getByTestId('cart-count').textContent).toBe('0');
    expect(screen.getByTestId('subtotal').textContent).toBe('0');
  });
});
