'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import * as unifiedDB from '@/db/unifiedDB';

export default function UserInitializer({ children }) {
  const { currentUser } = useAuth();
  const [dbInitialized, setDbInitialized] = useState(false);

  useEffect(() => {
    console.log('🔐 Initializing user:', currentUser?.uid);
    if (currentUser?.uid) {
      console.log('🔐 User SET:', currentUser.uid);
      unifiedDB.setCurrentUser(currentUser.uid);
      setDbInitialized(true);
    } else {
      console.log('⚠️ No user - auth required');
      unifiedDB.setCurrentUser(null);
      setDbInitialized(true);
    }
  }, [currentUser]);

  // Don't render children until DB is initialized
  if (!dbInitialized) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 overflow-hidden animate-pulse">
            <img src="/icons/icon-192x192.png" alt="RetireWise" className="w-full h-full" />
          </div>
          <p className="text-gray-600">Initializing...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}