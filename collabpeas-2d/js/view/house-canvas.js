/**
 * CollabPEAS - High-Definition Architectural 2D House Canvas Engine
 * Truly constructed vector floor plan based on Apartment.png with expanded rooms:
 * - Living Room, Kitchen, Dining Room, Master Bed, Luxury Bath, Corridor
 * - PLUS: Robot Assembly Workshop Bay, Sun Balcony & Terrace
 * - Fusion VR Training mechanics: Interactive Control Stand, Teleportation Pads, Magnetic Guides
 */

import { appState } from '../state.js';
import { sound } from './audio.js';

export class HouseCanvasRenderer {
  constructor(canvasElement, world) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.world = world;

    // Background 3D asset for hybrid mode
    this.bgImage = new Image();
    this.bgLoaded = false;
    this.bgImage.src = 'assets/Apartment.png';
    this.bgImage.onload = () => { this.bgLoaded = true; };

    // View mode: 'architectural' (crisp vector) or 'hybrid' (render + vector overlay)
    this.viewMode = 'architectural';

    // Keyboard state for avatar movement
    this.keys = {
      ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false,
      w: false, s: false, a: false, d: false
    };

    // Viewport camera
    this.camera = { x: 0, y: 0, scale: 0.75 };
    this.animFrame = null;
    this.walkCycle = 0;
    this.teleportRipple = null; // { x, y, radius, alpha }

    // Interactive Stations in the House (Step 1-5)
    this.stations = [
      { step: 1, name: 'Station 1: Purpose & Metrics', x: 440, y: 160, radius: 42, icon: '🎯' },
      { step: 2, name: 'Station 2: Sensors Workbench', x: 500, y: 460, radius: 42, icon: '📡' },
      { step: 3, name: 'Station 3: Actuator Assembly Bay', x: 800, y: 180, radius: 42, icon: '🦾' },
      { step: 4, name: 'Station 4: Logic & Vibe Coding', x: 340, y: 380, radius: 42, icon: '🧩' },
      { step: 5, name: 'Station 5: Observation & Debug', x: 620, y: 280, radius: 42, icon: '🔬' }
    ];

    this.activeStationPrompt = null;
    this.hoveredTeleport = null;
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
      const scaleX = this.canvas.width / this.world.width;
      const scaleY = this.canvas.height / this.world.height;
      this.camera.scale = Math.min(scaleX, scaleY) * 1.04;
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
        sound.playSnap();
        e.preventDefault();
      }
    });

    window.addEventListener('keyup', (e) => {
      if (this.keys.hasOwnProperty(e.key)) {
        this.keys[e.key] = false;
      }
    });

    // Mouse movement to detect hover on teleport pads or tags
    this.canvas.addEventListener('mousemove', (e) => {
      const { x, y } = this.screenToWorld(e.clientX, e.clientY);

      // Check hover on teleport pads
      this.hoveredTeleport = null;
      for (const tp of this.world.teleportMarkers) {
        if (Math.hypot(x - tp.x, y - tp.y) < 26) {
          this.hoveredTeleport = tp;
          this.canvas.style.cursor = 'pointer';
          return;
        }
      }

      // Check hover on stations
      for (const st of this.stations) {
        if (Math.hypot(x - st.x, y - st.y) < st.radius) {
          this.canvas.style.cursor = 'pointer';
          return;
        }
      }

      this.canvas.style.cursor = 'default';
    });

    // Mouse click to navigate avatar or activate station / teleport
    this.canvas.addEventListener('click', (e) => {
      const { x, y } = this.screenToWorld(e.clientX, e.clientY);

      // 1. Check Teleport Pad Click (Fusion VR Training mechanic)
      for (const tp of this.world.teleportMarkers) {
        if (Math.hypot(x - tp.x, y - tp.y) < 28) {
          this.teleportAvatar(tp.x, tp.y);
          return;
        }
      }

      // 2. Check Click on Stations
      for (const st of this.stations) {
        if (Math.hypot(x - st.x, y - st.y) < st.radius + 10) {
          appState.setStep(st.step);
          sound.playSnap();
          return;
        }
      }

      // 3. Check Click on Inspection Tags
      for (const tag of this.world.inspectionTags) {
        if (Math.hypot(x - tag.x, y - tag.y) < 24) {
          this.hoveredTag = tag;
          appState.notify('tagInspected', tag);
          sound.playClick();
          return;
        }
      }

      // 4. Click-to-move avatar
      this.world.avatar.targetX = x;
      this.world.avatar.targetY = y;
    });
  }

  screenToWorld(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left - this.camera.x) / this.camera.scale,
      y: (clientY - rect.top - this.camera.y) / this.camera.scale
    };
  }

  teleportAvatar(targetX, targetY) {
    this.world.avatar.x = targetX;
    this.world.avatar.y = targetY;
    this.world.avatar.targetX = null;
    this.world.avatar.targetY = null;
    this.teleportRipple = { x: targetX, y: targetY, radius: 10, alpha: 1.0 };
    sound.playChime();
  }

  toggleViewMode() {
    this.viewMode = this.viewMode === 'architectural' ? 'hybrid' : 'architectural';
    return this.viewMode;
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
        this.walkCycle += 0.22;
      }
    } else if (avatar.targetX !== null && avatar.targetY !== null) {
      const tdx = avatar.targetX - avatar.x;
      const tdy = avatar.targetY - avatar.y;
      const dist = Math.hypot(tdx, tdy);
      if (dist > 5) {
        const nx = avatar.x + (tdx / dist) * avatar.speed;
        const ny = avatar.y + (tdy / dist) * avatar.speed;
        if (!this.world.checkCollision(nx, ny, avatar.radius)) {
          avatar.x = nx;
          avatar.y = ny;
          avatar.heading = Math.atan2(tdy, tdx);
          avatar.moving = true;
          this.walkCycle += 0.22;
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

    // Update teleport ripple animation
    if (this.teleportRipple) {
      this.teleportRipple.radius += 2.5;
      this.teleportRipple.alpha -= 0.04;
      if (this.teleportRipple.alpha <= 0) {
        this.teleportRipple = null;
      }
    }
  }

  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.save();
    ctx.translate(this.camera.x, this.camera.y);
    ctx.scale(this.camera.scale, this.camera.scale);

    // 1. Draw Architectural Outer Grounding
    ctx.fillStyle = '#060910';
    ctx.fillRect(0, 0, this.world.width, this.world.height);

    // 2. Hybrid Mode: Blend original 3D render underneath
    if (this.viewMode === 'hybrid' && this.bgLoaded) {
      ctx.globalAlpha = 0.35;
      ctx.drawImage(this.bgImage, 0, 0, this.world.width, this.world.height);
      ctx.globalAlpha = 1.0;
    }

    // 3. Render Truly Constructed Floor Rooms & Vector Materials
    this.renderArchitecturalFloors(ctx);

    // 4. Render Architectural Windows & Sunbeams
    this.renderWindows(ctx);

    // 5. Render Architectural Structural Walls & Doorways
    this.renderArchitecturalWalls(ctx);

    // 6. Render Crisp Handcrafted Vector Furniture
    this.renderArchitecturalFurniture(ctx);

    // 7. Render Teleportation Target Markers (Fusion VR Training)
    this.renderTeleportPads(ctx);

    // 8. Render Interactive Control Stand (Fusion VR Training)
    this.renderControlStand(ctx);

    // 9. Render Interactive Stations in the House
    this.renderStations(ctx);

    // 10. Render Environmental Inspection Tags (Step 2A)
    this.renderInspectionTags(ctx);

    // 11. Render Floor Dirt Specks & Shimmering Spills
    this.renderFloorTargets(ctx);

    // 12. Render Scattered Objects (Trash & Belongings)
    this.renderScatteredObjects(ctx);

    // 13. Render Roaming Cat NPC
    this.renderCat(ctx);

    // 14. Render Autonomous Cleaning Robot
    this.renderRobot(ctx);

    // 15. Render Operator Avatar (Arrow Key Locomotion)
    this.renderAvatar(ctx);

    // 16. Render Teleportation Ripple Effect
    if (this.teleportRipple) {
      ctx.save();
      ctx.strokeStyle = `rgba(56, 189, 248, ${this.teleportRipple.alpha})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(this.teleportRipple.x, this.teleportRipple.y, this.teleportRipple.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();

    // 17. Screen-Space UI Overlays
    this.renderScreenOverlays(ctx);
  }

  // -----------------------------------------------------------------
  // 1. ARCHITECTURAL FLOORS & VECTOR MATERIALS
  // -----------------------------------------------------------------
  renderArchitecturalFloors(ctx) {
    for (const r of this.world.rooms) {
      ctx.save();

      // Base room fill
      ctx.fillStyle = r.color;
      ctx.fillRect(r.x, r.y, r.width, r.height);

      // Procedural Floor Patterns
      switch (r.floorStyle) {
        case 'herringbone_oak':
          this.drawHerringbonePattern(ctx, r.x, r.y, r.width, r.height, '#382a20', '#2d221a');
          break;
        case 'marble_tile':
          this.drawTileGrid(ctx, r.x, r.y, r.width, r.height, 40, '#242e3f', '#19202c');
          break;
        case 'walnut_parquet':
          this.drawParquetPattern(ctx, r.x, r.y, r.width, r.height, 36, '#2e231d', '#221914');
          break;
        case 'ash_hardwood':
          this.drawPlankPattern(ctx, r.x, r.y, r.width, r.height, 22, '#2b2630', '#1f1b23');
          break;
        case 'slate_stone':
          this.drawTileGrid(ctx, r.x, r.y, r.width, r.height, 48, '#232b36', '#171d25');
          break;
        case 'tech_grid':
          this.drawHexTechGrid(ctx, r.x, r.y, r.width, r.height, '#0284c7');
          break;
        case 'deck_plank':
          this.drawPlankPattern(ctx, r.x, r.y, r.width, r.height, 16, '#2a3328', '#1c241a');
          break;
        default:
          this.drawTileGrid(ctx, r.x, r.y, r.width, r.height, 30, '#26201b', '#1c1714');
      }

      // Ambient Room Glow & Label
      ctx.fillStyle = r.ambientLight;
      ctx.fillRect(r.x, r.y, r.width, r.height);

      // Architectural Room Stamp Label
      ctx.fillStyle = 'rgba(241, 245, 249, 0.45)';
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.letterSpacing = '1px';
      ctx.fillText(r.name.toUpperCase(), r.x + 14, r.y + 24);

      ctx.restore();
    }
  }

  drawTileGrid(ctx, x, y, w, h, size, strokeColor, fillColor) {
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 1;
    for (let px = x; px < x + w; px += size) {
      ctx.beginPath();
      ctx.moveTo(px, y);
      ctx.lineTo(px, y + h);
      ctx.stroke();
    }
    for (let py = y; py < y + h; py += size) {
      ctx.beginPath();
      ctx.moveTo(x, py);
      ctx.lineTo(x + w, py);
      ctx.stroke();
    }
  }

  drawPlankPattern(ctx, x, y, w, h, plankWidth, color1, color2) {
    ctx.lineWidth = 1;
    let toggle = false;
    for (let px = x; px < x + w; px += plankWidth) {
      ctx.fillStyle = toggle ? color1 : color2;
      ctx.fillRect(px, y, plankWidth, h);
      ctx.strokeStyle = 'rgba(0,0,0,0.25)';
      ctx.strokeRect(px, y, plankWidth, h);
      toggle = !toggle;
    }
  }

  drawParquetPattern(ctx, x, y, w, h, size, color1, color2) {
    for (let px = x; px < x + w; px += size) {
      for (let py = y; py < y + h; py += size) {
        ctx.fillStyle = ((px / size + py / size) % 2 === 0) ? color1 : color2;
        ctx.fillRect(px, py, size, size);
        ctx.strokeStyle = 'rgba(0,0,0,0.15)';
        ctx.strokeRect(px, py, size, size);
      }
    }
  }

  drawHerringbonePattern(ctx, x, y, w, h, strokeColor, shade) {
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 1;
    const step = 28;
    for (let px = x - h; px < x + w + h; px += step) {
      ctx.beginPath();
      ctx.moveTo(px, y);
      ctx.lineTo(px + h * 0.7, y + h);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(px, y + h);
      ctx.lineTo(px + h * 0.7, y);
      ctx.stroke();
    }
  }

  drawHexTechGrid(ctx, x, y, w, h, accentColor) {
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.12)';
    ctx.lineWidth = 1;
    const r = 24;
    for (let py = y; py < y + h; py += r * 1.5) {
      for (let px = x; px < x + w; px += r * 1.73) {
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 3) * i;
          const hx = px + r * Math.cos(angle);
          const hy = py + r * Math.sin(angle);
          if (i === 0) ctx.moveTo(hx, hy);
          else ctx.lineTo(hx, hy);
        }
        ctx.closePath();
        ctx.stroke();
      }
    }
  }

  // -----------------------------------------------------------------
  // 2. ARCHITECTURAL WALLS, WINDOWS & DOORS
  // -----------------------------------------------------------------
  renderWindows(ctx) {
    // Window Daylight Beams
    const windows = [
      { x: 280, y: 110, w: 120, h: 6, dir: 'down' },
      { x: 140, y: 720, w: 6, h: 90, dir: 'right' },
      { x: 920, y: 1010, w: 110, h: 6, dir: 'up' }
    ];

    for (const win of windows) {
      ctx.save();
      ctx.fillStyle = 'rgba(186, 230, 253, 0.1)';
      if (win.dir === 'down') {
        const grad = ctx.createLinearGradient(win.x, win.y, win.x, win.y + 70);
        grad.addColorStop(0, 'rgba(186, 230, 253, 0.25)');
        grad.addColorStop(1, 'rgba(186, 230, 253, 0.0)');
        ctx.fillStyle = grad;
        ctx.fillRect(win.x, win.y, win.w, 70);
      }
      ctx.restore();
    }
  }

  renderArchitecturalWalls(ctx) {
    // Wall shadow
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 4;

    for (const ob of this.world.obstacles) {
      if (ob.type === 'wall') {
        ctx.fillStyle = '#1e2430';
        ctx.fillRect(ob.x, ob.y, ob.w, ob.h);
      }
    }
    ctx.restore();

    // Wall Top & Inner Core Lines
    for (const ob of this.world.obstacles) {
      if (ob.type === 'wall') {
        ctx.save();
        ctx.fillStyle = '#2d3748';
        ctx.fillRect(ob.x, ob.y, ob.w, ob.h);

        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2;
        ctx.strokeRect(ob.x, ob.y, ob.w, ob.h);

        // Architectural centerline
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
        ctx.lineWidth = 1;
        if (ob.w > ob.h) {
          ctx.beginPath();
          ctx.moveTo(ob.x, ob.y + ob.h / 2);
          ctx.lineTo(ob.x + ob.w, ob.y + ob.h / 2);
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.moveTo(ob.x + ob.w / 2, ob.y);
          ctx.lineTo(ob.x + ob.w / 2, ob.y + ob.h);
          ctx.stroke();
        }
        ctx.restore();
      }
    }

    // Doorway Openings & Architectural Swing Arcs
    for (const door of this.world.doors) {
      ctx.save();
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);

      if (door.orientation === 'horizontal') {
        ctx.beginPath();
        ctx.arc(door.x, door.y, door.w, 0, Math.PI / 2);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(door.x, door.y, door.w, Math.PI / 2, Math.PI);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  // -----------------------------------------------------------------
  // 3. CRISP HANDCRAFTED VECTOR FURNITURE
  // -----------------------------------------------------------------
  renderArchitecturalFurniture(ctx) {
    // 1. Living Room Sectional Sofa Suite
    ctx.save();
    ctx.fillStyle = '#334155';
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2;

    // Sofa Base
    ctx.fillRect(230, 200, 90, 200);
    ctx.strokeRect(230, 200, 90, 200);

    // Cushions
    ctx.fillStyle = '#475569';
    ctx.fillRect(250, 210, 60, 50);
    ctx.fillRect(250, 270, 60, 50);
    ctx.fillRect(250, 330, 60, 50);

    // Throw Pillows
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(255, 215, 18, 18);
    ctx.fillStyle = '#eab308';
    ctx.fillRect(255, 355, 18, 18);
    ctx.restore();

    // 2. Oak Coffee Table
    ctx.save();
    ctx.fillStyle = '#78350f';
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 2;
    ctx.fillRect(370, 260, 80, 90);
    ctx.strokeRect(370, 260, 80, 90);

    // Magazines on table
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(385, 280, 24, 30);
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(415, 290, 20, 20);
    ctx.restore();

    // 3. TV Media Console & Wall
    ctx.save();
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.fillRect(390, 120, 170, 42);
    ctx.strokeRect(390, 120, 170, 42);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 10px Inter, sans-serif';
    ctx.fillText('📺 SMART TV & MEDIA DISPLAY', 400, 145);
    ctx.restore();

    // 4. Kitchen Counter Island
    ctx.save();
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 2;
    ctx.fillRect(160, 640, 110, 210);
    ctx.strokeRect(160, 640, 110, 210);

    // Double-basin Sink
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#94a3b8';
    ctx.fillRect(175, 660, 40, 30);
    ctx.strokeRect(175, 660, 40, 30);
    ctx.fillRect(175, 695, 40, 30);
    ctx.strokeRect(175, 695, 40, 30);

    // Induction Cooktop
    ctx.fillStyle = '#000000';
    ctx.fillRect(175, 750, 44, 70);
    ctx.strokeStyle = '#f43f5e';
    ctx.beginPath();
    ctx.arc(197, 768, 12, 0, Math.PI * 2);
    ctx.arc(197, 800, 10, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // 5. Dining Table & 4 Chairs
    ctx.save();
    ctx.fillStyle = '#3f2e24';
    ctx.strokeStyle = '#1e140d';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(600, 790, 48, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 4 Chairs around table
    ctx.fillStyle = '#78350f';
    const chairAngles = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
    for (const a of chairAngles) {
      const cx = 600 + Math.cos(a) * 62;
      const cy = 790 + Math.sin(a) * 62;
      ctx.beginPath();
      ctx.arc(cx, cy, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();

    // 6. King Platform Bed & Bedside Tables
    ctx.save();
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    ctx.fillRect(800, 750, 180, 190);
    ctx.strokeRect(800, 750, 180, 190);

    // Mattress & Duvet
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(820, 780, 140, 150);

    // Pillows
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(830, 760, 50, 25);
    ctx.fillRect(890, 760, 50, 25);
    ctx.restore();

    // 7. Bathtub & Modern Vanity
    ctx.save();
    ctx.fillStyle = '#f8fafc';
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2;
    // Tub
    ctx.beginPath();
    ctx.roundRect(850, 380, 170, 75, 18);
    ctx.fill();
    ctx.stroke();

    // Vanity
    ctx.fillStyle = '#334155';
    ctx.fillRect(850, 580, 110, 45);
    ctx.strokeRect(850, 580, 110, 45);
    ctx.fillStyle = '#38bdf8';
    ctx.font = '10px sans-serif';
    ctx.fillText('🚿 VANITY', 875, 605);
    ctx.restore();

    // 8. Robot Assembly Bay & Tool Workbench (Fusion VR Training)
    ctx.save();
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 2;
    ctx.fillRect(750, 100, 140, 55);
    ctx.strokeRect(750, 100, 140, 55);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 10px Inter, sans-serif';
    ctx.fillText('🛠️ ROBOT ASSEMBLY BENCH', 758, 125);
    ctx.font = '9px Inter, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('Magnetic Snapping Rack', 770, 142);
    ctx.restore();

    // 9. Charging Dock in Workshop Bay
    const dock = this.world.dock;
    ctx.save();
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2;
    ctx.fillRect(dock.x - 30, dock.y - 20, dock.width, dock.height);
    ctx.strokeRect(dock.x - 30, dock.y - 20, dock.width, dock.height);

    ctx.fillStyle = '#fef08a';
    ctx.font = 'bold 11px Inter, sans-serif';
    ctx.fillText('⚡ HIGH-CURRENT DOCK', dock.x - 26, dock.y + 4);

    // Glowing Contacts
    ctx.fillStyle = '#facc15';
    ctx.fillRect(dock.x - 14, dock.y + 16, 8, 8);
    ctx.fillRect(dock.x + 6, dock.y + 16, 8, 8);
    ctx.restore();

    // 10. Smart Trash Bin
    const bin = this.world.smartBin;
    ctx.save();
    ctx.fillStyle = '#334155';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(bin.x, bin.y, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.font = '14px sans-serif';
    ctx.fillText('🗑️', bin.x - 7, bin.y + 5);
    ctx.restore();
  }

  // -----------------------------------------------------------------
  // 4. TELEPORTATION TARGET MARKERS (FUSION VR TRAINING)
  // -----------------------------------------------------------------
  renderTeleportPads(ctx) {
    for (const tp of this.world.teleportMarkers) {
      const isHovered = this.hoveredTeleport === tp;
      ctx.save();

      // Outer Pulse Ring
      ctx.strokeStyle = isHovered ? '#38bdf8' : 'rgba(56, 189, 248, 0.4)';
      ctx.lineWidth = isHovered ? 2.5 : 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(tp.x, tp.y, isHovered ? 24 : 20, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Inner Glowing Disc
      ctx.fillStyle = isHovered ? 'rgba(56, 189, 248, 0.25)' : 'rgba(15, 23, 42, 0.6)';
      ctx.beginPath();
      ctx.arc(tp.x, tp.y, 14, 0, Math.PI * 2);
      ctx.fill();

      // Icon & Name
      ctx.font = '12px sans-serif';
      ctx.fillText(tp.icon, tp.x - 6, tp.y + 4);

      if (isHovered) {
        ctx.fillStyle = '#0f172a';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1;
        const msg = `⚡ Teleport to ${tp.name}`;
        ctx.font = 'bold 11px Inter, sans-serif';
        const w = ctx.measureText(msg).width + 16;
        ctx.fillRect(tp.x - w / 2, tp.y - 34, w, 20);
        ctx.strokeRect(tp.x - w / 2, tp.y - 34, w, 20);
        ctx.fillStyle = '#38bdf8';
        ctx.textAlign = 'center';
        ctx.fillText(msg, tp.x, tp.y - 20);
      }

      ctx.restore();
    }
  }

  // -----------------------------------------------------------------
  // 5. INTERACTIVE CONTROL STAND (FUSION VR TRAINING)
  // -----------------------------------------------------------------
  renderControlStand(ctx) {
    const cs = this.world.controlStand;
    ctx.save();

    // Pedestal
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.fillRect(cs.x - cs.width / 2, cs.y - cs.height / 2, cs.width, cs.height);
    ctx.strokeRect(cs.x - cs.width / 2, cs.y - cs.height / 2, cs.width, cs.height);

    // Screen
    ctx.fillStyle = '#0284c7';
    ctx.fillRect(cs.x - 18, cs.y - 12, 36, 18);

    // Overhead Banner
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1;
    ctx.fillRect(cs.x - 70, cs.y - 36, 140, 20);
    ctx.strokeRect(cs.x - 70, cs.y - 36, 140, 20);

    ctx.fillStyle = '#e0f2fe';
    ctx.font = 'bold 9px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🖥️ FUSION CONTROL STAND', cs.x, cs.y - 23);

    ctx.restore();
  }

  // -----------------------------------------------------------------
  // 6. STATIONS, TAGS, FLOOR CELLS, PARTICLES
  // -----------------------------------------------------------------
  renderStations(ctx) {
    for (const st of this.stations) {
      ctx.save();
      const isCurrent = appState.currentStep === st.step;
      const isNearby = this.activeStationPrompt === st;

      ctx.strokeStyle = isCurrent ? '#38bdf8' : isNearby ? '#facc15' : 'rgba(148, 163, 184, 0.35)';
      ctx.fillStyle = isCurrent ? 'rgba(56, 189, 248, 0.15)' : 'rgba(15, 23, 42, 0.7)';
      ctx.lineWidth = isNearby ? 3 : 2;

      ctx.beginPath();
      ctx.arc(st.x, st.y, st.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.font = '18px sans-serif';
      ctx.fillText(st.icon, st.x - 9, st.y - 4);

      ctx.fillStyle = isCurrent ? '#38bdf8' : '#e2e8f0';
      ctx.font = 'bold 10px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`Step ${st.step}`, st.x, st.y + 16);

      ctx.restore();
    }
  }

  renderInspectionTags(ctx) {
    for (const tag of this.world.inspectionTags) {
      ctx.save();
      const distToAvatar = Math.hypot(this.world.avatar.x - tag.x, this.world.avatar.y - tag.y);
      const isClose = distToAvatar < 65;

      ctx.fillStyle = isClose ? '#facc15' : '#38bdf8';
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(tag.x, tag.y, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.font = '12px sans-serif';
      ctx.fillText(tag.icon, tag.x - 6, tag.y + 4);

      if (isClose || appState.currentStep === 2) {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
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

  renderFloorTargets(ctx) {
    // Dirt Cells
    for (const d of this.world.dirtCells) {
      if (!d.cleaned) {
        ctx.save();
        ctx.fillStyle = 'rgba(120, 53, 15, 0.7)';
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(69, 26, 3, 0.9)';
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
        ctx.fillStyle = 'rgba(56, 189, 248, 0.6)';
        ctx.strokeStyle = 'rgba(186, 230, 253, 0.9)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(w.x, w.y, w.radius * 1.3, w.radius * 0.9, 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.font = '14px sans-serif';
        ctx.fillText('💧', w.x - 7, w.y + 5);
        ctx.restore();
      }
    }
  }

  renderScatteredObjects(ctx) {
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

  renderCat(ctx) {
    const cat = this.world.cat;
    ctx.save();
    ctx.translate(cat.x, cat.y);
    ctx.rotate(cat.heading);

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(0, 3, cat.radius * 1.1, cat.radius * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Cat Body
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
    ctx.moveTo(12, -7); ctx.lineTo(16, -12); ctx.lineTo(8, -8);
    ctx.moveTo(12, 7); ctx.lineTo(16, 12); ctx.lineTo(8, 8);
    ctx.fill();

    // Tail swinging
    ctx.strokeStyle = '#ea580c';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-10, 0);
    const tailAngle = Math.sin(Date.now() / 140) * 8;
    ctx.quadraticCurveTo(-18, tailAngle, -24, tailAngle * 0.5);
    ctx.stroke();

    ctx.restore();

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

    // Sonar radar rings (SENSE_04)
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

    // Glow undercarriage
    ctx.fillStyle = robot.ledColor;
    ctx.beginPath();
    ctx.arc(0, 0, robot.radius + 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.rotate(robot.heading);

    // Main Chassis
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, robot.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Wheels
    ctx.fillStyle = '#475569';
    ctx.fillRect(-8, -robot.radius - 3, 16, 5);
    ctx.fillRect(-8, robot.radius - 2, 16, 5);

    // Eyes
    if (installed.has('SENSE_15')) {
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(12, -5, 3.5, 0, Math.PI * 2);
      ctx.arc(12, 5, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Arm
    if (robot.armExtended) {
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(14, 0); ctx.lineTo(28, 0);
      ctx.stroke();
      ctx.strokeStyle = robot.gripperClosed ? '#10b981' : '#f59e0b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(28, -6); ctx.lineTo(34, -2);
      ctx.moveTo(28, 6); ctx.lineTo(34, 2);
      ctx.stroke();
    }

    // Facing Direction Arrow
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(2, 0); ctx.lineTo(12, 0);
    ctx.stroke();

    ctx.restore();

    // Trace status overhead
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

    // 2-Meter Proximity Circle
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.3)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(0, 0, 75, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Feet
    if (avatar.moving) {
      const legOffset = Math.sin(this.walkCycle) * 6;
      ctx.fillStyle = '#334155';
      ctx.fillRect(-7 + legOffset, -6, 5, 12);
      ctx.fillRect(2 - legOffset, -6, 5, 12);
    }

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

    ctx.fillStyle = isLead ? '#bfdbfe' : '#ddd6fe';
    ctx.font = 'bold 11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`👤 ${appState.activePlayerId} (You)`, avatar.x, avatar.y - 24);
  }

  renderScreenOverlays(ctx) {
    // 1. Station Spacebar Prompt
    if (this.activeStationPrompt) {
      const st = this.activeStationPrompt;
      ctx.save();
      const msg = `⚡ Press [SPACE] or Click to enter ${st.name}`;
      ctx.font = 'bold 13px Inter, sans-serif';
      const w = ctx.measureText(msg).width + 36;
      const x = (this.canvas.width - w) / 2;
      const y = this.canvas.height - 46;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.96)';
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2;
      ctx.fillRect(x, y, w, 36);
      ctx.strokeRect(x, y, w, 36);

      ctx.fillStyle = '#fef08a';
      ctx.textAlign = 'left';
      ctx.fillText(msg, x + 18, y + 23);
      ctx.restore();
    }

    // 2. Control Hints & View Mode Toggle (Bottom Left)
    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.3)';
    ctx.lineWidth = 1;
    ctx.fillRect(12, this.canvas.height - 46, 280, 34);
    ctx.strokeRect(12, this.canvas.height - 46, 280, 34);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '11px Inter, sans-serif';
    ctx.fillText('🎮 Move: Arrow Keys | ⚡ Click Teleport Pads', 20, this.canvas.height - 25);
    ctx.restore();
  }
}
