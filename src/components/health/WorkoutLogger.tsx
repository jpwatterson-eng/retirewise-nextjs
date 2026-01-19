"use client";

import { useState } from "react";
import { PERSPECTIVES } from "@/config/perspectives";

interface WorkoutLoggerProps {
  onSave: (data: any) => Promise<void>;
  onClose: () => void;
}

export default function WorkoutLogger({ onSave, onClose }: WorkoutLoggerProps) {
  const [type, setType] = useState("Strength");
  const [duration, setDuration] = useState(45);
  const [effort, setEffort] = useState(5);
  const [perspective, setPerspective] = useState("integrator");

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl">
        <div className="p-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-black text-slate-900 italic">
              Log Workout
            </h2>
            <button onClick={onClose} className="text-slate-400">
              ✕
            </button>
          </div>

          <div className="space-y-6">
            {/* Workout Type Selector */}
            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
              {["Strength", "Cardio", "HIIT", "Yoga", "Mobility"].map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    type === t
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Duration Slider */}
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block">
                Duration: {duration}m
              </label>
              <input
                type="range"
                min="5"
                max="180"
                step="5"
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>

            {/* Effort Slider - The "Intensity" Metric */}
            <div>
              <label className="text-[10px] font-black uppercase text-slate-400 mb-2 block flex justify-between">
                <span>Effort (RPE)</span>
                <span className="text-blue-600">{effort}/10</span>
              </label>
              <input
                type="range"
                min="1"
                max="10"
                step="1"
                value={effort}
                onChange={(e) => setEffort(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <div className="flex justify-between mt-2">
                <span className="text-[8px] font-bold text-slate-300 uppercase italic">
                  Recovery
                </span>
                <span className="text-[8px] font-bold text-slate-300 uppercase italic">
                  Max Effort
                </span>
              </div>
            </div>

            {/* Perspective Toggle */}
            <div className="bg-slate-50 p-1 rounded-2xl flex">
              <button
                onClick={() => setPerspective("integrator")}
                className={`flex-1 py-2 rounded-xl text-[10px] font-bold uppercase transition-all ${
                  perspective === "integrator"
                    ? "bg-white shadow-sm text-blue-600"
                    : "text-slate-400"
                }`}
              >
                Integrator
              </button>
              <button
                onClick={() => setPerspective("experimenter")}
                className={`flex-1 py-2 rounded-xl text-[10px] font-bold uppercase transition-all ${
                  perspective === "experimenter"
                    ? "bg-white shadow-sm text-amber-600"
                    : "text-slate-400"
                }`}
              >
                Experimenter
              </button>
            </div>

            <button
              onClick={() =>
                onSave({
                  type,
                  duration,
                  effort,
                  perspective,
                  timestamp: new Date().toISOString(),
                })
              }
              className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black italic shadow-lg active:scale-95 transition-all mt-4"
            >
              Sync to Hub
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
