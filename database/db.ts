import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('kasse.db');

export const seedInitialProducts = () => {
  const count = (db.getAllSync('SELECT id FROM categories') as any[]).length;
  if (count > 0) return; // already seeded

  const cats: { name: string; products: [string, number][] }[] = [
    {
      name: 'Bánh Mì',
      products: [
        ['Bánh mì thập cẩm', 7.90],
        ['Bánh mì gà',        6.90],
        ['Bánh mì thịt nướng',6.90],
        ['Bánh mì cha xíu',   6.90],
        ['Bánh mì chay',      6.90],
        ['Bánh mì trứng',     5.90],
        ['Bánh mì bột lọc',   6.90],
      ],
    },
    {
      name: 'Món Nước',
      products: [
        ['Bò kho',    10.90],
        ['Bánh canh', 10.90],
      ],
    },
    {
      name: 'Bánh & Nem',
      products: [
        ['Nem lụi',              10.90],
        ['Nem rán',               1.00],
        ['Bánh bột lọc trần',     6.90],
        ['Bánh bột lọc rán',      6.90],
        ['Bánh lọc lá',           6.90],
        ['Xôi',                   6.50],
        ['Bánh khúc',             4.00],
      ],
    },
    {
      name: 'Chè & Tráng Miệng',
      products: [
        ['Chè trôi',                     5.00],
        ['Chè thái',                     5.50],
        ['Chè thái sầu',                 6.00],
        ['Bánh flan trân châu cafe sữa', 5.00],
      ],
    },
    {
      name: 'Đồ Uống',
      products: [
        ['Cafe sữa đá việt', 4.50],
        ['Cafe nóng việt',   4.00],
      ],
    },
  ];

  for (const cat of cats) {
    const result = db.runSync('INSERT INTO categories (name) VALUES (?)', [cat.name]);
    const catId = result.lastInsertRowId as number;
    for (const [name, price] of cat.products) {
      db.runSync(
        'INSERT INTO products (name, price, category_id) VALUES (?,?,?)',
        [name, price, catId]
      );
    }
  }
};

export const initDatabase = () => {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      category_id INTEGER,
      FOREIGN KEY (category_id) REFERENCES categories(id)
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      total REAL NOT NULL,
      cash_given REAL NOT NULL,
      change REAL NOT NULL,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER,
      product_name TEXT NOT NULL,
      product_price REAL NOT NULL,
      quantity INTEGER NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id)
    );

    CREATE TABLE IF NOT EXISTS exported_months (
      year_month TEXT PRIMARY KEY
    );
  `);
};

export default db;