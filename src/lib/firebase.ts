import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, getDocFromServer, serverTimestamp, Timestamp, increment, onSnapshot, updateDoc, collection, addDoc, query, orderBy, limit, getDocs } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export { increment, onSnapshot, updateDoc, collection, addDoc, query, orderBy, limit, getDocs, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider };
export const googleProvider = new GoogleAuthProvider();

// Standard login helper
export const loginWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

export const updateUserProfile = async (displayName: string, photoURL?: string) => {
  if (!auth.currentUser) throw new Error("No user logged in");
  
  // Update Auth Profile
  await updateProfile(auth.currentUser, {
    displayName,
    photoURL
  });

  // Update Firestore Document
  const userDoc = doc(db, 'users', auth.currentUser.uid);
  const snap = await getDoc(userDoc);
  if (snap.exists()) {
    await updateDoc(userDoc, {
      displayName: displayName,
      photoURL: photoURL || null,
      updatedAt: serverTimestamp()
    });
  } else {
    await setDoc(userDoc, {
      displayName: displayName,
      photoURL: photoURL || null,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp()
    });
  }
};

// Error handling as per skill
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Connection test
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error: any) {
    if (error.message?.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}

// Initial connection test
testConnection();
