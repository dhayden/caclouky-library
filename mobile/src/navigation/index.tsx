import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { useAuth } from '../context/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import SermonSearchScreen from '../screens/SermonSearchScreen';
import AccountScreen from '../screens/AccountScreen';

const Tab = createBottomTabNavigator();

function AuthenticatedTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: true }}>
      <Tab.Screen name="Sermons" component={SermonSearchScreen} options={{ tabBarIcon: () => <Text>🎙</Text>, headerTitle: 'Sermon Search' }} />
      <Tab.Screen name="Account" component={AccountScreen} options={{ tabBarIcon: () => <Text>👤</Text> }} />
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
