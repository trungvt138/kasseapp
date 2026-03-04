import { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import db from '../database/db';

type Order = { id: number; total: number; cash_given: number; change: number; created_at: string };
type OrderItem = { product_name: string; product_price: number; quantity: number };
type MonthRow = { month: string; exported: boolean };

export default function ExportScreen() {
  const [months, setMonths] = useState<MonthRow[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadMonths();
    }, [])
  );

  const loadMonths = () => {
    const rows = db.getAllSync(`
      SELECT
        strftime('%Y-%m', created_at) as month,
        CASE WHEN em.year_month IS NOT NULL THEN 1 ELSE 0 END as exported
      FROM orders
      LEFT JOIN exported_months em ON em.year_month = strftime('%Y-%m', created_at)
      GROUP BY month
      ORDER BY month DESC
    `) as { month: string; exported: number }[];
    setMonths(rows.map(r => ({ month: r.month, exported: r.exported === 1 })));
  };

  const markExported = (month: string) => {
    db.runSync(`INSERT OR IGNORE INTO exported_months (year_month) VALUES (?)`, [month]);
    loadMonths();
  };

  const getOrders = (month: string): Order[] =>
    db.getAllSync(
      `SELECT * FROM orders WHERE strftime('%Y-%m', created_at) = ? ORDER BY created_at DESC`,
      [month]
    ) as Order[];

  const exportCSV = async (month: string) => {
    const orders = getOrders(month);
    if (orders.length === 0) { Alert.alert('Không có dữ liệu', 'Không có đơn hàng trong tháng này'); return; }

    let csv = 'Order ID,Date,Product,Quantity,Price,Total\n';
    orders.forEach(order => {
      (db.getAllSync('SELECT * FROM order_items WHERE order_id = ?', [order.id]) as OrderItem[])
        .forEach(item => {
          csv += `${order.id},${order.created_at},"${item.product_name}",${item.quantity},${item.product_price.toFixed(2)},${(item.product_price * item.quantity).toFixed(2)}\n`;
        });
    });

    try {
      const path = `${FileSystem.cacheDirectory ?? ''}kasse_${month}.csv`;
      await FileSystem.writeAsStringAsync(path, csv, { encoding: FileSystem.EncodingType.UTF8 });
      await Sharing.shareAsync(path, { mimeType: 'text/csv', dialogTitle: 'Export CSV' });
      markExported(month);
    } catch { Alert.alert('Lỗi', 'Xuất thất bại'); }
  };

  const exportPDF = async (month: string) => {
    const orders = getOrders(month);
    if (orders.length === 0) { Alert.alert('Không có dữ liệu', 'Không có đơn hàng trong tháng này'); return; }

    const revenue = orders.reduce((sum, o) => sum + o.total, 0);
    let rows = '';
    orders.forEach(order => {
      (db.getAllSync('SELECT * FROM order_items WHERE order_id = ?', [order.id]) as OrderItem[])
        .forEach(item => {
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
          <h1>🛒 Thu Ngân — Báo Cáo ${month}</h1>
          <p>Ngày xuất: ${new Date().toLocaleDateString('de-DE')} | Đơn hàng: ${orders.length} | Doanh thu: €${revenue.toFixed(2)}</p>
          <table>
            <thead>
              <tr><th>Đơn</th><th>Ngày</th><th>Sản phẩm</th><th>SL</th><th>Giá</th><th>Thành tiền</th></tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <p class="summary">Tổng Doanh Thu: €${revenue.toFixed(2)}</p>
        </body>
      </html>
    `;

    try {
      const { uri } = await Print.printToFileAsync({ html });
      const dest = `${FileSystem.cacheDirectory ?? ''}kasse_${month}.pdf`;
      await FileSystem.moveAsync({ from: uri, to: dest });
      await Sharing.shareAsync(dest, { mimeType: 'application/pdf', dialogTitle: 'Export PDF' });
      markExported(month);
    } catch { Alert.alert('Lỗi', 'Xuất thất bại'); }
  };

  const handleDelete = () => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const unexported = months.filter(m => m.month < currentMonth && !m.exported);

    if (unexported.length > 0) {
      const list = unexported.map(m => `• ${m.month}`).join('\n');
      Alert.alert(
        '⚠️ Chưa Xuất',
        `Các tháng sau chưa được xuất:\n\n${list}\n\nVui lòng xuất trước khi xóa.`,
        [{ text: 'OK' }]
      );
      return;
    }

    const deletable = months.filter(m => m.month < currentMonth);
    if (deletable.length === 0) {
      Alert.alert('Không có gì để xóa', 'Không có đơn hàng từ các tháng trước.');
      return;
    }

    Alert.alert(
      '⚠️ Xóa Dữ Liệu Cũ',
      'Thao tác này sẽ xóa vĩnh viễn tất cả đơn hàng từ các tháng trước. Không thể hoàn tác.\n\nBạn có chắc không?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa', style: 'destructive',
          onPress: () => {
            db.runSync(
              `DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE strftime('%Y-%m', created_at) < ?)`,
              [currentMonth]
            );
            db.runSync(`DELETE FROM orders WHERE strftime('%Y-%m', created_at) < ?`, [currentMonth]);
            db.runSync(`DELETE FROM exported_months WHERE year_month < ?`, [currentMonth]);
            loadMonths();
            Alert.alert('Hoàn Tất', 'Đã xóa các đơn hàng cũ.');
          }
        }
      ]
    );
  };

  const handleClearAll = () => {
    Alert.alert(
      '⚠️ Xóa Toàn Bộ Lịch Sử',
      'Thao tác này sẽ xóa vĩnh viễn TẤT CẢ đơn hàng và lịch sử bán hàng. Không thể hoàn tác.\n\nBạn có chắc không?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa Hết', style: 'destructive',
          onPress: () => {
            db.execSync('DELETE FROM order_items; DELETE FROM orders; DELETE FROM exported_months;');
            loadMonths();
          }
        }
      ]
    );
  };

  const currentMonth = new Date().toISOString().slice(0, 7);

  return (
    <View style={styles.container}>
      <FlatList
        data={months}
        keyExtractor={item => item.month}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>Không có lịch sử đơn hàng.</Text>}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={styles.monthLabel}>{item.month}</Text>
              {item.month === currentMonth
                ? <Text style={styles.badgeCurrent}>Tháng hiện tại</Text>
                : item.exported
                  ? <Text style={styles.badgeExported}>✅ Đã Xuất</Text>
                  : <Text style={styles.badgePending}>⚠️ Chưa Xuất</Text>
              }
            </View>
            <View style={styles.rowButtons}>
              <TouchableOpacity style={styles.btnCSV} onPress={() => exportCSV(item.month)}>
                <Text style={styles.btnText}>CSV</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnPDF} onPress={() => exportPDF(item.month)}>
                <Text style={styles.btnText}>PDF</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListFooterComponent={
          <View>
            {months.length > 0 && (
              <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
                <Text style={styles.deleteBtnText}>🗑️ Xóa Dữ Liệu Cũ</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.clearAllBtn} onPress={handleClearAll}>
              <Text style={styles.deleteBtnText}>💣 Xóa Toàn Bộ Lịch Sử</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  list: { padding: 16 },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  rowLeft: { flex: 1 },
  monthLabel: { fontSize: 18, fontWeight: 'bold', color: '#1e1e2e' },
  badgeExported: { fontSize: 13, color: '#27ae60', marginTop: 4 },
  badgePending: { fontSize: 13, color: '#e67e22', marginTop: 4 },
  badgeCurrent: { fontSize: 13, color: '#4a90d9', marginTop: 4 },
  rowButtons: { flexDirection: 'row', gap: 8 },
  btnCSV: { backgroundColor: '#27ae60', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8 },
  btnPDF: { backgroundColor: '#4a90d9', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8 },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  deleteBtn: {
    backgroundColor: '#c0392b', padding: 16, borderRadius: 10,
    alignItems: 'center', marginTop: 8,
  },
  deleteBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  empty: { color: '#aaa', fontSize: 16, textAlign: 'center', marginTop: 40 },
  clearAllBtn: {
    backgroundColor: '#784212', padding: 16, borderRadius: 10,
    alignItems: 'center', marginTop: 10,
  },
});
