
import React from 'react';
import { QuestionPaper } from '../types';

interface Props {
  paper: QuestionPaper;
  onGenerateAnswers: () => void;
  loadingAnswers: boolean;
}

const QuestionPaperView: React.FC<Props> = ({ paper, onGenerateAnswers, loadingAnswers }) => {
  return (
    <div className="bg-white shadow-2xl rounded-xl overflow-hidden border border-gray-200 print:shadow-none print:border-none">
      <div className="p-8 md:p-12">
        {/* Paper Header */}
        <div className="text-center border-b-2 border-black pb-6 mb-8">
          <h2 className="text-2xl font-bold uppercase tracking-widest">Board Examination 2026</h2>
          <h3 className="text-3xl font-black mt-2">{paper.subject}</h3>
          <div className="flex justify-between mt-6 font-bold text-lg border-t pt-4 border-gray-100 uppercase">
            <span>Class: {paper.class}</span>
            <span>Time Allowed: {paper.timeDuration}</span>
            <span>Maximum Marks: {paper.totalMarks}</span>
          </div>
        </div>

        {/* General Instructions */}
        <div className="mb-10 bg-gray-50 p-6 rounded-lg print:bg-transparent print:p-0">
          <h4 className="text-lg font-bold mb-3 border-b border-gray-300 pb-2 flex items-center gap-2">
            <i className="fas fa-info-circle text-indigo-600 no-print"></i>
            General Instructions:
          </h4>
          <ul className="list-decimal list-inside space-y-2 text-gray-800 leading-relaxed font-medium">
            {paper.generalInstructions.map((inst, i) => (
              <li key={i}>{inst}</li>
            ))}
          </ul>
        </div>

        {/* Sections */}
        {paper.sections.map((section, sIdx) => (
          <div key={sIdx} className="mb-12">
            <div className="bg-black text-white px-4 py-2 font-bold text-center uppercase tracking-wider mb-6 print:bg-gray-100 print:text-black print:border">
              {section.name}: {section.description}
            </div>

            <div className="space-y-8">
              {section.questions.map((q, qIdx) => (
                <div key={qIdx} className="flex gap-4 group">
                  <div className="flex-none font-bold text-lg min-w-[2rem]">Q{qIdx + 1}.</div>
                  <div className="flex-grow">
                    <div className="text-lg leading-relaxed text-gray-900 mb-4 whitespace-pre-wrap">
                      {q.text}
                    </div>
                    
                    {q.options && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                        {q.options.map((opt, oIdx) => (
                          <div key={oIdx} className="flex gap-3 items-center p-2 border border-gray-100 rounded-md group-hover:bg-indigo-50/30 transition-colors">
                            <span className="font-bold text-gray-400">({String.fromCharCode(97 + oIdx)})</span>
                            <span>{opt}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex-none font-bold text-lg italic text-gray-500">
                    [{q.marks}]
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Footer with Generate Answers Button */}
        <div className="mt-16 pt-8 border-t-2 border-gray-100 text-center no-print">
          <button 
            onClick={onGenerateAnswers}
            disabled={loadingAnswers}
            className="bg-green-600 hover:bg-green-700 text-white font-extrabold py-5 px-10 rounded-2xl shadow-2xl transition-all transform hover:scale-105 flex items-center gap-4 mx-auto disabled:opacity-50"
          >
            {loadingAnswers ? (
              <>
                <i className="fas fa-circle-notch fa-spin text-2xl"></i>
                Drafting Expert Solutions...
              </>
            ) : (
              <>
                <i className="fas fa-key text-2xl"></i>
                <div className="text-left">
                  <div className="text-sm opacity-80 uppercase tracking-tighter">Ready to Score 100%?</div>
                  <div className="text-xl">Generate Model Answers</div>
                </div>
              </>
            )}
          </button>
          <p className="mt-4 text-gray-400 text-sm">Answers are based on the latest 2026 CBSE curriculum guidelines.</p>
        </div>
      </div>
    </div>
  );
};

export default QuestionPaperView;
