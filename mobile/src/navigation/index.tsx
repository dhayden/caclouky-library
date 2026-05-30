import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { useAuth } from '../context/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import CatalogScreen from '../screens/CatalogScreen';
import BookDetailScreen from '../screens/BookDetailScreen';
import MyCheckoutsScreen from '../screens/MyCheckoutsScreen';
import MyReservationsScreen from '../screens/MyReservationsScreen';
import SermonSearchScreen from '../screens/SermonSearchScreen';
import AccountScreen from '../screens/AccountScreen';
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import AdminCheckoutsScreen from '../screens/admin/AdminCheckoutsScreen';
import AdminReservationsScreen from '../screens/admin/AdminReservationsScreen';
import AdminMembersScreen from '../screens/admin/AdminMembersScreen';
import type { CatalogStackParamList, AdminStackParamList } from './types';

const CatalogStack = createNativeStackNavigator<CatalogStackParamList>();
const AdminStack = createNativeStackNavigator<AdminStackParamList>();
const Tab = createBottomTabNavigator();

function CatalogNavigator() {
  return (
    <CatalogStack.Navigator>
      <CatalogStack.Screen name="BookList" component={CatalogScreen} options={{ title: 'Catalog' }} />
      <CatalogStack.Screen name="BookDetail" component={BookDetailScreen} options={{ title: 'Book Details' }} />
    </CatalogStack.Navigator>
  );
}

function AdminNavigator() {
  return (
    <AdminStack.Navigator>
      <AdminStack.Screen name="AdminDashboard" component={AdminDashboardScreen} options={{ title: 'Dashboard' }} />
      <AdminStack.Screen name="AdminCheckouts" component={AdminCheckoutsScreen} options={{ title: 'Manage Checkouts' }} />
      <AdminStack.Screen name="AdminReservations" component={AdminReservationsScreen} options={{ title: 'Manage Reservations' }} />
      <AdminStack.Screen name="AdminMembers" component={AdminMembersScreen} options={{ title: 'Members' }} />
    </AdminStack.Navigator>
  );
}

function AuthenticatedTabs() {
  const { user } = useAuth();
  const isAdmin = user?.roles.includes('Admin') ?? false;

  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Catalog" component={CatalogNavigator} options={{ tabBarIcon: () => <Text>📚</Text> }} />
      <Tab.Screen name="My Checkouts" component={MyCheckoutsScreen} options={{ tabBarIcon: () => <Text>📋</Text>, headerShown: true }} />
      <Tab.Screen name="My Reservations" component={MyReservationsScreen} options={{ tabBarIcon: () => <Text>🔖</Text>, headerShown: true }} />
      <Tab.Screen name="Sermons" component={SermonSearchScreen} options={{ tabBarIcon: () => <Text>🎙</Text>, headerShown: true, headerTitle: 'Sermon Search' }} />
      {isAdmin && <Tab.Screen name="Admin" component={AdminNavigator} options={{ tabBarIcon: () => <Text>⚙️</Text> }} />}
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
