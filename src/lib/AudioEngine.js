const stems = {};
let audioCtx = null;

// --- Stato del loop A-B ---
let loopStart = null;   // punto A (secondi)
let loopEnd = null;     // punto B (secondi)
let loopActive = false; // true quando A e B sono entrambi settati e il loop è attivo
let loopTimeUpdateHandler = null; // riferimento all'handler attaccato all'audio "master"

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

  // Riattacca il listener di loop sul nuovo stem "master"
  attachLoopWatcher();
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
// Loop A-B
// ---------------------------------------------------------------------------

/**
 * Trova lo stem "master" (il primo disponibile) che usiamo come riferimento
 * per leggere currentTime e per ascoltare l'evento 'timeupdate'.
 */
function getMasterAudio() {
  return Object.values(stems)[0]?.audio ?? null;
}

/**
 * Attacca (o ri-attacca) il listener 'timeupdate' che controlla se siamo
 * arrivati al punto B del loop, e in caso affermativo riporta tutti gli
 * stem al punto A.
 */
function attachLoopWatcher() {
  const master = getMasterAudio();
  if (!master) return;

  if (loopTimeUpdateHandler) {
    master.removeEventListener('timeupdate', loopTimeUpdateHandler);
  }

  loopTimeUpdateHandler = () => {
    if (!loopActive || loopStart === null || loopEnd === null) return;
    if (master.currentTime >= loopEnd) {
      seekTo(loopStart);
    }
  };

  master.addEventListener('timeupdate', loopTimeUpdateHandler);
}

/**
 * Da chiamare quando l'utente preme il bottone di loop.
 * - 1° click (nessun punto settato): marca il punto A = currentTime
 * - 2° click (solo A settato): marca il punto B = currentTime e attiva il loop
 *   (se B < A, i due valori vengono scambiati automaticamente)
 * - 3° click (loop attivo): disattiva e resetta il loop
 *
 * Ritorna lo stato corrente del loop, utile per aggiornare la UI.
 */
export function toggleLoopPoint() {
  const master = getMasterAudio();
  const currentTime = master?.currentTime ?? 0;

  if (loopActive) {
    // Era già attivo → l'utente vuole disattivarlo
    clearLoop();
    return getLoopState();
  }

  if (loopStart === null) {
    // Primo click: imposta il punto A
    loopStart = currentTime;
  } else {
    // Secondo click: imposta il punto B e attiva il loop
    loopEnd = currentTime;

    if (loopEnd < loopStart) {
      [loopStart, loopEnd] = [loopEnd, loopStart];
    }

    // Evita un loop di durata nulla (o quasi)
    if (loopEnd - loopStart < 0.1) {
      clearLoop();
      return getLoopState();
    }

    loopActive = true;
    attachLoopWatcher();
  }

  return getLoopState();
}

/** Resetta completamente il loop (punti e stato attivo). */
export function clearLoop() {
  loopStart = null;
  loopEnd = null;
  loopActive = false;
}

/** Stato corrente del loop, utile per la UI. */
export function getLoopState() {
  return {
    loopStart,
    loopEnd,
    loopActive,
    // 'pending' = il punto A è stato settato ma manca il punto B
    pending: loopStart !== null && loopEnd === null && !loopActive,
  };
}