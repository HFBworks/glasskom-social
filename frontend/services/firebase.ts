import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Load configuration from logical_board or environment
const firebaseConfig = {
  apiKey: "AIzaSyDlc6AXSjC3gj1qvFphoiwmnNkKbksXAVg",
  authDomain: "glasskom-social.firebaseapp.com",
  projectId: "glasskom-social",
  storageBucket: "glasskom-social.firebasestorage.app",
  messagingSenderId: "416894628604",
  appId: "1:416894628604:web:c9b1d10f241210c4141d79",
  measurementId: "G-PK09RV95H1"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;