import { useEffect } from 'react';
import { initDatabase } from './database/db';
import AppNavigator from './navigation/AppNavigator';
import * as ScreenOrientation from 'expo-screen-orientation';

export default function App() {
  useEffect(() => {
    initDatabase();
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
  }, []);

  return <AppNavigator />;
}