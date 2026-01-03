"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext.js";
// Import auth and db directly from your config
import { auth, db } from "@/config/firebase.js";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, getDocs, where } from "firebase/firestore";
import Link from "next/link";
import { PERSPECTIVES } from "@/config/perspectives";

interface ProjectItem {
  id: string;
  name: string;
  perspective: string;
  status: string;
  totalHoursLogged?: number;
  targetHours?: number;
  updatedAt?: string;
}

export default function HomePage() {
  const { user: hookUser, loading: hookLoading } = useAuth();
  const [activeUser, setActiveUser] = useState<any>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [allProjects, setAllProjects] = useState<ProjectItem[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

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
    return [...allProjects].sort((a, b) => {
      const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return dateB - dateA;
    })[0];
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
      {/* BRANDED HEADER */}
      <div className="bg-white px-6 pt-10 pb-8 border-b rounded-b-[2.5rem] shadow-sm">
        <div className="flex items-start justify-between gap-4">
          {/* LEFT SIDE: Identity */}
          <div className="flex-1 min-w-0">
            {" "}
            {/* min-w-0 prevents text from breaking layout */}
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl overflow-hidden shadow-sm border border-gray-100 flex-shrink-0">
                <img
                  src="/icons/icon-192x192.png"
                  alt="Logo"
                  className="w-full h-full object-cover"
                />
              </div>
              <h1 className="text-xl font-black tracking-tighter text-gray-900 leading-tight">
                RETIREWISE <span className="text-blue-600 uppercase">Hub</span>
              </h1>
            </div>
            <p className="text-gray-500 text-xs font-bold uppercase tracking-widest ml-1">
              {new Date().toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
            </p>
            {/* LAST ACTIVITY SNIPPET - Moved here to prevent overlap with ring */}
            {lastActivity && (
              <div className="mt-4 px-3 py-1.5 bg-gray-50 rounded-lg inline-block border border-gray-100">
                <p className="text-[10px] text-gray-400 font-medium italic leading-none">
                  Last active:{" "}
                  <span className="text-gray-700 not-italic font-bold">
                    {lastActivity.name}
                  </span>
                </p>
              </div>
            )}
          </div>

          {/* RIGHT SIDE: Progress Ring */}
          <div className="flex-shrink-0 flex flex-col items-center">
            <div className="relative flex items-center justify-center w-20 h-20">
              <svg className="w-full h-full transform -rotate-90">
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
                  strokeDasharray={213.6}
                  strokeDashoffset={offset}
                  strokeLinecap="round"
                  className="text-blue-600 transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-lg font-black text-gray-900 leading-none">
                  {todayTotal.toFixed(1)}
                </span>
                <span className="text-[8px] text-gray-400 uppercase font-extrabold tracking-tighter">
                  Total Hrs
                </span>
              </div>
            </div>
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
            {Object.entries(PERSPECTIVES).map(([id, config]) => {
              const isActive = activeFilter === id;
              return (
                <button
                  key={id}
                  onClick={() => setActiveFilter(isActive ? null : id)} // Toggle filter
                  className={`text-left p-4 rounded-2xl shadow-sm border transition-all duration-300 ${
                    isActive
                      ? "border-blue-600 ring-2 ring-blue-50 bg-blue-50/30"
                      : "bg-white border-gray-100"
                  }`}
                >
                  <div className="flex items-center justify-between w-full gap-2 overflow-hidden">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xl flex-shrink-0">
                        {config.icon}
                      </span>
                      <span
                        className={`text-[10px] font-black uppercase truncate ${config.color}`}
                      >
                        {config.label}
                      </span>
                    </div>

                    {isActive && (
                      <Link
                        href={`/perspectives/${id}`}
                        className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-white/80 rounded-full shadow-sm"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="text-blue-600 font-bold">→</span>
                      </Link>
                    )}
                  </div>

                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-gray-900">
                      {stats[id].toFixed(1)}
                    </span>
                    <span className="text-xs text-gray-400 font-medium">
                      hrs
                    </span>
                  </div>
                  <div className="mt-3 w-full bg-gray-100 h-1 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${config.bar} transition-all duration-1000`}
                      style={{
                        width: `${Math.min((stats[id] / 20) * 100, 100)}%`,
                      }}
                    />
                  </div>
                </button>
              );
            })}
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
              .filter(
                (p) =>
                  !activeFilter || p.perspective?.toLowerCase() === activeFilter
              )
              .map((project) => {
                // 1. Calculate progress using targetHours (fallback to 20 if empty)
                const goal = project.targetHours || 20;
                const current = project.totalHoursLogged || 0;
                const progress = Math.min((current / goal) * 100, 100);

                return (
                  <div
                    key={project.id}
                    className="bg-white p-4 rounded-xl shadow-sm border border-gray-100"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-bold text-gray-900">
                          {project.name}
                        </h3>
                        <span className="text-[10px] px-2 py-0.5 bg-gray-100 rounded-full text-gray-500 uppercase font-bold">
                          {project.perspective}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-blue-600">
                          {current.toFixed(1)}h
                        </p>
                        <p className="text-[9px] text-gray-400">of {goal}h</p>
                      </div>
                    </div>

                    {/* The Progress Bar */}
                    <div className="relative w-full h-2 bg-gray-100 rounded-full overflow-hidden mt-2">
                      <div
                        className="h-full bg-blue-600 transition-all duration-1000"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            {/* Empty state for filter */}
            {allProjects.filter(
              (p) => p.perspective?.toLowerCase() === activeFilter
            ).length === 0 &&
              activeFilter && (
                <p className="text-center py-10 text-gray-400 text-sm italic">
                  No active {activeFilter} projects found.
                </p>
              )}
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
