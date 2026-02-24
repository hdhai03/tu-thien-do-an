import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCL1P_Jp8l_3L_8j5z476l8y0c72Ufs-t8",
  authDomain: "tuthiendoan.firebaseapp.com",
  projectId: "tuthiendoan",
  storageBucket: "tuthiendoan.firebasestorage.app",
  messagingSenderId: "316849134936",
  appId: "1:316849134936:web:a1be5be1ea2b294e44d92d",
  measurementId: "G-67GFMSQSGK"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);