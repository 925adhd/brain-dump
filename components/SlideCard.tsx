
import React from 'react';
import { Slide } from '../types';

interface SlideCardProps {
  slide: Slide | { title: string; summary: string; coverImageUrl?: string };
  index?: number;
  isTitleSlide?: boolean;
}

export const SlideCard: React.FC<SlideCardProps> = ({ slide, index, isTitleSlide }) => {
  const imageUrl = isTitleSlide ? (slide as any).coverImageUrl : (slide as Slide).imageUrl;
  const isVisualHero = !isTitleSlide && (slide as Slide).recommendedAsVisualOnly && imageUrl;

  return (
    <div className="bg-[#F8FAFC] rounded-[2.5rem] overflow-hidden border border-slate-200 shadow-sm hover:shadow-md transition-all group relative">
      <div className={`absolute left-0 top-0 bottom-0 w-2 ${isTitleSlide ? 'bg-indigo-400' : 'bg-indigo-600'} z-20`}></div>

      {imageUrl ? (
        <div className="w-full aspect-video relative overflow-hidden bg-slate-100 flex items-center justify-center">
           <img 
            src={imageUrl} 
            alt={slide.title} 
            className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
           />
           {!isVisualHero && (
             <>
               <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent"></div>
               <div className="absolute bottom-8 left-10 right-10">
                  <h3 className={`${isTitleSlide ? 'text-5xl' : 'text-4xl'} font-bold text-white font-heading leading-tight drop-shadow-lg`}>
                    {slide.title}
                  </h3>
                  {isTitleSlide && (slide as any).summary && (
                    <p className="text-white/80 text-xl mt-4 italic font-medium drop-shadow-md">{(slide as any).summary}</p>
                  )}
               </div>
             </>
           )}
        </div>
      ) : (
        <div className="p-10 pb-8 bg-slate-50 border-b border-slate-100 flex flex-col justify-center min-h-[200px]">
          <h3 className={`${isTitleSlide ? 'text-5xl' : 'text-4xl'} font-bold text-slate-800 font-heading leading-tight pt-4`}>
            {slide.title}
          </h3>
          {isTitleSlide && (slide as any).summary && (
            <p className="text-slate-500 text-xl mt-4 italic font-medium">{(slide as any).summary}</p>
          )}
          {!isTitleSlide && <p className="text-slate-400 text-sm mt-6 italic font-medium flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
            Visual asset not available for this slide
          </p>}
        </div>
      )}

      <div className="p-10 space-y-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className={`text-xs font-bold text-white ${isTitleSlide ? 'bg-indigo-400' : 'bg-indigo-600'} px-4 py-1.5 rounded-full uppercase tracking-widest`}>
              {isTitleSlide ? 'Title Slide' : `Slide ${index !== undefined ? index + 1 : ''}`}
            </span>
            {isVisualHero && (
              <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-100 flex items-center gap-1">
                🎨 Visual Hero
              </span>
            )}
          </div>
        </div>

        {!isVisualHero && !isTitleSlide && (
          <div className="bg-white/60 rounded-[2rem] p-8 border border-white shadow-inner">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">On-Screen Content</h4>
            <ul className="space-y-5">
              {(slide as Slide).bullets.map((bullet, idx) => (
                <li key={idx} className="flex items-start gap-4 text-slate-700 text-xl leading-relaxed font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 mt-2 shrink-0"></span>
                  {bullet}
                </li>
              ))}
            </ul>
          </div>
        )}

        {!isTitleSlide && (
          <div className="grid md:grid-cols-2 gap-8 pt-6">
            <div className="space-y-4">
              <h4 className="text-[10px] font-bold text-emerald-600 uppercase tracking-[0.2em] flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                Visual Instruction
              </h4>
              <p className="text-sm text-slate-500 italic bg-white/40 p-5 rounded-2xl border border-emerald-50">
                {(slide as Slide).visualContent}
              </p>
            </div>
            <div className="space-y-4">
              <h4 className="text-[10px] font-bold text-indigo-600 uppercase tracking-[0.2em] flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                Verbatim Script
              </h4>
              <div className="text-sm text-slate-700 leading-relaxed bg-indigo-50/30 p-5 rounded-2xl border border-indigo-100/50 font-serif italic">
                "{(slide as Slide).speakerNotes}"
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
