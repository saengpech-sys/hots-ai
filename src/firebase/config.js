import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore'
import { getFunctions } from 'firebase/functions'

const firebaseConfig = {
  apiKey: "AIzaSyCJe8F0cLfeWlCgeiGGcuJARrCWJbyTuT8",
  authDomain: "hots-ai-d028b.firebaseapp.com",
  projectId: "hots-ai-d028b",
  storageBucket: "hots-ai-d028b.firebasestorage.app",
  messagingSenderId: "615959578120",
  appId: "1:615959578120:web:90cc7f9c28c8fc9d98f3bd",
  measurementId: "G-Q0SFRBQNP8"
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Initialize services
export const auth = getAuth(app)
export const db = getFirestore(app)

// Enable Offline Persistence
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code == 'failed-precondition') {
    console.warn('Multiple tabs open, persistence can only be enabled in one tab at a a time.')
  } else if (err.code == 'unimplemented') {
    console.warn('The current browser does not support all of the features required to enable persistence')
  }
})

export const functions = getFunctions(app)
export const googleProvider = new GoogleAuthProvider()

// Configure Google Provider
googleProvider.setCustomParameters({
  prompt: 'select_account'
})

export default app
