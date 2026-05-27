<script>
  import { songs } from "$lib/songs.js";
  import {
    loadSong,
    play,
    pause,
    stop,
    setStemVolume,
    muteStem,
    initAudioContext,
    seekTo,
    getDuration, 
  } from "$lib/AudioEngine.js";
  import { activeSong, isPlaying } from "$lib/stores.js";
  import StemWaveform from "$lib/StemWaveform.svelte";
  import { getStemAudio } from "$lib/AudioEngine.js";

  const stemList = ["vocals", "drums", "bass", "other"];
  const stemLabels = {
    vocals: { label: "Vocals" },
    drums: { label: "Drums" },
    bass: { label: "Bass" },
    other: { label: "Other" },
  };

  let volumes = { vocals: 50, drums: 50, bass: 50, other: 50 };
  let mutes = { vocals: false, drums: false, bass: false, other: false };
  let loading = false;

    const stemColors = {
        vocals: '#ff3c6e',
        drums:  '#357DED',
        bass:   '#0DAB76',
        other:  '#ffaa00',
    };

    const rangeBackgrounds = {
    vocals: "linear-gradient(to right, #F2CFBA, #FA7412)",
    drums: "linear-gradient(to right, #ECDBFF, #5700BB)",
    bass: "linear-gradient(to right, #EBFFF2, #00DB4D)",
    other: "linear-gradient(to right, #ededed, #575757)",
  };

  let stemAudios = {};

  async function selectSong(song) {
    initAudioContext();
    loading = true;
    await loadSong(song);
    // Recupera gli HTMLAudioElement dopo il caricamento
    stemAudios = {
      vocals: getStemAudio("vocals"),
      drums: getStemAudio("drums"),
      bass: getStemAudio("bass"),
      other: getStemAudio("other"),
    };
    activeSong.set(song);
    loading = false;
  }

  function handleVolume(name, e) {
    
    const min = e.target.min;
    const max = e.target.max;
    const currentVal = e.target.value;
    e.target.style.backgroundSize = ((currentVal - min) / (max - min)) * 100 + "% 100%";
    
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
  function handlePause() {
    pause();
    isPlaying.set(false);
  }
  function handleStop() {
    stop();
    isPlaying.set(false);
  }

</script>

<div class="flex h-svh flex-col justify-center items-center">
  <div
    class="w-[90%] md:w-4/5 rounded-lg p-3 border border-slate-300 bg-[#D6D6D6]"
    style="box-shadow: 0 20px 25px -5px rgb(100 116 139 / 0.2), 0 8px 10px -6px rgb(100 116 139 / 0.2), inset 0 0 30px 5px rgb(255 255 255 / 0.4);"
  >
    <div
      class="w-full bg-[#0a0a0a] h-64 rounded-lg flex flex-row items-center justify-between"
    >
      <div class="h-full w-64 p-2">
        <div class="h-full w-full bg-cover bg-center rounded-lg flex items-end p-2"
          style="background-image: url('/src/lib/assets/img/asap.png');"
        >
        {#if $activeSong}
        <div>
          <div>
            <span class="p-2 bg-white text-black text-sm font-mono">{$activeSong.title}</span>
          </div>
          <div class="w-full">
            <span class="p-1 bg-white text-black text-xs font-mono truncate">{$activeSong.artist}</span>
          </div>
        </div>
        {/if}
          
        </div>
      </div>
      <!-- Waveform / song selector -->
      <div class="relative z-10 flex flex-col items-center flex-grow">
        <div>
          {#if loading}
            <p class="text-white/40 text-sm font-mono">Loading...</p>
          {:else if $activeSong}
            <p class="text-white/60 text-sm font-mono">
              {$activeSong.title} - {$activeSong.artist}
            </p>
          {:else}
            <p class="text-white/30 text-sm font-mono">Choose a song...</p>
          {/if}
        </div>
        {#if $activeSong && !loading}
          <div class="w-full relative h-[80px] py-3">
            {#each stemList as name, i}
              <StemWaveform
                url={$activeSong.stems[name]}
                color={stemColors[name]}
                audio={stemAudios[name]}
                onSeek={seekTo}
                interactive={i === stemList.length - 1}
              />
            {/each}
            <div
              class="absolute inset-0 z-10 cursor-pointer"
              on:click={handleSeek}
            ></div>
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
      <!-- <div
        class="bg-[#1E1E1E] bg-[radial-gradient(#D9D9D930_2px,#1E1E1E_1px)] bg-[size:20px_20px]
      h-full w-64 bg-center rounded-r-lg ms-5"
      ></div> -->
    </div>

    <!-- Fader mixer -->
    <div class="flex justify-between mt-2 items-center h-80  ">
      <div class="w-24 bg-black h-full rounded-lg flex flex-row md:flex-col">

      </div>
      <div>
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
      <div class="flex items-center justify-around flex-row flex-wrap md:flex-nowrap w-96 h-full rounded-xl p-5"
      style="background-image: linear-gradient(135deg, #f8f8f8, #A8A8A8 150%);">
        {#each stemList as name}
          <div class="flex flex-col items-center h-full w-1/4">
            <!-- Fader verticale -->
            <div class="flex justify-center items-center h-full mb-3">
              <div class="md:-rotate-90 bg-[#d9d9d934] rounded-full flex justify-center p-2 range-shadow ">
                <input
                type="range"
                min="0" 
                max="100"
                value={volumes[name]}
                id="stem-{name}"
                name="stem-{name}"
                on:input={(e) => handleVolume(name, e)}
                style="background-image:{rangeBackgrounds[name]}"
                class="custom-range"
                disabled={!$activeSong || loading}
                />
              </div>
            </div>

            <!-- Label -->
            <span class="text-sm text-slate-500 font-medium bitcount-single">
              {stemLabels[name].label}
            </span>
          </div>
        {/each}
      </div>
    </div>

    <!-- Transport controls -->
  </div>
</div>