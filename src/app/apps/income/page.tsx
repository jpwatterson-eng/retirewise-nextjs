"use client";

import { useState, useEffect, useCallback } from "react";
import { auth, db } from "@/config/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  getDoc,
  Timestamp,
  query,
  orderBy,
  limit,
  getDocs,
  where,
} from "firebase/firestore";
import { PROJECT_IDS } from "@/config/constants";
import IncomeLogger from "@/components/IncomeLogger";
import {
  ArrowLeft,
  TrendingUp,
  Plus,
  History,
  Trash2,
  Target,
} from "lucide-react";
import Link from "next/link";

export default function IncomeApp() {
  const [activeUser, setActiveUser] = useState<any>(null);
  const [showLogger, setShowLogger] = useState(false);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [monthlyTotal, setMonthlyTotal] = useState(0); // ✨ Global scope for JSX
  const [targetIncome, setTargetIncome] = useState(5000); // ✨ Global scope for JSX

  // 1. Unified Fetch: History, Total, and Target
  const refreshData = useCallback(async (uid: string) => {
    try {
      const now = new Date();
      const monthKey = now.toISOString().substring(0, 7);

      // A. Fetch History (Last 5)
      const logsRef = collection(db, `users/${uid}/income_logs`);
      const historyQ = query(logsRef, orderBy("timestamp", "desc"), limit(5));
      const historySnap = await getDocs(historyQ);
      setRecentLogs(historySnap.docs.map((d) => ({ id: d.id, ...d.data() })));

      // B. Calculate Monthly Total (Aggregation)
      const monthQ = query(logsRef, where("monthKey", "==", monthKey));
      const monthSnap = await getDocs(monthQ);
      const total = monthSnap.docs.reduce(
        (sum, d) => sum + (d.data().amount || 0),
        0,
      );
      setMonthlyTotal(total);

      // C. Fetch Target from Project
      const projectRef = doc(
        db,
        `users/${uid}/projects/${PROJECT_IDS.EXPERIMENTER}`,
      );
      const projectSnap = await getDoc(projectRef);
      if (projectSnap.exists() && projectSnap.data().targetMonthlyIncome) {
        setTargetIncome(projectSnap.data().targetMonthlyIncome);
      }
    } catch (err) {
      console.error("Data fetch error:", err);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setActiveUser(user);
      if (user) refreshData(user.uid);
    });
    return () => unsubscribe();
  }, [refreshData]);

  // 2. Part B: Delete & Re-sync
  const handleDeleteLog = async (logId: string) => {
    if (!activeUser || !window.confirm("Delete this income entry?")) return;

    try {
      // 1. Delete the specific log
      await deleteDoc(doc(db, `users/${activeUser.uid}/income_logs`, logId));

      // 2. Immediately re-calculate the sum from Firestore (to avoid stale state)
      const now = new Date();
      const monthKey = now.toISOString().substring(0, 7);
      const logsRef = collection(db, `users/${activeUser.uid}/income_logs`);
      const q = query(logsRef, where("monthKey", "==", monthKey));
      const querySnapshot = await getDocs(q);

      const newAggregateTotal = querySnapshot.docs.reduce(
        (sum, d) => sum + (d.data().amount || 0),
        0,
      );

      // 3. Update the Project Pulse with the FRESH total
      const projectRef = doc(
        db,
        `users/${activeUser.uid}/projects/${PROJECT_IDS.EXPERIMENTER}`,
      );

      // We calculate yield here using the new total and the current targetIncome state
      await updateDoc(projectRef, {
        monthlyIncome: newAggregateTotal,
        latestYield: (newAggregateTotal / targetIncome) * 100,
        updatedAt: new Date().toISOString(),
      });

      // 4. Refresh local UI state
      await refreshData(activeUser.uid);

      console.log("Sync Complete: Hub total updated to", newAggregateTotal);
    } catch (err) {
      console.error("Delete & Sync failed:", err);
    }
  };

  const handleSaveIncome = async (data: { source: string; amount: number }) => {
    if (!activeUser) return;
    try {
      const now = new Date();
      const dateString = now.toISOString().split("T")[0]; // ✨ Restore the Date field
      const monthKey = dateString.substring(0, 7);

      // 1. Save the new log
      await addDoc(collection(db, `users/${activeUser.uid}/income_logs`), {
        ...data,
        date: dateString, // ✨ Added back
        monthKey,
        timestamp: Timestamp.now(),
      });

      // 2. IMMEDIATE RE-CALCULATION (Don't wait for state)
      const logsRef = collection(db, `users/${activeUser.uid}/income_logs`);
      const q = query(logsRef, where("monthKey", "==", monthKey));
      const querySnapshot = await getDocs(q);

      const newAggregateTotal = querySnapshot.docs.reduce(
        (sum, d) => sum + (d.data().amount || 0),
        0,
      );

      // 3. Update the Project Document (The Hub's Data Source)
      const projectRef = doc(
        db,
        `users/${activeUser.uid}/projects/${PROJECT_IDS.EXPERIMENTER}`,
      );

      await updateDoc(projectRef, {
        monthlyIncome: newAggregateTotal,
        latestYield: (newAggregateTotal / targetIncome) * 100,
        updatedAt: new Date().toISOString(),
      });

      // 4. Finally, refresh the local UI
      await refreshData(activeUser.uid);
      setShowLogger(false);

      console.log("Save & Sync Complete: New Total £", newAggregateTotal);
    } catch (err) {
      console.error("Save error:", err);
    }
  };

  const yieldPercentage = (monthlyTotal / targetIncome) * 100;

  return (
    <main className="min-h-screen bg-[#F8FAFC] p-6">
      <div className="flex justify-between items-center mb-8">
        <Link href="/" className="p-2 bg-white rounded-full shadow-sm">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <h1 className="text-xl font-black italic text-emerald-900">
          EXPERIMENTER
        </h1>
        <div className="w-9" />
      </div>

      {showLogger ? (
        <IncomeLogger
          onSave={handleSaveIncome}
          onClose={() => setShowLogger(false)}
        />
      ) : (
        <div className="space-y-6">
          {/* SUMMARY CARD (Aggregated) */}
          <div className="bg-emerald-900 rounded-[2.5rem] p-8 text-white shadow-xl shadow-emerald-100">
            <p className="text-emerald-300 text-[10px] font-black uppercase tracking-[0.2em] mb-2">
              Current Monthly Yield
            </p>
            <div className="flex items-baseline gap-2">
              <h2 className="text-4xl font-black">
                £{monthlyTotal.toLocaleString()}
              </h2>
              <TrendingUp className="w-6 h-6 text-emerald-400" />
            </div>

            {/* Part C: Progress Bar UI */}
            <div className="mt-6 space-y-2">
              <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-emerald-300/60">
                <span>Progress</span>
                <span>Target: £{targetIncome.toLocaleString()}</span>
              </div>
              <div className="h-3 bg-emerald-800/50 rounded-full overflow-hidden p-0.5 border border-emerald-700">
                <div
                  className="h-full bg-emerald-400 rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(52,211,153,0.5)]"
                  style={{ width: `${Math.min(yieldPercentage, 100)}%` }}
                />
              </div>
              <p className="text-[10px] text-right font-bold text-emerald-400 italic">
                {yieldPercentage.toFixed(1)}% of monthly goal
              </p>
            </div>
          </div>

          {/* HISTORY LIST */}
          <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <History className="w-4 h-4 text-emerald-600" />
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                Recent Logs
              </h3>
            </div>
            <div className="space-y-3">
              {recentLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex justify-between items-center p-3 bg-gray-50 rounded-xl group"
                >
                  <div>
                    <p className="text-xs font-bold text-gray-900">
                      {log.source}
                    </p>
                    <p className="text-[9px] text-gray-400">
                      {log.timestamp?.toDate().toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-black text-emerald-600">
                      +£{log.amount}
                    </span>
                    <button
                      onClick={() => handleDeleteLog(log.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-red-500 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => setShowLogger(true)}
            className="w-full py-6 bg-white border-2 border-dashed border-emerald-100 rounded-[2rem] flex flex-col items-center justify-center gap-2 group hover:border-emerald-500 transition-all"
          >
            <Plus className="w-5 h-5 text-emerald-600" />
            <span className="text-[10px] font-black text-emerald-800 uppercase tracking-widest">
              Log New Income
            </span>
          </button>
        </div>
      )}
    </main>
  );
}
