// src/utils/migrateProjects.js
import * as unifiedDB from '@/db/unifiedDB';
import { inferPerspectiveFromType } from './perspectiveHelpers';

/**
 * Migrate existing projects to add perspective field
 * This should be run once after deploying the new schema
 */
export const migrateProjectsAddPerspective = async () => {
  console.log('🔄 Starting project perspective migration...');
  
  try {
    const projects = await unifiedDB.getAllProjects();
    
    let migratedCount = 0;
    let skippedCount = 0;
    
    for (const project of projects) {
      // Skip if already has perspective
      if (project.perspective) {
        skippedCount++;
        continue;
      }
      
      // Infer perspective from type
      const perspective = inferPerspectiveFromType(project.type);
      
      // Update project with perspective
      await unifiedDB.updateProject(project.id, {
        perspective,
        perspectiveAlignment: 75 // Default alignment
      });
      
      migratedCount++;
      console.log(`✅ Migrated: ${project.name} → ${perspective}`);
    }
    
    console.log(`
✅ Migration complete!
   Migrated: ${migratedCount}
   Skipped: ${skippedCount}
   Total: ${projects.length}
    `);
    
    return {
      success: true,
      migrated: migratedCount,
      skipped: skippedCount,
      total: projects.length
    };
  } catch (error) {
    console.error('❌ Migration failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Initialize default portfolio settings
 */
export const initializeDefaultPortfolio = async () => {
  console.log('🔄 Initializing default portfolio...');
  
  try {
    const existingPortfolio = await unifiedDB.getPortfolio();
    
    if (existingPortfolio) {
      console.log('ℹ️ Portfolio already exists, skipping initialization');
      return { success: true, skipped: true };
    }
    
    // Create default portfolio with balanced targets
    const defaultPortfolio = {
      targetBalance: {
        builder: 25,
        contributor: 25,
        integrator: 25,
        experimenter: 25
      },
      actualBalance: {
        builder: 0,
        contributor: 0,
        integrator: 0,
        experimenter: 0
      },
      balanceScore: 0,
      lastCalculated: new Date().toISOString(),
      goals: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await unifiedDB.updatePortfolio(defaultPortfolio);
    
    console.log('✅ Default portfolio initialized');
    return { success: true, skipped: false };
  } catch (error) {
    console.error('❌ Portfolio initialization failed:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Run full migration
 */
export const runFullMigration = async () => {
  console.log('🚀 Running full Phase 1 migration...');
  
  const projectMigration = await migrateProjectsAddPerspective();
  const portfolioInit = await initializeDefaultPortfolio();
  
  return {
    projects: projectMigration,
    portfolio: portfolioInit
  };
};