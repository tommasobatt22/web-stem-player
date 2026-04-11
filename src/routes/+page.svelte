
<script>
    import { songs } from '$lib/songs.js';
    import { loadSong, play, pause, stop, setStemVolume, muteStem, initAudioContext, seekTo, getDuration } from '$lib/AudioEngine.js';
    import { activeSong, isPlaying } from '$lib/stores.js';
    import StemWaveform from '$lib/StemWaveform.svelte';
    import { getStemAudio } from '$lib/AudioEngine.js';

    const stemList = ['vocals', 'drums', 'bass', 'other'];
    const stemLabels = {
        vocals: { label: 'Vocals'},
        drums:  { label: 'Drums' },
        bass:   { label: 'Bass'  },
        other:  { label: 'Other' },
    };

    let volumes = { vocals: 50, drums: 50, bass: 50, other: 50 };
    let mutes   = { vocals: false, drums: false, bass: false, other: false };
    let loading = false;

    const stemColors = {
        vocals: '#ff3c6e',
        drums:  '#357DED',
        bass:   '#0DAB76',
        other:  '#ffaa00',
    };

    let stemAudios = {};

    async function selectSong(song) {
    initAudioContext();
    loading = true;
    await loadSong(song);
    // Recupera gli HTMLAudioElement dopo il caricamento
    stemAudios = {
      vocals: getStemAudio('vocals'),
      drums:  getStemAudio('drums'),
      bass:   getStemAudio('bass'),
      other:  getStemAudio('other'),
    };
    activeSong.set(song);
    loading = false;
  }

    function handleVolume(name, e) {
    const val = Number(e.target.value);
    volumes[name] = val;
    setStemVolume(name, val);
    }

    function handleSeek(e) {
        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const progress = clickX / rect.width;
        const duration = getDuration();
        if (duration) seekTo(progress * duration);
    }
    function handlePlay() { 
        initAudioContext();
        play();  
        isPlaying.set(true);  
    }
    function handlePause() { pause(); isPlaying.set(false); }
    function handleStop()  { stop();  isPlaying.set(false); }
</script>

<div class="flex h-svh flex-col justify-center items-center">
  <div class="w-[90%] md:w-2/5 bg-[#e9e9e9] rounded-lg p-5 shadow-xl shadow-slate-500/20">

    <!-- Waveform / song selector -->
    <div class="w-full bg-[#0a0a0a] h-48 rounded-lg flex flex-col items-center justify-center px-5 gap-3">

        <div class="relative z-10 flex flex-col items-center gap-3 w-full">
            {#if loading}
            <p class="text-white/40 text-sm font-mono">Loading...</p>
            {:else if $activeSong}
            <p class="text-white/60 text-sm font-mono">{$activeSong.title} - {$activeSong.artist}</p>
            {:else}
            <p class="text-white/30 text-sm font-mono">Choose a song...</p>
            {/if}
            {#if $activeSong && !loading}
            <div class="w-full relative h-[80px]">
                {#each stemList as name, i}
                <StemWaveform
                    url={$activeSong.stems[name]}
                    color={stemColors[name]}
                    audio={stemAudios[name]}
                    onSeek={seekTo}
                    interactive={i === stemList.length - 1}
                />
                {/each}
                <div class="absolute inset-0 z-10 cursor-pointer" on:click={handleSeek}></div>
            </div>
            
            {/if}
            <div class="flex gap-2 flex-wrap justify-center">
                {#each songs as song}
                <button
                    on:click={() => selectSong(song)}
                    class="px-3 py-1 rounded text-xs transition-all
                    {$activeSong?.id === song.id
                        ? 'bg-violet-500 text-white'
                        : 'bg-white/10 text-white/40 hover:bg-white/20'}"
                >
                    {song.title}
                </button>
                {/each}
            </div>
        </div>
    </div>

    <!-- Fader mixer -->
    <div class="mt-5 flex items-center justify-around w-full flex-row min-h-64 flex-wrap md:flex-nowrap">
      {#each stemList as name}
        <div class="flex flex-col items-center mb-5">

          <!-- Fader verticale -->
          <div class="flex justify-center items-center h-32 mb-3">
            <input
              type="range"
              min="0" max="100" value={volumes[name]}
              id="stem-{name}"
              name="stem-{name}"
              on:input={(e) => handleVolume(name, e)}
              style="--stem-color:{stemColors[name]}"
              class="-rotate-90 w-24"
              disabled={!$activeSong || loading}
            />
          </div>
    
          <!-- Label -->
          <span class="text-xs text-slate-500 font-medium">
            {stemLabels[name].label}
          </span>

        </div>
      {/each}
    </div>

    <!-- Transport controls -->
    <div class="flex justify-center gap-3 pb-2">

      {#if $isPlaying}
        <button
          on:click={handlePause}
          disabled={!$activeSong || loading}
          class="px-4 py-2 rounded-lg bg-violet-500 text-white text-sm font-semibold hover:bg-violet-600 disabled:opacity-30"
        >
          ■ Pause
        </button>
      {:else}
        <button
          on:click={handlePlay}
          disabled={!$activeSong || loading}
          class="px-4 py-2 rounded-lg bg-violet-500 text-white text-sm font-semibold hover:bg-violet-600 disabled:opacity-30"
        >
          ▶ Play
        </button>
      {/if}
    </div>

  </div>
</div>

