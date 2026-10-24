import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  onSnapshot,
  getDocFromServer,
  serverTimestamp,
  query,
  where,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { NetworkId } from '../types/tokenlens.ts';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Validate connection to Firestore on boot per skill guidelines
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
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
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Synchronize authenticated user's public profile and isolated PII record in Firestore
export async function syncUserProfileToFirestore(
  user: User,
  providerId: 'google.com' | 'apple.com'
): Promise<void> {
  if (!user.emailVerified) {
    return;
  }

  const userPath = `users/${user.uid}`;
  const userRef = doc(db, 'users', user.uid);

  const safeDisplayName = (user.displayName || user.email?.split('@')[0] || 'TokenLens Analyst')
    .trim()
    .slice(0, 80);
  const safePhotoUrl = (user.photoURL || '').trim().slice(0, 500);

  try {
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      await setDoc(userRef, {
        uid: user.uid,
        displayName: safeDisplayName,
        ...(safePhotoUrl ? { photoURL: safePhotoUrl } : {}),
        authProvider: providerId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Store isolated PII (email) in /users/{userId}/private/info
      if (user.email) {
        const safeEmail = user.email.trim().slice(0, 254);
        const privateRef = doc(db, 'users', user.uid, 'private', 'info');
        try {
          await setDoc(privateRef, {
            uid: user.uid,
            email: safeEmail,
            createdAt: serverTimestamp(),
          });
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `${userPath}/private/info`);
        }
      }
    } else {
      await setDoc(
        userRef,
        {
          uid: user.uid,
          displayName: safeDisplayName,
          ...(safePhotoUrl ? { photoURL: safePhotoUrl } : {}),
          authProvider: snap.data().authProvider || providerId,
          createdAt: snap.data().createdAt,
          updatedAt: serverTimestamp(),
        },
        { merge: false }
      );
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, userPath);
  }
}

export async function signInWithGooglePopup(): Promise<User> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const cred = await signInWithPopup(auth, provider);
  await syncUserProfileToFirestore(cred.user, 'google.com');
  return cred.user;
}

export async function signInWithApplePopup(): Promise<User> {
  const provider = new OAuthProvider('apple.com');
  provider.addScope('email');
  provider.addScope('name');
  const cred = await signInWithPopup(auth, provider);
  await syncUserProfileToFirestore(cred.user, 'apple.com');
  return cred.user;
}

export async function signOutCurrentUser(): Promise<void> {
  await signOut(auth);
}

export function sanitizeBookmarkId(networkId: NetworkId, contractAddress: string): string {
  return `${networkId}_${contractAddress.toLowerCase().replace(/[^a-z0-9_-]/g, '')}`.slice(0, 120);
}

export async function addFirestoreBookmark(
  uid: string,
  networkId: NetworkId,
  contractAddress: string
): Promise<void> {
  const bmId = sanitizeBookmarkId(networkId, contractAddress);
  const path = `users/${uid}/bookmarks/${bmId}`;
  const bmRef = doc(db, 'users', uid, 'bookmarks', bmId);
  const safeAddr = contractAddress.trim().slice(0, 80);

  try {
    await setDoc(bmRef, {
      uid,
      networkId,
      contractAddress: safeAddr,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function removeFirestoreBookmark(
  uid: string,
  networkId: NetworkId,
  contractAddress: string
): Promise<void> {
  const bmId = sanitizeBookmarkId(networkId, contractAddress);
  const path = `users/${uid}/bookmarks/${bmId}`;
  const bmRef = doc(db, 'users', uid, 'bookmarks', bmId);

  try {
    await deleteDoc(bmRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export { onAuthStateChanged, collection, onSnapshot, query, where, firebaseConfig, type User };
