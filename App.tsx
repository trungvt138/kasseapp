import { useEffect } from 'react';
import { initDatabase } from './database/db';
import AppNavigator from './navigation/AppNavigator';

export default function App() {
  useEffect(() => {
    initDatabase();
  }, []);

  return <AppNavigator />;
}