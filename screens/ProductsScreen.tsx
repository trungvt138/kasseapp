import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, TextInput, Modal, StyleSheet, Alert } from 'react-native';
import db from '../database/db';

type Category = { id: number; name: string };
type Product = { id: number; name: string; price: number; category_id: number; category_name: string };

export default function ProductsScreen() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);

  // Modal states
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const [productName, setProductName] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [productCategory, setProductCategory] = useState<number | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  useEffect(() => {
    loadCategories();
    loadProducts();
  }, []);

  const loadCategories = () => {
    const result = db.getAllSync('SELECT * FROM categories ORDER BY name') as Category[];
    setCategories(result);
    if (result.length > 0 && !selectedCategory) setSelectedCategory(result[0].id);
  };

  const loadProducts = () => {
    const result = db.getAllSync(`
      SELECT p.*, c.name as category_name 
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id
      ORDER BY p.name
    `) as Product[];
    setProducts(result);
  };

  const addCategory = () => {
    if (!categoryName.trim()) return;
    db.runSync('INSERT INTO categories (name) VALUES (?)', [categoryName.trim()]);
    setCategoryName('');
    setShowCategoryModal(false);
    loadCategories();
  };

  const deleteCategory = (id: number) => {
    Alert.alert('Delete Category', 'This will also delete all products in this category!', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => {
        db.runSync('DELETE FROM products WHERE category_id = ?', [id]);
        db.runSync('DELETE FROM categories WHERE id = ?', [id]);
        loadCategories();
        loadProducts();
      }}
    ]);
  };

  const openAddProduct = () => {
    setEditingProduct(null);
    setProductName('');
    setProductPrice('');
    setProductCategory(selectedCategory);
    setShowProductModal(true);
  };

  const openEditProduct = (product: Product) => {
    setEditingProduct(product);
    setProductName(product.name);
    setProductPrice(product.price.toString());
    setProductCategory(product.category_id);
    setShowProductModal(true);
  };

  const saveProduct = () => {
    if (!productName.trim() || !productPrice) return;
    const categoryToUse = productCategory ?? selectedCategory ?? categories[0]?.id;
    if (!categoryToUse) return;
    const price = parseFloat(productPrice);
    if (isNaN(price)) return;

    if (editingProduct) {
      db.runSync('UPDATE products SET name=?, price=?, category_id=? WHERE id=?',
        [productName.trim(), price, categoryToUse, editingProduct.id]);
    } else {
      db.runSync('INSERT INTO products (name, price, category_id) VALUES (?,?,?)',
        [productName.trim(), price, categoryToUse]);
    }
    setShowProductModal(false);
    loadProducts();
  };

// const saveProduct = () => {
//     console.log('saveProduct called');
//     console.log('productName:', productName);
//     console.log('productPrice:', productPrice);
//     console.log('productCategory:', productCategory);
//     console.log('selectedCategory:', selectedCategory);
//     console.log('categories:', categories);

//     if (!productName.trim() || !productPrice) {
//       Alert.alert('Error', 'Name and price are required');
//       return;
//     }
//     const categoryToUse = productCategory ?? selectedCategory ?? categories[0]?.id;
//     if (!categoryToUse) {
//       Alert.alert('Error', 'Please select a category');
//       return;
//     }
//     const price = parseFloat(productPrice);
//     if (isNaN(price)) {
//       Alert.alert('Error', 'Invalid price');
//       return;
//     }

//     if (editingProduct) {
//       db.runSync('UPDATE products SET name=?, price=?, category_id=? WHERE id=?',
//         [productName.trim(), price, categoryToUse, editingProduct.id]);
//     } else {
//       db.runSync('INSERT INTO products (name, price, category_id) VALUES (?,?,?)',
//         [productName.trim(), price, categoryToUse]);
//     }
//     setShowProductModal(false);
//     loadProducts();
// };

  const deleteProduct = (id: number) => {
    Alert.alert('Delete Product', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => {
        db.runSync('DELETE FROM products WHERE id = ?', [id]);
        loadProducts();
      }}
    ]);
  };

  const filteredProducts = selectedCategory
    ? products.filter(p => p.category_id === selectedCategory)
    : products;

  return (
    <View style={styles.container}>
      {/* Left: Categories */}
      <View style={styles.sidebar}>
        <Text style={styles.sidebarTitle}>Categories</Text>
        <FlatList
          data={categories}
          keyExtractor={item => item.id.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.categoryItem, selectedCategory === item.id && styles.categorySelected]}
              onPress={() => setSelectedCategory(item.id)}
              onLongPress={() => deleteCategory(item.id)}
            >
              <Text style={styles.categoryText}>{item.name}</Text>
            </TouchableOpacity>
          )}
        />
        <TouchableOpacity style={styles.addButton} onPress={() => setShowCategoryModal(true)}>
          <Text style={styles.addButtonText}>+ Add Category</Text>
        </TouchableOpacity>
      </View>

      {/* Right: Products */}
      <View style={styles.main}>
        <Text style={styles.mainTitle}>Products</Text>
        <FlatList
          data={filteredProducts}
          keyExtractor={item => item.id.toString()}
          numColumns={3}
          renderItem={({ item }) => (
            <View style={styles.productCard}>
              <Text style={styles.productName}>{item.name}</Text>
              <Text style={styles.productPrice}>€{item.price.toFixed(2)}</Text>
              <View style={styles.productActions}>
                <TouchableOpacity onPress={() => openEditProduct(item)}>
                  <Text style={styles.editBtn}>✏️</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => deleteProduct(item.id)}>
                  <Text style={styles.deleteBtn}>🗑️</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
        <TouchableOpacity 
          style={[styles.addButton, categories.length === 0 && { backgroundColor: '#aaa' }]} 
          onPress={openAddProduct}
          disabled={categories.length === 0}
        >
          <Text style={styles.addButtonText}>
            {categories.length === 0 ? 'Add a category first!' : '+ Add Product'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Category Modal */}
      <Modal visible={showCategoryModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>New Category</Text>
            <TextInput
              style={styles.input}
              placeholder="Category name"
              value={categoryName}
              onChangeText={setCategoryName}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowCategoryModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={addCategory}>
                <Text style={styles.saveBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Product Modal */}
      <Modal visible={showProductModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>{editingProduct ? 'Edit Product' : 'New Product'}</Text>
            <TextInput
              style={styles.input}
              placeholder="Product name"
              value={productName}
              onChangeText={setProductName}
            />
            <TextInput
              style={styles.input}
              placeholder="Price (e.g. 3.50)"
              value={productPrice}
              onChangeText={setProductPrice}
              keyboardType="decimal-pad"
            />
            <Text style={styles.label}>Category:</Text>
            <View style={styles.categoryPicker}>
              {categories.map(cat => (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.pickerItem, productCategory === cat.id && styles.pickerItemSelected]}
                  onPress={() => setProductCategory(cat.id)}
                >
                  <Text style={styles.pickerItemText}>{cat.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowProductModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={saveProduct}>
                <Text style={styles.saveBtnText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'row' },
  sidebar: { width: 200, backgroundColor: '#1e1e2e', padding: 12 },
  sidebarTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  categoryItem: { padding: 12, borderRadius: 8, marginBottom: 6 },
  categorySelected: { backgroundColor: '#4a90d9' },
  categoryText: { color: '#fff', fontSize: 16 },
  main: { flex: 1, padding: 16, backgroundColor: '#f5f5f5' },
  mainTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  productCard: { flex: 1, margin: 6, backgroundColor: '#fff', borderRadius: 10, padding: 12, alignItems: 'center', elevation: 2 },
  productName: { fontSize: 16, fontWeight: 'bold', textAlign: 'center' },
  productPrice: { fontSize: 14, color: '#4a90d9', marginTop: 4 },
  productActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  editBtn: { fontSize: 20 },
  deleteBtn: { fontSize: 20 },
  addButton: { backgroundColor: '#4a90d9', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 12 },
  addButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modal: { backgroundColor: '#fff', borderRadius: 12, padding: 24, width: 400 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 12 },
  label: { fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  categoryPicker: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  pickerItem: { padding: 8, borderRadius: 6, backgroundColor: '#eee' },
  pickerItemSelected: { backgroundColor: '#4a90d9' },
  pickerItemText: { color: '#333', fontSize: 14 },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  cancelBtn: { padding: 12, borderRadius: 8, backgroundColor: '#eee' },
  cancelBtnText: { fontSize: 16, color: '#333' },
  saveBtn: { padding: 12, borderRadius: 8, backgroundColor: '#4a90d9' },
  saveBtnText: { fontSize: 16, color: '#fff', fontWeight: 'bold' },
});