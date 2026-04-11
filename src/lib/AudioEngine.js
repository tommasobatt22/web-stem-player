const stems = {};
let audioCtx = null;

export function initAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
}

export async function loadSong(song) {
  if (!audioCtx) initAudioContext();

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