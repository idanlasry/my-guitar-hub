# Guitar Hub — Claude Code Context

## Project Overview
Bilingual (Hebrew/English) guitar learning app. Users search any song → get chords, chord diagrams, chord sheet with lyrics, strumming pattern, roadmap, tuner, metronome.

**Stack:** React 19 + TypeScript + Tailwind CSS + Vite
**AI:** Gemini (`gemini-3-flash-preview`) via `@google/genai` SDK
**State:** All client-side (localStorage for favorites, history, user profile)
**No backend yet** — this is the next phase.

## File Map
```
App.tsx                    — Main component (~600 lines), all UI + state
types.ts                   — All TypeScript interfaces (ChordData, SongSection, etc.)
services/geminiService.ts  — Gemini API call, returns ChordData JSON
services/lyricsService.ts  — External lyrics fetch
components/
  ChordDiagram.tsx         — Fretboard SVG renderer
  Metronome.tsx            — BPM metronome with audio
  Tuner.tsx                — Microphone-based guitar tuner
  StrummingGuide.tsx       — Animated strumming pattern display
```

## Critical Security Issue (Priority #1)
`process.env.API_KEY` is used directly in `services/geminiService.ts` — this exposes the Gemini API key in the browser bundle.
**Fix:** Backend proxy (Supabase Edge Function or Express API route) that holds the key server-side.

## Backend Roadmap
| Priority | Feature | Tool |
|----------|---------|------|
| 🔴 1 | API key proxy — move Gemini call server-side | Supabase Edge Function |
| 🟡 2 | Real user auth — replace fake localStorage login | Supabase Auth |
| 🟡 3 | Persist favorites + history per user | Supabase DB (PostgreSQL) |
| 🟢 4 | Swap Gemini for any LLM API | Refactor geminiService.ts |
| 🟢 5 | Deploy | Vercel |

## Multi-Brain Development Pattern

### When to delegate to Gemini CLI
- New feature touching 4+ files
- Full component scaffold from scratch
- Large refactor (rename, restructure, new data model)
- Anything requiring full-codebase context (>50K tokens)

```bash
gemini -p "Stack: React 19 + TypeScript + Tailwind. Context: [paste relevant files]. Task: [what]. Constraints: [what NOT to touch]. Return: [expected output]."
```

### When to delegate to Codex CLI
- Algorithmic logic (audio processing, music theory math)
- Test generation
- Complex TypeScript type work

```bash
codex exec "Task: [what]. File: [path]. Constraints: [what NOT to touch]."
```

### When Claude Code edits directly
- Bug fixes
- UI/style tweaks (1-2 files)
- API integrations (Supabase, Vercel, auth)
- Anything security/credentials related
- Reviewing + applying output from Gemini/Codex

### Delegation decision rule
```
1-3 files, clear scope  → Claude edits directly
4+ files OR new feature → delegate to Gemini CLI, Claude reviews
Security/credentials    → Claude ONLY, never delegate
```

## Hebrew/RTL Notes
- `isMostlyHebrew()` detects Hebrew text for RTL layout switching
- Hebrew songs display with `dir="rtl"` and `flex-row-reverse`
- Chord brackets `[Am]` always stay LTR even in Hebrew chord sheets
- `nativeName` / `nativeArtistName` fields carry Hebrew script

## Key Conventions
- Tailwind only — no CSS files
- All icons from `lucide-react`
- API response parsed via `extractJSON()` in geminiService (handles markdown-wrapped JSON)
- localStorage keys prefixed with `chordmaster_`
