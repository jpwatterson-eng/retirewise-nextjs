"use client";

import { useState, useEffect, useCallback } from "react"; // Added useCallback
import { auth, db } from "@/config/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  Timestamp,
  query,
  orderBy,
  limit,
  getDocs,
  where,
} from "firebase/firestore"; // Added query utils
import { PROJECT_IDS } from "@/config/constants";
import IncomeLogger from "@/components/IncomeLogger";
import { ArrowLeft, TrendingUp, Plus, History } from "lucide-react"; // Added History icon
import Link from "next/link";

export default function IncomeApp() {
  const [activeUser, setActiveUser] = useState<any>(null);
  const [showLogger, setShowLogger] = useState(false);
  const [recentLogs, setRecentLogs] = useState<any[]>([]); // ✨ New State for History
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  // 1. Function to fetch history
  const fetchIncomeHistory = useCallback(async (uid: string) => {
    setIsLoadingLogs(true);
    try {
      const logsRef = collection(db, `users/${uid}/income_logs`);
      const q = query(logsRef, orderBy("timestamp", "desc"), limit(5));
      const querySnapshot = await getDocs(q);

      const logs = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setRecentLogs(logs);
    } catch (err) {
      console.error("Error fetching history:", err);
    } finally {
      setIsLoadingLogs(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setActiveUser(user);
      if (user) fetchIncomeHistory(user.uid);
    });
    return () => unsubscribe();
  }, [fetchIncomeHistory]);

  const handleSaveIncome = async (data: { source: string; amount: number }) => {
    if (!activeUser) return;

    try {
      const now = new Date();
      const dateString = now.toISOString().split("T")[0]; // YYYY-MM-DD
      const monthKey = dateString.substring(0, 7); // YYYY-MM

      // 1. Save the individual record with an explicit date
      await addDoc(collection(db, `users/${activeUser.uid}/income_logs`), {
        ...data,
        date: dateString, // ✨ Explicit date for reporting
        monthKey: monthKey, // ✨ Key for monthly aggregation
        timestamp: Timestamp.now(),
      });

      // 2. Fetch all logs for THIS month to calculate the aggregate
      const logsRef = collection(db, `users/${activeUser.uid}/income_logs`);
      const q = query(logsRef, where("monthKey", "==", monthKey));
      const querySnapshot = await getDocs(q);

      // 3. Sum the values
      const aggregateMonthlyTotal = querySnapshot.docs.reduce((sum, doc) => {
        return sum + (doc.data().amount || 0);
      }, 0);

      // 4. Update the Project Pulse with the AGGREGATE
      const projectRef = doc(
        db,
        `users/${activeUser.uid}/projects/${PROJECT_IDS.EXPERIMENTER}`,
      );

      await updateDoc(projectRef, {
        monthlyIncome: aggregateMonthlyTotal, // ✨ Total of all entries this month
        latestYield: (aggregateMonthlyTotal / 5000) * 100,
        updatedAt: new Date().toISOString(),
      });

      // Refresh UI
      await fetchIncomeHistory(activeUser.uid);
      setShowLogger(false);
      alert(
        `Success! Monthly total updated to £${aggregateMonthlyTotal.toLocaleString()}`,
      );
    } catch (err) {
      console.error("Aggregation Error:", err);
    }
  };

  return (
    <main className="min-h-screen bg-[#F8FAFC] p-6">
      {/* HEADER ... same as before */}

      {showLogger ? (
        <IncomeLogger
          onSave={handleSaveIncome}
          onClose={() => setShowLogger(false)}
        />
      ) : (
        <div className="space-y-6">
          {/* SUMMARY CARD ... same as before */}

          {/* ✨ NEW: RECENT HISTORY LIST */}
          <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <History className="w-4 h-4 text-emerald-600" />
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                Recent Yield Events
              </h3>
            </div>

            <div className="space-y-4">
              {recentLogs.length === 0 ? (
                <p className="text-xs text-gray-400 italic py-4 text-center">
                  No experiments logged yet.
                </p>
              ) : (
                recentLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0"
                  >
                    <div>
                      <p className="text-sm font-bold text-gray-900">
                        {log.source}
                      </p>
                      <p className="text-[10px] text-gray-400 font-medium">
                        {log.timestamp?.toDate().toLocaleDateString()}
                      </p>
                    </div>
                    <span className="text-sm font-black text-emerald-600">
                      +£{log.amount.toLocaleString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <button
            onClick={() => setShowLogger(true)}
            className="w-full py-6 bg-white border-2 border-dashed border-emerald-100 rounded-[2rem] flex flex-col items-center justify-center gap-2 group hover:border-emerald-500 transition-all"
          >
            <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center group-hover:bg-emerald-500 transition-colors">
              <Plus className="w-5 h-5 text-emerald-600 group-hover:text-white" />
            </div>
            <span className="text-[10px] font-black text-emerald-800 uppercase tracking-widest">
              Log New Experiment
            </span>
          </button>
        </div>
      )}
    </main>
  );
}
