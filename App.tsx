
import React, { useEffect, useState, useMemo } from 'react';
import { processBrainDump, generateSlideImage } from './geminiService';
import { exportToPptx, exportToDocx } from './exportService';
import { Button } from './components/Button';
import { SlideCard } from './components/SlideCard';
import { HistoryView } from './components/HistoryView';
import { Presentation, AppStatus, Slide } from './types';

const STORAGE_KEY = 'brain_dump_history_v1';

const HUMOROUS_MESSAGES = [
  "Convincing your boss this wasn't an 11 PM epiphany...",
  "Dressing up your shower thoughts for a board meeting...",
  "Validating your 3 AM 'million-dollar' epiphany...",
  "Turning your caffeinated rants into a professional-looking strategy...",
  "Hiding the fact that you're just making this up as you go...",
  "Proving to your cat that your business plan is actually scalable...",
  "Making sure this looks intentional and not just mental clutter...",
  "Ensuring you look like the smartest person in the Zoom room today...",
  "Transforming your late-night notes into something that won't get ignored...",
  "Polishing that brain-fart until it shines like a multi-million dollar pitch..."
];

const compressImage = (dataUrl: string, maxWidth = 960, quality = 0.75): Promise<string> =>
  new Promise((resolve) => {
    if (!dataUrl) { resolve(dataUrl); return; }
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(dataUrl); return; }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });

const compressPresentation = async (p: Presentation): Promise<Presentation> => ({
  ...p,
  coverImageUrl: p.coverImageUrl ? await compressImage(p.coverImageUrl) : undefined,
  slides: await Promise.all(
    p.slides.map(async (s) => ({
      ...s,
      imageUrl: s.imageUrl ? await compressImage(s.imageUrl) : undefined,
    }))
  ),
});

const App: React.FC = () => {
  const [brainDump, setBrainDump] = useState('');
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [result, setResult] = useState<Presentation | null>(null);
  const [history, setHistory] = useState<Presentation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isDocxExporting, setIsDocxExporting] = useState(false);
  const [imageProgress, setImageProgress] = useState({ current: 0, total: 0 });

  const loadingMessage = useMemo(() => {
    return HUMOROUS_MESSAGES[Math.floor(Math.random() * HUMOROUS_MESSAGES.length)];
  }, [status === AppStatus.GENERATING_IMAGES]);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load history", e);
      }
    }
  }, []);

  const saveHistory = (newHistory: Presentation[]) => {
    const trySave = (data: Presentation[]): boolean => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        return true;
      } catch (e) {
        return false;
      }
    };

    const stripImages = (p: Presentation): Presentation => ({
      ...p,
      coverImageUrl: undefined,
      slides: p.slides.map(s => ({ ...s, imageUrl: undefined }))
    });

    // 1. Save everything with images
    if (trySave(newHistory)) {
      setHistory(newHistory);
      return;
    }

    // 2. Strip images from older items one by one (index 3+)
    let prunedHistory = [...newHistory];
    for (let i = prunedHistory.length - 1; i >= 3; i--) {
      if (result && prunedHistory[i].id === result.id) continue;
      prunedHistory[i] = stripImages(prunedHistory[i]);
      if (trySave(prunedHistory)) {
        setHistory(prunedHistory);
        return;
      }
    }

    // 3. Strip images from ALL items (text-only history, full list)
    const textOnlyHistory = newHistory.map(stripImages);
    if (trySave(textOnlyHistory)) {
      console.warn("Storage tight: saved full history as text-only.");
      setHistory(textOnlyHistory);
      return;
    }

    // 4. Text-only, trimmed to 10 most recent
    const trimmedHistory = textOnlyHistory.slice(0, 10);
    if (trySave(trimmedHistory)) {
      console.warn("Storage tight: saved 10 most recent as text-only.");
      setHistory(trimmedHistory);
      return;
    }

    // 5. Absolute last resort: clear
    console.error("Storage unrecoverable. Clearing history.");
    localStorage.removeItem(STORAGE_KEY);
    setHistory([]);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!brainDump.trim()) return;

    setStatus(AppStatus.PROCESSING);
    setError(null);
    setResult(null);

    try {
      const presentationData = await processBrainDump(brainDump);
      setResult(presentationData);
      
      setStatus(AppStatus.GENERATING_IMAGES);
      setImageProgress({ current: 0, total: (presentationData.slides?.length || 0) + 1 });
      
      const theme = presentationData.visualTheme || "Modern professional illustration";
      
      setImageProgress(prev => ({ ...prev, current: 1 }));
      const coverImageUrl = await generateSlideImage(
        presentationData.title, 
        "Cinematic cover artwork representing the core concept", 
        theme,
        presentationData.genericStyleDescription,
        "A professional and cinematic conceptual cover illustration"
      );
      
      const slidesWithImages: Slide[] = [];
      const slidesToProcess = presentationData.slides || [];
      
      for (let i = 0; i < slidesToProcess.length; i++) {
        const slide = slidesToProcess[i];
        setImageProgress(prev => ({ ...prev, current: i + 2 }));
        const imageUrl = await generateSlideImage(
          slide.title, 
          slide.visualContent, 
          theme,
          presentationData.genericStyleDescription,
          (slide as any).genericVisualContent || slide.visualContent
        );
        slidesWithImages.push({ ...slide, imageUrl });
      }

      const finalResult = { ...presentationData, slides: slidesWithImages, coverImageUrl };
      setResult(finalResult);
      const compressedResult = await compressPresentation(finalResult);
      saveHistory([compressedResult, ...history]);

      setStatus(AppStatus.COMPLETED);
      setTimeout(() => {
        document.getElementById('results')?.scrollIntoView({ behavior: 'smooth' });
      }, 300);
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
      setStatus(AppStatus.ERROR);
    }
  };

  const handlePptxExport = async (p: Presentation) => {
    setIsExporting(true);
    try {
      await exportToPptx(p);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDocxExport = async (p: Presentation) => {
    setIsDocxExporting(true);
    try {
      await exportToDocx(p);
    } finally {
      setIsDocxExporting(false);
    }
  };

  const reset = () => {
    setStatus(AppStatus.IDLE);
    setResult(null);
    setBrainDump('');
    setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 selection:bg-indigo-100 selection:text-indigo-700">
      <header className="py-10 px-6 max-w-5xl mx-auto flex justify-between items-center">
        <div className="flex items-center gap-2 group cursor-pointer" onClick={reset}>
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-indigo-100">🧠</div>
          <h1 className="text-2xl font-bold font-heading text-slate-800">
            Brain-Dump <span className="text-indigo-600">→</span> Slides
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => setStatus(status === AppStatus.HISTORY ? AppStatus.IDLE : AppStatus.HISTORY)}>
            History {history.length > 0 && <span className="ml-1 opacity-50">({history.length})</span>}
          </Button>
          {(status === AppStatus.COMPLETED || status === AppStatus.ERROR) && <Button variant="ghost" onClick={reset}>Start over</Button>}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6">
        {status === AppStatus.HISTORY && (
          <HistoryView 
            history={history} 
            onSelect={(p) => {setResult(p); setStatus(AppStatus.COMPLETED);}} 
            onDelete={(id) => saveHistory(history.filter(h => h.id !== id))} 
            onExport={handlePptxExport} 
            onExportDocx={handleDocxExport} 
          />
        )}

        {status === AppStatus.IDLE && (
          <div className="space-y-10 animate-in fade-in duration-500">

            {/* Hero */}
            <div className="space-y-3 max-w-2xl mx-auto text-center">
              <h2 className="text-4xl md:text-5xl font-bold text-slate-900 leading-tight">
                Turn messy thoughts into structured slides.
              </h2>
              <p className="text-lg text-slate-500">
                Speak or paste your ideas. We organize them into a clean presentation you can edit and use.
              </p>
            </div>

            {/* 3-step row */}
            <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto">
              {[
                { n: '1', label: 'Dump your thoughts' },
                { n: '2', label: 'We organize them into slides' },
                { n: '3', label: 'Download and edit' },
              ].map(({ n, label }) => (
                <div key={n} className="flex flex-col items-center gap-2 text-center">
                  <span className="w-8 h-8 rounded-full bg-indigo-600 text-white text-sm font-bold flex items-center justify-center shrink-0">{n}</span>
                  <span className="text-sm text-slate-600 font-medium leading-snug">{label}</span>
                </div>
              ))}
            </div>

            {/* Text input — primary */}
            <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <textarea
                className="w-full h-56 p-6 bg-transparent focus:outline-none text-base text-slate-700 resize-none placeholder:text-slate-400 leading-relaxed"
                placeholder={`I need a pitch deck\n\nMy app helps ADHD founders\n\nI want to explain the problem and solution\n\nThis is for investors`}
                value={brainDump}
                onChange={(e) => setBrainDump(e.target.value)}
              />
              <div className="flex justify-end px-4 py-3 bg-slate-50 border-t border-slate-100">
                <Button type="submit" disabled={!brainDump.trim()} className="w-full md:w-auto">Create my slides</Button>
              </div>
            </form>


          </div>
        )}

        {(status === AppStatus.PROCESSING || status === AppStatus.GENERATING_IMAGES) && (
          <div className="fixed inset-0 bg-white/60 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
            <div className="w-24 h-24 mb-8 text-indigo-600 animate-spin">
               <svg viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
            </div>
            <h3 className="text-2xl font-bold text-slate-800">{status === AppStatus.PROCESSING ? 'Structuring the chaos...' : loadingMessage}</h3>
            <p className="text-slate-500 mt-2">{status === AppStatus.GENERATING_IMAGES && `Slide ${imageProgress.current} of ${imageProgress.total}`}</p>
          </div>
        )}

        {status === AppStatus.ERROR && (
          <div className="text-center py-20 bg-white rounded-[2.5rem] border border-rose-100 shadow-xl animate-in fade-in duration-500">
            <h3 className="text-xl font-bold text-slate-800">Oops! We hit a snag</h3>
            <p className="text-slate-500 mt-2">{error || "Something went wrong."}</p>
            <Button onClick={reset} variant="ghost" className="mt-8 border-slate-200">Try Again</Button>
          </div>
        )}

        {status === AppStatus.COMPLETED && result && (
          <div id="results" className="space-y-12 animate-in slide-in-from-bottom-8 duration-700">
            <div className="bg-white rounded-[3rem] p-10 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
               <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-3xl">✨</div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800">{result.title}</h2>
                    <p className="text-slate-400 text-sm font-medium uppercase tracking-widest mt-1">Ready for export • {result.slideCount} Slides</p>
                  </div>
               </div>
               <div className="flex gap-2">
                 <Button onClick={() => handlePptxExport(result)} isLoading={isExporting} className="whitespace-nowrap">Download PPTX</Button>
                 <Button onClick={() => handleDocxExport(result)} isLoading={isDocxExporting} variant="ghost" className="whitespace-nowrap">Download Script (Word)</Button>
               </div>
            </div>
            <div className="space-y-12">
              <SlideCard isTitleSlide slide={{ title: result.title, summary: result.summary, coverImageUrl: result.coverImageUrl }} />
              {result.slides.map((slide, index) => <SlideCard key={index} slide={slide} index={index} />)}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
