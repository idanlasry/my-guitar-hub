
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Guitar, Star, HelpCircle, ArrowRight, Disc, PlayCircle, Home, Mic2, Timer, Zap, Activity, Waves, ChevronLeft, Sparkles, Music2, BookOpen, Filter, X, Youtube, ExternalLink, Clock, Trash2, Award, AlertCircle, CheckCircle2, Info, Layout, ListMusic, FileText, RefreshCw, Bolt, Map, Globe, Music, RotateCcw, Shuffle, Bookmark, History, AlignLeft, Quote, User, LogIn, LogOut, TrendingUp, Calendar } from 'lucide-react';
import { fetchChordData } from './services/geminiService';
import { fetchLyrics } from './services/lyricsService';
import { ChordData, SongSuggestion, SongSection } from './types';
import ChordDiagram from './components/ChordDiagram';
import Metronome from './components/Metronome';
import Tuner from './components/Tuner';
import StrummingGuide from './components/StrummingGuide';

const SUGGESTED_POOL = [
  { title: "Wonderwall", artist: "Oasis", difficulty: "Beginner", iconColor: "text-emerald-400" },
  { title: "Hotel California", artist: "Eagles", difficulty: "Intermediate", iconColor: "text-amber-400" },
  { title: "Wish You Were Here", artist: "Pink Floyd", difficulty: "Beginner", iconColor: "text-blue-400" },
  { title: "Fast Car", artist: "Tracy Chapman", difficulty: "Intermediate", iconColor: "text-purple-400" },
  { title: "ממעמקים", artist: "הפרויקט של עידן רייכל", difficulty: "Intermediate", iconColor: "text-amber-400" },
  { title: "לבחור נכון", artist: "אמיר דדון", difficulty: "Beginner", iconColor: "text-blue-400" }
];

const STRUMMING_PATTERNS = [
  { name: "The Old Faithful", pattern: "D,_,D,U,_,U,D,U" },
  { name: "Modern Pop Syncopation", pattern: "D,_,D,_,D,U,D,U" }
];

interface LibraryItem {
  title: string;
  artist: string;
}

interface UserProfile {
  name: string;
  joinedAt: string;
}

interface UsageLog {
  id: string;
  action: 'Search' | 'Favorite' | 'Metronome' | 'Tuner';
  details: string;
  timestamp: string;
}

const isMostlyHebrew = (text: string) => {
    if (!text) return false;
    const hebrewMatch = text.match(/[\u0590-\u05FF]/g) || [];
    const latinMatch = text.match(/[a-zA-Z]/g) || [];
    return hebrewMatch.length > latinMatch.length;
};

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
            className={`flex flex-wrap items-end min-h-[2.8em] leading-[2.5] ${isRtl ? 'text-right justify-start flex-row-reverse' : 'text-left justify-start'}`} 
            dir={isRtl ? 'rtl' : 'ltr'}
          >
            {parts.map((part, partIdx) => {
              if (part.startsWith('[') && part.endsWith(']')) {
                const chord = part.slice(1, -1);
                return (
                  <span key={partIdx} className="relative inline-block h-6 w-0 overflow-visible mx-1">
                    <span 
                      className="absolute bottom-full mb-1 left-0 text-indigo-400 font-black text-[10px] md:text-xs uppercase bg-indigo-500/10 px-2 py-0.5 rounded whitespace-nowrap shadow-sm border border-indigo-500/10 transition-transform hover:scale-110 cursor-default" 
                      dir="ltr"
                    >
                      {chord}
                    </span>
                  </span>
                );
              }
              return (
                <span key={partIdx} className={`whitespace-pre text-sm sm:text-base md:text-xl font-medium tracking-wide ${isRtl ? 'hebrew font-bold' : ''}`}>
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
  const [favorites, setFavorites] = useState<LibraryItem[]>([]);
  const [history, setHistory] = useState<LibraryItem[]>([]);
  const [usageLogs, setUsageLogs] = useState<UsageLog[]>([]);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showTuner, setShowTuner] = useState(false);
  const [showMetronome, setShowMetronome] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [activeTab, setActiveTab] = useState<'roadmap' | 'lyrics'>('lyrics');

  // Load persistence layer
  useEffect(() => {
    const savedFavorites = localStorage.getItem('chordmaster_favorites');
    const savedHistory = localStorage.getItem('chordmaster_history');
    const savedLogs = localStorage.getItem('chordmaster_logs');
    const savedUser = localStorage.getItem('chordmaster_user');
    
    if (savedFavorites) { try { setFavorites(JSON.parse(savedFavorites)); } catch (e) {} }
    if (savedHistory) { try { setHistory(JSON.parse(savedHistory)); } catch (e) {} }
    if (savedLogs) { try { setUsageLogs(JSON.parse(savedLogs)); } catch (e) {} }
    if (savedUser) { try { setUser(JSON.parse(savedUser)); } catch (e) {} }
  }, []);

  const logActivity = (action: UsageLog['action'], details: string) => {
    setUsageLogs(prev => {
      const newLog: UsageLog = {
        id: Math.random().toString(36).substr(2, 9),
        action,
        details,
        timestamp: new Date().toISOString()
      };
      const updated = [newLog, ...prev].slice(0, 50);
      localStorage.setItem('chordmaster_logs', JSON.stringify(updated));
      return updated;
    });
  };

  const handleLogin = (name: string) => {
    const newUser = { name, joinedAt: new Date().toISOString() };
    setUser(newUser);
    localStorage.setItem('chordmaster_user', JSON.stringify(newUser));
    setShowLoginModal(false);
    logActivity('Metronome', `User ${name} logged in`);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('chordmaster_user');
    logActivity('Metronome', 'User logged out');
  };

  const toggleFavorite = (title: string, artist: string) => {
    setFavorites(prev => {
      const isFav = prev.some(f => f.title === title && f.artist === artist);
      const updated = isFav 
        ? prev.filter(f => !(f.title === title && f.artist === artist)) 
        : [{ title, artist }, ...prev];
      localStorage.setItem('chordmaster_favorites', JSON.stringify(updated));
      logActivity('Favorite', `${isFav ? 'Removed' : 'Added'} ${title}`);
      return updated;
    });
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('chordmaster_history');
    logActivity('Search', 'History cleared');
  };

  const addToHistory = (title: string, artist: string) => {
    setHistory(prev => {
      const filtered = prev.filter(h => !(h.title === title && h.artist === artist));
      const updated = [{ title, artist }, ...filtered].slice(0, 12);
      localStorage.setItem('chordmaster_history', JSON.stringify(updated));
      return updated;
    });
  };

  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setIsHome(false);
    setSearchTerm(query);
    setActiveTab('lyrics');
    setShowMobileSearch(false);

    try {
      const data = await fetchChordData(query);
      setChord(data);
      const title = data.nativeName || data.chordName;
      const artist = data.nativeArtistName || data.artistName || "Unknown Artist";
      addToHistory(title, artist);
      logActivity('Search', `Analyzed ${title} by ${artist}`);
    } catch (err: any) {
      setError(err.message || "Search failed.");
      setChord(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const nextPattern = () => setPatternIndex((p) => (p + 1) % STRUMMING_PATTERNS.length);
  const prevPattern = () => setPatternIndex((p) => (p - 1 + STRUMMING_PATTERNS.length) % STRUMMING_PATTERNS.length);

  const getSearchUrl = useCallback((type: 'youtube' | 'google') => {
    if (!chord) return '#';
    const songTitle = chord.nativeName || chord.chordName;
    if (type === 'youtube') {
      return `https://www.youtube.com/results?search_query=${encodeURIComponent(songTitle + ' guitar lesson')}`;
    }
    return `https://www.google.com/search?q=${encodeURIComponent(songTitle + ' chords')}`;
  }, [chord]);

  const displayPattern = chord?.strummingPattern?.includes(',') ? chord.strummingPattern : STRUMMING_PATTERNS[patternIndex].pattern;
  const displayPatternName = chord?.isSongMatch ? `${chord.chordName} Rhythm` : STRUMMING_PATTERNS[patternIndex].name;

  const getDeduplicatedRoadmap = useCallback((structure: SongSection[]) => {
    const grouped: { labels: string[], chords: string }[] = [];
    structure.forEach((part) => {
      const normalizedChords = part.chords.trim();
      const existing = grouped.find(g => g.chords === normalizedChords);
      if (existing) {
        if (!existing.labels.includes(part.section)) {
          existing.labels.push(part.section);
        }
      } else {
        grouped.push({ labels: [part.section], chords: normalizedChords });
      }
    });
    return grouped;
  }, []);

  const songTitle = chord?.nativeName || chord?.chordName || "";
  const artistName = chord?.nativeArtistName || chord?.artistName || "";
  const isHebrewSong = isMostlyHebrew(songTitle);

  return (
    <div className="min-h-screen bg-[#05070a] text-slate-100 flex flex-col font-sans selection:bg-indigo-500/30 overflow-x-hidden">
      {/* Static background decoration - Pulse removed to fix flickering */}
      <div className="fixed inset-0 pointer-events-none opacity-20 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-indigo-600/20 blur-[150px] rounded-full" />
      </div>

      <header className="sticky top-0 z-50 bg-[#080b12]/80 backdrop-blur-xl border-b border-white/5 px-4 md:px-8 h-16 flex items-center shadow-lg">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between gap-2 md:gap-4">
          <button onClick={() => setIsHome(true)} className="flex items-center gap-2 md:gap-3 hover:opacity-80 transition-all group shrink-0">
            <div className="bg-indigo-600 p-1.5 md:p-2 rounded-lg md:rounded-xl shadow-lg"><Home className="w-3.5 h-3.5 md:w-4 md:h-4 text-white" /></div>
            <span className="font-black text-[10px] md:text-sm tracking-widest uppercase hidden sm:block">Guitar Hub</span>
          </button>

          <div className="flex items-center bg-indigo-950/40 p-0.5 md:p-1 rounded-full border border-indigo-500/20 shrink-0">
            <button onClick={() => setShowTuner(!showTuner)} className={`px-3 md:px-5 py-1 md:py-1.5 rounded-full text-[8px] md:text-[10px] font-black uppercase tracking-widest transition-all ${showTuner ? 'bg-indigo-500 text-white' : 'text-slate-400'}`}>Tuner</button>
            <button onClick={() => setShowMetronome(!showMetronome)} className={`px-3 md:px-5 py-1 md:py-1.5 rounded-full text-[8px] md:text-[10px] font-black uppercase tracking-widest transition-all ${showMetronome ? 'bg-indigo-500 text-white' : 'text-slate-400'}`}>Tempo</button>
          </div>

          <div className="flex items-center gap-2 md:gap-4 ml-auto">
            <div className="hidden sm:block">
              <form onSubmit={(e) => { e.preventDefault(); handleSearch(searchTerm); }} className="relative w-40 lg:w-80">
                <input 
                  type="text" 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)} 
                  placeholder="Song or Artist..." 
                  className="w-full h-9 md:h-10 bg-indigo-950/40 border border-indigo-500/20 rounded-xl pl-9 md:pl-10 pr-4 text-[10px] md:text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40 font-medium placeholder:text-slate-600" 
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              </form>
            </div>

            <button onClick={() => setShowMobileSearch(true)} className="sm:hidden p-2 text-slate-400 hover:text-white transition-colors">
              <Search size={20} />
            </button>

            {user ? (
              <div className="flex items-center gap-2 md:gap-3 pl-2 md:pl-4 border-l border-white/5">
                <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-indigo-600 flex items-center justify-center text-[8px] md:text-[10px] font-black text-white uppercase shadow-lg border border-white/10">
                  {user.name.charAt(0)}
                </div>
                <button onClick={handleLogout} className="text-slate-500 hover:text-white transition-colors" title="Logout">
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setShowLoginModal(true)} 
                className="px-3 md:px-5 py-1.5 md:py-2 bg-white/5 border border-white/10 rounded-lg md:rounded-xl text-[8px] md:text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white hover:bg-white/10 transition-all flex items-center gap-1.5"
              >
                <LogIn size={12} className="md:w-3.5 md:h-3.5" /> <span className="hidden xs:inline">Sign In</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Search Overlay */}
      {showMobileSearch && (
        <div className="fixed inset-0 z-[110] bg-[#05070a] p-4 flex flex-col gap-6 animate-in slide-in-from-top duration-300">
          <div className="flex items-center justify-between">
             <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Quick Search</span>
             <button onClick={() => setShowMobileSearch(false)} className="p-2 text-slate-400 hover:text-white"><X size={24}/></button>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); handleSearch(searchTerm); }} className="relative">
             <input 
                autoFocus
                type="text" 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                placeholder="Song or Artist..." 
                className="w-full h-14 bg-indigo-950/40 border border-indigo-500/20 rounded-2xl pl-12 pr-4 text-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40 font-bold placeholder:text-slate-700" 
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-500" />
          </form>
          <div className="space-y-4">
             <span className="text-[10px] font-black uppercase tracking-widest text-slate-700">Suggestions</span>
             <div className="grid grid-cols-2 gap-2">
                {SUGGESTED_POOL.slice(0, 4).map((s, i) => (
                   <button key={i} onClick={() => handleSearch(s.title)} className="p-3 bg-white/5 rounded-xl text-left">
                      <p className="text-xs font-bold text-slate-300 truncate">{s.title}</p>
                   </button>
                ))}
             </div>
          </div>
        </div>
      )}

      {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowLoginModal(false)} />
          <div className="relative bg-[#0c121d] border border-white/10 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-10 max-w-md w-full shadow-[0_0_100px_rgba(99,102,241,0.2)] animate-in zoom-in-95 duration-300">
            <button onClick={() => setShowLoginModal(false)} className="absolute top-6 right-6 text-slate-500 hover:text-white"><X size={20} /></button>
            <div className="text-center space-y-4 mb-8 md:mb-10">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-indigo-600 rounded-xl md:rounded-2xl mx-auto flex items-center justify-center shadow-lg mb-4 md:mb-6"><User size={28} className="text-white" /></div>
              <h2 className="text-2xl md:text-3xl font-black text-white tracking-tighter">Join the Hub</h2>
              <p className="text-slate-400 text-xs md:text-sm italic">Unlock personalized practice tracking.</p>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); const name = (e.target as any).name.value; if(name) handleLogin(name); }} className="space-y-4 md:space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-2">Display Name</label>
                <input name="name" type="text" placeholder="Maestro" className="w-full h-12 md:h-14 bg-white/5 border border-white/10 rounded-xl md:rounded-2xl px-6 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40 text-base md:text-lg font-bold" required />
              </div>
              <button type="submit" className="w-full h-12 md:h-14 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl md:rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-indigo-600/20 transition-all active:scale-95">Get Started</button>
            </form>
          </div>
        </div>
      )}

      {(showTuner || showMetronome) && (
        <div className="fixed top-[72px] right-4 md:right-8 z-40 w-[calc(100%-2rem)] sm:w-80 space-y-4 animate-in slide-in-from-top-4 fade-in duration-300">
          {showTuner && <Tuner />}
          {showMetronome && <Metronome />}
        </div>
      )}

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-8 relative z-10">
        {loading ? (
          <div className="h-[60vh] md:h-[70vh] flex flex-col items-center justify-center gap-6">
            <Activity className="w-12 h-12 md:w-16 md:h-16 text-indigo-400 animate-pulse" />
            <p className="text-indigo-400 text-[10px] md:text-sm font-black uppercase tracking-[0.3em] animate-pulse text-center">Analyzing Song Structure (~10s)...</p>
          </div>
        ) : isHome ? (
          <div className="max-w-6xl mx-auto py-8 md:py-12 space-y-12 md:space-y-20 animate-in fade-in slide-in-from-bottom-8 duration-1000 pb-20">
            
            {/* User Dashboard */}
            {user && (
              <section className="bg-[#0c121d] border border-white/5 rounded-[2rem] md:rounded-[3rem] p-6 md:p-10 shadow-2xl overflow-hidden relative group">
                <div className="absolute top-0 right-0 p-12 opacity-[0.02] md:opacity-[0.03] group-hover:opacity-[0.05] transition-opacity"><TrendingUp size={150} /></div>
                <div className="relative z-10 flex flex-col lg:flex-row justify-between gap-8 md:gap-12">
                   <div className="space-y-6 md:space-y-8 flex-1">
                      <div className="space-y-1 md:space-y-2">
                        <span className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.4em] text-indigo-400">Personal Dashboard</span>
                        <h2 className="text-3xl md:text-5xl font-black text-white tracking-tighter">Welcome, {user.name}</h2>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
                         {[
                           { label: "Analyzed", val: history.length, icon: <History className="text-indigo-400" size={14}/> },
                           { label: "Favorites", val: favorites.length, icon: <Star className="text-amber-400" size={14}/> },
                           { label: "Activities", val: usageLogs.length, icon: <Zap className="text-rose-400" size={14}/> },
                           { label: "Streak", val: "2 Days", icon: <TrendingUp className="text-emerald-400" size={14}/> },
                         ].map((s, i) => (
                           <div key={i} className="bg-white/5 p-4 md:p-6 rounded-2xl md:rounded-3xl border border-white/5">
                              <div className="flex items-center gap-1.5 md:gap-2 mb-1 md:mb-2">
                                {s.icon}
                                <span className="text-[7px] md:text-[9px] font-black uppercase tracking-widest text-slate-500">{s.label}</span>
                              </div>
                              <div className="text-lg md:text-2xl font-black text-white">{s.val}</div>
                           </div>
                         ))}
                      </div>
                   </div>

                   <div className="w-full lg:w-80 space-y-4 md:space-y-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-500">Practice Log</h3>
                        <Activity size={10} className="text-indigo-500" />
                      </div>
                      <div className="space-y-2 md:space-y-3 max-h-40 md:max-h-48 overflow-y-auto custom-scrollbar pr-1 md:pr-2">
                         {usageLogs.slice(0, 10).map((log) => (
                           <div key={log.id} className="flex items-start gap-2.5 md:gap-3 bg-white/3 p-3 md:p-4 rounded-xl md:rounded-2xl border border-white/5">
                              <div className={`p-1 md:p-1.5 rounded-lg shrink-0 ${log.action === 'Search' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-amber-500/10 text-amber-400'}`}>
                                {log.action === 'Search' ? <Search size={10} /> : <Star size={10} />}
                              </div>
                              <div className="min-w-0">
                                <p className="text-[9px] md:text-[10px] font-bold text-slate-300 truncate">{log.details}</p>
                                <p className="text-[7px] md:text-[8px] text-slate-600 uppercase font-black">{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                              </div>
                           </div>
                         ))}
                         {usageLogs.length === 0 && <p className="text-[9px] text-slate-700 italic text-center py-4">No activity yet. Start playing!</p>}
                      </div>
                   </div>
                </div>
              </section>
            )}

            {!user && (
              <div className="text-center space-y-4 md:space-y-6 px-4 py-8 md:py-12">
                <h1 className="text-4xl sm:text-6xl md:text-8xl font-black tracking-tighter leading-tight bg-gradient-to-b from-white to-indigo-500/40 bg-clip-text text-transparent">Instant Transcription</h1>
                <p className="text-slate-400 text-sm md:text-xl max-w-2xl mx-auto italic px-2">Your neural library for guitar mastery.</p>
              </div>
            )}

            {/* Recent History Section - Refined Visuals */}
            {history.length > 0 && (
              <section className="space-y-6 md:space-y-8 px-2 md:px-0">
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                  <div className="flex items-center gap-3 md:gap-4">
                    <History className="text-slate-500 w-4 h-4 md:w-5 md:h-5" />
                    <h2 className="text-[10px] md:text-xs font-black uppercase tracking-[0.4em] text-slate-400">Recent</h2>
                  </div>
                  <button onClick={clearHistory} className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-slate-600 hover:text-rose-500 transition-colors flex items-center gap-1.5">
                    <Trash2 size={12} /> Clear
                  </button>
                </div>
                <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                   {history.map((hist, i) => (
                      <button key={i} onClick={() => handleSearch(`${hist.title} ${hist.artist}`)} className="bg-[#0c121d] border border-white/5 hover:border-indigo-500/20 rounded-2xl md:rounded-3xl p-4 md:p-5 text-left transition-all group flex items-center gap-3 md:gap-4 shadow-lg">
                        <div className="p-2 md:p-2.5 bg-white/5 rounded-xl group-hover:bg-indigo-500/10 transition-colors">
                          <Clock size={16} className="text-slate-600 group-hover:text-indigo-400" />
                        </div>
                        <div className="overflow-hidden">
                          <h4 className="text-[10px] md:text-sm font-bold text-slate-200 truncate" dir={isMostlyHebrew(hist.title) ? "rtl" : "ltr"}>{hist.title}</h4>
                          <p className="text-slate-500 text-[8px] md:text-[10px] truncate">{hist.artist}</p>
                        </div>
                      </button>
                   ))}
                </div>
              </section>
            )}

            {/* Suggested Pool / Quick Picks */}
            <section className="space-y-6 md:space-y-8 px-2 md:px-0">
              <div className="flex items-center gap-3 md:gap-4 border-b border-white/5 pb-4">
                <Sparkles className="text-emerald-500 w-4 h-4 md:w-5 md:h-5" />
                <h2 className="text-[10px] md:text-xs font-black uppercase tracking-[0.4em] text-slate-400">Quick Picks</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {SUGGESTED_POOL.map((song, i) => (
                  <button key={i} onClick={() => handleSearch(`${song.title} ${song.artist}`)} className="bg-[#0c121d] border border-white/5 hover:border-indigo-500/30 rounded-[1.5rem] md:rounded-[2.5rem] p-6 md:p-8 text-left transition-all hover:-translate-y-1 md:hover:-translate-y-2 group shadow-xl">
                    <div className={`px-2 py-0.5 md:px-3 md:py-1 rounded-full text-[8px] md:text-[9px] font-black uppercase border border-white/10 w-fit mb-3 md:mb-4 ${song.iconColor}`}>{song.difficulty}</div>
                    <h4 className="text-xl md:text-2xl font-black text-white mb-1 md:mb-2 truncate group-hover:text-indigo-400 transition-colors" dir={isMostlyHebrew(song.title) ? "rtl" : "ltr"}>{song.title}</h4>
                    <p className="text-slate-500 text-[10px] md:text-sm">{song.artist}</p>
                  </button>
                ))}
              </div>
            </section>

            {/* Favorites Section */}
            {favorites.length > 0 && (
              <section className="space-y-6 md:space-y-8 px-2 md:px-0">
                <div className="flex items-center gap-3 md:gap-4 border-b border-white/5 pb-4">
                  <Star className="text-amber-400 fill-amber-400 w-4 h-4 md:w-5 md:h-5" />
                  <h2 className="text-[10px] md:text-xs font-black uppercase tracking-[0.4em] text-slate-400">Favorites</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                   {favorites.map((fav, i) => (
                      <button key={i} onClick={() => handleSearch(`${fav.title} ${fav.artist}`)} className="bg-[#0c121d] border border-amber-500/10 hover:border-amber-500/30 rounded-[1.5rem] md:rounded-[2.5rem] p-6 md:p-8 text-left transition-all hover:-translate-y-1 md:hover:-translate-y-2 group shadow-xl">
                        <h4 className="text-xl md:text-2xl font-black text-white mb-1 md:mb-2 truncate group-hover:text-amber-400 transition-colors" dir={isMostlyHebrew(fav.title) ? "rtl" : "ltr"}>{fav.title}</h4>
                        <p className="text-slate-500 text-[10px] md:text-sm">{fav.artist}</p>
                      </button>
                   ))}
                </div>
              </section>
            )}

          </div>
        ) : chord && !error ? (
          <div className="max-w-7xl mx-auto space-y-8 md:space-y-12 animate-in fade-in duration-500 pb-20">
            <div className={`flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6 ${isHebrewSong ? 'md:flex-row-reverse' : ''}`}>
              <div className={`flex-1 min-w-0 ${isHebrewSong ? 'text-right' : 'text-left'}`}>
                <div className={`flex items-start md:items-center gap-4 md:gap-6 ${isHebrewSong ? 'flex-row-reverse' : ''}`}>
                  <h2 className={`text-3xl sm:text-5xl md:text-8xl font-black tracking-tighter text-white leading-tight break-words flex-1 ${isHebrewSong ? 'hebrew' : ''}`} dir={isHebrewSong ? "rtl" : "ltr"}>
                    {songTitle}
                  </h2>
                  <button 
                    onClick={() => toggleFavorite(songTitle, artistName)} 
                    className={`p-3 md:p-4 rounded-full border transition-all shrink-0 ${favorites.some(f => f.title === songTitle) ? 'bg-amber-500/20 border-amber-500 text-amber-500' : 'bg-white/5 border-white/10 text-slate-500 hover:text-white'}`}
                  >
                    <Star size={32} fill={favorites.some(f => f.title === songTitle) ? "currentColor" : "none"} strokeWidth={2.5} />
                  </button>
                </div>
                <p className={`text-lg md:text-2xl font-black text-slate-500 mt-2 md:mt-4 truncate ${isHebrewSong ? 'hebrew' : ''}`} dir={isHebrewSong ? "rtl" : "ltr"}>
                  {artistName}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
              <div className="lg:col-span-8 space-y-6 md:space-y-8">
                <div className="bg-[#0c121d] p-5 md:p-10 rounded-[2rem] md:rounded-[3rem] border border-white/5 shadow-2xl overflow-hidden">
                   <div className="flex overflow-x-auto custom-scrollbar pb-4 gap-4 -mx-2 px-2 scroll-smooth">
                      <div className="flex gap-4 min-w-max">
                        {(chord.songChordDiagrams || []).map((diag, i) => (
                          <ChordDiagram key={i} variation={diag} size="sm" />
                        ))}
                      </div>
                   </div>
                   
                   <div className="mt-6 md:mt-8 pt-6 md:pt-8 border-t border-white/5 space-y-6 md:space-y-8">
                      <div className="flex items-center gap-3 overflow-x-auto no-scrollbar -mx-2 px-2">
                        <button onClick={() => setActiveTab('lyrics')} className={`flex items-center gap-2 px-4 md:px-6 py-2 md:py-2.5 rounded-xl md:rounded-2xl text-[9px] md:text-[11px] font-black uppercase tracking-widest transition-all shrink-0 ${activeTab === 'lyrics' ? 'bg-rose-600/20 text-rose-400 border border-rose-500/30' : 'text-slate-600 hover:text-slate-400'}`}><AlignLeft size={14} /> Lyrics</button>
                        <button onClick={() => setActiveTab('roadmap')} className={`flex items-center gap-2 px-4 md:px-6 py-2 md:py-2.5 rounded-xl md:rounded-2xl text-[9px] md:text-[11px] font-black uppercase tracking-widest transition-all shrink-0 ${activeTab === 'roadmap' ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30' : 'text-slate-600 hover:text-slate-400'}`}><Map size={14} /> Roadmap</button>
                      </div>

                      <div className="min-h-[300px] md:min-h-[400px]">
                        {activeTab === 'roadmap' ? (
                          <div className="space-y-4 md:space-y-6">
                            {(getDeduplicatedRoadmap(chord.songStructure || [])).map((part, idx) => (
                                <div key={idx} className="bg-slate-950/40 p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border border-white/5 hover:border-indigo-500/10 transition-all group">
                                  <span className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400/50 mb-2 block" dir={isHebrewSong ? "rtl" : "ltr"}>
                                    {part.labels.join(' / ')}
                                  </span>
                                  <div className={`text-xl md:text-3xl font-black text-white tracking-widest flex flex-wrap gap-3 md:gap-4 items-center ${isHebrewSong ? 'flex-row-reverse' : 'flex-row'}`} dir="ltr">
                                    {part.chords.split('-').map((c, i) => (
                                      <React.Fragment key={i}>
                                        <span className="hover:text-indigo-400 transition-colors cursor-default">{c.trim()}</span>
                                        {i < part.chords.split('-').length - 1 && <span className="text-slate-800 text-sm md:text-xl">→</span>}
                                      </React.Fragment>
                                    ))}
                                  </div>
                                </div>
                            ))}
                          </div>
                        ) : (
                          <div className="bg-slate-950/60 p-6 md:p-12 rounded-[2rem] md:rounded-[3rem] border border-white/5 shadow-inner overflow-x-auto">
                               {chord.chordSheet ? (
                                 <ChordSheetRenderer content={chord.chordSheet} />
                               ) : (
                                 <p className="text-slate-500 italic text-sm">No chord sheet generated for this song.</p>
                               )}
                          </div>
                        )}
                      </div>
                   </div>
                </div>
                <StrummingGuide pattern={displayPattern} name={displayPatternName} onNext={nextPattern} onPrev={prevPattern} />
              </div>

              <div className="lg:col-span-4 space-y-6 md:space-y-8">
                <div className="bg-[#0c121d] border border-white/5 rounded-[2rem] md:rounded-[3rem] p-6 md:p-8 space-y-8 md:space-y-12 shadow-2xl">
                   <div className="space-y-4 md:space-y-6">
                      <h3 className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-rose-500 flex items-center gap-2">
                        <Youtube size={20} /> Tutorials
                      </h3>
                      <a href={getSearchUrl('youtube')} target="_blank" className="flex items-center justify-between p-4 md:p-6 bg-rose-500/10 border border-rose-500/20 rounded-2xl md:rounded-3xl hover:bg-rose-500/20 transition-all group shadow-inner">
                        <span className="text-xs md:text-sm font-black text-rose-100">tutorials</span>
                        <ArrowRight size={20} className="text-rose-400 group-hover:translate-x-1 transition-transform" />
                      </a>
                   </div>
                   <div className="space-y-4 md:space-y-6">
                      <h3 className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-indigo-500 flex items-center gap-2">
                        <Globe size={20} /> Resource Hub
                      </h3>
                      <a href={getSearchUrl('google')} target="_blank" className="flex items-center justify-between p-4 md:p-6 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl md:rounded-3xl hover:bg-indigo-500/20 transition-all group shadow-inner">
                        <span className="text-xs md:text-sm font-black text-indigo-100">web search</span>
                        <ArrowRight size={20} className="text-indigo-400 group-hover:translate-x-1 transition-transform" />
                      </a>
                   </div>
                </div>
              </div>
            </div>
          </div>
        ) : error ? (
          <div className="min-h-[60vh] md:min-h-[70vh] flex flex-col items-center justify-center text-center p-6 md:p-8">
             <AlertCircle size={48} className="text-rose-500 mb-6 md:mb-8" />
             <h2 className="text-2xl md:text-3xl font-black mb-4 text-white">Engine Overload</h2>
             <p className="text-slate-400 mb-8 md:mb-10 text-base md:text-lg max-w-md">{error}</p>
             <button onClick={() => setIsHome(true)} className="px-8 md:px-10 py-3 md:py-4 bg-slate-800 rounded-full font-black text-[10px] md:text-xs uppercase text-white hover:bg-slate-700 transition-colors">Back Home</button>
          </div>
        ) : null}
      </main>
    </div>
  );
};

export default App;
