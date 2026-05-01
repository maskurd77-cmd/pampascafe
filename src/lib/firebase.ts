import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

export const firebaseConfig = {
  apiKey: "AIzaSyCpw15gMLdDRDOWHIhjHeLeSCNZzJOK604",
  authDomain: "pampas-cafe-c587e.firebaseapp.com",
  projectId: "pampas-cafe-c587e",
  storageBucket: "pampas-cafe-c587e.firebasestorage.app",
  messagingSenderId: "850121532596",
  appId: "1:850121532596:web:782da56d137ae49073a3e1",
  measurementId: "G-F4FXPZN9XN"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
