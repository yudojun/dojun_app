import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDPUVFGs43GqTEpFE2wigA3dNIsrBcn3M4",
  authDomain: "unionapp-27bbd.firebaseapp.com",
  projectId: "unionapp-27bbd",
  storageBucket: "unionapp-27bbd.firebasestorage.app",
  messagingSenderId: "1064412156539",
  appId: "1:1064412156539:web:ffa5db11ea76691e6d08de"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);