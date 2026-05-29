// Web Audio API Ambient Synth and FX Sound System

class OceanSoundSystem {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.ambientGain = null;
    this.fxGain = null;
    
    // Nodes for ambient drone
    this.droneOsc1 = null;
    this.droneOsc2 = null;
    this.droneLfo = null;
    this.droneFilter = null;
    
    // Volume levels
    this.ambientVolume = 0.5;
    this.fxVolume = 0.5;
    this.isMuted = true;
    this.initialized = false;
  }

  // Initialize Audio Context on first user interaction
  init() {
    if (this.initialized) return;

    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContextClass();
      
      // Setup Gain Nodes
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0, this.ctx.currentTime); // Start silent
      this.masterGain.connect(this.ctx.destination);
      
      this.ambientGain = this.ctx.createGain();
      this.ambientGain.gain.setValueAtTime(this.ambientVolume, this.ctx.currentTime);
      this.ambientGain.connect(this.masterGain);
      
      this.fxGain = this.ctx.createGain();
      this.fxGain.gain.setValueAtTime(this.fxVolume, this.ctx.currentTime);
      this.fxGain.connect(this.masterGain);
      
      // Start ambient synth drone
      this.startAmbientDrone();
      
      this.initialized = true;
      console.log("Ocean sound synthesis system initialized successfully.");
    } catch (e) {
      console.warn("Web Audio API is not supported or failed to initialize:", e);
    }
  }

  // Start the low ambient underwater drone
  startAmbientDrone() {
    if (!this.ctx) return;
    
    // Filter to cut off high frequencies, giving a muffled, underwater feel
    this.droneFilter = this.ctx.createBiquadFilter();
    this.droneFilter.type = 'lowpass';
    this.droneFilter.Q.setValueAtTime(2.0, this.ctx.currentTime);
    this.droneFilter.frequency.setValueAtTime(140, this.ctx.currentTime);
    this.droneFilter.connect(this.ambientGain);

    // Osc 1 - Deep drone carrier (detuned slightly)
    this.droneOsc1 = this.ctx.createOscillator();
    this.droneOsc1.type = 'sine';
    this.droneOsc1.frequency.setValueAtTime(52, this.ctx.currentTime); // G1 note (deep hum)
    
    // Osc 2 - Secondary deep carrier for chorus effect
    this.droneOsc2 = this.ctx.createOscillator();
    this.droneOsc2.type = 'sine';
    this.droneOsc2.frequency.setValueAtTime(52.5, this.ctx.currentTime); // Slightly detuned

    // LFO to modulate filter cutoff (simulates waves and currents rolling over)
    this.droneLfo = this.ctx.createOscillator();
    this.droneLfo.type = 'sine';
    this.droneLfo.frequency.setValueAtTime(0.08, this.ctx.currentTime); // Extremely slow LFO (12s period)

    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(45, this.ctx.currentTime); // Modulate filter between ~95Hz and ~185Hz

    // Connect LFO
    this.droneLfo.connect(lfoGain);
    lfoGain.connect(this.droneFilter.frequency);

    // Connect oscillators to filter
    this.droneOsc1.connect(this.droneFilter);
    this.droneOsc2.connect(this.droneFilter);

    // Start oscillators
    this.droneOsc1.start();
    this.droneOsc2.start();
    this.droneLfo.start();
  }

  // Set master volume state
  toggleMute(muteState) {
    this.init(); // Ensure context is loaded
    
    if (!this.ctx) return;
    
    // Resume context if suspended
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    this.isMuted = muteState;
    const targetVolume = this.isMuted ? 0 : 1;
    
    this.masterGain.gain.linearRampToValueAtTime(targetVolume, this.ctx.currentTime + 0.5);
  }

  // Adjust ambient volume
  setAmbientVol(level) {
    this.ambientVolume = level;
    if (this.ambientGain && this.ctx) {
      this.ambientGain.gain.linearRampToValueAtTime(level, this.ctx.currentTime + 0.1);
    }
  }

  // Adjust FX volume
  setFxVol(level) {
    this.fxVolume = level;
    if (this.fxGain && this.ctx) {
      this.fxGain.gain.linearRampToValueAtTime(level, this.ctx.currentTime + 0.1);
    }
  }

  // Synthesize a water bubble pop sound
  playBubblePop(panX = 0) {
    if (this.isMuted || !this.ctx || !this.initialized) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const panner = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;

    osc.type = 'sine';
    
    // Realistic bubbly pop: Pitch sweeps quickly upwards from ~200Hz to ~1200Hz
    const startFreq = 220 + Math.random() * 80;
    const endFreq = 900 + Math.random() * 400;
    const duration = 0.05 + Math.random() * 0.04;
    
    osc.frequency.setValueAtTime(startFreq, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(endFreq, this.ctx.currentTime + duration);

    gain.gain.setValueAtTime(0.01, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.25, this.ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

    // Audio routing
    let lastNode = osc;
    if (panner) {
      panner.pan.setValueAtTime(Math.max(-1, Math.min(1, panX)), this.ctx.currentTime);
      osc.connect(panner);
      lastNode = panner;
    }
    
    lastNode.connect(gain);
    gain.connect(this.fxGain);

    osc.start();
    osc.stop(this.ctx.currentTime + duration + 0.05);
  }

  // Synthesize a ringing pentatonic scale bell when fish are fed
  playFeedChime() {
    if (this.isMuted || !this.ctx || !this.initialized) return;

    // Pick a random beautiful note from a major pentatonic scale (C major)
    const notes = [523.25, 587.33, 659.25, 783.99, 880.00, 1046.50]; // C5, D5, E5, G5, A5, C6
    const randomFreq = notes[Math.floor(Math.random() * notes.length)];

    this.playBell(randomFreq, 0.4);
  }

  playBell(frequency, duration) {
    if (!this.ctx) return;

    // Synthesize FM-synthesis type chime using multiple sine layers
    const time = this.ctx.currentTime;
    
    // Fundamental note
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.frequency.setValueAtTime(frequency, time);
    gain1.gain.setValueAtTime(0.12, time);
    gain1.gain.exponentialRampToValueAtTime(0.001, time + duration);
    osc1.connect(gain1);
    gain1.connect(this.fxGain);

    // Minor third overtone (creates beautiful depth)
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.frequency.setValueAtTime(frequency * 1.5, time); // Fifth
    gain2.gain.setValueAtTime(0.06, time);
    gain2.gain.exponentialRampToValueAtTime(0.001, time + duration * 0.7);
    osc2.connect(gain2);
    gain2.connect(this.fxGain);

    // Octave shimmer
    const osc3 = this.ctx.createOscillator();
    const gain3 = this.ctx.createGain();
    osc3.frequency.setValueAtTime(frequency * 2.0, time); // Octave
    gain3.gain.setValueAtTime(0.04, time);
    gain3.gain.exponentialRampToValueAtTime(0.001, time + duration * 0.4);
    osc3.connect(gain3);
    gain3.connect(this.fxGain);

    osc1.start(time);
    osc2.start(time);
    osc3.start(time);

    osc1.stop(time + duration + 0.1);
    osc2.stop(time + duration + 0.1);
    osc3.stop(time + duration + 0.1);
  }

  // Synthesize custom rumbling thunder sound
  playThunder() {
    if (this.isMuted || !this.ctx || !this.initialized) return;

    const bufferSize = this.ctx.sampleRate * 1.8; // 1.8 seconds of noise
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    // Fill buffer with white noise
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    // Apply deep rumble lowpass filter
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(45, this.ctx.currentTime); // extremely deep bass rumble
    filter.frequency.exponentialRampToValueAtTime(15, this.ctx.currentTime + 1.8);
    
    // Add distortion or resonance peak for impact
    filter.Q.setValueAtTime(6.0, this.ctx.currentTime);

    const gain = this.ctx.createGain();
    // Fade-in impact and long rumble tail
    gain.gain.setValueAtTime(0.001, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(1.8, this.ctx.currentTime + 0.15); // Loud impact
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 1.8);

    // Route connections
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.fxGain);

    noise.start();
    noise.stop(this.ctx.currentTime + 1.9);
  }
}

// Export the singleton instance
export const sound = new OceanSoundSystem();
