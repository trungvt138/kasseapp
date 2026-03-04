import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import ProductsScreen from '../screens/ProductsScreen';
import KasseScreen from '../screens/KasseScreen';
import HistoryScreen from '../screens/HistoryScreen';
import ExportScreen from '../screens/ExportScreen';
import CheckoutScreen from '../screens/CheckoutScreen';
import ReceiptScreen from '../screens/ReceiptScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Kasse">
        <Stack.Screen name="Kasse" component={KasseScreen} options={{ title: '🛒 Thu Ngân' }} />
        <Stack.Screen name="Products" component={ProductsScreen} options={{ title: '📦 Sản Phẩm' }} />
        <Stack.Screen name="History" component={HistoryScreen} options={{ title: '📋 Lịch Sử Bán Hàng' }} />
        <Stack.Screen name="Export" component={ExportScreen} options={{ title: '📦 Xuất & Lưu Trữ' }} />
        <Stack.Screen name="Checkout" component={CheckoutScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Receipt" component={ReceiptScreen} options={{ headerShown: false }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}