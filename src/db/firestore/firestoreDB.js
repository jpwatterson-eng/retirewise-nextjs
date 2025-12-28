// src/db/firestore/firestoreDB.js
import { 
  collection, 
  doc, 
  addDoc, 
  getDoc, 
  getDocs, 
  setDoc,
  updateDoc, 
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/config/firebase';

// ==================== HELPER FUNCTIONS ====================

// Get user's collection reference
const getUserCollection = (userId, collectionName) => {
  return collection(db, `users/${userId}/${collectionName}`);
};

// Convert Firestore timestamp to ISO string
const timestampToISO = (timestamp) => {
  if (!timestamp) return null;
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate().toISOString();
  }
  return timestamp;
};

// ==================== PROJECTS ====================

export const createProject = async (userId, projectData) => {
  const ref = getUserCollection(userId, 'projects');
  const docRef = await addDoc(ref, {
    ...projectData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  
  console.log('✅ Project created in Firestore:', docRef.id);
  return docRef.id;
};

export const getProjects = async (userId) => {
  const ref = getUserCollection(userId, 'projects');
  const snapshot = await getDocs(ref);
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: timestampToISO(doc.data().createdAt),
    updatedAt: timestampToISO(doc.data().updatedAt),
    lastWorkedAt: timestampToISO(doc.data().lastWorkedAt)
  }));
};

export const getProject = async (userId, projectId) => {
  const ref = doc(db, `users/${userId}/projects/${projectId}`);
  const snapshot = await getDoc(ref);
  
  if (!snapshot.exists()) return null;
  
  return {
    id: snapshot.id,
    ...snapshot.data(),
    createdAt: timestampToISO(snapshot.data().createdAt),
    updatedAt: timestampToISO(snapshot.data().updatedAt),
    lastWorkedAt: timestampToISO(snapshot.data().lastWorkedAt)
  };
};

export const updateProject = async (userId, projectId, updates) => {
  const ref = doc(db, `users/${userId}/projects/${projectId}`);
  await updateDoc(ref, {
    ...updates,
    updatedAt: serverTimestamp()
  });
  
  console.log('✅ Project updated in Firestore:', projectId);
};

export const deleteProject = async (userId, projectId) => {
  const ref = doc(db, `users/${userId}/projects/${projectId}`);
  await deleteDoc(ref);
  
  console.log('✅ Project deleted from Firestore:', projectId);
};

// Real-time listener for projects
export const subscribeToProjects = (userId, callback) => {
  const ref = getUserCollection(userId, 'projects');
  
  return onSnapshot(ref, (snapshot) => {
    const projects = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: timestampToISO(doc.data().createdAt),
      updatedAt: timestampToISO(doc.data().updatedAt),
      lastWorkedAt: timestampToISO(doc.data().lastWorkedAt)
    }));
    
    callback(projects);
  });
};

// ==================== TIME LOGS ====================

export const createTimeLog = async (userId, logData) => {
  const ref = getUserCollection(userId, 'timeLogs');
  const docRef = await addDoc(ref, {
    ...logData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  
  console.log('✅ Time log created in Firestore:', docRef.id);
  return docRef.id;
};

export const getTimeLogs = async (userId, projectId = null) => {
  const ref = getUserCollection(userId, 'timeLogs');
  
  let q;
  if (projectId) {
    q = query(ref, where('projectId', '==', projectId), orderBy('date', 'desc'));
  } else {
    q = query(ref, orderBy('date', 'desc'));
  }
  
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: timestampToISO(doc.data().createdAt),
    updatedAt: timestampToISO(doc.data().updatedAt)
  }));
};

export const updateTimeLog = async (userId, logId, updates) => {
  const ref = doc(db, `users/${userId}/timeLogs/${logId}`);
  await updateDoc(ref, {
    ...updates,
    updatedAt: serverTimestamp()
  });
  
  console.log('✅ Time log updated in Firestore:', logId);
};

export const deleteTimeLog = async (userId, logId) => {
  const ref = doc(db, `users/${userId}/timeLogs/${logId}`);
  await deleteDoc(ref);
  
  console.log('✅ Time log deleted from Firestore:', logId);
};

// ==================== JOURNAL ENTRIES ====================

export const createJournalEntry = async (userId, entryData) => {
  const ref = getUserCollection(userId, 'journalEntries');
  const docRef = await addDoc(ref, {
    ...entryData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  
  console.log('✅ Journal entry created in Firestore:', docRef.id);
  return docRef.id;
};

export const getJournalEntries = async (userId) => {
  const ref = getUserCollection(userId, 'journalEntries');
  const q = query(ref, orderBy('date', 'desc'));
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: timestampToISO(doc.data().createdAt),
    updatedAt: timestampToISO(doc.data().updatedAt)
  }));
};

export const updateJournalEntry = async (userId, entryId, updates) => {
  const ref = doc(db, `users/${userId}/journalEntries/${entryId}`);
  await updateDoc(ref, {
    ...updates,
    updatedAt: serverTimestamp()
  });
  
  console.log('✅ Journal entry updated in Firestore:', entryId);
};

export const deleteJournalEntry = async (userId, entryId) => {
  const ref = doc(db, `users/${userId}/journalEntries/${entryId}`);
  await deleteDoc(ref);
  
  console.log('✅ Journal entry deleted from Firestore:', entryId);
};

// ==================== INSIGHTS ====================


export const createInsight = async (userId, insightData) => {
  const ref = getUserCollection(userId, 'insights');
  const docRef = await addDoc(ref, {
    ...insightData,
    dismissed: false,
    dismissedAt: null,
    dismissReason: null,
    actedOn: false,
    actedOnAt: null,
    userFeedback: null,
    createdAt: serverTimestamp(),
    lastShownAt: serverTimestamp()
  });
  
  console.log('✅ Insight created in Firestore:', docRef.id);
  return docRef.id;
};


export const getInsights = async (userId) => {
  const ref = getUserCollection(userId, 'insights');
  //   const q = query(ref, orderBy('generatedAt', 'desc'));
  const q = query(ref, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: timestampToISO(doc.data().createdAt)
  }));
};

export const updateInsight = async (userId, insightId, updates) => {
  const ref = doc(db, `users/${userId}/insights/${insightId}`);
  await updateDoc(ref, updates);
  
  console.log('✅ Insight updated in Firestore:', insightId);
};

export const deleteInsight = async (userId, insightId) => {
  const ref = doc(db, `users/${userId}/insights/${insightId}`);
  await deleteDoc(ref);
  
  console.log('✅ Insight deleted from Firestore:', insightId);
};

// ==================== CONVERSATIONS (AI Chat) ====================

export const createConversation = async (userId, conversationData) => {
  const ref = getUserCollection(userId, 'conversations');
  const docRef = await addDoc(ref, {
    ...conversationData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  
  console.log('✅ Conversation created in Firestore:', docRef.id);
  return docRef.id;
};

export const getConversations = async (userId) => {
  const ref = getUserCollection(userId, 'conversations');
  const q = query(ref, orderBy('updatedAt', 'desc'));
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: timestampToISO(doc.data().createdAt),
    updatedAt: timestampToISO(doc.data().updatedAt)
  }));
};

export const updateConversation = async (userId, conversationId, updates) => {
  const ref = doc(db, `users/${userId}/conversations/${conversationId}`);
  await updateDoc(ref, {
    ...updates,
    updatedAt: serverTimestamp()
  });
  
  console.log('✅ Conversation updated in Firestore:', conversationId);
};

// Add after updateConversation in firestoreDB.js (around line 250)
export const deleteConversation = async (userId, conversationId) => {
  const ref = doc(db, `users/${userId}/conversations/${conversationId}`);
  await deleteDoc(ref);
  
  console.log('✅ Conversation deleted from Firestore:', conversationId);
};

// ==================== USER PROFILE ====================

export const createUserProfile = async (userId, profileData) => {
  const ref = doc(db, `users/${userId}`);
  await setDoc(ref, {
    ...profileData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  
  console.log('✅ User profile created in Firestore');
};

export const getUserProfile = async (userId) => {
  const ref = doc(db, `users/${userId}`);
  const snapshot = await getDoc(ref);
  
  if (!snapshot.exists()) return null;
  
  return {
    ...snapshot.data(),
    createdAt: timestampToISO(snapshot.data().createdAt),
    updatedAt: timestampToISO(snapshot.data().updatedAt)
  };
};

export const updateUserProfile = async (userId, updates) => {
  const ref = doc(db, `users/${userId}`);
  await updateDoc(ref, {
    ...updates,
    updatedAt: serverTimestamp()
  });
  
  console.log('✅ User profile updated in Firestore');
};

// ==================== PORTFOLIO ====================

export const getPortfolio = async (userId) => {
  const ref = doc(db, `users/${userId}`);
  const snapshot = await getDoc(ref);
  
  if (!snapshot.exists()) return null;
  
  const data = snapshot.data();
  return data.portfolio || null;
};

export const updatePortfolio = async (userId, portfolioData) => {
  const ref = doc(db, `users/${userId}`);
  await setDoc(ref, {
    portfolio: portfolioData,
    updatedAt: serverTimestamp()
  }, { merge: true }); // ← This is the fix
  
  console.log('✅ Portfolio updated in Firestore');
};

export const calculatePortfolioBalance = async (userId) => {
  // Get all projects and time logs
  const projects = await getProjects(userId);
  const timeLogs = await getTimeLogs(userId);
  
  // Calculate time per perspective
  const perspectiveHours = {
    builder: 0,
    contributor: 0,
    integrator: 0,
    experimenter: 0
  };
  
  // Map project IDs to perspectives
  const projectPerspectives = {};
  projects.forEach(p => {
    if (p.perspective) {
      projectPerspectives[p.id] = p.perspective;
    }
  });
  
  // Sum hours by perspective
  timeLogs.forEach(log => {
    const perspective = projectPerspectives[log.projectId];
    if (perspective && perspectiveHours[perspective] !== undefined) {
      perspectiveHours[perspective] += log.duration;
    }
  });
  
  // Calculate percentages
  const totalHours = Object.values(perspectiveHours).reduce((sum, h) => sum + h, 0);
  
  const actualBalance = {
    builder: totalHours > 0 ? (perspectiveHours.builder / totalHours) * 100 : 0,
    contributor: totalHours > 0 ? (perspectiveHours.contributor / totalHours) * 100 : 0,
    integrator: totalHours > 0 ? (perspectiveHours.integrator / totalHours) * 100 : 0,
    experimenter: totalHours > 0 ? (perspectiveHours.experimenter / totalHours) * 100 : 0
  };
  
  return {
    actualBalance,
    totalHours,
    perspectiveHours,
    lastCalculated: new Date().toISOString()
  };
};

export default {
  // Projects
  createProject,
  getProjects,
  getProject,
  updateProject,
  deleteProject,
  subscribeToProjects,
  
  // Time Logs
  createTimeLog,
  getTimeLogs,
  updateTimeLog,
  deleteTimeLog,
  
  // Journal
  createJournalEntry,
  getJournalEntries,
  updateJournalEntry,
  deleteJournalEntry,
  
  // Insights
  createInsight,
  getInsights,
  updateInsight,
  deleteInsight,
  
  // Conversations
  createConversation,
  getConversations,
  updateConversation,
  deleteConversation,
  
  // User Profile
  createUserProfile,
  getUserProfile,
  updateUserProfile,

  // Portfolio
  getPortfolio,
  updatePortfolio,
  calculatePortfolioBalance  
};