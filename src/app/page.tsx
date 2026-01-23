"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext.js";
// Import auth and db directly from your config
import { auth, db } from "@/config/firebase.js";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  query,
  getDocs,
  where,
  addDoc,
  doc,
  getDoc,
} from "firebase/firestore";
import Link from "next/link";
import { PERSPECTIVES } from "@/config/perspectives";
import TimeLogForm from "@/components/TimeLogForm";

// import { requireAuth } from "@/db/unifiedDB";

import { getActiveWeeklyGoals } from "@/db/unifiedDB";
import { format, startOfWeek } from "date-fns";
import * as DB from "@/db/unifiedDB";
import WeeklyGoalModal from "@/components/WeeklyGoalModal";
import { saveWeeklyGoals } from "@/db/unifiedDB"; // Ensure this is exported
import AI from "@/services/aiService";
import { AppRegistry } from "@/lib/appRegistry";
import {
  initializeCoreRegistry,
  registerHealthApp,
  registerIncomeApp,
} from "@/lib/registryController";
import { PROJECT_IDS } from "@/config/constants";

interface ProjectItem {
  id: string;
  name: string;
  perspective: string;
  status: string;
  totalHoursLogged?: number;
  targetHours?: number;
  updatedAt?: string;
  lastSessionDuration?: number;
  latestWeight?: number;
  latestRHR?: number;
  latestYield?: number; // e.g., 12 for 12% coverage
  monthlyIncome?: number; // Absolute value
}

const WEEKLY_TARGETS: Record<string, number> = {
  builder: 10,
  contributor: 5,
  integrator: 5,
  experimenter: 2,
};

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
  const [weeklyTargets, setWeeklyTargets] = useState<any>(null);
  const [viewMode, setViewMode] = useState("app"); // 'app' or 'portfolio'
  const [showGoalModal, setShowGoalModal] = useState(false);

  const [healthReport, setHealthReport] = useState<any>(null);
  const [isSynthesizing, setIsSynthesizing] = useState(false);

  const [registeredApps, setRegisteredApps] = useState<any[]>([]);
  const [isRegistering, setIsRegistering] = useState(false);

  const fetchAllData = useCallback(async () => {
    if (!activeUser) return;
    setIsDataLoading(true);

    try {
      // 1. Fetch Projects (for your Perspective Cards)
      const projectsRef = collection(db, `users/${activeUser.uid}/projects`);
      const projectSnap = await getDocs(projectsRef);

      const projects = projectSnap.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as object),
      })) as ProjectItem[];
      setAllProjects(projects);

      // 2. Fetch THIS WEEK'S logs (for the Momentum Bar)
      const now = new Date();
      const startOfWeek = new Date();
      const day = now.getDay();
      const diff = day === 0 ? -6 : 1 - day; // Monday start logic
      startOfWeek.setDate(now.getDate() + diff);
      startOfWeek.setHours(0, 0, 0, 0);
      const dateGate = startOfWeek.toISOString().split("T")[0];

      const logsRef = collection(db, `users/${activeUser.uid}/timeLogs`);

      // Query logs where date is >= Monday at Midnight
      let q;
      if (viewMode === "app") {
        // Show ONLY RetireWise logs
        q = query(
          logsRef,
          where("date", ">=", dateGate),
          where("sourceApp", "==", "retirewise"),
        );
      } else {
        // Show EVERYTHING (Portfolio View)
        q = query(logsRef, where("date", ">=", dateGate));
      }

      const logSnap = await getDocs(q);
      const logs = logSnap.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as object),
      }));

      // Calculate the sum
      const weeklySum = logs.reduce(
        (sum, log: any) => sum + (log.duration || 0),
        0,
      );

      setWeeklyTotal(weeklySum);
      setCurrentWeekLogs(logs);

      // 2. NEW: Fetch your saved Weekly Targets
      // We import this from unifiedDB. It handles the 'format' and 'startOfWeek' logic.
      console.log("🎯 Hub fetching targets for:", activeUser.uid);
      const targets = await getActiveWeeklyGoals();
      setWeeklyTargets(targets);

      setIsInitialLoadDone(true);
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setIsDataLoading(false);
    }
  }, [activeUser, viewMode]);

  // The Registry Loader

  const loadRegistry = useCallback(async () => {
    if (!activeUser?.uid) return; // Use activeUser instead of hookUser
    try {
      const registry = new AppRegistry(activeUser.uid);
      const apps = await registry.getApps();
      setRegisteredApps(apps);
    } catch (err) {
      console.error("Failed to load registry:", err);
    }
  }, [activeUser?.uid]);

  // Ensure the trigger also uses activeUser
  useEffect(() => {
    if (activeUser) {
      loadRegistry();
    }
  }, [activeUser, loadRegistry]);

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
      (log) => log.type === "retrospective",
    );

    // 2. Only show if goal is met AND it hasn't been claimed yet
    if (weeklyTotal >= 10 && !isDataLoading && !hasClaimedThisWeek) {
      setShowRetro(true);
    } else {
      setShowRetro(false);
    }
  }, [weeklyTotal, isDataLoading, currentWeekLogs]);

  const healthSync = useMemo(() => {
    // Use your specific Health Project ID
    const healthProject = allProjects.find((p) => p.id === PROJECT_IDS.HEALTH);

    return {
      weight: healthProject?.latestWeight || null,
      rhr: healthProject?.latestRHR || null,
    };
  }, [allProjects]);

  // 2. LOGIC FROM PORTFOLIODASHBOARD
  const stats = useMemo(() => {
    const totals = {
      builder: 0,
      contributor: 0,
      integrator: 0,
      experimenter: 0,
    };

    currentWeekLogs.forEach((log: any) => {
      const type = (log.perspective || "").toLowerCase();
      if (totals.hasOwnProperty(type)) {
        totals[type] += log.duration || 0;
      }
    });

    return Object.keys(totals).map((key) => {
      const total = totals[key as keyof typeof totals];

      // 🔥 INTEGRATION: Look for the target in your DB-fetched weeklyTargets first
      const dbTarget = weeklyTargets?.targets?.find(
        (t: any) => t.perspective.toLowerCase() === key,
      );

      const target = dbTarget?.targetHours || WEEKLY_TARGETS[key] || 10;

      return {
        id: key,
        current: total,
        target: target,
        percent: Math.min((total / target) * 100, 100),
        focusNote: dbTarget?.focusNote || "", // Carry over the note from the widget!
      };
    });
  }, [currentWeekLogs, weeklyTargets]); // Add weeklyTargets to dependencies

  const handleSaveGoals = async (goalsData: any) => {
    try {
      await saveWeeklyGoals(goalsData);
      await fetchAllData(); // Refresh the Hub stats
      setShowGoalModal(false);
    } catch (error) {
      console.error("Failed to save goals:", error);
    }
  };

  const portfolioDrift = useMemo(() => {
    const under = stats.filter((s) => s.percent < 30 && s.target > 0);
    const over = stats.filter((s) => s.percent > 110);

    return {
      isDrifting: under.length > 0 || over.length > 0,
      under,
      over,
    };
  }, [stats]);

  const runVisualSynthesis = async () => {
    setIsSynthesizing(true);
    try {
      // 1. We make the prompt more conversational but strict about the final goal
      const prompt = `
      I need a Portfolio Health Audit for my current week.
      
      STEP 1: Use your tools (get_recent_activity and get_weekly_synthesis) to examine my logs and targets.
      STEP 2: Once you have the data, analyze it for 'Portfolio Drift'.
      STEP 3: Finally, output a JSON report with your findings. 
      
      Do NOT just finish with a tool call. You MUST provide the final JSON summary.

      {
        "score": number, 
        "status": "Momentum" | "Drifting" | "Imbalanced" | "Peak",
        "insight": "A sharp, specific one-sentence observation.",
        "tactics": ["Action 1", "Action 2", "Action 3"]
      }
    `;

      let result = await AI.sendMessage(prompt);

      // 2. 🔥 THE NUDGE: If the AI returns empty text after tool use (as seen in logs),
      // we send a tiny follow-up message to force the summary.
      if (!result.response || result.response.trim() === "") {
        console.log("AI was silent after tool use. Sending a nudge...");
        result = await AI.sendMessage(
          "Excellent. Now, based on those results, provide the final JSON report as requested.",
        );
      }

      // 3. Robust JSON Extraction
      const firstBracket = result.response.indexOf("{");
      const lastBracket = result.response.lastIndexOf("}");

      if (firstBracket !== -1 && lastBracket !== -1) {
        const jsonString = result.response.substring(
          firstBracket,
          lastBracket + 1,
        );
        setHealthReport(JSON.parse(jsonString));
      } else {
        throw new Error("JSON not found in final response");
      }
    } catch (error) {
      console.error("Synthesis failed:", error);
      setHealthReport({
        score: 0,
        status: "Syncing...",
        insight:
          "The Brain is processing a lot of data. Try one more time to generate the report.",
        tactics: ["The second click usually forces the summary."],
      });
    } finally {
      setIsSynthesizing(false);
    }
  };

  const todayTotal = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    // If your project documents don't have individual log dates,
    // you might need to fetch today's logs specifically.
    // For now, let's sum up all 'duration' fields from logs created today.
    return allProjects.reduce(
      (acc, proj) => acc + (proj.totalHoursLogged || 0),
      0,
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

  // 1. Calculate the Dynamic Weekly Goal from your saved targets
  const dynamicWeeklyGoal = useMemo(() => {
    // If we have saved targets, sum up their targetHours
    if (weeklyTargets?.targets?.length > 0) {
      return weeklyTargets.targets.reduce(
        (sum: number, t: any) => sum + (t.targetHours || 0),
        0,
      );
    }
    // Fallback to your old default if no targets exist yet
    return 15;
  }, [weeklyTargets]);

  // 2. Update the progress calculation to use the dynamic goal
  const weeklyProgress =
    weeklyTotal > 0
      ? Math.min((weeklyTotal / dynamicWeeklyGoal) * 100, 100)
      : 0;

  // 1. FIRST GUARD: Firebase is still "waking up"
  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">
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
          <div className="bg-white px-6 pt-4 pb-4 border-b rounded-[2.5rem] shadow-sm">
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

                {/* 🔥 PHASE 6: THE PORTFOLIO TOGGLE */}
                <div className="flex bg-gray-100/80 p-1 rounded-xl w-fit mt-3 mb-1 border border-gray-100">
                  <button
                    onClick={() => setViewMode("app")}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                      viewMode === "app"
                        ? "bg-white shadow-sm text-blue-600"
                        : "text-gray-400 hover:text-gray-500"
                    }`}
                  >
                    RetireWise
                  </button>
                  <button
                    onClick={() => setViewMode("portfolio")}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                      viewMode === "portfolio"
                        ? "bg-white shadow-sm text-blue-600"
                        : "text-gray-400 hover:text-gray-500"
                    }`}
                  >
                    Portfolio
                  </button>
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
                      / {dynamicWeeklyGoal}h
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

            {/* UPDATED SYNTHESIS SECTION */}
            {/* UPDATED ACTION ROW */}
            <div className="px-6 mb-8">
              {!healthReport ? (
                /* 1. FLEX WRAPPER FOR SIDE-BY-SIDE BUTTONS */
                <div className="flex gap-2 items-stretch">
                  <button
                    onClick={runVisualSynthesis}
                    disabled={isSynthesizing}
                    className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
                  >
                    {isSynthesizing ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <span className="text-sm">🌓</span>
                        <span>Portfolio Synthesis</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => setShowGoalModal(true)}
                    className="flex-1 py-4 bg-white border border-gray-200 text-gray-600 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-sm flex items-center justify-center gap-2 active:scale-95 transition-all hover:bg-gray-50"
                  >
                    <span className="text-sm">🎯</span>
                    <span>Plan</span>
                  </button>
                </div>
              ) : (
                /* 2. SHOW THE REPORT (with Plan button still accessible underneath) */
                <div className="space-y-4">
                  <div className="bg-white p-6 rounded-[2.5rem] border border-indigo-100 shadow-xl animate-in zoom-in-95 duration-300">
                    <div className="flex justify-between items-center mb-4">
                      <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                        {healthReport.status}
                      </span>
                      <span className="text-2xl font-black text-indigo-600">
                        {healthReport.score}%
                      </span>
                    </div>

                    <p className="text-sm font-bold text-gray-800 leading-tight mb-4 italic">
                      "{healthReport.insight}"
                    </p>

                    <div className="space-y-2 mb-4">
                      {healthReport.tactics.map((tactic: string, i: number) => (
                        <div
                          key={i}
                          className="flex gap-2 text-[11px] font-medium text-gray-600"
                        >
                          <span className="text-indigo-400">→</span> {tactic}
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => setHealthReport(null)}
                      className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mx-auto hover:text-gray-600"
                    >
                      Dismiss Report
                    </button>
                  </div>

                  {/* Keep the Plan button visible even when report is shown to allow immediate course-correction */}
                  <button
                    onClick={() => setShowGoalModal(true)}
                    className="w-full py-3 bg-white border border-gray-200 text-gray-500 rounded-2xl font-black uppercase tracking-widest text-[9px] flex items-center justify-center gap-2"
                  >
                    🎯 Adjust Weekly Plan
                  </button>
                </div>
              )}
            </div>

            {/*Portfolio drift */}
            {portfolioDrift.isDrifting && (
              <div className="px-6 mb-4 animate-in fade-in slide-in-from-bottom-2">
                <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-start gap-3">
                  <span className="text-xl">⚖️</span>
                  <div>
                    <h4 className="text-amber-900 font-black text-[10px] uppercase tracking-widest">
                      Portfolio Drift Detected
                    </h4>
                    <p className="text-amber-800 text-xs font-medium leading-tight mt-1">
                      {portfolioDrift.under.length > 0 &&
                        `Focus is low on ${portfolioDrift.under
                          .map((s) => s.id)
                          .join(", ")}. `}
                      {portfolioDrift.over.length > 0 &&
                        `You're over-indexing on ${portfolioDrift.over
                          .map((s) => s.id)
                          .join(", ")}.`}
                    </p>
                  </div>
                </div>
              </div>
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
          </div>

          <div className="p-6 space-y-8">
            {/* 3. PERSPECTIVE SUMMARY GRID (Simplified PerspectiveCard Logic) */}
            <section>
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
                Perspective Balance
              </h2>
              <div className="grid grid-cols-2 gap-3 px-6">
                {" "}
                {/* Reduced gap for 2-column fit */}
                {stats.map((stat) => {
                  const config =
                    PERSPECTIVES[stat.id as keyof typeof PERSPECTIVES];
                  if (!config) return null;

                  return (
                    <Link
                      key={stat.id}
                      href={`/perspectives/${stat.id}`}
                      className="bg-white p-4 rounded-[1.5rem] shadow-sm border border-gray-100 active:scale-95 transition-transform flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-xl">{config.icon}</span>
                          <span
                            className={`text-xs font-black ${config.color.replace(
                              "bg-",
                              "text-",
                            )}`}
                          >
                            {stat.current.toFixed(1)}h
                          </span>
                        </div>
                        <h3 className="text-[10px] font-black text-gray-900 uppercase tracking-tighter mb-2">
                          {config.label}
                        </h3>
                      </div>

                      <div>
                        <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden mb-2">
                          <div
                            className={`h-full ${
                              config.bar || config.bg
                            } transition-all duration-1000`}
                            style={{ width: `${stat.percent}%` }}
                          />
                        </div>
                        <div className="flex justify-between items-center text-[8px] font-bold text-gray-400 uppercase">
                          <span>Goal: {stat.target}h</span>
                          <span>{Math.round(stat.percent)}%</span>
                        </div>
                      </div>
                    </Link>
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

              <div className="space-y-2">
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
                        new Date(b.date).getTime() - new Date(a.date).getTime(),
                    )
                    .slice(0, 5) // Just the last 5 entries
                    .map((log) => {
                      // 1. Normalize the perspective key (handles "Builder" -> "builder")
                      const pId = log.perspective?.toLowerCase() || "";

                      // 2. Direct lookup in the PERSPECTIVES object
                      const pConfig = PERSPECTIVES[pId];

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
                          className="flex items-center gap-2 py-2 border-b border-gray-50 last:border-0"
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

            {/* 4. ACTIVE PROJECTS LIST (mb-32) */}
            <section className="mb-8">
              {" "}
              {/* Increased margin to clear the Dock */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                  Pillar Intelligence
                </h2>
                <Link
                  href="/projects"
                  className="text-blue-600 text-[10px] font-black uppercase tracking-widest"
                >
                  Manage All →
                </Link>
              </div>
              <div className="space-y-4">
                {allProjects
                  .filter((p) => p.status === "active")
                  .map((project) => {
                    const isHealth = project.id === PROJECT_IDS.HEALTH;
                    const isIncome = project.id === PROJECT_IDS.EXPERIMENTER;
                    const goal = project.targetHours || 10;
                    const current = project.totalHoursLogged || 0;
                    const progress = Math.min((current / goal) * 100, 100);

                    return (
                      <div
                        key={project.id}
                        className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <span className="text-[9px] font-black text-blue-500 uppercase tracking-[0.2em] block mb-1">
                              {project.perspective}
                            </span>
                            <h3 className="font-bold text-gray-900 leading-tight">
                              {project.name}
                            </h3>
                          </div>
                          <div className="text-right">
                            <p className="text-xl font-black text-gray-900 leading-none">
                              {current.toFixed(1)}h
                            </p>
                            <p className="text-[9px] font-bold text-gray-400 uppercase italic">
                              Weekly Momentum
                            </p>
                          </div>
                        </div>

                        {/* Specialized Pulse Data */}
                        {(isHealth || isIncome) && (
                          <div className="mb-4 p-3 bg-gray-50 rounded-2xl flex justify-between items-center border border-gray-100/50">
                            {isIncome ? (
                              <>
                                <span className="text-[10px] font-black text-emerald-600 uppercase italic">
                                  💰 Yield: {project.latestYield?.toFixed(1)}%
                                </span>
                                <span className="text-[10px] font-black text-slate-800">
                                  £{project.monthlyIncome?.toLocaleString()}
                                </span>
                              </>
                            ) : (
                              <>
                                <span className="text-[10px] font-black text-red-500 flex items-center gap-1">
                                  ❤️ {project.latestRHR || "--"} RHR
                                </span>
                                <span className="text-[10px] font-black text-slate-500 italic">
                                  ⚖️ {project.latestWeight || "--"}kg
                                </span>
                              </>
                            )}
                          </div>
                        )}

                        {/* Progress Track */}
                        <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-1000 ${isIncome ? "bg-emerald-500" : isHealth ? "bg-red-400" : "bg-blue-500"}`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}

                {/* Empty state for filter */}
                {allProjects.filter(
                  (p) => p.perspective?.toLowerCase() === activeFilter,
                ).length === 0 &&
                  activeFilter && (
                    <p className="text-center py-10 text-gray-400 text-sm italic">
                      No active {activeFilter} projects found.
                    </p>
                  )}
              </div>
              {/* ✨ THE FIX: Explicit Spacer at the end of the scrollable content */}
              <div className="h-24 w-full" aria-hidden="true" />
            </section>

            <WeeklyGoalModal
              isOpen={showGoalModal}
              onClose={() => setShowGoalModal(false)}
              onSave={handleSaveGoals}
              initialGoals={weeklyTargets}
              allProjects={allProjects} // 🔥 Ensure this prop is passed!
            />
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
