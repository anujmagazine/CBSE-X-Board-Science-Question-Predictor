
export interface Question {
  id: string;
  text: string;
  marks: number;
  type: 'MCQ' | 'VSA' | 'SA' | 'LA' | 'CASE';
  probabilityScore: number; // Percentage 0-100
  reasoning: string; // Why this is likely to appear
}

export interface Chapter {
  id: number;
  name: string;
  pdfData?: string; // Base64
  fileName?: string;
  status: 'empty' | 'ready' | 'generating' | 'completed';
  questions?: Question[];
}

export interface ChapterResponse {
  questions: Question[];
  chapterSummary: string;
}

// Added interfaces to satisfy components/QuestionPaperView.tsx and components/AnswerSheetView.tsx
export interface SectionQuestion {
  id: string;
  text: string;
  marks: number;
  options?: string[];
}

export interface Section {
  name: string;
  description: string;
  questions: SectionQuestion[];
}

export interface QuestionPaper {
  subject: string;
  class: string;
  timeDuration: string;
  totalMarks: number;
  generalInstructions: string[];
  sections: Section[];
}

export interface Answer {
  questionId: string;
  content: string;
  markingSchemePoints: string[];
}
