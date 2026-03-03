import { cartAdd, cartRemove, cartTotal, CartItem, Product } from '../utils/logic';

const makeProduct = (id: number, price: number): Product => ({
  id,
  name: `Product ${id}`,
  price,
  category_id: 1,
});

describe('cartAdd', () => {
  it('adds a new product with quantity 1', () => {
    const cart = cartAdd([], makeProduct(1, 5.0));
    expect(cart).toHaveLength(1);
    expect(cart[0].quantity).toBe(1);
    expect(cart[0].product.id).toBe(1);
  });

  it('increments quantity when the product already exists', () => {
    let cart = cartAdd([], makeProduct(1, 5.0));
    cart = cartAdd(cart, makeProduct(1, 5.0));
    expect(cart).toHaveLength(1);
    expect(cart[0].quantity).toBe(2);
  });

  it('keeps other items intact when adding a new product', () => {
    let cart = cartAdd([], makeProduct(1, 5.0));
    cart = cartAdd(cart, makeProduct(2, 3.0));
    expect(cart).toHaveLength(2);
    expect(cart[0].product.id).toBe(1);
    expect(cart[1].product.id).toBe(2);
  });

  it('does not mutate the original cart array', () => {
    const original: CartItem[] = [];
    const next = cartAdd(original, makeProduct(1, 5.0));
    expect(original).toHaveLength(0);
    expect(next).toHaveLength(1);
  });
});

describe('cartRemove', () => {
  it('returns the same cart when product is not found', () => {
    const cart = cartAdd([], makeProduct(1, 5.0));
    const result = cartRemove(cart, 99);
    expect(result).toHaveLength(1);
  });

  it('removes the item when quantity is 1', () => {
    let cart = cartAdd([], makeProduct(1, 5.0));
    cart = cartRemove(cart, 1);
    expect(cart).toHaveLength(0);
  });

  it('decrements quantity when quantity > 1', () => {
    let cart = cartAdd([], makeProduct(1, 5.0));
    cart = cartAdd(cart, makeProduct(1, 5.0)); // qty = 2
    cart = cartRemove(cart, 1);
    expect(cart).toHaveLength(1);
    expect(cart[0].quantity).toBe(1);
  });

  it('does not affect other items', () => {
    let cart = cartAdd([], makeProduct(1, 5.0));
    cart = cartAdd(cart, makeProduct(2, 3.0));
    cart = cartRemove(cart, 1);
    expect(cart).toHaveLength(1);
    expect(cart[0].product.id).toBe(2);
  });
});

describe('cartTotal', () => {
  it('returns 0 for an empty cart', () => {
    expect(cartTotal([])).toBe(0);
  });

  it('calculates single item total correctly', () => {
    const cart = cartAdd([], makeProduct(1, 4.99));
    expect(cartTotal(cart)).toBeCloseTo(4.99);
  });

  it('accounts for quantity', () => {
    let cart = cartAdd([], makeProduct(1, 2.5));
    cart = cartAdd(cart, makeProduct(1, 2.5)); // qty = 2
    expect(cartTotal(cart)).toBeCloseTo(5.0);
  });

  it('sums multiple different items', () => {
    let cart = cartAdd([], makeProduct(1, 10.0));
    cart = cartAdd(cart, makeProduct(2, 3.5));
    cart = cartAdd(cart, makeProduct(2, 3.5)); // qty = 2 for product 2
    // 10.0 + (3.5 * 2) = 17.0
    expect(cartTotal(cart)).toBeCloseTo(17.0);
  });

  it('handles floating point prices correctly', () => {
    let cart = cartAdd([], makeProduct(1, 1.1));
    cart = cartAdd(cart, makeProduct(2, 2.2));
    // Should not return something weird like 3.3000000000000003
    expect(cartTotal(cart)).toBeCloseTo(3.3, 5);
  });

  // Stress: large cart with many items
  it('handles a cart with 100 different products', () => {
    let cart: CartItem[] = [];
    for (let i = 1; i <= 100; i++) {
      cart = cartAdd(cart, makeProduct(i, 1.0));
    }
    expect(cartTotal(cart)).toBeCloseTo(100.0);
  });

  it('handles large quantities correctly', () => {
    let cart: CartItem[] = [];
    const p = makeProduct(1, 0.5);
    for (let i = 0; i < 1000; i++) {
      cart = cartAdd(cart, p);
    }
    expect(cart[0].quantity).toBe(1000);
    expect(cartTotal(cart)).toBeCloseTo(500.0);
  });
});
