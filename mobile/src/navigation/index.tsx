import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useDisplay } from '../context/DisplayContext';
import LoginScreen from '../screens/LoginScreen';
import SermonSearchScreen from '../screens/SermonSearchScreen';
import PdfViewerScreen from '../screens/PdfViewerScreen';
import BibleScreen from '../screens/BibleScreen';
import GokScreen from '../screens/GokScreen';
import NotesScreen from '../screens/NotesScreen';
import AccountScreen from '../screens/AccountScreen';
import type { GokStackParamList } from './types';

const GokStack = createNativeStackNavigator<GokStackParamList>();
const Tab = createBottomTabNavigator();

function GokNavigator() {
  const { theme } = useDisplay();
  const c = theme.colors;
  return (
    <GokStack.Navigator
      screenOptions={{
        headerShown: false,
        headerStyle: { backgroundColor: c.surface },
        headerTintColor: c.textPrimary,
        headerTitleStyle: { fontWeight: '700', fontSize: 17 },
        headerShadowVisible: false,
      }}
    >
      <GokStack.Screen name="GokHome" component={GokScreen} />
      <GokStack.Screen
        name="SermonSearch"
        component={SermonSearchScreen as any}
        options={{ headerShown: true, title: 'Search' }}
      />
      <GokStack.Screen
        name="PdfViewer"
        component={PdfViewerScreen as any}
        options={({ route }) => ({ headerShown: true, title: (route.params as any).title })}
      />
    </GokStack.Navigator>
  );
}

function AuthenticatedTabs() {
  const { theme } = useDisplay();
  const c = theme.colors;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.textMuted,
        tabBarStyle: {
          backgroundColor: c.surface,
          borderTopColor: c.border,
          borderTopWidth: 1,
          paddingBottom: 6,
          paddingTop: 6,
          height: 62,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginTop: 2 },
        tabBarIcon: ({ color, focused, size }) => {
          const icons: Record<string, [string, string]> = {
            GoK:      ['library',       'library-outline'],
            Bible:    ['book',          'book-outline'],
            Notes:    ['document-text', 'document-text-outline'],
            Account:  ['person',        'person-outline'],
          };
          const [active, inactive] = icons[route.name] ?? ['ellipse', 'ellipse-outline'];
          return <Ionicons name={(focused ? active : inactive) as any} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="GoK"      component={GokNavigator}  options={{ headerShown: false }} />
      <Tab.Screen name="Bible"    component={BibleScreen}   options={{ headerShown: true, headerTitle: 'King James Bible', headerStyle: { backgroundColor: theme.colors.surface }, headerTintColor: theme.colors.textPrimary, headerTitleStyle: { fontWeight: '700', fontSize: 17 }, headerShadowVisible: false }} />
      <Tab.Screen name="Notes"    component={NotesScreen}   options={{ headerShown: true, headerTitle: 'My Notes',         headerStyle: { backgroundColor: theme.colors.surface }, headerTintColor: theme.colors.textPrimary, headerTitleStyle: { fontWeight: '700', fontSize: 17 }, headerShadowVisible: false }} />
      <Tab.Screen name="Account"  component={AccountScreen} options={{ headerShown: true,                                  headerStyle: { backgroundColor: theme.colors.surface }, headerTintColor: theme.colors.textPrimary, headerTitleStyle: { fontWeight: '700', fontSize: 17 }, headerShadowVisible: false }} />
    </Tab.Navigator>
  );
}

export default function Navigation() {
  const { user } = useAuth();
  const { theme } = useDisplay();
  return (
    <NavigationContainer
      theme={{
        dark: theme.dark,
        colors: {
          primary:       theme.colors.primary,
          background:    theme.colors.background,
          card:          theme.colors.surface,
          text:          theme.colors.textPrimary,
          border:        theme.colors.border,
          notification:  theme.colors.primary,
        },
      }}
    >
      {user ? <AuthenticatedTabs /> : <LoginScreen />}
    </NavigationContainer>
  );
}
