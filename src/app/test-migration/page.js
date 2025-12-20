'use client';

import { useState } from 'react';

export default function TestMigrationPage() {
  const [result, setResult] = useState(null);
  const [balance, setBalance] = useState(null);
  const [projects, setProjects] = useState(null);
  const [loading, setLoading] = useState(false);

  const runMigration = async () => {
    setLoading(true);
    try {
      const { runFullMigration } = await import('@/utils/migrateProjects');
      const migrationResult = await runFullMigration();
      setResult(migrationResult);
      
      await loadData();
    } catch (error) {
      console.error('Migration error:', error);
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const loadData = async () => {
    try {
      const unifiedDB = await import('@/db/unifiedDB');
      
      const [balanceData, projectsData] = await Promise.all([
        unifiedDB.calculatePortfolioBalance(),
        unifiedDB.getAllProjects()
      ]);
      
      setBalance(balanceData);
      setProjects(projectsData);
    } catch (error) {
      console.error('Load data error:', error);
    }
  };

  const testBalance = async () => {
    await loadData();
  };

  const debugData = async () => {
    const unifiedDB = await import('@/db/unifiedDB');
    
    const projects = await unifiedDB.getAllProjects();
    const timeLogs = await unifiedDB.getAllTimeLogs();
    
    console.log('=== DEBUG DATA ===');
    console.log('Projects:', projects.map(p => ({
      id: p.id,
      name: p.name,
      perspective: p.perspective,
      type: p.type
    })));
    
    console.log('Time Logs:', timeLogs.map(t => ({
      id: t.id,
      projectId: t.projectId,
      duration: t.duration,
      date: t.date
    })));
    
    const projectPerspectives = {};
    projects.forEach(p => {
      if (p.perspective) {
        projectPerspectives[p.id] = p.perspective;
        console.log(`Project ${p.name} (${p.id}) → ${p.perspective}`);
      }
    });
    
    const perspectiveHours = {
      builder: 0,
      contributor: 0,
      integrator: 0,
      experimenter: 0
    };
    
    timeLogs.forEach(log => {
      const perspective = projectPerspectives[log.projectId];
      console.log(`Log for project ${log.projectId} → perspective: ${perspective}, hours: ${log.duration}`);
      if (perspective && perspectiveHours[perspective] !== undefined) {
        perspectiveHours[perspective] += log.duration;
      }
    });
    
    console.log('Calculated perspective hours:', perspectiveHours);
    
    const totalHours = Object.values(perspectiveHours).reduce((sum, h) => sum + h, 0);
    console.log('Total hours:', totalHours);
  };

  const recalculatePortfolio = async () => {
    setLoading(true);
    try {
      const unifiedDB = await import('@/db/unifiedDB');
      
      const balance = await unifiedDB.calculatePortfolioBalance();
      console.log('Fresh calculation:', balance);
      
      let portfolio = await unifiedDB.getPortfolio();
      if (!portfolio) {
        portfolio = {
          targetBalance: {
            builder: 25,
            contributor: 25,
            integrator: 25,
            experimenter: 25
          }
        };
      }
      
      portfolio.actualBalance = balance.actualBalance;
      portfolio.totalHours = balance.totalHours;
      portfolio.perspectiveHours = balance.perspectiveHours;
      portfolio.lastCalculated = balance.lastCalculated;
      portfolio.updatedAt = new Date().toISOString();
      
      await unifiedDB.updatePortfolio(portfolio);
      
      console.log('✅ Portfolio recalculated and saved');
      alert('✅ Portfolio recalculated successfully!');
      
      await loadData();
    } catch (error) {
      console.error('Recalculation error:', error);
      alert('Error recalculating: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const cleanupOrphanedLogs = async () => {
    setLoading(true);
    try {
      const unifiedDB = await import('@/db/unifiedDB');
      
      const projects = await unifiedDB.getAllProjects();
      const timeLogs = await unifiedDB.getAllTimeLogs();
      
      const validProjectIds = new Set(projects.map(p => p.id));
      const orphanedLogs = timeLogs.filter(log => !validProjectIds.has(log.projectId));
      
      console.log('Found orphaned logs:', orphanedLogs.length);
      
      if (orphanedLogs.length === 0) {
        alert('No orphaned logs found! ✅');
        setLoading(false);
        return;
      }
      
      const totalOrphanedHours = orphanedLogs.reduce((sum, log) => sum + log.duration, 0);
      const confirmed = window.confirm(
        `Found ${orphanedLogs.length} orphaned time logs (${totalOrphanedHours.toFixed(1)} hours).\n\n` +
        `These logs belong to deleted projects.\n\n` +
        `Delete these orphaned logs?`
      );
      
      if (!confirmed) {
        console.log('Cleanup cancelled by user');
        setLoading(false);
        return;
      }
      
      for (const log of orphanedLogs) {
        await unifiedDB.deleteTimeLog(log.id);
        console.log('Deleted orphaned log:', log.id);
      }
      
      alert(`✅ Deleted ${orphanedLogs.length} orphaned logs (${totalOrphanedHours.toFixed(1)} hours)`);
      
      await loadData();
    } catch (error) {
      console.error('Cleanup error:', error);
      alert('Error during cleanup: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const reassignOrphanedLogs = async () => {
    setLoading(true);
    try {
      const unifiedDB = await import('@/db/unifiedDB');
      
      const projects = await unifiedDB.getAllProjects();
      const timeLogs = await unifiedDB.getAllTimeLogs();
      
      const validProjectIds = new Set(projects.map(p => p.id));
      const orphanedLogs = timeLogs.filter(log => !validProjectIds.has(log.projectId));
      
      if (orphanedLogs.length === 0) {
        alert('No orphaned logs found! ✅');
        setLoading(false);
        return;
      }
      
      const projectList = projects.map((p, i) => `${i + 1}. ${p.name} (${p.perspective})`).join('\n');
      const selection = prompt(
        `Found ${orphanedLogs.length} orphaned time logs.\n\n` +
        `Which project should they be reassigned to?\n\n` +
        projectList +
        `\n\nEnter number (1-${projects.length}):`
      );
      
      if (!selection) {
        setLoading(false);
        return;
      }
      
      const index = parseInt(selection) - 1;
      if (index < 0 || index >= projects.length) {
        alert('Invalid selection');
        setLoading(false);
        return;
      }
      
      const targetProject = projects[index];
      
      for (const log of orphanedLogs) {
        await unifiedDB.updateTimeLog(log.id, {
          projectId: targetProject.id
        });
        console.log(`Reassigned log ${log.id} to ${targetProject.name}`);
      }
      
      alert(`✅ Reassigned ${orphanedLogs.length} logs to ${targetProject.name}`);
      
      await loadData();
    } catch (error) {
      console.error('Reassign error:', error);
      alert('Error during reassign: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Phase 1 Migration Test</h1>
        
        <div className="space-y-4 mb-8">
          <div className="flex flex-wrap gap-3">
            <button
              onClick={runMigration}
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Running...' : '🚀 Run Full Migration'}
            </button>

            <button
              onClick={testBalance}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              📊 Load Current Data
            </button>

            <button
              onClick={debugData}
              className="px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
            >
              🐛 Debug Data
            </button>

            <button
              onClick={recalculatePortfolio}
              disabled={loading}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              🔄 Recalculate Portfolio
            </button>

            <button
              onClick={cleanupOrphanedLogs}
              disabled={loading}
              className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              🧹 Clean Up Orphaned Logs
            </button>

            <button
              onClick={reassignOrphanedLogs}
              disabled={loading}
              className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
            >
              🔗 Reassign Orphaned Logs
            </button>
          </div>
          
          <p className="text-sm text-gray-600">
            Use these tools to manage your portfolio data migration.
          </p>
        </div>

        {/* Migration Result */}
        {result && (
          <div className="mb-8 p-6 bg-white rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">Migration Result</h2>
            {result.error ? (
              <div className="text-red-600">
                <p className="font-semibold">Error:</p>
                <p>{result.error}</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p>✅ <strong>Projects migrated:</strong> {result.projects?.migrated || 0}</p>
                <p>⏭️ <strong>Projects skipped:</strong> {result.projects?.skipped || 0}</p>
                <p>📊 <strong>Total projects:</strong> {result.projects?.total || 0}</p>
                <p className="mt-4">
                  {result.portfolio?.skipped 
                    ? 'ℹ️ Portfolio already initialized' 
                    : '✅ Portfolio initialized'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Projects List */}
        {projects && (
          <div className="mb-8 p-6 bg-white rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">Projects ({projects.length})</h2>
            <div className="space-y-3">
              {projects.map(project => (
                <div key={project.id} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{project.name}</p>
                      <p className="text-sm text-gray-600">Type: {project.type}</p>
                    </div>
                    <div className="text-right">
                      {project.perspective ? (
                        <>
                          <p className="text-sm font-semibold text-green-600">
                            ✅ {project.perspective}
                          </p>
                          <p className="text-xs text-gray-500">
                            Alignment: {project.perspectiveAlignment}%
                          </p>
                        </>
                      ) : (
                        <p className="text-sm text-red-600">❌ No perspective</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Portfolio Balance */}
        {balance && (
          <div className="p-6 bg-white rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">Portfolio Balance</h2>
            <div className="space-y-3">
              <div>
                <span className="font-semibold">Total Hours Logged:</span> {balance.totalHours.toFixed(1)}
              </div>
              <div>
                <h3 className="font-semibold mb-3 mt-4">Distribution:</h3>
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">🔨 Builder</span>
                      <span className="text-sm font-semibold">{balance.actualBalance.builder.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className="bg-blue-600 h-3 rounded-full transition-all" 
                        style={{ width: `${balance.actualBalance.builder}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      {balance.perspectiveHours.builder.toFixed(1)} hours
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">🤝 Contributor</span>
                      <span className="text-sm font-semibold">{balance.actualBalance.contributor.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className="bg-green-600 h-3 rounded-full transition-all" 
                        style={{ width: `${balance.actualBalance.contributor}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      {balance.perspectiveHours.contributor.toFixed(1)} hours
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">🔄 Integrator</span>
                      <span className="text-sm font-semibold">{balance.actualBalance.integrator.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className="bg-purple-600 h-3 rounded-full transition-all" 
                        style={{ width: `${balance.actualBalance.integrator}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      {balance.perspectiveHours.integrator.toFixed(1)} hours
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">🧪 Experimenter</span>
                      <span className="text-sm font-semibold">{balance.actualBalance.experimenter.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className="bg-orange-600 h-3 rounded-full transition-all" 
                        style={{ width: `${balance.actualBalance.experimenter}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      {balance.perspectiveHours.experimenter.toFixed(1)} hours
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}