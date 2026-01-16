
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Square, Clock4, ChevronLeft, ChevronRight } from 'lucide-react';

const Metronome: React.FC = () => {
  const [bpm, setBpm] = useState(120);
  const [isPlaying, setIsPlaying] = useState(false);
  const [beat, setBeat] = useState(0);
  
  const timerRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const nextBeatRef = useRef(0);

  const playClick = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioCtxRef.current;
    
    // Safety resume to handle browser autoplay policies
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const osc = ctx.createOscillator();
    const envelope = ctx.createGain();

    // High pitch for the first beat (accent), lower for others
    // Using 1000Hz for primary beat, 500Hz for secondary beats for clarity
    osc.type = 'sine';
    osc.frequency.setValueAtTime(nextBeatRef.current === 0 ? 1000 : 500, ctx.currentTime);
    
    // Quick attack and decay for a clean "pop" click sound
    envelope.gain.setValueAtTime(0, ctx.currentTime);
    envelope.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.002);
    envelope.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
    
    osc.connect(envelope);
    envelope.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.05);
    
    // Update visual state and prepare next beat
    setBeat(nextBeatRef.current);
    nextBeatRef.current = (nextBeatRef.current + 1) % 4;
  }, []);

  const togglePlay = () => {
    // Explicitly resume audio context on user gesture to satisfy browser policies
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    setIsPlaying(!isPlaying);
  };

  useEffect(() => {
    if (isPlaying) {
      // Play immediately on start instead of waiting for first interval
      playClick();
      const interval = (60 / bpm) * 1000;
      timerRef.current = window.setInterval(playClick, interval);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setBeat(0);
      nextBeatRef.current = 0;
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, bpm, playClick]);

  // Calculate swing rotation based on beat
  const swingAngle = isPlaying ? (beat % 2 === 0 ? -30 : 30) : 0;

  return (
    <div className="bg-[#0c121d] p-6 rounded-[2rem] border border-white/5 shadow-2xl overflow-hidden">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
          <Clock4 className="w-3 h-3 text-indigo-500" />
          Mechanical Tempo
        </h3>
        <button 
          onClick={togglePlay}
          className={`p-2.5 rounded-xl transition-all duration-300 shadow-lg ${
            isPlaying 
              ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' 
              : 'bg-indigo-500 text-white shadow-indigo-500/20'
          }`}
        >
          {isPlaying ? <Square size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-0.5" />}
        </button>
      </div>

      {/* Mechanical Visualization */}
      <div className="relative h-48 w-full flex items-center justify-center mb-6 perspective-1000">
        <div className="absolute bottom-0 w-32 h-44 bg-gradient-to-b from-[#1a1f2e] to-[#0a0f18] border border-white/5 rounded-t-[100%] clip-path-pyramid flex flex-col items-center pt-8">
            <div className="w-8 h-32 flex flex-col justify-between items-center opacity-20 pointer-events-none">
                {[...Array(10)].map((_, i) => (
                    <div key={i} className={`h-px bg-white rounded-full ${i % 3 === 0 ? 'w-full' : 'w-1/2'}`} />
                ))}
            </div>
        </div>

        <div 
          className="absolute bottom-4 w-1 h-36 origin-bottom transition-transform duration-150 ease-in-out bg-slate-700 flex justify-center"
          style={{ transform: `translateX(-50%) rotate(${swingAngle}deg)` }}
        >
          <div className="absolute top-8 w-4 h-6 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded shadow-md border border-white/10" />
        </div>

        <div className="absolute bottom-0 w-8 h-4 bg-[#1e293b] rounded-t-lg border border-white/10 z-10" />
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
           <button 
             onClick={() => setBpm(b => Math.max(40, b - 1))}
             className="p-1 hover:bg-white/5 rounded-lg text-slate-500 hover:text-white transition-colors"
           >
             <ChevronLeft size={20} />
           </button>
           <div className="text-center">
             <div className="text-4xl font-black tracking-tighter text-white leading-none">
               {bpm}
             </div>
             <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500/80">BPM</span>
           </div>
           <button 
             onClick={() => setBpm(b => Math.min(240, b + 1))}
             className="p-1 hover:bg-white/5 rounded-lg text-slate-500 hover:text-white transition-colors"
           >
             <ChevronRight size={20} />
           </button>
        </div>

        <input 
          type="range" 
          min="40" 
          max="240" 
          value={bpm} 
          onChange={(e) => setBpm(parseInt(e.target.value))}
          className="w-full h-1 bg-white/5 rounded-full appearance-none cursor-pointer accent-indigo-500"
        />
        
        <div className="flex justify-center gap-1.5 pt-2">
          {[0, 1, 2, 3].map((i) => (
            <div 
              key={i} 
              className={`w-1.5 h-1.5 rounded-full transition-all duration-100 ${
                isPlaying && beat === i ? 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]' : 'bg-white/5'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Metronome;
