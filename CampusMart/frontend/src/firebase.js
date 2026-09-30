import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyD6AoqlCZhTnl_yGhEGb3TzgvlviXsHMtU",
  authDomain: "campusmart-cf8c2.firebaseapp.com",
  projectId: "campusmart-cf8c2",
  storageBucket: "campusmart-cf8c2.firebasestorage.app",
  messagingSenderId: "1037018188530",
  appId: "1:1037018188530:web:c7fabdf5f1d325d2b79e6b",
  measurementId: "G-KNX8Z5R70C",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);