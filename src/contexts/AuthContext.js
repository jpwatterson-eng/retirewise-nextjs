// src/contexts/AuthContext.js
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import { auth } from '@/config/firebase';

const AuthContext = createContext();

// Custom hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Sign up new user
  async function signup(email, password, displayName) {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Set display name
      if (displayName) {
        await updateProfile(userCredential.user, { displayName });
      }
      
      console.log('✅ User created:', userCredential.user.uid);
      return userCredential.user;
    } catch (error) {
      console.error('❌ Signup error:', error);
      setError(error.message);
      throw error;
    }
  }

  // Sign in existing user
  async function login(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log('✅ User logged in:', userCredential.user.uid);
      return userCredential.user;
    } catch (error) {
      console.error('❌ Login error:', error);
      setError(error.message);
      throw error;
    }
  }

  // Sign out
  async function logout() {
    try {
      await signOut(auth);
      console.log('✅ User logged out');
    } catch (error) {
      console.error('❌ Logout error:', error);
      setError(error.message);
      throw error;
    }
  }

  // Reset password
  async function resetPassword(email) {
    try {
      await sendPasswordResetEmail(auth, email);
      console.log('✅ Password reset email sent');
    } catch (error) {
      console.error('❌ Password reset error:', error);
      setError(error.message);
      throw error;
    }
  }

  // Update user profile
  async function updateUserProfile(updates) {
    try {
      await updateProfile(auth.currentUser, updates);
      console.log('✅ Profile updated');
    } catch (error) {
      console.error('❌ Profile update error:', error);
      setError(error.message);
      throw error;
    }
  }

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
      
      if (user) {
        console.log('👤 Auth state: Logged in as', user.email);
      } else {
        console.log('👤 Auth state: Logged out');
      }
    });

    // Cleanup subscription
    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    loading,
    error,
    signup,
    login,
    logout,
    resetPassword,
    updateUserProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export default AuthContext;