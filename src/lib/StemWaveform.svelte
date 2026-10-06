<script>
  import { onMount, onDestroy } from 'svelte';

  let { url, color, audio } = $props();

  let container = $state(null);
  let wavesurfer = null;
  let destroyed = false;
  let mediaQuery = null;

  function getHeight(mql) {
    return mql.matches ? 50 : 30;
  }

  function handleBreakpointChange(event) {
    wavesurfer?.setOptions({ height: getHeight(event.target) });
  }

  onMount(async () => {
    const WaveSurfer = (await import('wavesurfer.js')).default;

    if (destroyed || !container) return;

    mediaQuery = window.matchMedia('(min-width: 768px)');

    wavesurfer = WaveSurfer.create({
      container,
      height: getHeight(mediaQuery),
      waveColor: color,
      progressColor: color,
      cursorColor: '#fff',
      barWidth: 3,
      barGap: 3,
      barRadius: 0,
      interact: true,
      normalize: true,
      media: audio,
    });

    mediaQuery.addEventListener('change', handleBreakpointChange);
  });

  onDestroy(() => {
    destroyed = true;
    mediaQuery?.removeEventListener('change', handleBreakpointChange);
    wavesurfer?.destroy();
    wavesurfer = null;
  });
</script>

<div
  bind:this={container}
  class="opacity-80"
></div>