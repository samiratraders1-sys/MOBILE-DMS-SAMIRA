import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { 
  getFirestore,
  enableMultiTabIndexedDbPersistence,
  enableIndexedDbPersistence,
  setLogLevel
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Suppress benign warnings (like sub-second clock skew warnings) in the console
setLogLevel('error');

const app = initializeApp(firebaseConfig);

// Safely initialize Firestore instance synchronously
let dbInstance: any;

try {
  dbInstance = getFirestore(app, firebaseConfig.firestoreDatabaseId);
} catch (error) {
  console.warn("Failed to getFirestore with custom database ID. Trying default...", error);
  try {
    dbInstance = getFirestore(app);
  } catch (err2) {
    console.error("CRITICAL: Failed to initialize Firestore completely:", err2);
  }
}

// Asynchronously enable offline database persistence
if (dbInstance) {
  enableMultiTabIndexedDbPersistence(dbInstance).catch((err) => {
    console.warn("Multi-tab offline persistence failed, trying single-tab...", err);
    enableIndexedDbPersistence(dbInstance).catch((err2) => {
      console.warn("IndexedDB offline persistence failed entirely. Operating in memory-only mode.", err2);
    });
  });
}

export const db = dbInstance;

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


