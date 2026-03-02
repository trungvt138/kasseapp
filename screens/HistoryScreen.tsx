import { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import db from '../database/db';

type Order = { id: number; total: number; cash_given: number; change: number; created_at: string };
type OrderItem = { product_name: string; product_price: number; quantity: number };

type Period = 'daily' | 'monthly' | 'yearly';

export default function HistoryScreen() {
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

const exportCSV = async () => {
    if (orders.length === 0) { Alert.alert('No data', 'No orders to export'); return; }

    let csv = 'Order ID,Date,Product,Quantity,Price,Total\n';
    orders.forEach(order => {
      const items = db.getAllSync(
        'SELECT * FROM order_items WHERE order_id = ?', [order.id]
      ) as OrderItem[];
      items.forEach(item => {
        csv += `${order.id},${order.created_at},"${item.product_name}",${item.quantity},${item.product_price.toFixed(2)},${(item.product_price * item.quantity).toFixed(2)}\n`;
      });
    });

    const filename = `kasse_${activePeriod}_${new Date().toISOString().slice(0, 10)}.csv`;
    const path = `${FileSystem.cacheDirectory ?? ''}${filename}`;
    await FileSystem.writeAsStringAsync(path, csv, { encoding: FileSystem.EncodingType.UTF8 });
    await Sharing.shareAsync(path, { mimeType: 'text/csv', dialogTitle: 'Export CSV' });
  };

  const exportPDF = async () => {
    if (orders.length === 0) { Alert.alert('No data', 'No orders to export'); return; }

    const periodLabel = activePeriod.charAt(0).toUpperCase() + activePeriod.slice(1);
    const now = new Date().toLocaleDateString('de-DE');

    let rows = '';
    orders.forEach(order => {
      const items = db.getAllSync(
        'SELECT * FROM order_items WHERE order_id = ?', [order.id]
      ) as OrderItem[];
      items.forEach(item => {
        rows += `
          <tr>
            <td>#${order.id}</td>
            <td>${order.created_at}</td>
            <td>${item.product_name}</td>
            <td>${item.quantity}</td>
            <td>€${item.product_price.toFixed(2)}</td>
            <td>€${(item.product_price * item.quantity).toFixed(2)}</td>
          </tr>`;
      });
    });

    const html = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; }
            h1 { color: #1e1e2e; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th { background: #1e1e2e; color: white; padding: 10px; text-align: left; }
            td { padding: 8px 10px; border-bottom: 1px solid #eee; }
            tr:nth-child(even) { background: #f9f9f9; }
            .summary { margin-top: 24px; font-size: 18px; font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>🛒 Kasse — ${periodLabel} Report</h1>
          <p>Generated: ${now} | Orders: ${orders.length} | Revenue: €${totalRevenue.toFixed(2)}</p>
          <table>
            <thead>
              <tr><th>Order</th><th>Date</th><th>Product</th><th>Qty</th><th>Price</th><th>Subtotal</th></tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <p class="summary">Total Revenue: €${totalRevenue.toFixed(2)}</p>
        </body>
      </html>
    `;

    const { uri } = await Print.printToFileAsync({ html });
    const filename = `kasse_${activePeriod}_${new Date().toISOString().slice(0, 10)}.pdf`;
    const dest = `${FileSystem.cacheDirectory ?? ''}${filename}`;
    await FileSystem.moveAsync({ from: uri, to: dest });
    await Sharing.shareAsync(dest, { mimeType: 'application/pdf', dialogTitle: 'Export PDF' });
  };

  return (
    <View style={styles.container}>
      {/* Left: Order list */}
      <View style={styles.sidebar}>
        <Text style={styles.sidebarTitle}>📋 Sales History</Text>

        {/* Period filter */}
        <View style={styles.periodTabs}>
          {(['daily', 'monthly', 'yearly'] as Period[]).map(p => (
            <TouchableOpacity
              key={p}
              style={[styles.periodTab, activePeriod === p && styles.periodTabActive]}
              onPress={() => loadOrders(p)}
            >
              <Text style={[styles.periodTabText, activePeriod === p && styles.periodTabTextActive]}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Revenue summary */}
        <View style={styles.revenueBadge}>
          <Text style={styles.revenueLabel}>Total Revenue</Text>
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
              <Text style={styles.orderId}>Order #{item.id}</Text>
              <Text style={styles.orderTotal}>€{item.total.toFixed(2)}</Text>
              <Text style={styles.orderDate}>{item.created_at}</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <Text style={styles.empty}>No orders in this period</Text>
          }
        />

        {/* Export buttons */}
        <View style={styles.exportButtons}>
          <TouchableOpacity style={styles.exportBtn} onPress={exportCSV}>
            <Text style={styles.exportBtnText}>📊 CSV</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.exportBtn} onPress={exportPDF}>
            <Text style={styles.exportBtnText}>📄 PDF</Text>
          </TouchableOpacity>
        </View>
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
          <Text style={styles.empty}>No orders found for this period</Text>
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
  exportButtons: { flexDirection: 'row', gap: 8, marginTop: 12 },
  exportBtn: { flex: 1, backgroundColor: '#4a90d9', padding: 12, borderRadius: 8, alignItems: 'center' },
  exportBtnText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
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