<script>
  import { onMount, onDestroy } from 'svelte';

  let { url, color, audio } = $props();

  let container = $state(null);
  let wavesurfer = null;
  let destroyed = false;

  onMount(async () => {
    const WaveSurfer = (await import('wavesurfer.js')).default;

    if (destroyed || !container) return;

    wavesurfer = WaveSurfer.create({
      container,
      height: 80,
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
    wavesurfer?.destroy();
    wavesurfer = null;
  });
</script>

<div
  bind:this={container}
  class="absolute inset-0 opacity-60"
></div>