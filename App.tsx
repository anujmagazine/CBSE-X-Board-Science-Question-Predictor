
import React, { useState } from 'react';
import { Chapter, Question, Answer } from './types';
import { generateChapterPredictions, generateAnswersForQuestions } from './services/geminiService';
import { CHAPTER_OCR_DATA } from './data/chapterContent';

const CHAPTER_METADATA = [
  { name: "Chemical Reactions and Equations", category: "Chemistry" },
  { name: "Acids, Bases and Salts", category: "Chemistry" },
  { name: "Metals and Non-metals", category: "Chemistry" },
  { name: "Carbon and its Compounds", category: "Chemistry" },
  { name: "Life Processes", category: "Biology" },
  { name: "Control and Coordination", category: "Biology" },
  { name: "How do Organisms Reproduce?", category: "Biology" },
  { name: "Heredity", category: "Biology" },
  { name: "Light – Reflection and Refraction", category: "Physics" },
  { name: "The Human Eye and the Colourful World", category: "Physics" },
  { name: "Electricity", category: "Physics" },
  { name: "Magnetic Effects of Electric Current", category: "Physics" },
  { name: "Our Environment", category: "Ecology" }
];

const App: React.FC = () => {
  const [chapters, setChapters] = useState<Chapter[]>(
    CHAPTER_METADATA.map((meta, index) => ({
      id: index + 1,
      name: meta.name,
      status: 'ready',
      answersGenerated: false
    }))
  );
  const [activeChapter, setActiveChapter] = useState<Chapter | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingAnswers, setLoadingAnswers] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const startPrediction = async (chapter: Chapter) => {
    setChapters(prev => prev.map(ch => ch.id === chapter.id ? { ...ch, status: 'generating' } : ch));
    setError(null);
    
    try {
      const content = CHAPTER_OCR_DATA[chapter.id];
      const result = await generateChapterPredictions(content, chapter.name);
      
      const updatedChapter: Chapter = { 
        ...chapter, 
        questions: result.questions, 
        status: 'completed',
        answersGenerated: false,
        answers: []
      };

      setChapters(prev => prev.map(ch => ch.id === chapter.id ? updatedChapter : ch));
      setActiveChapter(updatedChapter);
    } catch (err) {
      console.error(err);
      setError(`Failed to analyze ${chapter.name}. Please try again.`);
      setChapters(prev => prev.map(ch => ch.id === chapter.id ? { ...ch, status: 'ready' } : ch));
    }
  };

  const handleGenerateAnswers = async () => {
    if (!activeChapter?.questions) return;
    setLoadingAnswers(true);
    setError(null);

    try {
      const result = await generateAnswersForQuestions(activeChapter.questions);
      const updated = { ...activeChapter, answers: result.answers, answersGenerated: true };
      
      setActiveChapter(updated);
      setChapters(prev => prev.map(ch => ch.id === activeChapter.id ? updated : ch));
    } catch (err) {
      setError("Failed to generate answers. Please try again.");
    } finally {
      setLoadingAnswers(false);
    }
  };

  const handleMoreQuestions = async () => {
    if (!activeChapter) return;
    setLoadingMore(true);
    setError(null);

    try {
      const content = CHAPTER_OCR_DATA[activeChapter.id];
      const result = await generateChapterPredictions(content, activeChapter.name, activeChapter.questions || []);
      
      const updated: Chapter = {
        ...activeChapter,
        questions: [...(activeChapter.questions || []), ...result.questions],
        answersGenerated: false // Reset answers if new questions are added
      };

      setActiveChapter(updated);
      setChapters(prev => prev.map(ch => ch.id === activeChapter.id ? updated : ch));
    } catch (err) {
      setError("Failed to fetch more questions.");
    } finally {
      setLoadingMore(false);
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Chemistry': return 'bg-cyan-50 text-cyan-600 border-cyan-100';
      case 'Biology': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'Physics': return 'bg-violet-50 text-violet-600 border-violet-100';
      case 'Ecology': return 'bg-amber-50 text-amber-600 border-amber-100';
      default: return 'bg-slate-50 text-slate-600 border-slate-100';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-12 font-sans">
      <header className="bg-slate-900 text-white py-14 px-4 shadow-2xl mb-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/20 rounded-full blur-[120px] -mr-48 -mt-48"></div>
        <div className="container mx-auto max-w-6xl relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="text-center md:text-left">
            <div className="inline-flex items-center gap-2 bg-indigo-500/20 px-3 py-1 rounded-full text-indigo-300 text-xs font-bold uppercase tracking-widest mb-4 border border-indigo-500/30">
              <i className="fas fa-microchip"></i>
              Deep Trend AI Active
            </div>
            <h1 className="text-5xl font-black mb-3 tracking-tight">2026 Board Predictor</h1>
            <p className="text-slate-400 text-xl max-w-lg leading-relaxed">
              Most probable Science questions based on NCERT content and last 5 years patterns.
            </p>
          </div>
          <div className="flex items-center gap-6 text-white/80">
            <div className="text-center">
              <div className="text-3xl font-bold text-white">13</div>
              <div className="text-[10px] text-slate-500 font-black uppercase">Chapters</div>
            </div>
            <div className="w-px h-12 bg-slate-800"></div>
            <div className="text-center">
              <div className="text-3xl font-bold text-indigo-400">2026</div>
              <div className="text-[10px] text-slate-500 font-black uppercase">Target Year</div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-6xl px-4">
        {error && (
          <div className="mb-8 bg-red-50 border-l-4 border-red-500 p-5 rounded-r-2xl shadow-lg flex items-center justify-between animate-in slide-in-from-top-4 duration-300 no-print">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center text-red-500">
                <i className="fas fa-bolt"></i>
              </div>
              <p className="text-red-800 font-bold">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="text-red-300 hover:text-red-500 transition-colors">
              <i className="fas fa-times-circle text-2xl"></i>
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 no-print">
          {chapters.map((chapter, index) => {
            const meta = CHAPTER_METADATA[index];
            const colorClass = getCategoryColor(meta.category);
            
            return (
              <div 
                key={chapter.id}
                className="group relative bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 overflow-hidden"
              >
                <div className="absolute -right-4 -top-4 text-slate-50 text-8xl opacity-50 group-hover:scale-110 transition-transform duration-700 pointer-events-none">
                  <i className={meta.category === 'Chemistry' ? 'fas fa-flask' : meta.category === 'Biology' ? 'fas fa-dna' : 'fas fa-atom'}></i>
                </div>

                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-6">
                    <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-tighter ${colorClass} border`}>
                      {meta.category} • CH {chapter.id}
                    </span>
                  </div>
                  
                  <h3 className="text-2xl font-black text-slate-800 mb-8 min-h-[4rem] leading-[1.1] tracking-tight group-hover:text-indigo-600 transition-colors">
                    {chapter.name}
                  </h3>

                  <div className="pt-2">
                    {chapter.status === 'ready' ? (
                      <button 
                        onClick={() => startPrediction(chapter)}
                        className="w-full bg-slate-900 hover:bg-indigo-600 text-white font-bold py-4 rounded-2xl shadow-xl transition-all flex items-center justify-center gap-3 active:scale-95"
                      >
                        <i className="fas fa-bolt-lightning text-yellow-400"></i>
                        Get Predictions
                      </button>
                    ) : chapter.status === 'generating' ? (
                      <div className="w-full bg-indigo-50 text-indigo-600 font-bold py-4 rounded-2xl flex items-center justify-center gap-3 animate-pulse">
                        <i className="fas fa-brain fa-spin"></i>
                        AI Analyzing...
                      </div>
                    ) : (
                      <button 
                        onClick={() => setActiveChapter(chapter)}
                        className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-4 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-3 active:scale-95"
                      >
                        <i className="fas fa-circle-check"></i>
                        See Questions
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {activeChapter && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300 no-print">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col border border-white/20 animate-in zoom-in-95 duration-300">
            <div className="p-10 bg-slate-900 text-white relative">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] -mr-32 -mt-32"></div>
              <div className="flex items-start justify-between relative z-10">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="bg-indigo-500 text-[10px] font-black px-2 py-0.5 rounded text-white uppercase tracking-wider">2026 Target Exam</span>
                    <span className="text-slate-400 text-xs font-medium">CH {activeChapter.id}</span>
                  </div>
                  <h2 className="text-4xl font-black tracking-tight">{activeChapter.name}</h2>
                </div>
                <button 
                  onClick={() => setActiveChapter(null)}
                  className="w-12 h-12 rounded-2xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all flex items-center justify-center"
                >
                  <i className="fas fa-times text-xl"></i>
                </button>
              </div>
            </div>
            
            <div className="overflow-y-auto p-10 bg-slate-50/30">
              <div className="space-y-10">
                {activeChapter.questions?.map((q, idx) => {
                  const answer = activeChapter.answers?.find(a => a.questionId === q.id);
                  return (
                    <div key={idx} className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-slate-100 group hover:border-indigo-200 transition-all hover:shadow-xl duration-500">
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-8 mb-8">
                        <div className="flex-grow">
                          <div className="flex flex-wrap items-center gap-3 mb-5">
                            <span className={`text-[10px] font-black px-4 py-1.5 rounded-full uppercase border ${
                              q.type === 'LA' ? 'bg-rose-50 text-rose-600 border-rose-100' : 
                              q.type === 'SA' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                              'bg-blue-50 text-blue-600 border-blue-100'
                            }`}>
                              {q.type} • {q.marks} Marks
                            </span>
                            <div className="flex items-center gap-2 bg-green-50 px-3 py-1.5 rounded-full border border-green-100">
                               <div className="w-12 h-1.5 bg-green-200 rounded-full overflow-hidden">
                                 <div className="h-full bg-green-600" style={{ width: `${q.probabilityScore}%` }}></div>
                               </div>
                               <span className="text-[10px] text-green-700 font-black uppercase">
                                 {q.probabilityScore}% Chance
                               </span>
                            </div>
                          </div>
                          <p className="text-2xl text-slate-800 font-bold leading-tight mb-4">{q.text}</p>
                        </div>
                        <div className="flex-none text-slate-100 text-5xl font-black italic select-none">
                          #{idx + 1}
                        </div>
                      </div>

                      {/* Revealed Section: Reasoning and Answer */}
                      {activeChapter.answersGenerated && (
                        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-700">
                          {/* Reasoning */}
                          <div className="bg-amber-50/50 p-6 rounded-3xl border border-amber-100">
                            <div className="flex items-start gap-4">
                              <div className="w-10 h-10 bg-white rounded-2xl shadow-sm flex items-center justify-center text-amber-500 flex-shrink-0">
                                <i className="fas fa-lightbulb"></i>
                              </div>
                              <div>
                                <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">Expert Reasoning</p>
                                <p className="text-sm text-slate-600 font-medium leading-relaxed italic">{q.reasoning}</p>
                              </div>
                            </div>
                          </div>

                          {/* Expert Answer */}
                          {answer && (
                            <div className="bg-indigo-50/30 p-8 rounded-3xl border border-indigo-100">
                              <div className="flex items-start gap-4">
                                <div className="w-10 h-10 bg-white rounded-2xl shadow-sm flex items-center justify-center text-indigo-500 flex-shrink-0">
                                  <i className="fas fa-pen-nib"></i>
                                </div>
                                <div className="flex-grow">
                                  <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-3">Model Answer (100% Score)</p>
                                  <div className="text-slate-700 text-lg leading-relaxed mb-6 whitespace-pre-wrap font-medium">
                                    {answer.content}
                                  </div>
                                  
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {answer.markingSchemePoints.map((pt, pIdx) => (
                                      <div key={pIdx} className="flex gap-3 items-center bg-white/60 p-3 rounded-xl border border-indigo-50 text-sm text-indigo-700 font-semibold">
                                        <i className="fas fa-circle-check text-[10px]"></i>
                                        {pt}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Loading states for more questions or answers */}
                {(loadingMore || loadingAnswers) && (
                   <div className="flex flex-col items-center justify-center py-12 gap-4">
                      <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                      <p className="text-indigo-600 font-black uppercase tracking-widest text-sm">
                        {loadingMore ? 'Extracting More High-Yield Topics...' : 'Drafting Professional Solutions...'}
                      </p>
                   </div>
                )}
              </div>
            </div>

            {/* Modal Footer with new buttons */}
            <div className="p-8 bg-white border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="flex items-center gap-4">
                <button 
                  onClick={handleGenerateAnswers}
                  disabled={activeChapter.answersGenerated || loadingAnswers}
                  className={`flex items-center gap-3 font-black px-8 py-4 rounded-2xl transition-all shadow-xl active:scale-95 disabled:opacity-50 ${
                    activeChapter.answersGenerated 
                    ? 'bg-green-100 text-green-700 border border-green-200' 
                    : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200'
                  }`}
                >
                  {loadingAnswers ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-key"></i>}
                  {activeChapter.answersGenerated ? 'Answers Ready' : 'Generate Answers'}
                </button>
                
                <button 
                  onClick={handleMoreQuestions}
                  disabled={loadingMore}
                  className="flex items-center gap-3 bg-slate-100 text-slate-700 font-black px-8 py-4 rounded-2xl hover:bg-slate-200 transition-all active:scale-95 disabled:opacity-50"
                >
                  {loadingMore ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-plus"></i>}
                  More Questions
                </button>
              </div>

              <div className="flex items-center gap-6">
                <button 
                  onClick={() => window.print()}
                  className="text-slate-400 font-bold hover:text-slate-800 transition-colors flex items-center gap-2"
                >
                  <i className="fas fa-download"></i>
                  Export
                </button>
                <button 
                  onClick={() => setActiveChapter(null)}
                  className="bg-slate-900 text-white font-black px-12 py-4 rounded-2xl hover:bg-black transition-all active:scale-95 shadow-xl shadow-slate-200"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Basic print styles */}
      <div className="hidden print:block p-10 bg-white min-h-screen">
         <h1 className="text-3xl font-bold mb-4">{activeChapter?.name} Prediction Report</h1>
         <div className="space-y-10">
           {activeChapter?.questions?.map((q, idx) => (
             <div key={idx} className="border-b pb-6">
               <h3 className="text-xl font-bold mb-2">Q{idx + 1}. {q.text} ({q.marks}m)</h3>
               {activeChapter.answersGenerated && activeChapter.answers?.[idx] && (
                 <div className="mt-4">
                   <p className="font-bold text-indigo-600">Model Answer:</p>
                   <p>{activeChapter.answers[idx].content}</p>
                 </div>
               )}
             </div>
           ))}
         </div>
      </div>
    </div>
  );
};

export default App;
