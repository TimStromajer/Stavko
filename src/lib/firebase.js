// src/lib/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { env } from '$env/dynamic/public';

const firebaseConfig = {
  apiKey: env.PUBLIC_FIREBASE_API_KEY,
  authDomain: "stavko-cf3b1.firebaseapp.com",
  projectId: "stavko-cf3b1",
  storageBucket: "stavko-cf3b1.firebasestorage.app",
  messagingSenderId: "246765541976",
  appId: "1:246765541976:web:d07503021dcdc21d41482d",
  measurementId: "G-H2CQ8VGD71"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);