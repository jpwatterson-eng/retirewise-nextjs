"use client";

import { useState, useEffect, useMemo } from "react";
import { Activity } from "lucide-react";
import { auth, db } from "@/config/firebase";
import {
  collection,
  addDoc,
  setDoc,
  doc,
  Timestamp,
  increment,
  updateDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  where,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import Link from "next/link";
import WorkoutLogger from "@/components/health/WorkoutLogger";
import MetricLogger from "@/components/health/MetricLogger";
import { PROJECT_IDS } from "@/config/constants";

interface HealthMetric {
  id: string;
  type: "Weight" | "RHR"; // or string if you want it more flexible
  value: number;
  unit: string;
  timestamp: Date;
}

export default function HealthAppPage() {
  const [activeUser, setActiveUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showWorkoutLogger, setShowWorkoutLogger] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [projectGoal, setProjectGoal] = useState(20); // Default to your 20h target
  const [currentHours, setCurrentHours] = useState(0);
  const [weeklyQuota, setWeeklyQuota] = useState(7); // Default to 7h/week
  const [currentHoursThisWeek, setCurrentHoursThisWeek] = useState(0);
  const [latestWeight, setLatestWeight] = useState<number | null>(null);
  const [recentLogs, setRecentLogs] = useState([]);
  const [showMetricLogger, setShowMetricLogger] = useState(false);
  const [weightTrend, setWeightTrend] = useState<{
    delta: number;
    text: string;
  } | null>(null);
  const [latestRHR, setLatestRHR] = useState<number | null>(null);
  const [view, setView] = useState<"activity" | "metrics">("activity");
  const [metrics, setMetrics] = useState<any[]>([]);

  // Calculate real stats from the logs array
  const stats = useMemo(() => {
    if (logs.length === 0)
      return { avgEffort: 0, totalLogs: 0, readiness: 100 };

    const recentLog = logs[0];
    const avgEffort =
      logs.reduce((acc, l) => acc + (l.effort || 0), 0) / logs.length;

    // Use the timestamp of the latest log instead of Date.now()
    // to keep the function "Pure" for React's engine
    const anchorTime = new Date(recentLog.timestamp).getTime();
    const fortyEightHoursBeforeLastLog = new Date(
      anchorTime - 48 * 60 * 60 * 1000,
    );

    let readiness = 95;

    // Penalty 1: High Effort Fatigue
    if (recentLog.effort >= 8) readiness -= 15;

    // Penalty 2: Volume Spikes (Based on the 48h window leading up to latest log)
    const recentVolume = logs.filter(
      (l) => new Date(l.timestamp) > fortyEightHoursBeforeLastLog,
    ).length;

    if (recentVolume >= 3) readiness -= 10;

    // Bonus: Consistency
    if (logs.length >= 4) readiness += 5;

    return {
      avgEffort: avgEffort.toFixed(1),
      totalLogs: logs.length,
      readiness: Math.min(100, Math.max(20, readiness)),
    };
  }, [logs]); // Only recalculates when the 'logs' array updates

  const coachStatus = useMemo(() => {
    const score = stats.readiness;

    // RHR Sensitivity Logic
    const rhrAlert =
      latestRHR && logs.length > 0
        ? (() => {
            // Simple average of RHR from recent metrics for baseline
            // In a full build, we'd store a 'baselineRHR' in the project doc
            const baselineRHR = 62; // Replace with your known healthy baseline if desired
            const deviation = ((latestRHR - baselineRHR) / baselineRHR) * 100;
            return deviation > 5; // Alert if 5% above baseline
          })()
        : false;

    if (rhrAlert)
      return {
        msg: "System Alert: Elevated RHR detected. Prioritize sleep and hydration. Low intensity only.",
        color: "text-amber-300",
        icon: "⚠️",
      };

    if (score >= 90)
      return {
        msg: "System Optimal. Prime day for high-intensity or PR attempts.",
        color: "text-emerald-300",
        icon: "🔥",
      };

    // ... rest of your existing logic (75, 60, etc.)
    if (score >= 75)
      return {
        msg: "Good to go. Maintain momentum with a steady-state session.",
        color: "text-blue-200",
        icon: "⚡",
      };

    return {
      msg: "Recovery required. High risk of overtraining. Rest today.",
      color: "text-red-200",
      icon: "🛑",
    };
  }, [stats.readiness, latestRHR]);

  const hoursThisWeek = useMemo(() => {
    if (logs.length === 0) return 0;

    const now = new Date();
    // Set to last Sunday at 00:00:00
    const startOfThisWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    startOfThisWeek.setHours(0, 0, 0, 0);

    const weeklyLogs = logs.filter(
      (log) => new Date(log.timestamp) >= startOfThisWeek,
    );

    const totalMinutes = weeklyLogs.reduce(
      (acc, log) => acc + (log.duration || 0),
      0,
    );

    return parseFloat((totalMinutes / 60).toFixed(1));
  }, [logs]);

  useEffect(() => {
    if (!activeUser?.uid) return;

    const q = query(
      collection(db, `users/${activeUser.uid}/health_logs`),
      orderBy("timestamp", "desc"),
      limit(20), // Increased limit to ensure we catch the whole week
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedLogs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setLogs(fetchedLogs);
      setLoadingLogs(false);
    });

    return () => unsubscribe();
  }, [activeUser?.uid]);

  useEffect(() => {
    if (!activeUser) return;

    const projectRef = doc(
      db,
      `users/${activeUser.uid}/projects/${PROJECT_IDS.HEALTH}`,
    );

    const unsubscribe = onSnapshot(projectRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        // Logic: Use weeklyQuota if set, otherwise maybe projectTarget / 50, else default 7
        const quota =
          data.weeklyQuota || (data.targetHours ? data.targetHours / 50 : 7);
        setWeeklyQuota(quota);
      }
    });

    return () => unsubscribe();
  }, [activeUser]);

  // Fetch the most multiple metrics

  useEffect(() => {
    if (!activeUser?.uid) return;

    // Fetch the last 30 entries to cover a full month of history
    const q = query(
      collection(db, `users/${activeUser.uid}/health_metrics`),
      orderBy("timestamp", "desc"),
      limit(30),
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedMetrics = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          type: data.type,
          value: data.value,
          unit: data.unit,
          timestamp: data.timestamp?.toDate() || new Date(),
        } as HealthMetric; // This is the key "cast"
      });

      setMetrics(fetchedMetrics);

      // 1. Extract Latest Values
      const latestW = fetchedMetrics.find((m) => m.type === "Weight");
      const latestR = fetchedMetrics.find((m) => m.type === "RHR");

      if (latestW) setLatestWeight(latestW.value);
      if (latestR) setLatestRHR(latestR.value);

      // 2. Calculate Weight Trend (Compare latest weight to the one before it)
      const weightHistory = fetchedMetrics.filter((m) => m.type === "Weight");
      if (weightHistory.length >= 2) {
        const current = weightHistory[0].value;
        const previous = weightHistory[1].value;
        const diff = current - previous;

        setWeightTrend({
          delta: diff,
          text: diff > 0 ? `+${diff.toFixed(1)}kg` : `${diff.toFixed(1)}kg`,
        });
      }
    });

    return () => unsubscribe();
  }, [activeUser?.uid]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setActiveUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSaveWorkout = async (workoutData: any) => {
    if (!activeUser) return;

    // ✨ Move these ABOVE the try block to fix the "Red Squiggles"
    const defaultProjectId = PROJECT_IDS.HEALTH;
    const projectName = "Health & Vitality";
    const decimalHours = parseFloat((workoutData.duration / 60).toFixed(2));
    const now = new Date();
    const isoString = now.toISOString();

    try {
      // 1. Save detailed Health Log
      await addDoc(collection(db, `users/${activeUser.uid}/health_logs`), {
        ...workoutData,
        appId: "health-vitality",
        createdAt: isoString,
      });

      // 2. Sync to the Hub timeLogs
      await addDoc(collection(db, `users/${activeUser.uid}/timeLogs`), {
        userId: activeUser.uid,
        projectId: defaultProjectId,
        projectName: projectName,
        duration: decimalHours,
        perspective: "integrator",
        timestamp: Timestamp.now(),
        date: isoString,
        createdAt: isoString,
        updatedAt: isoString,
        notes: `${workoutData.type}: ${workoutData.note}`,
        source: "managed-app",
        sourceApp: "health-vitality",
      });

      // 3. Increment the Project Totals
      const projectRef = doc(
        db,
        `users/${activeUser.uid}/projects/${defaultProjectId}`,
      );
      await updateDoc(projectRef, {
        totalHoursLogged: increment(decimalHours),
        lastLoggedAt: isoString,
        updatedAt: isoString,
      });

      setShowWorkoutLogger(false);
    } catch (error) {
      // Now these variables are in scope!
      console.error("Sync error, attempting project initialization...");
      const projectRef = doc(
        db,
        `users/${activeUser.uid}/projects/${defaultProjectId}`,
      );
      await setDoc(
        projectRef,
        {
          id: defaultProjectId,
          name: projectName,
          perspective: "integrator",
          status: "active",
          totalHoursLogged: decimalHours,
          updatedAt: isoString,
        },
        { merge: true },
      );

      setShowWorkoutLogger(false);
    }
  };

  const handleSaveMetric = async (metricData: {
    type: string;
    value: number;
    unit: string;
  }) => {
    if (!activeUser) return;
    const now = new Date();

    try {
      // 1. Save to the historical health_metrics collection
      await addDoc(collection(db, `users/${activeUser.uid}/health_metrics`), {
        ...metricData,
        timestamp: Timestamp.now(),
        date: now.toISOString().split("T")[0],
      });

      // 2. GLOBAL SYNC: Update the Project Document
      // This allows the main Hub to display your latest weight/RHR
      const projectRef = doc(
        db,
        `users/${activeUser.uid}/projects/${PROJECT_IDS.HEALTH}`,
      );

      const projectUpdate: any = {};
      if (metricData.type === "Weight") {
        projectUpdate.latestWeight = metricData.value;
        projectUpdate.lastWeightUpdate = Timestamp.now();
      } else if (metricData.type === "RHR") {
        projectUpdate.latestRHR = metricData.value; // Ensure RHR is also synced to the project
      }

      if (Object.keys(projectUpdate).length > 0) {
        await updateDoc(projectRef, projectUpdate);
      }

      // 3. Update the User Profile for a global "Vitality" score
      const userRef = doc(db, `users/${activeUser.uid}`);
      await updateDoc(userRef, {
        [`biometrics.${metricData.type.toLowerCase()}`]: metricData.value,
        lastSeen: Timestamp.now(),
      });

      setShowMetricLogger(false);
    } catch (error) {
      console.error("Error in Global Sync:", error);
    }
  };

  if (loading)
    return <div className="p-10 text-center">Loading Health System...</div>;

  return (
    <main className="min-h-screen bg-slate-50 pb-20">
      {/* HEADER */}
      <header className="p-6 bg-white border-b border-slate-100 flex justify-between items-center">
        <div>
          <Link
            href="/"
            className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-1 block"
          >
            ← Back to Hub
          </Link>
          <h1 className="text-2xl font-black text-slate-900">
            Health & Vitality
          </h1>
        </div>
        <div className="bg-blue-50 p-3 rounded-2xl text-xl">🧬</div>
      </header>

      {/* VITALITY HEADER */}
      <section className="px-6 pt-6 pb-6">
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[3rem] p-8 text-white shadow-2xl relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-8">
              <div>
                <p className="text-blue-100 text-[10px] font-black uppercase tracking-[0.2em] mb-1">
                  System Readiness
                </p>
                <h1 className="text-4xl font-black italic tracking-tighter">
                  {stats.readiness}%
                </h1>
                {/* ✨ THE COACH MESSAGE */}
                <div className="mt-4 flex items-start gap-2 max-w-[240px]">
                  <span className="text-sm">{coachStatus.icon}</span>
                  <p
                    className={`text-[11px] font-bold leading-tight ${coachStatus.color}`}
                  >
                    {coachStatus.msg}
                  </p>
                </div>
              </div>
              <div className="bg-white/20 backdrop-blur-md p-3 rounded-2xl">
                <Activity size={24} className="text-white" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
                <p className="text-blue-100 text-[8px] font-black uppercase mb-1">
                  Avg Effort
                </p>
                <div className="flex items-baseline gap-2">
                  <p className="text-xl font-black italic">{stats.avgEffort}</p>
                  {/* Trend Arrow */}
                  <span
                    className={`text-[10px] font-bold ${Number(stats.avgEffort) > 5 ? "text-emerald-300" : "text-blue-200"}`}
                  >
                    {Number(stats.avgEffort) > 5 ? "↑" : "→"}
                  </span>
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
                <p className="text-blue-100 text-[8px] font-black uppercase mb-1">
                  Logs (Week)
                </p>
                <p className="text-xl font-black italic">{stats.totalLogs}</p>
              </div>
            </div>
          </div>

          {/* Decorative background element */}
          <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
        </div>
      </section>

      {/* WEEKLY PROGRESS BAR - UPDATED TO USE WEEKLY LOGIC */}
      <section className="px-6 mb-8">
        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-50">
          <div className="flex justify-between items-end mb-4">
            <div>
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">
                Weekly Target
              </p>
              <h3 className="text-xl font-black italic text-slate-900">
                {hoursThisWeek.toFixed(1)}{" "}
                <span className="text-slate-300 text-sm">/ {weeklyQuota}h</span>
              </h3>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-blue-600 uppercase italic">
                {Math.round((hoursThisWeek / weeklyQuota) * 100)}% Complete
              </p>
            </div>
          </div>

          <div className="h-4 bg-slate-100 rounded-full overflow-hidden p-1">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-1000 ease-out"
              style={{
                width: `${Math.min(100, (hoursThisWeek / weeklyQuota) * 100)}%`,
              }}
            />
          </div>
        </div>
      </section>

      {/* BIOMETRICS GRID */}
      <section className="px-6 grid grid-cols-2 gap-4 mb-8">
        <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xl">⚖️</span>
            <span className="text-[8px] font-black text-slate-300 uppercase tracking-tighter">
              Weight
            </span>
          </div>
          <p className="text-2xl font-black text-slate-900 italic">
            {latestWeight || "--"}
            <span className="text-[10px] ml-1 text-slate-400">kg</span>
          </p>
          <div className="absolute -right-2 -bottom-2 opacity-5 text-4xl font-black italic select-none">
            WT
          </div>
        </div>

        <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start mb-2">
            <span className="text-xl text-red-500">❤️</span>
            <span className="text-[8px] font-black text-slate-300 uppercase tracking-tighter">
              Resting HR
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            <p className="text-2xl font-black text-slate-900 italic">
              {latestRHR || "--"}
            </p>
            <span className="text-[10px] text-slate-400 font-bold uppercase">
              bpm
            </span>
          </div>

          {/* Status Dot */}
          {latestRHR && (
            <div className="mt-2 flex items-center gap-1">
              <div
                className={`w-1.5 h-1.5 rounded-full ${latestRHR < 65 ? "bg-emerald-500" : "bg-amber-500"}`}
              />
              <span className="text-[8px] font-black text-slate-400 uppercase">
                {latestRHR < 65 ? "Stable" : "Elevated"}
              </span>
            </div>
          )}
          <div className="absolute -right-2 -bottom-2 opacity-5 text-4xl font-black italic select-none">
            HR
          </div>
        </div>
      </section>

      {/* UPDATED LOG ACTION BUTTONS */}
      <section className="px-6 grid grid-cols-2 gap-4 mb-8">
        <button
          onClick={() => setShowWorkoutLogger(true)}
          className="bg-slate-900 text-white p-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-transform"
        >
          💪 Log Workout
        </button>
        <button
          onClick={() => setShowMetricLogger(true)}
          className="bg-blue-600 text-white p-4 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-transform"
        >
          ⚖️ Record Metric
        </button>
      </section>
      {/* Add the Modal Renderer at the bottom of the main tag */}
      {showMetricLogger && (
        <MetricLogger
          onSave={handleSaveMetric}
          onClose={() => setShowMetricLogger(false)}
          lastWeight={latestWeight}
        />
      )}

      {showWorkoutLogger && (
        <WorkoutLogger
          onSave={handleSaveWorkout}
          onClose={() => setShowWorkoutLogger(false)}
        />
      )}

      {/* WEIGHT TREND CARD */}
      {weightTrend && (
        <section className="px-6 mb-8">
          <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div
                className={`p-3 rounded-2xl ${weightTrend.delta <= 0 ? "bg-emerald-50 text-emerald-600" : "bg-orange-50 text-orange-600"}`}
              >
                {weightTrend.delta <= 0 ? "📉" : "📈"}
              </div>
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                  Weight Trend
                </p>
                <p className="text-sm font-bold text-slate-900">
                  {weightTrend.delta <= 0 ? "Consolidated " : "Increased "}
                  <span
                    className={
                      weightTrend.delta <= 0
                        ? "text-emerald-600"
                        : "text-orange-600"
                    }
                  >
                    {weightTrend.text}
                  </span>
                </p>
              </div>
            </div>
            <div className="text-[10px] font-black text-slate-300 uppercase italic">
              Last 7 Days
            </div>
          </div>
        </section>
      )}
      {/* Toggle Workouts v Biometrics */}
      <section className="px-6 mb-4">
        <div className="flex bg-slate-100 p-1 rounded-2xl">
          <button
            onClick={() => setView("activity")}
            className={`flex-1 py-2 text-[10px] font-black uppercase rounded-xl transition-all ${view === "activity" ? "bg-white text-blue-600 shadow-sm" : "text-slate-400"}`}
          >
            Workouts
          </button>
          <button
            onClick={() => setView("metrics")}
            className={`flex-1 py-2 text-[10px] font-black uppercase rounded-xl transition-all ${view === "metrics" ? "bg-white text-blue-600 shadow-sm" : "text-slate-400"}`}
          >
            Biometrics
          </button>
        </div>
      </section>

      {/* RECENT VITALITY LOGS */}
      <section className="px-6 pb-32">
        {/* Increased padding bottom from 20 to 32 */}
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 px-2">
          Recent Intelligence
        </h3>
        {view === "metrics" ? (
          <div className="space-y-3 pb-20">
            {metrics.length === 0 ? (
              <p className="text-center py-10 text-slate-400 italic text-sm">
                No biometrics recorded.
              </p>
            ) : (
              metrics.map((m, idx) => {
                // Find the PREVIOUS entry of the SAME TYPE to calculate the delta
                const previousEntry = metrics
                  .slice(idx + 1)
                  .find((prev) => prev.type === m.type);
                const diff = previousEntry
                  ? m.value - previousEntry.value
                  : null;

                return (
                  <div
                    key={m.id}
                    className="bg-white p-4 rounded-3xl border border-slate-100 flex items-center justify-between shadow-sm"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`p-3 rounded-2xl text-xl ${m.type === "Weight" ? "bg-blue-50" : "bg-red-50"}`}
                      >
                        {m.type === "Weight" ? "⚖️" : "❤️"}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">
                          {m.type}
                        </p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">
                          {m.timestamp.toLocaleDateString(undefined, {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-black text-slate-900">
                        {m.value}
                        <span className="text-[10px] ml-0.5 text-slate-400">
                          {m.unit}
                        </span>
                      </p>
                      {diff !== null && (
                        <p
                          className={`text-[9px] font-black italic ${diff <= 0 ? "text-emerald-500" : "text-orange-500"}`}
                        >
                          {diff > 0
                            ? `↑ +${diff.toFixed(1)}`
                            : `↓ ${diff.toFixed(1)}`}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {loadingLogs ? (
              <p className="text-center py-10 text-slate-400 animate-pulse">
                Scanning records...
              </p>
            ) : logs.length === 0 ? (
              <div className="bg-white p-8 rounded-3xl border border-dashed border-slate-200 text-center">
                <p className="text-slate-400 text-sm italic">
                  No data synced yet.
                </p>
              </div>
            ) : (
              logs.map((log) => (
                <div
                  key={log.id}
                  className="bg-white p-4 rounded-3xl border border-slate-100 flex items-center justify-between shadow-sm"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`p-2 rounded-xl text-[10px] font-black uppercase ${
                        log.type === "Strength"
                          ? "bg-orange-50 text-orange-600"
                          : log.type === "Cardio"
                            ? "bg-emerald-50 text-emerald-600"
                            : "bg-blue-50 text-blue-600"
                      }`}
                    >
                      {log.type}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 leading-none mb-1">
                        {log.note || log.type}
                      </p>
                      <p className="text-[10px] text-slate-400 flex items-center gap-2">
                        Effort:{" "}
                        <span className="font-bold text-slate-600">
                          {log.effort}/10
                        </span>
                        • {log.perspective}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-slate-900">
                      {log.duration}m
                    </p>
                    <p className="text-[8px] text-slate-300 font-bold uppercase">
                      {new Date(log.timestamp).toLocaleDateString(undefined, {
                        weekday: "short",
                      })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </section>
    </main>
  );
}
