
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
      console.error(err);
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
        answersGenerated: false
      };

      setActiveChapter(updated);
      setChapters(prev => prev.map(ch => ch.id === activeChapter.id ? updated : ch));
    } catch (err) {
      setError("Failed to fetch more questions.");
    } finally {
      setLoadingMore(false);
    }
  };

  const handlePrint = () => {
    window.print();
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

  const getQuestionsByType = (type: string) => activeChapter?.questions?.filter(q => q.type === type) || [];

  return (
    <div className="relative">
      
      {/* 1. PRINT-TEMPLATE */}
      <div className="print-template font-serif p-12 bg-white text-black">
        {activeChapter && (
          <>
            <div className="text-center border-b-4 border-black pb-8 mb-10">
               <p className="text-xs font-bold uppercase tracking-widest mb-1">Central Board of Secondary Education (CBSE)</p>
               <h1 className="text-3xl font-black uppercase mb-2">Secondary School Examination 2026</h1>
               <p className="text-xl font-bold border-t-2 border-slate-200 pt-2">{activeChapter.name}</p>
               <div className="flex justify-between mt-6 px-4 font-bold text-sm uppercase">
                  <span>Class: X (Science)</span>
                  <span>Batch: 2026 Prediction</span>
                  <span>Max Marks: 80</span>
               </div>
            </div>

            {['MCQ', 'VSA', 'SA', 'LA', 'CASE'].map((type, sIdx) => {
               const qs = getQuestionsByType(type);
               if (qs.length === 0) return null;
               return (
                  <div key={type} className="mb-12 page-break-avoid">
                     <div className="bg-slate-900 text-white px-4 py-1.5 font-bold uppercase tracking-wider mb-6 text-center text-sm">
                        Section {String.fromCharCode(65 + sIdx)}
                     </div>
                     <div className="space-y-8">
                        {qs.map((q, idx) => (
                           <div key={idx} className="flex gap-4">
                              <span className="font-bold min-w-[2rem]">Q{(activeChapter.questions?.indexOf(q) || 0) + 1}.</span>
                              <div className="flex-grow text-lg leading-relaxed">{q.text}</div>
                              <span className="font-bold whitespace-nowrap">[{q.marks}]</span>
                           </div>
                        ))}
                     </div>
                  </div>
               );
            })}

            {activeChapter.answersGenerated && (
               <div className="pt-10" style={{ breakBefore: 'page' }}>
                  <div className="text-center border-b-2 border-red-600 pb-4 mb-10">
                     <h2 className="text-2xl font-black text-red-600 uppercase tracking-widest">Marking Scheme</h2>
                  </div>
                  <div className="space-y-12">
                     {activeChapter.questions?.map((q, idx) => {
                        const ans = activeChapter.answers?.find(a => a.questionId === q.id);
                        if (!ans) return null;
                        return (
                           <div key={idx} className="border-b border-slate-100 pb-8 last:border-none page-break-avoid">
                              <p className="font-black text-lg mb-2">Solution {idx + 1}</p>
                              <p className="text-md leading-relaxed whitespace-pre-wrap mb-4">{ans.content}</p>
                              <ul className="list-disc list-inside text-xs text-slate-700">
                                {ans.markingSchemePoints.map((pt, pIdx) => <li key={pIdx}>{pt}</li>)}
                              </ul>
                           </div>
                        );
                     })}
                  </div>
               </div>
            )}
          </>
        )}
      </div>

      {/* 2. DASHBOARD */}
      <div className="no-print min-h-screen bg-slate-50 pb-12">
        <header className="bg-slate-900 text-white py-14 px-4 shadow-2xl mb-12 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/20 rounded-full blur-[120px] -mr-48 -mt-48"></div>
          <div className="container mx-auto max-w-6xl relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="text-center md:text-left">
              <div className="inline-flex items-center gap-2 bg-indigo-500/20 px-3 py-1 rounded-full text-indigo-300 text-xs font-bold uppercase tracking-widest mb-4 border border-indigo-500/30">
                <i className="fas fa-microchip"></i>
                Deep Trend AI Prediction Engine
              </div>
              <h1 className="text-5xl font-black mb-3 tracking-tight">2026 Board Predictor</h1>
              <p className="text-slate-400 text-xl max-w-lg leading-relaxed">
                Analyze Science chapters and generate high-yield board questions for 2026.
              </p>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-indigo-400">Class X</div>
                <div className="text-[10px] text-slate-500 font-black uppercase">Science</div>
              </div>
            </div>
          </div>
        </header>

        <main className="container mx-auto max-w-6xl px-4">
          {error && (
            <div className="mb-8 bg-red-50 border-l-4 border-red-500 p-5 rounded-r-2xl shadow-lg flex items-center justify-between">
              <p className="text-red-800 font-bold">{error}</p>
              <button onClick={() => setError(null)} className="text-red-300 hover:text-red-500"><i className="fas fa-times-circle text-2xl"></i></button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {chapters.map((chapter, index) => {
              const meta = CHAPTER_METADATA[index];
              const colorClass = getCategoryColor(meta.category);
              
              return (
                <div key={chapter.id} className="group relative bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 overflow-hidden">
                  <div className="relative z-10">
                    <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-tighter ${colorClass} border mb-6 inline-block`}>
                      CH {chapter.id} • {meta.category}
                    </span>
                    <h3 className="text-2xl font-black text-slate-800 mb-8 min-h-[4rem] leading-tight group-hover:text-indigo-600 transition-colors">
                      {chapter.name}
                    </h3>
                    <div className="pt-2">
                      {chapter.status === 'ready' ? (
                        <button type="button" onClick={() => startPrediction(chapter)} className="w-full bg-slate-900 hover:bg-indigo-600 text-white font-bold py-4 rounded-2xl shadow-xl transition-all flex items-center justify-center gap-3">
                          <i className="fas fa-bolt-lightning text-yellow-400"></i>
                          Predict Questions
                        </button>
                      ) : chapter.status === 'generating' ? (
                        <div className="w-full bg-indigo-50 text-indigo-600 font-bold py-4 rounded-2xl flex items-center justify-center gap-3 animate-pulse">
                          <i className="fas fa-brain fa-spin"></i>
                          Analyzing...
                        </div>
                      ) : (
                        <button type="button" onClick={() => setActiveChapter(chapter)} className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-4 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-3">
                          <i className="fas fa-circle-check"></i>
                          View Hotspots
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
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col border border-white/20 animate-in zoom-in-95 duration-300">
              <div className="p-10 bg-slate-900 text-white relative flex-shrink-0">
                <div className="flex items-start justify-between relative z-10">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="bg-indigo-500 text-[10px] font-black px-2 py-0.5 rounded text-white uppercase tracking-wider">2026 Prediction</span>
                      <span className="text-slate-400 text-xs font-medium">Chapter {activeChapter.id}</span>
                    </div>
                    <h2 className="text-4xl font-black tracking-tight">{activeChapter.name}</h2>
                  </div>
                  <button type="button" onClick={() => setActiveChapter(null)} className="w-12 h-12 rounded-2xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all flex items-center justify-center">
                    <i className="fas fa-times text-xl"></i>
                  </button>
                </div>
              </div>
              
              <div className="overflow-y-auto p-10 bg-slate-50/30 custom-scrollbar flex-grow">
                <div className="space-y-10">
                  {activeChapter.questions?.map((q, idx) => {
                    const ans = activeChapter.answers?.find(a => a.questionId === q.id);
                    return (
                      <div key={idx} className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-slate-100 hover:shadow-xl transition-all duration-500">
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-8 mb-6">
                          <div className="flex-grow">
                            <div className="flex flex-wrap items-center gap-3 mb-5">
                              <span className="text-[10px] font-black px-4 py-1.5 rounded-full uppercase border bg-blue-50 text-blue-600 border-blue-100">
                                {q.type} • {q.marks} Marks
                              </span>
                              <span className="text-[10px] font-black px-4 py-1.5 rounded-full uppercase border bg-green-50 text-green-600 border-green-100">
                                {q.probabilityScore}% Likely
                              </span>
                            </div>
                            <p className="text-2xl text-slate-800 font-bold leading-tight mb-4">{q.text}</p>
                            <p className="text-sm text-slate-500 italic font-medium">AI Reason: {q.reasoning}</p>
                          </div>
                          <div className="flex-none text-slate-100 text-5xl font-black italic select-none">#{idx + 1}</div>
                        </div>

                        {/* DISPLAY GENERATED ANSWERS HERE */}
                        {activeChapter.answersGenerated && ans && (
                          <div className="mt-8 pt-8 border-t border-slate-100 animate-in fade-in slide-in-from-top-4 duration-500">
                             <div className="bg-indigo-50/30 p-8 rounded-3xl border border-indigo-100">
                                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-4">Model Solution (100% Score)</p>
                                <p className="text-slate-700 text-lg leading-relaxed mb-6 whitespace-pre-wrap font-medium">
                                  {ans.content}
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {ans.markingSchemePoints.map((pt, pIdx) => (
                                    <div key={pIdx} className="flex gap-3 items-center bg-white/60 p-3 rounded-xl border border-indigo-50 text-xs text-indigo-700 font-bold">
                                      <i className="fas fa-check-circle"></i>
                                      {pt}
                                    </div>
                                  ))}
                                </div>
                             </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {(loadingMore || loadingAnswers) && (
                     <div className="flex flex-col items-center justify-center py-12 gap-4">
                        <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                        <p className="text-indigo-600 font-black uppercase tracking-widest text-sm">AI is drafting answers...</p>
                     </div>
                  )}
                </div>
              </div>

              <div className="p-8 bg-white border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6 flex-shrink-0">
                <div className="flex items-center gap-4">
                  <button 
                    type="button" 
                    onClick={handleGenerateAnswers} 
                    disabled={activeChapter.answersGenerated || loadingAnswers} 
                    className={`font-black px-8 py-4 rounded-2xl transition-all disabled:opacity-50 shadow-xl ${activeChapter.answersGenerated ? 'bg-green-100 text-green-700' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                  >
                    {loadingAnswers ? <i className="fas fa-spinner fa-spin mr-2"></i> : <i className="fas fa-key mr-2"></i>}
                    {activeChapter.answersGenerated ? 'Solutions Unlocked' : 'Unlock Model Answers'}
                  </button>
                  <button type="button" onClick={handleMoreQuestions} disabled={loadingMore} className="bg-slate-100 text-slate-700 font-black px-8 py-4 rounded-2xl hover:bg-slate-200 transition-all">
                    More Hotspots
                  </button>
                </div>

                <div className="flex items-center gap-6">
                  <button type="button" onClick={handlePrint} className="text-slate-500 font-bold hover:text-slate-800 transition-all flex items-center gap-2 group">
                    <i className="fas fa-file-pdf group-hover:text-red-500 transition-colors"></i>
                    Save as PDF
                  </button>
                  <button type="button" onClick={() => setActiveChapter(null)} className="bg-slate-900 text-white font-black px-12 py-4 rounded-2xl hover:bg-black transition-all shadow-xl shadow-slate-200">
                    Done
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
