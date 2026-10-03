/**
 * CollabPEAS - 2D Interactive House Canvas
 * Renders the 2D Apartment blueprint (Apartment.png), operator avatar with arrow-key
 * locomotion, autonomous cleaning robot, roaming cat, interactive stations, and environmental tags.
 */

import { appState } from '../state.js';

export class HouseCanvasRenderer {
  constructor(canvasElement, world) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.world = world;

    // Load background blueprint image
    this.bgImage = new Image();
    this.bgLoaded = false;
    this.bgImage.src = 'assets/Apartment.png';
    this.bgImage.onload = () => {
      this.bgLoaded = true;
    };

    // Keyboard state for avatar movement
    this.keys = {
      ArrowUp: false,
      ArrowDown: false,
      ArrowLeft: false,
      ArrowRight: false,
      w: false,
      s: false,
      a: false,
      d: false
    };

    // Camera viewport
    this.camera = { x: 0, y: 0, scale: 0.72 };
    this.animFrame = null;
    this.walkCycle = 0;

    // Stations in the house that open steps when operator is near
    this.stations = [
      { step: 1, name: 'Station 1: Purpose & Metrics', x: 440, y: 160, radius: 45, icon: '🎯' },
      { step: 2, name: 'Station 2: Sensors Workbench', x: 500, y: 460, radius: 45, icon: '📡' },
      { step: 3, name: 'Station 3: Actuator Assembly Bay', x: 740, y: 460, radius: 45, icon: '🦾' },
      { step: 4, name: 'Station 4: Logic & Vibe Coding', x: 340, y: 380, radius: 45, icon: '🧩' },
      { step: 5, name: 'Station 5: Observation & Debug', x: 620, y: 280, radius: 45, icon: '🔬' }
    ];

    this.activeStationPrompt = null;
    this.hoveredTag = null;

    this.initControls();
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
    this.startLoop();
  }

  resizeCanvas() {
    const parent = this.canvas.parentElement;
    if (parent) {
      this.canvas.width = parent.clientWidth || 900;
      this.canvas.height = parent.clientHeight || 650;
      // Auto-fit scale
      const scaleX = this.canvas.width / this.world.width;
      const scaleY = this.canvas.height / this.world.height;
      this.camera.scale = Math.min(scaleX, scaleY) * 1.05;
      this.camera.x = (this.canvas.width - this.world.width * this.camera.scale) / 2;
      this.camera.y = (this.canvas.height - this.world.height * this.camera.scale) / 2;
    }
  }

  initControls() {
    window.addEventListener('keydown', (e) => {
      if (this.keys.hasOwnProperty(e.key)) {
        this.keys[e.key] = true;
        e.preventDefault();
      }
      if (e.key === ' ' && this.activeStationPrompt) {
        appState.setStep(this.activeStationPrompt.step);
        e.preventDefault();
      }
    });

    window.addEventListener('keyup', (e) => {
      if (this.keys.hasOwnProperty(e.key)) {
        this.keys[e.key] = false;
      }
    });

    // Mouse click to navigate avatar or activate station
    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const clickX = (e.clientX - rect.left - this.camera.x) / this.camera.scale;
      const clickY = (e.clientY - rect.top - this.camera.y) / this.camera.scale;

      // Check click on station
      for (const st of this.stations) {
        if (Math.hypot(clickX - st.x, clickY - st.y) < st.radius + 15) {
          appState.setStep(st.step);
          return;
        }
      }

      // Check click on inspection tags
      for (const tag of this.world.inspectionTags) {
        if (Math.hypot(clickX - tag.x, clickY - tag.y) < 25) {
          this.hoveredTag = tag;
          appState.notify('tagInspected', tag);
          return;
        }
      }

      // Direct operator walking towards click
      this.world.avatar.targetX = clickX;
      this.world.avatar.targetY = clickY;
    });
  }

  startLoop() {
    const loop = () => {
      this.updateAvatar();
      this.render();
      this.animFrame = requestAnimationFrame(loop);
    };
    this.animFrame = requestAnimationFrame(loop);
  }

  stopLoop() {
    if (this.animFrame) {
      cancelAnimationFrame(this.animFrame);
    }
  }

  updateAvatar() {
    const avatar = this.world.avatar;
    let dx = 0;
    let dy = 0;

    if (this.keys.ArrowUp || this.keys.w) dy -= 1;
    if (this.keys.ArrowDown || this.keys.s) dy += 1;
    if (this.keys.ArrowLeft || this.keys.a) dx -= 1;
    if (this.keys.ArrowRight || this.keys.d) dx += 1;

    if (dx !== 0 || dy !== 0) {
      avatar.targetX = null;
      avatar.targetY = null;
      const len = Math.hypot(dx, dy);
      dx = (dx / len) * avatar.speed;
      dy = (dy / len) * avatar.speed;

      const nx = avatar.x + dx;
      const ny = avatar.y + dy;

      if (!this.world.checkCollision(nx, ny, avatar.radius)) {
        avatar.x = nx;
        avatar.y = ny;
        avatar.heading = Math.atan2(dy, dx);
        avatar.moving = true;
        this.walkCycle += 0.2;
      }
    } else if (avatar.targetX !== null && avatar.targetY !== null) {
      const tdx = avatar.targetX - avatar.x;
      const tdy = avatar.targetY - avatar.y;
      const dist = Math.hypot(tdx, tdy);
      if (dist > 4) {
        const nx = avatar.x + (tdx / dist) * avatar.speed;
        const ny = avatar.y + (tdy / dist) * avatar.speed;
        if (!this.world.checkCollision(nx, ny, avatar.radius)) {
          avatar.x = nx;
          avatar.y = ny;
          avatar.heading = Math.atan2(tdy, tdx);
          avatar.moving = true;
          this.walkCycle += 0.2;
        } else {
          avatar.targetX = null;
        }
      } else {
        avatar.moving = false;
        avatar.targetX = null;
      }
    } else {
      avatar.moving = false;
    }

    // Check proximity to stations
    this.activeStationPrompt = null;
    for (const st of this.stations) {
      const dist = Math.hypot(avatar.x - st.x, avatar.y - st.y);
      if (dist < st.radius + 20) {
        this.activeStationPrompt = st;
        break;
      }
    }
  }

  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.save();
    ctx.translate(this.camera.x, this.camera.y);
    ctx.scale(this.camera.scale, this.camera.scale);

    // 1. Draw Blueprint Background Image (Apartment.png)
    if (this.bgLoaded) {
      ctx.drawImage(this.bgImage, 0, 0, this.world.width, this.world.height);
    } else {
      // Fallback architectural background
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, this.world.width, this.world.height);
    }

    // 2. Room Zone Ambient Highlights
    this.renderRoomOverlays(ctx);

    // 3. Charging Dock & Smart Bin
    this.renderFurnitureTargets(ctx);

    // 4. Dirt Cells & Wet Spills
    this.renderFloorCells(ctx);

    // 5. Scattered Objects
    this.renderObjects(ctx);

    // 6. Interactive Stations in the House
    this.renderStations(ctx);

    // 7. Environment Inspection Tags (Step 2A)
    this.renderInspectionTags(ctx);

    // 8. Roaming Cat NPC
    this.renderCat(ctx);

    // 9. Cleaning Robot (with mounted sensor modules & traces)
    this.renderRobot(ctx);

    // 10. Operator Avatar (Controlled by Arrow Keys)
    this.renderAvatar(ctx);

    ctx.restore();

    // 11. Screen-Space UI Overlays (Proximity Action Prompt, Controls Help)
    this.renderHudOverlays(ctx);
  }

  renderRoomOverlays(ctx) {
    ctx.save();
    for (const r of this.world.rooms) {
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.15)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(r.x, r.y, r.width, r.height);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.fillRect(r.x, r.y, r.width, r.height);

      // Room Name
      ctx.fillStyle = 'rgba(203, 213, 225, 0.4)';
      ctx.font = '12px Inter, sans-serif';
      ctx.fillText(r.name.toUpperCase(), r.x + 10, r.y + 20);
    }
    ctx.restore();
  }

  renderFurnitureTargets(ctx) {
    // Charging Dock
    const dock = this.world.dock;
    ctx.save();
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 2;
    ctx.fillRect(dock.x - 25, dock.y - 15, dock.width, dock.height);
    ctx.strokeRect(dock.x - 25, dock.y - 15, dock.width, dock.height);

    // Contact Pins
    ctx.fillStyle = '#facc15';
    ctx.fillRect(dock.x - 12, dock.y + 15, 8, 8);
    ctx.fillRect(dock.x + 4, dock.y + 15, 8, 8);

    ctx.fillStyle = '#fef08a';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('⚡ DOCK', dock.x - 20, dock.y + 6);
    ctx.restore();

    // Smart Trash Bin
    const bin = this.world.smartBin;
    ctx.save();
    ctx.fillStyle = '#334155';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(bin.x, bin.y, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px sans-serif';
    ctx.fillText('🗑️', bin.x - 7, bin.y + 5);
    ctx.restore();
  }

  renderFloorCells(ctx) {
    // Dirt Cells
    for (const d of this.world.dirtCells) {
      if (!d.cleaned) {
        ctx.save();
        ctx.fillStyle = 'rgba(120, 53, 15, 0.65)';
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.radius, 0, Math.PI * 2);
        ctx.fill();

        // Dirt speckles
        ctx.fillStyle = 'rgba(69, 26, 3, 0.85)';
        ctx.fillRect(d.x - 4, d.y - 3, 3, 3);
        ctx.fillRect(d.x + 3, d.y + 2, 2, 2);
        ctx.fillRect(d.x, d.y + 4, 3, 2);
        ctx.restore();
      }
    }

    // Wet Spills
    for (const w of this.world.wetCells) {
      if (!w.cleaned) {
        ctx.save();
        ctx.fillStyle = 'rgba(56, 189, 248, 0.55)';
        ctx.strokeStyle = 'rgba(186, 230, 253, 0.85)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(w.x, w.y, w.radius * 1.3, w.radius * 0.9, 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = '14px sans-serif';
        ctx.fillText('💧', w.x - 7, w.y + 5);
        ctx.restore();
      }
    }
  }

  renderObjects(ctx) {
    for (const obj of this.world.objects) {
      if (!obj.disposed) {
        ctx.save();
        ctx.fillStyle = '#1e293b';
        ctx.strokeStyle = obj.type === 'TRASH' ? '#f43f5e' : '#10b981';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(obj.x, obj.y, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.font = '14px sans-serif';
        ctx.fillText(obj.icon, obj.x - 7, obj.y + 5);

        ctx.fillStyle = '#e2e8f0';
        ctx.font = '10px Inter, sans-serif';
        ctx.fillText(obj.name, obj.x - 20, obj.y + 22);
        ctx.restore();
      }
    }
  }

  renderStations(ctx) {
    for (const st of this.stations) {
      ctx.save();
      const isCurrent = appState.currentStep === st.step;
      const isNearby = this.activeStationPrompt === st;

      // Glow halo
      ctx.strokeStyle = isCurrent ? '#38bdf8' : isNearby ? '#facc15' : 'rgba(148, 163, 184, 0.4)';
      ctx.fillStyle = isCurrent ? 'rgba(56, 189, 248, 0.15)' : 'rgba(15, 23, 42, 0.65)';
      ctx.lineWidth = isNearby ? 3 : 2;

      ctx.beginPath();
      ctx.arc(st.x, st.y, st.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Icon & Name
      ctx.font = '20px sans-serif';
      ctx.fillText(st.icon, st.x - 10, st.y - 5);

      ctx.fillStyle = isCurrent ? '#38bdf8' : '#e2e8f0';
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`Step ${st.step}`, st.x, st.y + 16);

      ctx.restore();
    }
  }

  renderInspectionTags(ctx) {
    // Only show prominent tags in Step 2 or when roaming
    for (const tag of this.world.inspectionTags) {
      ctx.save();
      const isHovered = this.hoveredTag === tag;
      const distToAvatar = Math.hypot(this.world.avatar.x - tag.x, this.world.avatar.y - tag.y);
      const isClose = distToAvatar < 60;

      ctx.fillStyle = isClose ? '#facc15' : '#38bdf8';
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(tag.x, tag.y, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.font = '12px sans-serif';
      ctx.fillText(tag.icon, tag.x - 6, tag.y + 4);

      if (isClose || isHovered || appState.currentStep === 2) {
        // Speech tag card
        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 1.5;
        const text = tag.dimension;
        ctx.font = 'bold 11px Inter, sans-serif';
        const w = ctx.measureText(text).width + 16;
        ctx.fillRect(tag.x - w / 2, tag.y - 38, w, 22);
        ctx.strokeRect(tag.x - w / 2, tag.y - 38, w, 22);

        ctx.fillStyle = '#fef08a';
        ctx.textAlign = 'center';
        ctx.fillText(text, tag.x, tag.y - 23);
      }
      ctx.restore();
    }
  }

  renderCat(ctx) {
    const cat = this.world.cat;
    ctx.save();
    ctx.translate(cat.x, cat.y);
    ctx.rotate(cat.heading);

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(0, 3, cat.radius * 1.1, cat.radius * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body (warm orange cat)
    ctx.fillStyle = '#ea580c';
    ctx.beginPath();
    ctx.ellipse(0, 0, cat.radius, cat.radius * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Head
    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    ctx.arc(10, 0, 9, 0, Math.PI * 2);
    ctx.fill();

    // Ears
    ctx.fillStyle = '#ea580c';
    ctx.beginPath();
    ctx.moveTo(12, -7);
    ctx.lineTo(16, -12);
    ctx.lineTo(8, -8);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(12, 7);
    ctx.lineTo(16, 12);
    ctx.lineTo(8, 8);
    ctx.fill();

    // Tail swinging
    ctx.strokeStyle = '#ea580c';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-10, 0);
    const tailAngle = Math.sin(Date.now() / 150) * 8;
    ctx.quadraticCurveTo(-18, tailAngle, -24, tailAngle * 0.5);
    ctx.stroke();

    ctx.restore();

    // Dynamic obstacle tag
    ctx.fillStyle = '#ffedd5';
    ctx.font = 'bold 10px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🐱 Roaming Cat', cat.x, cat.y - 18);
  }

  renderRobot(ctx) {
    const robot = this.world.robot;
    const installed = appState.installedSensors;

    ctx.save();
    ctx.translate(robot.x, robot.y);

    // 1. Sonar Radar Rings (if SENSE_04 is installed)
    if (installed.has('SENSE_04')) {
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 4]);
      ctx.beginPath();
      ctx.arc(0, 0, 60, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, 90, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 2. Undercarriage Glow LED
    ctx.fillStyle = robot.ledColor;
    ctx.beginPath();
    ctx.arc(0, 0, robot.radius + 6, 0, Math.PI * 2);
    ctx.fill();

    // Rotate chassis
    ctx.rotate(robot.heading);

    // Main Chassis
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, robot.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Drive Wheels
    ctx.fillStyle = '#475569';
    ctx.fillRect(-8, -robot.radius - 3, 16, 5);
    ctx.fillRect(-8, robot.radius - 2, 16, 5);

    // Front Camera / Vision Eyes (if SENSE_15 installed)
    if (installed.has('SENSE_15')) {
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(12, -5, 3.5, 0, Math.PI * 2);
      ctx.arc(12, 5, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Mechanical Arm (if extended)
    if (robot.armExtended) {
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(14, 0);
      ctx.lineTo(28, 0);
      ctx.stroke();

      // Gripper Claw
      ctx.strokeStyle = robot.gripperClosed ? '#10b981' : '#f59e0b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(28, -6);
      ctx.lineTo(34, -2);
      ctx.moveTo(28, 6);
      ctx.lineTo(34, 2);
      ctx.stroke();
    }

    // Facing Direction Arrow
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(2, 0);
    ctx.lineTo(12, 0);
    ctx.stroke();

    ctx.restore();

    // Overhead HUD / Trace Pill
    const trace = robot.traceState;
    if (trace && trace.action) {
      ctx.save();
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 1.5;
      const text = `⚙️ ${trace.action}`;
      ctx.font = 'bold 10px Inter, sans-serif';
      const tw = ctx.measureText(text).width + 14;
      ctx.fillRect(robot.x - tw / 2, robot.y - 36, tw, 18);
      ctx.strokeRect(robot.x - tw / 2, robot.y - 36, tw, 18);

      ctx.fillStyle = '#6ee7b7';
      ctx.textAlign = 'center';
      ctx.fillText(text, robot.x, robot.y - 23);
      ctx.restore();
    } else {
      ctx.fillStyle = '#93c5fd';
      ctx.font = 'bold 10px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`🤖 Robot (${Math.round(robot.battery)}%)`, robot.x, robot.y - 26);
    }
  }

  renderAvatar(ctx) {
    const avatar = this.world.avatar;
    const isLead = appState.activePlayerId === 'Player A';

    ctx.save();
    ctx.translate(avatar.x, avatar.y);

    // 2-Meter Proximity Halo
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.3)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(0, 0, 75, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Feet animation
    if (avatar.moving) {
      const legOffset = Math.sin(this.walkCycle) * 6;
      ctx.fillStyle = '#334155';
      ctx.fillRect(-7 + legOffset, -6, 5, 12);
      ctx.fillRect(2 - legOffset, -6, 5, 12);
    }

    // Rotate torso
    ctx.rotate(avatar.heading);

    // Body
    ctx.fillStyle = isLead ? '#2563eb' : '#7c3aed';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, avatar.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Direction Visor
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(avatar.radius - 4, -4, 6, 8);

    ctx.restore();

    // Overhead Player Tag
    ctx.fillStyle = isLead ? '#bfdbfe' : '#ddd6fe';
    ctx.font = 'bold 11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`👤 ${appState.activePlayerId} (You)`, avatar.x, avatar.y - 24);
  }

  renderHudOverlays(ctx) {
    // 1. Proximity Station Prompt
    if (this.activeStationPrompt) {
      const st = this.activeStationPrompt;
      ctx.save();
      const msg = `⚡ Press [SPACE] or Click to enter ${st.name}`;
      ctx.font = 'bold 14px Inter, sans-serif';
      const w = ctx.measureText(msg).width + 36;
      const x = (this.canvas.width - w) / 2;
      const y = this.canvas.height - 45;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2;
      ctx.fillRect(x, y, w, 36);
      ctx.strokeRect(x, y, w, 36);

      ctx.fillStyle = '#fef08a';
      ctx.textAlign = 'left';
      ctx.fillText(msg, x + 18, y + 23);
      ctx.restore();
    }

    // 2. Keyboard Control Hints (Bottom Left)
    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.3)';
    ctx.lineWidth = 1;
    ctx.fillRect(12, this.canvas.height - 42, 230, 30);
    ctx.strokeRect(12, this.canvas.height - 42, 230, 30);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '11px Inter, sans-serif';
    ctx.fillText('🎮 Move: Arrow Keys / WASD', 22, this.canvas.height - 23);
    ctx.restore();
  }
}
