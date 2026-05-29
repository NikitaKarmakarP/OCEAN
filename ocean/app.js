// Main Application Orchestrator

import { sound } from './sound.js';
import { Bubble } from './bubble.js';
import { Food, Fish, Jellyfish, MantaRay, SeaTurtle } from './fish.js';
import { OceanCanvasEngine, Ripple } from './canvas.js';

class InteractiveOceanApp {
  constructor() {
    this.engine = null;
    
    // Arrays for active elements
    this.bubbles = [];
    this.fishes = [];
    this.jellyfishes = [];
    this.mantaRays = [];
    this.seaTurtles = [];
    this.foods = [];
    this.ripples = [];
    
    // Atmospheric state
    this.dayState = 'day'; // 'day', 'night', 'storm'
    this.stormActive = false;
    this.lightningTimer = null;
    
    // Mouse tracker
    this.mouse = { x: -1000, y: -1000 };
    this.mouseInactiveTimer = null;
    
    // Stats calculation variables
    this.waterTemp = 26.2;
    this.depthMeter = 45; // Depth indicator
    
    // Sound system mute state
    this.soundMuted = true;
  }

  init() {
    // 1. Initialize the graphics engine
    this.engine = new OceanCanvasEngine('oceanCanvas');
    
    // 2. Setup interactive event listeners
    this.bindEvents();
    
    // 3. Populate initial sea creatures
    this.populateOcean();
    
    // 4. Start the 60fps simulation loop
    this.animate();
    
    // 5. Start statistics reporting loop
    this.startStatsUpdater();
    
    console.log("Interactive Ocean Scene fully loaded.");
  }

  bindEvents() {
    window.addEventListener('resize', () => {
      this.engine.resize();
    });

    const canvasElement = document.getElementById('oceanCanvas');

    // Track mouse coordinates
    canvasElement.addEventListener('mousemove', (e) => {
      const rect = canvasElement.getBoundingClientRect();
      this.mouse.x = e.clientX - rect.left;
      this.mouse.y = e.clientY - rect.top;
      
      // Auto-hide mouse circle after inactivity
      clearTimeout(this.mouseInactiveTimer);
      this.mouseInactiveTimer = setTimeout(() => {
        this.mouse.x = -1000;
        this.mouse.y = -1000;
      }, 3500);
    });

    // Handle mouse leaving viewport
    canvasElement.addEventListener('mouseleave', () => {
      this.mouse.x = -1000;
      this.mouse.y = -1000;
    });

    // Primary Click Interaction
    canvasElement.addEventListener('mousedown', (e) => {
      // Initialize audio on first click (browser permissions requirement)
      if (this.soundMuted === false) {
        sound.init();
      }

      const rect = canvasElement.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      // 1. Hit test bubbles to see if we popped one!
      let bubblePopped = false;
      
      for (let i = 0; i < this.bubbles.length; i++) {
        const bubble = this.bubbles[i];
        if (bubble.isClicked(clickX, clickY)) {
          bubble.pop();
          // Synthesize pop sound relative to horizontal click position (stereo pan)
          const pan = (clickX / window.innerWidth) * 2 - 1;
          sound.playBubblePop(pan);
          bubblePopped = true;
          break; // Pop one bubble per click
        }
      }

      // 2. If no bubble popped, trigger water ripple and drop food
      if (!bubblePopped) {
        // Add physics ripple ring
        this.ripples.push(new Ripple(clickX, clickY));
        
        // Drops organic fish food
        this.foods.push(new Food(clickX, clickY));
        sound.playFeedChime();
        
        // Generate a tiny cluster of rising micro-bubbles where clicked
        const bubbleCount = Math.floor(Math.random() * 3) + 2;
        for (let i = 0; i < bubbleCount; i++) {
          const bRadius = Math.random() * 4 + 3;
          const bubble = new Bubble(
            clickX + (Math.random() - 0.5) * 12,
            clickY + (Math.random() - 0.5) * 12,
            bRadius
          );
          bubble.isSpawnedByClick = true;
          bubble.speed = Math.random() * 1.0 + 1.2; // Rise slightly faster
          this.bubbles.push(bubble);
        }
      }
    });

    // --- HUD Controls panel mappings ---

    // Creature Spawning Buttons
    document.getElementById('btnClownfish').addEventListener('click', () => {
      this.spawnFish('clownfish');
      sound.playFeedChime();
    });
    
    document.getElementById('btnBluetang').addEventListener('click', () => {
      this.spawnFish('bluetang');
      sound.playFeedChime();
    });
    
    document.getElementById('btnYellowtang').addEventListener('click', () => {
      this.spawnFish('yellowtang');
      sound.playFeedChime();
    });
    
    document.getElementById('btnCoralbeauty').addEventListener('click', () => {
      this.spawnFish('coralbeauty');
      sound.playFeedChime();
    });
    
    document.getElementById('btnJellyfish').addEventListener('click', () => {
      this.spawnJellyfish();
      sound.playFeedChime();
    });
    
    document.getElementById('btnFeedAll').addEventListener('click', () => {
      this.feedAll();
    });

    // Atmosphere Selection Switches
    const dayNightSwitch = document.getElementById('switchDayNight');
    const stormSwitch = document.getElementById('switchStorm');

    dayNightSwitch.addEventListener('change', (e) => {
      sound.init(); // Initialize audio
      
      const isNight = e.target.checked;
      
      // Clear storm check if night is switched on
      if (isNight) {
        stormSwitch.checked = false;
        this.setAtmosphere('night');
      } else {
        this.setAtmosphere('day');
      }
    });

    stormSwitch.addEventListener('change', (e) => {
      sound.init();
      
      const isStorm = e.target.checked;
      
      if (isStorm) {
        dayNightSwitch.checked = false;
        this.setAtmosphere('storm');
      } else {
        this.setAtmosphere('day');
      }
    });

    // Sound Controls
    const muteSwitch = document.getElementById('switchMute');
    const volAmbient = document.getElementById('volAmbient');
    const volFX = document.getElementById('volFX');

    muteSwitch.addEventListener('change', (e) => {
      this.soundMuted = !e.target.checked;
      sound.toggleMute(this.soundMuted);
    });

    volAmbient.addEventListener('input', (e) => {
      const vol = parseFloat(e.target.value);
      sound.setAmbientVol(vol);
    });

    volFX.addEventListener('input', (e) => {
      const vol = parseFloat(e.target.value);
      sound.setFxVol(vol);
    });

    // Toggle controls panel collapse
    const btnTogglePanel = document.getElementById('btnTogglePanel');
    const controlsPanel = document.getElementById('controlsPanel');
    const toggleIcon = btnTogglePanel.querySelector('.toggle-icon');
    const toggleText = btnTogglePanel.querySelector('.toggle-text');

    btnTogglePanel.addEventListener('click', () => {
      const isCollapsed = controlsPanel.classList.toggle('collapsed');
      if (isCollapsed) {
        toggleIcon.textContent = '▲';
        toggleText.textContent = 'Show Controls';
        btnTogglePanel.setAttribute('aria-expanded', 'false');
      } else {
        toggleIcon.textContent = '▼';
        toggleText.textContent = 'Hide Controls';
        btnTogglePanel.setAttribute('aria-expanded', 'true');
      }
    });
  }

  // Set atmosphere state
  setAtmosphere(mode) {
    this.dayState = mode;
    this.engine.setTheme(mode);
    
    const viewport = document.getElementById('viewport');
    viewport.className = `ocean-viewport ${mode}`;

    // Manage storm trigger timers
    if (mode === 'storm') {
      this.stormActive = true;
      this.startStormLightning();
    } else {
      this.stormActive = false;
      this.stopStormLightning();
    }
  }

  // Populate background structures and standard fish
  populateOcean() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    // 1. Spawn initial bubbles
    const bubbleCount = Math.floor(width / 32); // Scaling bubble count with screen size
    for (let i = 0; i < bubbleCount; i++) {
      this.bubbles.push(new Bubble(
        Math.random() * width,
        Math.random() * height + 100 // distribute throughout screen depth
      ));
    }

    // 2. Spawn initial fish of mixed species
    const speciesList = ['clownfish', 'bluetang', 'yellowtang', 'coralbeauty'];
    const initialFishCount = 14;
    for (let i = 0; i < initialFishCount; i++) {
      const sp = speciesList[i % speciesList.length];
      this.fishes.push(new Fish(
        Math.random() * width,
        Math.random() * height * 0.65 + 120,
        sp
      ));
    }

    // 3. Spawn initial Jellyfish
    for (let i = 0; i < 3; i++) {
      this.jellyfishes.push(new Jellyfish());
    }

    // 4. Spawn initial Manta Rays
    this.mantaRays.push(new MantaRay());
    
    // 5. Spawn majestic turtle
    this.seaTurtles.push(new SeaTurtle());
  }

  // Spawners
  spawnFish(species) {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    // Spawn near the screen border where they swim in
    const fromLeft = Math.random() > 0.5;
    const spawnX = fromLeft ? -40 : width + 40;
    const spawnY = Math.random() * height * 0.65 + 130;
    
    const fish = new Fish(spawnX, spawnY, species);
    // Push velocity towards center
    fish.vx = fromLeft ? 1.5 : -1.5;
    this.fishes.push(fish);
  }

  spawnJellyfish() {
    const spawnX = Math.random() * (window.innerWidth - 200) + 100;
    const spawnY = window.innerHeight + 50; // spawn below bottom
    this.jellyfishes.push(new Jellyfish(spawnX, spawnY));
  }

  feedAll() {
    sound.init();
    
    const count = 10;
    const width = window.innerWidth;
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        const dropX = Math.random() * (width - 160) + 80;
        this.foods.push(new Food(dropX, 60));
        sound.playFeedChime();
      }, i * 200); // Cascading drip feed!
    }
  }

  // Storm weather lightning strikes loops
  startStormLightning() {
    const strike = () => {
      if (!this.stormActive) return;
      
      // Trigger lightning flash class in overlay DOM
      const overlay = document.getElementById('lightningOverlay');
      overlay.classList.add('flash-active');
      
      // Synthesize deep heavy thunder rumbles
      sound.playThunder();

      // Scare the fish! (temporarily scare them in random directions)
      this.fishes.forEach(fish => {
        const angle = Math.random() * Math.PI * 2;
        fish.vx = Math.cos(angle) * fish.maxSpeed * 2.5;
        fish.vy = Math.sin(angle) * fish.maxSpeed * 2.5;
      });

      // Clear lightning animation class after execution
      setTimeout(() => {
        overlay.classList.remove('flash-active');
      }, 450);

      // Re-schedule next strike (random interval between 7s and 14s)
      const nextTime = 7000 + Math.random() * 7000;
      this.lightningTimer = setTimeout(strike, nextTime);
    };

    // First strike starts in 5 seconds
    this.lightningTimer = setTimeout(strike, 4000);
  }

  stopStormLightning() {
    clearTimeout(this.lightningTimer);
  }

  // Stats text updater (soothing glass panel feedback)
  startStatsUpdater() {
    setInterval(() => {
      // 1. Water temperature fluctuating organically
      let targetTemp = 26.2;
      if (this.dayState === 'night') targetTemp = 21.6;
      else if (this.dayState === 'storm') targetTemp = 23.8;
      
      // Smoothly drift towards target
      this.waterTemp += (targetTemp - this.waterTemp) * 0.05;
      // Add a tiny random thermal current noise
      const noise = (Math.random() - 0.5) * 0.05;
      const formattedTemp = (this.waterTemp + noise).toFixed(1);
      document.getElementById('statTemp').innerText = `${formattedTemp}°C`;

      // 2. Count active creatures
      const countCreatures = this.fishes.length + this.jellyfishes.length + this.mantaRays.length + this.seaTurtles.length;
      document.getElementById('statFish').innerText = countCreatures;

      // 3. Count bubbles
      document.getElementById('statBubbles').innerText = this.bubbles.length;

      // 4. Fluctuating depth index
      this.depthMeter = Math.max(20, Math.min(100, this.depthMeter + (Math.random() - 0.5) * 0.4));
      document.getElementById('statDepth').innerText = `${Math.floor(this.depthMeter)}m`;
    }, 1000);
  }

  // Primary animation game loop
  animate() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const ctx = this.engine.ctx;

    // 1. Draw water background linear colors
    this.engine.drawBackground(this.dayState);
    
    // 2. Draw shifting caustics light rays
    this.engine.drawSunRays(this.dayState, this.stormActive);

    // 3. Update & render food particles
    for (let i = this.foods.length - 1; i >= 0; i--) {
      const food = this.foods[i];
      food.update(width, height);
      food.draw(ctx);
      
      // Remove food if eaten or reached the floor
      if (food.eaten || food.y > height - 30) {
        this.foods.splice(i, 1);
      }
    }

    // 4. Update & render clicks ripples
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const ripple = this.ripples[i];
      ripple.update();
      ripple.draw(ctx);
      
      if (ripple.finished) {
        this.ripples.splice(i, 1);
      }
    }

    // 5. Maintain bubble count & update bubbles
    const desiredBubbles = Math.floor(width / 32);
    if (this.bubbles.length < desiredBubbles) {
      // Spawn new bubbles at the bottom
      this.bubbles.push(new Bubble(
        Math.random() * width,
        height + 15
      ));
    }

    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const bubble = this.bubbles[i];
      bubble.update(width, height, this.mouse, this.ripples);
      bubble.draw(ctx);
      
      // Pop bubbles if they hit the surface
      if (!bubble.popped && bubble.y < 90) {
        bubble.pop();
      }

      // Remove bubble if pop animation completes and particles disappear
      if (bubble.popped && bubble.popParticles.length === 0) {
        this.bubbles.splice(i, 1);
      }
    }

    // 6. Update and render Boids fishes
    this.fishes.forEach(fish => {
      fish.update(width, height, this.mouse, this.ripples, this.foods, this.fishes, this.stormActive);
      fish.draw(ctx, this.dayState);
    });

    // 7. Update and render Jellyfishes
    this.jellyfishes.forEach(jelly => {
      jelly.update(width, height, this.mouse, this.ripples, this.stormActive);
      jelly.draw(ctx, this.dayState);
    });

    // 8. Update and render Manta Rays
    this.mantaRays.forEach(manta => {
      manta.update(width, height, this.mouse, this.ripples, this.stormActive);
      manta.draw(ctx, this.dayState);
    });

    // 9. Update and render Sea Turtles
    this.seaTurtles.forEach(turtle => {
      turtle.update(width, height, this.mouse, this.ripples, this.stormActive);
      turtle.draw(ctx, this.dayState);
    });

    // 10. Draw bottom silhouette sand dunes
    this.engine.drawSeaFloor(this.dayState);

    // Call next frame
    requestAnimationFrame(() => this.animate());
  }
}

// Create application instance
const app = new InteractiveOceanApp();
window.addEventListener('DOMContentLoaded', () => app.init());
export default app;
