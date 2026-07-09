export const csvTemplates: Record<string, { headers: string[]; rows: string[][] }> = {
  products: {
    headers: ['id', 'name_ar', 'name_en', 'sku', 'barcode', 'price', 'cost', 'unit', 'type', 'category', 'min_stock', 'is_pharmaceutical'],
    rows: [
      ['p_test_1', 'تفاح أحمر 1 كجم', 'Red Apples 1kg', 'FRUIT-01', '6281100100', '12.50', '8.00', 'kg', 'weight', 'Fruits', '15', '0'],
      ['p_test_2', 'شاحن هاتف سريع', 'Fast Charger 20W', 'ELEC-SH-02', '6281100101', '49.00', '25.00', 'piece', 'piece', 'Electronics', '5', '0']
    ]
  },
  customers: {
    headers: ['id', 'name', 'phone', 'email', 'points', 'tier', 'notes'],
    rows: [
      ['c_test_1', 'خالد الحربي', '0509998887', 'khaled@email.com', '100', 'gold', 'عميل دائم للفواكه'],
      ['c_test_2', 'فاطمة العتيبي', '0557776665', 'fatima@email.com', '50', 'silver', 'تفضل الدفع بالشبكة']
    ]
  },
  suppliers: {
    headers: ['id', 'name', 'contact_name', 'phone', 'email', 'balance'],
    rows: [
      ['s_test_1', 'شركة نادك المحدودة', 'أبو خالد', '0112223333', 'nadec@supplier.com', '-2500.00'],
      ['s_test_2', 'مورد الخضار المركزي', 'سليمان الطيب', '0501112223', 'veg_central@supplier.com', '0.00']
    ]
  },
  employees: {
    headers: ['id', 'username', 'displayName', 'role', 'active'],
    rows: [
      ['e_test_1', 'salim', 'سالم المرواني', 'manager', 'true'],
      ['e_test_2', 'muna', 'منى اليوسف', 'cashier', 'true']
    ]
  },
  accounts: {
    headers: ['id', 'code', 'name_ar', 'name_en', 'type', 'parent'],
    rows: [
      ['acc_test_1', '1001', 'نقدية بالصندوق', 'Cash in Hand', 'asset', '1000'],
      ['acc_test_2', '1002', 'حساب البنك الراجحي', 'Al Rajhi Bank Account', 'asset', '1000']
    ]
  },
  inventory: {
    headers: ['product_id', 'warehouse_id', 'batch_number', 'expiry_date', 'quantity'],
    rows: [
      ['p_test_1', 'wh_riyadh_1', 'BATCH-FR-01', '2026-10-01', '120'],
      ['p_test_2', 'wh_riyadh_2', 'BATCH-EL-09', '', '45']
    ]
  },
  branches: {
    headers: ['id', 'name_ar', 'name_en', 'location'],
    rows: [
      ['br_test_1', 'فرع الدمام', 'Dammam Branch', 'شارع الخليج، الدمام'],
      ['br_test_2', 'فرع مكة المكرمة', 'Makkah Branch', 'حي العزيزية، مكة']
    ]
  }
};

export function downloadCSVTemplate(type: string) {
  const template = csvTemplates[type];
  if (!template) return;

  const csvContent = [
    template.headers.join(','),
    ...template.rows.map(row => row.map(val => `"${val.replace(/"/g, '""')}"`).join(','))
  ].join('\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${type}_template.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
