// lib/registryController.ts
import { AppRegistry } from './appRegistry';

export const initializeCoreRegistry = async (userId: string) => {
  const registry = new AppRegistry(userId);
  
  // 1. Safety Check: Checking if already registered to prevent duplicates
  const existingApps = await registry.getApps();
  const isRegistered = existingApps.some(app => app.id === 'retirewise-core');
  
  if (isRegistered) return { status: 'already_registered' };

  // 2. Execution: Registering the Core Hub
  const coreApp = await registry.registerApp({
    name: "RetireWise Core",
    type: "core",
    status: "active",
    icon: "🌓",
    description: "Primary orchestration hub for life-portfolio management.",
    capabilities: ["portfolio-tracking", "ai-synthesis", "weekly-goals"],
    metadata: {
      version: "1.0.0",
      syncEnabled: true,
      url: typeof window !== 'undefined' ? window.location.origin : ''
    }
  });

  return { status: 'success', app: coreApp };
};