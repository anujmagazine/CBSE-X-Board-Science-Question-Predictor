
import { GoogleGenAI, Type } from "@google/genai";
import { ChapterResponse, AnswersResponse, Question } from "../types";

const cleanJsonResponse = (raw: string): string => {
  return raw.replace(/```json|```/g, "").trim();
};

export const generateChapterPredictions = async (
  chapterContent: string, 
  chapterName: string,
  existingQuestions: Question[] = []
): Promise<ChapterResponse> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const isMore = existingQuestions.length > 0;
  const prompt = `
    Act as a CBSE Class X Science Board Examiner.
    CHAPTER: "${chapterName}"
    CONTENT: ${chapterContent}
    
    ${isMore ? `The following questions have already been generated: ${existingQuestions.map(q => q.text).join(' | ')}. Generate 5-7 NEW, DIFFERENT high-probability questions.` : 'Generate 8-10 HIGHLY PROBABLE questions for the 2026 Board Exam.'}
    
    CONSTRAINTS:
    1. Focus on "Hotspots" (frequently asked concepts).
    2. Provide probabilityScore (1-100) and brief reasoning.
    3. For type 'MCQ', you MUST provide exactly 4 distinct choices in the "options" array. For other types, "options" should be null or an empty array.
    4. Output must be strict JSON with "questions" and "chapterSummary".
  `;

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
                type: { 
                  type: Type.STRING,
                  description: "One of: MCQ, VSA, SA, LA, CASE"
                },
                probabilityScore: { type: Type.NUMBER },
                reasoning: { type: Type.STRING },
                options: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "Exactly 4 options if type is MCQ, otherwise empty."
                }
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

  return JSON.parse(cleanJsonResponse(response.text)) as ChapterResponse;
};

export const generateAnswersForQuestions = async (questions: Question[]): Promise<AnswersResponse> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    For the following CBSE Class X Science questions, generate expert model answers and marking scheme points.
    IMPORTANT: You MUST use the exact same "id" provided for each question as the "questionId" in your response.
    If the question is an MCQ, specify the correct option and explain why it is correct.
    
    QUESTIONS:
    ${JSON.stringify(questions.map(q => ({ id: q.id, text: q.text, marks: q.marks, options: q.options })))}
    
    Output a JSON object with an "answers" array.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: { parts: [{ text: prompt }] },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          answers: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                questionId: { type: Type.STRING },
                content: { type: Type.STRING },
                markingSchemePoints: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                }
              },
              required: ["questionId", "content", "markingSchemePoints"]
            }
          }
        },
        required: ["answers"]
      }
    }
  });

  return JSON.parse(cleanJsonResponse(response.text)) as AnswersResponse;
};
