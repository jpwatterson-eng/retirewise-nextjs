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


export const registerHealthApp = async (userId: string) => {
  console.log("RegistryController: Starting registration for Health App...");
  const registry = new AppRegistry(userId);
  
  const existingApps = await registry.getApps();
  const isHealthRegistered = existingApps.some(app => app.id === 'health-vitality');
  
  if (isHealthRegistered) {
    console.log("RegistryController: App already exists.");
    return { status: 'already_registered' };
  }

  const healthApp = await registry.registerApp({
    name: "Health & Vitality",
    type: "managed",
    status: "active",
    icon: "🧬",
    description: "Tracks physical performance, recovery, and biological effort.",
    capabilities: ["metric-tracking", "workout-logging", "effort-scoring"],
    metadata: {
      version: "1.0.0",
      syncEnabled: true,
      supportedMetrics: ["cardio", "strength", "recovery", "nutrition"],
      effortEnabled: true
    }
  });

  console.log("RegistryController: Successfully saved to Firestore.");
  return { status: 'success', app: healthApp };
};