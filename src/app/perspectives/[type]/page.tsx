"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import { auth, db } from "@/config/firebase.js";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import Link from "next/link";

import { PERSPECTIVES } from "@/config/perspectives";

export default function PerspectiveDeepDive() {
  const { type } = useParams();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const config = PERSPECTIVES[type as string] || PERSPECTIVES.builder;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u) setUser(u);
      else router.push("/");
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !config) return;

    const fetchPerspectiveData = async () => {
      try {
        // Check for both "Builder" (label) and "builder" (id)
        // This covers you if some records are capitalized and others aren't
        const q = query(
          collection(db, `users/${user.uid}/projects`),
          where("perspective", "in", [config.label, config.id])
        );

        const snap = await getDocs(q);
        const fetchedProjects = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        setProjects(fetchedProjects);
      } catch (err) {
        console.error("Deep Dive Error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPerspectiveData();
  }, [user, config]);

  const totalHours = projects.reduce(
    (acc, p) => acc + (p.totalHoursLogged || 0),
    0
  );

  if (loading)
    return <div className="p-10 text-center">Loading {config.label}...</div>;

  return (
    <main className="min-h-screen bg-gray-50 pb-20">
      {/* HEADER */}
      <div
        className={`${config.bg} px-6 pt-12 pb-8 border-b rounded-b-[2.5rem]`}
      >
        <button
          onClick={() => router.back()}
          className="mb-4 text-gray-500 flex items-center gap-1"
        >
          ← Back to Hub
        </button>
        <div className="flex justify-between items-end">
          <div>
            <span className="text-4xl mb-2 block">{config.icon}</span>
            <h1
              className={`text-3xl font-black ${config.color} uppercase tracking-tight`}
            >
              {config.label}
            </h1>
          </div>
          <div className="text-right">
            <p className="text-4xl font-black text-gray-900">
              {totalHours.toFixed(1)}
            </p>
            <p className="text-xs font-bold text-gray-400 uppercase">
              Total Hours
            </p>
          </div>
        </div>
      </div>

      {/* PROJECT BREAKDOWN */}
      <div className="p-6">
        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">
          Focus Areas
        </h2>
        <div className="space-y-4">
          {projects.map((p) => (
            <div
              key={p.id}
              className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100"
            >
              <h3 className="font-bold text-gray-800 mb-1">{p.name}</h3>
              <div className="flex justify-between text-xs text-gray-500 mb-3">
                <span>Progress</span>
                <span>
                  {p.totalHoursLogged || 0} / {p.targetHours || 20}h
                </span>
              </div>
              <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-1000 ${config.color.replace(
                    "text",
                    "bg"
                  )}`}
                  style={{
                    width: `${Math.min(
                      ((p.totalHoursLogged || 0) / (p.targetHours || 20)) * 100,
                      100
                    )}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
