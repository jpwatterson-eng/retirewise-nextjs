// src/utils/perspectiveHelpers.js

// Perspective definitions
export const PERSPECTIVES = {
  builder: {
    id: 'builder',
    label: 'Builder',
    icon: '🔨',
    color: '#3B82F6',
    description: 'Creating tangible value through products, projects, or businesses',
    examples: 'Building a SaaS, writing a book, creating art'
  },
  contributor: {
    id: 'contributor',
    label: 'Contributor',
    icon: '🤝',
    color: '#10B981',
    description: 'Giving back through teaching, mentoring, or community service',
    examples: 'Mentoring startups, volunteering, teaching courses'
  },
  integrator: {
    id: 'integrator',
    label: 'Integrator',
    icon: '🔄',
    color: '#8B5CF6',
    description: 'Exploring connections between different interests and experiences',
    examples: 'Cross-pollinating ideas, interdisciplinary projects'
  },
  experimenter: {
    id: 'experimenter',
    label: 'Experimenter',
    icon: '🧪',
    color: '#F59E0B',
    description: 'Learning new skills and trying new things without pressure to complete',
    examples: 'Learning languages, trying hobbies, exploring interests'
  }
};

// Map old project types to perspectives (for migration)
export const TYPE_TO_PERSPECTIVE_MAP = {
  building: 'builder',
  consulting: 'contributor',
  learning: 'experimenter',
  contributing: 'contributor',
  wildcard: 'experimenter'
};

// Get perspective config
export const getPerspective = (perspectiveId) => {
  return PERSPECTIVES[perspectiveId] || null;
};

// Get perspective icon
export const getPerspectiveIcon = (perspectiveId) => {
  return PERSPECTIVES[perspectiveId]?.icon || '📋';
};

// Get perspective label
export const getPerspectiveLabel = (perspectiveId) => {
  return PERSPECTIVES[perspectiveId]?.label || 'Unknown';
};

// Get perspective color
export const getPerspectiveColor = (perspectiveId) => {
  return PERSPECTIVES[perspectiveId]?.color || '#6B7280';
};

// Infer perspective from project type (for migration)
export const inferPerspectiveFromType = (projectType) => {
  return TYPE_TO_PERSPECTIVE_MAP[projectType] || 'experimenter';
};

// Get all perspectives as array
export const getAllPerspectives = () => {
  return Object.values(PERSPECTIVES);
};

// Calculate balance score (0-100)
// Higher score = better balance across perspectives
export const calculateBalanceScore = (actualBalance, targetBalance) => {
  if (!targetBalance) {
    // Default: perfect balance = 25% each
    targetBalance = {
      builder: 25,
      contributor: 25,
      integrator: 25,
      experimenter: 25
    };
  }
  
  // Calculate deviation from target
  const deviations = [
    Math.abs(actualBalance.builder - targetBalance.builder),
    Math.abs(actualBalance.contributor - targetBalance.contributor),
    Math.abs(actualBalance.integrator - targetBalance.integrator),
    Math.abs(actualBalance.experimenter - targetBalance.experimenter)
  ];
  
  const totalDeviation = deviations.reduce((sum, d) => sum + d, 0);
  const maxDeviation = 400; // Worst case: 100% deviation on all 4
  
  // Convert to 0-100 score (100 = perfect balance)
  const score = Math.max(0, 100 - (totalDeviation / maxDeviation) * 100);
  
  return Math.round(score);
};

// Get balance status
export const getBalanceStatus = (score) => {
  if (score >= 80) return { label: 'Excellent', color: 'green' };
  if (score >= 60) return { label: 'Good', color: 'blue' };
  if (score >= 40) return { label: 'Fair', color: 'yellow' };
  return { label: 'Needs Work', color: 'red' };
};

// Find underrepresented perspectives
export const getUnderrepresentedPerspectives = (actualBalance, threshold = 15) => {
  return Object.entries(actualBalance)
    .filter(([_, percentage]) => percentage < threshold)
    .map(([perspective, percentage]) => ({
      perspective,
      percentage,
      ...PERSPECTIVES[perspective]
    }));
};

// Find overrepresented perspectives
export const getOverrepresentedPerspectives = (actualBalance, threshold = 50) => {
  return Object.entries(actualBalance)
    .filter(([_, percentage]) => percentage > threshold)
    .map(([perspective, percentage]) => ({
      perspective,
      percentage,
      ...PERSPECTIVES[perspective]
    }));
};