const DEV_API_URL = __DEV__ && typeof window !== 'undefined'
  ? 'http://localhost:5000'       // browser (npm run web)
  : 'http://10.90.20.57:5000';   // physical device via Expo Go
const PROD_API_URL = '';  // set when deployed

export const API_BASE_URL = __DEV__ ? DEV_API_URL : PROD_API_URL;
