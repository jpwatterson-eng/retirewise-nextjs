"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext.js";
// Import auth and db directly from your config
import { auth, db } from "@/config/firebase.js";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, getDocs, where } from "firebase/firestore";
import Link from "next/link";

interface ProjectItem {
  id: string;
  name: string;
  perspective: string;
  status: string;
  totalHoursLogged?: number;
  targetHours?: number;
  updatedAt?: string;
}

// 1. REUSE YOUR PERSPECTIVE DEFINITIONS
const PERSPECTIVES = {
  builder: {
    label: "Builder",
    icon: "🏗️",
    color: "text-blue-600",
    bg: "bg-blue-50",
    bar: "bg-blue-600",
  },
  contributor: {
    label: "Contributor",
    icon: "🤝",
    color: "text-green-600",
    bg: "bg-green-50",
    bar: "bg-green-600",
  },
  integrator: {
    label: "Integrator",
    icon: "🧩",
    color: "text-purple-600",
    bg: "bg-purple-50",
    bar: "bg-purple-600",
  },
  experimenter: {
    label: "Experimenter",
    icon: "🔬",
    color: "text-orange-600",
    bg: "bg-orange-50",
    bar: "bg-orange-600",
  },
};

export default function HomePage() {
  const { user: hookUser, loading: hookLoading } = useAuth();
  const [activeUser, setActiveUser] = useState<any>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [allProjects, setAllProjects] = useState<ProjectItem[]>([]);
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    // No more 'getAuth()' call here - we use the 'auth' from our import
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        console.log("Hub Sync: User detected", user.uid);
        setActiveUser(user);
      } else {
        console.log("Hub Sync: No user found");
        setActiveUser(null);
      }
      setIsInitializing(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!activeUser) return;

    const fetchAllData = async () => {
      try {
        const projectsRef = collection(db, `users/${activeUser.uid}/projects`);
        const snapshot = await getDocs(projectsRef);
        const projects = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as ProjectItem[];
        setAllProjects(projects);
      } catch (error) {
        console.error("Fetch error:", error);
      }
    };
    fetchAllData();
  }, [activeUser]);

  // 2. LOGIC FROM PORTFOLIODASHBOARD
  const stats = useMemo(() => {
    const totals = {
      builder: 0,
      contributor: 0,
      integrator: 0,
      experimenter: 0,
    };
    allProjects.forEach((p) => {
      const type = p.perspective?.toLowerCase();
      if (totals.hasOwnProperty(type)) {
        totals[type] += p.totalHoursLogged || 0;
      }
    });
    return totals;
  }, [allProjects]);

  const todayTotal = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    // If your project documents don't have individual log dates,
    // you might need to fetch today's logs specifically.
    // For now, let's sum up all 'duration' fields from logs created today.
    return allProjects.reduce(
      (acc, proj) => acc + (proj.totalHoursLogged || 0),
      0
    );
  }, [allProjects]);

  const lastActivity = useMemo(() => {
    if (allProjects.length === 0) return null;

    // Find the project with the most recent 'updatedAt' or 'lastLogged'
    // (Assuming your Phase 4 logic updates these fields)
    const sorted = [...allProjects].sort(
      (a, b) =>
        new Date(b.updatedAt || 0).getTime() -
        new Date(a.updatedAt || 0).getTime()
    );

    return sorted[0];
  }, [allProjects]);

  // const dailyGoal = 4; // Set your target hours here
  // const progressPercent = Math.min((todayTotal / dailyGoal) * 100, 100);

  // 3. Updated Shields
  if (isInitializing)
    return <div className="p-10 text-center">Checking Hub Access...</div>;
  if (!activeUser)
    return (
      <div className="p-10 text-center">Session expired. Please log in.</div>
    );

  const portfolioGoal = 300;
  // Calculate percentage (0 to 100)
  const progressPercent = Math.min((todayTotal / portfolioGoal) * 100, 100);

  // SVG math: The circumference of a circle with r=34 is 2 * π * 34 ≈ 213.6
  const circumference = 2 * Math.PI * 34;
  const offset = circumference - (progressPercent / 100) * circumference;

  return (
    <main className="min-h-screen bg-gray-50 pb-24">
      {/* HEADER SECTION */}
      {/* BRANDED HEADER WITH PROGRESS RING */}
      <div className="bg-white px-6 pt-12 pb-8 border-b rounded-b-[2rem] shadow-sm">
        <div className="flex justify-between items-center">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-8 h-8 rounded-lg overflow-hidden shadow-sm border border-gray-100">
                <img
                  src="/icons/icon-192x192.png"
                  alt="RetireWise Logo"
                  className="w-full h-full object-cover"
                />
              </div>
              <h1 className="text-xl font-black tracking-tight text-gray-900">
                RETIREWISE <span className="text-blue-600">HUB</span>
              </h1>
            </div>
            <p className="text-gray-500 text-sm font-medium">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                month: "short",
                day: "numeric",
              })}
            </p>
          </div>

          {/* TODAY'S PROGRESS RING */}
          <div className="relative flex items-center justify-center">
            <svg className="w-20 h-20 transform -rotate-90">
              <circle
                cx="40"
                cy="40"
                r="34"
                stroke="currentColor"
                strokeWidth="6"
                fill="transparent"
                className="text-gray-100"
              />
              <circle
                cx="40"
                cy="40"
                r="34"
                stroke="currentColor"
                strokeWidth="6"
                fill="transparent"
                strokeDasharray={circumference}
                strokeDashoffset={offset} // This now uses our calculation
                strokeLinecap="round"
                className="text-blue-600 transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-lg font-bold text-gray-900">
                {todayTotal.toFixed(0)}
              </span>
              <span className="text-[10px] text-gray-400 uppercase font-bold">
                Total
              </span>
            </div>
            {/* New Snippet: Positioned just below the ring or in the text area */}
            {lastActivity && (
              <p className="text-[10px] text-gray-400 mt-2 italic">
                Last: {lastActivity.name}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="p-6 space-y-8">
        {/* 3. PERSPECTIVE SUMMARY GRID (Simplified PerspectiveCard Logic) */}
        <section>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
            Perspective Balance
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(PERSPECTIVES).map(([id, config]) => (
              <div
                key={id}
                className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{config.icon}</span>
                  <span
                    className={`text-xs font-bold uppercase ${config.color}`}
                  >
                    {config.label}
                  </span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold">
                    {stats[id].toFixed(1)}
                  </span>
                  <span className="text-xs text-gray-400">hrs</span>
                </div>
                {/* Visual Bar */}
                <div className="mt-3 w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${config.bar} transition-all duration-1000`}
                    style={{
                      width: `${Math.min((stats[id] / 20) * 100, 100)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 4. ACTIVE PROJECTS LIST */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
              Active Projects
            </h2>
            <Link href="/projects" className="text-blue-600 text-xs font-bold">
              View All
            </Link>
          </div>
          <div className="space-y-3">
            {allProjects
              .filter((p) => p.status === "active")
              .map((project) => {
                const projectGoal = project.targetHours || 20; // Default goal if none set
                const projectProgress = Math.min(
                  ((project.totalHoursLogged || 0) / projectGoal) * 100,
                  100
                );

                return (
                  <div
                    key={project.id}
                    className="bg-white p-4 rounded-xl shadow-sm border border-gray-50"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-bold text-gray-800">
                          {project.name}
                        </h3>
                        <p className="text-xs text-gray-400">
                          {PERSPECTIVES[project.perspective?.toLowerCase()]
                            ?.label || "General"}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-black text-blue-600">
                          {(project.totalHoursLogged || 0).toFixed(1)}h
                        </span>
                      </div>
                    </div>

                    {/* Mini Progress Bar */}
                    <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all duration-700"
                        style={{ width: `${projectProgress}%` }}
                      />
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-[9px] text-gray-300 uppercase font-bold">
                        Progress
                      </span>
                      <span className="text-[9px] text-gray-400 font-bold">
                        {Math.round(projectProgress)}%
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>
        </section>
      </div>

      {/* QUICK LOG CTA (For Mobile Ease) */}
      <div className="px-6 mt-4">
        <Link
          href="/quick-log"
          className="block w-full py-4 bg-gray-900 text-white rounded-2xl text-center font-bold shadow-lg active:scale-95 transition-transform"
        >
          + Quick Log Time
        </Link>
      </div>
    </main>
  );
}
