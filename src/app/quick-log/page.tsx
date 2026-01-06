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
  { label: "15m", minutes: 15 },
  { label: "30m", minutes: 30 },
  { label: "1h", minutes: 60 },
  { label: "2h", minutes: 120 },
  { label: "Custom", minutes: null },
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
  const [duration, setDuration] = useState<number>(60);
  const [customDuration, setCustomDuration] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [isLogging, setIsLogging] = useState<boolean>(false);
  const [showSuccess, setShowSuccess] = useState<boolean>(false);

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
    const parsed = parseInt(value);
    // If the user clears the box, default to 0; otherwise use the number
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

      const logDuration = duration; // The minutes (30)
      // const logHours = duration / 60; // The decimal (0.5)
      // Convert to number regardless of whether it's currently a string or number
      const durationNum =
        typeof duration === "string" ? parseFloat(duration) : duration;

      // Logic: If > 8, assume it's minutes (e.g., 30) and convert to hours (0.5)
      const logHours = durationNum > 8 ? durationNum / 60 : durationNum;

      // Now use logHours in your updateDoc and addDoc calls

      // 1. Create the Log Entry (matching your old "week ago" fields)
      await addDoc(timeLogsRef, {
        projectId: selectedProject.id,
        projectName: selectedProject.name,
        perspective: perspective,
        duration: logHours, // Your "key one"
        hours: logHours, // Added for compatibility
        notes: note || "",
        // FIXED: Use standardized YYYY-MM-DD to match Hub searchDate
        date: new Date().toISOString().split("T")[0],
        timestamp: serverTimestamp(),
        createdAt: new Date().toISOString(),
        source: "quick-log-pwa",
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
                  onClick={() => {
                    if (d.minutes) {
                      setDuration(d.minutes);
                      setCustomDuration("");
                    } else {
                      setCustomDuration("");
                    }
                  }}
                  className={`
                  py-3 rounded-lg border-2 font-semibold transition-all text-sm
                  ${
                    duration === d.minutes && d.minutes
                      ? "bg-blue-600 border-blue-600 text-white"
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
                (d) => d.minutes === duration
              )) && (
              <input
                type="number"
                value={customDuration}
                onChange={(e) => handleCustomDuration(e.target.value)}
                placeholder="Custom minutes..."
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
