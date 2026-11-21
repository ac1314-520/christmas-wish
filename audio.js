/* =========================================================
   星愿圣诞夜 · Generative soundtrack
   A tiny, original music box made of Web Audio oscillators.
   No audio files, no dependencies, no autoplay.
   ========================================================= */
(function () {
  'use strict';

  const AC = window.AudioContext || window.webkitAudioContext;

  // Cmaj9 / Am9 / Fmaj9 / G6/9 — a warm, unresolved winter loop.
  const CHORDS = [
    { bass: 65.41, notes: [130.81, 196.00, 329.63, 493.88, 587.33] },
    { bass: 55.00, notes: [110.00, 164.81, 261.63, 392.00, 493.88] },
    { bass: 43.65, notes: [87.31, 130.81, 220.00, 329.63, 392.00] },
    { bass: 49.00, notes: [98.00, 146.83, 246.94, 329.63, 440.00] }
  ];

  const PENTATONIC = [523.25, 587.33, 659.25, 783.99, 880.00, 1046.50, 1174.66, 1318.51];
  const MOTIF = [0, 2, 4, 3, 5, 4, 2, 1, 3, 5, 6, 4];
  const BAR = 8.4;

  class ChristmasAudio {
    constructor() {
      this.ctx = null;
      this.enabled = false;
      this.timer = null;
      this.suspendTimer = null;
      this.nextChord = 0;
      this.nextBell = 0;
      this.chordStep = 0;
      this.bellStep = 0;
      this.master = null;
      this.dryBus = null;
      this.reverbIn = null;
      this.convolver = null;
      this.noiseBuffer = null;
      this.startedAt = 0;
    }

    get supported() {
      return Boolean(AC);
    }

    /** Lazily build the graph — required to happen inside a user gesture. */
    build() {
      if (!AC) throw new Error('Web Audio is not supported');
      if (this.ctx) return;

      const ctx = new AC();
      this.ctx = ctx;

      this.master = ctx.createGain();
      this.master.gain.value = 0.0001;

      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -20;
      compressor.knee.value = 24;
      compressor.ratio.value = 3;
      compressor.attack.value = 0.006;
      compressor.release.value = 0.45;
      this.master.connect(compressor);
      compressor.connect(ctx.destination);

      this.dryBus = ctx.createGain();
      this.dryBus.gain.value = 0.86;
      this.dryBus.connect(this.master);

      this.reverbIn = ctx.createGain();
      this.reverbIn.gain.value = 0.68;
      this.convolver = ctx.createConvolver();
      this.convolver.buffer = this.makeImpulse(3.2, 2.4);
      const wet = ctx.createGain();
      wet.gain.value = 0.34;
      this.reverbIn.connect(this.convolver);
      this.convolver.connect(wet);
      wet.connect(this.master);

      this.noiseBuffer = this.makeNoise(2.2);
    }

    makeImpulse(seconds, decay) {
      const ctx = this.ctx;
      const sampleRate = ctx.sampleRate;
      const length = Math.floor(sampleRate * seconds);
      const impulse = ctx.createBuffer(2, length, sampleRate);
      for (let channel = 0; channel < 2; channel++) {
        const data = impulse.getChannelData(channel);
        for (let i = 0; i < length; i++) {
          // Sparse early reflections dissolve into a soft cathedral tail.
          const t = i / length;
          const early = i < sampleRate * 0.08 ? 1 : 0.6;
          data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay) * early;
        }
      }
      return impulse;
    }

    makeNoise(seconds) {
      const ctx = this.ctx;
      const length = Math.max(1, Math.floor(ctx.sampleRate * seconds));
      const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let last = 0;
      for (let i = 0; i < length; i++) {
        const white = Math.random() * 2 - 1;
        last = 0.92 * last + 0.08 * white;
        data[i] = last + white * 0.18;
      }
      return buffer;
    }

    async enable() {
      try {
        if (!this.ctx) this.build();
        const ctx = this.ctx;
        if (ctx.state === 'suspended') await ctx.resume();
        clearTimeout(this.suspendTimer);
        this.suspendTimer = null;

        const now = ctx.currentTime;
        this.master.gain.cancelScheduledValues(now);
        this.master.gain.setValueAtTime(Math.max(0.0001, this.master.gain.value), now);
        this.master.gain.exponentialRampToValueAtTime(0.72, now + 1.4);

        this.enabled = true;
        this.chordStep = 0;
        this.bellStep = 0;
        this.nextChord = now + 0.18;
        this.nextBell = now + 1.1;
        this.startedAt = now;

        clearInterval(this.timer);
        this.schedule();
        this.timer = window.setInterval(() => this.schedule(), 260);
        return true;
      } catch (error) {
        console.warn('[Noël] Audio could not start:', error);
        this.enabled = false;
        return false;
      }
    }

    disable() {
      this.enabled = false;
      clearInterval(this.timer);
      this.timer = null;
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setTargetAtTime(0.0001, now, 0.18);
      clearTimeout(this.suspendTimer);
      this.suspendTimer = window.setTimeout(() => {
        if (!this.enabled && this.ctx && this.ctx.state === 'running') {
          this.ctx.suspend().catch(() => {});
        }
      }, 950);
    }

    schedule() {
      if (!this.enabled || !this.ctx) return;
      const now = this.ctx.currentTime;
      const lookahead = now + 1.2;

      while (this.nextChord < lookahead) {
        this.playChord(this.nextChord, this.chordStep);
        this.nextChord += BAR;
        this.chordStep = (this.chordStep + 1) % CHORDS.length;
      }

      while (this.nextBell < lookahead) {
        // Airy little bells, never mechanical.
        if (Math.random() < 0.77) {
          const noteIndex = MOTIF[this.bellStep % MOTIF.length];
          const octaveLift = Math.random() < 0.2 ? 2 : (Math.random() < 0.44 ? 1 : 0);
          const freq = PENTATONIC[(noteIndex + octaveLift) % PENTATONIC.length];
          this.playBell(freq, this.nextBell, 0.034 + Math.random() * 0.012, (Math.random() - 0.5) * 0.9);
          if (Math.random() < 0.2) {
            this.playBell(freq * 2, this.nextBell + 0.09, 0.009, (Math.random() - 0.5) * 0.5);
          }
        }
        this.bellStep += 1;
        this.nextBell += 0.72 + Math.random() * 1.18;
      }
    }

    playChord(time, index) {
      const ctx = this.ctx;
      const chord = CHORDS[index];
      const duration = BAR + 1.8;
      const out = ctx.createGain();
      out.gain.setValueAtTime(0.0001, time);
      out.gain.exponentialRampToValueAtTime(0.058, time + 2.7);
      out.gain.setValueAtTime(0.058, time + duration * 0.56);
      out.gain.exponentialRampToValueAtTime(0.0001, time + duration);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(760, time);
      filter.frequency.linearRampToValueAtTime(1120, time + duration * 0.48);
      filter.frequency.linearRampToValueAtTime(620, time + duration);
      filter.Q.value = 0.45;

      out.connect(filter);
      filter.connect(this.dryBus);
      filter.connect(this.reverbIn);

      const bass = ctx.createOscillator();
      bass.type = 'sine';
      bass.frequency.value = chord.bass;
      const bassGain = ctx.createGain();
      bassGain.gain.value = 0.34;
      bass.connect(bassGain);
      bassGain.connect(out);

      chord.notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        osc.type = i % 3 === 0 ? 'triangle' : 'sine';
        osc.frequency.value = freq;
        osc.detune.value = (i % 2 === 0 ? 1 : -1) * (2 + Math.random() * 4);

        const voice = ctx.createGain();
        voice.gain.value = i === 0 ? 0.3 : (0.22 - i * 0.018);

        const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
        if (pan) {
          pan.pan.value = (i - 2) * 0.17;
          osc.connect(voice);
          voice.connect(pan);
          pan.connect(out);
        } else {
          osc.connect(voice);
          voice.connect(out);
        }

        osc.start(time);
        osc.stop(time + duration + 0.05);
        osc.onended = () => {
          try { osc.disconnect(); voice.disconnect(); if (pan) pan.disconnect(); } catch (_) {}
        };
      });

      bass.start(time);
      bass.stop(time + duration + 0.05);
      bass.onended = () => {
        try { bass.disconnect(); bassGain.disconnect(); out.disconnect(); filter.disconnect(); } catch (_) {}
      };
    }

    playBell(freq, time, volume, panValue) {
      if (!this.ctx) return;
      const ctx = this.ctx;
      const out = ctx.createGain();
      out.gain.setValueAtTime(0.0001, time);
      out.gain.exponentialRampToValueAtTime(volume, time + 0.012);
      out.gain.exponentialRampToValueAtTime(0.0001, time + 2.6);

      const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      if (pan) {
        pan.pan.value = panValue || 0;
        out.connect(pan);
        pan.connect(this.dryBus);
        pan.connect(this.reverbIn);
      } else {
        out.connect(this.dryBus);
        out.connect(this.reverbIn);
      }

      const partials = [
        { ratio: 1, gain: 0.78, type: 'sine' },
        { ratio: 2.002, gain: 0.14, type: 'sine' },
        { ratio: 3.01, gain: 0.06, type: 'triangle' }
      ];

      partials.forEach((part) => {
        const osc = ctx.createOscillator();
        osc.type = part.type;
        osc.frequency.value = freq * part.ratio;
        const voice = ctx.createGain();
        voice.gain.value = part.gain;
        osc.connect(voice);
        voice.connect(out);
        osc.start(time);
        osc.stop(time + 2.7);
        osc.onended = () => {
          try { osc.disconnect(); voice.disconnect(); } catch (_) {}
        };
      });

      window.setTimeout(() => {
        try { out.disconnect(); if (pan) pan.disconnect(); } catch (_) {}
      }, Math.max(0, (time - ctx.currentTime + 2.9) * 1000));
    }

    /** A bright three-note answer for the interactive ornaments. */
    chime(mood) {
      if (!this.enabled || !this.ctx) return;
      const now = this.ctx.currentTime + 0.03;
      const sets = {
        warm: [659.25, 783.99, 1046.50],
        cool: [587.33, 880.00, 1174.66],
        deep: [523.25, 659.25, 880.00]
      };
      const notes = sets[mood] || sets.warm;
      notes.forEach((freq, i) => {
        this.playBell(freq, now + i * 0.105, 0.05 - i * 0.008, (i - 1) * 0.4);
      });
    }

    /** Soft sleigh bells for the reindeer. */
    sleigh() {
      if (!this.enabled || !this.ctx) return;
      const ctx = this.ctx;
      const now = ctx.currentTime + 0.05;
      for (let i = 0; i < 14; i++) {
        const when = now + i * 0.14 + (Math.random() * 0.02);
        const src = ctx.createBufferSource();
        src.buffer = this.noiseBuffer;
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 4200 + Math.random() * 2600;
        filter.Q.value = 3.2;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.0001, when);
        gain.gain.exponentialRampToValueAtTime(0.018 + Math.random() * 0.012, when + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.12);
        src.connect(filter);
        filter.connect(gain);
        gain.connect(this.dryBus);
        gain.connect(this.reverbIn);
        src.start(when, Math.random() * 1.2, 0.15);
      }
    }

    /** A small celebratory flourish when all eight wishes are found. */
    finale() {
      if (!this.enabled || !this.ctx) return;
      const ctx = this.ctx;
      const now = ctx.currentTime + 0.08;

      const run = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50, 1318.51];
      run.forEach((freq, i) => {
        this.playBell(freq, now + i * 0.105, 0.045 - i * 0.003, Math.sin(i) * 0.4);
      });

      // A long, bright pad bloom underneath the bells.
      const out = ctx.createGain();
      out.gain.setValueAtTime(0.0001, now);
      out.gain.exponentialRampToValueAtTime(0.045, now + 1.8);
      out.gain.exponentialRampToValueAtTime(0.0001, now + 9.5);
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 1600;
      out.connect(filter);
      filter.connect(this.dryBus);
      filter.connect(this.reverbIn);
      [261.63, 392.00, 523.25, 659.25, 783.99].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;
        osc.detune.value = i * 2.5;
        const voice = ctx.createGain();
        voice.gain.value = 0.08;
        osc.connect(voice);
        voice.connect(out);
        osc.start(now);
        osc.stop(now + 9.8);
      });
    }
  }

  window.ChristmasAudio = ChristmasAudio;
})();
