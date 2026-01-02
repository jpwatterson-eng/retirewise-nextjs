// types/app-registry.ts

export type AppType = 'core' | 'managed' | 'integrated';
export type AppStatus = 'active' | 'paused' | 'archived';
export type IntegrationStatus = 'connected' | 'disconnected' | 'error';
export type ProjectStatus = 'active' | 'paused' | 'completed';
export type Perspective = 'enjoy' | 'learn' | 'earn' | 'contribute';

export interface App {
  id: string;
  name: string;
  type: AppType;
  status: AppStatus;
  icon: string;
  description: string;
  capabilities: string[];
  createdAt: string;
  lastActive: string;
  metadata: {
    version?: string;
    url?: string;
    apiEndpoint?: string;
    syncEnabled?: boolean;
  };
}

export interface Integration {
  id: string;
  appId: string;
  provider: string;
  status: IntegrationStatus;
  credentials: {
    accessToken: string;
    refreshToken: string;
    expiresAt: string;
  };
  permissions: string[];
  syncConfig: {
    enabled: boolean;
    frequency: number;
    lastSync: string;
    nextSync: string;
  };
  dataMapping: {
    eventToPerspective: Record<string, Perspective>;
    defaultPerspective: Perspective;
  };
  stats: {
    itemsSynced: number;
    lastError?: string;
    errorCount: number;
  };
}

export interface CrossAppProject {
  id: string;
  name: string;
  description: string;
  perspective: Perspective;
  apps: string[];
  status: ProjectStatus;
  balance: {
    enjoy: number;
    learn: number;
    earn: number;
    contribute: number;
  };
  actualBalance: {
    enjoy: number;
    learn: number;
    earn: number;
    contribute: number;
  };
  totalTime: number;
  createdAt: string;
  updatedAt: string;
}

export interface TimeLog {
  id: string;
  appId: string;  // NEW: which app this came from
  projectId: string;
  perspective: Perspective;
  duration: number;
  timestamp: string;
  source: 'manual' | 'quick-log' | 'integrated' | 'imported';
  sourceData?: {
    provider: string;
    externalId: string;
    rawData: any;
  };
  note?: string;
}

export interface ExternalEvent {
  id: string;
  integrationId: string;
  title: string;
  startTime: string;
  endTime: string;
  attendees: string[];
  mappedTo: {
    perspective: Perspective;
    project: string;
    timeLogId?: string;
  };
  syncedAt: string;
  rawData: any;
}

export interface Insight {
  id: string;
  type: 'balance' | 'pattern' | 'recommendation' | 'cross-app';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  sources: string[];
  data: any;
  dismissed: boolean;
  createdAt: string;
  expiresAt?: string;
}