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
    if (score >= 90)
      return {
        msg: "System Optimal. Prime day for high-intensity or PR attempts.",
        color: "text-emerald-300",
        icon: "🔥",
      };
    if (score >= 75)
      return {
        msg: "Good to go. Maintain momentum with a steady-state session.",
        color: "text-blue-200",
        icon: "⚡",
      };
    if (score >= 60)
      return {
        msg: "Fatigue detected. Consider active recovery or lower effort.",
        color: "text-orange-200",
        icon: "🧘",
      };
    return {
      msg: "Recovery required. High risk of overtraining. Rest today.",
      color: "text-red-200",
      icon: "🛑",
    };
  }, [stats.readiness]);

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
      `users/${activeUser.uid}/projects/zzKbUe0FfYmMW1RDr7SR`,
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

  // Fetch the most recent weight metric
  useEffect(() => {
    if (!activeUser?.uid) return;

    const q = query(
      collection(db, `users/${activeUser.uid}/health_metrics`),
      where("type", "==", "Weight"),
      orderBy("timestamp", "desc"),
      limit(1),
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        setLatestWeight(snapshot.docs[0].data().value);
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
    const defaultProjectId = "zzKbUe0FfYmMW1RDr7SR";
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
      await addDoc(collection(db, `users/${activeUser.uid}/health_metrics`), {
        ...metricData,
        timestamp: Timestamp.now(),
        date: now.toISOString().split("T")[0],
      });

      setShowMetricLogger(false);
    } catch (error) {
      console.error("Error saving metric:", error);
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

      {/* QUICK ACTIONS */}
      <section className="px-6 grid grid-cols-2 gap-4 mb-8">
        <button
          onClick={() => setShowWorkoutLogger(true)}
          className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col items-center gap-2 active:scale-95 transition-transform"
        >
          <span className="text-2xl">💪</span>
          <span className="text-xs font-bold text-slate-700">Log Workout</span>
        </button>

        <button
          onClick={() => setShowMetricLogger(true)}
          className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col items-center gap-2 active:scale-95 transition-transform text-center"
        >
          <span className="text-2xl">⚖️</span>
          <div>
            <span className="text-xs font-bold text-slate-700 block">
              Record Metric
            </span>
            <span className="text-[10px] font-black text-blue-600 uppercase">
              {latestWeight ? `${latestWeight} kg` : "Update"}
            </span>
          </div>
        </button>

        {/* Add the Modal Renderer at the bottom of the main tag */}
        {showMetricLogger && (
          <MetricLogger
            onSave={handleSaveMetric}
            onClose={() => setShowMetricLogger(false)}
            lastWeight={latestWeight}
          />
        )}
      </section>
      {showWorkoutLogger && (
        <WorkoutLogger
          onSave={handleSaveWorkout}
          onClose={() => setShowWorkoutLogger(false)}
        />
      )}
      {/* RECENT VITALITY LOGS */}
      <section className="px-6 pb-32">
        {/* Increased padding bottom from 20 to 32 */}
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 px-2">
          Recent Intelligence
        </h3>
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
      </section>
    </main>
  );
}
