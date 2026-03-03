import { buildCSV, getUnexportedPastMonths, getDeletableMonths, MonthRow, Order, OrderItem } from '../utils/logic';

const makeOrder = (id: number, total: number, created_at = '2026-03-01 10:00:00'): Order => ({
  id, total, cash_given: total + 5, change: 5, created_at,
});

const makeItem = (name: string, price: number, qty: number): OrderItem => ({
  product_name: name, product_price: price, quantity: qty,
});

describe('buildCSV', () => {
  it('always starts with a header row', () => {
    const csv = buildCSV([], () => []);
    expect(csv.startsWith('Order ID,Date,Product,Quantity,Price,Total')).toBe(true);
  });

  it('produces one data row per item', () => {
    const orders = [makeOrder(1, 10.0, '2026-03-01 09:00:00')];
    const items = [makeItem('Coffee', 2.5, 2), makeItem('Muffin', 5.0, 1)];
    const csv = buildCSV(orders, () => items);
    const rows = csv.trim().split('\n');
    // header + 2 data rows
    expect(rows).toHaveLength(3);
  });

  it('formats price columns with 2 decimal places', () => {
    const orders = [makeOrder(1, 3.5, '2026-03-01 09:00:00')];
    const csv = buildCSV(orders, () => [makeItem('Tea', 3.5, 1)]);
    expect(csv).toContain('3.50');
    expect(csv).toContain('3.50'); // subtotal same
  });

  it('quotes product names that could contain commas', () => {
    const orders = [makeOrder(1, 5.0, '2026-03-01 09:00:00')];
    const csv = buildCSV(orders, () => [makeItem('Cake, slice', 5.0, 1)]);
    expect(csv).toContain('"Cake, slice"');
  });

  it('produces correct subtotal (price * quantity)', () => {
    const orders = [makeOrder(1, 15.0, '2026-03-01 09:00:00')];
    const csv = buildCSV(orders, () => [makeItem('Beer', 3.0, 5)]);
    // price = 3.00, quantity = 5, subtotal = 15.00
    expect(csv).toContain('3.00,15.00');
  });

  it('returns only header when orders list is empty', () => {
    const csv = buildCSV([], () => []);
    const rows = csv.trim().split('\n');
    expect(rows).toHaveLength(1);
  });

  // Stress: large export with 500 orders × 5 items = 2500 data rows
  it('handles 500 orders with 5 items each', () => {
    const orders = Array.from({ length: 500 }, (_, i) => makeOrder(i + 1, 25.0));
    const items = Array.from({ length: 5 }, (_, i) => makeItem(`Item ${i}`, 5.0, 1));
    const csv = buildCSV(orders, () => items);
    const rows = csv.trim().split('\n');
    expect(rows).toHaveLength(1 + 500 * 5); // header + 2500 data rows
  });
});

describe('getUnexportedPastMonths', () => {
  const months: MonthRow[] = [
    { month: '2026-03', exported: false }, // current
    { month: '2026-02', exported: true },
    { month: '2026-01', exported: false },
    { month: '2025-12', exported: false },
  ];

  it('excludes the current month', () => {
    const result = getUnexportedPastMonths(months, '2026-03');
    expect(result.find(m => m.month === '2026-03')).toBeUndefined();
  });

  it('excludes already-exported months', () => {
    const result = getUnexportedPastMonths(months, '2026-03');
    expect(result.find(m => m.month === '2026-02')).toBeUndefined();
  });

  it('returns past months that are not yet exported', () => {
    const result = getUnexportedPastMonths(months, '2026-03');
    expect(result.map(m => m.month)).toEqual(['2026-01', '2025-12']);
  });

  it('returns empty array when all past months are exported', () => {
    const allExported: MonthRow[] = [
      { month: '2026-02', exported: true },
      { month: '2026-01', exported: true },
    ];
    expect(getUnexportedPastMonths(allExported, '2026-03')).toHaveLength(0);
  });

  it('returns empty array when there are no past months at all', () => {
    const onlyCurrent: MonthRow[] = [{ month: '2026-03', exported: false }];
    expect(getUnexportedPastMonths(onlyCurrent, '2026-03')).toHaveLength(0);
  });
});

describe('getDeletableMonths', () => {
  it('excludes the current month from deletable list', () => {
    const months: MonthRow[] = [
      { month: '2026-03', exported: false },
      { month: '2026-02', exported: true },
    ];
    const deletable = getDeletableMonths(months, '2026-03');
    expect(deletable.find(m => m.month === '2026-03')).toBeUndefined();
    expect(deletable.map(m => m.month)).toContain('2026-02');
  });

  it('includes both exported and unexported past months', () => {
    const months: MonthRow[] = [
      { month: '2026-02', exported: true },
      { month: '2026-01', exported: false },
    ];
    const deletable = getDeletableMonths(months, '2026-03');
    expect(deletable).toHaveLength(2);
  });
});
