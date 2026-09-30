import {
  initializeApp,
  getApp,
  getApps,
} from "firebase/app";

import { getAuth } from "firebase/auth";

import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey:
    "AIzaSyD6AoqlCZhTnl_yGhEGb3TzgvlviXsHMtU",

  authDomain:
    "campusmart-cf8c2.firebaseapp.com",

  projectId:
    "campusmart-cf8c2",

  storageBucket:
    "campusmart-cf8c2.firebasestorage.app",

  messagingSenderId:
    "1037018188530",

  appId:
    "1:1037018188530:web:c7fabdf5f1d325d2b79e6b",

  measurementId:
    "G-KNX8Z5R70C",
};

const app =
  getApps().length > 0
    ? getApp()
    : initializeApp(firebaseConfig);

export const auth = getAuth(app);

let firestoreDatabase;

try {
  /*
   * Firestore data device ke IndexedDB storage
   * mein save rahega.
   *
   * Website ke multiple tabs aur Android WebView
   * dono ke liye shared persistent cache.
   */
  firestoreDatabase = initializeFirestore(
    app,
    {
      localCache: persistentLocalCache({
        tabManager:
          persistentMultipleTabManager(),
      }),
    }
  );
} catch (error) {
  /*
   * Vite hot reload ya already initialized
   * Firestore ke case mein existing instance.
   */
  console.warn(
    "Using existing Firestore instance:",
    error
  );

  firestoreDatabase =
    getFirestore(app);
}

export const db =
  firestoreDatabase;