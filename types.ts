
export interface ChordVariation {
  // Corrected typo from freets to frets to match usage in components and services
  frets: (number | null)[]; // null means muted/don't play, 0 means open
  label: string;
}

export interface SongSection {
  section: string;
  chords: string;
}

export interface SongSuggestion {
  title: string;
  artist: string;
  key?: string;
  difficulty?: string;
}

export interface Tutorial {
  title: string;
  url: string;
}

export interface ExternalLink {
  site: string;
  url: string;
}

export interface ChordData {
  chordName: string;
  nativeName?: string; // Original language name (e.g., Hebrew)
  artistName?: string;
  nativeArtistName?: string; // Original language artist name
  notes: string[];
  intervals: string[];
  strummingPattern: string;
  variations: ChordVariation[];
  songChordDiagrams?: ChordVariation[];
  songStructure?: SongSection[];
  suggestions?: string[]; 
  suggestedSongs?: SongSuggestion[]; 
  isSongMatch?: boolean; 
  isAmbiguous?: boolean; 
  chordsInSong?: string[];
  tutorials?: Tutorial[];
  externalLinks?: ExternalLink[];
  writtenTutorial?: string;
  isChordValid?: boolean;
  songBackground?: string;
  artistBackground?: string;
  key?: string;
}

export enum TuningStatus {
  IDLE = 'IDLE',
  LISTENING = 'LISTENING',
  TUNE_OK = 'TUNE_OK',
  TUNE_LOW = 'TUNE_LOW',
  TUNE_HIGH = 'TUNE_HIGH'
}
