import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAPBsGs4HUCdQLnHc4FORHl3-bvewIJQ0Q",
  authDomain: "movie-meet-1a81b.firebaseapp.com",
  projectId: "movie-meet-1a81b",
  storageBucket: "movie-meet-1a81b.appspot.com",
  messagingSenderId: "630457152160",
  appId: "1:630457152160:web:bf481c5ada091a5e608fc5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const db = getFirestore(app);
export const auth = getAuth(app);

export default app; 