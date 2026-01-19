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
        throw new Error("Grounded search failed to format correctly. Please try again.");
      }
    }
    throw new Error("Analysis incomplete. Try a different song or artist.");
  }
}

export const fetchChordData = async (input: string): Promise<ChordData> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Search for guitar masterclass data for: "${input}".

      VERIFICATION RULES:
      1. Use Google Search to find functional YouTube tutorials and Hebrew/English chord sites.
      2. For Hebrew songs, PRIORITIZE data from tab4u.com. Ensure chords match their specific transcriptions.
      3. Identify the SONG STRUCTURE (Verse, Chorus, Bridge chord progressions) and the MUSICAL KEY.
      4. IMPORTANT: If the song is in Hebrew, always provide the 'nativeName' and 'nativeArtistName' in Hebrew.
      
      OUTPUT REQUIREMENTS:
      - Return ONLY a single JSON object.
      - 'chordSheet' must contain full lyrics with chords in brackets placed immediately BEFORE the word they belong to, e.g., "[Am] HebrewText".
      - 'songStructure' must contain the chord order for Verse, Chorus, etc. (e.g., "G - D - Em7 - Cadd9").
      - NO long text descriptions. Keep it structural.
      
      JSON SCHEMA:
      {
        "chordName": string,
        "nativeName": string,
        "artistName": string,
        "nativeArtistName": string,
        "key": string,
        "notes": string[],
        "intervals": string[],
        "strummingPattern": string,
        "isSongMatch": boolean,
        "isAmbiguous": boolean,
        "chordSheet": string,
        "songStructure": [{"section": "Verse", "chords": "G - D - Em7 - C"}, {"section": "Chorus", "chords": "G - D - Em7 - C"}],
        "writtenTutorial": "Short 1-sentence tip",
        "externalLinks": [{"site": string, "url": string}],
        "songChordDiagrams": [{"label": string, "frets": (number|null)[]}],
        "tutorials": [{"title": string, "url": string}],
        "variations": [{"label": string, "frets": (number|null)[]}]
      }
      
      Note: Use -1 for muted strings in 'frets'. Zero text outside JSON.`,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });

    if (!response || !response.text) {
      throw new Error("No data returned from the masterclass engine.");
    }

    const rawData = extractJSON(response.text.trim());
    
    const mapFret = (f: number | null) => (f === -1 ? null : f);

    const tutorials = (rawData.tutorials || []).map((t: any) => {
      let youtubeId = '';
      if (t.url) {
        const match = t.url.match(/(?:v=|\/)([0-9A-Za-z_-]{11}).*/);
        if (match) youtubeId = match[1];
      }
      return { ...t, youtubeId };
    }).filter((t: any) => t.url && (t.url.includes('youtube.com') || t.url.includes('youtu.be')));

    const variations = (rawData.variations || []).map((v: any) => ({
      ...v,
      frets: Array.isArray(v.frets) ? v.frets.map(mapFret) : []
    }));

    const songChordDiagrams = (rawData.songChordDiagrams || []).map((d: any) => ({
      ...d,
      frets: Array.isArray(d.frets) ? d.frets.map(mapFret) : []
    }));

    return {
      ...rawData,
      tutorials,
      variations: variations.slice(0, 3),
      songChordDiagrams: songChordDiagrams.length > 0 ? songChordDiagrams : undefined
    };
  } catch (error) {
    console.error("Gemini Service Error:", error);
    throw error;
  }
};