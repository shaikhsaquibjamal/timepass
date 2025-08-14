
import { initializeApp, getApp,getApps} from "firebase/app";
import { getAuth} from 'firebase/auth';
import {getFirestore} from "firebase/firestore";


const firebaseConfig = {
    apiKey: "AIzaSyAplel4OfNTdRSfdYRsiV8fJzZMH8bHkJU",
    authDomain: "intellihire-4c0d7.firebaseapp.com",
    projectId: "intellihire-4c0d7",
    storageBucket: "intellihire-4c0d7.firebasestorage.app",
    messagingSenderId: "594187231020",
    appId: "1:594187231020:web:ae63688f2bcd3c48e4d689",
    measurementId: "G-CZ7R8NC1HM"
};

// Initialize Firebase
const app =!getApps().length ? initializeApp(firebaseConfig): getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);


