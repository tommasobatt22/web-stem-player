import { writable } from 'svelte/store';

export const activeSong = writable(null);
export const isPlaying  = writable(false);
export const stemStates = writable({
  vocals: { volume: 0, muted: false },
  drums:  { volume: 0, muted: false },
  bass:   { volume: 0, muted: false },
  other:  { volume: 0, muted: false },
});