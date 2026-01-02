// lib/appRegistry.ts

import { db } from '@/config/firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where 
} from 'firebase/firestore';
import type { 
  App, 
  Integration, 
  CrossAppProject 
} from '@/types/app-registry';

export class AppRegistry {
  constructor(private userId: string) {}

  // ===== APP MANAGEMENT =====

  /**
   * Register a new app in the registry
   */
  async registerApp(
    app: Omit<App, 'id' | 'createdAt' | 'lastActive'>
  ): Promise<App> {
    const appId = app.name.toLowerCase().replace(/\s+/g, '-');
    const appDoc: App = {
      ...app,
      id: appId,
      createdAt: new Date().toISOString(),
      lastActive: new Date().toISOString(),
    };

    await setDoc(doc(db, `users/${this.userId}/apps/${appId}`), appDoc);
    return appDoc;
  }

  /**
   * Get all registered apps
   */
  async getApps(): Promise<App[]> {
    const appsRef = collection(db, `users/${this.userId}/apps`);
    const snapshot = await getDocs(appsRef);
    return snapshot.docs.map(doc => doc.data() as App);
  }

  /**
   * Get a specific app by ID
   */
  async getApp(appId: string): Promise<App | null> {
    const appDoc = await getDoc(
      doc(db, `users/${this.userId}/apps/${appId}`)
    );
    return appDoc.exists() ? (appDoc.data() as App) : null;
  }

  /**
   * Update app status
   */
  async updateAppStatus(
    appId: string, 
    status: 'active' | 'paused' | 'archived'
  ): Promise<void> {
    await setDoc(
      doc(db, `users/${this.userId}/apps/${appId}`),
      { 
        status, 
        lastActive: new Date().toISOString() 
      },
      { merge: true }
    );
  }

  // ===== INTEGRATION MANAGEMENT =====

  /**
   * Connect a new external integration
   */
  async connectIntegration(
    integration: Omit<Integration, 'id'>
  ): Promise<Integration> {
    const integrationId = `${integration.provider}-${Date.now()}`;
    const integrationDoc: Integration = {
      ...integration,
      id: integrationId,
    };

    await setDoc(
      doc(db, `users/${this.userId}/integrations/${integrationId}`),
      integrationDoc
    );
    return integrationDoc;
  }

  /**
   * Get all integrations for a specific app
   */
  async getIntegrations(appId: string): Promise<Integration[]> {
    const integrationsRef = collection(
      db, 
      `users/${this.userId}/integrations`
    );
    const q = query(integrationsRef, where('appId', '==', appId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as Integration);
  }

  /**
   * Get a specific integration
   */
  async getIntegration(integrationId: string): Promise<Integration | null> {
    const integrationDoc = await getDoc(
      doc(db, `users/${this.userId}/integrations/${integrationId}`)
    );
    return integrationDoc.exists() 
      ? (integrationDoc.data() as Integration) 
      : null;
  }

  /**
   * Update integration sync configuration
   */
  async updateSyncConfig(
    integrationId: string,
    syncConfig: Partial<Integration['syncConfig']>
  ): Promise<void> {
    await setDoc(
      doc(db, `users/${this.userId}/integrations/${integrationId}`),
      { syncConfig },
      { merge: true }
    );
  }

  /**
   * Disconnect an integration
   */
  async disconnectIntegration(integrationId: string): Promise<void> {
    await setDoc(
      doc(db, `users/${this.userId}/integrations/${integrationId}`),
      { 
        status: 'disconnected',
        syncConfig: { enabled: false }
      },
      { merge: true }
    );
  }

  // ===== PROJECT MANAGEMENT =====

  /**
   * Create a new cross-app project
   */
  async createProject(
    project: Omit<
      CrossAppProject, 
      'id' | 'createdAt' | 'updatedAt' | 'actualBalance' | 'totalTime'
    >
  ): Promise<CrossAppProject> {
    const projectId = crypto.randomUUID();
    const projectDoc: CrossAppProject = {
      ...project,
      id: projectId,
      actualBalance: { enjoy: 0, learn: 0, earn: 0, contribute: 0 },
      totalTime: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await setDoc(
      doc(db, `users/${this.userId}/projects/${projectId}`),
      projectDoc
    );
    return projectDoc;
  }

  /**
   * Get all active projects
   */
  async getProjects(): Promise<CrossAppProject[]> {
    const projectsRef = collection(db, `users/${this.userId}/projects`);
    const q = query(projectsRef, where('status', '==', 'active'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as CrossAppProject);
  }

  /**
   * Get a specific project
   */
  async getProject(projectId: string): Promise<CrossAppProject | null> {
    const projectDoc = await getDoc(
      doc(db, `users/${this.userId}/projects/${projectId}`)
    );
    return projectDoc.exists() 
      ? (projectDoc.data() as CrossAppProject) 
      : null;
  }

  /**
   * Update project balance based on time logs
   */
  async updateProjectBalance(
    projectId: string,
    actualBalance: CrossAppProject['actualBalance'],
    totalTime: number
  ): Promise<void> {
    await setDoc(
      doc(db, `users/${this.userId}/projects/${projectId}`),
      {
        actualBalance,
        totalTime,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  }

  /**
   * Update project status
   */
  async updateProjectStatus(
    projectId: string,
    status: 'active' | 'paused' | 'completed'
  ): Promise<void> {
    await setDoc(
      doc(db, `users/${this.userId}/projects/${projectId}`),
      { 
        status, 
        updatedAt: new Date().toISOString() 
      },
      { merge: true }
    );
  }
}