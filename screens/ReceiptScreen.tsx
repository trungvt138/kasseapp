import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

type CartItem = { product: { id: number; name: string; price: number }; quantity: number };

export default function ReceiptScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { cart, total, cash, change, orderId } = route.params as {
    cart: CartItem[]; total: number; cash: number; change: number; orderId: number;
  };

  const now = new Date();
  const dateStr = now.toLocaleDateString('de-DE');
  const timeStr = now.toLocaleTimeString('de-DE');

  return (
    <View style={styles.container}>
      <View style={styles.receipt}>
        <Text style={styles.shopName}>🛒 Kasse</Text>
        <Text style={styles.meta}>Order #{orderId}</Text>
        <Text style={styles.meta}>{dateStr} {timeStr}</Text>

        <View style={styles.divider} />

        <ScrollView style={styles.itemList}>
          {cart.map((item, index) => (
            <View key={index} style={styles.item}>
              <Text style={styles.itemName}>{item.product.name} x{item.quantity}</Text>
              <Text style={styles.itemPrice}>€{(item.product.price * item.quantity).toFixed(2)}</Text>
            </View>
          ))}
        </ScrollView>

        <View style={styles.divider} />

        <View style={styles.row}>
          <Text style={styles.rowLabel}>Total</Text>
          <Text style={styles.rowValue}>€{total.toFixed(2)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Cash</Text>
          <Text style={styles.rowValue}>€{cash.toFixed(2)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Change</Text>
          <Text style={[styles.rowValue, { color: '#27ae60' }]}>€{change.toFixed(2)}</Text>
        </View>

        <View style={styles.divider} />

        <Text style={styles.thanks}>Thank you! 😊</Text>

        <TouchableOpacity
          style={styles.doneBtn}
          onPress={() => navigation.navigate('Kasse' as never)}
        >
          <Text style={styles.doneBtnText}>✅ Done — New Order</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', justifyContent: 'center', alignItems: 'center' },
  receipt: { backgroundColor: '#fff', borderRadius: 16, padding: 32, width: 480, elevation: 4 },
  shopName: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginBottom: 4 },
  meta: { fontSize: 14, color: '#888', textAlign: 'center' },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 16 },
  itemList: { maxHeight: 300 },
  item: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  itemName: { fontSize: 16 },
  itemPrice: { fontSize: 16, fontWeight: 'bold' },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  rowLabel: { fontSize: 18, color: '#555' },
  rowValue: { fontSize: 18, fontWeight: 'bold' },
  thanks: { fontSize: 18, textAlign: 'center', marginVertical: 16, color: '#4a90d9' },
  doneBtn: { backgroundColor: '#27ae60', padding: 16, borderRadius: 10, alignItems: 'center' },
  doneBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});