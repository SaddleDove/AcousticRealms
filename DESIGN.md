# DESIGN.md — Acoustic Realms Design System

## Product Soul

Two immersive acoustic AI experiments: **deep-ocean humpback voiceprint recognition**
and **misty-forest birdsong species classification**. The aesthetic anchor is not a
"tech-company blue-purple gradient" — it is —

- **Whale**: a shaft of sunlight piercing 1,200 meters of blue, the surface like a
  cathedral dome, glowing plankton drifting in the light columns; a humpback glides
  past slowly, like a mountain that sings. Sound is low, long-breath, echoey.
- **Bird**: a misty forest before dawn, golden volumetric light slanting through moss
  and spiderwebs, birds crossing the haze trailing floating light specks. Sound is
  high-frequency, bright, granular.

Overall mood: **held breath + meditative calm**. Deep-sea documentary meets gallery
installation — not a dashboard.

## Visual Strategy

- Fullscreen cinematic video backgrounds (humpback deep-dive / bird flying through
  mist). Two clips crossfade for a seamless loop; a static poster covers first paint
  and acts as the fallback when the video is unavailable.
- Foreground glassmorphism panels (backdrop-blur + 1px translucent border + generous
  radius) floating above the scene, restrained whitespace.
- The spectrogram is the core visual organ: dark base + thermal gradient bands
  (deep indigo → cyan → amber → warm white), sonar/thermal-imaging-like. Training
  curves and the confusion matrix use the same restrained glowing-line language.

## Design Tokens

### Color
- Whale theme: abyssal blue `#06283d` / bio-luminescent cyan `#38e1ff` (highlights & data only)
- Bird theme: misty-forest ink green `#0c231a` / dawn gold `#f5c97b`
- Neutrals: glass panels `rgba(255,255,255,0.06~0.10)` + borders `rgba(255,255,255,0.14)`
- Text: warm white `#f4f7f6`, secondary `rgba(244,247,246,0.62)`
- Spectrogram palette: `#04121f → #0b3d6b → #14b8c4 → #f0b64f → #fff7e6`

### Typography
- Display headings: serif (documentary-title gravitas)
- English/numbers/data: Space Grotesk (labels, coordinates, parameters)
- Body: clean sans
- Rhythm: oversized headline whitespace + all-caps English kickers with 0.2em tracking

### Radius / Shadow / Border
- Panel radius 20–24px; buttons/chips 999px
- Shadows: soft, large-radius dark shadows + inner glow only — no hard projections
- All borders 1px, translucent white

### Motion
- Easing uniformly `cubic-bezier(0.22, 1, 0.36, 1)` (expo out)
- Entrance: panels fade up from 24px below, staggered 80–120ms
- Spectrogram: drawn live, smooth scanline; numbers roll with ease-out
- Hover: slight panel brightening (+0.03 background alpha) + 1px highlight border,
  no bounce
- Video crossfade 1.8s; `once` mode (whale): clip plays through, holds the poster
  frame statically for 5s, then replays

## Layout

- Home: fullscreen dark, two "chapter entrances" (whale / bird) each taking half the
  viewport, large titles + one poetic subtitle
- Inner pages: fixed video background + content column `max-w-6xl` as a vertical
  chapter flow (Sound Archive → Training Lab → Identification Console)
- Chapters separated by hairline rules + breathing whitespace — no card walls

## Interaction

- Playing a recording: the spectrogram draws and scrolls in sync with the sound,
  panel border glows softly
- Training: loss/accuracy curves grow live, the confusion matrix fades in when done,
  accuracy numbers roll
- Recognition: confidence bars grow one by one, the verdict rendered in large serif type
