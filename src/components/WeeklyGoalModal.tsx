"use client";

import { useState } from "react";
import { PERSPECTIVES } from "@/config/perspectives";
import AI from "@/services/aiService";

interface WeeklyGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (goals: any) => Promise<void>;
  initialGoals?: any;
  allProjects: any[];
}

export default function WeeklyGoalModal({
  isOpen,
  onClose,
  onSave,
  initialGoals,
  allProjects,
}: WeeklyGoalModalProps) {
  // 🔥 Fixes 'setLoadingAI' squiggle
  const [loadingAI, setLoadingAI] = useState(false);

  // 🔥 Fixes 'setGoals' squiggle (standardizing on 'goals' state)
  const [goals, setGoals] = useState(
    initialGoals?.targets || [
      { perspective: "Builder", targetHours: 10, focusNote: "" },
      { perspective: "Integrator", targetHours: 5, focusNote: "" },
      { perspective: "Contributor", targetHours: 5, focusNote: "" },
      { perspective: "Experimenter", targetHours: 2, focusNote: "" },
    ]
  );

  const handleGetAISuggestion = async () => {
    setLoadingAI(true);
    try {
      const prompt = `
      I am planning my week. 
      1. Use your tools to analyze my recent activity and active project targets.
      2. Suggest a weekly hour distribution for my 4 Perspectives: Builder, Integrator, Contributor, and Experimenter.
      3. Total hours should be around 20-25 per week.

      Return ONLY a JSON object in this format:
      {
        "targets": [
          {"perspective": "Builder", "targetHours": 10, "focusNote": "Finish the UI phase"},
          {"perspective": "Integrator", "targetHours": 5, "focusNote": "Synthesize week 3 logs"},
          {"perspective": "Contributor", "targetHours": 5, "focusNote": "Update open source docs"},
          {"perspective": "Experimenter", "targetHours": 2, "focusNote": "Try the new API"}
        ]
      }
    `;

      // Calling the sendMessage function from your aiService.js
      const result = await AI.sendMessage(prompt);

      // Extract JSON from potential conversational text
      const jsonMatch = result.response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);

        // Map the response to ensure perspective casing matches your PERSPECTIVES config
        const formattedTargets = parsed.targets.map((t: any) => ({
          ...t,
          perspective:
            t.perspective.charAt(0).toUpperCase() +
            t.perspective.slice(1).toLowerCase(),
        }));

        setGoals(formattedTargets);
      }
    } catch (error) {
      console.error("AI Suggestion Error:", error);
    } finally {
      setLoadingAI(false);
    }
  };

  if (!isOpen) return null;

  const handleUpdate = (index: number, field: string, value: any) => {
    const newGoals = [...goals];
    newGoals[index] = { ...newGoals[index], [field]: value };
    setGoals(newGoals);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-8">
        <div className="p-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-black text-gray-900 tracking-tighter">
                WEEKLY PLANNING
              </h2>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                Set your momentum targets
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-300 hover:text-gray-900 text-2xl"
            >
              ×
            </button>
          </div>

          {/* 🔥 AI SUGGESTION TRIGGER */}
          <button
            onClick={handleGetAISuggestion}
            disabled={loadingAI}
            className="w-full mb-6 py-3 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-center gap-2 group hover:bg-indigo-100 transition-all disabled:opacity-50"
          >
            {loadingAI ? (
              <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              <span className="text-lg group-hover:scale-110 transition-transform">
                🧠
              </span>
            )}
            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">
              {loadingAI ? "Consulting the Brain..." : "Suggest via AI"}
            </span>
          </button>

          <div className="space-y-6 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
            {goals.map((goal: any, idx: number) => {
              const config = PERSPECTIVES[goal.perspective.toLowerCase()];
              return (
                <div
                  key={goal.perspective}
                  className="bg-gray-50 p-4 rounded-2xl border border-gray-100"
                >
                  <div className="flex justify-between items-center mb-3">
                    <span className="flex items-center gap-2 font-black text-sm uppercase text-gray-700">
                      <span>{config?.icon}</span> {goal.perspective}
                    </span>
                    <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-full border shadow-sm">
                      <input
                        type="number"
                        value={goal.targetHours}
                        onChange={(e) =>
                          handleUpdate(
                            idx,
                            "targetHours",
                            parseFloat(e.target.value)
                          )
                        }
                        className="w-10 text-center font-black text-blue-600 outline-none"
                      />
                      <span className="text-[10px] font-bold text-gray-400 uppercase">
                        hrs
                      </span>
                    </div>
                  </div>
                  <input
                    type="text"
                    placeholder="What is your primary focus here?"
                    value={goal.focusNote}
                    onChange={(e) =>
                      handleUpdate(idx, "focusNote", e.target.value)
                    }
                    className="w-full bg-white border border-gray-100 rounded-xl px-4 py-2 text-xs font-medium text-gray-600 outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              );
            })}
          </div>

          <button
            onClick={() => onSave({ targets: goals })}
            className="w-full mt-8 py-4 bg-gray-900 text-white font-black rounded-2xl shadow-xl active:scale-95 transition-all uppercase tracking-widest text-xs"
          >
            Commit to Weekly Quests
          </button>
        </div>
      </div>
    </div>
  );
}
