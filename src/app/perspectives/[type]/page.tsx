"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import { auth, db } from "@/config/firebase.js";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  doc,
  deleteDoc,
  updateDoc,
  increment,
  addDoc,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import Link from "next/link";

import { PERSPECTIVES } from "@/config/perspectives";

export default function PerspectiveDeepDive() {
  const { type } = useParams();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const config = PERSPECTIVES[type as string] || PERSPECTIVES.builder;
  const [logs, setLogs] = useState<any[]>([]);

  const [isAdding, setIsAdding] = useState(false);
  const [selectedProject, setSelectedProject] = useState("");
  const [hours, setHours] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u) setUser(u);
      else router.push("/");
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !config) return;

    const fetchPerspectiveData = async () => {
      try {
        // Check for both "Builder" (label) and "builder" (id)
        // This covers you if some records are capitalized and others aren't
        const q = query(
          collection(db, `users/${user.uid}/projects`),
          where("perspective", "in", [config.label, config.id])
        );

        const snap = await getDocs(q);
        const fetchedProjects = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        setProjects(fetchedProjects);
      } catch (err) {
        console.error("Deep Dive Error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPerspectiveData();
  }, [user, config]);

  // Fetch the logs
  useEffect(() => {
    if (!user || !config) return;

    const fetchLogs = async () => {
      try {
        // Find logs across ALL projects that match this perspective
        const logsRef = collection(db, `users/${user.uid}/timeLogs`);
        const q = query(
          logsRef,
          where("perspective", "in", [config.label, config.id]),
          orderBy("date", "desc") // Show newest first
        );

        const snap = await getDocs(q);
        setLogs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error("Error fetching logs:", err);
      }
    };

    fetchLogs();
  }, [user, config]);

  const handleInlineLog = async () => {
    const durationNum = parseFloat(hours);
    if (!selectedProject || isNaN(durationNum) || !user) return;

    try {
      const project = projects.find((p) => p.id === selectedProject);

      // 1. Create the detailed Time Log
      await addDoc(collection(db, `users/${user.uid}/timeLogs`), {
        projectId: selectedProject,
        projectName: project?.name || "Unknown",
        perspective: config.label,
        duration: durationNum,
        date: new Date().toISOString(),
      });

      // 2. Update the Project summary
      // CRITICAL: We add updatedAt here so the Weekly Momentum bar knows this happened today!
      await updateDoc(doc(db, `users/${user.uid}/projects`, selectedProject), {
        totalHoursLogged: increment(durationNum),
        updatedAt: new Date().toISOString(),
      });

      // 3. Reset UI
      setHours("");
      setIsAdding(false);

      // Optional: You could trigger a local state refresh here if needed
    } catch (err) {
      console.error("Error logging time:", err);
    }
  };

  const totalHours = projects.reduce(
    (acc, p) => acc + (p.totalHoursLogged || 0),
    0
  );

  const deleteLog = async (
    logId: string,
    duration: number,
    projectId: string
  ) => {
    if (
      !window.confirm(
        "Delete this log entry? It will also update your project total."
      )
    )
      return;

    try {
      // 1. Calculate the actual hour value to subtract
      // If it's old data (e.g. 30), we convert to 0.5. If it's new (0.5), we keep it.
      const hoursToSubtract = duration > 8 ? duration / 60 : duration;

      // 2. Delete the log document
      await deleteDoc(doc(db, `users/${user.uid}/timeLogs`, logId));

      // 3. Update the Project total (Subtracting the hours)
      if (projectId) {
        const projectRef = doc(db, `users/${user.uid}/projects`, projectId);
        await updateDoc(projectRef, {
          totalHoursLogged: increment(-hoursToSubtract),
        });
      }

      // 4. Update the Local UI State immediately
      setLogs((prev) => prev.filter((l) => l.id !== logId));

      // Also update the projects state if you are using it for the breakdown list
      setProjects((prev) =>
        prev.map((p) =>
          p.id === projectId
            ? {
                ...p,
                totalHoursLogged: Math.max(
                  0,
                  (p.totalHoursLogged || 0) - hoursToSubtract
                ),
              }
            : p
        )
      );

      alert("Log deleted and total adjusted.");
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Could not delete. Check console for errors.");
    }
  };

  const nextMilestone = useMemo(() => {
    const milestones = [10, 25, 50, 100, 250, 500];
    return milestones.find((m) => m > totalHours) || 1000;
  }, [totalHours]);

  const remainingHours = nextMilestone - totalHours;
  const milestoneProgress = Math.min((totalHours / nextMilestone) * 100, 100);

  if (loading)
    return <div className="p-10 text-center">Loading {config.label}...</div>;

  return (
    <main className="min-h-screen bg-gray-50 pb-20">
      {/* HEADER */}
      <div
        className={`${config.bg} px-6 pt-12 pb-8 border-b rounded-b-[2.5rem]`}
      >
        <button
          onClick={() => router.back()}
          className="mb-4 text-gray-500 flex items-center gap-1"
        >
          ← Back to Hub
        </button>
        <div className="flex justify-between items-end">
          <div>
            <span className="text-4xl mb-2 block">{config.icon}</span>
            <h1
              className={`text-3xl font-black ${config.color} uppercase tracking-tight`}
            >
              {config.label}
            </h1>
          </div>
          <div className="text-right">
            <p className="text-4xl font-black text-gray-900">
              {totalHours.toFixed(1)}
            </p>
            <p className="text-xs font-bold text-gray-400 uppercase">
              Total Hours
            </p>
          </div>
        </div>
      </div>

      <div className="px-6 mt-8">
        {!isAdding ? (
          <button
            onClick={() => setIsAdding(true)}
            className="w-full py-4 rounded-2xl border-2 border-dashed border-gray-200 text-gray-400 font-bold flex items-center justify-center gap-2 hover:bg-white transition-all shadow-sm"
          >
            <span className="text-xl">+</span> Log {config.label} Time
          </button>
        ) : (
          <div className="bg-white p-6 rounded-[2rem] shadow-lg border border-gray-100 animate-in fade-in slide-in-from-top-4">
            <h3 className="font-black text-gray-900 mb-4 uppercase text-[10px] tracking-widest text-blue-600">
              Quick Entry
            </h3>

            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="w-full p-4 bg-gray-50 rounded-2xl border-none text-sm mb-3 outline-none ring-1 ring-gray-100 focus:ring-blue-500"
            >
              <option value="">Select Project...</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            <input
              type="number"
              step="0.5"
              placeholder="Hours (e.g. 1.5)"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              className="w-full p-4 bg-gray-50 rounded-2xl border-none text-sm mb-4 outline-none ring-1 ring-gray-100 focus:ring-blue-500"
            />

            <div className="flex gap-3">
              <button
                onClick={() => setIsAdding(false)}
                className="flex-1 py-3 text-gray-400 font-bold text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleInlineLog}
                disabled={!selectedProject || !hours}
                className={`flex-1 py-4 ${config.bar} text-white rounded-xl font-bold text-sm shadow-md disabled:opacity-50 transition-all active:scale-95`}
              >
                Save Progress
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MILESTONE CARD */}
      <div className="px-6 -mt-6">
        {" "}
        {/* Overlaps slightly with the rounded header */}
        <div className="bg-white p-5 rounded-2xl shadow-lg border border-gray-100">
          <div className="flex justify-between items-end mb-3">
            <div>
              <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                Next Milestone
              </h2>
              <p className="text-xl font-bold text-gray-900">
                {nextMilestone} Hours
              </p>
            </div>
            <div className="text-right">
              <p className={`text-sm font-bold ${config.color}`}>
                {remainingHours.toFixed(1)}{" "}
                <span className="text-gray-400">to go</span>
              </p>
            </div>
          </div>

          {/* Milestone Progress Bar */}
          <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden shadow-inner">
            <div
              className={`h-full ${config.bar} transition-all duration-1000 ease-out shadow-sm`}
              style={{ width: `${milestoneProgress}%` }}
            />
          </div>

          <p className="mt-2 text-[10px] text-center text-gray-400 font-medium italic">
            "Progress is the sum of small efforts, repeated day in and day out."
          </p>
        </div>
      </div>

      {/* PROJECT BREAKDOWN */}
      <div className="p-6">
        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">
          Focus Areas
        </h2>
        <div className="space-y-4">
          {projects.map((p) => (
            <div
              key={p.id}
              className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100"
            >
              <h3 className="font-bold text-gray-800 mb-1">{p.name}</h3>
              <div className="flex justify-between text-xs text-gray-500 mb-3">
                <span>Progress</span>
                <span>
                  {p.totalHoursLogged || 0} / {p.targetHours || 20}h
                </span>
              </div>
              <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-1000 ${config.color.replace(
                    "text",
                    "bg"
                  )}`}
                  style={{
                    width: `${Math.min(
                      ((p.totalHoursLogged || 0) / (p.targetHours || 20)) * 100,
                      100
                    )}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ACTIVITY FEED */}
      <div className="p-6">
        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">
          Recent History
        </h2>
        <div className="space-y-3">
          {logs.length > 0 ? (
            logs.map((log) => (
              <div
                key={log.id}
                className="bg-white p-4 rounded-xl border border-gray-100 flex items-center justify-between group"
              >
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">
                    {new Date(log.date).toLocaleDateString()}
                  </span>
                  <span className="font-bold text-gray-800">
                    {log.projectName}
                  </span>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className={`text-lg font-black ${config.color}`}>
                      {log.duration > 8
                        ? (log.duration / 60).toFixed(1)
                        : log.duration.toFixed(1)}
                      h
                    </span>
                  </div>

                  {/* Trash Button */}
                  <button
                    onClick={() =>
                      deleteLog(log.id, log.duration, log.projectId)
                    }
                    className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-10 bg-white rounded-2xl border border-dashed">
              <p className="text-gray-400 text-sm italic">
                No logs found for this perspective yet.
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
