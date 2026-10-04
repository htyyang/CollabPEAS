/**
 * CollabPEAS - High-Fidelity Realistic Apartment Canvas Engine
 * Directly renders Materials/Apartment.png at full native resolution with high-DPI scaling.
 * Features smooth camera pan & zoom, operator locomotion, roaming cat NPC,
 * cleaning robot, particle effects, teleportation pads, and interactive stations.
 */

import { appState } from '../state.js';
import { sound } from './audio.js';

export class HouseCanvasRenderer {
  constructor(canvasElement, world) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.world = world;

    // Load authentic realistic Apartment.png
    this.bgImage = new Image();
    this.bgLoaded = false;
    this.bgImage.src = 'assets/Apartment.png';
    this.bgImage.onload = () => {
      this.bgLoaded = true;
      this.fitView();
    };

    // Keyboard state
    this.keys = {
      ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false,
      w: false, s: false, a: false, d: false
    };

    // Camera viewport & smooth pan/zoom & 360° heading
    this.camera = { x: 0, y: 0, scale: 0.85 };
    this.headingAngle = 0; // 360-degree rotation angle in radians
    this.isPanning = false;
    this.panStart = { x: 0, y: 0 };
    this.animFrame = null;
    this.walkCycle = 0;
    this.teleportRipple = null;

    // Interactive Stations in the House (Step 1-5 distributed across apartment rooms)
    this.stations = [
      { step: 1, name: 'Station 1: Purpose & Metrics', x: 450, y: 380, radius: 42, icon: '🎯' },
      { step: 2, name: 'Station 2: Sensors Workbench', x: 340, y: 820, radius: 42, icon: '📡' },
      { step: 3, name: 'Station 3: Actuator Assembly Bay', x: 640, y: 220, radius: 42, icon: '🦾' },
      { step: 4, name: 'Station 4: Logic & Vibe Coding', x: 600, y: 860, radius: 42, icon: '🧩' },
      { step: 5, name: 'Station 5: Observation & Debug', x: 880, y: 860, radius: 42, icon: '🔬' }
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
      const dpr = window.devicePixelRatio || 1;
      this.canvas.width = Math.round(parent.clientWidth * dpr);
      this.canvas.height = Math.round(parent.clientHeight * dpr);
      this.ctx.scale(dpr, dpr);
      this.cssWidth = parent.clientWidth;
      this.cssHeight = parent.clientHeight;
      if (!this.viewFitted) {
        this.fitView();
      }
    }
  }

  fitView() {
    if (!this.cssWidth || !this.cssHeight) return;
    const scaleX = (this.cssWidth * 0.94) / this.world.width;
    const scaleY = (this.cssHeight * 0.94) / this.world.height;
    this.camera.scale = Math.min(scaleX, scaleY);
    this.camera.x = (this.cssWidth - this.world.width * this.camera.scale) / 2;
    this.camera.y = (this.cssHeight - this.world.height * this.camera.scale) / 2;
    this.viewFitted = true;
  }

  zoom(factor, centerX, centerY) {
    const prevScale = this.camera.scale;
    const newScale = Math.max(0.4, Math.min(2.5, prevScale * factor));
    const cx = centerX !== undefined ? centerX : this.cssWidth / 2;
    const cy = centerY !== undefined ? centerY : this.cssHeight / 2;

    this.camera.x = cx - (cx - this.camera.x) * (newScale / prevScale);
    this.camera.y = cy - (cy - this.camera.y) * (newScale / prevScale);
    this.camera.scale = newScale;
  }

  setHeading(angleDegrees) {
    this.headingAngle = (angleDegrees * Math.PI) / 180;
    this.updateCompassHud();
  }

  updateCompassHud() {
    const needle = document.getElementById('compassNeedle');
    const readout = document.getElementById('compassReadout');
    if (!needle && !readout) return;

    const deg = Math.round(((this.headingAngle * 180 / Math.PI) % 360 + 360) % 360);
    if (needle) needle.style.transform = `rotate(${-deg}deg)`;
    if (readout) {
      let card = 'N';
      if (deg >= 23 && deg < 68) card = 'NE';
      else if (deg >= 68 && deg < 113) card = 'E';
      else if (deg >= 113 && deg < 158) card = 'SE';
      else if (deg >= 158 && deg < 203) card = 'S';
      else if (deg >= 203 && deg < 248) card = 'SW';
      else if (deg >= 248 && deg < 293) card = 'W';
      else if (deg >= 293 && deg < 338) card = 'NW';
      readout.innerText = `🧭 ${deg}° ${card}`;
    }
  }

  initControls() {
    window.addEventListener('keydown', (e) => {
      // Don't intercept keys if focused on text input or if modal is open
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      const modal = document.getElementById('stepModalOverlay');
      if (modal && modal.style.display !== 'none') return;

      // 360° Rotation Keys Q / E
      if (e.key === 'q' || e.key === 'Q') {
        this.headingAngle -= 0.08;
        this.updateCompassHud();
      }
      if (e.key === 'e' || e.key === 'E') {
        this.headingAngle += 0.08;
        this.updateCompassHud();
      }

      if (this.keys.hasOwnProperty(e.key)) {
        this.keys[e.key] = true;
        e.preventDefault();
      }
      if (e.key === ' ' && this.activeStationPrompt) {
        window.openStepModal?.(this.activeStationPrompt.step);
        sound.playSnap();
        e.preventDefault();
      }
    });

    window.addEventListener('keyup', (e) => {
      if (this.keys.hasOwnProperty(e.key)) {
        this.keys[e.key] = false;
      }
    });

    // Mouse wheel zoom
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const factor = e.deltaY < 0 ? 1.1 : 0.9;
      this.zoom(factor, mouseX, mouseY);
    }, { passive: false });

    // Drag to pan map
    this.canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) { // left button
        this.isPanning = true;
        this.panStart = { x: e.clientX - this.camera.x, y: e.clientY - this.camera.y };
        this.hasDragged = false;
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (this.isPanning) {
        const nx = e.clientX - this.panStart.x;
        const ny = e.clientY - this.panStart.y;
        if (Math.abs(nx - this.camera.x) > 3 || Math.abs(ny - this.camera.y) > 3) {
          this.hasDragged = true;
        }
        this.camera.x = nx;
        this.camera.y = ny;
      }

      // Check hover on teleport pads or tags
      const { x, y } = this.screenToWorld(e.clientX, e.clientY);
      this.hoveredTeleport = null;
      for (const tp of this.world.teleportMarkers) {
        if (Math.hypot(x - tp.x, y - tp.y) < 28) {
          this.hoveredTeleport = tp;
          this.canvas.style.cursor = 'pointer';
          return;
        }
      }
      for (const st of this.stations) {
        if (Math.hypot(x - st.x, y - st.y) < st.radius) {
          this.canvas.style.cursor = 'pointer';
          return;
        }
      }
      this.canvas.style.cursor = this.isPanning ? 'grabbing' : 'default';
    });

    window.addEventListener('mouseup', () => {
      this.isPanning = false;
    });

    // Click handler for teleports and stations
    this.canvas.addEventListener('click', (e) => {
      if (this.hasDragged) return; // ignore drag release

      const { x, y } = this.screenToWorld(e.clientX, e.clientY);

      // 1. Check Teleport Pad Click
      for (const tp of this.world.teleportMarkers) {
        if (Math.hypot(x - tp.x, y - tp.y) < 28) {
          this.teleportAvatar(tp.x, tp.y);
          return;
        }
      }

      // 2. Check Click on Stations
      for (const st of this.stations) {
        if (Math.hypot(x - st.x, y - st.y) < st.radius + 10) {
          window.openStepModal?.(st.step);
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

      // 4. Click to move avatar
      this.world.avatar.targetX = x;
      this.world.avatar.targetY = y;
    });
  }

  screenToWorld(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const w = this.cssWidth || 1000;
    const h = this.cssHeight || 700;

    const mx = clientX - rect.left - w / 2;
    const my = clientY - rect.top - h / 2;
    const cos = Math.cos(-this.headingAngle);
    const sin = Math.sin(-this.headingAngle);
    const rx = mx * cos - my * sin + w / 2;
    const ry = mx * sin + my * cos + h / 2;

    return {
      x: (rx - this.camera.x) / this.camera.scale,
      y: (ry - this.camera.y) / this.camera.scale
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

      // Rotate movement vector by current camera heading so W/Up always moves camera-forward
      if (this.headingAngle) {
        const cos = Math.cos(this.headingAngle);
        const sin = Math.sin(this.headingAngle);
        const rdx = dx * cos - dy * sin;
        const rdy = dx * sin + dy * cos;
        dx = rdx;
        dy = rdy;
      }

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

    // Teleport ripple
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
    const w = this.cssWidth || 1000;
    const h = this.cssHeight || 700;

    ctx.clearRect(0, 0, w, h);

    ctx.save();
    if (this.headingAngle) {
      ctx.translate(w / 2, h / 2);
      ctx.rotate(this.headingAngle);
      ctx.translate(-w / 2, -h / 2);
    }
    ctx.translate(this.camera.x, this.camera.y);
    ctx.scale(this.camera.scale, this.camera.scale);

    // 1. Draw Authentic Rendered Apartment (Apartment.png)
    if (this.bgLoaded) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(this.bgImage, 0, 0, this.world.width, this.world.height);
    } else {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, this.world.width, this.world.height);
    }

    // 2. Room Name Labels (Subtle, architectural floating typography)
    this.renderRoomLabels(ctx);

    // 3. Teleportation Target Markers (Fusion VR Training)
    this.renderTeleportPads(ctx);

    // 4. Interactive Stations in the House (Step 1-5 Holographic Rings)
    this.renderStations(ctx);

    // 5. Environmental Inspection Tags (Step 2A)
    this.renderInspectionTags(ctx);

    // 6. Interactive Dirt Specks & Shimmering Spills
    this.renderFloorTargets(ctx);

    // 7. Scattered Objects (Trash & Belongings)
    this.renderScatteredObjects(ctx);

    // 8. Roaming Cat NPC
    this.renderCat(ctx);

    // 9. Cleaning Robot
    this.renderRobot(ctx);

    // 10. Operator Avatar
    this.renderAvatar(ctx);

    // 11. Teleport Ripple
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

    // 12. Screen-Space UI Overlays
    this.renderScreenOverlays(ctx);
  }

  renderRoomLabels(ctx) {
    ctx.save();
    for (const r of this.world.rooms) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.font = 'bold 13px Inter, -apple-system, sans-serif';
      ctx.letterSpacing = '1px';
      ctx.fillText(r.name.toUpperCase(), r.labelX, r.labelY);
    }
    ctx.restore();
  }

  renderTeleportPads(ctx) {
    for (const tp of this.world.teleportMarkers) {
      const isHovered = this.hoveredTeleport === tp;
      ctx.save();

      // Outer Pulse Ring
      ctx.strokeStyle = isHovered ? '#38bdf8' : 'rgba(56, 189, 248, 0.45)';
      ctx.lineWidth = isHovered ? 2.5 : 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(tp.x, tp.y, isHovered ? 24 : 20, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Inner Glowing Disc
      ctx.fillStyle = isHovered ? 'rgba(56, 189, 248, 0.35)' : 'rgba(15, 23, 42, 0.65)';
      ctx.beginPath();
      ctx.arc(tp.x, tp.y, 14, 0, Math.PI * 2);
      ctx.fill();

      // Icon & Name
      ctx.font = '12px sans-serif';
      ctx.fillText(tp.icon, tp.x - 6, tp.y + 4);

      if (isHovered) {
        ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
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

  renderStations(ctx) {
    for (const st of this.stations) {
      ctx.save();
      const isCurrent = appState.currentStep === st.step;
      const isNearby = this.activeStationPrompt === st;

      // Glow halo
      ctx.strokeStyle = isCurrent ? '#38bdf8' : isNearby ? '#facc15' : 'rgba(255, 255, 255, 0.5)';
      ctx.fillStyle = isCurrent ? 'rgba(56, 189, 248, 0.25)' : 'rgba(15, 23, 42, 0.75)';
      ctx.lineWidth = isNearby ? 3.5 : 2;

      ctx.beginPath();
      ctx.arc(st.x, st.y, st.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.font = '18px sans-serif';
      ctx.fillText(st.icon, st.x - 9, st.y - 4);

      ctx.fillStyle = isCurrent ? '#38bdf8' : '#ffffff';
      ctx.font = 'bold 11px Inter, sans-serif';
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
        ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
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
        ctx.fillStyle = 'rgba(120, 53, 15, 0.75)';
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(69, 26, 3, 0.95)';
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
        ctx.fillStyle = 'rgba(56, 189, 248, 0.65)';
        ctx.strokeStyle = 'rgba(186, 230, 253, 0.95)';
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
        ctx.fillStyle = '#0f172a';
        ctx.strokeStyle = obj.type === 'TRASH' ? '#f43f5e' : '#10b981';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(obj.x, obj.y, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.font = '14px sans-serif';
        ctx.fillText(obj.icon, obj.x - 7, obj.y + 5);

        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 10px Inter, sans-serif';
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
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
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
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
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
      ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
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
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.35)';
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
    const w = this.cssWidth || 1000;
    const h = this.cssHeight || 700;

    // Do not draw station prompt if modal is currently open
    const modal = document.getElementById('stepModalOverlay');
    if (modal && modal.style.display !== 'none') return;

    // 1. Station Spacebar Prompt
    if (this.activeStationPrompt) {
      const st = this.activeStationPrompt;
      ctx.save();
      const msg = `⚡ Press [SPACE] or Click to open ${st.name}`;
      ctx.font = 'bold 13px Inter, sans-serif';
      const tw = ctx.measureText(msg).width + 36;
      const x = (w - tw) / 2;
      const y = h - 85;

      ctx.fillStyle = 'rgba(15, 23, 42, 0.96)';
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 2;
      ctx.fillRect(x, y, tw, 36);
      ctx.strokeRect(x, y, tw, 36);

      ctx.fillStyle = '#fef08a';
      ctx.textAlign = 'left';
      ctx.fillText(msg, x + 18, y + 23);
      ctx.restore();
    }
  }
}
