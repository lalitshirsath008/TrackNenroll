
import { GoogleGenAI } from "@google/genai";
import { StudentLead, LeadStage } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateSummaryReport = async (leads: StudentLead[]) => {
  try {
    const stats = {
      total: leads.length,
      targeted: leads.filter(l => l.stage === LeadStage.TARGETED).length,
      discarded: leads.filter(l => l.stage === LeadStage.DISCARDED).length,
      forwarded: leads.filter(l => l.stage === LeadStage.FORWARDED).length,
    };

    const prompt = `Analyze these admission stats and provide a strategic summary (max 4 sentences):
    Total Leads: ${stats.total}, Targeted: ${stats.targeted}, Discarded: ${stats.discarded}, Forwarded: ${stats.forwarded}.
    Suggest one improvement for the conversion rate.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: "You are an expert education consultant analyzing admission pipeline performance.",
      }
    });

    return response.text || "Summary analysis unavailable.";
  } catch (error) {
    return "Error generating analysis.";
  }
};

export const solveQuery = async (query: string) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: query,
      config: {
        systemInstruction: "You are the TrackNEnroll AI assistant. Help staff solve queries related to the student enrollment process, lead categorization, and college branches.",
      }
    });
    return response.text;
  } catch (error) {
    return "I'm having trouble connecting to the brain. Try again later.";
  }
};
