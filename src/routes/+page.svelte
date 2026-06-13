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
    vocals: "#FA7412",
    drums: "#5700BB",
    bass: "#00DB4D",
    other: "#575757",
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
    e.target.style.backgroundSize =
      ((currentVal - min) / (max - min)) * 100 + "% 100%";

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
      class="w-full bg-[#0a0a0a] h-32 md:h-64 rounded-lg flex flex-row items-center justify-between"
    >
      <div class="h-full w-64 p-2 hidden md:block">
        <div
          class="h-full w-full bg-cover bg-center rounded-lg flex items-end p-2"
          style="background-image: url({$activeSong?.image ?? ''});"
        >
          {#if $activeSong}
            <div>
              <div>
                <span class="p-2 bg-white text-black text-sm font-mono"
                  >{$activeSong.title}</span
                >
              </div>
              <div class="w-full">
                <span class="p-1 bg-white text-black text-xs font-mono truncate"
                  >{$activeSong.artist}</span
                >
              </div>
            </div>
          {/if}
        </div>
      </div>
      <!-- Waveform -->
      <div class="relative z-10 flex flex-col items-center flex-grow px-5">
        {#if $activeSong && !loading}
          <div class="w-full relative h-[80px] m-3">
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
      </div>
      <div
        class="bg-[#1E1E1E] bg-[radial-gradient(#D9D9D930_2px,#1E1E1E_1px)] bg-[size:20px_20px]
      h-full w-64 bg-center rounded-r-lg ms-5 md:block hidden"
      ></div>
    </div>

    <!-- Fader mixer -->
    <div
      class="flex justify-between mt-2 items-center h-auto md:h-80 flex-col md:flex-row"
    >
      <div class="w-full md:w-24 bg-black h-full rounded-lg overflow-hidden">
        <div class="text-center text-slate-300 pb-2">
          <span class="bitcount-single">Queue</span>
        </div>
        <div class="flex flex-row md:flex-col mb-2 md:mb-0 items-center gap-2 overflow-y-auto h-full scrollbar-hide md:pb-16">
          {#each songs as song}
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <div
              on:click={() => selectSong(song)}
              class="size-16 shrink-0 bg-center bg-cover"
              style="background-image:url('{song.image}');"
            ></div>
          {/each}
        </div>
      </div>
      <div class="flex gap-3 order-3 md:order-2 h-full flex-grow items-center justify-center mt-4 w-full md:w-auto">
        <div class="h-24 md:w-72 w-full flex justify-center rounded-lg overflow-hidden gap-1" id="button-container">
          <div class="w-1/3 h-full sound-button flex justify-center items-center" id="rec-button">
            <div class="size-6 rounded-full bg-red-500"></div>
          </div>
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div class="w-1/3 h-full sound-button flex justify-center items-center" id="pause-button" on:click={handlePause}>
            <div class="bg-center bg-cover size-8" style="background-image: url('/src/lib/assets/img/pause-icon.svg');"></div>
          </div>
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <div class="w-1/3 h-full sound-button flex justify-center items-center" id="play-button" on:click={handlePlay}>
          <div class="bg-center bg-cover size-8" style="background-image: url('/src/lib/assets/img/play-icon.svg');"></div>
          </div>
        </div>
      </div>

      <div
        class="flex items-center justify-around md:flex-row flex-col flex-wrap md:flex-nowrap w-full md:w-96 md:h-full rounded-xl p-2 order-2 md:order-3 mt-4"
        style="background-image: linear-gradient(135deg, #f8f8f8, #A8A8A8 150%);"
      >
        {#each stemList as name}
          <div class="flex flex-col items-center md:h-full w-1/4 py-2">
            <!-- Fader verticale -->
            <div class="flex justify-center items-center h-full mb-3">
              <div
                class="md:-rotate-90 bg-[#d9d9d934] rounded-full flex justify-center p-2 range-shadow"
              >
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
