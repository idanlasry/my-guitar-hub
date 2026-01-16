import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Search, Guitar, Star, HelpCircle, ArrowRight, Disc, PlayCircle, Home, Mic2, Timer, Zap, Activity, Waves, ChevronLeft, Sparkles, Music2, BookOpen, Filter, X, Youtube, ExternalLink, Clock, Trash2, Award, AlertCircle, CheckCircle2, Info, Layout, ListMusic, FileText, RefreshCw, Bolt, Map, Globe, Music, RotateCcw, Shuffle, Bookmark, History, UserCircle, LogOut } from 'lucide-react';
import { fetchChordData } from './services/geminiService';
import { ChordData, SongSuggestion } from './types';
import ChordDiagram from './components/ChordDiagram';
import Metronome from './components/Metronome';
import Tuner from './components/Tuner';
import StrummingGuide from './components/StrummingGuide';
import AuthModal from './components/AuthModal';

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
  
  // Auth state
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

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
    const savedUser = localStorage.getItem('chordmaster_user');
    if (savedUser) {
      try { setUser(JSON.parse(savedUser)); } catch (e) {}
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

  const handleLogin = (email: string) => {
    const newUser = { email };
    setUser(newUser);
    localStorage.setItem('chordmaster_user', JSON.stringify(newUser));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('chordmaster_user');
  };

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
      setError("Analysis timed out. Try a different search.");
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

  const nextPattern = () => setPatternIndex((p) => (p + 1) % STRUMMING_PATTERNS.length);
  const prevPattern = () => setPatternIndex((p) => (p - 1 + STRUMMING_PATTERNS.length) % STRUMMING_PATTERNS.length);

  const currentChordsToDisplay = useMemo(() => {
    if (!chord) return [];
    if (chord.isSongMatch && chord.songChordDiagrams?.length) return chord.songChordDiagrams;
    return chord.variations || [];
  }, [chord]);

  const displayPattern = chord?.strummingPattern?.includes(',') ? chord.strummingPattern : STRUMMING_PATTERNS[patternIndex].pattern;

  function isHebrew(text: string) {
    return /[\u0590-\u05FF]/.test(text);
  }

  const displayPatternName = useMemo(() => {
    if (!chord) return STRUMMING_PATTERNS[patternIndex].name;
    const baseName = (chord.nativeName && isHebrew(chord.nativeName)) ? chord.nativeName : chord.chordName;
    if (chord.isSongMatch) {
      return isHebrew(baseName) ? `קצב חתימה: ${baseName}` : `${baseName} Signature`;
    }
    return STRUMMING_PATTERNS[patternIndex].name;
  }, [chord, patternIndex]);

  const getSearchUrl = (type: 'youtube' | 'google') => {
    if (!chord) return '#';
    let songTerm = (chord.nativeName && isHebrew(chord.nativeName)) ? chord.nativeName : (chord.isSongMatch ? `${chord.chordName} ${chord.artistName || ''}` : chord.chordName);
    const hasHebrew = isHebrew(songTerm);
    if (hasHebrew) songTerm = songTerm.replace(/[^\u0590-\u05FF0-9\s]/g, '').replace(/\s+/g, ' ').trim();
    if (type === 'youtube') return `https://www.youtube.com/results?search_query=${encodeURIComponent(songTerm + (hasHebrew ? ' מדריך גיטרה' : ' guitar tutorial'))}`;
    return `https://www.google.com/search?q=${encodeURIComponent(songTerm + (hasHebrew ? ' אקורדים' : ' guitar chords'))}`;
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('chordmaster_history');
  };

  const headerTitle = useMemo(() => {
    if (!chord) return "";
    return (chord.nativeName && isHebrew(chord.nativeName)) ? chord.nativeName : chord.chordName;
  }, [chord]);

  return (
    <div className="min-h-screen bg-[#030508] text-slate-100 flex flex-col font-sans selection:bg-indigo-500/30 overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/20 blur-[150px] rounded-full animate-pulse" />
      </div>

      {/* Refined and Organized Header */}
      <header className="sticky top-0 z-50 bg-[#06090e]/80 backdrop-blur-xl border-b border-white/5 header-height flex items-center px-4 md:px-8 shadow-2xl">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between gap-10">
          
          {/* Left: Brand and Core Navigation */}
          <div className="flex items-center gap-10">
            <button onClick={() => setIsHome(true)} className="flex items-center gap-2 hover:opacity-70 transition-all shrink-0">
              <div className="bg-indigo-600 p-1.5 rounded-lg shadow-lg"><Home className="w-3.5 h-3.5 text-white" /></div>
              <span className="font-black text-xs tracking-tight uppercase hidden lg:block">Guitar Hub</span>
            </button>
            
            <div className="flex items-center gap-8">
              <div className="relative" ref={historyRef}>
                <button 
                  onClick={() => { setShowHistoryDropdown(!showHistoryDropdown); setShowBookmarksDropdown(false); }}
                  disabled={history.length === 0}
                  className={`text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${history.length === 0 ? 'opacity-20 cursor-not-allowed' : 'text-slate-400 hover:text-white'}`}
                >
                  History
                </button>
                {showHistoryDropdown && history.length > 0 && (
                  <div className="absolute top-10 left-0 w-64 bg-[#0a0f18] border border-white/5 rounded-xl shadow-3xl py-2 z-50 animate-in fade-in slide-in-from-top-1">
                    <div className="px-4 py-2 border-b border-white/5 mb-1 flex justify-between items-center"><span className="text-[9px] font-black uppercase tracking-widest text-slate-600">Recent</span><button onClick={clearHistory} className="text-[9px] text-rose-500 hover:underline">Clear</button></div>
                    {history.map((item, idx) => (
                      <button key={idx} onClick={() => handleSearch(item.name)} className="w-full text-left px-4 py-2.5 hover:bg-white/5 transition-colors flex items-center gap-3"><History size={12} className="text-slate-700" /><span className="text-xs font-semibold truncate" dir="auto">{item.name}</span></button>
                    ))}
                  </div>
                )}
              </div>

              <div className="relative" ref={bookmarksRef}>
                <button 
                  onClick={() => { setShowBookmarksDropdown(!showBookmarksDropdown); setShowHistoryDropdown(false); }}
                  disabled={bookmarks.length === 0}
                  className={`text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${bookmarks.length === 0 ? 'opacity-20 cursor-not-allowed' : 'text-slate-400 hover:text-white'}`}
                >
                  Bookmarks
                </button>
                {showBookmarksDropdown && bookmarks.length > 0 && (
                  <div className="absolute top-10 left-0 w-64 bg-[#0a0f18] border border-white/5 rounded-xl shadow-3xl py-2 z-50 animate-in fade-in slide-in-from-top-1">
                    <div className="px-4 py-2 border-b border-white/5 mb-1"><span className="text-[9px] font-black uppercase tracking-widest text-slate-600">Saved</span></div>
                    {bookmarks.map((name, idx) => (
                      <button key={idx} onClick={() => handleSearch(name)} className="w-full text-left px-4 py-2.5 hover:bg-white/5 transition-colors flex items-center gap-3"><Star size={12} className="text-amber-500" fill="currentColor" /><span className="text-xs font-semibold truncate" dir="auto">{name}</span></button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Center: Utility Pill (Evenly spaced between sides) */}
          <div className="flex items-center bg-[#0d121c] p-0.5 rounded-xl border border-white/5 shadow-inner shrink-0">
            <button onClick={() => setShowTuner(!showTuner)} className={`px-5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${showTuner ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>Tuner</button>
            <button onClick={() => setShowMetronome(!showMetronome)} className={`px-5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${showMetronome ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>Tempo</button>
          </div>

          {/* Right: Auth and Search (Shared typography) */}
          <div className="flex items-center gap-6 shrink-0">
            {user ? (
              <div className="flex items-center gap-3">
                <div className="flex flex-col items-end hidden sm:flex">
                  <span className="text-[10px] font-black text-white uppercase tracking-tighter truncate max-w-[80px]">{user.email.split('@')[0]}</span>
                  <button onClick={handleLogout} className="text-[8px] font-bold text-slate-500 uppercase hover:text-rose-500 transition-colors">Sign Out</button>
                </div>
                <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center border border-white/10 shadow-lg shadow-indigo-500/10"><UserCircle size={20} className="text-white" /></div>
              </div>
            ) : (
              <button 
                onClick={() => setIsAuthModalOpen(true)}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-xl shadow-indigo-500/20 flex items-center gap-2 group"
              >
                Join Hub
                <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
              </button>
            )}
            
            <div className="relative w-44">
              <form onSubmit={(e) => { e.preventDefault(); handleSearch(searchTerm); }}>
                <input 
                  type="text" 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)} 
                  placeholder="Song or Chord..." 
                  className="w-full h-9 bg-white/[0.03] border border-white/5 rounded-xl pl-9 pr-4 text-[11px] text-white focus:outline-none focus:ring-1 focus:ring-indigo-500/40 transition-all font-medium" 
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
              </form>
            </div>
          </div>
        </div>
      </header>

      {(showTuner || showMetronome) && (
        <div className="fixed top-16 right-4 md:right-8 z-40 w-80 space-y-4 animate-in slide-in-from-top-2 fade-in duration-200">
          {showTuner && <Tuner />}
          {showMetronome && <Metronome />}
        </div>
      )}

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} onSuccess={handleLogin} />

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-12 relative z-10">
        {loading ? (
          <div className="h-[60vh] flex flex-col items-center justify-center gap-6 animate-in fade-in duration-500">
            <Activity className="w-12 h-12 text-indigo-500 animate-pulse" />
            <p className="text-indigo-400 text-[11px] font-black uppercase tracking-[0.4em] animate-pulse">Scanning Masterclass Library...</p>
          </div>
        ) : isHome ? (
          <div className="max-w-6xl mx-auto space-y-24 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="text-center space-y-6 py-12">
              <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-tight bg-gradient-to-b from-white to-slate-500 bg-clip-text text-transparent">Guitar Hub</h1>
              <p className="text-slate-500 text-lg md:text-xl max-w-2xl mx-auto font-medium opacity-80">Grounded tutorials, signature rhythm charts, and real-time theory analysis.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
               <div className="space-y-8">
                <div className="flex items-center gap-3 text-amber-500">
                  <Star size={18} fill="currentColor" />
                  <h3 className="text-[11px] font-black uppercase tracking-[0.3em]">Your Bookmarks</h3>
                </div>
                {bookmarks.length > 0 ? (
                  <div className="grid grid-cols-2 gap-4">
                    {bookmarks.map((name, idx) => (
                      <button key={idx} onClick={() => handleSearch(name)} className="px-6 py-5 bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 hover:border-amber-500/20 rounded-2xl transition-all flex items-center gap-4 group">
                        <Bookmark size={14} className="text-amber-600 group-hover:scale-110 transition-transform" />
                        <span className="text-sm font-bold text-slate-300" dir="auto">{name}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest border border-dashed border-white/5 p-16 rounded-3xl text-center">Save your favorite songs to see them here.</p>
                )}
              </div>

              <div className="space-y-8">
                <div className="flex items-center gap-3 text-indigo-400">
                  <RotateCcw size={18} />
                  <h3 className="text-[11px] font-black uppercase tracking-[0.3em]">Jump Back</h3>
                </div>
                {history.length > 0 ? (
                  <div className="grid grid-cols-2 gap-4">
                    {history.map((item, idx) => (
                      <button key={idx} onClick={() => handleSearch(item.name)} className="px-6 py-5 bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 hover:border-indigo-500/20 rounded-2xl transition-all flex items-center gap-4 group">
                        <Music2 size={14} className="text-indigo-600 group-hover:scale-110 transition-transform" />
                        <span className="text-sm font-bold text-slate-300" dir="auto">{item.name}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest border border-dashed border-white/5 p-16 rounded-3xl text-center">Recent searches will appear here.</p>
                )}
              </div>
            </div>

            <div className="space-y-10 pt-16 border-t border-white/5">
              <div className="flex items-center gap-3 text-emerald-400">
                <Sparkles size={18} />
                <h3 className="text-[11px] font-black uppercase tracking-[0.3em]">Explore New Chords</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {featuredSongs.map((song, i) => (
                  <button key={i} onClick={() => handleSearch(`${song.title} ${song.artist}`)} className="bg-white/[0.01] border border-white/5 hover:border-indigo-500/20 rounded-[2.5rem] p-9 text-left transition-all hover:-translate-y-1 group">
                    <div className="flex justify-between items-start mb-6">
                      <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border border-white/5 w-fit ${song.iconColor}`}>{song.difficulty}</div>
                      <ArrowRight size={16} className="text-slate-800 group-hover:text-indigo-500 transition-colors" />
                    </div>
                    <h4 className="text-2xl font-black text-white mb-2 truncate" dir="auto">{song.title}</h4>
                    <p className="text-slate-600 text-sm font-medium" dir="auto">{song.artist}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : chord && !error ? (
          <div className="max-w-7xl mx-auto space-y-12 animate-in fade-in duration-500 pb-20">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-6 flex-wrap">
                  <h2 className="text-6xl md:text-8xl font-black tracking-tighter text-white truncate max-w-full" dir="auto">
                    {headerTitle}
                  </h2>
                  <button 
                    onClick={() => toggleBookmark(chord.chordName)}
                    className={`p-4 rounded-2xl border transition-all ${
                      bookmarks.includes(chord.chordName) 
                        ? 'bg-amber-500/10 border-amber-500/40 text-amber-500 shadow-lg shadow-amber-500/10' 
                        : 'bg-white/5 border-white/10 text-slate-600 hover:text-amber-500 hover:border-amber-500/50'
                    }`}
                  >
                    <Star size={32} fill={bookmarks.includes(chord.chordName) ? "currentColor" : "none"} strokeWidth={2.5} />
                  </button>
                </div>
                <div className="flex items-center gap-5 mt-6">
                  <p className="text-2xl font-bold text-slate-500" dir="auto">by {chord.artistName || 'Unknown Artist'}</p>
                  {chord.key && (
                    <div className="px-3 py-1 bg-indigo-500/5 border border-indigo-500/10 rounded-xl">
                      <span className="text-[11px] font-black uppercase tracking-widest text-indigo-400">Key: {chord.key}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              <div className="lg:col-span-8 space-y-10">
                <div className="bg-[#080b12] p-8 md:p-12 rounded-[3rem] border border-white/5 shadow-3xl">
                   <div className="flex flex-wrap gap-4 mb-12">
                      {currentChordsToDisplay.map((diag, i) => (
                        <ChordDiagram key={i} variation={diag} size="sm" isActive={activeShapeIndex === i} onClick={() => setActiveShapeIndex(i)} />
                      ))}
                   </div>
                   <div className="mt-12 pt-12 border-t border-white/5 flex flex-col lg:flex-row items-start gap-12">
                      <div className="bg-[#030508] p-8 rounded-[3rem] border border-indigo-500/10 shadow-inner shrink-0 sticky top-20">
                        <ChordDiagram variation={currentChordsToDisplay[activeShapeIndex] || currentChordsToDisplay[0]} />
                      </div>
                      <div className="flex-1 w-full space-y-10">
                        <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-indigo-400/80">Song Roadmap</h3>
                        <div className="space-y-4">
                          {chord.songStructure?.map((part, idx) => (
                            <div key={idx} className="bg-white/[0.01] p-6 rounded-[2rem] border border-white/5 hover:border-indigo-500/10 transition-all group">
                              <span className="text-[9px] font-black uppercase tracking-[0.5em] text-slate-700 block mb-3">{part.section}</span>
                              <div className="text-2xl font-black text-white tracking-wider" dir="ltr">{part.chords}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                   </div>
                </div>
                <StrummingGuide pattern={displayPattern} name={displayPatternName} nativeName={chord.nativeName} onNext={nextPattern} onPrev={prevPattern} />
              </div>

              <div className="lg:col-span-4 space-y-10">
                <div className="bg-[#080b12] border border-white/5 rounded-[3rem] p-10 space-y-12">
                  <div className="space-y-8">
                    <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-rose-500">Learning</h3>
                    <a href={getSearchUrl('youtube')} target="_blank" className="flex items-center justify-between p-6 bg-rose-500/[0.02] border border-rose-500/10 rounded-[2rem] hover:bg-rose-500/[0.05] transition-all group shadow-2xl">
                      <div className="flex items-center gap-4">
                        <Youtube className="text-rose-500" size={24} />
                        <span className="text-xs font-black text-slate-200 uppercase tracking-widest">Tutorials</span>
                      </div>
                      <ArrowRight size={16} className="text-slate-700 group-hover:text-rose-400 transition-transform" />
                    </a>
                  </div>
                  <div className="space-y-8">
                    <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-indigo-400">Resources</h3>
                    <a href={getSearchUrl('google')} target="_blank" className="flex items-center justify-between p-6 bg-indigo-500/[0.02] border border-indigo-500/10 rounded-[2rem] hover:bg-indigo-500/[0.05] transition-all group shadow-2xl">
                      <div className="flex items-center gap-4">
                        <Search className="text-indigo-400" size={24} />
                        <span className="text-xs font-black text-slate-200 uppercase tracking-widest">Tabs</span>
                      </div>
                      <ExternalLink size={16} className="text-slate-700 group-hover:text-indigo-400 transition-transform" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : error ? (
          <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-8">
             <div className="bg-[#0a0f18] border border-white/5 p-16 rounded-[4rem] max-w-xl w-full shadow-3xl">
                <AlertCircle size={48} className="text-rose-500 mb-8 mx-auto" />
                <h2 className="text-3xl font-black mb-4 text-white">Analysis Interrupted</h2>
                <p className="text-slate-500 mb-12 text-lg font-medium leading-relaxed">{error}</p>
                <div className="flex gap-4 justify-center">
                  <button onClick={() => handleSearch(searchTerm)} className="px-10 py-4 bg-indigo-600 rounded-2xl font-black text-xs uppercase tracking-widest text-white shadow-xl shadow-indigo-500/20 hover:bg-indigo-500 transition-colors">Retry</button>
                  <button onClick={() => setIsHome(true)} className="px-10 py-4 bg-white/5 hover:bg-white/10 rounded-2xl font-black text-xs uppercase tracking-widest text-white transition-colors">Home</button>
                </div>
             </div>
          </div>
        ) : null}
      </main>
    </div>
  );
};

export default App;