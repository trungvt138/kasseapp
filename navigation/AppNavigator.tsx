import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import ProductsScreen from '../screens/ProductsScreen';
import KasseScreen from '../screens/KasseScreen';
import HistoryScreen from '../screens/HistoryScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Kasse">
        <Stack.Screen name="Kasse" component={KasseScreen} options={{ title: '🛒 Kasse' }} />
        <Stack.Screen name="Products" component={ProductsScreen} options={{ title: '📦 Products' }} />
        <Stack.Screen name="History" component={HistoryScreen} options={{ title: '📋 Sales History' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}