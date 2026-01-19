
import React, { useState, useRef } from 'react';
import html2pdf from 'html2pdf.js';
import { Chapter, Question, Answer } from './types';
import { generateChapterPredictions, generateAnswersForQuestions } from './services/geminiService';
import { CHAPTER_OCR_DATA } from './data/chapterContent';

const CHAPTER_METADATA = [
  { name: "Chemical Reactions and Equations", category: "CHEMISTRY" },
  { name: "Acids, Bases and Salts", category: "CHEMISTRY" },
  { name: "Metals and Non-metals", category: "CHEMISTRY" },
  { name: "Carbon and its Compounds", category: "CHEMISTRY" },
  { name: "Life Processes", category: "BIOLOGY" },
  { name: "Control and Coordination", category: "BIOLOGY" },
  { name: "How do Organisms Reproduce?", category: "BIOLOGY" },
  { name: "Heredity", category: "BIOLOGY" },
  { name: "Light – Reflection and Refraction", category: "PHYSICS" },
  { name: "The Human Eye and the Colourful World", category: "PHYSICS" },
  { name: "Electricity", category: "PHYSICS" },
  { name: "Magnetic Effects of Electric Current", category: "PHYSICS" },
  { name: "Our Environment", category: "ECOLOGY" }
];

const App: React.FC = () => {
  const [chapters, setChapters] = useState<Chapter[]>(
    CHAPTER_METADATA.map((meta, index) => ({
      id: index + 1,
      name: meta.name,
      status: 'ready',
      answersGenerated: false,
      category: meta.category
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
      element.style.visibility = 'visible';
      element.style.left = '0';
      element.style.position = 'relative';
      element.style.zIndex = '9999';

      await html2pdf().set(opt).from(element).save();
      showFeedback("PDF Download Complete!");
    } catch (err) {
      console.error("PDF generation error:", err);
      setError("PDF engine failed.");
    } finally {
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
    showFeedback("Exported as Text!");
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

  const getCategoryColor = (category?: string) => {
    switch(category) {
      case 'CHEMISTRY': return 'bg-cyan-50 text-cyan-600 border-cyan-100';
      case 'BIOLOGY': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'PHYSICS': return 'bg-blue-50 text-blue-600 border-blue-100';
      case 'ECOLOGY': return 'bg-lime-50 text-lime-600 border-lime-100';
      default: return 'bg-gray-50 text-gray-600 border-gray-100';
    }
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#f1f5f9]">
      {/* PDF Generation Loader */}
      {generatingPdf && (
        <div className="fixed inset-0 z-[300] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white p-10 rounded-3xl shadow-2xl text-center space-y-6 max-w-sm">
            <div className="w-16 h-16 border-4 border-slate-100 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
            <h3 className="text-xl font-bold text-slate-800">Generating Exam Paper...</h3>
          </div>
        </div>
      )}

      {/* Feedback Toast */}
      {feedback && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[250] bg-slate-900 text-white px-8 py-4 rounded-full shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
          <i className="fas fa-check-circle text-emerald-400"></i>
          <span className="font-bold text-sm">{feedback}</span>
        </div>
      )}

      {/* Off-screen Print Template */}
      <div ref={printRef} className="print-template font-serif p-16 bg-white text-black">
        {activeChapter && (
          <div className="pdf-container">
            <div className="text-center border-b-8 border-black pb-10 mb-12">
               <p className="text-sm font-bold uppercase tracking-[0.3em] mb-2 text-slate-600">Central Board of Secondary Education</p>
               <h1 className="text-4xl font-black uppercase mb-4 tracking-tight">Secondary School Examination 2026</h1>
               <p className="text-2xl font-bold border-t-2 border-slate-100 pt-6">{activeChapter.name}</p>
            </div>
            {/* ... sections ... */}
            {['MCQ', 'VSA', 'SA', 'LA', 'CASE'].map((type, sIdx) => {
               const qs = getQuestionsByType(type);
               if (qs.length === 0) return null;
               return (
                  <div key={type} className="mb-14 page-break-avoid">
                     <div className="bg-black text-white px-6 py-2.5 font-bold uppercase tracking-widest mb-8 text-center text-sm">Section {String.fromCharCode(65 + sIdx)}</div>
                     <div className="space-y-10">
                        {qs.map((q, idx) => (
                           <div key={idx} className="flex gap-6">
                              <span className="font-bold min-w-[3rem] text-xl">Q{(activeChapter.questions?.indexOf(q) || 0) + 1}.</span>
                              <div className="flex-grow text-xl leading-[1.6]">{q.text}</div>
                              <span className="font-bold text-xl">[{q.marks}]</span>
                           </div>
                        ))}
                     </div>
                  </div>
               );
            })}
          </div>
        )}
      </div>

      {/* DASHBOARD HEADER - MATCHED TO SCREENSHOT */}
      <div className="no-print">
        <header className="bg-[#0f172a] text-white py-16 px-6 relative overflow-hidden">
          <div className="container mx-auto max-w-7xl relative z-10">
            <div className="inline-flex items-center gap-2 bg-[#1e293b] text-[#818cf8] px-3 py-1 rounded-md text-[10px] font-bold uppercase mb-6 border border-[#334155]">
              <i className="fas fa-microchip text-[8px]"></i>
              Deep Trend AI Active
            </div>
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8">
              <div className="max-w-3xl">
                <h1 className="text-6xl font-black mb-6 tracking-tight leading-none">Science: 2026 X Board Predictor</h1>
                <p className="text-slate-400 text-xl font-medium max-w-2xl leading-relaxed">Most probable Science questions based on NCERT content and last 5 years patterns.</p>
              </div>
              <div className="flex items-center gap-12 bg-white/5 p-6 rounded-2xl backdrop-blur-sm border border-white/10">
                <div className="text-center pr-12 border-r border-white/10">
                  <div className="text-4xl font-black text-white">13</div>
                  <div className="text-[10px] uppercase font-bold text-slate-500 tracking-widest mt-1">Chapters</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-black text-[#818cf8]">2026</div>
                  <div className="text-[10px] uppercase font-bold text-slate-500 tracking-widest mt-1">Target Year</div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* MAIN GRID - MATCHED TO SCREENSHOT */}
        <main className="container mx-auto max-w-7xl px-6 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {chapters.map((chapter) => (
              <div key={chapter.id} className="bg-white rounded-[2.5rem] p-10 shadow-sm transition-all hover:shadow-xl hover:-translate-y-1 flex flex-col justify-between">
                <div>
                  <span className={`inline-block text-[10px] font-black px-4 py-1.5 rounded-full uppercase border mb-8 tracking-tighter ${getCategoryColor(chapter.category as string)}`}>
                    {chapter.category} • CH {chapter.id}
                  </span>
                  <h3 className="text-3xl font-black text-[#1e293b] mb-10 leading-[1.15] tracking-tight">{chapter.name}</h3>
                </div>
                
                {chapter.status === 'ready' ? (
                  <button onClick={() => startPrediction(chapter)} className="w-full bg-[#111827] hover:bg-[#1e293b] text-white font-black py-5 rounded-2xl transition-all flex items-center justify-center gap-3 group active:scale-95 shadow-lg shadow-slate-200">
                    <i className="fas fa-bolt text-yellow-400 group-hover:animate-pulse"></i>
                    Get Predictions
                  </button>
                ) : chapter.status === 'generating' ? (
                  <div className="w-full bg-slate-50 text-slate-400 font-bold py-5 rounded-2xl flex items-center justify-center gap-3 animate-pulse border border-slate-100">
                    <i className="fas fa-circle-notch fa-spin"></i>
                    Predicting...
                  </div>
                ) : (
                  <button onClick={() => setActiveChapter(chapter)} className="w-full bg-[#111827] hover:bg-[#1e293b] text-white font-black py-5 rounded-2xl transition-all flex items-center justify-center gap-3 active:scale-95">
                    <i className="fas fa-eye text-emerald-400"></i>
                    View Results
                  </button>
                )}
              </div>
            ))}
          </div>
        </main>

        {/* PREDICTION MODAL */}
        {activeChapter && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white rounded-[3.5rem] shadow-2xl w-full max-w-6xl max-h-[92vh] overflow-hidden flex flex-col border border-white/20 animate-in zoom-in-95 duration-300">
              <div className="p-12 bg-[#0f172a] text-white flex-shrink-0 flex justify-between items-center border-b border-white/5">
                <div>
                  <div className="text-[#818cf8] text-[10px] font-bold uppercase mb-2 tracking-[0.2em] flex items-center gap-2">
                    <i className="fas fa-sparkles"></i>
                    Hotspot Analysis Engine
                  </div>
                  <h2 className="text-4xl font-extrabold tracking-tight">{activeChapter.name}</h2>
                </div>
                <button onClick={() => setActiveChapter(null)} className="w-16 h-16 bg-white/10 rounded-2xl hover:bg-white/20 transition-all flex items-center justify-center active:scale-90">
                  <i className="fas fa-times text-xl"></i>
                </button>
              </div>
              
              <div className="overflow-y-auto p-12 bg-[#f8fafc] custom-scrollbar flex-grow space-y-8">
                {activeChapter.questions?.map((q, idx) => {
                  const ans = activeChapter.answers?.find(a => a.questionId === q.id);
                  return (
                    <div key={idx} className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-slate-100 group transition-all hover:border-[#818cf8]/30">
                      <div className="flex flex-wrap gap-3 mb-6">
                        <span className="text-[10px] font-black px-4 py-2 rounded-full border bg-blue-50 text-blue-600 border-blue-100 uppercase tracking-tighter">{q.type} • {q.marks} Marks</span>
                        <span className="text-[10px] font-black px-4 py-2 rounded-full border bg-amber-50 text-amber-600 border-amber-100 uppercase tracking-tighter">{q.probabilityScore}% Probable</span>
                      </div>
                      <p className="text-2xl font-black text-[#1e293b] leading-snug mb-6">{q.text}</p>
                      <p className="text-sm text-slate-500 font-medium bg-slate-50 p-4 rounded-xl italic">
                        <i className="fas fa-lightbulb text-amber-400 mr-2"></i>
                        {q.reasoning}
                      </p>
                      
                      {activeChapter.answersGenerated && ans && (
                        <div className="mt-8 p-10 bg-[#f1f5f9] rounded-[2rem] border border-slate-200 animate-in slide-in-from-top-4 duration-500">
                          <p className="text-indigo-600 text-[10px] font-black uppercase tracking-widest mb-4">A1-Grade Solution Guide</p>
                          <p className="text-[#334155] leading-relaxed text-lg font-bold mb-6 whitespace-pre-wrap">{ans.content}</p>
                          <div className="flex flex-wrap gap-4">
                            {ans.markingSchemePoints.map((pt, pIdx) => (
                              <div key={pIdx} className="bg-white px-5 py-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 flex items-center gap-2">
                                <i className="fas fa-check text-emerald-500"></i>
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

              <div className="p-10 bg-white border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-8">
                <div className="flex items-center gap-4">
                  <button onClick={handleGenerateAnswers} disabled={activeChapter.answersGenerated || loadingAnswers} className={`font-black px-10 py-5 rounded-2xl transition-all shadow-xl flex items-center gap-3 active:scale-95 ${activeChapter.answersGenerated ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-[#818cf8] text-white hover:bg-[#6366f1]'}`}>
                    {loadingAnswers ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-key"></i>}
                    {activeChapter.answersGenerated ? 'Solutions Unlocked' : 'Unlock Model Answers'}
                  </button>
                  <button onClick={handleMoreQuestions} disabled={loadingMore} className="bg-slate-100 text-slate-700 font-black px-8 py-5 rounded-2xl hover:bg-slate-200 transition-all active:scale-95">
                    {loadingMore ? <i className="fas fa-circle-notch fa-spin mr-2"></i> : <i className="fas fa-plus mr-2 text-xs"></i>}
                    Expand Set
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-6">
                  <button onClick={handleDownloadPdf} disabled={generatingPdf} className="flex flex-col items-center group disabled:opacity-30 active:scale-90 transition-transform">
                    <div className="w-14 h-14 bg-red-50 rounded-xl flex items-center justify-center group-hover:bg-red-100 transition-all mb-1 border border-red-100 shadow-sm">
                      <i className="fas fa-file-pdf text-red-500 text-xl"></i>
                    </div>
                    <span className="text-[9px] font-black text-slate-400">PDF</span>
                  </button>
                  <button onClick={handleDownloadTxt} className="flex flex-col items-center group active:scale-90 transition-transform">
                    <div className="w-14 h-14 bg-slate-50 rounded-xl flex items-center justify-center group-hover:bg-slate-100 transition-all mb-1 border border-slate-200 shadow-sm">
                      <i className="fas fa-file-alt text-slate-500 text-xl"></i>
                    </div>
                    <span className="text-[9px] font-black text-slate-400">TXT</span>
                  </button>
                  <button onClick={handleCopyToClipboard} className="flex flex-col items-center group active:scale-90 transition-transform">
                    <div className="w-14 h-14 bg-slate-50 rounded-xl flex items-center justify-center group-hover:bg-slate-100 transition-all mb-1 border border-slate-200 shadow-sm">
                      <i className="fas fa-copy text-slate-500 text-xl"></i>
                    </div>
                    <span className="text-[9px] font-black text-slate-400">COPY</span>
                  </button>
                  <div className="w-px h-12 bg-slate-100 mx-2"></div>
                  <button onClick={() => setActiveChapter(null)} className="bg-[#1e293b] text-white font-black px-12 py-5 rounded-2xl hover:bg-black transition-all active:scale-95">Done</button>
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
