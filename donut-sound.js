/* DONUT OPS — synthetic lip-smacking effect (no sound assets or external requests) */
(function () {
  'use strict';

  const STORAGE_KEY = 'donutops-sound-enabled';
  let enabled = true;
  try { enabled = localStorage.getItem(STORAGE_KEY) !== 'false'; } catch (_) {}
  let context = null;
  let noiseBuffer = null;

  function audioContext() {
    if (!enabled) return null;
    const AudioEngine = window.AudioContext || window.webkitAudioContext;
    if (!AudioEngine) return null;

    try {
      if (!context) context = new AudioEngine();
      if (!noiseBuffer) {
        const sampleRate = context.sampleRate;
        noiseBuffer = context.createBuffer(1, Math.ceil(sampleRate * 0.5), sampleRate);
        const data = noiseBuffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) {
          data[i] = Math.random() * 2 - 1;
        }
      }
      if (context.state === 'suspended') {
        context.resume().catch(() => {});
      }
      return context;
    } catch (_) { return null; }
  }

  // Call synchronously from the player's button tap. iOS/Safari requires this.
  function unlock() { audioContext(); }

  function play() {
    if (!enabled) return;
    const ctx = audioContext();
    if (!ctx || !noiseBuffer) return;

    try {
      const master = ctx.createGain();
      master.gain.value = 0.24;
      master.connect(ctx.destination);

      [0, 0.17, 0.34].forEach((offset, index) => {
        const time = ctx.currentTime + 0.03 + offset;
        const length = index === 2 ? 0.12 : 0.09;
        const intensity = [0.7, 1, 0.65][index];

        // A soft wet click, shaped from filtered white noise.
        const noise = ctx.createBufferSource();
        noise.buffer = noiseBuffer;
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.Q.value = 0.9;
        filter.frequency.setValueAtTime(1550, time);
        filter.frequency.exponentialRampToValueAtTime(550, time + length);
        const envelope = ctx.createGain();
        envelope.gain.setValueAtTime(0.0001, time);
        envelope.gain.exponentialRampToValueAtTime(intensity, time + 0.007);
        envelope.gain.exponentialRampToValueAtTime(0.0001, time + length);
        noise.connect(filter);
        filter.connect(envelope);
        envelope.connect(master);
        noise.start(time);
        noise.stop(time + length + 0.004);

        // A small descending mouth-pop to make it sound like a smack.
        const pop = ctx.createOscillator();
        const popGain = ctx.createGain();
        pop.type = 'sine';
        pop.frequency.setValueAtTime(190, time);
        pop.frequency.exponentialRampToValueAtTime(85, time + 0.065);
        popGain.gain.setValueAtTime(0.0001, time);
        popGain.gain.exponentialRampToValueAtTime(0.34 * intensity, time + 0.006);
        popGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.07);
        pop.connect(popGain);
        popGain.connect(master);
        pop.start(time);
        pop.stop(time + 0.075);
      });
    } catch (error) { console.debug('DONUT OPS: sound unavailable', error); }
  }

  function renderButton() {
    const button = document.getElementById('soundBtn');
    if (!button) return;
    button.textContent = enabled ? '🔊 Geluid aan' : '🔇 Geluid uit';
    button.setAttribute('aria-pressed', String(enabled));
    button.setAttribute('aria-label', enabled ? 'Donutgeluid uitschakelen' : 'Donutgeluid inschakelen');
  }

  window.DonutSound = { unlock, play };

  const soundButton = document.getElementById('soundBtn');
  if (soundButton) {
    renderButton();
    soundButton.addEventListener('click', () => {
      enabled = !enabled;
      try { localStorage.setItem(STORAGE_KEY, String(enabled)); } catch (_) {}
      renderButton();
      if (enabled) { unlock(); play(); }
    });
  }
})();
