const DEV_API_URL = 'http://localhost:5000';
const PROD_API_URL = '';  // set when deployed

export const API_BASE_URL = __DEV__ ? DEV_API_URL : PROD_API_URL;
