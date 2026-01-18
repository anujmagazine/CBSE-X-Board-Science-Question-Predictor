
import React, { useState, useCallback } from 'react';
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
  const [isPreparingPdf, setIsPreparingPdf] = useState(false);

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

  const handlePrint = useCallback(() => {
    if (!activeChapter) return;
    
    setIsPreparingPdf(true);
    
    // Triggering print after a small delay to ensure any dynamic updates are painted
    setTimeout(() => {
        window.print();
        setIsPreparingPdf(false);
    }, 500);
  }, [activeChapter]);

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
    <div className="min-h-screen bg-slate-50 pb-12 font-sans">
      <header className="bg-slate-900 text-white py-14 px-4 shadow-2xl mb-12 relative overflow-hidden no-print">
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

      <main className="container mx-auto max-w-6xl px-4 no-print">
        {error && (
          <div className="mb-8 bg-red-50 border-l-4 border-red-500 p-5 rounded-r-2xl shadow-lg flex items-center justify-between animate-in slide-in-from-top-4 duration-300">
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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
                        type="button"
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
                        type="button"
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

      {/* Modal Interface - Strictly NO-PRINT */}
      {activeChapter && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300 no-print">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col border border-white/20 animate-in zoom-in-95 duration-300">
            <div className="p-10 bg-slate-900 text-white relative flex-shrink-0">
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
                  type="button"
                  onClick={() => setActiveChapter(null)}
                  className="w-12 h-12 rounded-2xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all flex items-center justify-center"
                >
                  <i className="fas fa-times text-xl"></i>
                </button>
              </div>
            </div>
            
            <div className="overflow-y-auto p-10 bg-slate-50/30 custom-scrollbar flex-grow">
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

                      {activeChapter.answersGenerated && (
                        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-700">
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

            <div className="p-8 bg-white border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6 flex-shrink-0">
              <div className="flex items-center gap-4">
                <button 
                  type="button"
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
                  type="button"
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
                  type="button"
                  onClick={handlePrint}
                  disabled={isPreparingPdf}
                  className="text-slate-500 font-bold hover:text-slate-800 transition-colors flex items-center gap-2 group disabled:opacity-50"
                >
                  <i className={`fas fa-file-pdf group-hover:text-red-500 transition-colors ${isPreparingPdf ? 'animate-pulse' : ''}`}></i>
                  {isPreparingPdf ? 'Preparing PDF...' : 'Save as PDF'}
                </button>
                <button 
                  type="button"
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

      {/* PROFESSIONAL PRINT TEMPLATE - Explicitly marked for print-only visibility */}
      {activeChapter && (
        <div className="print-only font-serif bg-white text-black min-h-screen">
           <div className="p-12">
              <div className="text-center border-b-4 border-black pb-8 mb-10">
                 <p className="text-xs font-bold uppercase tracking-widest mb-1">Central Board of Secondary Education (CBSE)</p>
                 <h1 className="text-3xl font-black uppercase mb-2">Secondary School Examination 2026</h1>
                 <p className="text-xl font-bold border-t-2 border-slate-200 pt-2">{activeChapter.name}</p>
                 <div className="flex justify-between mt-6 px-4 font-bold text-sm uppercase">
                    <span>Class: X (Science)</span>
                    <span>Predicted Batch: 2026</span>
                    <span>Max Marks: 80</span>
                 </div>
              </div>

              <div className="mb-10 p-6 border-2 border-slate-100 bg-slate-50/20">
                 <h2 className="font-black text-lg mb-3 border-b border-black pb-1">General Instructions:</h2>
                 <ul className="list-decimal list-inside space-y-1.5 text-sm font-medium">
                    <li>The question paper consists of predicted "Hotspot" topics from Chapter: {activeChapter.id}.</li>
                    <li>Section A contains Multiple Choice Questions (1 mark each).</li>
                    <li>Section B contains Short Answer Type-I Questions (2 marks each).</li>
                    <li>Section C contains Short Answer Type-II Questions (3 marks each).</li>
                    <li>Section D contains Long Answer Type Questions (5 marks each).</li>
                    <li>Section E contains Case-Based/Integrated Assessment Questions (4 marks).</li>
                 </ul>
              </div>

              {['MCQ', 'VSA', 'SA', 'LA', 'CASE'].map((type, sIdx) => {
                 const qs = getQuestionsByType(type);
                 if (qs.length === 0) return null;
                 return (
                    <div key={type} className="mb-12 page-break-avoid">
                       <div className="bg-slate-900 text-white px-4 py-1.5 font-bold uppercase tracking-wider mb-6 text-center text-sm">
                          Section {String.fromCharCode(65 + sIdx)}: {
                             type === 'MCQ' ? 'Multiple Choice' : 
                             type === 'VSA' ? 'Short Answer Type I' :
                             type === 'SA' ? 'Short Answer Type II' :
                             type === 'LA' ? 'Long Answer' : 'Case Based'
                          }
                       </div>
                       <div className="space-y-8">
                          {qs.map((q, idx) => (
                             <div key={idx} className="flex gap-4">
                                <span className="font-bold min-w-[2rem]">Q{(activeChapter.questions?.indexOf(q) || 0) + 1}.</span>
                                <div className="flex-grow">
                                   <p className="text-lg leading-relaxed">{q.text}</p>
                                   {type === 'MCQ' && (
                                      <div className="grid grid-cols-2 gap-4 mt-4 ml-2">
                                         <div className="text-sm font-medium">(a) ____________</div>
                                         <div className="text-sm font-medium">(b) ____________</div>
                                         <div className="text-sm font-medium">(c) ____________</div>
                                         <div className="text-sm font-medium">(d) ____________</div>
                                      </div>
                                   )}
                                </div>
                                <span className="font-bold whitespace-nowrap">[{q.marks}]</span>
                             </div>
                          ))}
                       </div>
                    </div>
                 );
              })}

              {activeChapter.answersGenerated && (
                 <div className="page-break-before pt-10">
                    <div className="text-center border-b-2 border-red-600 pb-4 mb-10">
                       <h2 className="text-2xl font-black text-red-600 uppercase tracking-widest">Confidential Marking Guide</h2>
                       <p className="text-xs font-bold text-slate-500">For Board Examiner Use Only • 2026 Predictions</p>
                    </div>

                    <div className="space-y-12">
                       {activeChapter.questions?.map((q, idx) => {
                          const ans = activeChapter.answers?.find(a => a.questionId === q.id);
                          if (!ans) return null;
                          return (
                             <div key={idx} className="page-break-avoid border-b border-slate-100 pb-8 last:border-none">
                                <div className="flex items-center gap-3 mb-3 border-l-4 border-slate-900 pl-4">
                                   <span className="font-black text-lg">Solution {idx + 1}</span>
                                   <span className="text-slate-400 text-xs italic">Ref: {q.type} ({q.marks}m)</span>
                                </div>
                                <div className="text-md leading-relaxed mb-4 whitespace-pre-wrap pl-4 font-medium">
                                   {ans.content}
                                </div>
                                <div className="ml-4 bg-slate-50 border p-4 rounded-lg">
                                   <p className="text-xs font-black uppercase mb-2 text-slate-500 tracking-tighter">Value Points (Marking Distribution):</p>
                                   <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1">
                                      {ans.markingSchemePoints.map((pt, pIdx) => (
                                         <li key={pIdx} className="text-xs font-medium list-disc list-inside text-slate-700">{pt}</li>
                                      ))}
                                   </ul>
                                </div>
                             </div>
                          );
                       })}
                    </div>
                 </div>
              )}
           </div>
        </div>
      )}
    </div>
  );
};

export default App;
