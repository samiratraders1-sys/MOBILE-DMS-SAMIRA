import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword } from 'firebase/auth';
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  doc, 
  getDocFromServer,
  setLogLevel
} from 'firebase/firestore';
import 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Suppress benign warnings (like sub-second clock skew warnings) in the console
setLogLevel('error');

const app = initializeApp(firebaseConfig);

// Initialize Firestore synchronously with HTML5 IndexedDB Cache (persistentLocalCache)
// This fully enables multi-tab offline database synchronization and guarantees offline resilience.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  }),
  experimentalForceLongPolling: true
}, firebaseConfig.firestoreDatabaseId);

// CRITICAL CONSTRAINT: Test connection on boot
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    } else {
      console.error("Firebase connection test failed:", error);
    }
  }
}
testConnection();

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);
export const loginWithEmail = (email: string, password: string) => signInWithEmailAndPassword(auth, email, password);


