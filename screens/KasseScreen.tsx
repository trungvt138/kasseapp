import { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, ScrollView } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import db from '../database/db';

type Category = { id: number; name: string };
type Product = { id: number; name: string; price: number; category_id: number };
type CartItem = { product: Product; quantity: number };

export default function KasseScreen() {
  const navigation = useNavigation();
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadCategories();
      loadProducts();
    }, [])
  );

  const loadCategories = () => {
    const result = db.getAllSync('SELECT * FROM categories ORDER BY name') as Category[];
    setCategories(result);
    if (result.length > 0) setSelectedCategory(result[0].id);
  };

  const loadProducts = () => {
    const result = db.getAllSync('SELECT * FROM products ORDER BY name') as Product[];
    setProducts(result);
  };

  const filteredProducts = selectedCategory
    ? products.filter(p => p.category_id === selectedCategory)
    : products;

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) {
        return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: number) => {
    setCart(prev => {
      const existing = prev.find(i => i.product.id === productId);
      if (existing && existing.quantity > 1) {
        return prev.map(i => i.product.id === productId ? { ...i, quantity: i.quantity - 1 } : i);
      }
      return prev.filter(i => i.product.id !== productId);
    });
  };

  const clearCart = () => setCart([]);

  const total = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  return (
    <View style={styles.container}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <Text style={styles.title}>🛒 Kasse</Text>
        <View style={styles.topButtons}>
          <TouchableOpacity style={styles.navBtn} onPress={() => navigation.navigate('Products' as never)}>
            <Text style={styles.navBtnText}>📦 Products</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navBtn} onPress={() => navigation.navigate('History' as never)}>
            <Text style={styles.navBtnText}>📋 History</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.main}>
        {/* Left: Category tabs + Product Grid */}
        <View style={styles.productPanel}>
          {/* Category tabs */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryBar}>
            {categories.map(cat => (
              <TouchableOpacity
                key={cat.id}
                style={[styles.categoryTab, selectedCategory === cat.id && styles.categoryTabSelected]}
                onPress={() => setSelectedCategory(cat.id)}
              >
                <Text style={[styles.categoryTabText, selectedCategory === cat.id && styles.categoryTabTextSelected]}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Product grid */}
          <FlatList
            data={filteredProducts}
            keyExtractor={item => item.id.toString()}
            numColumns={4}
            contentContainerStyle={styles.productGrid}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.productCard} onPress={() => addToCart(item)}>
                <Text style={styles.productName}>{item.name}</Text>
                <Text style={styles.productPrice}>€{item.price.toFixed(2)}</Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <Text style={styles.placeholder}>No products. Add some in Products screen!</Text>
            }
          />
        </View>

        {/* Right: Cart */}
        <View style={styles.cartPanel}>
          <Text style={styles.panelTitle}>🧾 Order</Text>
          <ScrollView style={styles.cartList}>
            {cart.length === 0 && <Text style={styles.placeholder}>Cart is empty</Text>}
            {cart.map(item => (
              <View key={item.product.id} style={styles.cartItem}>
                <View style={styles.cartItemInfo}>
                  <Text style={styles.cartItemName}>{item.product.name}</Text>
                  <Text style={styles.cartItemPrice}>€{(item.product.price * item.quantity).toFixed(2)}</Text>
                </View>
                <View style={styles.cartItemControls}>
                  <TouchableOpacity style={styles.qtyBtn} onPress={() => removeFromCart(item.product.id)}>
                    <Text style={styles.qtyBtnText}>−</Text>
                  </TouchableOpacity>
                  <Text style={styles.qtyText}>{item.quantity}</Text>
                  <TouchableOpacity style={styles.qtyBtn} onPress={() => addToCart(item.product)}>
                    <Text style={styles.qtyBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>

          <View style={styles.cartFooter}>
            {cart.length > 0 && (
              <TouchableOpacity style={styles.clearBtn} onPress={clearCart}>
                <Text style={styles.clearBtnText}>🗑️ Clear</Text>
              </TouchableOpacity>
            )}
            <Text style={styles.total}>Total: €{total.toFixed(2)}</Text>
            <TouchableOpacity
              style={[styles.checkoutBtn, cart.length === 0 && styles.checkoutBtnDisabled]}
              disabled={cart.length === 0}
            >
              <Text style={styles.checkoutBtnText}>Checkout →</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1e1e2e', padding: 12 },
  title: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  topButtons: { flexDirection: 'row', gap: 12 },
  navBtn: { backgroundColor: '#4a90d9', padding: 10, borderRadius: 8 },
  navBtnText: { color: '#fff', fontSize: 16 },
  main: { flex: 1, flexDirection: 'row' },
  productPanel: { flex: 6, backgroundColor: '#f0f0f0' },
  categoryBar: { maxHeight: 56, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#fff' },
  categoryTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 8, backgroundColor: '#eee' },
  categoryTabSelected: { backgroundColor: '#4a90d9' },
  categoryTabText: { fontSize: 15, color: '#555' },
  categoryTabTextSelected: { color: '#fff', fontWeight: 'bold' },
  productGrid: { padding: 12 },
  productCard: { flex: 1, margin: 6, backgroundColor: '#fff', borderRadius: 12, padding: 16, alignItems: 'center', elevation: 2, minHeight: 90 },
  productName: { fontSize: 15, fontWeight: 'bold', textAlign: 'center' },
  productPrice: { fontSize: 14, color: '#4a90d9', marginTop: 6 },
  placeholder: { color: '#aaa', fontSize: 16, padding: 20 },
  cartPanel: { flex: 4, backgroundColor: '#fff', borderLeftWidth: 1, borderLeftColor: '#ddd', padding: 16 },
  panelTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  cartList: { flex: 1 },
  cartItem: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  cartItemInfo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  cartItemName: { fontSize: 15, fontWeight: '600', flex: 1 },
  cartItemPrice: { fontSize: 15, fontWeight: 'bold', color: '#27ae60' },
  cartItemControls: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  qtyBtn: { backgroundColor: '#eee', width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  qtyBtnText: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  qtyText: { fontSize: 16, fontWeight: 'bold', minWidth: 24, textAlign: 'center' },
  cartFooter: { paddingTop: 12, borderTopWidth: 1, borderTopColor: '#eee' },
  clearBtn: { alignSelf: 'flex-end', marginBottom: 8 },
  clearBtnText: { color: '#e74c3c', fontSize: 15 },
  total: { fontSize: 24, fontWeight: 'bold', marginBottom: 12 },
  checkoutBtn: { backgroundColor: '#27ae60', padding: 16, borderRadius: 10, alignItems: 'center' },
  checkoutBtnDisabled: { backgroundColor: '#aaa' },
  checkoutBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});