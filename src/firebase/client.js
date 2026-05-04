import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig =
  typeof globalThis.__firebase_config !== 'undefined'
    ? JSON.parse(globalThis.__firebase_config)
    : {
        apiKey: 'AIzaSyBHtWTHEXuSrZBnB4gzh2N7ZvzSVSmjWgg',
        authDomain: 'myweightapp-281cb.firebaseapp.com',
        projectId: 'myweightapp-281cb',
        storageBucket: 'myweightapp-281cb.firebasestorage.app',
        messagingSenderId: '476667742331',
        appId: '1:476667742331:web:09feb9c64766c0c9e1fade',
      };

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const appId =
  typeof globalThis.__app_id !== 'undefined' ? globalThis.__app_id : firebaseConfig.appId || 'default-app-id';
