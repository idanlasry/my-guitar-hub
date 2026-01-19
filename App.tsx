import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Search, Guitar, Star, HelpCircle, ArrowRight, Disc, PlayCircle, Home, Mic2, Timer, Zap, Activity, Waves, ChevronLeft, Sparkles, Music2, BookOpen, Filter, X, Youtube, ExternalLink, Clock, Trash2, Award, AlertCircle, CheckCircle2, Info, Layout, ListMusic, FileText, RefreshCw, Bolt, Map, Globe, Music, RotateCcw, Shuffle, Bookmark, History, AlignLeft, Quote } from 'lucide-react';
import { fetchChordData } from './services/geminiService';
import { fetchLyrics } from './services/lyricsService';
import { ChordData, SongSuggestion } from './types';
import ChordDiagram from './components/ChordDiagram';
import Metronome from './components/Metronome';
import Tuner from './components/Tuner';
import StrummingGuide from './components/StrummingGuide';

const SONG_POOL = [
  { title: "Wonderwall", artist: "Oasis", difficulty: "Beginner", iconColor: "text-emerald-400" },
  { title: "Hotel California", artist: "Eagles", difficulty: "Intermediate", iconColor: "text-amber-400" },
  { title: "Wish You Were Here", artist: "Pink Floyd", difficulty: "Beginner", iconColor: "text-blue-400" },
  { title: "Fast Car", artist: "Tracy Chapman", difficulty: "Intermediate", iconColor: "text-purple-400" },
  { title: "The Show Must Go On", artist: "Queen", difficulty: "Advanced", iconColor: "text-rose-400" },
  { title: "Hallelujah", artist: "Jeff Buckley", difficulty: "Intermediate", iconColor: "text-indigo-400" },
  { title: "Blackbird", artist: "The Beatles", difficulty: "Advanced", iconColor: "text-slate-400" },
  { title: "Creep", artist: "Radiohead", difficulty: "Beginner", iconColor: "text-orange-400" },
  { title: "Let It Be", artist: "The Beatles", difficulty: "Beginner", iconColor: "text-sky-400" },
  { title: "ממעמקים", artist: "הפרויקט של עידן רייכל", difficulty: "Intermediate", iconColor: "text-amber-400" },
  { title: "לבחור נכון", artist: "אמיר דדון", difficulty: "Beginner", iconColor: "text-blue-400" },
  { title: "אהבת נעורי", artist: "שלום חנוך", difficulty: "Intermediate", iconColor: "text-rose-400" },
  { title: "נתתי לה חיי", artist: "כוורת", difficulty: "Intermediate", iconColor: "text-emerald-400" },
  { title: "בדרכי שלי", artist: "אברהם טל", difficulty: "Beginner", iconColor: "text-purple-400" },
  { title: "Stairway to Heaven", artist: "Led Zeppelin", difficulty: "Advanced", iconColor: "text-amber-600" }
];

const STRUMMING_PATTERNS = [
  { name: "The Old Faithful", pattern: "D,_,D,U,_,U,D,U" },
  { name: "Modern Pop Syncopation", pattern: "D,_,D,_,D,U,D,U" },
  { name: "Folk Rock Pulse", pattern: "D,_,D,_,D,_,D,U" },
  { name: "Pop Ballad", pattern: "D,_,D,_,D,U,_,U" }
];

/**
 * Robust Hebrew Detection
 */
const isMostlyHebrew = (text: string) => {
    const hebrewMatch = text.match(/[\u0590-\u05FF]/g) || [];
    const latinMatch = text.match(/[a-zA-Z]/g) || [];
    return hebrewMatch.length > latinMatch.length;
};

/**
 * Renders lyrics with chords integrated (bracket format)
 */
const ChordSheetRenderer: React.FC<{ content: string }> = ({ content }) => {
  if (!content) return null;
  const lines = content.split('\n');

  return (
    <div className="space-y-8 font-mono tracking-tight text-slate-300">
      {lines.map((line, lineIdx) => {
        if (!line.trim()) return <div key={lineIdx} className="h-6" />;
        const parts = line.split(/(\[[^\]]+\])/g);
        const isRtl = isMostlyHebrew(line);

        return (
          <div 
            key={lineIdx} 
            className={`flex flex-wrap items-end min-h-[2.5em] leading-relaxed ${isRtl ? 'text-right justify-end flex-row-reverse' : 'text-left'}`} 
            dir={isRtl ? 'rtl' : 'ltr'}
          >
            {parts.map((part, partIdx) => {
              if (part.startsWith('[') && part.endsWith(']')) {
                const chord = part.slice(1, -1);
                return (
                  <span key={partIdx} className="relative inline-block h-6 w-0 overflow-visible mx-0.5">
                    <span 
                      className="absolute bottom-full mb-1 left-0 text-indigo-400 font-black text-[10px] md:text-xs uppercase bg-indigo-500/10 px-1.5 py-0.5 rounded whitespace-nowrap shadow-sm border border-indigo-500/10" 
                      dir="ltr"
                    >
                      {chord}
                    </span>
                  </span>
                );
              }
              return (
                <span key={partIdx} className={`whitespace-pre text-base md:text-xl font-medium ${isRtl ? 'hebrew font-bold' : ''}`}>
                  {part}
                </span>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};

const App: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [chord, setChord] = useState<ChordData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isHome, setIsHome] = useState(true);
  const [patternIndex, setPatternIndex] = useState(0);
  const [history, setHistory] = useState<{name: string, isSong: boolean}[]>([]);
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [showHistoryDropdown, setShowHistoryDropdown] = useState(false);
  const [showBookmarksDropdown, setShowBookmarksDropdown] = useState(false);
  const [activeShapeIndex, setActiveShapeIndex] = useState(0);
  const [showTuner, setShowTuner] = useState(false);
  const [showMetronome, setShowMetronome] = useState(false);
  const [activeTab, setActiveTab] = useState<'roadmap' | 'lyrics'>('roadmap');
  
  const historyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedHistory = localStorage.getItem('chordmaster_history');
    if (savedHistory) { try { setHistory(JSON.parse(savedHistory)); } catch (e) {} }
    const savedBookmarks = localStorage.getItem('chordmaster_bookmarks');
    if (savedBookmarks) { try { setBookmarks(JSON.parse(savedBookmarks)); } catch (e) {} }

    const handleClickOutside = (event: MouseEvent) => {
      if (historyRef.current && !historyRef.current.contains(event.target as Node)) {
        setShowHistoryDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const addToHistory = useCallback((name: string, isSong: boolean) => {
    setHistory(prev => {
      const filtered = prev.filter(item => item.name.toLowerCase() !== name.toLowerCase());
      const updated = [{ name, isSong }, ...filtered].slice(0, 10);
      localStorage.setItem('chordmaster_history', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const toggleBookmark = (name: string) => {
    setBookmarks(prev => {
      const isBookmarked = prev.includes(name);
      const updated = isBookmarked ? prev.filter(b => b !== name) : [name, ...prev];
      localStorage.setItem('chordmaster_bookmarks', JSON.stringify(updated));
      return updated;
    });
  };

  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setIsHome(false);
    setSearchTerm(query);
    setActiveTab('roadmap');

    try {
      const data = await fetchChordData(query);
      if (data && data.isSongMatch && data.artistName && data.chordName && !data.lyrics) {
        const lyrics = await fetchLyrics(data.artistName, data.chordName);
        data.lyrics = lyrics || undefined;
      }
      setChord(data);
      if (data && data.chordName) {
        addToHistory(data.nativeName || data.chordName, !!data.isSongMatch);
      }
    } catch (err: any) {
      setError(err.message || "Search failed.");
      setChord(null);
    } finally {
      setLoading(false);
    }
  }, [addToHistory]);

  const nextPattern = () => setPatternIndex((p) => (p + 1) % STRUMMING_PATTERNS.length);
  const prevPattern = () => setPatternIndex((p) => (p - 1 + STRUMMING_PATTERNS.length) % STRUMMING_PATTERNS.length);

  // Added getSearchUrl helper function to generate search links for YouTube and Google
  const getSearchUrl = useCallback((type: 'youtube' | 'google') => {
    if (!chord) return '#';
    const query = `${chord.nativeName || chord.chordName} ${chord.nativeArtistName || chord.artistName || ''}`;
    if (type === 'youtube') {
      return `https://www.youtube.com/results?search_query=${encodeURIComponent(query + ' guitar tutorial lesson')}`;
    }
    return `https://www.google.com/search?q=${encodeURIComponent(query + ' chords guitar tab4u')}`;
  }, [chord]);

  const displayPattern = chord?.strummingPattern?.includes(',') ? chord.strummingPattern : STRUMMING_PATTERNS[patternIndex].pattern;
  const displayPatternName = chord?.isSongMatch ? `${chord.chordName} Rhythm` : STRUMMING_PATTERNS[patternIndex].name;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500/30 overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/30 blur-[120px] rounded-full animate-pulse" />
      </div>

      <header className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-indigo-500/10 px-4 md:px-8 h-16 flex items-center shadow-lg">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between gap-4">
          <button onClick={() => setIsHome(true)} className="flex items-center gap-3 hover:opacity-80 transition-all group shrink-0">
            <div className="bg-indigo-600 p-2 rounded-xl shadow-lg"><Home className="w-4 h-4 text-white" /></div>
            <span className="font-black text-sm tracking-widest uppercase hidden sm:block">Guitar Hub</span>
          </button>

          <div className="flex items-center bg-indigo-950/40 p-1 rounded-full border border-indigo-500/20">
            <button onClick={() => setShowTuner(!showTuner)} className={`px-5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${showTuner ? 'bg-indigo-500 text-white' : 'text-slate-400'}`}>Tuner</button>
            <button onClick={() => setShowMetronome(!showMetronome)} className={`px-5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${showMetronome ? 'bg-indigo-500 text-white' : 'text-slate-400'}`}>Tempo</button>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); handleSearch(searchTerm); }} className="relative w-48 lg:w-64">
            <input 
              type="text" 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              placeholder="Song or Chord..." 
              className="w-full h-10 bg-indigo-950/40 border border-indigo-500/20 rounded-full pl-10 pr-4 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40" 
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          </form>
        </div>
      </header>

      {(showTuner || showMetronome) && (
        <div className="fixed top-[72px] right-4 md:right-8 z-40 w-80 space-y-4 animate-in slide-in-from-top-4 fade-in duration-300">
          {showTuner && <Tuner />}
          {showMetronome && <Metronome />}
        </div>
      )}

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-8 relative z-10">
        {loading ? (
          <div className="h-[70vh] flex flex-col items-center justify-center gap-6">
            <Activity className="w-16 h-16 text-indigo-400 animate-pulse" />
            <p className="text-indigo-400 text-sm font-black uppercase tracking-[0.3em] animate-pulse">Syncing with Tab4u Archives...</p>
          </div>
        ) : isHome ? (
          <div className="max-w-6xl mx-auto py-8 space-y-20 animate-in fade-in slide-in-from-bottom-8 duration-1000">
            <div className="text-center space-y-6">
              <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-tight bg-gradient-to-b from-white to-indigo-500/40 bg-clip-text text-transparent">Hebrew Guitar Hub</h1>
              <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto">Full Hebrew support with Tab4u grounding and RTL lyrics rendering.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {SONG_POOL.sort(() => 0.5 - Math.random()).slice(0, 6).map((song, i) => (
                <button key={i} onClick={() => handleSearch(`${song.title} ${song.artist}`)} className="bg-slate-900 border border-white/5 hover:border-indigo-500/30 rounded-[2.5rem] p-8 text-left transition-all hover:-translate-y-2 group">
                   <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border border-white/10 w-fit mb-4 ${song.iconColor}`}>{song.difficulty}</div>
                   <h4 className="text-2xl font-black text-white mb-2 truncate" dir="auto">{song.title}</h4>
                   <p className="text-slate-500 text-sm">{song.artist}</p>
                </button>
              ))}
            </div>
          </div>
        ) : chord && !error ? (
          <div className="max-w-7xl mx-auto space-y-12 animate-in fade-in duration-500 pb-20">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-6">
                  <h2 className="text-6xl md:text-8xl font-black tracking-tighter text-white" dir="auto">
                    {chord.nativeName || chord.chordName}
                  </h2>
                  <button onClick={() => toggleBookmark(chord.chordName)} className={`p-4 rounded-full border transition-all ${bookmarks.includes(chord.chordName) ? 'bg-amber-500/20 border-amber-500 text-amber-500' : 'bg-white/5 border-white/10 text-slate-500'}`}>
                    <Star size={32} fill={bookmarks.includes(chord.chordName) ? "currentColor" : "none"} strokeWidth={2.5} />
                  </button>
                </div>
                <p className="text-2xl font-black text-slate-500 mt-4" dir="auto">
                  {chord.nativeArtistName || chord.artistName || "Theory Session"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-8 space-y-8">
                <div className="bg-slate-900/50 p-6 md:p-10 rounded-[3rem] border border-white/5 shadow-2xl">
                   <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
                      {(chord.songChordDiagrams || chord.variations || []).map((diag, i) => (
                        <ChordDiagram key={i} variation={diag} size="sm" />
                      ))}
                   </div>
                   
                   <div className="mt-8 pt-8 border-t border-white/5 space-y-8">
                      <div className="flex items-center gap-4">
                        <button onClick={() => setActiveTab('roadmap')} className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'roadmap' ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30' : 'text-slate-600 hover:text-slate-400'}`}><Map size={14} /> Roadmap</button>
                        <button onClick={() => setActiveTab('lyrics')} className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'lyrics' ? 'bg-rose-600/20 text-rose-400 border border-rose-500/30' : 'text-slate-600 hover:text-slate-400'}`}><AlignLeft size={14} /> Lyrics Vault</button>
                      </div>

                      <div className="min-h-[400px]">
                        {activeTab === 'roadmap' ? (
                          <div className="space-y-6">
                            {(chord.songStructure || []).map((part, idx) => (
                                <div key={idx} className="bg-slate-950/40 p-8 rounded-[2rem] border border-white/5 hover:border-indigo-500/10 transition-all group">
                                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400/50 mb-2 block">{part.section}</span>
                                  <div className="text-3xl font-black text-white tracking-widest flex flex-wrap gap-4 items-center" dir="ltr">
                                    {part.chords.split('-').map((c, i) => (
                                      <React.Fragment key={i}>
                                        <span className="hover:text-indigo-400 transition-colors cursor-default">{c.trim()}</span>
                                        {i < part.chords.split('-').length - 1 && <span className="text-slate-800 text-xl">→</span>}
                                      </React.Fragment>
                                    ))}
                                  </div>
                                </div>
                            ))}
                            {chord.writtenTutorial && (
                                <div className="mt-8 pt-8 border-t border-white/5">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-2">Master Note</h4>
                                    <p className="text-sm text-slate-400 italic" dir="auto">"{chord.writtenTutorial}"</p>
                                </div>
                            )}
                          </div>
                        ) : (
                          <div className="bg-slate-950/60 p-8 md:p-12 rounded-[3rem] border border-white/5 shadow-inner">
                               {chord.chordSheet ? (
                                 <ChordSheetRenderer content={chord.chordSheet} />
                               ) : (
                                 <p className="text-slate-500 italic">Chord sheet unavailable for this transcription.</p>
                               )}
                          </div>
                        )}
                      </div>
                   </div>
                </div>
                <StrummingGuide pattern={displayPattern} name={displayPatternName} onNext={nextPattern} onPrev={prevPattern} />
              </div>

              <div className="lg:col-span-4 space-y-8">
                <div className="bg-slate-900 border border-white/5 rounded-[3rem] p-8 space-y-12">
                   <div className="space-y-6">
                      <h3 className="text-sm font-black uppercase tracking-[0.2em] text-rose-500 flex items-center gap-2"><Youtube size={20} /> Tutorials</h3>
                      <a href={getSearchUrl('youtube')} target="_blank" className="flex items-center justify-between p-6 bg-rose-500/10 border border-rose-500/20 rounded-[2rem] hover:bg-rose-500/20 transition-all group">
                        <span className="text-sm font-black text-rose-100 uppercase">Watch Lessons</span>
                        <ArrowRight size={20} className="text-rose-400 group-hover:translate-x-1 transition-transform" />
                      </a>
                   </div>
                   <div className="space-y-6">
                      <h3 className="text-sm font-black uppercase tracking-[0.2em] text-indigo-500 flex items-center gap-2"><Globe size={20} /> Resource Hub</h3>
                      <a href={getSearchUrl('google')} target="_blank" className="flex items-center justify-between p-6 bg-indigo-500/10 border border-indigo-500/20 rounded-[2rem] hover:bg-indigo-500/20 transition-all group">
                        <span className="text-sm font-black text-indigo-100 uppercase">Search Tab4u</span>
                        <ArrowRight size={20} className="text-indigo-400 group-hover:translate-x-1 transition-transform" />
                      </a>
                   </div>
                </div>
              </div>
            </div>
          </div>
        ) : error ? (
          <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-8">
             <AlertCircle size={48} className="text-rose-500 mb-8" />
             <h2 className="text-3xl font-black mb-4 text-white">Analysis Interrupted</h2>
             <p className="text-slate-400 mb-10 text-lg">{error}</p>
             <button onClick={() => setIsHome(true)} className="px-10 py-4 bg-slate-800 rounded-full font-black text-xs uppercase text-white">Home</button>
          </div>
        ) : null}
      </main>
    </div>
  );
};

export default App;