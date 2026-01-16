
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Search, Guitar, Star, HelpCircle, ArrowRight, Disc, PlayCircle, Home, Mic2, Timer, Zap, Activity, Waves, ChevronLeft, Sparkles, Music2, BookOpen, Filter, X, Youtube, ExternalLink, Clock, Trash2, Award, AlertCircle, CheckCircle2, Info, Layout, ListMusic, FileText, RefreshCw, Bolt, Map, Globe, Music, RotateCcw, Shuffle, Bookmark, History } from 'lucide-react';
import { fetchChordData } from './services/geminiService';
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
  { title: "Sweet Child O' Mine", artist: "Guns N' Roses", difficulty: "Advanced", iconColor: "text-yellow-400" },
  { title: "Let It Be", artist: "The Beatles", difficulty: "Beginner", iconColor: "text-sky-400" },
  { title: "ממהמקים (Mima'amakim)", artist: "Idan Raichel", difficulty: "Intermediate", iconColor: "text-amber-400" },
  { title: "לבחור נכון (Livchor Nachon)", artist: "Amir Dadon", difficulty: "Beginner", iconColor: "text-blue-400" },
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
  
  const searchRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef<HTMLDivElement>(null);
  const bookmarksRef = useRef<HTMLDivElement>(null);

  const featuredSongs = useMemo(() => {
    return [...SONG_POOL].sort(() => 0.5 - Math.random()).slice(0, 6);
  }, [isHome]); 

  useEffect(() => {
    const savedHistory = localStorage.getItem('chordmaster_history');
    if (savedHistory) {
      try { setHistory(JSON.parse(savedHistory)); } catch (e) {}
    }
    const savedBookmarks = localStorage.getItem('chordmaster_bookmarks');
    if (savedBookmarks) {
      try { setBookmarks(JSON.parse(savedBookmarks)); } catch (e) {}
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (historyRef.current && !historyRef.current.contains(event.target as Node)) {
        setShowHistoryDropdown(false);
      }
      if (bookmarksRef.current && !bookmarksRef.current.contains(event.target as Node)) {
        setShowBookmarksDropdown(false);
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
      const updated = isBookmarked 
        ? prev.filter(b => b !== name)
        : [name, ...prev];
      localStorage.setItem('chordmaster_bookmarks', JSON.stringify(updated));
      return updated;
    });
  };

  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setIsHome(false);
    setShowHistoryDropdown(false);
    setShowBookmarksDropdown(false);
    setSearchTerm(query);
    setActiveShapeIndex(0);

    const timeout = setTimeout(() => {
      setLoading(false);
      setError("Analysis timed out. Try a different song or simpler chord name.");
    }, 25000);

    try {
      const data = await fetchChordData(query);
      clearTimeout(timeout);
      setChord(data);
      if (data && data.chordName && !data.isAmbiguous) {
        const historyName = data.nativeName && isHebrew(data.nativeName) ? data.nativeName : data.chordName;
        addToHistory(historyName, !!data.isSongMatch);
      } else if (data && data.isAmbiguous) {
        setError("Your search is too broad. Try adding an artist name.");
      }
    } catch (err: any) {
      clearTimeout(timeout);
      setError(err.message || "Failed to load masterclass. Please try again.");
      setChord(null);
    } finally {
      setLoading(false);
    }
  }, [addToHistory]);

  const handleRandomSong = () => {
    const randomSong = SONG_POOL[Math.floor(Math.random() * SONG_POOL.length)];
    handleSearch(`${randomSong.title} ${randomSong.artist}`);
  };

  const nextPattern = () => setPatternIndex((p) => (p + 1) % STRUMMING_PATTERNS.length);
  const prevPattern = () => setPatternIndex((p) => (p - 1 + STRUMMING_PATTERNS.length) % STRUMMING_PATTERNS.length);

  const currentChordsToDisplay = useMemo(() => {
    if (!chord) return [];
    if (chord.isSongMatch && chord.songChordDiagrams?.length) return chord.songChordDiagrams;
    return chord.variations || [];
  }, [chord]);

  const displayPattern = chord?.strummingPattern?.includes(',') ? chord.strummingPattern : STRUMMING_PATTERNS[patternIndex].pattern;
  const displayPatternName = chord?.isSongMatch ? `${chord.chordName} Signature` : STRUMMING_PATTERNS[patternIndex].name;

  function isHebrew(text: string) {
    return /[\u0590-\u05FF]/.test(text);
  }

  const getSearchUrl = (type: 'youtube' | 'google') => {
    if (!chord) return '#';
    let songTerm = "";
    if (chord.nativeName && isHebrew(chord.nativeName)) {
      songTerm = chord.nativeName;
      if (chord.nativeArtistName && isHebrew(chord.nativeArtistName)) songTerm += ` ${chord.nativeArtistName}`;
    } else {
      songTerm = chord.isSongMatch ? `${chord.chordName} ${chord.artistName || ''}` : chord.chordName;
    }
    const hasHebrew = isHebrew(songTerm);
    if (hasHebrew) songTerm = songTerm.replace(/[^\u0590-\u05FF0-9\s]/g, '').replace(/\s+/g, ' ').trim();
    if (type === 'youtube') return `https://www.youtube.com/results?search_query=${encodeURIComponent(songTerm + (hasHebrew ? ' מדריך גיטרה' : ' guitar tutorial'))}`;
    if (type === 'google') return `https://www.google.com/search?q=${encodeURIComponent(songTerm + (hasHebrew ? ' אקורדים וטאבים' : ' guitar chords'))}`;
    return '#';
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('chordmaster_history');
  };

  const songHeader = useMemo(() => {
    if (!chord) return null;
    const hasHebrewTitle = chord.nativeName && isHebrew(chord.nativeName);
    const hasHebrewArtist = chord.nativeArtistName && isHebrew(chord.nativeArtistName);
    return {
      mainTitle: hasHebrewTitle ? chord.nativeName : chord.chordName,
      subTitle: hasHebrewTitle ? chord.chordName : "",
      mainArtist: hasHebrewArtist ? chord.nativeArtistName : (chord.artistName || ""),
      subArtist: hasHebrewArtist ? (chord.artistName || "") : ""
    };
  }, [chord]);

  return (
    <div className="min-h-screen bg-[#05070a] text-slate-100 flex flex-col font-sans selection:bg-indigo-500/30 overflow-x-hidden">
      {/* Dynamic Background Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-indigo-600/10 blur-[150px] rounded-full" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-emerald-600/5 blur-[120px] rounded-full" />
      </div>

      <header className="sticky top-0 z-50 bg-[#0c111c]/80 backdrop-blur-3xl border-b border-white/5 px-6 md:px-10 h-20 flex items-center shadow-xl">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
          
          <div className="flex items-center gap-12">
            <button onClick={() => setIsHome(true)} className="flex items-center gap-3.5 group shrink-0">
              <div className="bg-indigo-600 p-2.5 rounded-2xl shadow-lg group-hover:bg-indigo-500 transition-all group-hover:scale-105 active:scale-95">
                <Home className="w-4 h-4 text-white" />
              </div>
              <span className="font-black text-sm tracking-widest uppercase hidden lg:block">Guitar Hub</span>
            </button>
            
            <nav className="hidden md:flex items-center gap-8">
              <div className="relative" ref={historyRef}>
                <button 
                  onClick={() => { setShowHistoryDropdown(!showHistoryDropdown); setShowBookmarksDropdown(false); }}
                  disabled={history.length === 0}
                  className={`text-[11px] font-black uppercase tracking-[0.25em] transition-all flex items-center gap-2 ${history.length === 0 ? 'opacity-20 cursor-not-allowed' : 'text-slate-400 hover:text-white'}`}
                >
                  History
                </button>
                {showHistoryDropdown && (
                  <div className="absolute top-12 left-0 w-72 bg-[#0c111c] border border-white/10 rounded-2xl shadow-2xl py-3 z-[60] animate-in fade-in slide-in-from-top-3">
                    <div className="px-5 py-2 border-b border-white/5 flex justify-between items-center mb-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Jump Back</span>
                      <button onClick={clearHistory} className="text-[9px] text-rose-500 font-bold hover:underline">Clear All</button>
                    </div>
                    <div className="max-h-64 overflow-y-auto custom-scrollbar">
                      {history.map((item, idx) => (
                        <button key={idx} onClick={() => handleSearch(item.name)} className="w-full text-left px-5 py-3 hover:bg-white/5 transition-colors text-sm font-bold truncate flex items-center gap-3">
                           <RotateCcw size={12} className="text-slate-600" /> {item.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="relative" ref={bookmarksRef}>
                <button 
                  onClick={() => { setShowBookmarksDropdown(!showBookmarksDropdown); setShowHistoryDropdown(false); }}
                  disabled={bookmarks.length === 0}
                  className={`text-[11px] font-black uppercase tracking-[0.25em] transition-all flex items-center gap-2 ${bookmarks.length === 0 ? 'opacity-20 cursor-not-allowed' : 'text-slate-400 hover:text-white'}`}
                >
                  Bookmarks
                </button>
                {showBookmarksDropdown && (
                  <div className="absolute top-12 left-0 w-72 bg-[#0c111c] border border-white/10 rounded-2xl shadow-2xl py-3 z-[60] animate-in fade-in slide-in-from-top-3">
                    <div className="px-5 py-2 border-b border-white/5 mb-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Saved Favorites</span>
                    </div>
                    <div className="max-h-64 overflow-y-auto custom-scrollbar">
                      {bookmarks.map((name, idx) => (
                        <button key={idx} onClick={() => handleSearch(name)} className="w-full text-left px-5 py-3 hover:bg-white/5 transition-colors text-sm font-bold truncate flex items-center gap-3">
                          <Star size={12} className="text-amber-500" fill="currentColor" /> {name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </nav>
          </div>

          <div className="flex items-center gap-12 flex-1 justify-end">
             {/* Unified Controls & Search alignment */}
             <div className="flex items-center gap-12">
               <div className="hidden md:flex items-center bg-white/5 p-1 rounded-full border border-white/5 h-11">
                  <button 
                    onClick={() => setShowTuner(!showTuner)} 
                    className={`px-6 h-full rounded-full text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${showTuner ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-400 hover:text-white'}`}
                  >
                    <Mic2 size={12} /> Tuner
                  </button>
                  <button 
                    onClick={() => setShowMetronome(!showMetronome)} 
                    className={`px-6 h-full rounded-full text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${showMetronome ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-400 hover:text-white'}`}
                  >
                    <Timer size={12} /> Tempo
                  </button>
               </div>
               
               <div className="relative w-full max-w-sm">
                  <form onSubmit={(e) => { e.preventDefault(); handleSearch(searchTerm); }}>
                    <input 
                      type="text" 
                      value={searchTerm} 
                      onChange={(e) => setSearchTerm(e.target.value)} 
                      placeholder="Search song or chord..." 
                      className="w-full h-11 bg-white/5 border border-white/10 rounded-full pl-12 pr-4 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all placeholder:text-slate-600" 
                    />
                    <Search className="absolute left-4.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  </form>
               </div>
             </div>
          </div>
        </div>
      </header>

      {/* Tools Floating UI */}
      {(showTuner || showMetronome) && (
        <div className="fixed top-24 right-6 md:right-10 z-[70] w-80 space-y-6 animate-in slide-in-from-right-8 fade-in duration-300">
          {showTuner && <Tuner />}
          {showMetronome && <Metronome />}
        </div>
      )}

      <main className="flex-1 max-w-7xl mx-auto w-full p-6 md:p-10 relative z-10">
        {loading ? (
          <div className="h-[70vh] flex flex-col items-center justify-center gap-10">
            <div className="relative">
              <Activity className="w-20 h-20 text-indigo-500 animate-pulse" />
              <div className="absolute inset-0 border-4 border-indigo-500/20 rounded-full animate-ping scale-150" />
            </div>
            <div className="text-center space-y-3">
              <p className="text-indigo-400 text-sm font-black uppercase tracking-[0.5em]">Grounded Engine Active</p>
              <p className="text-xs text-slate-600 font-bold uppercase tracking-widest">Masterclass AI generating roadmap...</p>
            </div>
          </div>
        ) : isHome ? (
          <div className="py-16 md:py-24 space-y-32 animate-in fade-in duration-1000">
            <div className="text-center space-y-10 max-w-4xl mx-auto">
              <div className="inline-flex items-center gap-3 px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full mb-4">
                <Sparkles size={14} className="text-indigo-400" />
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400">The Ultimate Hub for Guitarists</span>
              </div>
              <h1 className="text-7xl md:text-[10rem] font-black tracking-tighter leading-[0.85] bg-gradient-to-b from-white to-white/10 bg-clip-text text-transparent pb-4">GUITAR HUB</h1>
              <p className="text-slate-400 text-xl md:text-2xl leading-relaxed font-medium max-w-3xl mx-auto opacity-80">Your personal AI-powered guitar masterclass. Real-time chords, signature patterns, and structural roadmaps.</p>
              <div className="flex flex-wrap justify-center gap-6 pt-6">
                <button onClick={handleRandomSong} className="px-10 py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] transition-all shadow-2xl shadow-indigo-600/30 active:scale-95 flex items-center gap-3">
                  <Shuffle size={16} /> Explore Random Song
                </button>
                <button onClick={() => handleSearch('G Major')} className="px-10 py-5 bg-white/5 hover:bg-white/10 text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] border border-white/5 transition-all">Quick Chord Finder</button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
               {featuredSongs.map((song, i) => (
                  <button key={i} onClick={() => handleSearch(`${song.title} ${song.artist}`)} className="group bg-[#0c111c]/40 border border-white/5 hover:border-indigo-500/40 rounded-[3rem] p-10 text-left transition-all hover:-translate-y-3 shadow-lg hover:shadow-indigo-500/5">
                    <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase border border-white/10 w-fit mb-8 ${song.iconColor}`}>{song.difficulty}</div>
                    <h4 className="text-3xl font-black text-white group-hover:text-indigo-400 transition-colors mb-2 truncate" dir="auto">{song.title}</h4>
                    <p className="text-slate-500 text-sm font-bold uppercase tracking-[0.15em]">{song.artist}</p>
                  </button>
               ))}
            </div>
          </div>
        ) : chord && songHeader ? (
          <div className="max-w-7xl mx-auto space-y-16 animate-in fade-in duration-700 pb-24">
            
            {/* Song Hero Header */}
            <div className="relative pt-10">
              <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-12">
                <div className="space-y-6 flex-1">
                  <div className="flex flex-wrap items-center gap-6">
                    <h2 className={`text-6xl md:text-9xl font-black tracking-tighter text-white break-words max-w-full ${isHebrew(songHeader.mainTitle) ? 'leading-[1.1]' : 'leading-none'}`} dir="auto">
                      {songHeader.mainTitle}
                    </h2>
                    <button 
                      onClick={() => toggleBookmark(chord.chordName)}
                      className={`p-4 rounded-3xl border transition-all ${
                        bookmarks.includes(chord.chordName) 
                          ? 'bg-amber-500/20 border-amber-500 text-amber-500 shadow-xl shadow-amber-500/10' 
                          : 'bg-white/5 border-white/10 text-slate-600 hover:text-amber-500 hover:border-amber-500'
                      }`}
                    >
                      <Star size={32} fill={bookmarks.includes(chord.chordName) ? "currentColor" : "none"} />
                    </button>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
                    <div className="flex flex-col">
                      <span className="text-3xl font-black text-slate-400" dir="auto">by {songHeader.mainArtist}</span>
                      {songHeader.subArtist && <span className="text-xs font-bold text-slate-600 uppercase tracking-widest mt-1">{songHeader.subArtist}</span>}
                    </div>
                    {songHeader.subTitle && (
                      <div className="px-5 py-2 bg-white/5 border border-white/5 rounded-2xl">
                        <span className="text-base font-bold text-slate-500 italic">"{songHeader.subTitle}"</span>
                      </div>
                    )}
                    {chord.key && (
                      <div className="flex items-center gap-2.5 px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl">
                        <Music size={16} className="text-indigo-400" />
                        <span className="text-xs font-black uppercase tracking-[0.25em] text-indigo-400">Key: {chord.key}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-4 shrink-0">
                  <a href={getSearchUrl('youtube')} target="_blank" className="bg-rose-600 hover:bg-rose-500 text-white p-5 rounded-3xl shadow-2xl shadow-rose-600/30 transition-all hover:scale-105 active:scale-95"><Youtube size={28} /></a>
                  <a href={getSearchUrl('google')} target="_blank" className="bg-[#1e293b] hover:bg-[#334155] text-white p-5 rounded-3xl shadow-xl transition-all hover:scale-105 active:scale-95"><Search size={28} /></a>
                </div>
              </div>
            </div>

            {/* Content Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
              <div className="lg:col-span-8 space-y-12">
                {/* Main Chord Section */}
                <div className="bg-[#0c111c]/60 p-10 md:p-14 rounded-[4rem] border border-white/5 backdrop-blur-xl shadow-2xl">
                   <div className="flex items-center gap-3 mb-12 text-indigo-400">
                      <Zap size={24} className="fill-current" />
                      <h3 className="text-xs font-black uppercase tracking-[0.4em]">Essential Masterclass Shapes</h3>
                   </div>

                   <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                      {currentChordsToDisplay.map((diag, i) => (
                        <ChordDiagram key={i} variation={diag} size="sm" isActive={activeShapeIndex === i} onClick={() => setActiveShapeIndex(i)} />
                      ))}
                   </div>

                   <div className="mt-14 pt-14 border-t border-white/5 flex flex-col md:flex-row items-center gap-14">
                      <div className="bg-slate-950 p-8 rounded-[3rem] border border-indigo-500/20 shadow-2xl shrink-0">
                        <ChordDiagram variation={currentChordsToDisplay[activeShapeIndex] || currentChordsToDisplay[0]} />
                      </div>
                      <div className="space-y-8 flex-1 text-center md:text-left">
                        <div className="space-y-3">
                          <h4 className="text-5xl font-black text-white italic tracking-tighter">"Lock it in."</h4>
                          <div className="w-16 h-1 bg-indigo-500 rounded-full mx-auto md:mx-0" />
                        </div>
                        <p className="text-slate-400 text-lg leading-relaxed font-medium">
                          {chord.writtenTutorial || "Focus on ringing out every string clearly. If you see an 'X', ensure the string is fully muted with the edge of your fretting fingers."}
                        </p>
                        <div className="flex flex-wrap justify-center md:justify-start gap-4">
                           <div className="px-6 py-3 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl text-xs font-black uppercase tracking-widest text-indigo-400">Standard E-A-D-G-B-E</div>
                           <div className="px-6 py-3 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl text-xs font-black uppercase tracking-widest text-emerald-400">Clear Intonation Check</div>
                        </div>
                      </div>
                   </div>
                </div>

                <StrummingGuide pattern={displayPattern} name={displayPatternName} onNext={nextPattern} onPrev={prevPattern} />
              </div>

              {/* Sidebar Content */}
              <div className="lg:col-span-4 space-y-12">
                <div className="bg-[#0c111c]/60 border border-white/5 rounded-[4rem] p-12 flex flex-col gap-12 backdrop-blur-xl shadow-2xl">
                  <div className="space-y-8">
                    <div className="flex items-center gap-4 text-emerald-400">
                      <Map size={24} strokeWidth={2.5} />
                      <h3 className="text-xs font-black uppercase tracking-[0.4em]">Progressive Roadmap</h3>
                    </div>
                    
                    <div className="space-y-4">
                      {chord.songStructure && chord.songStructure.length > 0 ? (
                        chord.songStructure.map((part, idx) => (
                          <div key={idx} className="bg-slate-950/80 p-8 rounded-[2.5rem] border border-white/5 group hover:border-indigo-500/40 transition-all shadow-inner">
                             <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 group-hover:text-indigo-400 transition-colors mb-3 block">{part.section}</span>
                             <div className="text-xl font-black text-white tracking-[0.15em] leading-relaxed" dir="ltr">
                                {part.chords}
                             </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-10 border border-dashed border-white/10 rounded-[2.5rem] text-center">
                          <p className="text-xs text-slate-700 font-bold uppercase tracking-widest">Structural data processing...</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-8 pt-12 border-t border-white/5">
                    <div className="flex items-center gap-4 text-indigo-400">
                      <ListMusic size={24} strokeWidth={2.5} />
                      <h3 className="text-xs font-black uppercase tracking-[0.4em]">Masterclass Assets</h3>
                    </div>
                    <div className="flex flex-col gap-4">
                      <a href={getSearchUrl('youtube')} target="_blank" className="flex items-center justify-between p-6 bg-rose-500/5 border border-rose-500/10 rounded-[2rem] hover:bg-rose-500/10 transition-all group">
                         <div className="flex items-center gap-5">
                           <Youtube className="text-rose-500" size={24} />
                           <span className="text-xs font-black uppercase tracking-[0.15em] text-rose-100">Video Walkthrough</span>
                         </div>
                         <ArrowRight size={18} className="text-slate-700 group-hover:text-rose-400 transition-all" />
                      </a>
                      <a href={getSearchUrl('google')} target="_blank" className="flex items-center justify-between p-6 bg-indigo-500/5 border border-indigo-500/10 rounded-[2rem] hover:bg-indigo-500/10 transition-all group">
                         <div className="flex items-center gap-5">
                           <Globe className="text-indigo-500" size={24} />
                           <span className="text-xs font-black uppercase tracking-[0.15em] text-indigo-100">Tabs & Scoring</span>
                         </div>
                         <ArrowRight size={18} className="text-slate-700 group-hover:text-indigo-400 transition-all" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : error ? (
          <div className="min-h-[65vh] flex flex-col items-center justify-center p-10 animate-in fade-in">
             <div className="bg-[#0c111c] border border-white/10 p-16 rounded-[4rem] max-w-2xl w-full text-center space-y-10 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)]">
                <AlertCircle size={72} className="text-rose-500 mx-auto" />
                <div className="space-y-5">
                  <h2 className="text-4xl font-black text-white tracking-tighter">Roadmap Interrupted</h2>
                  <p className="text-slate-400 text-xl leading-relaxed font-medium">{error}</p>
                </div>
                <div className="flex flex-wrap gap-5 justify-center pt-6">
                  <button onClick={() => handleSearch(searchTerm)} className="px-12 py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] transition-all shadow-2xl shadow-indigo-600/30 active:scale-95 flex items-center gap-3"><RefreshCw size={16} /> Re-scan Core</button>
                  <button onClick={() => setIsHome(true)} className="px-12 py-5 bg-white/5 hover:bg-white/10 text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] border border-white/5 transition-all">Abort & Return</button>
                </div>
             </div>
          </div>
        ) : null}
      </main>
    </div>
  );
};

export default App;
