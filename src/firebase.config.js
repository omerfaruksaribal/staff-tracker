// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";


// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC-19AW38EuPhLyzWo_U7Yrp_fC-pIhVd0",
  authDomain: "staff-tracker-f7b37.firebaseapp.com",
  projectId: "staff-tracker-f7b37",
  storageBucket: "staff-tracker-f7b37.appspot.com",
  messagingSenderId: "331275544864",
  appId: "1:331275544864:web:0bf2fbfab05d88231e0f45"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);


