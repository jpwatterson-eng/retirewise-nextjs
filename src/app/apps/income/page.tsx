"use client";

import { useState, useEffect } from "react";
import { auth, db } from "@/config/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  Timestamp,
} from "firebase/firestore";
import { PROJECT_IDS } from "@/config/constants";
import IncomeLogger from "@/components/IncomeLogger";
import { ArrowLeft, TrendingUp, Plus } from "lucide-react";
import Link from "next/link";

export default function IncomeApp() {
  const [activeUser, setActiveUser] = useState<any>(null);
  const [showLogger, setShowLogger] = useState(false); // Start with dashboard view

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setActiveUser(user);
    });
    return () => unsubscribe();
  }, []);

  const handleSaveIncome = async (data: { source: string; amount: number }) => {
    if (!activeUser) return;

    try {
      await addDoc(collection(db, `users/${activeUser.uid}/income_logs`), {
        ...data,
        timestamp: Timestamp.now(),
      });

      const projectRef = doc(
        db,
        `users/${activeUser.uid}/projects/${PROJECT_IDS.EXPERIMENTER}`,
      );

      await updateDoc(projectRef, {
        monthlyIncome: data.amount,
        latestYield: (data.amount / 5000) * 100,
        updatedAt: new Date().toISOString(),
      });

      setShowLogger(false); // Return to dashboard
    } catch (err) {
      console.error("Firebase Error:", err);
    }
  };

  return (
    <main className="min-h-screen bg-[#F8FAFC] p-6">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-8">
        <Link href="/" className="p-2 bg-white rounded-full shadow-sm">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <h1 className="text-xl font-black italic text-emerald-900">
          EXPERIMENTER
        </h1>
        <div className="w-9" /> {/* Spacer */}
      </div>

      {showLogger ? (
        <IncomeLogger
          onSave={handleSaveIncome}
          onClose={() => setShowLogger(false)}
        />
      ) : (
        <div className="space-y-6">
          {/* SUMMARY CARD */}
          <div className="bg-emerald-900 rounded-[2.5rem] p-8 text-white shadow-xl shadow-emerald-100">
            <p className="text-emerald-300 text-[10px] font-black uppercase tracking-[0.2em] mb-2">
              Current Monthly Yield
            </p>
            <div className="flex items-baseline gap-2">
              <h2 className="text-4xl font-black">Success!</h2>
              <TrendingUp className="w-6 h-6 text-emerald-400" />
            </div>
            <p className="mt-4 text-emerald-100/60 text-xs leading-relaxed">
              Your financial experiments are feeding the Hub. Check your
              dashboard to see the drift.
            </p>
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
