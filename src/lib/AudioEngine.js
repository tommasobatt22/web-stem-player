const stems = {};
let audioCtx = null;

// --- Stato del loop A-B ---
let loopStart = null;   // punto A (secondi)
let loopEnd = null;     // punto B (secondi)
let loopActive = false; // true quando A e B sono entrambi settati e il loop è attivo
let loopRafId = null;   // id del requestAnimationFrame che controlla il punto B

// --- Griglia ritmica del brano corrente ---
let songBpm = null;     // battiti al minuto (quarti)
let songOffset = 0;     // secondi del primo battito (downbeat) nel file

export function initAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

export async function loadSong(song) {
  if (!audioCtx) initAudioContext();

  // Reset del loop ogni volta che si cambia canzone
  clearLoop();

  // Griglia ritmica: bpm e offset del primo battito (definiti in songs.js)
  songBpm = Number(song.bpm) > 0 ? Number(song.bpm) : null;
  songOffset = Number(song.offset) || 0;

  // Distruggi i nodi precedenti correttamente
  Object.values(stems).forEach(s => {
    s.audio.pause();
    s.audio.src = '';          // forza il browser a liberare il file
    try { s.source.disconnect(); } catch(e) {}
    try { s.gainNode.disconnect(); } catch(e) {}
  });
  Object.keys(stems).forEach(k => delete stems[k]);

  // Piccola pausa per dare tempo al browser di liberare le risorse
  await new Promise(res => setTimeout(res, 100));

  const loadPromises = Object.entries(song.stems).map(([name, url]) => {
    return new Promise((res, rej) => {
      const audio = new Audio();
      audio.preload = 'auto';
      audio.crossOrigin = 'anonymous';

      const source = audioCtx.createMediaElementSource(audio);
      const gainNode = audioCtx.createGain();
      source.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      stems[name] = { audio, source, gainNode, muted: false };

      audio.addEventListener('canplay', res, { once: true });
      audio.addEventListener('error', (e) => rej(e), { once: true });

      // Assegna src DOPO aver creato i nodi
      audio.src = url;
      audio.load();
    });
  });

  await Promise.all(loadPromises);
}

export function play() {
  console.log('play() chiamato — stems:', Object.keys(stems));
  console.log('audioCtx state:', audioCtx?.state);

  if (audioCtx?.state === 'suspended') audioCtx.resume();

  Object.values(stems).forEach(s => {
    console.log('audio readyState:', s.audio.readyState, 'src:', s.audio.src);
    s.audio.play().catch(e => console.error('Errore play:', e));
  });
}

export function pause() {
  Object.values(stems).forEach(s => s.audio.pause());
}

export function stop() {
  Object.values(stems).forEach(s => {
    s.audio.pause();
    s.audio.currentTime = 0;
  });
}

export function setStemVolume(name, value) {
  if (!stems[name]) return;
  // 0-100 → 0.0-1.0, con curva logaritmica per sembrare più naturale
  stems[name].gainNode.gain.value = value / 100;
}

export function muteStem(name, muted) {
  if (!stems[name]) return;
  stems[name].audio.muted = muted;
  stems[name].muted = muted;
}

export function getDuration() {
  const first = Object.values(stems)[0];
  return first?.audio.duration ?? 0;
}

export function getPosition() {
  const first = Object.values(stems)[0];
  return first?.audio.currentTime ?? 0;
}

export function getStemAudio(name) {
  return stems[name]?.audio ?? null;
}

export function seekTo(time) {
  Object.values(stems).forEach(s => {
    s.audio.currentTime = time;
  });
}


// ---------------------------------------------------------------------------
// Loop A-B agganciato ai quarti
// ---------------------------------------------------------------------------

function getMasterAudio() {
  return Object.values(stems)[0]?.audio ?? null;
}

/** Durata di un quarto in secondi, o null se il brano non ha un BPM. */
export function getBeatDuration() {
  return songBpm ? 60 / songBpm : null;
}

/** Arrotonda un tempo al quarto più vicino della griglia del brano. */
function snapToBeat(time) {
  const beat = getBeatDuration();
  if (!beat) return time;
  const n = Math.round((time - songOffset) / beat);
  return Math.max(0, songOffset + n * beat);
}

/**
 * Controllo del punto B a ogni frame (~60 volte al secondo).
 * L'evento 'timeupdate' scatta solo ~4 volte al secondo e faceva sforare
 * il punto B fino a 250 ms: con un loop a tempo si sentiva subito.
 */
function startLoopWatcher() {
  stopLoopWatcher();
  const tick = () => {
    const master = getMasterAudio();
    if (loopActive && master && master.currentTime >= loopEnd) {
      // Riporta indietro di quanto abbiamo sforato, così il tempo resta in griglia
      const overshoot = master.currentTime - loopEnd;
      const length = loopEnd - loopStart;
      seekTo(loopStart + (overshoot < length ? overshoot : 0));
    }
    loopRafId = requestAnimationFrame(tick);
  };
  loopRafId = requestAnimationFrame(tick);
}

function stopLoopWatcher() {
  if (loopRafId !== null) cancelAnimationFrame(loopRafId);
  loopRafId = null;
}

/**
 * - 1° click: punto A = quarto più vicino al tempo corrente
 * - 2° click: punto B = A + un numero intero di quarti (almeno 1),
 *   arrotondato a quanto l'utente ha effettivamente ascoltato
 * - 3° click: disattiva il loop
 */
export function toggleLoopPoint() {
  const currentTime = getMasterAudio()?.currentTime ?? 0;

  if (loopActive) {
    clearLoop();
    return getLoopState();
  }

  if (loopStart === null) {
    loopStart = snapToBeat(currentTime);
    return getLoopState();
  }

  let start = loopStart;
  let end = currentTime;
  if (end < start) [start, end] = [snapToBeat(end), start];

  const beat = getBeatDuration();
  if (beat) {
    const beats = Math.max(1, Math.round((end - start) / beat));
    end = start + beats * beat;
  } else if (end - start < 0.1) {
    // Senza BPM non c'è griglia: evitiamo solo i loop di durata quasi nulla
    clearLoop();
    return getLoopState();
  }

  loopStart = start;
  loopEnd = Math.min(end, getDuration() || end);
  loopActive = true;
  startLoopWatcher();
  return getLoopState();
}

export function clearLoop() {
  stopLoopWatcher();
  loopStart = null;
  loopEnd = null;
  loopActive = false;
}

export function getLoopState() {
  const beat = getBeatDuration();
  return {
    loopStart,
    loopEnd,
    loopActive,
    pending: loopStart !== null && loopEnd === null && !loopActive,
    // numero di quarti del loop, utile da mostrare nella UI
    beats: loopActive && beat ? Math.round((loopEnd - loopStart) / beat) : null,
  };
}
