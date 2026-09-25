npm run build     # build di produzione
npm run preview   # anteprima della build
```

## Struttura del progetto

``` 
src/
├── app.css                     # stili globali (fader, pulsanti, font)
├── app.html                    # template HTML
├── lib/
│   ├── AudioEngine.js          # motore audio: caricamento, play/pause, volumi, seek, loop A-B
│   ├── StemWaveform.svelte     # componente waveform di un singolo stem
│   ├── songs.js                # catalogo dei brani
│   ├── stores.js               # store Svelte (brano attivo, stato di riproduzione)
│   └── assets/                 # icone e immagini
└── routes/
    ├── +layout.svelte          # layout comune
    └── +page.svelte            # pagina principale con l'interfaccia del player
static/
└── songs/<nome-brano>/         # cover.jpg + vocals.mp3, drums.mp3, bass.mp3, other.mp3
```

## Come funziona

### Motore audio (`src/lib/AudioEngine.js`)

Per ogni brano vengono creati quattro elementi `<audio>`, uno per stem. Ognuno è collegato a un `AudioContext` tramite `createMediaElementSource` e passa da un `GainNode`, che regola il volume prima dell'uscita. Play, pausa, stop e seek vengono applicati a tutti gli stem insieme, così restano allineati.

Il loop A-B usa il primo stem come riferimento. A ogni evento `timeupdate`, se la posizione ha raggiunto il punto B, tutti gli stem tornano al punto A.

### Interfaccia (`src/routes/+page.svelte`)

La pagina contiene le waveform, la coda dei brani, i pulsanti di trasporto (play/pausa e loop) e i quattro fader. Ogni waveform (`StemWaveform.svelte`) riceve l'elemento `<audio>` dello stem, quindi wavesurfer usa lo stesso audio che sta suonando e cursore e progresso restano sincronizzati.

## Aggiungere un brano

1. Crea la cartella `static/songs/<nome-brano>/` con quattro file audio `vocals.mp3`, `drums.mp3`, `bass.mp3`, `other.mp3` e un'immagine `cover.jpg`. Gli stem si possono ottenere con un separatore di tracce come [Demucs](https://github.com/facebookresearch/demucs).
2. Aggiungi una voce in [`src/lib/songs.js`](src/lib/songs.js):

```js
{
  id: 'song-6',
  title: 'Titolo',
  artist: 'Artista',
  bpm: 120,
  image: '/songs/nome-brano/cover.jpg',
  stems: {
    vocals: '/songs/nome-brano/vocals.mp3',
    drums:  '/songs/nome-brano/drums.mp3',
    bass:   '/songs/nome-brano/bass.mp3',
    other:  '/songs/nome-brano/other.mp3',
  }
}
```
