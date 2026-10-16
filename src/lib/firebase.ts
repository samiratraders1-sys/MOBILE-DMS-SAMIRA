import { initializeApp, deleteApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { 
  getFirestore,
  setLogLevel,
  doc,
  getDocFromServer
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Suppress benign warnings in the console
try {
  setLogLevel('error');
} catch (e) {
  // ignore
}

export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore with designated database ID (CRITICAL as specified by Firebase skill)
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || undefined);

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
  } catch (err: any) {
    if (err.code === "auth/operation-not-allowed" || err.message?.includes("operation-not-allowed")) {
      console.warn("Email/Password Auth is disabled in Firebase console. Generating local UID instead.");
      return `local_uid_${Date.now()}`;
    }
    throw err;
  } finally {
    await deleteApp(secondaryApp);
  }
};

// Validate Firestore connection non-blockingly on boot
if (typeof window !== 'undefined' && db) {
  (async () => {
    try {
      await getDocFromServer(doc(db, 'test', 'connection'));
    } catch (error) {
      if (error instanceof Error && error.message.includes('the client is offline')) {
        console.error("Please check your Firebase configuration.");
      }
    }
  })();
}
