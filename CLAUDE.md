# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install
npm run dev       # vite dev server
npm run build     # production build (adapter-auto)
npm run preview   # serve the production build
```

There is no test runner, linter or formatter configured. `npm install` runs `svelte-kit sync` (the `prepare` script), which generates `.svelte-kit/tsconfig.json` that `jsconfig.json` extends.

## What this is

A single-page SvelteKit app (Svelte 5, Tailwind 3 + daisyUI, plain JS, no TypeScript) that plays a song split into four stems (vocals, drums, bass, other) with an independent volume fader per stem, a waveform per stem, and an A-B loop. There is one route (`src/routes/+page.svelte`) and no backend: audio is served as static files.

## Architecture

**Audio engine is a module-level singleton** (`src/lib/AudioEngine.js`). It keeps its state (`stems`, `audioCtx`, loop points) in module variables and exposes plain functions; the UI never holds engine objects except the `HTMLAudioElement`s it asks for.
- Each stem is `HTMLAudioElement → MediaElementAudioSourceNode → GainNode → audioCtx.destination`. Stems are kept in sync only by calling `play()`/`pause()`/`currentTime = x` on every element, not by a shared clock, so drift is possible.
- The first stem in `song.stems` is the "master": `getDuration()`, `getPosition()` and the loop watcher all read from it.
- `loadSong()` tears down the previous stems (pause, blank `src`, disconnect nodes), waits 100 ms, then creates new elements and resolves when all fire `canplay`. It also calls `clearLoop()`.
- A-B loop: `toggleLoopPoint()` cycles set A → set B (activates, swaps if B < A, rejects < 0.1 s) → clear. Looping is enforced by a `timeupdate` listener on the master element that calls `seekTo(loopStart)`, so it is only as precise as the browser's `timeupdate` rate. The listener is re-attached in `loadSong()`; the `page` re-reads `getLoopState()` after each toggle to update the UI.
- `AudioContext` must be created/resumed from a user gesture, which is why `initAudioContext()` is called at the start of `selectSong` and `handlePlay`.

**UI** (`src/routes/+page.svelte`) drives the engine and mirrors what it needs into local state (`volumes`, `loopState`, `stemAudios`) and the stores in `src/lib/stores.js` (`activeSong`, `isPlaying`). The waveform loop overlay and A/B labels are absolutely-positioned divs computed from `loopState / getDuration()` in percent.

**Waveforms** (`src/lib/StemWaveform.svelte`) create one wavesurfer.js instance per stem with `media: audio`, i.e. wavesurfer wraps the same `HTMLAudioElement` the engine plays (it reads the waveform from that element's `src`). It is dynamically imported in `onMount`. Seeking is done by a transparent overlay `div` in `+page.svelte` (`handleSeek`) that sits above the stacked waveforms and calls `seekTo` on all stems; `wavesurfer` is not the source of truth for position.

**Songs** live in `src/lib/songs.js` (array of `{id, title, artist, image, stems}`) with assets committed under `static/songs/<slug>/{vocals,drums,bass,other}.mp3` and `cover.jpg`. Adding a song means adding a folder there plus an entry in `songs.js`. The four stem names are hard-coded in `+page.svelte` (`stemList`, `stemColors`, `rangeBackgrounds`, `stemAudios`), so a song with different stem names needs changes there too.

## Things that look wired up but aren't (verify before relying on them)

- `tone` is a dependency but is not imported anywhere.
- `muteStem()` exists in the engine and is imported in the page, but no UI calls it; the `mutes` object in the page and the `stemStates` store are unused. The record button (`#rec-button`) is decorative.
- `song.bpm`, and the `interactive` / `onSeek` props passed to `StemWaveform`, are not consumed (the component only reads `url`, `color`, `audio`, and `url` is not passed on to wavesurfer).
- `setStemVolume()` maps 0-100 linearly to gain 0-1 (the comment mentioning a log curve is stale). Sliders render at 50 but the gain nodes start at 1.0 until the user moves a slider.
- Play/pause icons are referenced as `url('/src/lib/assets/img/...svg')` in inline styles, a dev-server path that will not resolve after `vite build`; import the SVGs instead if touching that.

## Conventions

- Mixed Svelte syntax: `+page.svelte` uses legacy syntax (`let`, `$:`, `on:click`), while `+layout.svelte` and `StemWaveform.svelte` use runes (`$props`, `$state`). Follow the style of the file you are editing.
- Code comments and some UI strings (loop tooltips) are in Italian; other UI labels are English.
- Styling is mostly Tailwind utilities inline, plus custom classes in `src/app.css` (`.bitcount-single`, `.range-shadow`, `.scrollbar-hide`, `.sound-button`, `#button-container`, range-thumb styles). The `custom-range` class used on the faders has no rule of its own in `app.css`. Fonts (Inconsolata, Bitcount Single) are loaded from Google Fonts in `src/app.html`. Stem colors are hex values duplicated in `+page.svelte` and `StemWaveform` callers.
- Layout is responsive: on mobile the transport controls are positioned `absolute ... bottom-0` and reordered with `order-*`; check both breakpoints (`md:`) when changing the mixer section.
