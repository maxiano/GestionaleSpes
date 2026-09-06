import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableMultiTabIndexedDbPersistence } from 'firebase/firestore';
import { firebaseConfig } from '../config/constants';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);

// Enable multi-tab offline persistence safely in browser
if (typeof window !== 'undefined') {
  try {
    enableMultiTabIndexedDbPersistence(db).catch((err) => {
      // In some environments, multiple tabs or private browsing may restrict persistence
      console.warn('Persistenza offline multi-tab:', err.code);
    });
  } catch (e) {
    console.warn('Configurazione persistenza non supportata:', e);
  }
}

export default app;
