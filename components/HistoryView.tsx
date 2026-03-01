
import React from 'react';
import { Presentation } from '../types';
import { Button } from './Button';

interface HistoryViewProps {
  history: Presentation[];
  onSelect: (p: Presentation) => void;
  onDelete: (id: string) => void;
  onExport: (p: Presentation) => void;
  onExportDocx: (p: Presentation) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ history, onSelect, onDelete, onExport, onExportDocx }) => {
  const formatDate = (ts: number) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(ts));
  };

  const hasImages = (item: Presentation) => {
    return !!item.coverImageUrl || item.slides.some(s => !!s.imageUrl);
  };

  if (history.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-[2.5rem] border border-dashed border-slate-200 animate-in fade-in duration-500">
        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mx-auto mb-4">
           <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
           </svg>
        </div>
        <h3 className="text-xl font-bold text-slate-800">No history yet</h3>
        <p className="text-slate-400 max-w-xs mx-auto mt-2 leading-relaxed">
          Your processed brain dumps will appear here once you've generated some slides.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between px-2">
        <h3 className="text-2xl font-bold text-slate-800 font-heading">Recent Brain Dumps</h3>
        <span className="text-slate-400 text-sm">{history.length} items saved</span>
      </div>
      
      <div className="grid gap-4">
        {history.map((item) => {
          const visualsAvailable = hasImages(item);
          return (
            <div 
              key={item.id} 
              className="group bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1 overflow-hidden">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                      {formatDate(item.timestamp)}
                    </span>
                    <span className="w-1 h-1 rounded-full bg-slate-200"></span>
                    <span className="text-xs font-bold text-indigo-500">
                      {item.slideCount} Slides
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-tight ${visualsAvailable ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-100 text-slate-400'}`}>
                      {visualsAvailable ? '✨ Full Visuals' : '📄 Text Only'}
                    </span>
                  </div>
                  <h4 className="text-lg font-bold text-slate-800 line-clamp-1 group-hover:text-indigo-600 transition-colors">
                    {item.title}
                  </h4>
                  <p className="text-sm text-slate-500 line-clamp-1 italic">
                    {item.summary}
                  </p>
                </div>
                
                <div className="flex items-center gap-2 shrink-0">
                  <Button 
                    onClick={() => onSelect(item)} 
                    variant="ghost" 
                    className="px-4 py-2 text-sm bg-indigo-50 border-transparent text-indigo-600 hover:bg-indigo-100"
                  >
                    View Slides
                  </Button>
                  <Button 
                    onClick={() => onExport(item)} 
                    variant="ghost" 
                    className="px-3 py-2 text-sm border-slate-200 hover:border-indigo-200"
                    title={visualsAvailable ? "Download PPTX with Images" : "Download Text-Only PPTX"}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </Button>
                  <Button 
                    onClick={() => onExportDocx(item)} 
                    variant="ghost" 
                    className="px-3 py-2 text-sm border-slate-200 hover:border-indigo-200"
                    title="Download Speaker Notes (Word)"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </Button>
                  <Button 
                    onClick={() => onDelete(item.id)} 
                    variant="ghost" 
                    className="px-3 py-2 text-sm border-transparent text-slate-400 hover:text-rose-500 hover:bg-rose-50"
                    title="Delete"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      <p className="text-center text-xs text-slate-400 mt-8 italic">
        History is saved locally on your device. High-res images may be cleared for older entries to save space.
      </p>
    </div>
  );
};
