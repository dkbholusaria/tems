import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import 'firebase/compat/storage';
import { firebaseConfig } from './apiKeys';

// =================================================================================
//
//   >>> NOTE: YOUR FIREBASE CONFIG IS NOW IN `services/apiKeys.ts` <<<
//
//   This file now imports its configuration from the new centralized key file.
//   Update your keys there.
//
// =================================================================================


// Initialize Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}


// Export Firebase services
export const auth = firebase.auth();
export const db = firebase.firestore();
export const storage = firebase.storage();
