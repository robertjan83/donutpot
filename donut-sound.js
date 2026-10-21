/* DONUT OPS — cartoon voice recorded by the site owner */
(function () {
  'use strict';
  const STORAGE_KEY = 'donutops-sound-enabled';
  const SOUND_URL = './sounds/donut-cartoon.mp3';
  let enabled = true;
  try { enabled = localStorage.getItem(STORAGE_KEY) !== 'false'; } catch (_) {}

  let context = null;
  let soundBuffer = null;
  let loading = null;

  function getContext() {
    if (!enabled) return null;
    try {
      const AudioEngine = window.AudioContext || window.webkitAudioContext;
      if (!AudioEngine) return null;
      if (!context) context = new AudioEngine();
      return context;
    } catch (_) {
      return null;
    }
  }

  function loadSound() {
    if (soundBuffer) return Promise.resolve(soundBuffer);
    if (loading) return loading;
    const ctx = getContext();
    if (!ctx) return Promise.resolve(null);
    loading = fetch(SOUND_URL, {cache: 'force-cache'})
      .then(response => {
        if (!response.ok) throw new Error('Unable to load cartoon sound');
        return response.arrayBuffer();
      })
      .then(bytes => ctx.decodeAudioData(bytes))
      .then(decoded => { soundBuffer = decoded; return decoded; })
      .catch(error => {
        loading = null;
        console.warn('DONUT OPS: geluid kan niet worden geladen', error);
        return null;
      });
    return loading;
  }

  // Always called directly on the player's tap, before Firestore's async write.
  // This unlocks playback for iOS, Android, and installed PWAs.
  function unlock() {
    const ctx = getContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    loadSound();
  }

  function play() {
    if (!enabled) return;
    const ctx = getContext();
    if (!ctx) return;
    const playBuffer = buffer => {
      if (!enabled || !buffer) return;
      try {
        const voice = ctx.createBufferSource();
        voice.buffer = buffer;
        const volume = ctx.createGain();
        volume.gain.value = 0.82;
        voice.connect(volume);
        volume.connect(ctx.destination);
        voice.start(0);
      } catch (error) {
        console.warn('DONUT OPS: afspelen is niet gelukt', error);
      }
    };
    if (soundBuffer) playBuffer(soundBuffer);
    else loadSound().then(playBuffer);
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
      if (enabled) {
        unlock();
        play();
      }
    });
  }
  if (enabled) loadSound();
})();
