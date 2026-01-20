"use client";

import { useState } from "react";
import { X, ChevronRight } from "lucide-react";

interface MetricLoggerProps {
  onSave: (metricData: { type: string; value: number; unit: string }) => void;
  onClose: () => void;
  lastWeight?: number | null;
}

export default function MetricLogger({
  onSave,
  onClose,
  lastWeight,
}: MetricLoggerProps) {
  const [type, setType] = useState("Weight");
  const [value, setValue] = useState(lastWeight?.toString() || "");

  const metrics = [
    { label: "Weight", unit: "kg", icon: "⚖️" },
    { label: "Body Fat", unit: "%", icon: "📉" },
    { label: "RHR", unit: "bpm", icon: "❤️" },
  ];

  const currentUnit = metrics.find((m) => m.label === type)?.unit || "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm pb-10">
      <div className="bg-white w-full max-w-md rounded-[3rem] overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="p-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-black text-slate-900">
              Record Metric
            </h2>
            <button
              onClick={onClose}
              className="p-2 bg-slate-100 rounded-full text-slate-400"
            >
              <X size={20} />
            </button>
          </div>

          {/* Metric Selector */}
          <div className="flex gap-2 mb-8 overflow-x-auto pb-2 no-scrollbar">
            {metrics.map((m) => (
              <button
                key={m.label}
                onClick={() => setType(m.label)}
                className={`px-6 py-3 rounded-2xl text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap ${
                  type === m.label
                    ? "bg-blue-600 text-white"
                    : "bg-slate-50 text-slate-400"
                }`}
              >
                <span>{m.icon}</span> {m.label}
              </button>
            ))}
          </div>

          {/* Value Input */}
          <div className="mb-10">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-4 ml-2">
              Current {type} ({currentUnit})
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.1"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="0.0"
                className="w-full bg-slate-50 border-none rounded-[2rem] p-6 text-4xl font-black text-slate-900 focus:ring-4 focus:ring-blue-100 transition-all outline-none"
                autoFocus
              />
              <span className="absolute right-8 top-1/2 -translate-y-1/2 text-slate-300 font-black italic text-xl">
                {currentUnit}
              </span>
            </div>
          </div>

          <button
            disabled={!value}
            onClick={() =>
              onSave({ type, value: parseFloat(value), unit: currentUnit })
            }
            className="w-full bg-slate-900 text-white p-6 rounded-[2rem] font-black italic flex items-center justify-center gap-3 hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            Update System <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
