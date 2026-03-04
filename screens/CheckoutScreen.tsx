import { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, ScrollView } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import db from '../database/db';

type CartItem = { product: { id: number; name: string; price: number }; quantity: number };

export default function CheckoutScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { cart, total } = route.params as { cart: CartItem[]; total: number };

  const [cashGiven, setCashGiven] = useState('');

  const cash = parseFloat(cashGiven) || 0;
  const change = cash - total;

  const localTimestamp = () => {
    const d = new Date();
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
  };

  const confirmPayment = () => {
    if (cash < total) return;

    // Save order to database
    const orderResult = db.runSync(
      'INSERT INTO orders (total, cash_given, change, created_at) VALUES (?,?,?,?)',
      [total, cash, change, localTimestamp()]
    );
    const orderId = orderResult.lastInsertRowId;

    // Save order items
    cart.forEach(item => {
      db.runSync(
        'INSERT INTO order_items (order_id, product_name, product_price, quantity) VALUES (?,?,?,?)',
        [orderId, item.product.name, item.product.price, item.quantity]
      );
    });

    // Navigate to receipt
    navigation.navigate('Receipt' as never, { 
      cart, total, cash, change, orderId 
    } as never);
  };

  const quickCash = [
    Math.ceil(total),
    Math.ceil(total / 5) * 5,
    Math.ceil(total / 10) * 10,
    Math.ceil(total / 20) * 20,
    Math.ceil(total / 50) * 50,
  ].filter((v, i, a) => a.indexOf(v) === i && v >= total).slice(0, 4);

  return (
    <View style={styles.container}>
      <View style={styles.left}>
        <Text style={styles.title}>💳 Thanh Toán</Text>

        {/* Order summary */}
        <ScrollView style={styles.orderList}>
          {cart.map((item, index) => (
            <View key={index} style={styles.orderItem}>
              <Text style={styles.orderItemName}>{item.product.name} x{item.quantity}</Text>
              <Text style={styles.orderItemPrice}>€{(item.product.price * item.quantity).toFixed(2)}</Text>
            </View>
          ))}
        </ScrollView>

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Tổng Cộng</Text>
          <Text style={styles.totalAmount}>€{total.toFixed(2)}</Text>
        </View>
      </View>

      <View style={styles.right}>
        <Text style={styles.sectionTitle}>Tiền Khách Đưa</Text>

        {/* Quick cash buttons */}
        <View style={styles.quickCash}>
          {quickCash.map(amount => (
            <TouchableOpacity
              key={amount}
              style={styles.quickCashBtn}
              onPress={() => setCashGiven(amount.toString())}
            >
              <Text style={styles.quickCashText}>€{amount}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Manual input */}
        <TextInput
          style={styles.cashInput}
          placeholder="Nhập số tiền"
          value={cashGiven}
          onChangeText={setCashGiven}
          keyboardType="decimal-pad"
        />

        {/* Change */}
        <View style={[styles.changeBox, change >= 0 ? styles.changeBoxGreen : styles.changeBoxRed]}>
          <Text style={styles.changeLabel}>Tiền Thối</Text>
          <Text style={styles.changeAmount}>
            {cash === 0 ? '—' : change >= 0 ? `€${change.toFixed(2)}` : `Thiếu €${Math.abs(change).toFixed(2)}`}
          </Text>
        </View>

        <View style={styles.buttons}>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.cancelBtnText}>← Quay Lại</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.confirmBtn, cash < total && styles.confirmBtnDisabled]}
            disabled={cash < total}
            onPress={confirmPayment}
          >
            <Text style={styles.confirmBtnText}>✅ Xác Nhận Thanh Toán</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'row', backgroundColor: '#f5f5f5' },
  left: { flex: 5, padding: 24, backgroundColor: '#fff', borderRightWidth: 1, borderRightColor: '#eee' },
  right: { flex: 5, padding: 24 },
  title: { fontSize: 26, fontWeight: 'bold', marginBottom: 20 },
  orderList: { flex: 1 },
  orderItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  orderItemName: { fontSize: 16 },
  orderItemPrice: { fontSize: 16, fontWeight: 'bold' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 16, borderTopWidth: 2, borderTopColor: '#333', marginTop: 8 },
  totalLabel: { fontSize: 22, fontWeight: 'bold' },
  totalAmount: { fontSize: 22, fontWeight: 'bold', color: '#27ae60' },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  quickCash: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  quickCashBtn: { backgroundColor: '#4a90d9', padding: 16, borderRadius: 10, minWidth: 90, alignItems: 'center' },
  quickCashText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  cashInput: { borderWidth: 2, borderColor: '#4a90d9', borderRadius: 10, padding: 16, fontSize: 24, marginBottom: 20, textAlign: 'center' },
  changeBox: { padding: 20, borderRadius: 10, alignItems: 'center', marginBottom: 24 },
  changeBoxGreen: { backgroundColor: '#e8f8f0' },
  changeBoxRed: { backgroundColor: '#fdecea' },
  changeLabel: { fontSize: 16, color: '#555', marginBottom: 4 },
  changeAmount: { fontSize: 32, fontWeight: 'bold', color: '#27ae60' },
  buttons: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, padding: 16, borderRadius: 10, backgroundColor: '#eee', alignItems: 'center' },
  cancelBtnText: { fontSize: 18, color: '#333' },
  confirmBtn: { flex: 2, padding: 16, borderRadius: 10, backgroundColor: '#27ae60', alignItems: 'center' },
  confirmBtnDisabled: { backgroundColor: '#aaa' },
  confirmBtnText: { fontSize: 18, color: '#fff', fontWeight: 'bold' },
});