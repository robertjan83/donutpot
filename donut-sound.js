/* DONUT OPS — rotation of the original donut clip plus three cartoon voice recordings */
(function () {
  'use strict';

  const ENABLED_KEY = 'donutops-sound-enabled';
  const INDEX_KEY = 'donutops-sound-next-index';
  const VOICE_URL = './sounds/donut-voices.mp3';
  const ORIGINAL_URL = './sounds/donut-cartoon.mp3';

  const tracks = [
    { name: 'DONUT!', url: ORIGINAL_URL, offset: 0, duration: null },
    { name: 'D-d-d-donut', url: VOICE_URL, offset: 0, duration: 1.8733 },
    { name: 'Jij hebt een donut', url: VOICE_URL, offset: 2.1233, duration: 1.9307 },
    { name: 'Donizzle my shizzle', url: VOICE_URL, offset: 4.304, duration: 2.1565 }
  ];

  let enabled = true;
  let nextIndex = 0;
  try {
    enabled = localStorage.getItem(ENABLED_KEY) !== 'false';
    const remembered = Number(localStorage.getItem(INDEX_KEY));
    if (Number.isInteger(remembered) && remembered >= 0)
      nextIndex = remembered % tracks.length;
  } catch (_) {}

  let context = null;
  const buffers = new Map();
  const inFlight = new Map();

  function getContext() {
    if (!enabled) return null;
    try {
      const Engine = window.AudioContext || window.webkitAudioContext;
      if (!Engine) return null;
      if (!context) context = new Engine();
      return context;
    } catch (_) {
      return null;
    }
  }

  function loadAudio(url) {
    const ctx = getContext();
    if (!ctx) return Promise.resolve(null);
    if (buffers.has(url)) return Promise.resolve(buffers.get(url));
    if (inFlight.has(url)) return inFlight.get(url);

    const request = fetch(url, { cache: 'force-cache' })
      .then(response => {
        if (!response.ok) throw new Error('Geluid ontbreekt: ' + url);
        return response.arrayBuffer();
      })
      .then(bytes => ctx.decodeAudioData(bytes))
      .then(decoded => {
        buffers.set(url, decoded);
        inFlight.delete(url);
        return decoded;
      })
      .catch(err => {
        inFlight.delete(url);
        console.warn('DONUT OPS geluid niet beschikbaar', err);
        return null;
      });
    inFlight.set(url, request);
    return request;
  }

  // Must run directly on the tap before the asynchronous Firebase write.
  function unlock() {
    const ctx = getContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    loadAudio(ORIGINAL_URL);
    loadAudio(VOICE_URL);
  }

  function playTrack(track, advance) {
    if (!enabled) return;
    const ctx = getContext();
    if (!ctx) return;
    loadAudio(track.url).then(async buffer => {
      // If a newer asset could not be loaded, at least play the original clip.
      if (!buffer && track.url !== ORIGINAL_URL) {
        buffer = await loadAudio(ORIGINAL_URL);
        track = tracks[0];
      }
      if (!enabled || !buffer) return;
      try {
        const source = ctx.createBufferSource();
        const volume = ctx.createGain();
        volume.gain.value = 0.82;
        source.buffer = buffer;
        source.connect(volume);
        volume.connect(ctx.destination);
        const offset = Math.min(track.offset, Math.max(0, buffer.duration - 0.02));
        if (track.duration != null) {
          const duration = Math.min(track.duration, buffer.duration - offset);
          if (duration <= 0) return;
          source.start(0, offset, duration);
        } else {
          source.start(0);
        }
        if (advance) {
          nextIndex = (nextIndex + 1) % tracks.length;
          try { localStorage.setItem(INDEX_KEY, String(nextIndex)); } catch (_) {}
        }
      } catch (err) {
        console.warn('DONUT OPS: afspelen niet gelukt', err);
      }
    });
  }

  // One step of the rotation for each successfully registered donut.
  function play() { playTrack(tracks[nextIndex], true); }

  function renderButton() {
    const btn = document.getElementById('soundBtn');
    if (!btn) return;
    btn.textContent = enabled ? '🔊 Geluid aan' : '🔇 Geluid uit';
    btn.setAttribute('aria-pressed', String(enabled));
    btn.setAttribute('aria-label', enabled ? 'Donutgeluid uitschakelen' : 'Donutgeluid inschakelen');
  }

  window.DonutSound = { unlock, play };

  const soundButton = document.getElementById('soundBtn');
  if (soundButton) {
    renderButton();
    soundButton.addEventListener('click', () => {
      enabled = !enabled;
      try { localStorage.setItem(ENABLED_KEY, String(enabled)); } catch (_) {}
      renderButton();
      if (enabled) {
        unlock();
        // A small preview of the next voice, without advancing the rotation.
        playTrack(tracks[nextIndex], false);
      }
    });
  }

  // Preload both small audio files; no sound plays automatically on page load.
  if (enabled) {
    loadAudio(ORIGINAL_URL);
    loadAudio(VOICE_URL);
  }
})();
