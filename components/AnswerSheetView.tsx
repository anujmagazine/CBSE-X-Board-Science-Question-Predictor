
import React from 'react';
import { Answer, QuestionPaper } from '../types';

interface Props {
  answers: Answer[];
  paper: QuestionPaper;
}

const AnswerSheetView: React.FC<Props> = ({ answers, paper }) => {
  // Map questions for easier access
  const allQuestions = paper.sections.flatMap(s => s.questions);

  return (
    <div className="bg-white shadow-2xl rounded-xl overflow-hidden border-2 border-green-200 print:shadow-none print:border-none">
      <div className="bg-green-600 text-white py-6 px-12 print:bg-gray-100 print:text-black print:border-b">
        <h2 className="text-2xl font-bold flex items-center gap-3">
          <i className="fas fa-award"></i>
          Model Answers (100% Score Guide - 2026)
        </h2>
        <p className="text-green-50 opacity-90 text-sm mt-1">Provided by CBSE Curriculum Expert AI</p>
      </div>

      <div className="p-8 md:p-12 space-y-12">
        {answers.map((ans, idx) => {
          const question = allQuestions.find(q => q.id === ans.questionId);
          return (
            <div key={idx} className="border-b border-gray-100 pb-10 last:border-none">
              <div className="flex items-start gap-4 mb-4">
                <div className="bg-gray-800 text-white text-xs font-bold px-2 py-1 rounded">Ans {idx + 1}</div>
                <div className="flex-grow">
                  <p className="text-sm text-gray-400 italic mb-2">Ref: {question?.text.substring(0, 100)}...</p>
                  <div className="text-lg leading-relaxed text-gray-800 prose prose-indigo max-w-none whitespace-pre-wrap">
                    {ans.content}
                  </div>
                </div>
              </div>

              {ans.markingSchemePoints && ans.markingSchemePoints.length > 0 && (
                <div className="ml-14 mt-6 bg-green-50 border border-green-100 p-4 rounded-lg print:bg-transparent">
                  <h4 className="text-xs font-bold text-green-700 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <i className="fas fa-check-double"></i>
                    Marking Scheme & Key Points
                  </h4>
                  <ul className="space-y-2">
                    {ans.markingSchemePoints.map((point, pIdx) => (
                      <li key={pIdx} className="flex gap-2 text-sm text-gray-700">
                        <span className="text-green-500">•</span>
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      <div className="p-8 text-center bg-gray-50 text-gray-500 text-xs italic no-print">
        End of Solutions. Good luck for your 2026 Board Exams!
      </div>
    </div>
  );
};

export default AnswerSheetView;
