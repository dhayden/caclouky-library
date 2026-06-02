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
import NotesScreen from '../screens/NotesScreen';
import AccountScreen from '../screens/AccountScreen';
import type { SermonStackParamList } from './types';

const SermonStack = createNativeStackNavigator<SermonStackParamList>();
const Tab = createBottomTabNavigator();

function SermonNavigator() {
  const { theme } = useDisplay();
  const c = theme.colors;
  return (
    <SermonStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: c.surface },
        headerTintColor: c.textPrimary,
        headerTitleStyle: { fontWeight: '700', fontSize: 17 },
        headerShadowVisible: false,
      }}
    >
      <SermonStack.Screen name="SermonSearch" component={SermonSearchScreen} options={{ title: 'Sermons' }} />
      <SermonStack.Screen name="PdfViewer" component={PdfViewerScreen} options={({ route }) => ({ title: route.params.title })} />
    </SermonStack.Navigator>
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
            Sermons:  ['mic',         'mic-outline'],
            Bible:    ['book',        'book-outline'],
            Notes:    ['document-text', 'document-text-outline'],
            Account:  ['person',      'person-outline'],
          };
          const [active, inactive] = icons[route.name] ?? ['ellipse', 'ellipse-outline'];
          return <Ionicons name={(focused ? active : inactive) as any} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Sermons"  component={SermonNavigator} />
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
        fonts: {
          regular:  { fontFamily: 'System', fontWeight: '400' },
          medium:   { fontFamily: 'System', fontWeight: '500' },
          bold:     { fontFamily: 'System', fontWeight: '700' },
          heavy:    { fontFamily: 'System', fontWeight: '900' },
        },
      }}
    >
      {user ? <AuthenticatedTabs /> : <LoginScreen />}
    </NavigationContainer>
  );
}
