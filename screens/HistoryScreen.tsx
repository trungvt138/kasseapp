import { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import db from '../database/db';

type Order = { id: number; total: number; cash_given: number; change: number; created_at: string };
type OrderItem = { product_name: string; product_price: number; quantity: number };

export default function HistoryScreen() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadOrders();
    }, [])
  );

  const loadOrders = () => {
    const result = db.getAllSync(
      'SELECT * FROM orders ORDER BY created_at DESC'
    ) as Order[];
    setOrders(result);
    if (result.length > 0) selectOrder(result[0]);
  };

  const selectOrder = (order: Order) => {
    setSelectedOrder(order);
    const items = db.getAllSync(
      'SELECT * FROM order_items WHERE order_id = ?', [order.id]
    ) as OrderItem[];
    setOrderItems(items);
  };

  return (
    <View style={styles.container}>
      {/* Left: Order list */}
      <View style={styles.sidebar}>
        <Text style={styles.sidebarTitle}>📋 Sales History</Text>
        <FlatList
          data={orders}
          keyExtractor={item => item.id.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.orderItem, selectedOrder?.id === item.id && styles.orderItemSelected]}
              onPress={() => selectOrder(item)}
            >
              <Text style={styles.orderId}>Order #{item.id}</Text>
              <Text style={styles.orderTotal}>€{item.total.toFixed(2)}</Text>
              <Text style={styles.orderDate}>{item.created_at}</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <Text style={styles.empty}>No sales yet</Text>
          }
        />
      </View>

      {/* Right: Order detail */}
      <View style={styles.main}>
        {selectedOrder ? (
          <>
            <Text style={styles.detailTitle}>Order #{selectedOrder.id}</Text>
            <Text style={styles.detailDate}>{selectedOrder.created_at}</Text>

            <View style={styles.divider} />

            <FlatList
              data={orderItems}
              keyExtractor={(_, i) => i.toString()}
              renderItem={({ item }) => (
                <View style={styles.itemRow}>
                  <Text style={styles.itemName}>{item.product_name} x{item.quantity}</Text>
                  <Text style={styles.itemPrice}>€{(item.product_price * item.quantity).toFixed(2)}</Text>
                </View>
              )}
            />

            <View style={styles.divider} />

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total</Text>
              <Text style={styles.summaryValue}>€{selectedOrder.total.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Cash Given</Text>
              <Text style={styles.summaryValue}>€{selectedOrder.cash_given.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Change</Text>
              <Text style={[styles.summaryValue, { color: '#27ae60' }]}>€{selectedOrder.change.toFixed(2)}</Text>
            </View>
          </>
        ) : (
          <Text style={styles.empty}>Select an order to see details</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'row', backgroundColor: '#f5f5f5' },
  sidebar: { width: 280, backgroundColor: '#1e1e2e', padding: 12 },
  sidebarTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  orderItem: { padding: 12, borderRadius: 8, marginBottom: 6, backgroundColor: '#2e2e3e' },
  orderItemSelected: { backgroundColor: '#4a90d9' },
  orderId: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  orderTotal: { color: '#27ae60', fontSize: 15, marginTop: 2 },
  orderDate: { color: '#aaa', fontSize: 12, marginTop: 2 },
  main: { flex: 1, padding: 24, backgroundColor: '#fff' },
  detailTitle: { fontSize: 24, fontWeight: 'bold' },
  detailDate: { color: '#888', fontSize: 14, marginTop: 4 },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 16 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  itemName: { fontSize: 16 },
  itemPrice: { fontSize: 16, fontWeight: 'bold' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  summaryLabel: { fontSize: 18, color: '#555' },
  summaryValue: { fontSize: 18, fontWeight: 'bold' },
  empty: { color: '#aaa', fontSize: 16, padding: 20 },
});