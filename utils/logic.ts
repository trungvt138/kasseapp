// Pure business logic functions — no React, no DB, fully testable.

// ─── Types ────────────────────────────────────────────────────────────────────

export type Product = { id: number; name: string; price: number; category_id: number };
export type CartItem = { product: Product; quantity: number };
export type Order = { id: number; total: number; cash_given: number; change: number; created_at: string };
export type OrderItem = { product_name: string; product_price: number; quantity: number };
export type MonthRow = { month: string; exported: boolean };
export type Period = 'daily' | 'monthly' | 'yearly';

// ─── Cart ─────────────────────────────────────────────────────────────────────

export function cartAdd(cart: CartItem[], product: Product): CartItem[] {
  const existing = cart.find(i => i.product.id === product.id);
  if (existing) {
    return cart.map(i =>
      i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
    );
  }
  return [...cart, { product, quantity: 1 }];
}

export function cartRemove(cart: CartItem[], productId: number): CartItem[] {
  const existing = cart.find(i => i.product.id === productId);
  if (!existing) return cart;
  if (existing.quantity > 1) {
    return cart.map(i =>
      i.product.id === productId ? { ...i, quantity: i.quantity - 1 } : i
    );
  }
  return cart.filter(i => i.product.id !== productId);
}

export function cartTotal(cart: CartItem[]): number {
  return cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
}

// ─── Checkout ─────────────────────────────────────────────────────────────────

export function calculateChange(cash: number, total: number): number {
  return cash - total;
}

export function generateQuickCash(total: number): number[] {
  const candidates = [
    Math.ceil(total),
    Math.ceil(total / 5) * 5,
    Math.ceil(total / 10) * 10,
    Math.ceil(total / 20) * 20,
    Math.ceil(total / 50) * 50,
  ];
  return candidates
    .filter((v, i, a) => a.indexOf(v) === i && v >= total)
    .slice(0, 4);
}

// ─── History ──────────────────────────────────────────────────────────────────

export function calculateRevenue(orders: Pick<Order, 'total'>[]): number {
  return orders.reduce((sum, o) => sum + o.total, 0);
}

export function buildDateFilter(period: Period): string {
  if (period === 'daily') return "WHERE date(created_at) = date('now')";
  if (period === 'monthly') return "WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')";
  if (period === 'yearly') return "WHERE strftime('%Y', created_at) = strftime('%Y', 'now')";
  return '';
}

// ─── Export ───────────────────────────────────────────────────────────────────

export function buildCSV(
  orders: Order[],
  getItems: (orderId: number) => OrderItem[]
): string {
  const rows: string[] = ['Order ID,Date,Product,Quantity,Price,Total'];
  orders.forEach(order => {
    getItems(order.id).forEach(item => {
      rows.push(
        `${order.id},${order.created_at},"${item.product_name}",${item.quantity},${item.product_price.toFixed(2)},${(item.product_price * item.quantity).toFixed(2)}`
      );
    });
  });
  return rows.join('\n') + '\n';
}

export function getUnexportedPastMonths(months: MonthRow[], currentMonth: string): MonthRow[] {
  return months.filter(m => m.month < currentMonth && !m.exported);
}

export function getDeletableMonths(months: MonthRow[], currentMonth: string): MonthRow[] {
  return months.filter(m => m.month < currentMonth);
}
