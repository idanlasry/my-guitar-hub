import React, { useState, useRef, useEffect } from 'react';
import { Mic, Radio, Activity, CheckCircle2, Volume2, Waves, ArrowLeft, ArrowRight } from 'lucide-react';
import { TuningStatus } from '../types';

const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

const Tuner: React.FC = () => {
  const [status, setStatus] = useState<TuningStatus>(TuningStatus.IDLE);
  const [frequency, setFrequency] = useState<number>(0);
  const [note, setNote] = useState<string>("-");
  const [cents, setCents] = useState<number>(0);
  const [volume, setVolume] = useState<number>(0);
  
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);
  const bufferRef = useRef<Float32Array | null>(null);

  const stopTuner = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop());
      micStreamRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    setStatus(TuningStatus.IDLE);
    setFrequency(0);
    setNote("-");
    setCents(0);
    setVolume(0);
  };

  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: true
        } 
      });
      
      micStreamRef.current = stream;

      const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
      const ctx = new AudioContextClass();
      audioCtxRef.current = ctx;
      
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyserRef.current = analyser;
      bufferRef.current = new Float32Array(analyser.fftSize);

      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);

      setStatus(TuningStatus.LISTENING);
      
      const update = () => {
        if (!analyserRef.current || !bufferRef.current || !audioCtxRef.current) return;
        
        analyserRef.current.getFloatTimeDomainData(bufferRef.current);
        const freq = autoCorrelate(bufferRef.current, audioCtxRef.current.sampleRate);

        if (freq !== -1) {
          setFrequency(freq);
          const n = 12 * (Math.log(freq / 440) / Math.log(2)) + 69;
          const noteIndex = Math.round(n) % 12;
          const detune = (n - Math.round(n)) * 100;
          
          setNote(NOTES[noteIndex < 0 ? noteIndex + 12 : noteIndex]);
          setCents(detune);

          if (Math.abs(detune) < 4) setStatus(TuningStatus.TUNE_OK);
          else if (detune < 0) setStatus(TuningStatus.TUNE_LOW);
          else setStatus(TuningStatus.TUNE_HIGH);
        } else {
          // Keep the current note visible but show no active pitch
          if (status !== TuningStatus.LISTENING && status !== TuningStatus.IDLE) {
            setStatus(TuningStatus.LISTENING);
          }
        }
        
        animationRef.current = requestAnimationFrame(update);
      };

      update();
    } catch (err) {
      console.error("Microphone access failed:", err);
      alert("Please ensure microphone access is allowed in your browser settings.");
      setStatus(TuningStatus.IDLE);
    }
  };

  const autoCorrelate = (buffer: Float32Array, sampleRate: number) => {
    let sum = 0;
    for (let i = 0; i < buffer.length; i++) {
      sum += buffer[i] * buffer[i];
    }
    const rms = Math.sqrt(sum / buffer.length);
    setVolume(rms);

    if (rms < 0.005) return -1; // Very sensitive threshold

    let r1 = 0, r2 = buffer.length - 1;
    const thres = 0.2;
    for (let i = 0; i < buffer.length / 2; i++) {
      if (Math.abs(buffer[i]) < thres) { r1 = i; break; }
    }
    for (let i = 1; i < buffer.length / 2; i++) {
      if (Math.abs(buffer[buffer.length - i]) < thres) { r2 = buffer.length - i; break; }
    }

    const trimmed = buffer.slice(r1, r2);
    const correlations = new Float32Array(trimmed.length);
    for (let i = 0; i < trimmed.length; i++) {
      for (let j = 0; j < trimmed.length - i; j++) {
        correlations[i] += trimmed[j] * trimmed[j + i];
      }
    }

    let d = 0;
    while (correlations[d] > correlations[d + 1]) d++;
    let maxval = -1, maxpos = -1;
    for (let i = d; i < correlations.length; i++) {
      if (correlations[i] > maxval) {
        maxval = correlations[i];
        maxpos = i;
      }
    }

    let T0 = maxpos;
    const x1 = correlations[T0 - 1], x2 = correlations[T0], x3 = correlations[T0 + 1];
    const a = (x1 + x3 - 2 * x2) / 2;
    const b = (x3 - x1) / 2;
    if (a) T0 = T0 - b / (2 * a);

    const freq = sampleRate / T0;
    return (freq > 70 && freq < 1200) ? freq : -1;
  };

  useEffect(() => {
    return () => stopTuner();
  }, []);

  const getStatusColor = () => {
    if (status === TuningStatus.IDLE) return 'text-slate-800';
    if (volume < 0.005) return 'text-slate-600';
    switch (status) {
      case TuningStatus.TUNE_OK: return 'text-emerald-400';
      case TuningStatus.TUNE_LOW: return 'text-amber-400';
      case TuningStatus.TUNE_HIGH: return 'text-rose-400';
      default: return 'text-indigo-400';
    }
  };

  return (
    <div className="bg-[#080b12] p-6 rounded-[2.5rem] border border-white/5 shadow-2xl overflow-hidden pointer-events-auto w-full">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
          <Radio className={`w-3.5 h-3.5 ${status !== TuningStatus.IDLE ? 'text-indigo-500 animate-pulse' : 'text-slate-700'}`} />
          High-Res Tuner
        </h3>
        <button 
          onClick={status === TuningStatus.IDLE ? startListening : stopTuner}
          className={`px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2 ${
            status === TuningStatus.IDLE 
              ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-400' 
              : 'bg-rose-500 text-white shadow-lg shadow-rose-500/20'
          }`}
        >
          {status === TuningStatus.IDLE ? <><Mic size={14} /> Listen</> : 'Stop'}
        </button>
      </div>

      <div className="relative h-56 flex flex-col items-center justify-center bg-slate-900/40 rounded-[2.5rem] border border-white/5 overflow-hidden shadow-inner">
        {/* Dynamic Waveform proof-of-life */}
        {status !== TuningStatus.IDLE && (
          <div className="absolute inset-x-0 bottom-0 h-24 opacity-30 pointer-events-none flex items-end justify-center gap-0.5 px-4 pb-4">
            {[...Array(32)].map((_, i) => (
              <div 
                key={i} 
                className="w-1 bg-indigo-500 rounded-full transition-all duration-75"
                style={{ height: `${(Math.random() * volume * 600) + 2}px` }}
              />
            ))}
          </div>
        )}

        {status === TuningStatus.IDLE ? (
          <div className="flex flex-col items-center gap-4 text-slate-700 text-center px-6 animate-in fade-in duration-500">
            <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center">
                <Activity className="w-6 h-6 opacity-20" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em]">Hardware Idle</p>
          </div>
        ) : (
          <div className="flex flex-col items-center z-10 animate-in zoom-in-95 duration-200">
            <span className={`text-[8rem] font-black tracking-tighter leading-none transition-all duration-100 ${getStatusColor()} ${volume < 0.005 ? 'opacity-20' : 'opacity-100'}`}>
              {note === "-" ? "..." : note}
            </span>
            
            <div className={`mt-4 flex flex-col items-center gap-2 transition-all duration-300 ${volume < 0.005 ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
              <div className="px-4 py-1.5 bg-white/5 rounded-full flex items-center gap-3 border border-white/5">
                <Waves size={10} className="text-indigo-500 animate-pulse" />
                <span className="text-[10px] font-black mono text-slate-400 tracking-widest">
                  {frequency > 0 ? `${frequency.toFixed(1)} Hz` : '-- Hz'}
                </span>
              </div>
            </div>

            {volume < 0.005 && (
              <div className="mt-8 flex items-center gap-2 text-slate-600 animate-pulse">
                <Volume2 size={12} />
                <span className="text-[10px] font-black uppercase tracking-widest">Awaiting Signal...</span>
              </div>
            )}
          </div>
        )}

        {/* High-Precision Needle Gauge */}
        <div className="absolute bottom-6 left-12 right-12 h-10 flex flex-col justify-end">
            <div className="w-full h-1 bg-white/5 rounded-full relative">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-0.5 h-4 bg-emerald-500/20 rounded-full z-0" />
                {status !== TuningStatus.IDLE && volume >= 0.005 && (
                    <div 
                        className={`absolute top-1/2 -translate-y-1/2 w-1.5 h-8 transition-all duration-100 ease-out shadow-[0_0_20px_currentColor] rounded-full ${getStatusColor()} bg-current z-10`}
                        style={{ left: `${50 + (cents / 2)}%`, transform: 'translateX(-50%) translateY(-50%)' }}
                    />
                )}
            </div>
            <div className="flex justify-between mt-3 text-[8px] font-black text-slate-700 uppercase tracking-widest">
                <span className="flex items-center gap-1"><ArrowLeft size={8} /> Flat</span>
                <span className="text-slate-600 font-black">Tune</span>
                <span className="flex items-center gap-1">Sharp <ArrowRight size={8} /></span>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-6 gap-2 mt-6">
        {["E", "A", "D", "G", "B", "E"].map((s, i) => (
          <div 
            key={i} 
            className={`flex flex-col items-center py-3 rounded-2xl border transition-all duration-300 ${
                note === s && status === TuningStatus.TUNE_OK && volume >= 0.005 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-lg shadow-emerald-500/5' 
                : 'bg-white/5 border-transparent text-slate-800'
            }`}
          >
            <span className="text-[10px] font-black">{s}</span>
            <div className={`w-1 h-1 rounded-full mt-1.5 transition-all duration-300 ${note === s && volume >= 0.005 ? 'bg-current shadow-[0_0_8px_currentColor]' : 'bg-transparent'}`} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default Tuner;