import { useEffect } from 'react';
import { initDatabase, seedInitialProducts } from './database/db';
import AppNavigator from './navigation/AppNavigator';
import * as ScreenOrientation from 'expo-screen-orientation';

export default function App() {
  useEffect(() => {
    initDatabase();
    seedInitialProducts();
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
  }, []);

  return <AppNavigator />;
}