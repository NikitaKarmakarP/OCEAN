// Floating Bubble Physics and Particle System

export class Bubble {
  constructor(x, y, radius = null) {
    this.radius = radius || (Math.random() * 8 + 4); // 4px to 12px
    this.x = x || Math.random() * window.innerWidth;
    // Start slightly below viewport if not specified
    this.y = y !== null ? y : window.innerHeight + this.radius * 2;
    
    // Float upwards speed
    this.speed = Math.random() * 1.5 + 0.8;
    
    // Wobble characteristics (wobbles side-to-side as it rises)
    this.wobbleSpeed = Math.random() * 0.04 + 0.02;
    this.wobbleAmount = Math.random() * 1.5 + 0.5;
    this.wobbleAngle = Math.random() * Math.PI * 2;
    
    this.opacity = Math.random() * 0.35 + 0.25; // Translucent
    this.popped = false;
    this.popParticles = [];
    this.isSpawnedByClick = false;
  }

  // Update bubble position and handle interactions
  update(width, height, mouse, ripples) {
    if (this.popped) {
      // Update pop particle animations
      for (let i = this.popParticles.length - 1; i >= 0; i--) {
        const p = this.popParticles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.08;
        if (p.life <= 0) {
          this.popParticles.splice(i, 1);
        }
      }
      return;
    }

    // 1. Natural buoyant rising
    this.y -= this.speed;

    // 2. Sine-wave horizontal wobbling
    this.wobbleAngle += this.wobbleSpeed;
    this.x += Math.sin(this.wobbleAngle) * this.wobbleAmount * 0.4;

    // 3. Elastic mouse avoidance
    const dx = this.x - mouse.x;
    const dy = this.y - mouse.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const avoidanceRadius = 110;

    if (dist < avoidanceRadius) {
      // Calculate push force based on distance
      const force = (avoidanceRadius - dist) / avoidanceRadius;
      const angle = Math.atan2(dy, dx);
      // Push bubble outward
      this.x += Math.cos(angle) * force * 4.5;
      this.y += Math.sin(angle) * force * 4.5;
    }

    // 4. Interaction with click ripples
    ripples.forEach(ripple => {
      const rdx = this.x - ripple.x;
      const rdy = this.y - ripple.y;
      const rdist = Math.sqrt(rdx * rdx + rdy * rdy);
      
      // If bubble is hit by the expanding ripple shockwave
      const shockwaveWidth = 40;
      if (Math.abs(rdist - ripple.radius) < shockwaveWidth) {
        const pushForce = (1 - (ripple.radius / ripple.maxRadius)) * 6;
        const angle = Math.atan2(rdy, rdx);
        this.x += Math.cos(angle) * pushForce;
        this.y += Math.sin(angle) * pushForce;
      }
    });

    // 5. Keep bubble within boundary bounds
    if (this.x < -this.radius) this.x = width + this.radius;
    if (this.x > width + this.radius) this.x = -this.radius;
  }

  // Draw bubble on screen
  draw(ctx) {
    if (this.popped) {
      // Draw popping splash particles
      ctx.save();
      this.popParticles.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(163, 220, 255, ${p.life})`;
        ctx.fill();
      });
      ctx.restore();
      return;
    }

    ctx.save();
    
    // Set composite operation for shiny blend
    ctx.globalCompositeOperation = 'screen';

    // 1. Shimmering glass 3D gradient
    const grad = ctx.createRadialGradient(
      this.x - this.radius * 0.35, 
      this.y - this.radius * 0.35, 
      this.radius * 0.05, 
      this.x, 
      this.y, 
      this.radius
    );

    // Light teal/cyan bubble borders and translucent body
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
    grad.addColorStop(0.15, 'rgba(255, 255, 255, 0.45)');
    grad.addColorStop(0.4, 'rgba(0, 242, 254, 0.15)');
    grad.addColorStop(0.85, 'rgba(0, 160, 255, 0.35)');
    grad.addColorStop(1, 'rgba(0, 120, 255, 0.7)');

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.globalAlpha = this.opacity;
    ctx.fill();

    // 2. High gloss specular reflection dot (Top-left glare)
    ctx.beginPath();
    ctx.arc(
      this.x - this.radius * 0.3, 
      this.y - this.radius * 0.3, 
      this.radius * 0.2, 
      0, 
      Math.PI * 2
    );
    ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity * 1.5})`;
    ctx.fill();
    
    // 3. Subtle outer ring glow
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.lineWidth = 0.6;
    ctx.strokeStyle = `rgba(255, 255, 255, ${this.opacity * 0.8})`;
    ctx.stroke();

    ctx.restore();
  }

  // Trigger bubble pop explosion
  pop() {
    if (this.popped) return;
    this.popped = true;

    // Generate burst particles
    const particleCount = Math.floor(Math.random() * 6) + 6; // 6 to 12 particles
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2 + Math.random() * 0.4;
      const speed = Math.random() * 2 + 1.5;
      this.popParticles.push({
        x: this.x,
        y: this.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.5, // Add a bit of upward float
        size: Math.random() * 2 + 0.8,
        life: 1.0 // Fades out
      });
    }
  }

  // Check if coordinates click this bubble
  isClicked(mx, my) {
    if (this.popped) return false;
    const dx = this.x - mx;
    const dy = this.y - my;
    // Give a slightly padded hitbox for small bubbles
    const clickPadding = this.radius < 8 ? 8 : 0;
    return Math.sqrt(dx * dx + dy * dy) <= (this.radius + clickPadding);
  }
}
