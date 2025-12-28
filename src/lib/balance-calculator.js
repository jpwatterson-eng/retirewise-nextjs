/**
 * Calculate portfolio balance score (0-100) based on deviation from target allocation
 * Uses industry-standard drift calculation with graduated penalty system
 * 
 * @param {Object} actual - Current allocation {builder: 30, contributor: 20, integrator: 35, experimenter: 15}
 * @param {Object} target - Target allocation {builder: 25, contributor: 25, integrator: 25, experimenter: 25}
 * @returns {Object} - {score, drift, deviations, grade, recommendations}
 */
export function calculateBalanceScore(actual, target) {
  const perspectives = ['builder', 'contributor', 'integrator', 'experimenter'];
  
  // Calculate absolute deviations for each perspective
  const deviations = perspectives.map(p => ({
    perspective: p,
    actual: actual[p] || 0,
    target: target[p] || 25,
    deviation: Math.abs((actual[p] || 0) - (target[p] || 25))
  }));
  
  // Industry-standard drift calculation: sum of absolute deviations / 2
  const totalDrift = deviations.reduce((sum, d) => sum + d.deviation, 0) / 2;
  
  // Calculate score with graduated penalties
  let score = 100;
  
  if (totalDrift <= 5) {
    // Excellent: within 5% total drift
    score = 100 - (totalDrift * 2); // Minor penalty: 90-100
  } else if (totalDrift <= 10) {
    // Good: 5-10% drift
    score = 90 - ((totalDrift - 5) * 3); // 75-90
  } else if (totalDrift <= 15) {
    // Needs attention: 10-15% drift
    score = 75 - ((totalDrift - 10) * 3); // 60-75
  } else {
    // Critical: >15% drift
    score = Math.max(0, 60 - ((totalDrift - 15) * 4)); // 0-60
  }
  
  // Grade assignment
  let grade, status;
  if (score >= 90) {
    grade = 'A';
    status = 'Excellent Balance';
  } else if (score >= 75) {
    grade = 'B';
    status = 'Good Balance';
  } else if (score >= 60) {
    grade = 'C';
    status = 'Needs Attention';
  } else {
    grade = 'D';
    status = 'Rebalancing Required';
  }
  
  // Identify problem areas (deviations >10%)
  const problemAreas = deviations
    .filter(d => d.deviation > 10)
    .sort((a, b) => b.deviation - a.deviation);
  
  // Generate recommendations
  const recommendations = [];
  
  if (problemAreas.length > 0) {
    problemAreas.forEach(area => {
      const diff = area.actual - area.target;
      if (diff > 10) {
        recommendations.push({
          type: 'overweight',
          perspective: area.perspective,
          message: `Reduce ${area.perspective} time by ${Math.round(diff)}% (currently ${Math.round(area.actual)}%, target ${Math.round(area.target)}%)`
        });
      } else if (diff < -10) {
        recommendations.push({
          type: 'underweight',
          perspective: area.perspective,
          message: `Increase ${area.perspective} time by ${Math.round(Math.abs(diff))}% (currently ${Math.round(area.actual)}%, target ${Math.round(area.target)}%)`
        });
      }
    });
  }
  
  // Check for extreme concentration (>50% in one perspective)
  const maxPerspective = deviations.reduce((max, d) => 
    d.actual > max.actual ? d : max
  );
  
  if (maxPerspective.actual > 50) {
    recommendations.unshift({
      type: 'concentration_risk',
      perspective: maxPerspective.perspective,
      message: `High concentration risk: ${Math.round(maxPerspective.actual)}% in ${maxPerspective.perspective}. Diversify across perspectives for better balance.`
    });
  }
  
  // Check for missing perspectives (<5%)
  const missingPerspectives = deviations.filter(d => d.actual < 5);
  if (missingPerspectives.length > 0) {
    missingPerspectives.forEach(mp => {
      recommendations.push({
        type: 'missing_perspective',
        perspective: mp.perspective,
        message: `Consider adding ${mp.perspective} activities (currently ${Math.round(mp.actual)}%)`
      });
    });
  }
  
  return {
    score: Math.round(score * 10) / 10, // Round to 1 decimal
    drift: Math.round(totalDrift * 10) / 10,
    grade,
    status,
    deviations,
    recommendations,
    lastCalculated: new Date().toISOString()
  };
}

// Example usage and test cases
console.log('=== Test Case 1: Perfect Balance ===');
const test1 = calculateBalanceScore(
  { builder: 25, contributor: 25, integrator: 25, experimenter: 25 },
  { builder: 25, contributor: 25, integrator: 25, experimenter: 25 }
);
console.log(test1);

console.log('\n=== Test Case 2: Slight Imbalance (Good) ===');
const test2 = calculateBalanceScore(
  { builder: 30, contributor: 23, integrator: 27, experimenter: 20 },
  { builder: 25, contributor: 25, integrator: 25, experimenter: 25 }
);
console.log(test2);

console.log('\n=== Test Case 3: Moderate Imbalance (Needs Attention) ===');
const test3 = calculateBalanceScore(
  { builder: 40, contributor: 20, integrator: 30, experimenter: 10 },
  { builder: 25, contributor: 25, integrator: 25, experimenter: 25 }
);
console.log(test3);

console.log('\n=== Test Case 4: Severe Imbalance (Critical) ===');
const test4 = calculateBalanceScore(
  { builder: 60, contributor: 15, integrator: 20, experimenter: 5 },
  { builder: 25, contributor: 25, integrator: 25, experimenter: 25 }
);
console.log(test4);

console.log('\n=== Test Case 5: Custom Target ===');
const test5 = calculateBalanceScore(
  { builder: 42, contributor: 28, integrator: 20, experimenter: 10 },
  { builder: 40, contributor: 30, integrator: 20, experimenter: 10 }
);
console.log(test5);