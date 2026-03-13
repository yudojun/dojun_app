import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDPUVFGs43GqTEpFE2wigA3dNIsrBcn3M4",
  authDomain: "unionapp-27bbd.firebaseapp.com",
  projectId: "unionapp-27bbd",
  storageBucket: "unionapp-27bbd.firebasestorage.app",
  messagingSenderId: "1064412156539",
  appId: "1:1064412156539:web:ffa5db11ea76691e6d08de",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

/**
 * 새 기본 버킷 형식은 PROJECT_ID.firebasestorage.app
 * 웹 SDK에서는 bucket 이름을 명시해서 초기화
 */
export const storage = getStorage(app, "gs://unionapp-27bbd.firebasestorage.app");