import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/context/AuthContext';
import { DisplayProvider, useDisplay } from './src/context/DisplayContext';
import Navigation from './src/navigation';

function Root() {
  const { theme } = useDisplay();
  return (
    <>
      <Navigation />
      <StatusBar style={theme.dark ? 'light' : 'dark'} />
    </>
  );
}

export default function App() {
  return (
    <DisplayProvider>
      <AuthProvider>
        <Root />
      </AuthProvider>
    </DisplayProvider>
  );
}
