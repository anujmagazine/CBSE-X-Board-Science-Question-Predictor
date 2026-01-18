
import { GoogleGenAI, Type } from "@google/genai";
import { ChapterResponse } from "../types";

/**
 * Strips markdown code blocks and returns raw text.
 * Prevents JSON.parse from failing if the AI includes wrappers.
 */
const cleanJsonResponse = (raw: string): string => {
  return raw.replace(/```json|```/g, "").trim();
};

export const generateChapterPredictions = async (chapterContent: string, chapterName: string): Promise<ChapterResponse> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API_KEY environment variable is not configured.");
  
  const ai = new GoogleGenAI({ apiKey });
  
  const prompt = `
    Act as a CBSE Class X Science Board Examiner. Use the provided OCR textbook content to predict the most likely questions for the 2026 Board Exam.
    
    CHAPTER NAME: "${chapterName}"
    CHAPTER CONTENT:
    ${chapterContent}
    
    TASK:
    Based on the chapter context and the latest 5-year CBSE patterns (2021-2025), generate 8-10 HIGHLY PROBABLE questions.
    
    CONSTRAINTS:
    1. Include 3 MCQs, 2 VSAs (2 marks), 2 SAs (3 marks), 1-2 LAs (5 marks), and 1 Case-based question.
    2. Focus on "Hotspots" (concepts frequently asked in previous years).
    3. For each question, provide a "probabilityScore" (1-100) and a brief "reasoning" for students.
    
    FORMAT:
    Return ONLY a JSON object with the keys "questions" and "chapterSummary". No other text.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: [{ text: prompt }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  text: { type: Type.STRING },
                  marks: { type: Type.NUMBER },
                  type: { type: Type.STRING },
                  probabilityScore: { type: Type.NUMBER },
                  reasoning: { type: Type.STRING }
                },
                required: ["id", "text", "marks", "type", "probabilityScore", "reasoning"]
              }
            },
            chapterSummary: { type: Type.STRING }
          },
          required: ["questions", "chapterSummary"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("Empty response from AI.");

    const cleanedText = cleanJsonResponse(text);
    return JSON.parse(cleanedText) as ChapterResponse;
  } catch (error: any) {
    console.error("Gemini Service Error:", error);
    // If we have a specific error message from the API, we can handle it here
    if (error.message?.includes("Requested entity was not found")) {
      throw new Error("Model configuration error or API key issue.");
    }
    throw error;
  }
};
