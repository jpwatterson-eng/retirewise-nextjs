"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext.js";
// Import auth and db directly from your config
import { auth, db } from "@/config/firebase.js";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, getDocs, where, addDoc } from "firebase/firestore";
import Link from "next/link";
import { PERSPECTIVES } from "@/config/perspectives";
import TimeLogForm from "@/components/TimeLogForm";

interface ProjectItem {
  id: string;
  name: string;
  perspective: string;
  status: string;
  totalHoursLogged?: number;
  targetHours?: number;
  updatedAt?: string;
  lastSessionDuration?: number;
}

export default function HomePage() {
  const { user: hookUser, loading: hookLoading } = useAuth();
  const [activeUser, setActiveUser] = useState<any>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [allProjects, setAllProjects] = useState<ProjectItem[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const { currentUser, loading: authLoading } = useAuth();
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [isInitialLoadDone, setIsInitialLoadDone] = useState(false);
  const [weeklyTotal, setWeeklyTotal] = useState<number>(0);
  const [currentWeekLogs, setCurrentWeekLogs] = useState<any[]>([]);

  const [showRetro, setShowRetro] = useState(false);
  const [retroText, setRetroText] = useState("");

  const [showTimeLog, setShowTimeLog] = useState(false);
  const [editingTimeLog, setEditingTimeLog] = useState(null);

  const fetchAllData = useCallback(async () => {
    if (!activeUser) return;
    setIsDataLoading(true);

    try {
      // 1. Fetch Projects (for your Perspective Cards)
      const projectsRef = collection(db, `users/${activeUser.uid}/projects`);
      const projectSnap = await getDocs(projectsRef);
      const projects = projectSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as ProjectItem[];
      setAllProjects(projects);

      // 2. Fetch THIS WEEK'S logs (for the Momentum Bar)
      const now = new Date();
      // const startOfWeek = new Date(now);
      const startOfWeek = new Date();
      const day = now.getDay();
      const diff = day === 0 ? -6 : 1 - day; // Monday start logic

      startOfWeek.setDate(now.getDate() + diff);
      startOfWeek.setHours(0, 0, 0, 0);
      const dateGate = startOfWeek.toISOString().split("T")[0];

      const logsRef = collection(db, `users/${activeUser.uid}/timeLogs`);
      // Query logs where date is >= Monday at Midnight
      const q = query(logsRef, where("date", ">=", dateGate));
      const logSnap = await getDocs(q);

      // Map the logs to a local array
      const logs = logSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Calculate the sum
      const weeklySum = logs.reduce(
        (sum, log: any) => sum + (log.duration || 0),
        0
      );

      // Update our new states
      setWeeklyTotal(weeklySum);
      setCurrentWeekLogs(logs);

      setIsInitialLoadDone(true);
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setIsDataLoading(false);
    }
  }, [activeUser]);

  // 2. The Initial Load Effect
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // 3. The "Focus" Listener (Fixes the 1h delay on phone)
  useEffect(() => {
    const onFocus = () => fetchAllData();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [fetchAllData]);

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
    if (!activeUser) {
      // If there is no user, we can't fetch data, so stop the spinner
      setIsDataLoading(false);
      return;
    }

    fetchAllData();
  }, [activeUser]);

  useEffect(() => {
    // 1. Check if a retrospective has already been logged this week
    const hasClaimedThisWeek = currentWeekLogs.some(
      (log) => log.type === "retrospective"
    );

    // 2. Only show if goal is met AND it hasn't been claimed yet
    if (weeklyTotal >= 10 && !isDataLoading && !hasClaimedThisWeek) {
      setShowRetro(true);
    } else {
      setShowRetro(false);
    }
  }, [weeklyTotal, isDataLoading, currentWeekLogs]);

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

  const pillarSplit = useMemo(() => {
    const split: Record<string, number> = {};

    currentWeekLogs.forEach((log) => {
      // FIX: Force to lowercase so "Builder" and "builder" sum together
      const pName = (log.perspective || "other").toLowerCase();
      split[pName] = (split[pName] || 0) + (log.duration || 0);
    });

    return split;
  }, [currentWeekLogs]);

  const WEEKLY_GOAL = 15;
  const weeklyProgress =
    weeklyTotal > 0 ? Math.min((weeklyTotal / WEEKLY_GOAL) * 100, 100) : 0;

  // 1. FIRST GUARD: Firebase is still "waking up"
  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400 text-xs font-bold uppercase tracking-widest tracking-widest">
            Checking Auth...
          </p>
        </div>
      </div>
    );
  }

  // 1. Check if Firebase is still loading the auth state
  if (authLoading) {
    return <div className="spinner">Syncing Auth...</div>;
  }

  // 2. Check if the user is actually logged in
  if (!currentUser) {
    return (
      <div className="login-prompt">
        <Link href="/login">Log In to Hub</Link>
      </div>
    );
  }

  // 2. SECOND GUARD: We checked, and nobody is logged in
  if (!activeUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6 text-center">
        <div className="max-w-xs w-full">
          <h1 className="text-2xl font-black mb-2 italic">RetireWise</h1>
          <p className="text-gray-500 mb-8 text-sm">
            Your session has expired or you are not logged in.
          </p>
          <Link
            href="/login"
            className="block w-full bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-blue-100"
          >
            Log In to Hub
          </Link>
        </div>
      </div>
    );
  }

  // 3. THIRD GUARD: User is here, but we are fetching their data (The Spinner Killer)
  if (isInitializing || authLoading || isDataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">
            Syncing Hub...
          </p>
        </div>
      </div>
    );
  }

  const portfolioGoal = 300;
  // Calculate percentage (0 to 100)
  const progressPercent = Math.min((todayTotal / portfolioGoal) * 100, 100);

  // SVG math: The circumference of a circle with r=34 is 2 * π * 34 ≈ 213.6
  const circumference = 2 * Math.PI * 34;
  const offset = circumference - (progressPercent / 100) * circumference;

  const handleCollectBonus = async () => {
    if (!retroText || !activeUser) return;

    try {
      await addDoc(collection(db, `users/${activeUser.uid}/timeLogs`), {
        type: "retrospective",
        notes: retroText,
        weeklyTotalHours: weeklyTotal,
        date: new Date().toISOString().split("T")[0],
        createdAt: new Date().toISOString(),
        isBonusClaimed: true,
      });

      // FIX: Hide the UI and clear text immediately
      setShowRetro(false);
      setRetroText("");

      // FIX: Trigger a full data refresh to sync the Hub
      await fetchAllData();

      alert("Bonus Claimed! You've integrated your wins for the week.");
    } catch (e) {
      console.error("Error claiming bonus:", e);
    }
  };

  // may want pt-4 in main //
  return (
    <main className="min-h-screen bg-gray-50 pb-24">
      {/* If we aren't done loading the first time, show NOTHING or a Full Screen Spinner */}
      {!isInitialLoadDone ? (
        <div className="min-h-screen flex items-center justify-center bg-white">
          <div className="animate-pulse text-[10px] font-black text-gray-300 uppercase tracking-[0.3em]">
            Synchronizing...
          </div>
        </div>
      ) : (
        <>
          {/* HEADER SECTION */}
          <div className="bg-white px-6 pt-4 pb-4 border-b rounded-b-[2.5rem] shadow-sm">
            <div className="flex items-center justify-between px-6 pt-1 mb-2">
              {/* LEFT SIDE: Identity */}
              <div className="flex-1 min-w-0">
                {/* min-w-0 prevents text from breaking layout */}
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    {weeklyTotal > 0 ? "Momentum Active" : "Ready to Start"}
                  </span>
                </div>
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

            <div className="flex justify-between items-center px-6 pt-1 mb-2">
              <p className="text-gray-500 text-xs font-bold uppercase tracking-widest ml-1">
                {new Date().toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
              </p>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  {weeklyTotal > 0 ? "Momentum Active" : "Ready to Start"}
                </span>
              </div>
            </div>
          </div>

          {/* MONDAY MORNING REVIEW / QUEST START  */}
          {!isInitialLoadDone &&
            !isDataLoading &&
            activeUser &&
            weeklyTotal === 0 && (
              <div className="px-6 mb-4 animate-in fade-in slide-in-from-top-2">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 rounded-2xl shadow-lg shadow-blue-100 border border-blue-400/20">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center animate-pulse">
                      <span className="text-xl">🚀</span>
                    </div>
                    <div>
                      <h4 className="text-white font-black text-sm uppercase tracking-tight">
                        New Week, New Quests
                      </h4>
                      <p className="text-blue-100 text-[10px] font-medium leading-tight opacity-90">
                        Your 15h momentum bar has reset. Which project gets your
                        first hour?
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

          {/* WEEKLY MOMENTUM BAR */}
          <div className="px-6 mb-8">
            <div className="bg-white p-5 rounded-[2.5rem] shadow-sm border border-gray-100">
              <div className="flex justify-between items-end mb-4">
                <div>
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">
                    Weekly Momentum
                  </h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-gray-900 leading-none">
                      {weeklyTotal.toFixed(1)}
                    </span>
                    <span className="text-gray-400 text-sm font-bold italic">
                      / {WEEKLY_GOAL}h
                    </span>
                  </div>
                </div>

                {/* Percentage Badge */}
                <div className="bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                  <span className="text-[10px] font-black text-blue-600 uppercase">
                    {Math.round(weeklyProgress)}%
                  </span>
                </div>
              </div>

              {/* The Progress Track */}
              <div className="relative w-full h-4 bg-gray-100 rounded-full overflow-hidden shadow-inner border-2 border-white">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-1000 ease-out rounded-full"
                  style={{ width: `${weeklyProgress}%` }}
                />
              </div>

              <p className="mt-3 text-[10px] text-gray-400 font-bold uppercase tracking-widest text-center">
                {new Date().getDay() === 0
                  ? "Ends Tonight at Midnight"
                  : "New Week Started"}
              </p>
            </div>

            {weeklyTotal > 0 && (
              <p className="mt-4 text-[9px] text-gray-300 font-bold uppercase tracking-[0.15em] text-center border-t border-gray-50 pt-4">
                Current Week Distribution
              </p>
            )}

            {showRetro && (
              <div className="px-6 mb-8 animate-in zoom-in-95 duration-500">
                <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-[2.5rem] p-8 shadow-xl shadow-purple-200 relative overflow-hidden">
                  {/* Decorative background elements */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />

                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="bg-yellow-400 text-[10px] font-black px-2 py-1 rounded-md text-purple-900 uppercase">
                        Level-Up Bonus
                      </span>
                      <h3 className="text-white font-black italic tracking-tighter">
                        Weekly Retrospective
                      </h3>
                    </div>

                    <p className="text-purple-100 text-sm mb-6 leading-relaxed">
                      You have hit **{weeklyTotal}h** of momentum! What’s one
                      thing you integrated this week that moves the needle for
                      your future?
                    </p>

                    <textarea
                      value={retroText}
                      onChange={(e) => setRetroText(e.target.value)}
                      placeholder="Type your reflection..."
                      className="w-full bg-white/10 border border-white/20 rounded-2xl p-4 text-white placeholder:text-purple-300 text-sm focus:ring-2 focus:ring-yellow-400 outline-none transition-all"
                      rows={3}
                    />

                    <button
                      onClick={handleCollectBonus}
                      className="w-full mt-4 py-4 bg-yellow-400 text-purple-900 font-black rounded-2xl shadow-lg hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-widest text-xs"
                    >
                      Claim Level-Up Bonus ✨
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* PILLAR BREAKDOWN LEGEND */}
            <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-gray-50">
              {Object.entries(pillarSplit).map(([name, hours]) => {
                if (hours <= 0) return null;

                // FIX: Direct lookup using the normalized lowercase name
                const pConfig = PERSPECTIVES[name];

                return (
                  <div key={name} className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        pConfig?.bar || "bg-gray-300"
                      }`}
                    />
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-tighter">
                      {pConfig?.label || name}
                    </span>
                    <span className="text-[10px] font-bold text-gray-900">
                      {hours.toFixed(1)}h
                    </span>
                  </div>
                );
              })}
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

            {/* RECENT ACTIVITY FEED */}
            <div className="px-6 mt-10 mb-20">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                  Recent Activity
                </h3>
                {currentWeekLogs.length > 0 && (
                  <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md">
                    This Week
                  </span>
                )}
              </div>

              <div className="space-y-3">
                {currentWeekLogs.length === 0 ? (
                  <div className="bg-gray-50 border-2 border-dashed border-gray-100 rounded-3xl p-8 text-center">
                    <p className="text-gray-400 text-xs font-medium">
                      No logs recorded yet this week.
                    </p>
                  </div>
                ) : (
                  currentWeekLogs
                    .sort(
                      (a, b) =>
                        new Date(b.date).getTime() - new Date(a.date).getTime()
                    )
                    .slice(0, 5) // Just the last 5 entries
                    .map((log) => {
                      // 1. Normalize the perspective key (handles "Builder" -> "builder")
                      const pId = log.perspective?.toLowerCase() || "";

                      // 2. Direct lookup in the PERSPECTIVES object
                      const pConfig = PERSPECTIVES[pId];
                      console.log(
                        "Log Project:",
                        log.projectName,
                        "Raw Perspective:",
                        log.perspective
                      );
                      // 3. Time Display Logic
                      const dateObj = new Date(log.date);
                      const displayTime = log.date.includes("T")
                        ? dateObj.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "Day Log";

                      // 4. Determine Bar Color (Using the 'bar' property from your config)
                      // Fallback to bg-gray-200 if no perspective exists or it's not in the config
                      const barClass = pConfig?.bar || "bg-gray-200";
                      const labelText = pConfig?.label || "General";

                      return (
                        <div
                          key={log.id}
                          className="flex items-center gap-4 py-3 border-b border-gray-50 last:border-0"
                          onClick={() => {
                            setEditingTimeLog(log); // You'll need to add this state to page.tsx
                            setShowTimeLog(true);
                          }}
                        >
                          {/* The Vertical Bar */}
                          <div
                            className={`w-1.5 h-10 rounded-full transition-colors ${barClass}`}
                          />
                          <div className="flex-1">
                            <div className="flex justify-between items-start">
                              <p className="text-sm font-bold text-gray-900">
                                {log.projectName || "General Entry"}
                              </p>
                              <p className="text-sm font-black text-gray-900">
                                {(log.hours || log.duration || 0).toFixed(1)}h
                              </p>
                            </div>
                            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">
                              {displayTime} • {labelText}
                            </p>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </div>

            {/* 4. ACTIVE PROJECTS LIST */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                  Active Projects
                </h2>
                <Link
                  href="/projects"
                  className="text-blue-600 text-xs font-bold"
                >
                  View All
                </Link>
              </div>
              <div className="space-y-3">
                {allProjects
                  .filter((p) => p.status === "active")
                  .filter(
                    (p) =>
                      !activeFilter ||
                      p.perspective?.toLowerCase() === activeFilter
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
                            <p className="text-[9px] text-gray-400">
                              of {goal}h
                            </p>
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
        </>
      )}
      {showTimeLog && (
        <TimeLogForm
          log={editingTimeLog}
          projectId={editingTimeLog?.projectId || ""}
          projectName={editingTimeLog?.projectName || "Legacy/Orphaned Record"}
          onClose={() => {
            setShowTimeLog(false);
            setEditingTimeLog(null);
          }}
          onSaved={() => {
            setShowTimeLog(false);
            setEditingTimeLog(null);
            // Change fetchWeekLogs to fetchAllData to match your file
            fetchAllData();
          }}
        />
      )}
    </main>
  );
}
