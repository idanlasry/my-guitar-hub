
import React from 'react';
import { ChordVariation } from '../types';

interface ChordDiagramProps {
  variation: ChordVariation;
  size?: 'sm' | 'md';
  onClick?: () => void;
  isActive?: boolean;
}

const ChordDiagram: React.FC<ChordDiagramProps> = ({ variation, size = 'md', onClick, isActive }) => {
  const { frets, label } = variation;
  
  const isSmall = size === 'sm';
  const width = isSmall ? 100 : 140;
  const height = isSmall ? 130 : 180;
  const margin = isSmall 
    ? { top: 20, right: 15, bottom: 15, left: 15 }
    : { top: 30, right: 20, bottom: 20, left: 20 };
  
  const fretCount = 5;
  const stringCount = 6;
  
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;
  
  const stringSpacing = innerWidth / (stringCount - 1);
  const fretSpacing = innerHeight / fretCount;

  const validFrets = (frets.filter(f => f !== null && f > 0) as number[]);
  const minFret = validFrets.length > 0 ? Math.min(...validFrets) : 1;
  const startingFret = minFret > 4 ? minFret : 1;

  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center rounded-3xl p-3 border transition-all duration-300 outline-none ${
        isActive 
          ? 'bg-indigo-600/20 border-indigo-500 shadow-lg shadow-indigo-500/20' 
          : 'bg-slate-900/50 border-white/5 hover:border-indigo-500/30 active:scale-95'
      }`}
    >
      <span className={`font-black text-white mb-2 uppercase tracking-widest ${isSmall ? 'text-[9px]' : 'text-[11px]'}`}>
        {label}
      </span>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="drop-shadow-md">
        {startingFret === 1 && (
          <line 
            x1={margin.left} 
            y1={margin.top} 
            x2={width - margin.right} 
            y2={margin.top} 
            stroke="#f8fafc" 
            strokeWidth={isSmall ? "2" : "4"} 
          />
        )}

        {[...Array(fretCount + 1)].map((_, i) => (
          <line 
            key={`fret-${i}`}
            x1={margin.left}
            y1={margin.top + i * fretSpacing}
            x2={width - margin.right}
            y2={margin.top + i * fretSpacing}
            stroke="#475569"
            strokeWidth="1"
          />
        ))}

        {[...Array(stringCount)].map((_, i) => (
          <line 
            key={`string-${i}`}
            x1={margin.left + i * stringSpacing}
            y1={margin.top}
            x2={margin.left + i * stringSpacing}
            y2={margin.top + innerHeight}
            stroke="#64748b"
            strokeWidth={isSmall ? 1 : 1 + i * 0.2} 
          />
        ))}

        {startingFret > 1 && (
          <text 
            x={margin.left - (isSmall ? 8 : 12)} 
            y={margin.top + fretSpacing / 2 + 4} 
            fill="#94a3b8" 
            fontSize={isSmall ? "8" : "10"} 
            className="mono font-bold"
          >
            {startingFret}fr
          </text>
        )}

        {frets.map((fret, stringIndex) => {
          const x = margin.left + stringIndex * stringSpacing;
          if (fret === null) {
            return (
              <text key={`muted-${stringIndex}`} x={x - 4} y={margin.top - 8} fill="#ef4444" fontSize={isSmall ? "10" : "12"} fontWeight="black">×</text>
            );
          }
          if (fret === 0) {
            return (
              <circle key={`open-${stringIndex}`} cx={x} cy={margin.top - 10} r={isSmall ? "2.5" : "4"} fill="none" stroke="#22c55e" strokeWidth="2" />
            );
          }
          const displayFret = fret - startingFret + 1;
          if (displayFret > 0 && displayFret <= fretCount) {
            return (
              <circle 
                key={`dot-${stringIndex}`} 
                cx={x} 
                cy={margin.top + (displayFret - 0.5) * fretSpacing} 
                r={isSmall ? "4.5" : "7"} 
                fill="#6366f1" 
                className="animate-in zoom-in-0 duration-300"
              />
            );
          }
          return null;
        })}
      </svg>
    </button>
  );
};

export default ChordDiagram;
