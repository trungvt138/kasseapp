import { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import db from '../database/db';

type Order = { id: number; total: number; cash_given: number; change: number; created_at: string };
type OrderItem = { product_name: string; product_price: number; quantity: number };
type Period = 'daily' | 'monthly' | 'yearly';

export default function HistoryScreen() {
  const navigation = useNavigation<any>();
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [activePeriod, setActivePeriod] = useState<Period>('daily');

  useFocusEffect(
    useCallback(() => {
      loadOrders('daily');
    }, [])
  );

  const loadOrders = (period: Period) => {
    setActivePeriod(period);
    let dateFilter = '';
    if (period === 'daily') dateFilter = "WHERE date(created_at) = date('now')";
    if (period === 'monthly') dateFilter = "WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')";
    if (period === 'yearly') dateFilter = "WHERE strftime('%Y', created_at) = strftime('%Y', 'now')";

    const result = db.getAllSync(
      `SELECT * FROM orders ${dateFilter} ORDER BY created_at DESC`
    ) as Order[];
    setOrders(result);
    if (result.length > 0) selectOrder(result[0]);
    else { setSelectedOrder(null); setOrderItems([]); }
  };

  const selectOrder = (order: Order) => {
    setSelectedOrder(order);
    const items = db.getAllSync(
      'SELECT * FROM order_items WHERE order_id = ?', [order.id]
    ) as OrderItem[];
    setOrderItems(items);
  };

  const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);

  return (
    <View style={styles.container}>
      {/* Left: Order list */}
      <View style={styles.sidebar}>
        <Text style={styles.sidebarTitle}>📋 Lịch Sử Bán Hàng</Text>

        <View style={styles.periodTabs}>
          {(['daily', 'monthly', 'yearly'] as Period[]).map(p => (
            <TouchableOpacity
              key={p}
              style={[styles.periodTab, activePeriod === p && styles.periodTabActive]}
              onPress={() => loadOrders(p)}
            >
              <Text style={[styles.periodTabText, activePeriod === p && styles.periodTabTextActive]}>
                {{ daily: 'Hôm Nay', monthly: 'Tháng Này', yearly: 'Năm Nay' }[p]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.revenueBadge}>
          <Text style={styles.revenueLabel}>Tổng Doanh Thu</Text>
          <Text style={styles.revenueAmount}>€{totalRevenue.toFixed(2)}</Text>
        </View>

        <FlatList
          data={orders}
          keyExtractor={item => item.id.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.orderItem, selectedOrder?.id === item.id && styles.orderItemSelected]}
              onPress={() => selectOrder(item)}
            >
              <Text style={styles.orderId}>Đơn #{item.id}</Text>
              <Text style={styles.orderTotal}>€{item.total.toFixed(2)}</Text>
              <Text style={styles.orderDate}>{item.created_at}</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={styles.empty}>Không có đơn hàng trong kỳ này</Text>}
        />

        <TouchableOpacity style={styles.exportNavBtn} onPress={() => navigation.navigate('Export')}>
          <Text style={styles.exportNavBtnText}>📦 Xuất & Lưu Trữ</Text>
        </TouchableOpacity>
      </View>

      {/* Right: Order detail */}
      <View style={styles.main}>
        {selectedOrder ? (
          <>
            <Text style={styles.detailTitle}>Đơn #{selectedOrder.id}</Text>
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
              <Text style={styles.summaryLabel}>Tổng Cộng</Text>
              <Text style={styles.summaryValue}>€{selectedOrder.total.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Tiền Khách Đưa</Text>
              <Text style={styles.summaryValue}>€{selectedOrder.cash_given.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Tiền Thối</Text>
              <Text style={[styles.summaryValue, { color: '#27ae60' }]}>€{selectedOrder.change.toFixed(2)}</Text>
            </View>
          </>
        ) : (
          <Text style={styles.empty}>Không có đơn hàng trong kỳ này</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'row', backgroundColor: '#f5f5f5' },
  sidebar: { width: 300, backgroundColor: '#1e1e2e', padding: 12 },
  sidebarTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  periodTabs: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  periodTab: { flex: 1, padding: 8, borderRadius: 8, backgroundColor: '#2e2e3e', alignItems: 'center' },
  periodTabActive: { backgroundColor: '#4a90d9' },
  periodTabText: { color: '#aaa', fontSize: 13 },
  periodTabTextActive: { color: '#fff', fontWeight: 'bold' },
  revenueBadge: { backgroundColor: '#27ae60', borderRadius: 10, padding: 12, alignItems: 'center', marginBottom: 12 },
  revenueLabel: { color: '#fff', fontSize: 13 },
  revenueAmount: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
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
  exportNavBtn: { backgroundColor: '#4a90d9', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 12 },
  exportNavBtnText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
});
