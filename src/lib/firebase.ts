import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';

// REMINDER: Create a .env.local file in the root of your project and add your Firebase and Google Maps API keys:
// NEXT_PUBLIC_FIREBASE_API_KEY="YOUR_API_KEY"
// NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="YOUR_AUTH_DOMAIN"
// NEXT_PUBLIC_FIREBASE_PROJECT_ID="YOUR_PROJECT_ID"
// NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="YOUR_STORAGE_BUCKET"
// NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="YOUR_MESSAGING_SENDER_ID"
// NEXT_PUBLIC_FIREBASE_APP_ID="YOUR_APP_ID"
// NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="YOUR_GOOGLE_MAPS_API_KEY"

const firebaseConfig = {
  apiKey: "AIzaSyCnjI1sLDgAztoY26IdRMPqATARoD9qHuM",
  authDomain: "chronotrack-u10nt.firebaseapp.com",
  projectId: "chronotrack-u10nt",
  storageBucket: "chronotrack-u10nt.firebasestorage.app",
  messagingSenderId: "125029841927",
  appId: "1:125029841927:web:97a624246dba73d9437ea2",
};

let app: FirebaseApp;
let db: Firestore;

if (typeof window !== 'undefined' && getApps().length === 0) {
  if (firebaseConfig.apiKey && firebaseConfig.projectId) {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
  } else {
    console.warn(
      'Firebase configuration is missing. Please set the required environment variables.'
    );
    // Fallback or error handling for missing config might be needed depending on app requirements
  }
} else if (typeof window !== 'undefined') {
  app = getApps()[0];
  db = getFirestore(app);
}

// Exporting potentially undefined app and db, components should handle this.
// @ts-ignore app might be uninitialized
export { app, db };
