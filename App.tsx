
import React, { useState, useRef } from 'react';
import html2pdf from 'html2pdf.js';
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
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  
  const printRef = useRef<HTMLDivElement>(null);

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3000);
  };

  const startPrediction = async (chapter: Chapter) => {
    setChapters(prev => prev.map(ch => ch.id === chapter.id ? { ...ch, status: 'generating' } : ch));
    setError(null);
    try {
      const content = CHAPTER_OCR_DATA[chapter.id];
      const result = await generateChapterPredictions(content, chapter.name);
      const updatedChapter: Chapter = { ...chapter, questions: result.questions, status: 'completed', answersGenerated: false, answers: [] };
      setChapters(prev => prev.map(ch => ch.id === chapter.id ? updatedChapter : ch));
      setActiveChapter(updatedChapter);
    } catch (err) {
      setError(`Failed to analyze ${chapter.name}. Please check your connection.`);
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
      setError("Failed to generate model solutions.");
    } finally {
      setLoadingAnswers(false);
    }
  };

  const handleMoreQuestions = async () => {
    if (!activeChapter) return;
    setLoadingMore(true);
    try {
      const content = CHAPTER_OCR_DATA[activeChapter.id];
      const result = await generateChapterPredictions(content, activeChapter.name, activeChapter.questions || []);
      const updated: Chapter = { ...activeChapter, questions: [...(activeChapter.questions || []), ...result.questions], answersGenerated: false };
      setActiveChapter(updated);
      setChapters(prev => prev.map(ch => ch.id === activeChapter.id ? updated : ch));
    } catch (err) {
      setError("Failed to fetch more questions.");
    } finally {
      setLoadingMore(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!activeChapter || !printRef.current) return;
    
    setGeneratingPdf(true);
    showFeedback("Constructing A1-Grade PDF...");

    const element = printRef.current;
    
    const opt = {
      margin: 10,
      filename: `CBSE_2026_${activeChapter.name.replace(/\s+/g, '_')}.pdf`,
      image: { type: 'jpeg', quality: 1.0 },
      html2canvas: { 
        scale: 3, 
        useCORS: true, 
        letterRendering: true,
        scrollX: 0,
        scrollY: 0
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    try {
      // Temporarily reveal to the renderer engine ONLY
      element.style.visibility = 'visible';
      element.style.left = '0';
      element.style.position = 'relative';
      element.style.zIndex = '9999';

      await html2pdf().set(opt).from(element).save();
      showFeedback("PDF Download Complete!");
    } catch (err) {
      console.error("PDF generation error:", err);
      setError("PDF engine failed. Try saving as TEXT or using the COPY feature.");
    } finally {
      // Re-hide from the main DOM flow immediately
      element.style.visibility = 'hidden';
      element.style.left = '-9999px';
      element.style.position = 'absolute';
      element.style.zIndex = '-100';
      setGeneratingPdf(false);
    }
  };

  const handleDownloadTxt = () => {
    if (!activeChapter) return;
    let content = `CBSE SCIENCE 2026 PREDICTOR - ${activeChapter.name}\n`;
    content += `==============================================\n\n`;
    activeChapter.questions?.forEach((q, i) => {
      content += `Q${i+1} [${q.marks} Marks]: ${q.text}\n`;
      const ans = activeChapter.answers?.find(a => a.questionId === q.id);
      if (ans) {
        content += `\nSOLUTION:\n${ans.content}\n`;
        content += `MARKING POINTS:\n- ${ans.markingSchemePoints.join('\n- ')}\n`;
      }
      content += `\n----------------------------------------------\n\n`;
    });
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `CBSE_2026_${activeChapter.name.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showFeedback("Chapter exported as Text!");
  };

  const handleCopyToClipboard = () => {
    if (!activeChapter) return;
    let content = `CBSE SCIENCE 2026 PREDICTOR - ${activeChapter.name}\n\n`;
    activeChapter.questions?.forEach((q, i) => {
      content += `Q${i+1} (${q.marks}m): ${q.text}\n`;
      const ans = activeChapter.answers?.find(a => a.questionId === q.id);
      if (ans) content += `Ans: ${ans.content}\n`;
      content += `\n`;
    });
    navigator.clipboard.writeText(content).then(() => showFeedback("Copied to clipboard!"));
  };

  const getQuestionsByType = (type: string) => activeChapter?.questions?.filter(q => q.type === type) || [];

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      {/* Loading Overlay for PDF Generation */}
      {generatingPdf && (
        <div className="fixed inset-0 z-[300] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl text-center space-y-6 max-w-sm border border-white/20">
            <div className="w-20 h-20 border-4 border-slate-100 border-t-red-500 rounded-full animate-spin mx-auto"></div>
            <div>
              <h3 className="text-2xl font-black text-slate-800">Generating PDF</h3>
              <p className="text-slate-500 font-medium">Please wait while we render your question paper...</p>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Toast */}
      {feedback && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[250] bg-slate-900 text-white px-8 py-4 rounded-full shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
          <i className="fas fa-magic text-indigo-400"></i>
          <span className="font-bold text-sm tracking-tight">{feedback}</span>
        </div>
      )}

      {/* 1. PRINT-TEMPLATE - Referenced by html2pdf (Lives off-screen) */}
      <div ref={printRef} className="print-template font-serif p-16 bg-white text-black">
        {activeChapter && (
          <div className="pdf-container">
            <div className="text-center border-b-8 border-black pb-10 mb-12">
               <p className="text-sm font-bold uppercase tracking-[0.3em] mb-2 text-slate-600">Central Board of Secondary Education</p>
               <h1 className="text-4xl font-black uppercase mb-4 tracking-tight">Secondary School Examination 2026</h1>
               <p className="text-2xl font-bold border-t-2 border-slate-100 pt-6">{activeChapter.name}</p>
               <div className="flex justify-between mt-8 text-base font-black uppercase px-8 text-slate-700">
                  <span>Class: X Science</span>
                  <span>Batch: 2026 (Predicted)</span>
                  <span>Time: 3 Hours</span>
               </div>
            </div>

            {['MCQ', 'VSA', 'SA', 'LA', 'CASE'].map((type, sIdx) => {
               const qs = getQuestionsByType(type);
               if (qs.length === 0) return null;
               return (
                  <div key={type} className="mb-14 page-break-avoid">
                     <div className="bg-black text-white px-6 py-2.5 font-bold uppercase tracking-widest mb-8 text-center text-sm">
                        Section {String.fromCharCode(65 + sIdx)}: {
                          type === 'MCQ' ? 'Multiple Choice' : 
                          type === 'VSA' ? 'Very Short' : 
                          type === 'SA' ? 'Short Answer' : 
                          type === 'LA' ? 'Long Answer' : 'Case Study'
                        }
                     </div>
                     <div className="space-y-10">
                        {qs.map((q, idx) => (
                           <div key={idx} className="flex gap-6">
                              <span className="font-bold min-w-[3rem] text-xl">Q{(activeChapter.questions?.indexOf(q) || 0) + 1}.</span>
                              <div className="flex-grow text-xl leading-[1.6]">{q.text}</div>
                              <span className="font-bold whitespace-nowrap text-xl">[{q.marks}]</span>
                           </div>
                        ))}
                     </div>
                  </div>
               );
            })}

            {activeChapter.answersGenerated && (
               <div className="pt-20" style={{ pageBreakBefore: 'always' }}>
                  <div className="text-center border-b-4 border-red-600 pb-6 mb-12">
                     <h2 className="text-3xl font-black text-red-600 uppercase tracking-widest">A1 Grade Solutions Guide</h2>
                  </div>
                  <div className="space-y-16">
                     {activeChapter.questions?.map((q, idx) => {
                        const ans = activeChapter.answers?.find(a => a.questionId === q.id);
                        if (!ans) return null;
                        return (
                           <div key={idx} className="border-b border-slate-100 pb-12 last:border-none page-break-avoid">
                              <div className="flex items-center gap-3 mb-6">
                                <span className="bg-red-500 text-white px-4 py-1 font-black rounded text-sm">Ans {idx + 1}</span>
                              </div>
                              <div className="text-xl leading-[1.7] whitespace-pre-wrap text-slate-900 font-medium mb-8">
                                {ans.content}
                              </div>
                              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200">
                                <p className="text-xs font-black uppercase text-slate-400 mb-4 tracking-wider">CBSE Marking Points:</p>
                                <ul className="list-disc list-inside space-y-3 text-sm text-slate-700 font-bold">
                                  {ans.markingSchemePoints.map((pt, pIdx) => (
                                    <li key={pIdx}>{pt}</li>
                                  ))}
                                </ul>
                              </div>
                           </div>
                        );
                     })}
                  </div>
               </div>
            )}
            <div className="mt-24 text-center border-t-2 border-slate-100 pt-10 text-xs text-slate-300 font-black uppercase tracking-[0.5em]">
              Predictor Pro AI • Confidential Exam Resource
            </div>
          </div>
        )}
      </div>

      {/* 2. DASHBOARD */}
      <div className="no-print min-h-screen bg-slate-50 pb-12">
        <header className="bg-slate-900 text-white py-14 px-4 shadow-2xl mb-12 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/20 rounded-full blur-[120px] -mr-48 -mt-48"></div>
          <div className="container mx-auto max-w-6xl relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div>
              <div className="inline-flex items-center gap-2 bg-indigo-500/30 text-indigo-300 px-3 py-1 rounded-full text-[10px] font-black uppercase mb-4 tracking-widest border border-indigo-500/20">
                <i className="fas fa-brain"></i>
                Trend Analysis Engine Active
              </div>
              <h1 className="text-6xl font-black mb-3 tracking-tighter">Science Predictor</h1>
              <p className="text-slate-400 text-xl max-w-lg font-medium leading-relaxed">High-yield board predictions for Class X 2026 Batch.</p>
            </div>
            <div className="flex items-center gap-6 bg-white/5 p-8 rounded-[2.5rem] border border-white/10 backdrop-blur-md shadow-2xl">
               <div className="text-center px-6 border-r border-white/10">
                  <div className="text-3xl font-black text-indigo-400">80/80</div>
                  <div className="text-[10px] uppercase font-black text-slate-500 tracking-wider">Goal</div>
               </div>
               <div className="text-center px-6">
                  <div className="text-3xl font-black text-emerald-400">13</div>
                  <div className="text-[10px] uppercase font-black text-slate-500 tracking-wider">Topics</div>
               </div>
            </div>
          </div>
        </header>

        <main className="container mx-auto max-w-6xl px-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {chapters.map((chapter) => (
            <div key={chapter.id} className="group bg-white rounded-[3rem] p-10 shadow-sm border border-slate-100 transition-all hover:shadow-2xl hover:-translate-y-2">
              <span className="text-[11px] font-black px-4 py-1.5 rounded-full uppercase border bg-slate-50 text-slate-500 mb-8 inline-block tracking-tighter group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">Topic {chapter.id}</span>
              <h3 className="text-3xl font-black text-slate-800 mb-10 min-h-[5rem] leading-[1.1] tracking-tight group-hover:text-indigo-600 transition-colors">{chapter.name}</h3>
              {chapter.status === 'ready' ? (
                <button onClick={() => startPrediction(chapter)} className="w-full bg-slate-900 hover:bg-indigo-600 text-white font-black py-5 rounded-[1.5rem] transition-all shadow-xl shadow-slate-200 active:scale-95">Analyze Topic</button>
              ) : chapter.status === 'generating' ? (
                <div className="w-full bg-indigo-50 text-indigo-600 font-black py-5 rounded-[1.5rem] flex items-center justify-center gap-3 animate-pulse shimmer">
                  Scanning Data...
                </div>
              ) : (
                <button onClick={() => setActiveChapter(chapter)} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black py-5 rounded-[1.5rem] transition-all shadow-xl shadow-emerald-100 active:scale-95 flex items-center justify-center gap-3">
                  <i className="fas fa-eye"></i>
                  View Hotspots
                </button>
              )}
            </div>
          ))}
        </main>

        {activeChapter && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-lg animate-in fade-in duration-300">
            <div className="bg-white rounded-[4rem] shadow-2xl w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col border border-white/20 animate-in zoom-in-95 duration-300">
              <div className="p-12 bg-slate-900 text-white flex-shrink-0 flex justify-between items-center border-b border-white/5 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-indigo-500/10 to-transparent"></div>
                <div className="relative z-10">
                  <div className="text-indigo-400 text-[10px] font-black uppercase mb-2 flex items-center gap-2 tracking-[0.2em]">
                    <i className="fas fa-bolt"></i>
                    Exam Prediction Set
                  </div>
                  <h2 className="text-4xl font-black tracking-tight">{activeChapter.name}</h2>
                </div>
                <button onClick={() => setActiveChapter(null)} className="w-16 h-16 bg-white/10 rounded-[2rem] hover:bg-white/20 transition-all flex items-center justify-center text-white/50 hover:text-white relative z-10 active:scale-90">
                  <i className="fas fa-times text-xl"></i>
                </button>
              </div>
              
              <div className="overflow-y-auto p-12 bg-slate-50/50 custom-scrollbar flex-grow space-y-10">
                {activeChapter.questions?.map((q, idx) => {
                  const ans = activeChapter.answers?.find(a => a.questionId === q.id);
                  return (
                    <div key={idx} className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all">
                      <div className="flex flex-wrap gap-3 mb-6">
                        <span className="text-[11px] font-black px-4 py-2 rounded-full border bg-blue-50 text-blue-600 border-blue-100 uppercase tracking-tighter">{q.type} • {q.marks}M</span>
                        <span className="text-[11px] font-black px-4 py-2 rounded-full border bg-red-50 text-red-600 border-red-100 uppercase tracking-tighter">{q.probabilityScore}% Probable</span>
                      </div>
                      <p className="text-2xl font-black text-slate-800 leading-tight mb-6">{q.text}</p>
                      <p className="text-sm text-slate-400 font-medium mb-6">Reason: {q.reasoning}</p>
                      
                      {activeChapter.answersGenerated && ans && (
                        <div className="mt-8 p-10 bg-indigo-50/50 rounded-[2.5rem] border border-indigo-100 animate-in slide-in-from-top-4 duration-500">
                          <div className="flex items-center gap-2 mb-6">
                            <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
                            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Model Solution</span>
                          </div>
                          <p className="text-slate-700 leading-relaxed text-lg whitespace-pre-wrap font-bold mb-6">{ans.content}</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {ans.markingSchemePoints.map((pt, pIdx) => (
                              <div key={pIdx} className="flex items-start gap-3 bg-white/60 p-4 rounded-2xl border border-indigo-50 text-xs font-bold text-slate-600">
                                <i className="fas fa-check text-indigo-500 mt-0.5"></i>
                                {pt}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="p-10 bg-white border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-8 flex-shrink-0">
                <div className="flex items-center gap-4">
                  <button onClick={handleGenerateAnswers} disabled={activeChapter.answersGenerated || loadingAnswers} className={`font-black px-10 py-5 rounded-[1.5rem] transition-all shadow-2xl flex items-center gap-3 active:scale-95 ${activeChapter.answersGenerated ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200'}`}>
                    {loadingAnswers ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-unlock"></i>}
                    {activeChapter.answersGenerated ? 'Solutions Unlocked' : 'Unlock Expert Answers'}
                  </button>
                  <button onClick={handleMoreQuestions} disabled={loadingMore} className="bg-slate-100 text-slate-700 font-black px-8 py-5 rounded-[1.5rem] hover:bg-slate-200 transition-all active:scale-95">
                    {loadingMore ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-plus mr-2"></i>}
                    Add More
                  </button>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-6">
                  <button onClick={handleDownloadPdf} disabled={generatingPdf} className="flex flex-col items-center group disabled:opacity-30 active:scale-90 transition-transform">
                    <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center group-hover:bg-red-100 transition-all mb-1 border border-red-100">
                      <i className="fas fa-file-pdf text-red-500 text-xl"></i>
                    </div>
                    <span className="text-[10px] font-black text-slate-400 group-hover:text-slate-600">SAVE PDF</span>
                  </button>
                  <button onClick={handleDownloadTxt} className="flex flex-col items-center group active:scale-90 transition-transform">
                    <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center group-hover:bg-slate-100 transition-all mb-1 border border-slate-100">
                      <i className="fas fa-file-alt text-slate-500 text-xl"></i>
                    </div>
                    <span className="text-[10px] font-black text-slate-400 group-hover:text-slate-600">SAVE TXT</span>
                  </button>
                  <button onClick={handleCopyToClipboard} className="flex flex-col items-center group active:scale-90 transition-transform">
                    <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center group-hover:bg-slate-100 transition-all mb-1 border border-slate-100">
                      <i className="fas fa-copy text-slate-500 text-xl"></i>
                    </div>
                    <span className="text-[10px] font-black text-slate-400 group-hover:text-slate-600">COPY</span>
                  </button>
                  <div className="w-px h-12 bg-slate-100 mx-2"></div>
                  <button onClick={() => setActiveChapter(null)} className="bg-slate-900 text-white font-black px-12 py-5 rounded-[1.5rem] hover:bg-black transition-all shadow-xl shadow-slate-200 active:scale-95">Close</button>
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
