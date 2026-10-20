<script>
  import { onMount, onDestroy } from 'svelte';

  let { url, color, audio } = $props();

  let container = $state(null);
  let wavesurfer = null;
  let destroyed = false;

  const mediaQuery = typeof window !== 'undefined' ? window.matchMedia('(min-width: 768px)') : null;
  const getHeight = () => (mediaQuery?.matches ? 50 : 40);

  let height = $state(getHeight());

  const handleBreakpointChange = () => {
    height = getHeight();
    wavesurfer?.setOptions({ height });
  };


  onMount(async () => {
    mediaQuery?.addEventListener('change', handleBreakpointChange);

    const WaveSurfer = (await import('wavesurfer.js')).default;

    if (destroyed || !container) return;

    wavesurfer = WaveSurfer.create({
      container,
      height,
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
  style="height: {height}px"
></div>