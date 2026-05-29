// Canvas Management, High-DPI Scaling, Sunbeams/Caustics and Interaction Ripples

export class Ripple {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 0;
    this.maxRadius = 180 + Math.random() * 40; // 180px to 220px expansion
    this.speed = 3.8;
    this.alpha = 1.0;
    this.finished = false;
  }

  update() {
    this.radius += this.speed;
    
    // Fade out as it expands
    this.alpha = 1.0 - (this.radius / this.maxRadius);
    
    if (this.radius >= this.maxRadius) {
      this.finished = true;
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    
    // Multi-layered ring for displacement shockwave aesthetic
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = `rgba(0, 242, 254, ${this.alpha * 0.45})`;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(this.x, this.y, Math.max(0, this.radius - 12), 0, Math.PI * 2);
    ctx.lineWidth = 1.0;
    ctx.strokeStyle = `rgba(79, 172, 254, ${this.alpha * 0.25})`;
    ctx.stroke();
    
    ctx.restore();
  }
}

export class OceanCanvasEngine {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    
    // Track sizing
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    
    // Light rays state
    this.rayTime = 0;
    
    // Gradient lerp interpolation targets & currents
    this.gradientTheme = 'day';
    
    // Setup initial canvas resolution
    this.resize();
  }

  // Handle scaling on High-DPI / Retina displays
  resize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    
    // Get backing store scale
    const dpr = window.devicePixelRatio || 1;
    
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    
    this.ctx.scale(dpr, dpr);
  }

  // Set the current atmospheric state for rendering
  setTheme(theme) {
    this.gradientTheme = theme;
  }

  // Draw the underlying ocean water background gradient (Canvas side, beneath web page)
  drawBackground(dayState) {
    const ctx = this.ctx;
    
    // Base gradients depend on theme.
    // CSS coordinates linear background from top to bottom
    const gradient = ctx.createLinearGradient(0, 0, 0, this.height);
    
    if (dayState === 'day') {
      gradient.addColorStop(0, '#0a647d');    // Sunlit teal
      gradient.addColorStop(0.35, '#052c3c'); // Dark marine
      gradient.addColorStop(0.8, '#03121d');  // Midnight depth
      gradient.addColorStop(1, '#01060c');    // Abyssal black
    } else if (dayState === 'night') {
      gradient.addColorStop(0, '#020714');    // Deep midnight
      gradient.addColorStop(0.4, '#01030a');  // Pitch navy
      gradient.addColorStop(1, '#000002');    // Absolute abyss
    } else if (dayState === 'storm') {
      gradient.addColorStop(0, '#1a2632');    // Slate stormy sea
      gradient.addColorStop(0.35, '#09131d'); // Muted dark blue
      gradient.addColorStop(0.8, '#03080e');  // Shadow water
      gradient.addColorStop(1, '#000204');    // Abyssal storm depth
    }

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);
  }

  // Draw moving sunbeams / caustics cutting through the water
  drawSunRays(dayState, stormActive) {
    if (dayState === 'night') return; // No sunbeams at night

    const ctx = this.ctx;
    this.rayTime += stormActive ? 0.005 : 0.003; // Waves move slightly faster in storm
    
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    
    // Rays penetrate from top-left to bottom-right
    const rayCount = stormActive ? 6 : 8;
    const originX = this.width * 0.3;
    const originY = -50;
    
    // Set ray intensity base
    const maxOpacity = stormActive ? 0.06 : 0.14;

    for (let i = 0; i < rayCount; i++) {
      // Periodic trigonometric oscillation for ray swaying angle and width
      const sway = Math.sin(this.rayTime + (i * 1.5)) * 0.12;
      const angle = (Math.PI / 4) + sway + 0.1; // Diagonal beam
      
      const widthMultiplier = 0.12 + Math.cos(this.rayTime * 1.3 + i) * 0.05;
      const leftAngle = angle - widthMultiplier;
      const rightAngle = angle + widthMultiplier;
      
      const rayLen = this.height * 1.5;
      
      // Calculate coordinates of the light ray wedge
      const x1 = originX + Math.cos(leftAngle) * rayLen;
      const y1 = originY + Math.sin(leftAngle) * rayLen;
      const x2 = originX + Math.cos(rightAngle) * rayLen;
      const y2 = originY + Math.sin(rightAngle) * rayLen;
      
      // Radial glow gradient for sunbeams fading out as they go deep
      const rayGrad = ctx.createRadialGradient(
        originX, originY, 10,
        originX + (x1+x2-2*originX)/4, originY + (y1+y2-2*originY)/4, this.height * 0.95
      );
      
      // Volumetric dust/light ray color
      const beamColor = stormActive ? 'rgba(150, 185, 200,' : 'rgba(215, 245, 255,';
      
      rayGrad.addColorStop(0, `${beamColor}${maxOpacity * 0.7})`);
      rayGrad.addColorStop(0.3, `${beamColor}${maxOpacity * 0.4})`);
      rayGrad.addColorStop(0.7, `${beamColor}${maxOpacity * 0.15})`);
      rayGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      
      ctx.beginPath();
      ctx.moveTo(originX, originY);
      ctx.lineTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.closePath();
      
      ctx.fillStyle = rayGrad;
      ctx.fill();
    }
    
    ctx.restore();
  }

  // Draw sea floor details (Silhouette sand banks or corals) at the very bottom
  drawSeaFloor(dayState) {
    const ctx = this.ctx;
    ctx.save();
    
    // Choose ground colors based on theme
    let color = '#020d18'; // Dark turquoise reef
    if (dayState === 'night') color = '#000309';
    else if (dayState === 'storm') color = '#01060c';

    ctx.fillStyle = color;
    
    // Layer 1: Back dunes
    ctx.beginPath();
    ctx.moveTo(0, this.height);
    ctx.quadraticCurveTo(this.width * 0.25, this.height - 40, this.width * 0.5, this.height - 20);
    ctx.quadraticCurveTo(this.width * 0.75, this.height, this.width, this.height - 30);
    ctx.lineTo(this.width, this.height);
    ctx.closePath();
    ctx.fill();
    
    // Layer 2: Front reef silhouette
    let reefColor = '#01070e';
    if (dayState === 'night') reefColor = '#000105';
    else if (dayState === 'storm') reefColor = '#000307';
    
    ctx.fillStyle = reefColor;
    ctx.beginPath();
    ctx.moveTo(0, this.height);
    ctx.quadraticCurveTo(this.width * 0.3, this.height - 15, this.width * 0.6, this.height - 35);
    ctx.quadraticCurveTo(this.width * 0.85, this.height - 10, this.width, this.height - 20);
    ctx.lineTo(this.width, this.height);
    ctx.closePath();
    ctx.fill();
    
    ctx.restore();
  }
}
