import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager,
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
  })
}, firebaseConfig.firestoreDatabaseId);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);
export const loginWithEmail = (email: string, password: string) => signInWithEmailAndPassword(auth, email, password);

export const createFirebaseUser = async (email: string, password: string) => {
  const isDemoMode = localStorage.getItem("demo_user_session") !== null;
  if (isDemoMode) {
    return `demo_uid_${Date.now()}`;
  }
  // Initialize secondary App to prevent logging out the current admin user session
  const secondaryAppName = `temp-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
  const secondaryAuth = getAuth(secondaryApp);
  try {
    const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    return userCredential.user.uid;
  } finally {
    await deleteApp(secondaryApp);
  }
};


