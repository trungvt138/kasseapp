/**
 * Test data seeder — inserts bulk data to stress-test SQLite queries,
 * FlatList rendering, and export generation.
 *
 * Inserts:
 *   - 15 categories
 *   - 150 products  (10 per category)
 *   - 5 000 orders  spread across the last 13 months
 *   - ~20 000 order_items (avg 4 items per order)
 */

import db from '../database/db';

const CATEGORIES = [
  'Kaffee', 'Tee', 'Kaltgetränke', 'Bier', 'Wein',
  'Cocktails', 'Snacks', 'Frühstück', 'Mittagessen', 'Abendessen',
  'Desserts', 'Vegetarisch', 'Pizza', 'Burger', 'Pasta',
];

const PRODUCT_TEMPLATES = [
  ['Americano', 2.80], ['Latte Macchiato', 3.90], ['Espresso', 2.20],
  ['Cappuccino', 3.50], ['Flat White', 3.70], ['Mocha', 4.20],
  ['Chai Latte', 3.80], ['Matcha Latte', 4.50], ['Heiße Schokolade', 3.60],
  ['Filterkaffee', 2.50],
] as [string, number][];

export type SeedResult = {
  categories: number;
  products: number;
  orders: number;
  orderItems: number;
  durationMs: number;
};

/** Inserts all seed data inside a single transaction for speed. */
export const seedTestData = (): SeedResult => {
  const t0 = Date.now();

  // ── 1. Categories ──────────────────────────────────────────────────────────
  const categoryIds: number[] = [];
  for (const name of CATEGORIES) {
    const r = db.runSync('INSERT INTO categories (name) VALUES (?)', [name]);
    categoryIds.push(r.lastInsertRowId as number);
  }

  // ── 2. Products (10 per category, price varies by category index) ──────────
  let productCount = 0;
  const allProductIds: number[] = [];
  for (let ci = 0; ci < categoryIds.length; ci++) {
    for (let pi = 0; pi < PRODUCT_TEMPLATES.length; pi++) {
      const [baseName, basePrice] = PRODUCT_TEMPLATES[pi];
      const price = +(basePrice + ci * 0.1).toFixed(2);
      const name = `${baseName} (${CATEGORIES[ci]})`;
      const r = db.runSync(
        'INSERT INTO products (name, price, category_id) VALUES (?,?,?)',
        [name, price, categoryIds[ci]]
      );
      allProductIds.push(r.lastInsertRowId as number);
      productCount++;
    }
  }

  // ── 3. Orders + items spread over last 13 months ───────────────────────────
  const ORDER_COUNT = 5000;
  const MAX_ITEMS_PER_ORDER = 8;
  let orderCount = 0;
  let itemCount = 0;

  // Pre-load product name/price for item insertion
  type ProductRow = { id: number; name: string; price: number };
  const products = db.getAllSync('SELECT id, name, price FROM products') as ProductRow[];

  // Build dates: spread uniformly across 13 months back to now
  const now = new Date();

  db.execSync('BEGIN TRANSACTION');
  try {
    for (let i = 0; i < ORDER_COUNT; i++) {
      // Random datetime within last 13 months
      const monthsBack = Math.floor(Math.random() * 13);
      const d = new Date(now);
      d.setMonth(d.getMonth() - monthsBack);
      d.setDate(1 + Math.floor(Math.random() * 28));
      d.setHours(Math.floor(Math.random() * 14) + 7); // 07:00–20:59
      d.setMinutes(Math.floor(Math.random() * 60));
      const createdAt = d.toISOString().replace('T', ' ').slice(0, 19);

      // Pick 1–MAX_ITEMS items for this order
      const itemCount_ = 1 + Math.floor(Math.random() * MAX_ITEMS_PER_ORDER);
      const chosenProducts = pickRandom(products, itemCount_);

      let total = 0;
      const orderLines: { product: ProductRow; qty: number }[] = [];
      for (const p of chosenProducts) {
        const qty = 1 + Math.floor(Math.random() * 4);
        total += p.price * qty;
        orderLines.push({ product: p, qty });
      }
      total = +total.toFixed(2);
      const cashGiven = roundUpCash(total);
      const change = +(cashGiven - total).toFixed(2);

      const orderResult = db.runSync(
        'INSERT INTO orders (total, cash_given, change, created_at) VALUES (?,?,?,?)',
        [total, cashGiven, change, createdAt]
      );
      const orderId = orderResult.lastInsertRowId as number;
      orderCount++;

      for (const line of orderLines) {
        db.runSync(
          'INSERT INTO order_items (order_id, product_name, product_price, quantity) VALUES (?,?,?,?)',
          [orderId, line.product.name, line.product.price, line.qty]
        );
        itemCount++;
      }
    }
    db.execSync('COMMIT');
  } catch (e) {
    db.execSync('ROLLBACK');
    throw e;
  }

  return {
    categories: categoryIds.length,
    products: productCount,
    orders: orderCount,
    orderItems: itemCount,
    durationMs: Date.now() - t0,
  };
};

/** Removes ONLY the seeded data (all orders, items, products, categories). */
export const clearAllData = (): void => {
  db.execSync(`
    DELETE FROM order_items;
    DELETE FROM orders;
    DELETE FROM products;
    DELETE FROM categories;
    DELETE FROM exported_months;
  `);
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pickRandom<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  const result: T[] = [];
  for (let i = 0; i < Math.min(n, copy.length); i++) {
    const idx = Math.floor(Math.random() * (copy.length - i));
    result.push(copy[idx]);
    copy[idx] = copy[copy.length - 1 - i];
  }
  return result;
}

function roundUpCash(total: number): number {
  const candidates = [
    Math.ceil(total),
    Math.ceil(total / 5) * 5,
    Math.ceil(total / 10) * 10,
    Math.ceil(total / 20) * 20,
    Math.ceil(total / 50) * 50,
  ].filter(v => v >= total);
  return candidates[Math.floor(Math.random() * Math.min(candidates.length, 3))];
}
