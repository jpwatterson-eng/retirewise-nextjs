'use client';

import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import * as unifiedDB from '@/db/unifiedDB';
import { setJournalUserId } from '@/db/journal';

export default function UserInitializer({ children }) {
  const { currentUser } = useAuth();

  useEffect(() => {
    console.log('🔐 Initializing user:', currentUser?.uid);
    if (currentUser) {
      unifiedDB.setCurrentUser(currentUser.uid);
      setJournalUserId(currentUser.uid);
    } else {
      unifiedDB.setCurrentUser(null);
      setJournalUserId(null);
    }
  }, [currentUser]);

  return <>{children}</>;
}