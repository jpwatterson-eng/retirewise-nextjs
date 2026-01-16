"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext.js";
import { db } from "@/config/firebase.js";
import {
  collection,
  addDoc,
  query,
  getDocs,
  where, // Added to filter by status
  orderBy,
  limit,
  serverTimestamp, // Use Firestore server timestamps for accuracy
  doc,
  updateDoc,
  increment,
} from "firebase/firestore";

import { getAuth, onAuthStateChanged } from "firebase/auth";
import Link from "next/link";

const PERSPECTIVES = [
  { id: "builder", label: "Builder", icon: "🏗️", color: "bg-blue-600" },
  {
    id: "contributor",
    label: "Contributor",
    icon: "🤝",
    color: "bg-green-600",
  },
  { id: "integrator", label: "Integrator", icon: "🧩", color: "bg-purple-600" },
  {
    id: "experimenter",
    label: "Experimenter",
    icon: "🔬",
    color: "bg-orange-600",
  },
];

const QUICK_DURATIONS = [
  { label: "0.25h", hours: 0.25 },
  { label: "0.5h", hours: 0.5 },
  { label: "1h", hours: 1.0 },
  { label: "2h", hours: 2.0 },
  { label: "Custom", hours: null },
];

// Updated types to match your documentation
type Perspective = "builder" | "contributor" | "integrator" | "experimenter";

interface ProjectItem {
  id: string;
  name: string;
  perspective: Perspective;
}

export default function QuickLogPage() {
  const router = useRouter();
  const { user: hookUser, loading: hookLoading } = useAuth();
  const [activeUser, setActiveUser] = useState<any>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const [perspective, setPerspective] = useState<Perspective | null>(null);
  const [selectedProject, setSelectedProject] = useState<ProjectItem | null>(
    null
  );
  const [allProjects, setAllProjects] = useState<ProjectItem[]>([]);
  const [duration, setDuration] = useState<number>(1.0);
  const [customDuration, setCustomDuration] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [isLogging, setIsLogging] = useState<boolean>(false);
  const [showSuccess, setShowSuccess] = useState<boolean>(false);

  // --- ADD PULSE LOGIC HERE ---
  const [weeklyTotal, setWeeklyTotal] = useState<number>(0);
  const [dynamicWeeklyGoal, setDynamicWeeklyGoal] = useState<number>(40); // Default fallback
  const [weeklyProgress, setWeeklyProgress] = useState<number>(0);

  useEffect(() => {
    if (!activeUser) return;

    const calculatePulse = async () => {
      try {
        // 1. Get recent logs (last 7 days)
        const logsRef = collection(db, `users/${activeUser.uid}/timeLogs`);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);

        const q = query(logsRef, where("date", ">=", weekAgo.toISOString()));
        const snapshot = await getDocs(q);

        const total = snapshot.docs.reduce(
          (sum, doc) => sum + (doc.data().duration || 0),
          0
        );
        setWeeklyTotal(Math.round(total * 10) / 10);

        // 2. Fetch Weekly Goals to get the Target
        const goalsRef = collection(db, `users/${activeUser.uid}/weeklyGoals`);
        const goalQuery = query(
          goalsRef,
          where("status", "==", "committed"),
          limit(1)
        );
        const goalSnapshot = await getDocs(goalQuery);

        if (!goalSnapshot.empty) {
          const goalData = goalSnapshot.docs[0].data();
          const targetSum =
            goalData.targets?.reduce(
              (sum: number, t: any) => sum + (t.targetHours || 0),
              0
            ) || 40;
          setDynamicWeeklyGoal(targetSum);
          setWeeklyProgress(Math.min(100, (total / targetSum) * 100));
        } else {
          setWeeklyProgress(Math.min(100, (total / 40) * 100));
        }
      } catch (err) {
        console.error("Pulse calculation failed", err);
      }
    };

    calculatePulse();
  }, [activeUser]);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        console.log("QuickLog Sync: User confirmed", user.uid);
        setActiveUser(user);
      } else {
        setActiveUser(null);
      }
      setIsInitializing(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!activeUser) return;

    const fetchProjects = async () => {
      try {
        const projectsRef = collection(db, `users/${activeUser.uid}/projects`);
        // Only fetch active projects for quick logging
        const q = query(
          projectsRef,
          where("status", "in", ["active", "planning"])
        );
        const snapshot = await getDocs(q);

        const fetched = snapshot.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().name,
          perspective: doc.data().perspective,
        })) as ProjectItem[];

        setAllProjects(fetched);
      } catch (error) {
        console.error("Error loading projects:", error);
      }
    };

    fetchProjects();
  }, [activeUser]);

  // 4. Update your Shields to use isInitializing and activeUser
  // if (isInitializing)
  //  return <div className="p-10 text-center">Syncing Hub...</div>;
  // if (!activeUser)
  //  return <div className="p-10 text-center">Please log in to RetireWise.</div>;

  // AUTO-SELECT PERSPECTIVE WHEN PROJECT IS CHOSEN
  const handleProjectSelect = (p: ProjectItem) => {
    setSelectedProject(p);
    setPerspective(p.perspective);
  };

  const handleCustomDuration = (value: string) => {
    setCustomDuration(value);
    const parsed = parseFloat(value); // FIX: Use parseFloat to capture decimals
    setDuration(isNaN(parsed) ? 0 : parsed);
  };

  const handleLog = async () => {
    if (!activeUser || !perspective || !selectedProject) return;
    setIsLogging(true);

    try {
      const timeLogsRef = collection(db, `users/${activeUser.uid}/timeLogs`);
      const projectRef = doc(
        db,
        `users/${activeUser.uid}/projects`,
        selectedProject.id
      );

      const logHours = Math.round(duration * 100) / 100;

      await addDoc(timeLogsRef, {
        projectId: selectedProject.id,
        projectName: selectedProject.name,
        perspective: perspective.toLowerCase(),
        duration: logHours,
        // hours: logHours, // Note: You can keep this for legacy, but 'duration' is the standard
        notes: note || "",
        date: new Date().toISOString(), // Change from .split('T')[0] to full ISO string for Phase 6 consistency
        timestamp: serverTimestamp(),
        createdAt: new Date().toISOString(),
        sourceApp: "retirewise", // 🔥 ADDED: Identity Tag
        source: "quick-log-decimal",
        updatedAt: new Date().toISOString(), // 🔥 ADDED: Consistency
      });

      // 2. IMPORTANT: Update the Project's running total
      await updateDoc(projectRef, {
        totalHoursLogged: increment(logHours), // This makes it show up in your charts!
        updatedAt: new Date().toISOString(),
      });

      setShowSuccess(true);
      setTimeout(() => {
        setPerspective(null);
        setSelectedProject(null);
        setDuration(60);
        setNote("");
        setShowSuccess(false);
        window.location.href = "/";
      }, 1500);
    } catch (error) {
      console.error("Sync Error:", error);
      alert("Data saved to log, but project total failed to update.");
    } finally {
      setIsLogging(false);
    }
  };

  if (showSuccess)
    return (
      <div className="min-h-screen flex items-center justify-center bg-green-50">
        <div className="text-center animate-bounce">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-green-700">
            Logged to {selectedProject?.name}!
          </h2>
        </div>
      </div>
    );

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col">
      {/* SCROLLABLE CONTAINER 
          We use flex-1 and overflow-y-auto so the form scrolls 
          but the buttons stay fixed at the bottom.
      */}
      <div className="flex-1 overflow-y-auto p-6 pb-32">
        <div className="max-w-md mx-auto space-y-8">
          <div className="flex items-center justify-between border-b pb-4">
            <h1 className="text-xl font-bold">Quick Log</h1>
            <Link
              href="/"
              className="text-xs font-black text-gray-400 uppercase tracking-widest"
            >
              ✕ Close
            </Link>
          </div>

          {/* THE PULSE BAR */}
          <div className="mb-6 p-4 bg-indigo-50 rounded-2xl border border-indigo-100 animate-in fade-in zoom-in duration-500">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm">🌓</span>
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">
                  Weekly Pulse
                </span>
              </div>
              <span className="text-[10px] font-bold text-indigo-600">
                {weeklyTotal}h / {dynamicWeeklyGoal}h
              </span>
            </div>
            <div className="h-2 w-full bg-white/50 rounded-full overflow-hidden border border-indigo-100/50">
              <div
                className="h-full bg-indigo-500 transition-all duration-1000 ease-out"
                style={{ width: `${weeklyProgress}%` }}
              />
            </div>
            {weeklyProgress >= 100 && (
              <p className="text-[9px] font-bold text-indigo-400 mt-2 text-center uppercase tracking-tighter">
                ✨ Weekly target reached. Every minute now is pure bonus
                momentum.
              </p>
            )}
          </div>

          {/* PROJECT SELECTION */}
          <div>
            <label className="block text-sm font-semibold mb-3">
              Which Project?
            </label>
            <div className="flex flex-wrap gap-2">
              {allProjects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setSelectedProject(p);
                    setPerspective(p.perspective);
                  }}
                  className={`px-4 py-2 rounded-full border-2 transition-all ${
                    selectedProject?.id === p.id
                      ? "bg-blue-600 border-transparent text-white shadow-lg"
                      : "bg-white border-gray-200 text-gray-600"
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {/* PERSPECTIVE (Auto-highlighted) */}
          {selectedProject && (
            <div className="animate-in fade-in slide-in-from-top-4">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Perspective (Auto-filled)
              </label>
              <div className="grid grid-cols-2 gap-3">
                {PERSPECTIVES.map((p) => (
                  <div
                    key={p.id}
                    className={`p-4 rounded-xl border-2 flex flex-col items-center opacity-50 grayscale transition-all ${
                      perspective === p.id
                        ? "opacity-100 grayscale-0 border-blue-600 bg-blue-50"
                        : "border-transparent bg-gray-100"
                    }`}
                  >
                    <span className="text-2xl">{p.icon}</span>
                    <span className="text-xs font-bold mt-1 uppercase">
                      {p.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* DURATION & NOTES follow... */}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Duration
            </label>
            <div className="grid grid-cols-5 gap-2 mb-2">
              {QUICK_DURATIONS.map((d) => (
                <button
                  key={d.label}
                  type="button"
                  onClick={() => {
                    if (d.hours !== null) {
                      // User clicked 0.25h, 0.5h, 1h, etc.
                      setDuration(d.hours);
                      setCustomDuration("");
                    } else {
                      // User clicked "Custom"
                      setDuration(0); // Reset numeric duration
                      setCustomDuration(""); // Ready for new input
                    }
                  }}
                  className={`
    py-3 rounded-lg border-2 font-semibold transition-all text-sm
    ${
      // Highlight if it's a preset match OR if it's the custom button and no preset matches
      (d.hours === null &&
        !QUICK_DURATIONS.slice(0, -1).some((pd) => pd.hours === duration)) ||
      (d.hours !== null && duration === d.hours)
        ? "bg-blue-600 border-blue-600 text-white shadow-md"
        : "bg-white border-gray-200 text-gray-700"
    }
  `}
                >
                  {d.label}
                </button>
              ))}
            </div>
            {(customDuration ||
              !QUICK_DURATIONS.slice(0, -1).some(
                (d) => d.hours === duration
              )) && (
              <input
                type="number"
                step="0.25"
                value={customDuration}
                onChange={(e) => handleCustomDuration(e.target.value)}
                placeholder="Enter hours (e.g. 1.25)"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg"
              />
            )}
          </div>

          {/* Optional Note */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quick Note (Optional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Any quick thoughts?"
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-none"
            />
          </div>
        </div>
      </div>
      {/* FIXED BUTTONS - Elevated to stay above Navigation */}
      <div className="p-6 border-t border-gray-100 bg-white sticky bottom-0 z-[60] shadow-[0_-10px_20px_rgba(0,0,0,0.05)] mb-20 md:mb-0">
        <div className="max-w-md mx-auto flex gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 py-4 text-gray-400 font-bold hover:bg-gray-50 rounded-2xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleLog}
            disabled={isLogging || !selectedProject}
            className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-100 disabled:opacity-50 active:scale-95 transition-transform"
          >
            {isLogging ? "Saving..." : "Log it"}
          </button>
        </div>
      </div>
    </main>
  );
}
