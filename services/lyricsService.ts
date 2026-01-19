
import { LyricsData } from "../types";

/**
 * Fetches lyrics from LRCLIB (https://lrclib.net/)
 * LRCLIB is a public, open-source lyrics database.
 */
export const fetchLyrics = async (artist: string, track: string): Promise<LyricsData | null> => {
  if (!artist || !track) return null;

  try {
    const url = `https://lrclib.net/api/get?artist_name=${encodeURIComponent(artist)}&track_name=${encodeURIComponent(track)}`;
    const response = await fetch(url);
    
    if (response.status === 404) {
      console.warn("Lyrics not found on LRCLIB for:", track, "by", artist);
      return null;
    }

    if (!response.ok) {
      throw new Error(`LRCLIB error: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      plainLyrics: data.plainLyrics,
      syncedLyrics: data.syncedLyrics,
      instrumental: data.instrumental
    };
  } catch (error) {
    console.error("Failed to fetch lyrics from LRCLIB:", error);
    return null;
  }
};
