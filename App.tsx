

import React, { useState, useEffect } from 'react';
// FIX: Removed v9 imports. The 'User' type will be accessed via the firebase namespace.
import firebase from 'firebase/compat/app';
import { auth, db } from './services/firebase';
import { UserMaster, Role } from './types';

import LoginScreen from './components/LoginScreen';
import EmployeeDashboard from './components/EmployeeDashboard';
import EmployerDashboard from './components/EmployerDashboard';
import LoadingSpinner from './components/LoadingSpinner';
import PrivacyPolicy from './components/PrivacyPolicy'; // NEW: Import Privacy Policy
import TermsOfUse from './components/TermsOfUse'; // NEW: Import Terms of Use

// 1. Architecture Diagram (Implemented as component structure)
// This App component acts as the central router based on authentication state and user role.
//
// [User] -> [App.tsx]
//             |
//             +-- (Authenticated) ------> Fetch User Role from Firestore
//             |                         |
//             |                         +-- (Role: 'employee') --> [EmployeeDashboard.tsx]
//             |                         |
//             |                         +-- (Role: 'employer') --> [EmployerDashboard.tsx]
//             |
//             +-- (Not Authenticated) --> Check URL Hash
//                                         |
//                                         +-- (URL hash is #privacy) --> [PrivacyPolicy.tsx]
//                                         |
//                                         +-- (URL hash is #terms) --> [TermsOfUse.tsx]
//                                         |
//                                         +-- (No valid hash) --> [LoginScreen.tsx]


export const App: React.FC = () => {
  // FIX: Updated User type to use firebase.User from the v8 SDK.
  const [user, setUser] = useState<firebase.User | null>(null);
  const [userData, setUserData] = useState<UserMaster | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, forceUpdate] = useState(0); // NEW: State for forcing re-render on hash change

  // NEW: Effect to handle hash-based routing for legal pages
  useEffect(() => {
    const handleHashChange = () => {
      forceUpdate(n => n + 1); // Force a re-render
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);


  useEffect(() => {
    // FIX: Switched from v9 onAuthStateChanged to v8's auth.onAuthStateChanged method.
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        // User is signed in, fetch their role from Firestore
        // FIX: Replaced v9 `doc` and `getDoc` with v8 `collection().doc().get()` syntax.
        const userDocRef = db.collection('UserMaster').doc(firebaseUser.uid);
        const userDocSnap = await userDocRef.get();

        if (userDocSnap.exists) {
          setUserData(userDocSnap.data() as UserMaster);
        } else {
          // FIX: User exists in Auth but not Firestore. Create a profile for them on-the-fly.
          // This resolves the "User data not found" error by ensuring a user record always exists after login.
          console.warn(`User ${firebaseUser.uid} authenticated but not found in Firestore. Creating new profile.`);
          
          const newUser: UserMaster = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || 'no-email@example.com',
            name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'New User',
            role: Role.EMPLOYEE, // Assign a default role for new users
          };

          try {
            // Create the document in Firestore
            await userDocRef.set(newUser);
            setUserData(newUser);
          } catch (error) {
            console.error("Failed to create user profile in Firestore:", error);
            // If creation fails, log them out to prevent a broken state
            auth.signOut();
          }
        }
        setUser(firebaseUser);
      } else {
        // User is signed out
        setUser(null);
        setUserData(null);
        // FIX: The use of `history.replaceState` caused an error in some environments.
        // Switched to the more compatible `window.location.hash` method to clear
        // the URL hash, ensuring unauthenticated users land on the main login page.
        if (window.location.hash) {
          window.location.hash = '';
        }
      }
      setIsLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <LoadingSpinner />
      </div>
    );
  }
  
  // FIX: Prioritize checking for an authenticated user. If the user is logged in,
  // route them to their dashboard immediately, regardless of any URL hash.
  if (user && userData) {
    if (userData.role === Role.EMPLOYEE) {
      return <EmployeeDashboard user={userData} />;
    }
  
    if (userData.role === Role.EMPLOYER) {
      return <EmployerDashboard user={userData} />;
    }
  }

  // If the user is not authenticated, then check the URL hash for legal pages.
  const page = window.location.hash;
  if (page === '#privacy') {
    return <PrivacyPolicy />;
  }
  if (page === '#terms') {
    return <TermsOfUse />;
  }
  
  // The default for any unauthenticated user is the login screen.
  return <LoginScreen />;
};