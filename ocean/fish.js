// Marine Life Entities - Fish, Schooling Boids, Jellyfish, Manta Ray, Sea Turtle, and Food

// 1. Food Particle Class
export class Food {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = Math.random() * 3 + 2.5; // 2.5px to 5.5px
    
    // Slow initial drop speed
    this.vx = (Math.random() - 0.5) * 0.8;
    this.vy = Math.random() * 0.5 + 0.8;
    
    this.swaySpeed = Math.random() * 0.05 + 0.02;
    this.swayAngle = Math.random() * Math.PI * 2;
    this.swayAmount = Math.random() * 0.3 + 0.1;
    
    this.eaten = false;
    // Organic coral-food color
    this.color = `hsl(${Math.random() * 20 + 20}, 85%, 60%)`; // Rich golden/terracotta
  }

  update(width, height) {
    // Gravity pull in water
    this.vy = Math.min(1.5, this.vy + 0.015); // Terminal velocity in water
    this.vx *= 0.98; // Water resistance
    
    this.y += this.vy;
    this.swayAngle += this.swaySpeed;
    this.x += this.vx + Math.sin(this.swayAngle) * this.swayAmount;
  }

  draw(ctx) {
    ctx.save();
    ctx.shadowBlur = 4;
    ctx.shadowColor = this.color;
    
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
    
    // Specular shine
    ctx.beginPath();
    ctx.arc(this.x - this.radius * 0.3, this.y - this.radius * 0.3, this.radius * 0.25, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fill();
    
    ctx.restore();
  }
}

// 2. Base Schooling Fish (Boids Algorithm)
export class Fish {
  constructor(x, y, species = 'clownfish') {
    this.x = x || Math.random() * window.innerWidth;
    this.y = y || Math.random() * window.innerHeight * 0.7 + 100;
    
    this.species = species;
    
    // Physical attributes depending on species
    this.setSpeciesAttributes();
    
    // Velocity vectors
    const angle = Math.random() * Math.PI * 2;
    this.vx = Math.cos(angle) * this.maxSpeed;
    this.vy = Math.sin(angle) * this.maxSpeed;
    
    // Tail animation state
    this.tailCycle = Math.random() * 100;
    this.tailSwing = 0;
    
    this.id = Math.random();
  }

  setSpeciesAttributes() {
    switch (this.species) {
      case 'bluetang':
        this.scale = Math.random() * 0.15 + 0.65; // ~0.7
        this.maxSpeed = 2.4;
        this.maxForce = 0.07;
        this.bodyColor = '#1a3fff'; // Deep cobalt blue
        this.patternColor = '#060a1d'; // Black patterns
        this.accentColor = '#ffd000'; // Bright yellow fins
        this.bellyColor = '#0025ce';
        break;
      case 'yellowtang':
        this.scale = Math.random() * 0.12 + 0.6;
        this.maxSpeed = 2.6;
        this.maxForce = 0.08;
        this.bodyColor = '#ffea00'; // High vibrant yellow
        this.patternColor = '#ffe34d';
        this.accentColor = '#ffffff';
        this.bellyColor = '#ffd200';
        break;
      case 'coralbeauty':
        this.scale = Math.random() * 0.15 + 0.55;
        this.maxSpeed = 2.2;
        this.maxForce = 0.06;
        this.bodyColor = '#5900b3'; // Electric violet
        this.patternColor = '#b30059'; // Magenta/crimson details
        this.accentColor = '#ff6c00'; // Glowing orange fins
        this.bellyColor = '#3c0080';
        break;
      case 'clownfish':
      default:
        this.species = 'clownfish';
        this.scale = Math.random() * 0.1 + 0.55; // ~0.6
        this.maxSpeed = 2.0;
        this.maxForce = 0.06;
        this.bodyColor = '#ff5d00'; // Tangy orange
        this.patternColor = '#ffffff'; // White stripes
        this.accentColor = '#000000'; // Black fin edges
        this.bellyColor = '#e64500';
        break;
    }
  }

  // Update fish position and physics
  update(width, height, mouse, ripples, foods, allFish, stormActive) {
    let accelX = 0;
    let accelY = 0;

    // Adjust speed in a storm (fish are excited/frightened)
    const activeMaxSpeed = stormActive ? this.maxSpeed * 1.5 : this.maxSpeed;
    const activeMaxForce = stormActive ? this.maxForce * 1.6 : this.maxForce;

    // 1. Boundary steering force
    const [boundX, boundY] = this.steerBoundaries(width, height);
    accelX += boundX * 1.2;
    accelY += boundY * 1.2;

    // 2. Ripple force (flee from shockwaves)
    const [rippleX, rippleY] = this.avoidRipples(ripples);
    accelX += rippleX * 2.5;
    accelY += rippleY * 2.5;

    // 3. Flee from mouse cursor if close
    const [fleeX, fleeY] = this.fleeMouse(mouse);
    accelX += fleeX * 2.0;
    accelY += fleeY * 2.0;

    // 4. Food Seeking override (if food exists nearby, skip flocking and rush to eat!)
    let foodTarget = this.findClosestFood(foods);
    if (foodTarget) {
      const [foodX, foodY] = this.steerTowards(foodTarget.x, foodTarget.y);
      accelX += foodX * 1.5;
      accelY += foodY * 1.5;
      
      // Eat the food if touched
      const dx = this.x - foodTarget.x;
      const dy = this.y - foodTarget.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < (18 * this.scale + foodTarget.radius)) {
        foodTarget.eaten = true;
      }
    } else {
      // 5. Classic Boids Flocking behaviors
      const [alignX, alignY] = this.align(allFish);
      const [cohesionX, cohesionY] = this.cohere(allFish);
      const [separateX, separateY] = this.separate(allFish);

      accelX += alignX * 1.0;
      accelY += cohesionX * 0.8;
      accelY += cohesionY * 0.8;
      accelX += separateX * 1.5;
      accelY += separateY * 1.5;
    }

    // Apply acceleration
    this.vx += accelX;
    this.vy += accelY;

    // Limit speed to maxSpeed
    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (speed > activeMaxSpeed) {
      this.vx = (this.vx / speed) * activeMaxSpeed;
      this.vy = (this.vy / speed) * activeMaxSpeed;
    }

    // Move
    this.x += this.vx;
    this.y += this.vy;

    // Animate swimming tail
    const currentSpeed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    this.tailCycle += currentSpeed * 0.15;
    this.tailSwing = Math.sin(this.tailCycle) * 0.45;
  }

  // Draw dynamically drawn fish on canvas
  draw(ctx, dayState) {
    ctx.save();
    ctx.translate(this.x, this.y);

    const angle = Math.atan2(this.vy, this.vx);
    ctx.rotate(angle);
    ctx.scale(this.scale, this.scale);

    // Apply atmospheric color overlay
    if (dayState === 'night') {
      ctx.shadowBlur = 10;
      ctx.shadowColor = this.accentColor;
    }

    // 1. Draw Tail Fin (Flutters independently)
    ctx.save();
    ctx.translate(-22, 0); // Position at rear
    ctx.rotate(this.tailSwing);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-14, -12, -22, -16);
    ctx.quadraticCurveTo(-18, 0, -22, 0); // Tail notch
    ctx.quadraticCurveTo(-18, 0, -22, 16);
    ctx.quadraticCurveTo(-14, 12, 0, 0);
    ctx.fillStyle = this.accentColor;
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = this.bodyColor;
    ctx.stroke();
    ctx.restore();

    // 2. Draw Dorsal & Ventral Fin (Top & Bottom)
    ctx.beginPath();
    ctx.moveTo(-15, -9);
    ctx.quadraticCurveTo(-6, -20, 8, -12); // Dorsal
    ctx.lineTo(4, -8);
    ctx.fillStyle = this.accentColor;
    ctx.fill();
    if (this.accentColor === '#ffffff' || this.species === 'clownfish') {
      ctx.lineWidth = 1;
      ctx.strokeStyle = '#000000';
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.moveTo(-12, 8);
    ctx.quadraticCurveTo(-3, 16, 5, 10); // Ventral
    ctx.lineTo(2, 6);
    ctx.fillStyle = this.accentColor;
    ctx.fill();

    // 3. Draw Body (sleek teardrop shape)
    ctx.beginPath();
    ctx.moveTo(-25, 0);
    ctx.bezierCurveTo(-18, -15, 12, -15, 25, 0);
    ctx.bezierCurveTo(12, 15, -18, 15, -25, 0);
    
    // Body gradient
    const bodyGrad = ctx.createLinearGradient(-25, 0, 25, 0);
    bodyGrad.addColorStop(0, this.bellyColor);
    bodyGrad.addColorStop(0.6, this.bodyColor);
    bodyGrad.addColorStop(1, this.accentColor);
    ctx.fillStyle = bodyGrad;
    ctx.fill();

    // 4. Species-specific patterns
    if (this.species === 'clownfish') {
      // White stripes of Clownfish
      ctx.fillStyle = '#ffffff';
      
      // Middle Stripe
      ctx.beginPath();
      ctx.moveTo(-5, -11);
      ctx.quadraticCurveTo(-1, 0, -5, 11);
      ctx.lineTo(3, 11);
      ctx.quadraticCurveTo(7, 0, 3, -11);
      ctx.closePath();
      ctx.fill();

      // Tail Stripe
      ctx.beginPath();
      ctx.moveTo(-17, -7);
      ctx.quadraticCurveTo(-15, 0, -17, 7);
      ctx.lineTo(-13, 7);
      ctx.quadraticCurveTo(-11, 0, -13, -7);
      ctx.closePath();
      ctx.fill();

      // Head Stripe
      ctx.beginPath();
      ctx.moveTo(11, -9);
      ctx.quadraticCurveTo(14, 0, 11, 9);
      ctx.lineTo(15, 7);
      ctx.quadraticCurveTo(18, 0, 15, -7);
      ctx.closePath();
      ctx.fill();

      // Black outlines around white stripes
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1;
      ctx.stroke();
    } else if (this.species === 'bluetang') {
      // Curved black wedge on Blue Tang
      ctx.fillStyle = this.patternColor;
      ctx.beginPath();
      ctx.moveTo(-12, -4);
      ctx.bezierCurveTo(-3, -12, 8, -6, 12, -3);
      ctx.quadraticCurveTo(4, 0, -3, -2);
      ctx.quadraticCurveTo(-8, 5, -12, 4);
      ctx.quadraticCurveTo(-10, 0, -12, -4);
      ctx.fill();
    } else if (this.species === 'coralbeauty') {
      // Vertical dark stripes
      ctx.strokeStyle = this.patternColor;
      ctx.lineWidth = 1.8;
      for (let offset = -8; offset <= 6; offset += 4) {
        ctx.beginPath();
        ctx.moveTo(offset, -9);
        ctx.lineTo(offset + 2, 9);
        ctx.stroke();
      }
    }

    // 5. Draw Eye
    ctx.beginPath();
    ctx.arc(14, -3, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(15, -3, 1.8, 0, Math.PI * 2);
    ctx.fillStyle = '#000000';
    ctx.fill();
    // Catchlight dot
    ctx.beginPath();
    ctx.arc(16, -4, 0.6, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    // 6. Glowing Bioluminescent spots for night mode
    if (dayState === 'night') {
      ctx.beginPath();
      ctx.arc(10, 3, 1, 0, Math.PI * 2);
      ctx.arc(-2, 5, 1, 0, Math.PI * 2);
      ctx.arc(-12, 3, 1, 0, Math.PI * 2);
      ctx.fillStyle = '#00f2fe';
      ctx.fill();
    }

    ctx.restore();
  }

  // Find nearest food in range
  findClosestFood(foods) {
    let closest = null;
    let minDist = 350; // Sensory detection radius for food
    
    foods.forEach(food => {
      if (food.eaten) return;
      const dx = this.x - food.x;
      const dy = this.y - food.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < minDist) {
        minDist = dist;
        closest = food;
      }
    });
    return closest;
  }

  // Steer boundaries (keeps fish away from screen edges)
  steerBoundaries(width, height) {
    const pad = 90;
    let steerX = 0;
    let steerY = 0;

    if (this.x < pad) steerX = this.maxSpeed;
    if (this.x > width - pad) steerX = -this.maxSpeed;
    
    // Keep away from surface wave zone and floor
    if (this.y < pad + 30) steerY = this.maxSpeed;
    if (this.y > height - pad) steerY = -this.maxSpeed;

    if (steerX !== 0 || steerY !== 0) {
      return this.steerTowards(this.vx + steerX, this.vy + steerY);
    }
    return [0, 0];
  }

  // Push fish away from mouse clicks/ripples
  avoidRipples(ripples) {
    let steerX = 0;
    let steerY = 0;
    
    ripples.forEach(ripple => {
      const dx = this.x - ripple.x;
      const dy = this.y - ripple.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < ripple.radius + 60 && dist > 0) {
        const force = (1 - (dist / (ripple.radius + 60))) * this.maxSpeed * 3;
        const angle = Math.atan2(dy, dx);
        steerX += Math.cos(angle) * force;
        steerY += Math.sin(angle) * force;
      }
    });
    return [steerX, steerY];
  }

  // Flee from cursor coordinates
  fleeMouse(mouse) {
    const dx = this.x - mouse.x;
    const dy = this.y - mouse.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const fearRadius = 140;

    if (dist < fearRadius && dist > 0) {
      const angle = Math.atan2(dy, dx);
      // Faster speed when fleeing
      const targetVx = Math.cos(angle) * this.maxSpeed * 2.2;
      const targetVy = Math.sin(angle) * this.maxSpeed * 2.2;
      return [targetVx - this.vx, targetVy - this.vy];
    }
    return [0, 0];
  }

  // Steer vector helper
  steerTowards(tx, ty) {
    const dx = tx - this.x;
    const dy = ty - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 0) {
      const targetVx = (dx / dist) * this.maxSpeed;
      const targetVy = (dy / dist) * this.maxSpeed;
      
      let steerX = targetVx - this.vx;
      let steerY = targetVy - this.vy;
      
      // Limit steering force
      const steerLen = Math.sqrt(steerX * steerX + steerY * steerY);
      if (steerLen > this.maxForce) {
        steerX = (steerX / steerLen) * this.maxForce;
        steerY = (steerY / steerLen) * this.maxForce;
      }
      return [steerX, steerY];
    }
    return [0, 0];
  }

  // --- BOIDS RULES ---
  
  // Rule 1: Alignment (Match speed & direction of nearby neighbors)
  align(allFish) {
    let sumVx = 0;
    let sumVy = 0;
    let count = 0;
    const neighborDist = 120;

    allFish.forEach(other => {
      if (other.id === this.id) return;
      const dx = this.x - other.x;
      const dy = this.y - other.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < neighborDist) {
        sumVx += other.vx;
        sumVy += other.vy;
        count++;
      }
    });

    if (count > 0) {
      sumVx /= count;
      sumVy /= count;
      
      const speed = Math.sqrt(sumVx * sumVx + sumVy * sumVy);
      if (speed > 0) {
        sumVx = (sumVx / speed) * this.maxSpeed;
        sumVy = (sumVy / speed) * this.maxSpeed;
      }

      let steerX = sumVx - this.vx;
      let steerY = sumVy - this.vy;
      const steerLen = Math.sqrt(steerX * steerX + steerY * steerY);
      if (steerLen > this.maxForce) {
        steerX = (steerX / steerLen) * this.maxForce;
        steerY = (steerY / steerLen) * this.maxForce;
      }
      return [steerX, steerY];
    }
    return [0, 0];
  }

  // Rule 2: Cohesion (Swim toward the center of mass of neighbors)
  cohere(allFish) {
    let sumX = 0;
    let sumY = 0;
    let count = 0;
    const neighborDist = 120;

    allFish.forEach(other => {
      if (other.id === this.id) return;
      const dx = this.x - other.x;
      const dy = this.y - other.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < neighborDist) {
        sumX += other.x;
        sumY += other.y;
        count++;
      }
    });

    if (count > 0) {
      sumX /= count;
      sumY /= count;
      return this.steerTowards(sumX, sumY);
    }
    return [0, 0];
  }

  // Rule 3: Separation (Keep spacing from extremely close neighbors)
  separate(allFish) {
    let steerX = 0;
    let steerY = 0;
    let count = 0;
    const desiredSeparation = 38;

    allFish.forEach(other => {
      if (other.id === this.id) return;
      const dx = this.x - other.x;
      const dy = this.y - other.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < desiredSeparation && dist > 0) {
        // Force inversely proportional to distance
        const forceX = dx / dist / dist;
        const forceY = dy / dist / dist;
        steerX += forceX;
        steerY += forceY;
        count++;
      }
    });

    if (count > 0) {
      steerX /= count;
      steerY /= count;
      
      const steerLen = Math.sqrt(steerX * steerX + steerY * steerY);
      if (steerLen > 0) {
        steerX = (steerX / steerLen) * this.maxSpeed;
        steerY = (steerY / steerLen) * this.maxSpeed;
        
        steerX -= this.vx;
        steerY -= this.vy;
        
        const finalLen = Math.sqrt(steerX * steerX + steerY * steerY);
        if (finalLen > this.maxForce * 1.5) {
          steerX = (steerX / finalLen) * this.maxForce * 1.5;
          steerY = (steerY / finalLen) * this.maxForce * 1.5;
        }
      }
    }
    return [steerX, steerY];
  }
}

// 3. Jellyfish Entity
export class Jellyfish {
  constructor(x, y) {
    this.x = x || Math.random() * window.innerWidth;
    this.y = y || Math.random() * window.innerHeight * 0.5 + window.innerHeight * 0.3;
    this.radius = Math.random() * 8 + 18; // 18px to 26px
    this.scale = this.radius / 22;
    
    // Unique slow pulsating dynamics
    this.pulseCycle = Math.random() * Math.PI * 2;
    this.pulseSpeed = Math.random() * 0.02 + 0.015;
    
    this.vx = (Math.random() - 0.5) * 0.3;
    this.vy = -0.3; // Gentle natural drift upward
    
    // Tentacles joints (for fluid drag physics)
    this.tentacles = [];
    const tentacleCount = 5;
    for (let t = 0; t < tentacleCount; t++) {
      const joints = [];
      const jointCount = Math.floor(Math.random() * 4) + 6; // 6-9 joints
      const startOffset = ((t / (tentacleCount - 1)) - 0.5) * (this.radius * 1.2);
      
      for (let j = 0; j < jointCount; j++) {
        joints.push({
          x: this.x + startOffset,
          y: this.y + (j * 8),
          ox: startOffset // original offset from center
        });
      }
      this.tentacles.push(joints);
    }
    
    // Beautiful color styles
    this.hue = Math.random() * 60 + 270; // 270 to 330 (Purple to Pink/Magenta)
    this.color = `hsla(${this.hue}, 95%, 65%, 0.55)`;
    this.glowColor = `hsla(${this.hue}, 95%, 70%, 0.8)`;
  }

  update(width, height, mouse, ripples, stormActive) {
    // 1. Pulsing physics
    this.pulseCycle += this.pulseSpeed * (stormActive ? 1.4 : 1.0);
    
    // The contraction phase propels the jellyfish
    const bellPulse = Math.sin(this.pulseCycle);
    
    if (bellPulse > 0.7) {
      // Contraction phase - push up and in
      this.vy = -0.85 * this.scale * (stormActive ? 1.3 : 1.0);
      this.vx += (Math.random() - 0.5) * 0.12;
    } else {
      // Rest/drift phase - sink slowly
      this.vy += 0.012;
      this.vy = Math.min(0.25, this.vy);
    }

    this.y += this.vy;
    this.x += this.vx;
    
    // Friction
    this.vx *= 0.98;

    // React to ripples
    ripples.forEach(ripple => {
      const rdx = this.x - ripple.x;
      const rdy = this.y - ripple.y;
      const rdist = Math.sqrt(rdx * rdx + rdy * rdy);
      
      if (dist => 0 && rdist < ripple.radius + 60) {
        const force = (1 - (rdist / (ripple.radius + 60))) * 3.0;
        const angle = Math.atan2(rdy, rdx);
        this.x += Math.cos(angle) * force;
        this.y += Math.sin(angle) * force;
      }
    });

    // Flee mouse slightly
    const dx = this.x - mouse.x;
    const dy = this.y - mouse.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 100 && dist > 0) {
      const force = (100 - dist) / 100 * 0.8;
      const angle = Math.atan2(dy, dx);
      this.x += Math.cos(angle) * force;
      this.y += Math.sin(angle) * force;
    }

    // Wrap around sides, bounce off floor/surface
    if (this.x < -this.radius * 2) this.x = width + this.radius * 2;
    if (this.x > width + this.radius * 2) this.x = -this.radius * 2;
    if (this.y < 120) {
      this.y = 120;
      this.vy = 0.1;
    }
    if (this.y > height - 60) {
      this.y = height - 60;
      this.vy = -0.3;
    }

    // 2. Tentacles dynamic drag update
    const wave = Math.sin(this.pulseCycle * 2) * 2.5;
    
    this.tentacles.forEach(joints => {
      // First joint attached to jellyfish bell
      const first = joints[0];
      first.x = this.x + first.ox;
      first.y = this.y + (this.radius * 0.4);

      // Subsequent joints follow the one before them with delay
      for (let j = 1; j < joints.length; j++) {
        const prev = joints[j - 1];
        const curr = joints[j];
        
        // Sway wave effect
        const targetX = prev.x + Math.sin(this.pulseCycle + j * 0.8) * 0.8 + wave * 0.2;
        const targetY = prev.y + 7 * this.scale;
        
        curr.x += (targetX - curr.x) * 0.25;
        curr.y += (targetY - curr.y) * 0.25;
      }
    });
  }

  draw(ctx, dayState) {
    ctx.save();
    
    // Pulsing bell expansion scaling
    const bellPulse = Math.sin(this.pulseCycle);
    const expandX = 1 + (bellPulse > 0.7 ? -0.15 : (bellPulse < -0.3 ? 0.08 : 0));
    const expandY = 1 + (bellPulse > 0.7 ? 0.12 : (bellPulse < -0.3 ? -0.05 : 0));

    // Glow effects
    ctx.shadowBlur = dayState === 'night' ? 18 : 8;
    ctx.shadowColor = this.glowColor;
    
    // 1. Draw tentacles first so they drag behind the bell layer
    ctx.lineWidth = 1.2 * this.scale;
    ctx.strokeStyle = this.color;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    this.tentacles.forEach(joints => {
      ctx.beginPath();
      ctx.moveTo(joints[0].x, joints[0].y);
      for (let j = 1; j < joints.length; j++) {
        ctx.lineTo(joints[j].x, joints[j].y);
      }
      ctx.stroke();
    });

    // 2. Draw Translucent Pulsing Bell
    ctx.translate(this.x, this.y);
    ctx.scale(this.scale * expandX, this.scale * expandY);

    const grad = ctx.createRadialGradient(0, -5, 2, 0, 0, this.radius);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
    grad.addColorStop(0.35, this.color);
    grad.addColorStop(0.9, `hsla(${this.hue}, 95%, 45%, 0.35)`);
    grad.addColorStop(1, 'rgba(255, 255, 255, 0.0)');

    ctx.beginPath();
    // Beautiful dome shape
    ctx.arc(0, 0, this.radius, Math.PI, 0, false);
    ctx.bezierCurveTo(this.radius * 0.7, this.radius * 0.35, this.radius * 0.3, this.radius * 0.5, 0, this.radius * 0.25);
    ctx.bezierCurveTo(-this.radius * 0.3, this.radius * 0.5, -this.radius * 0.7, this.radius * 0.35, -this.radius, 0);
    ctx.fillStyle = grad;
    ctx.fill();

    // 3. Bell Rim Highlights
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, Math.PI, 0, false);
    ctx.strokeStyle = `rgba(255,255,255,${dayState === 'night' ? 0.75 : 0.4})`;
    ctx.lineWidth = 1.0;
    ctx.stroke();

    ctx.restore();
  }
}

// 4. Manta Ray Entity
export class MantaRay {
  constructor(x, y) {
    this.x = x || Math.random() * window.innerWidth;
    // Glides slowly near bottom
    this.y = y || window.innerHeight - 150 - Math.random() * 80;
    
    this.scale = Math.random() * 0.25 + 0.85; // 0.85 to 1.1 (Large!)
    
    this.vx = Math.random() * 0.4 + 0.45; // Glides right
    if (Math.random() > 0.5) this.vx = -this.vx; // Or glides left
    this.vy = 0;
    
    this.flapCycle = Math.random() * 100;
    this.flapSpeed = 0.038;
    this.targetY = this.y;
    
    this.bodyColor = '#161d2d'; // Dark slate blue navy
    this.bellyColor = '#eef3fa'; // Off white belly
  }

  update(width, height, mouse, ripples, stormActive) {
    const stormMult = stormActive ? 1.4 : 1.0;
    this.flapCycle += this.flapSpeed * stormMult;

    // Smooth horizontal glide
    this.x += this.vx * stormMult;
    
    // Slow undulations up and down
    this.y = this.targetY + Math.sin(this.flapCycle * 0.5) * 16;

    // React to ripples
    ripples.forEach(ripple => {
      const dx = this.x - ripple.x;
      const dy = this.y - ripple.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < ripple.radius + 120 && dist > 0) {
        const force = (1 - (dist / (ripple.radius + 120))) * 1.5;
        this.targetY += (dy > 0 ? force * 4 : -force * 4);
      }
    });

    // Screen wrapping with turnaround delay
    if (this.vx > 0 && this.x > width + 150) {
      this.x = -150;
      this.targetY = height - 150 - Math.random() * 80;
    } else if (this.vx < 0 && this.x < -150) {
      this.x = width + 150;
      this.targetY = height - 150 - Math.random() * 80;
    }

    // Keep within bottom range boundaries
    this.targetY = Math.max(height - 300, Math.min(height - 110, this.targetY));
  }

  draw(ctx, dayState) {
    ctx.save();
    ctx.translate(this.x, this.y);
    
    // Orient drawing based on movement direction
    if (this.vx < 0) ctx.scale(-this.scale, this.scale);
    else ctx.scale(this.scale, this.scale);

    const flap = Math.sin(this.flapCycle) * 0.45; // Wing flap factor (-0.45 to 0.45)

    // Shadow below
    ctx.shadowBlur = 12;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';

    // 1. Draw Tail Whiplash (Thin, long line behind)
    ctx.beginPath();
    ctx.moveTo(-25, 0);
    ctx.quadraticCurveTo(-45, 2 + Math.sin(this.flapCycle) * 3, -80, 0);
    ctx.strokeStyle = '#0e1320';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // 2. Draw Pectoral Wings (Dynamic flapping)
    // Left Wing (flapped up/down using matrix distort)
    ctx.beginPath();
    ctx.moveTo(25, 0);
    // Tip of top wing
    ctx.bezierCurveTo(8, -12 - flap * 24, -12, -18 - flap * 28, -25, -2 - flap * 6);
    ctx.bezierCurveTo(-15, 6, 8, 8, 25, 0);
    
    // Top-wing gradient
    const topGrad = ctx.createLinearGradient(0, -25, 0, 20);
    topGrad.addColorStop(0, '#0c101b');
    topGrad.addColorStop(0.7, this.bodyColor);
    topGrad.addColorStop(1, '#2c3b59');
    
    ctx.fillStyle = topGrad;
    ctx.fill();

    // 3. Draw Main Body Diamond
    ctx.beginPath();
    ctx.moveTo(35, 0); // Head snout
    ctx.bezierCurveTo(20, -14, -15, -16, -26, 0); // Upper arch
    ctx.bezierCurveTo(-15, 14, 20, 14, 35, 0); // Lower arch
    ctx.fillStyle = this.bodyColor;
    ctx.fill();

    // Cephalic Horns (Snout fins at the front)
    ctx.beginPath();
    ctx.moveTo(30, -5);
    ctx.quadraticCurveTo(39, -6, 42, -2);
    ctx.quadraticCurveTo(38, 2, 32, 1);
    ctx.fillStyle = '#101622';
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(30, 5);
    ctx.quadraticCurveTo(39, 6, 42, 2);
    ctx.quadraticCurveTo(38, -2, 32, -1);
    ctx.fillStyle = '#101622';
    ctx.fill();

    // Speckled white pattern dots on the Manta's back (makes it look premium)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.beginPath();
    ctx.arc(-10, -5, 1.2, 0, Math.PI*2);
    ctx.arc(-14, -2, 1.4, 0, Math.PI*2);
    ctx.arc(-8, 4, 1.0, 0, Math.PI*2);
    ctx.arc(-15, 3, 1.3, 0, Math.PI*2);
    ctx.arc(-18, 0, 1.5, 0, Math.PI*2);
    ctx.fill();

    if (dayState === 'night') {
      // Glowing bio dots along wings
      ctx.fillStyle = '#00f2fe';
      ctx.shadowColor = '#00f2fe';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(-2, -12, 1.0, 0, Math.PI*2);
      ctx.arc(-8, -16, 1.0, 0, Math.PI*2);
      ctx.arc(-12, -20, 1.2, 0, Math.PI*2);
      ctx.fill();
    }

    ctx.restore();
  }
}

// 5. Sea Turtle Entity
export class SeaTurtle {
  constructor(x, y) {
    this.x = x || -100;
    this.y = y || Math.random() * window.innerHeight * 0.4 + 180;
    this.scale = Math.random() * 0.15 + 0.75; // 0.75 to 0.9
    
    // Slow majestic speed
    this.vx = Math.random() * 0.3 + 0.45; // Swims right
    this.vy = (Math.random() - 0.5) * 0.15;
    
    this.paddleCycle = Math.random() * Math.PI * 2;
    this.paddleSpeed = 0.024;
    
    this.shellColor = '#244d24'; // deep green forest shell
    this.skinColor = '#7ca868'; // pale turtle green skin
  }

  update(width, height, mouse, ripples, stormActive) {
    const stormMult = stormActive ? 1.35 : 1.0;
    this.paddleCycle += this.paddleSpeed * stormMult;

    this.x += this.vx * stormMult;
    this.y += this.vy * stormMult;

    // Small sine adjustments
    this.vy = Math.sin(this.paddleCycle) * 0.15;

    // Slow avoid mouse
    const dx = this.x - mouse.x;
    const dy = this.y - mouse.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 150 && dist > 0) {
      const angle = Math.atan2(dy, dx);
      this.vy += Math.sin(angle) * 0.05;
      this.x += Math.cos(angle) * 0.18;
    }

    // Keep away from surface wave zone and floor
    if (this.y < 150) this.y = 150;
    if (this.y > height - 160) this.y = height - 160;

    // Reset when offscreen
    if (this.x > width + 180) {
      this.x = -150;
      this.y = Math.random() * height * 0.4 + 180;
      this.vx = Math.random() * 0.3 + 0.45;
    }
  }

  draw(ctx, dayState) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(this.scale, this.scale);
    
    // Slight roll tilt depending on swimming velocity
    ctx.rotate(this.vy * 0.8);

    const padStroke = Math.sin(this.paddleCycle) * 0.65; // Flippers swing

    // 1. Rear Flippers
    ctx.fillStyle = this.skinColor;
    ctx.beginPath();
    ctx.ellipse(-22, -10, 10, 5, -0.4 + padStroke * 0.3, 0, Math.PI * 2);
    ctx.ellipse(-22, 10, 10, 5, 0.4 - padStroke * 0.3, 0, Math.PI * 2);
    ctx.fill();

    // 2. Tiny Tail
    ctx.beginPath();
    ctx.moveTo(-28, 0);
    ctx.lineTo(-35, 0);
    ctx.lineTo(-26, 4);
    ctx.fill();

    // 3. Giant Front Paddles (Large sweep angle)
    ctx.save();
    ctx.translate(14, -8);
    ctx.rotate(-0.8 + padStroke); // Sweep flipper
    ctx.beginPath();
    ctx.ellipse(0, -18, 22, 7, -0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(14, 8);
    ctx.rotate(0.8 - padStroke);
    ctx.beginPath();
    ctx.ellipse(0, 18, 22, 7, 0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 4. Head
    ctx.beginPath();
    ctx.ellipse(32, 0, 10, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    // Eye
    ctx.beginPath();
    ctx.arc(35, -3, 1.2, 0, Math.PI * 2);
    ctx.fillStyle = '#0a1a0a';
    ctx.fill();

    // 5. Majestic Domed Shell (Carapace)
    const shellGrad = ctx.createRadialGradient(-4, 0, 2, -2, 0, 28);
    shellGrad.addColorStop(0, '#557a2b'); // Light green-brown core
    shellGrad.addColorStop(0.65, this.shellColor);
    shellGrad.addColorStop(1, '#0e240e'); // Deep shadow border
    
    ctx.fillStyle = shellGrad;
    ctx.beginPath();
    ctx.ellipse(-2, 0, 28, 20, 0, 0, Math.PI * 2);
    ctx.fill();

    // Hexagonal plate rings drawing overlay (makes turtle shell look realistic!)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.ellipse(-2, 0, 20, 14, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Spine radial segments
    for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 4) {
      ctx.beginPath();
      ctx.moveTo(-2 + Math.cos(angle) * 20, Math.sin(angle) * 14);
      ctx.lineTo(-2 + Math.cos(angle) * 28, Math.sin(angle) * 20);
      ctx.stroke();
    }

    if (dayState === 'night') {
      // Glow shell seams
      ctx.strokeStyle = 'rgba(0, 242, 254, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#00f2fe';
      ctx.stroke();
    }

    ctx.restore();
  }
}
