"use client";

import { useState, useEffect } from "react";
import { auth, db } from "@/config/firebase";
import { collection, addDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import Link from "next/link";
import WorkoutLogger from "@/components/health/WorkoutLogger";
import { setDoc, doc } from "firebase/firestore";

export default function HealthAppPage() {
  const [activeUser, setActiveUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showWorkoutLogger, setShowWorkoutLogger] = useState(false);

  const handleSaveWorkout = async (workoutData: any) => {
    if (!activeUser) return;

    try {
      // 1. Identify or Create the "Health & Vitality" Project in the Hub
      // We'll use a consistent ID for this default project
      const defaultProjectId = "default-health-vitality";

      // 1. Save detailed minutes to Health Logs (keeps it "Natural" for Health)
      await addDoc(collection(db, `users/${activeUser.uid}/health_logs`), {
        ...workoutData,
        appId: "health-vitality",
        createdAt: new Date().toISOString(),
      });

      const decimalHours = parseFloat((workoutData.duration / 60).toFixed(2));

      // 3. Sync to the Hub (Standard Time Log)
      // This makes the workout show up in your main Ring and Project lists
      await setDoc(
        doc(db, `users/${activeUser.uid}/projects/${defaultProjectId}`),
        {
          id: defaultProjectId,
          name: "MyWorkouts",
          perspective: "integrator",
          status: "active",
          type: "managed-project",
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );

      await addDoc(collection(db, `users/${activeUser.uid}/timeLogs`), {
        projectId: defaultProjectId,
        projectName: "MyWorkouts",
        duration: decimalHours,
        perspective: workoutData.perspective,
        timestamp: workoutData.timestamp,
        // We combine the Type and the Note for a rich Hub record
        note: workoutData.note
          ? `${workoutData.type}: ${workoutData.note}`
          : workoutData.type,
        effort: workoutData.effort, // Include effort in metadata
        appId: "health-vitality",
        source: "managed-app",
      });

      console.log(
        "Sync Complete: Detailed health data and Hub time-log saved.",
      );
      setShowWorkoutLogger(false);
    } catch (error) {
      console.error("Sync failed:", error);
    }
  };

  // Inside your HealthAppPage component, replace the hardcoded JSX with these:
  const [stats, setStats] = useState({
    readiness: 0,
    avgEffort: 0,
    totalLogs: 0,
  });
  const [recentLogs, setRecentLogs] = useState([]);

  // We will eventually add a useEffect here to fetch the REAL data:
  // useEffect(() => {
  //   if (activeUser) fetchHealthData(activeUser.uid);
  // }, [activeUser]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setActiveUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

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

      {/* VITALITY STATUS (The "Recovery" View) */}
      <section className="p-6">
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2rem] p-8 text-white shadow-xl shadow-blue-200">
          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="text-blue-100 text-xs font-bold uppercase tracking-wider mb-1">
                Today's Readiness
              </p>
              <h2 className="text-4xl font-black italic">84%</h2>
            </div>
            <div className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold uppercase">
              Optimal
            </div>
          </div>

          {/* Simple Readiness Bar */}
          <div className="h-3 bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-white w-[84%] rounded-full shadow-[0_0_15px_rgba(255,255,255,0.5)]"></div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4">
            <div className="bg-white/10 rounded-2xl p-3">
              <p className="text-[10px] uppercase text-blue-100 font-bold">
                Avg Effort (Week)
              </p>
              <p className="text-xl font-bold">6.2</p>
            </div>
            <div className="bg-white/10 rounded-2xl p-3">
              <p className="text-[10px] uppercase text-blue-100 font-bold">
                Logs (Week)
              </p>
              <p className="text-xl font-bold">12</p>
            </div>
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
        <button className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col items-center gap-2 active:scale-95 transition-transform">
          <span className="text-2xl">⚖️</span>
          <span className="text-xs font-bold text-slate-700">
            Record Metric
          </span>
        </button>
      </section>
      {showWorkoutLogger && (
        <WorkoutLogger
          onSave={handleSaveWorkout}
          onClose={() => setShowWorkoutLogger(false)}
        />
      )}
      {/* RECENT VITALITY LOGS */}
      <section className="px-6">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 px-2">
          Recent Intelligence
        </h3>
        <div className="space-y-3">
          {/* Placeholder for real data */}
          <div className="bg-white p-4 rounded-3xl border border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-emerald-50 text-emerald-600 p-2 rounded-xl text-xs font-bold">
                Cardio
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">
                  5km Morning Run
                </p>
                <p className="text-[10px] text-slate-400">
                  Effort: 7/10 • Integrator
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-slate-900">45m</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
