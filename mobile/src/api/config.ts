import Constants from 'expo-constants';

function getDevApiUrl(): string {
  // On web, the API is on the same machine as the browser
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    return 'http://localhost:5000';
  }
  // On a physical device or simulator, derive the host from Metro's bundler URI
  // so the IP never needs to be hardcoded
  const hostUri: string | undefined =
    Constants.expoConfig?.hostUri ?? (Constants as any).manifest?.debuggerHost;
  const host = hostUri?.split(':')[0];
  return host ? `http://${host}:5000` : 'http://localhost:5000';
}

const PROD_API_URL = 'https://212.56.44.143:8080';

export const API_BASE_URL = __DEV__ ? getDevApiUrl() : PROD_API_URL;
