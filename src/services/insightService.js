// src/services/insightService.js
import { sendMessage } from './aiService';

// src/services/insightService.js

export const suggestJournalPerspectives = async (journalText) => {
  if (!journalText || journalText.length < 10) return [];

  // Simplest format: Just a string. 
  // Your aiService.js handles strings perfectly.
  const prompt = `Analyze this journal entry: "${journalText}"
    Categorize it into: BUILDER, EXPERIMENTER, CONTRIBUTOR, INTEGRATOR.
    Return ONLY a JSON array. Example: ["BUILDER", "CONTRIBUTOR"]`;

  try {
    // Pass the string directly
    const response = await sendMessage(prompt);
    
    // The response from aiService.js comes back as { response: "...", toolsUsed: [] }
    const content = response?.response || ""; 
    if (!content) return [];

    const validCategories = ["BUILDER", "EXPERIMENTER", "CONTRIBUTOR", "INTEGRATOR"];
    
    const matches = content.match(/\[.*\]/);
    if (matches) {
      const parsed = JSON.parse(matches[0]);
      return parsed
        .map(cat => cat.toUpperCase())
        .filter(cat => validCategories.includes(cat));
    }
    return [];
  } catch (e) {
    console.error("AI Suggestion Error:", e);
    return [];
  }
};