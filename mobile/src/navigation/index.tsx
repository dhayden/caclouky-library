import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { useAuth } from '../context/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import CatalogScreen from '../screens/CatalogScreen';
import BookDetailScreen from '../screens/BookDetailScreen';
import AccountScreen from '../screens/AccountScreen';
import type { CatalogStackParamList } from './types';

const Stack = createNativeStackNavigator<CatalogStackParamList>();
const Tab = createBottomTabNavigator();

function CatalogStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="BookList" component={CatalogScreen} options={{ title: 'Catalog' }} />
      <Stack.Screen name="BookDetail" component={BookDetailScreen} options={{ title: 'Book Details' }} />
    </Stack.Navigator>
  );
}

function AuthenticatedTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Catalog" component={CatalogStack} options={{ tabBarIcon: () => <Text>📚</Text> }} />
      <Tab.Screen name="Account" component={AccountScreen} options={{ tabBarIcon: () => <Text>👤</Text>, headerShown: true }} />
    </Tab.Navigator>
  );
}

export default function Navigation() {
  const { user } = useAuth();
  return (
    <NavigationContainer>
      {user ? <AuthenticatedTabs /> : <LoginScreen />}
    </NavigationContainer>
  );
}
