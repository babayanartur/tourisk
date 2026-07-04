import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyD6kC9WDtyjfKH9M7zgaR9tEKUnXsXZ16A",
  authDomain: "tourisk-38a61.firebaseapp.com",
  projectId: "tourisk-38a61",
  storageBucket: "tourisk-38a61.firebasestorage.app",
  messagingSenderId: "473299961650",
  appId: "1:473299961650:web:6ab21b782e18198634792b"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);