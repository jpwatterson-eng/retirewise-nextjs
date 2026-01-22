"use client";

import React, { useState } from "react";
import { X } from "lucide-react";

interface IncomeLoggerProps {
  onSave: (data: { source: string; amount: number }) => void;
  onClose: () => void;
}

export default function IncomeLogger({ onSave, onClose }: IncomeLoggerProps) {
  const [amount, setAmount] = useState("");
  const [source, setSource] = useState("");

  const handleSave = () => {
    if (!amount || !source) return;
    onSave({
      source,
      amount: parseFloat(amount),
    });
    setAmount("");
    setSource("");
  };

  return (
    <div className="bg-white p-8 rounded-[2.5rem] border border-emerald-100 shadow-xl relative animate-in fade-in zoom-in duration-200">
      {/* CLOSE BUTTON */}
      <button
        onClick={onClose}
        className="absolute top-6 right-6 p-2 hover:bg-gray-100 rounded-full transition-colors"
      >
        <X className="w-5 h-5 text-gray-400" />
      </button>

      <h3 className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] mb-6">
        New Financial Experiment
      </h3>

      <div className="space-y-6">
        <div>
          <label className="text-[10px] font-bold text-gray-400 uppercase ml-2 mb-2 block">
            Source of Income
          </label>
          <input
            type="text"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="e.g., Shopify, Dividends, Consulting"
            className="w-full p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-emerald-500 text-sm"
          />
        </div>

        <div>
          <label className="text-[10px] font-bold text-gray-400 uppercase ml-2 mb-2 block">
            Amount (£)
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full p-4 bg-gray-50 rounded-2xl border-none text-3xl font-black text-emerald-900 focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <button
          onClick={handleSave}
          className="w-full py-5 bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-emerald-200 active:scale-[0.98] transition-all mt-4"
        >
          Confirm & Sync to Hub 💰
        </button>
      </div>
    </div>
  );
}
