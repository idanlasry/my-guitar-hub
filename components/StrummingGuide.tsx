
import React from 'react';
/* Added Timer to the lucide-react imports */
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, X as MuteIcon, Book, Timer } from 'lucide-react';

interface StrummingGuideProps {
  pattern: string; // "D,_,D,_,D,U,D,U"
  name: string;
  onNext: () => void;
  onPrev: () => void;
}

const StrummingGuide: React.FC<StrummingGuideProps> = ({ pattern, name, onNext, onPrev }) => {
  const steps = pattern.split(',');
  const counts = ["1", "&", "2", "&", "3", "&", "4", "&"];

  const renderIcon = (type: string) => {
    switch (type) {
      case 'D':
        return <ArrowDown size={32} strokeWidth={3} className="animate-in slide-in-from-top-2 duration-300" />;
      case 'U':
        return <ArrowUp size={32} strokeWidth={3} className="animate-in slide-in-from-bottom-2 duration-300" />;
      case 'X':
        return <MuteIcon size={24} strokeWidth={4} className="text-slate-700 opacity-40" />;
      default:
        return null;
    }
  };

  return (
    <div className="bg-[#0c111c] p-6 md:p-10 rounded-[3rem] border border-white/5 shadow-2xl relative overflow-hidden group">
      {/* Visual Decor */}
      <div className="absolute top-0 right-0 p-12 opacity-[0.02] pointer-events-none group-hover:opacity-[0.05] transition-opacity duration-700">
        <ArrowDown className="w-48 h-48 rotate-12" />
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 relative z-10">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 flex items-center gap-2">
              <Book size={10} className="text-indigo-400" />
              Pattern Dictionary
            </h3>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <h4 className="text-3xl md:text-4xl font-black text-white tracking-tight leading-tight group-hover:text-indigo-300 transition-colors">
              {name}
            </h4>
            <div className="flex items-center gap-1.5 p-1.5 bg-white/5 rounded-2xl border border-white/5 shadow-inner">
               <button 
                onClick={onPrev}
                className="p-2.5 hover:bg-indigo-600 hover:text-white rounded-xl text-slate-500 transition-all active:scale-90"
                title="Previous Pattern"
               >
                 <ChevronLeft size={20} />
               </button>
               <div className="w-px h-6 bg-white/10 mx-1" />
               <button 
                onClick={onNext}
                className="p-2.5 hover:bg-indigo-600 hover:text-white rounded-xl text-slate-500 transition-all active:scale-90"
                title="Next Pattern"
               >
                 <ChevronRight size={20} />
               </button>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col items-start md:items-end gap-2">
            <div className="px-5 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl text-[10px] font-black uppercase tracking-widest text-indigo-400 shadow-sm flex items-center gap-2">
                <Timer size={12} /> 4/4 Rhythm • 8th Resolution
            </div>
            <div className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em]">Down (D) • Up (U) • Mute (X) • Rest (_)</div>
        </div>
      </div>

      {/* Rhythmic Grid - Highly Tangible Icons */}
      <div className="grid grid-cols-4 sm:grid-cols-8 gap-4 md:gap-6 relative z-10">
        {steps.map((step, idx) => {
          const isDown = step === 'D';
          const isUp = step === 'U';
          const isMute = step === 'X';
          const isRest = step === '_';
          const count = counts[idx];
          const isPrimaryBeat = idx % 2 === 0;

          return (
            <div key={idx} className="flex flex-col items-center gap-5 group/step">
              {/* Beats/Count Display */}
              <div className="flex flex-col items-center gap-1.5">
                <span className={`text-xl md:text-2xl font-black transition-all duration-300 ${isPrimaryBeat ? 'text-white scale-110' : 'text-slate-700'}`}>
                  {count}
                </span>
                <div className={`w-1.5 h-1.5 rounded-full ${isPrimaryBeat ? 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]' : 'bg-slate-800'}`} />
              </div>

              {/* Arrow/Action Container */}
              <div className={`w-full aspect-[4/5] flex items-center justify-center rounded-2xl md:rounded-[2rem] border transition-all duration-300 ${
                isRest 
                  ? 'bg-transparent border-dashed border-white/10' 
                  : isMute 
                  ? 'bg-slate-900 border-white/10 shadow-inner text-slate-600'
                  : isDown 
                  ? 'bg-indigo-600/10 border-indigo-500/30 text-indigo-400 group-hover/step:bg-indigo-600/20 group-hover/step:border-indigo-400 group-hover/step:scale-105 shadow-lg shadow-indigo-500/5'
                  : 'bg-emerald-600/10 border-emerald-500/30 text-emerald-400 group-hover/step:bg-emerald-600/20 group-hover/step:border-emerald-400 group-hover/step:scale-105 shadow-lg shadow-emerald-500/5'
              }`}>
                {renderIcon(step)}
              </div>

              {/* Descriptor */}
              <div className="flex flex-col items-center h-4">
                {!isRest && (
                   <span className="text-[8px] font-black mono text-slate-700 uppercase tracking-widest opacity-0 group-hover/step:opacity-100 transition-opacity">
                      {isDown ? 'Down' : isUp ? 'Up' : isMute ? 'Mute' : ''}
                   </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Progress Decoration */}
      <div className="mt-10 flex justify-center gap-1 opacity-20 group-hover:opacity-40 transition-opacity">
         {[...Array(24)].map((_, i) => (
           <div key={i} className="w-0.5 h-4 bg-slate-700 rounded-full" />
         ))}
      </div>
    </div>
  );
};

export default StrummingGuide;
