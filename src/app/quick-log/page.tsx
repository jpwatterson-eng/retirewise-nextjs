"use client";

import { useState, useEffect } from "react";
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
} from "firebase/firestore";

// RESTORED ORIGINAL PERSPECTIVES
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
  const { user } = useAuth();
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

  // LOAD REAL PROJECTS FROM FIRESTORE
  useEffect(() => {
    if (!user) return;

    const fetchProjects = async () => {
      try {
        const projectsRef = collection(db, `users/${user.uid}/projects`);
        // Only fetch active projects for quick logging
        const q = query(projectsRef, where("status", "==", "active"));
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
  }, [user]);

  // AUTO-SELECT PERSPECTIVE WHEN PROJECT IS CHOSEN
  const handleProjectSelect = (p: ProjectItem) => {
    setSelectedProject(p);
    setPerspective(p.perspective);
  };

  const handleLog = async () => {
    if (!user || !perspective || !selectedProject) return;

    setIsLogging(true);

    try {
      const timeLogsRef = collection(db, `users/${user.uid}/timeLogs`);
      await addDoc(timeLogsRef, {
        perspective,
        projectId: selectedProject.id,
        projectName: selectedProject.name,
        hours: duration / 60, // Convert minutes to decimal hours to match your DB schema
        notes: note || "",
        timestamp: serverTimestamp(),
        source: "quick-log",
        appId: "retirewise",
      });

      setShowSuccess(true);
      setTimeout(() => {
        setPerspective(null);
        setSelectedProject(null);
        setDuration(60);
        setNote("");
        setShowSuccess(false);
      }, 1500);
    } catch (error) {
      console.error("Error logging time:", error);
      alert("Failed to log time.");
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
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-white border-b px-6 py-4 sticky top-0 z-10">
        <h1 className="text-xl font-bold text-gray-900">Quick Log</h1>
        <p className="text-sm text-gray-500">Fast-track your progress</p>
      </div>

      <div className="p-6 space-y-8">
        {/* PROJECT SELECTION FIRST (Better UX) */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Which Project?
          </label>
          <div className="flex flex-wrap gap-2">
            {allProjects.map((p) => (
              <button
                key={p.id}
                onClick={() => handleProjectSelect(p)}
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
        {/* [Keeping your existing Duration and Note UI here] */}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-white border-t">
        <button
          onClick={handleLog}
          disabled={!selectedProject || isLogging}
          className="w-full py-4 rounded-2xl bg-blue-600 text-white font-bold text-lg disabled:bg-gray-200 shadow-xl"
        >
          {isLogging ? "Saving..." : "Log It ✓"}
        </button>
      </div>
    </div>
  );
}
