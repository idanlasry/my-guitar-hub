
import { GoogleGenAI } from "@google/genai";
import { ChordData } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * High-speed JSON extractor for low-latency responses
 */
function extractJSON(text: string): any {
  try {
    return JSON.parse(text);
  } catch (e) {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (innerE) {
        throw new Error("Analysis failed to format correctly. Please try again.");
      }
    }
    throw new Error("Analysis incomplete. Try a different song or artist.");
  }
}

export const fetchChordData = async (input: string): Promise<ChordData> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Search and analyze: "${input}". 
      If the query is in Hebrew or refers to an Israeli artist, prioritize local Israeli music theory and Hebrew lyrics.`,
      config: {
        systemInstruction: `You are a specialized Guitar Masterclass Engine with deep expertise in both Western and Israeli/Hebrew music.
        
        GOAL: Return a full song transcription optimized for speed and accuracy.
        
        LANGUAGE DETECTION:
        - If the query contains Hebrew characters, prioritize Israeli artists/songs.
        - ALWAYS provide 'nativeName' and 'nativeArtistName' in Hebrew script for Hebrew content.
        
        CHORD SHEET FORMATTING:
        - Chords MUST be in [BRACKETS] like [Am].
        - For HEBREW lyrics: Place chords [Am] directly to the LEFT of the word/syllable they apply to. The text direction will be RTL, but chords stay LTR.
        - Ensure rhythmic accuracy.
        
        JSON SCHEMA:
        {
          "chordName": "English title",
          "nativeName": "Hebrew title if applicable",
          "artistName": "English artist",
          "nativeArtistName": "Hebrew artist if applicable",
          "key": string,
          "notes": string[],
          "intervals": string[],
          "strummingPattern": string,
          "isSongMatch": boolean,
          "chordSheet": "Multi-line string with chords in brackets",
          "songStructure": [{"section": string, "chords": string}],
          "writtenTutorial": string,
          "songChordDiagrams": [{"label": string, "frets": (number|null)[]}]
        }`
      }
    });

    if (!response || !response.text) {
      throw new Error("No data returned from the masterclass engine.");
    }

    const rawData = extractJSON(response.text.trim());
    const mapFret = (f: number | null) => (f === -1 ? null : f);

    const songChordDiagrams = (rawData.songChordDiagrams || []).map((d: any) => ({
      ...d,
      frets: Array.isArray(d.frets) ? d.frets.map(mapFret) : []
    }));

    return {
      ...rawData,
      variations: [], // Not needed for song search
      songChordDiagrams: songChordDiagrams.length > 0 ? songChordDiagrams : undefined
    };
  } catch (error) {
    console.error("Gemini Service Error:", error);
    throw error;
  }
};
