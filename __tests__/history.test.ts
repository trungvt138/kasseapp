import { calculateRevenue, buildDateFilter, Order } from '../utils/logic';

const makeOrder = (id: number, total: number, created_at = '2026-03-01 10:00:00'): Order => ({
  id,
  total,
  cash_given: total + 5,
  change: 5,
  created_at,
});

describe('calculateRevenue', () => {
  it('returns 0 for an empty list', () => {
    expect(calculateRevenue([])).toBe(0);
  });

  it('sums a single order', () => {
    expect(calculateRevenue([makeOrder(1, 25.0)])).toBeCloseTo(25.0);
  });

  it('sums multiple orders', () => {
    const orders = [makeOrder(1, 10.0), makeOrder(2, 20.5), makeOrder(3, 5.75)];
    expect(calculateRevenue(orders)).toBeCloseTo(36.25);
  });

  it('handles floating point totals without precision errors', () => {
    const orders = Array.from({ length: 10 }, (_, i) => makeOrder(i, 0.1));
    expect(calculateRevenue(orders)).toBeCloseTo(1.0, 5);
  });

  // Stress: 10,000 orders
  it('handles 10,000 orders', () => {
    const orders = Array.from({ length: 10000 }, (_, i) => makeOrder(i, 5.0));
    expect(calculateRevenue(orders)).toBeCloseTo(50000.0);
  });

  // Stress: large individual totals
  it('handles very large order totals (catering)', () => {
    const orders = [makeOrder(1, 9999.99), makeOrder(2, 8888.88)];
    expect(calculateRevenue(orders)).toBeCloseTo(18888.87);
  });
});

describe('buildDateFilter', () => {
  it('returns daily filter', () => {
    const filter = buildDateFilter('daily');
    expect(filter).toContain("date(created_at) = date('now')");
    expect(filter.startsWith('WHERE')).toBe(true);
  });

  it('returns monthly filter', () => {
    const filter = buildDateFilter('monthly');
    expect(filter).toContain("strftime('%Y-%m'");
    expect(filter).toContain("'now'");
  });

  it('returns yearly filter', () => {
    const filter = buildDateFilter('yearly');
    expect(filter).toContain("strftime('%Y'");
  });

  it('each period produces a different filter', () => {
    const daily = buildDateFilter('daily');
    const monthly = buildDateFilter('monthly');
    const yearly = buildDateFilter('yearly');
    expect(daily).not.toBe(monthly);
    expect(monthly).not.toBe(yearly);
    expect(daily).not.toBe(yearly);
  });
});
