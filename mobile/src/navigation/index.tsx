import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { useAuth } from '../context/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import SermonSearchScreen from '../screens/SermonSearchScreen';
import PdfViewerScreen from '../screens/PdfViewerScreen';
import BibleScreen from '../screens/BibleScreen';
import NotesScreen from '../screens/NotesScreen';
import AccountScreen from '../screens/AccountScreen';
import type { SermonStackParamList } from './types';

const SermonStack = createNativeStackNavigator<SermonStackParamList>();
const Tab = createBottomTabNavigator();

function SermonNavigator() {
  return (
    <SermonStack.Navigator>
      <SermonStack.Screen name="SermonSearch" component={SermonSearchScreen} options={{ title: 'Sermon Search' }} />
      <SermonStack.Screen name="PdfViewer" component={PdfViewerScreen} options={({ route }) => ({ title: route.params.title })} />
    </SermonStack.Navigator>
  );
}

function AuthenticatedTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Sermons" component={SermonNavigator} options={{ tabBarIcon: () => <Text>🎙</Text> }} />
      <Tab.Screen name="Bible" component={BibleScreen} options={{ tabBarIcon: () => <Text>📖</Text>, headerShown: true, headerTitle: 'King James Bible' }} />
      <Tab.Screen name="Notes" component={NotesScreen} options={{ tabBarIcon: () => <Text>📝</Text>, headerShown: true, headerTitle: 'My Notes' }} />
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
