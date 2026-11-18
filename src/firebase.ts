import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  Auth,
} from 'firebase/auth';
import {
  Firestore,
  FirestoreSettings,
  doc,
  enableNetwork,
  getDocFromServer,
  getFirestore,
  initializeFirestore,
  memoryLocalCache,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

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

const app: FirebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth: Auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

const isBrowser = typeof window !== 'undefined';
const baseFirestoreSettings: FirestoreSettings = {
  ignoreUndefinedProperties: true,
  ...(isBrowser
    ? {
        experimentalForceLongPolling: true,
        experimentalLongPollingOptions: { timeoutSeconds: 10 },
      }
    : {}),
};

const configuredDbId =
  firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
    ? firebaseConfig.firestoreDatabaseId
    : undefined;

let firestoreInstance: Firestore;
try {
  firestoreInstance = configuredDbId
    ? initializeFirestore(
        app,
        {
          ...baseFirestoreSettings,
          localCache: persistentLocalCache({
            tabManager: persistentMultipleTabManager(),
          }),
        },
        configuredDbId
      )
    : initializeFirestore(app, {
        ...baseFirestoreSettings,
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
        }),
      });
} catch {
  try {
    firestoreInstance = configuredDbId
      ? initializeFirestore(
          app,
          {
            ...baseFirestoreSettings,
            localCache: memoryLocalCache(),
          },
          configuredDbId
        )
      : initializeFirestore(app, {
          ...baseFirestoreSettings,
          localCache: memoryLocalCache(),
        });
  } catch {
    firestoreInstance = configuredDbId
      ? getFirestore(app, configuredDbId)
      : getFirestore(app);
  }
}

export const firestoreDb: Firestore = firestoreInstance;

export function formatFirebaseErrorMessage(error: unknown, lang: 'uz' | 'ru' = 'uz'): string {
  const raw = error instanceof Error ? error.message : String(error || '');
  const low = raw.toLowerCase();

  if (low.includes('auth/unauthorized-domain')) {
    return lang === 'ru'
      ? 'Этот домен не разрешен в Firebase Authentication (Authorized domains).'
      : "Ushbu domen Firebase Authentication (Authorized domains) ro'yxatiga qo'shilmagan.";
  }
  if (low.includes('auth/operation-not-allowed')) {
    return lang === 'ru'
      ? 'Вход через Google не включен в Firebase Console.'
      : 'Firebase Console da Google orqali kirish (Sign-in method) yoqilmagan.';
  }
  if (low.includes('auth/popup-blocked')) {
    return lang === 'ru'
      ? 'Браузер заблокировал всплывающее окно Google.'
      : "Brauzer Google kirish oynasini blokladi. Qalqib chiquvchi oynalarga ruxsat bering.";
  }
  if (low.includes('auth/popup-closed-by-user')) {
    return lang === 'ru'
      ? 'Окно входа Google было закрыто.'
      : 'Google kirish oynasi yopildi.';
  }
  if (low.includes('auth/network-request-failed') || low.includes('the client is offline') || low.includes('unavailable')) {
    return lang === 'ru'
      ? 'Нет связи с сервером Firebase. Изменения сохраняются локально и синхронизируются при восстановлении сети.'
      : "Firebase serveri bilan aloqa uzildi. O'zgarishlar qurilmada saqlanmoqda va internet tiklanganda sinxronlanadi.";
  }
  if (low.includes('permission-denied') || low.includes('missing or insufficient permissions')) {
    return lang === 'ru'
      ? 'Нет прав доступа к Cloud Firestore. Проверьте правила безопасности или приглашение сотрудника.'
      : "Cloud Firestore ruxsati yetarli emas. Xodimlar ro'yxatidagi Google emailingizni yoki Firestore Rules ni tekshiring.";
  }
  if (low.includes('resource-exhausted') || low.includes('quota')) {
    return lang === 'ru'
      ? 'Превышена квота Firebase. Попробуйте позже.'
      : 'Firebase kvotasi tugadi. Keyinroq qayta urinib ko‘ring.';
  }
  if (low.includes('failed-precondition') || low.includes('database') && low.includes('not found')) {
    return lang === 'ru'
      ? 'База данных Cloud Firestore еще не создана или не настроена.'
      : "Cloud Firestore ma'lumotlar bazasi hali yaratilmagan yoki sozlanmagan.";
  }

  return raw || (lang === 'ru' ? 'Ошибка подключения к Firebase' : 'Firebase bilan ishlashda xatolik yuz berdi');
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
  const serialized = JSON.stringify(errInfo);
  console.error('Firestore Error: ', serialized);
  throw new Error(serialized);
}

export async function ensureFirestoreNetwork(): Promise<void> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
  try {
    await enableNetwork(firestoreDb);
  } catch {
    // ignore transient enableNetwork issues
  }
}

let testedForUid: string | null | undefined = undefined;
let lastConnectionOk = false;

function isConnectionFailure(error: unknown): boolean {
  const raw = error instanceof Error ? error.message : String(error || '');
  const low = raw.toLowerCase();
  return (
    low.includes('permission-denied') ||
    low.includes('missing or insufficient permissions') ||
    low.includes('permission') ||
    low.includes('the client is offline') ||
    low.includes('client is offline') ||
    low.includes('unavailable') ||
    low.includes('failed-precondition') ||
    low.includes('not-found') ||
    low.includes('unauthenticated')
  );
}

export async function testConnection(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    lastConnectionOk = false;
    return false;
  }

  const currentUid = auth.currentUser?.uid ?? null;
  if (lastConnectionOk && testedForUid === currentUid) {
    return true;
  }

  // /test/connection rule requires isSignedIn() — without an authenticated user it cannot pass Firestore checks
  if (!auth.currentUser) {
    lastConnectionOk = false;
    testedForUid = null;
    return false;
  }

  const probe = async () => {
    await ensureFirestoreNetwork();
    await getDocFromServer(doc(firestoreDb, 'test', 'connection'));
  };

  try {
    await probe();
    testedForUid = currentUid;
    lastConnectionOk = true;
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error || '');
    if (msg.toLowerCase().includes('the client is offline')) {
      await new Promise((r) => setTimeout(r, 1200));
      try {
        await probe();
        testedForUid = currentUid;
        lastConnectionOk = true;
        return true;
      } catch (retryErr) {
        lastConnectionOk = false;
        testedForUid = currentUid;
        console.error('Firestore connection test failed:', retryErr);
        return false;
      }
    }
    if (isConnectionFailure(error)) {
      lastConnectionOk = false;
      testedForUid = currentUid;
      console.warn('Firestore connection check rejected:', msg);
      return false;
    }
    lastConnectionOk = false;
    testedForUid = currentUid;
    console.warn('Firestore connection check error:', msg);
    return false;
  }
}

export async function probeFirestoreConnection(workspaceId?: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return false;
  }
  if (!auth.currentUser) {
    return false;
  }
  try {
    await ensureFirestoreNetwork();
    const targetRef = workspaceId
      ? doc(firestoreDb, 'workspaces', workspaceId)
      : doc(firestoreDb, 'test', 'connection');
    await getDocFromServer(targetRef);
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error || '');
    console.warn('Firestore server probe failed:', msg);
    return false;
  }
}

export async function signInWithGooglePopup(): Promise<FirebaseUser> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function signOutFirebase(): Promise<void> {
  try {
    await signOut(auth);
  } catch {
    // ignore signout network issues
  }
}

export function watchAuthState(cb: (user: FirebaseUser | null) => void): () => void {
  return onAuthStateChanged(auth, cb);
}
