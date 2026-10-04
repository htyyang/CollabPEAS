/**
 * CollabPEAS - 3D 360-Degree Interactive Apartment Map Engine
 * Powered by Three.js WebGL and Materials/Apartment.glb.
 * Features 360° OrbitControls, First-Person 360° Walkthrough,
 * 3D Holographic Stations, 3D Dynamic Robot with Sonar, 3D Roaming Cat NPC,
 * 3D Operator Avatar, Floor Decals, and Raycasting Interaction.
 */

import * as THREE from '../../lib/three/three.module.js';
import { GLTFLoader } from '../../lib/three/GLTFLoader.js';
import { OrbitControls } from '../../lib/three/OrbitControls.js';
import { appState } from '../state.js';
import { sound } from './audio.js';

export class Apartment3DMap {
  constructor(canvasElement, world) {
    this.canvas = canvasElement;
    this.world = world;

    // View Modes: 'orbit' (360° 3D orbital view) | 'fps' (first-person 360° walkthrough) | 'topDown' (90° bird's eye)
    this.viewMode = 'orbit';
    this.isAutoSpinning = false;
    this.modelLoaded = false;

    // First-person walkthrough camera state
    this.fpsPitch = 0;
    this.fpsYaw = 0;
    this.isMouseDown = false;
    this.prevMousePos = { x: 0, y: 0 };
    this.keys = { w: false, a: false, s: false, d: false, ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false };

    // Station holographic rings & click targets
    this.stationObjects = [];
    this.hoveredStation = null;

    // Raycaster for mouse interaction
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.initScene();
    this.initLighting();
    this.initControls();
    this.initEntities();
    this.loadApartmentModel();
    this.bindEvents();
    this.startLoop();
  }

  // -------------------------------------------------------------
  // 1. SCENE, CAMERA & RENDERER SETUP
  // -------------------------------------------------------------
  initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x060913); // dark sci-fi research background

    // Perspective Camera for natural 3D depth and 360° exploration
    const aspect = this.canvas.clientWidth / this.canvas.clientHeight || 1;
    this.camera = new THREE.PerspectiveCamera(48, aspect, 0.1, 100);

    // Initial 360° orbital vantage point (isometric angle)
    this.camera.position.set(4, 14, 18);

    // WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
  }

  initLighting() {
    // Soft balanced ambient illumination for interior viewing
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    this.scene.add(ambientLight);

    // Directional architectural sun light
    const dirLight = new THREE.DirectionalLight(0xfff5e6, 1.4);
    dirLight.position.set(12, 22, 16);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 60;
    dirLight.shadow.camera.left = -16;
    dirLight.shadow.camera.right = 16;
    dirLight.shadow.camera.top = 16;
    dirLight.shadow.camera.bottom = -16;
    dirLight.shadow.bias = -0.0005;
    this.scene.add(dirLight);

    // Subtle warm interior point lights across key rooms
    const roomLights = [
      { x: 1.0, y: 3.2, z: -2.0, color: 0xffedd5, intensity: 1.2 }, // Living Room
      { x: -1.5, y: 3.2, z: 4.5, color: 0xe0f2fe, intensity: 1.0 }, // Kitchen
      { x: 3.5, y: 3.2, z: 5.0, color: 0xfef3c7, intensity: 1.1 },  // Dining
      { x: 8.8, y: 3.2, z: 5.0, color: 0xfce7f3, intensity: 1.0 },  // Bedroom
      { x: 8.8, y: 3.2, z: -1.5, color: 0xdbeafe, intensity: 1.2 }  // Bathroom
    ];

    roomLights.forEach(l => {
      const pl = new THREE.PointLight(l.color, l.intensity, 12, 1.2);
      pl.position.set(l.x, l.y, l.z);
      this.scene.add(pl);
    });
  }

  initControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.screenSpacePanning = true;

    // Orbit 360° limits
    this.controls.minDistance = 2.5;
    this.controls.maxDistance = 35.0;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.04; // Don't flip under the floor
    this.controls.minPolarAngle = 0.05; // Bird's eye

    // Focus target near center of apartment
    this.controls.target.set(3.5, 0.5, 0.0);
    this.controls.update();
  }

  // -------------------------------------------------------------
  // 2. COORDINATE TRANSFORMATIONS (2D Canvas World <-> 3D GLB Model)
  // -------------------------------------------------------------
  to3D(x2d, y2d, yElev = 0.08) {
    // 2D: X from 130 to 1080 (span 950) -> 3D: X from -5.0 to 12.5 (span 17.5)
    // 2D: Y from 90 to 1010 (span 920) -> 3D: Z from -7.5 to 7.5 (span 15.0)
    const x3d = -5.0 + ((x2d - 130) / 950) * 17.5;
    const z3d = -7.5 + ((y2d - 90) / 920) * 15.0;
    return new THREE.Vector3(x3d, yElev, z3d);
  }

  to2D(x3d, z3d) {
    const x2d = 130 + ((x3d + 5.0) / 17.5) * 950;
    const y2d = 90 + ((z3d + 7.5) / 15.0) * 920;
    return { x: x2d, y: y2d };
  }

  // -------------------------------------------------------------
  // 3. LOAD APARTMENT GLB MODEL
  // -------------------------------------------------------------
  loadApartmentModel() {
    const progressFill = document.getElementById('glbProgressFill');
    const progressText = document.getElementById('glbProgressText');
    const overlay = document.getElementById('glbLoadingOverlay');
    const cancelBtn = document.getElementById('cancelGlbLoadBtn');

    const hideOverlay = () => {
      if (overlay) {
        overlay.style.opacity = '0';
        setTimeout(() => { overlay.style.display = 'none'; }, 250);
      }
    };

    // User can cancel and jump straight to 2D map at any time
    cancelBtn?.addEventListener('click', () => {
      hideOverlay();
      window.switchViewMode?.('2d');
      sound.playClick();
    });

    // Safety timeout: auto-dismiss overlay after 8 seconds so user is never trapped
    const safetyTimer = setTimeout(() => {
      if (!this.modelLoaded) {
        console.warn('⏱️ GLB loading taking long, dismissing overlay to allow 2D interaction.');
        hideOverlay();
        window.switchViewMode?.('2d');
      }
    }, 8000);

    const loader = new GLTFLoader();
    loader.load(
      'assets/Apartment.glb',
      (gltf) => {
        clearTimeout(safetyTimer);
        try {
          this.apartmentModel = gltf.scene;
          this.apartmentModel.position.set(0, 0, 0);

          // Enable shadows and enhance materials
          this.apartmentModel.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
              if (child.material) {
                child.material.roughness = Math.max(0.25, child.material.roughness || 0.6);
              }
            }
          });

          this.scene.add(this.apartmentModel);
          this.modelLoaded = true;
          console.log('✅ Apartment.glb Loaded Successfully into 360° WebGL View.');
          window.dispatchEvent(new CustomEvent('glbModelLoaded'));
        } catch (err) {
          console.error('Error processing Apartment.glb scene:', err);
        } finally {
          hideOverlay();
        }
      },
      (xhr) => {
        if (xhr.lengthComputable && xhr.total > 0) {
          const pct = Math.min(100, Math.round((xhr.loaded / xhr.total) * 100));
          if (progressFill) progressFill.style.width = `${pct}%`;
          if (progressText) progressText.innerText = `${pct}% Loaded (${(xhr.loaded / 1048576).toFixed(1)} MB)`;
        } else if (xhr.loaded > 0) {
          const mb = (xhr.loaded / 1048576).toFixed(1);
          if (progressText) progressText.innerText = `${mb} MB Loaded`;
          if (progressFill) progressFill.style.width = `${Math.min(95, Math.round(xhr.loaded / 850000))}%`;
        }
      },
      (err) => {
        clearTimeout(safetyTimer);
        console.warn('⚠️ Error loading Apartment.glb:', err);
        hideOverlay();
        window.switchViewMode?.('2d');
      }
    );
  }

  // -------------------------------------------------------------
  // 4. INTERACTIVE 3D ENTITIES (Stations, Robot, Cat, Avatar, Decals)
  // -------------------------------------------------------------
  initEntities() {
    this.create3DStations();
    this.create3DRobot();
    this.create3DCat();
    this.create3DAvatar();
    this.createFloorDecals();
  }

  create3DStations() {
    const STATIONS_DEF = [
      { step: 1, name: '1. Purpose & Metrics', x2d: 450, y2d: 380, icon: '🎯', color: 0x38bdf8 },
      { step: 2, name: '2. Sensors Workbench', x2d: 340, y2d: 820, icon: '📡', color: 0x0284c7 },
      { step: 3, name: '3. Actuator Bay', x2d: 640, y2d: 220, icon: '🦾', color: 0x10b981 },
      { step: 4, name: '4. Decision Logic', x2d: 600, y2d: 860, icon: '🧩', color: 0xf59e0b },
      { step: 5, name: '5. Observation & Debug', x2d: 880, y2d: 860, icon: '🔬', color: 0xa855f7 }
    ];

    STATIONS_DEF.forEach(st => {
      const pos = this.to3D(st.x2d, st.y2d, 0.05);

      const group = new THREE.Group();
      group.position.copy(pos);
      group.userData = { step: st.step, name: st.name, isStation: true };

      // Ground Holographic Ring
      const ringGeom = new THREE.TorusGeometry(0.75, 0.045, 16, 48);
      ringGeom.rotateX(Math.PI / 2);
      const ringMat = new THREE.MeshStandardMaterial({
        color: st.color,
        emissive: st.color,
        emissiveIntensity: 0.6,
        roughness: 0.2
      });
      const ringMesh = new THREE.Mesh(ringGeom, ringMat);
      group.add(ringMesh);

      // Vertical Soft Glowing Light Column
      const colGeom = new THREE.CylinderGeometry(0.7, 0.7, 1.8, 32, 1, true);
      colGeom.translate(0, 0.9, 0);
      const colMat = new THREE.MeshBasicMaterial({
        color: st.color,
        transparent: true,
        opacity: 0.16,
        side: THREE.DoubleSide,
        depthWrite: false
      });
      const colMesh = new THREE.Mesh(colGeom, colMat);
      group.add(colMesh);

      // Overhead 3D Billboard Sprite
      const sprite = this.createStationBillboard(st.icon, st.name, st.color);
      sprite.position.set(0, 2.2, 0);
      group.add(sprite);

      this.scene.add(group);
      this.stationObjects.push({ group, ringMesh, colMesh, def: st });
    });
  }

  createStationBillboard(icon, text, colorHex) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 160;
    const ctx = canvas.getContext('2d');

    // Background pill
    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    ctx.strokeStyle = `#${colorHex.toString(16).padStart(6, '0')}`;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.roundRect(16, 16, 480, 128, 28);
    ctx.fill();
    ctx.stroke();

    // Icon & Text
    ctx.font = '54px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(icon, 36, 102);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(text, 110, 96);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const spriteMat = new THREE.SpriteMaterial({ map: texture, depthTest: false, depthWrite: false });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(2.4, 0.75, 1);
    return sprite;
  }

  create3DRobot() {
    this.robotGroup = new THREE.Group();

    // Metallic Disc Chassis
    const bodyGeom = new THREE.CylinderGeometry(0.38, 0.40, 0.15, 32);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.85,
      roughness: 0.25
    });
    const body = new THREE.Mesh(bodyGeom, bodyMat);
    body.castShadow = true;
    body.receiveShadow = true;
    this.robotGroup.add(body);

    // Glowing LED Status Ring on Top
    const ledGeom = new THREE.TorusGeometry(0.28, 0.025, 12, 32);
    ledGeom.rotateX(Math.PI / 2);
    this.robotLedMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
    const ledMesh = new THREE.Mesh(ledGeom, this.robotLedMat);
    ledMesh.position.y = 0.08;
    this.robotGroup.add(ledMesh);

    // Front Bumper / Direction indicator
    const bumpGeom = new THREE.BoxGeometry(0.18, 0.08, 0.12);
    const bumpMat = new THREE.MeshStandardMaterial({ color: 0x0284c7 });
    const bumper = new THREE.Mesh(bumpGeom, bumpMat);
    bumper.position.set(0, 0.04, 0.35);
    this.robotGroup.add(bumper);

    // Overhead 3D Action Label Sprite
    this.robotActionSprite = this.createRobotActionSprite('⚙️ READY');
    this.robotActionSprite.position.set(0, 0.7, 0);
    this.robotGroup.add(this.robotActionSprite);

    this.scene.add(this.robotGroup);
  }

  createRobotActionSprite(actionText) {
    const canvas = document.createElement('canvas');
    canvas.width = 384;
    canvas.height = 96;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(8, 8, 368, 80, 16);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#34d399';
    ctx.font = 'bold 28px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(actionText, 192, 58);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: texture, depthTest: false, depthWrite: false });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(1.6, 0.4, 1);
    sprite.canvas = canvas;
    sprite.ctx = ctx;
    sprite.texture = texture;
    return sprite;
  }

  updateRobotActionSprite(text) {
    if (!this.robotActionSprite) return;
    const { canvas, ctx, texture } = this.robotActionSprite;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(8, 8, 368, 80, 16);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#34d399';
    ctx.font = 'bold 28px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(text, 192, 58);

    texture.needsUpdate = true;
  }

  create3DCat() {
    this.catGroup = new THREE.Group();

    // Body
    const bodyGeom = new THREE.CapsuleGeometry(0.14, 0.32, 8, 16);
    bodyGeom.rotateX(Math.PI / 2);
    const catMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.7 });
    const body = new THREE.Mesh(bodyGeom, catMat);
    body.position.y = 0.16;
    body.castShadow = true;
    this.catGroup.add(body);

    // Head
    const headGeom = new THREE.SphereGeometry(0.12, 16, 16);
    const head = new THREE.Mesh(headGeom, catMat);
    head.position.set(0, 0.24, 0.24);
    this.catGroup.add(head);

    // Ears
    const earGeom = new THREE.ConeGeometry(0.05, 0.1, 8);
    const earL = new THREE.Mesh(earGeom, catMat);
    earL.position.set(-0.06, 0.34, 0.24);
    const earR = new THREE.Mesh(earGeom, catMat);
    earR.position.set(0.06, 0.34, 0.24);
    this.catGroup.add(earL);
    this.catGroup.add(earR);

    // Tail
    const tailGeom = new THREE.CylinderGeometry(0.025, 0.02, 0.26, 8);
    tailGeom.rotateX(-Math.PI / 4);
    const tail = new THREE.Mesh(tailGeom, catMat);
    tail.position.set(0, 0.22, -0.22);
    this.catGroup.add(tail);

    this.scene.add(this.catGroup);
  }

  create3DAvatar() {
    this.avatarGroup = new THREE.Group();

    // Stylized Operator Humanoid
    const isLead = appState.activePlayerId === 'Player A';
    const playerColor = isLead ? 0x2563eb : 0x7c3aed;

    // Torso
    const torsoGeom = new THREE.CylinderGeometry(0.24, 0.20, 0.65, 16);
    this.avatarMat = new THREE.MeshStandardMaterial({ color: playerColor, roughness: 0.5 });
    const torso = new THREE.Mesh(torsoGeom, this.avatarMat);
    torso.position.y = 0.75;
    torso.castShadow = true;
    this.avatarGroup.add(torso);

    // Head
    const headGeom = new THREE.SphereGeometry(0.18, 16, 16);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xfde047, roughness: 0.6 });
    const head = new THREE.Mesh(headGeom, headMat);
    head.position.y = 1.25;
    head.castShadow = true;
    this.avatarGroup.add(head);

    // 360° Direction Arrow on Floor
    const arrowGeom = new THREE.ConeGeometry(0.22, 0.5, 16);
    arrowGeom.rotateX(Math.PI / 2);
    const arrowMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const arrow = new THREE.Mesh(arrowGeom, arrowMat);
    arrow.position.set(0, 0.05, 0.6);
    this.avatarGroup.add(arrow);

    this.scene.add(this.avatarGroup);
  }

  createFloorDecals() {
    this.dirtDecals = [];
    this.wetDecals = [];

    // Dirt spots
    const dirtGeom = new THREE.CircleGeometry(0.28, 16);
    dirtGeom.rotateX(-Math.PI / 2);
    const dirtMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.9 });

    this.world.dirtCells.forEach(d => {
      const pos = this.to3D(d.x, d.y, 0.02);
      const mesh = new THREE.Mesh(dirtGeom, dirtMat);
      mesh.position.copy(pos);
      this.scene.add(mesh);
      this.dirtDecals.push({ cell: d, mesh });
    });

    // Wet spills
    const wetGeom = new THREE.CircleGeometry(0.48, 24);
    wetGeom.rotateX(-Math.PI / 2);
    const wetMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.65,
      roughness: 0.1,
      metalness: 0.3
    });

    this.world.wetCells.forEach(w => {
      const pos = this.to3D(w.x, w.y, 0.025);
      const mesh = new THREE.Mesh(wetGeom, wetMat);
      mesh.position.copy(pos);
      this.scene.add(mesh);
      this.wetDecals.push({ cell: w, mesh });
    });
  }

  // -------------------------------------------------------------
  // 5. INTERACTIVE 360° RAYCASTING & CLICK CONTROLS
  // -------------------------------------------------------------
  bindEvents() {
    window.addEventListener('resize', () => this.onResize());

    // Mouse Move (Raycasting for Station Hover & 360° FPS view)
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      if (this.viewMode === 'fps' && this.isMouseDown) {
        const dx = e.clientX - this.prevMousePos.x;
        const dy = e.clientY - this.prevMousePos.y;
        this.fpsYaw -= dx * 0.004;
        this.fpsPitch = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, this.fpsPitch - dy * 0.004));
        this.prevMousePos = { x: e.clientX, y: e.clientY };
        return;
      }

      this.checkStationHover();
    });

    this.canvas.addEventListener('mousedown', (e) => {
      this.isMouseDown = true;
      this.prevMousePos = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('mouseup', () => {
      this.isMouseDown = false;
    });

    // Mouse Click (Raycast Station click or floor click to move avatar)
    this.canvas.addEventListener('click', (e) => {
      if (this.viewMode === 'fps') return;

      const rect = this.canvas.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);

      // 1. Check Station Ring Click
      const intersects = this.raycaster.intersectObjects(
        this.stationObjects.map(s => s.ringMesh).concat(this.stationObjects.map(s => s.colMesh)),
        false
      );

      if (intersects.length > 0) {
        const parent = intersects[0].object.parent;
        if (parent && parent.userData.step) {
          window.openStepModal?.(parent.userData.step);
          sound.playSnap();
          return;
        }
      }

      // 2. Check Click on Floor to Move Operator Avatar
      const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const targetPoint = new THREE.Vector3();
      if (this.raycaster.ray.intersectPlane(groundPlane, targetPoint)) {
        const { x, y } = this.to2D(targetPoint.x, targetPoint.z);
        this.world.avatar.targetX = x;
        this.world.avatar.targetY = y;
      }
    });

    // Keyboard inputs for FPS Walkthrough Mode
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      const modal = document.getElementById('stepModalOverlay');
      if (modal && modal.style.display !== 'none') return;

      const k = e.key.toLowerCase();
      if (this.keys.hasOwnProperty(e.key)) this.keys[e.key] = true;
      if (this.keys.hasOwnProperty(k)) this.keys[k] = true;
    });

    window.addEventListener('keyup', (e) => {
      const k = e.key.toLowerCase();
      if (this.keys.hasOwnProperty(e.key)) this.keys[e.key] = false;
      if (this.keys.hasOwnProperty(k)) this.keys[k] = false;
    });
  }

  checkStationHover() {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(
      this.stationObjects.map(s => s.ringMesh).concat(this.stationObjects.map(s => s.colMesh)),
      false
    );

    if (intersects.length > 0) {
      const parent = intersects[0].object.parent;
      if (parent && parent.userData.step) {
        this.hoveredStation = parent.userData.step;
        this.canvas.style.cursor = 'pointer';
        return;
      }
    }

    this.hoveredStation = null;
    this.canvas.style.cursor = 'default';
  }

  onResize() {
    if (!this.canvas) return;
    const w = this.canvas.parentElement?.clientWidth || window.innerWidth;
    const h = this.canvas.parentElement?.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }

  // -------------------------------------------------------------
  // 6. 360-DEGREE VIEW MODES & HEADING CONTROL
  // -------------------------------------------------------------
  setViewMode(mode) {
    this.viewMode = mode;

    if (mode === 'orbit') {
      this.controls.enabled = true;
      this.controls.autoRotate = false;
      this.animateCameraTo(new THREE.Vector3(4, 14, 18), new THREE.Vector3(3.5, 0.5, 0));
    } else if (mode === 'fps') {
      this.controls.enabled = false;
      const avatarPos = this.to3D(this.world.avatar.x, this.world.avatar.y, 1.65);
      this.camera.position.copy(avatarPos);
      this.fpsYaw = this.world.avatar.heading;
      this.fpsPitch = 0;
    } else if (mode === 'topDown') {
      this.controls.enabled = true;
      this.animateCameraTo(new THREE.Vector3(3.5, 22, 0.1), new THREE.Vector3(3.5, 0, 0));
    }
  }

  setHeading(angleDegrees) {
    if (!this.controls) return;
    const rad = (angleDegrees * Math.PI) / 180;
    const dist = this.camera.position.distanceTo(this.controls.target);
    const polar = this.controls.getPolarAngle();

    // Position camera along spherical coordinates with specified azimuth
    const cx = this.controls.target.x + dist * Math.sin(polar) * Math.sin(rad);
    const cz = this.controls.target.z + dist * Math.sin(polar) * Math.cos(rad);
    const cy = this.controls.target.y + dist * Math.cos(polar);

    this.animateCameraTo(new THREE.Vector3(cx, cy, cz), this.controls.target);
  }

  toggleAutoSpin() {
    this.isAutoSpinning = !this.isAutoSpinning;
    if (this.controls) {
      this.controls.autoRotate = this.isAutoSpinning;
      this.controls.autoRotateSpeed = 1.8;
    }
    return this.isAutoSpinning;
  }

  animateCameraTo(targetPos, targetLookAt, duration = 650) {
    const startPos = this.camera.position.clone();
    const startTarget = this.controls.target.clone();
    const startTime = performance.now();

    const anim = (now) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);
      const ease = 0.5 - Math.cos(t * Math.PI) / 2; // smooth easeInOut

      this.camera.position.lerpVectors(startPos, targetPos, ease);
      this.controls.target.lerpVectors(startTarget, targetLookAt, ease);
      this.controls.update();

      if (t < 1) {
        requestAnimationFrame(anim);
      }
    };
    requestAnimationFrame(anim);
  }

  // -------------------------------------------------------------
  // 7. REAL-TIME TICK LOOP & ANIMATION
  // -------------------------------------------------------------
  startLoop() {
    let lastTime = performance.now();

    const loop = (now) => {
      const delta = (now - lastTime) / 1000;
      lastTime = now;

      this.update(delta);
      this.renderer.render(this.scene, this.camera);
      this.animFrame = requestAnimationFrame(loop);
    };
    this.animFrame = requestAnimationFrame(loop);
  }

  update(delta) {
    // 1. Sync Cleaning Robot Position & Orientation
    if (this.robotGroup && this.world.robot) {
      const r = this.world.robot;
      const targetPos = this.to3D(r.x, r.y, 0.08);
      this.robotGroup.position.lerp(targetPos, 0.35);

      // Invert 2D heading for 3D Y-axis rotation
      this.robotGroup.rotation.y = -r.heading + Math.PI / 2;

      // Update Action Bubble
      if (r.traceState && r.traceState.action) {
        this.updateRobotActionSprite(`⚙️ ${r.traceState.action}`);
      }
    }

    // 2. Sync Roaming Cat NPC
    if (this.catGroup && this.world.cat) {
      const c = this.world.cat;
      const catPos = this.to3D(c.x, c.y, 0.02);
      this.catGroup.position.lerp(catPos, 0.25);
      this.catGroup.rotation.y = -c.heading + Math.PI / 2;
    }

    // 3. Sync Operator Avatar Position
    if (this.avatarGroup && this.world.avatar) {
      const a = this.world.avatar;
      const avatarPos = this.to3D(a.x, a.y, 0.02);
      this.avatarGroup.position.lerp(avatarPos, 0.3);
      this.avatarGroup.rotation.y = -a.heading + Math.PI / 2;
    }

    // 4. Update Floor Decals (Dirt & Spills)
    this.dirtDecals.forEach(d => {
      d.mesh.visible = !d.cell.cleaned;
    });
    this.wetDecals.forEach(w => {
      w.mesh.visible = !w.cell.cleaned;
    });

    // 5. Holographic Station Rings Pulsing Animation
    const time = performance.now() * 0.003;
    this.stationObjects.forEach(st => {
      st.ringMesh.rotation.z += 0.015;
      const isCurrent = appState.currentStep === st.def.step;
      const isHover = this.hoveredStation === st.def.step;
      const baseScale = isHover ? 1.25 : isCurrent ? 1.1 : 1.0;
      const pulse = baseScale + Math.sin(time + st.def.step) * 0.06;
      st.ringMesh.scale.set(pulse, pulse, pulse);
    });

    // 6. Avatar Locomotion Update (Camera-Relative Screen Space & Wall Sliding)
    if (this.viewMode === 'fps') {
      this.updateFpsLocomotion(delta);
    } else {
      this.controls.update();
      this.updateOrbitLocomotion(delta);
    }

    // 7. Synchronize 360° Compass Widget
    this.updateCompassHud();
  }

  /**
   * 3D Orbit Mode: Locomotion is strictly relative to the 3D camera view.
   * Up/W ALWAYS moves into the scene (away from camera / screen-up).
   * Down/S ALWAYS moves toward the camera (screen-down).
   * Left/A ALWAYS moves to the left of the screen.
   * Right/D ALWAYS moves to the right of the screen.
   * Wall sliding is applied so the avatar never gets stuck on obstacles or corners.
   */
  updateOrbitLocomotion(delta) {
    const avatar = this.world.avatar;
    let inputForward = 0;
    let inputRight = 0;

    if (this.keys.w || this.keys.W || this.keys.ArrowUp) inputForward += 1;
    if (this.keys.s || this.keys.S || this.keys.ArrowDown) inputForward -= 1;
    if (this.keys.d || this.keys.D || this.keys.ArrowRight) inputRight += 1;
    if (this.keys.a || this.keys.A || this.keys.ArrowLeft) inputRight -= 1;

    if (inputForward === 0 && inputRight === 0) {
      if (!avatar.targetX && !avatar.targetY) {
        avatar.moving = false;
      }
      return;
    }

    avatar.targetX = null;
    avatar.targetY = null;

    // Camera horizontal forward and right vectors
    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3();
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

    // 3D movement vector on ground plane
    const move3D = new THREE.Vector3()
      .addScaledVector(forward, inputForward)
      .addScaledVector(right, inputRight)
      .normalize();

    // Map 3D ground motion to 2D coordinate delta
    const dx2d = move3D.x * (950 / 17.5);
    const dy2d = move3D.z * (920 / 15.0);

    const len = Math.hypot(dx2d, dy2d);
    if (len > 0) {
      const step = avatar.speed * (delta ? Math.min(delta * 60, 2.0) : 1.0);
      const ndx = (dx2d / len) * step;
      const ndy = (dy2d / len) * step;

      const res = this.world.resolveMove(avatar.x, avatar.y, ndx, ndy, avatar.radius);
      if (res.moved) {
        avatar.x = res.x;
        avatar.y = res.y;
        avatar.heading = Math.atan2(ndy, ndx);
        avatar.moving = true;
      }
    }
  }

  /**
   * First-Person Walkthrough Mode: Locomotion with smooth wall sliding.
   */
  updateFpsLocomotion(delta) {
    const avatar = this.world.avatar;
    const step = avatar.speed * (delta ? Math.min(delta * 60, 2.0) : 1.0);

    let moveX = 0;
    let moveZ = 0;

    if (this.keys.w || this.keys.W || this.keys.ArrowUp) moveZ += 1;
    if (this.keys.s || this.keys.S || this.keys.ArrowDown) moveZ -= 1;
    if (this.keys.a || this.keys.A || this.keys.ArrowLeft) moveX -= 1;
    if (this.keys.d || this.keys.D || this.keys.ArrowRight) moveX += 1;

    if (moveX !== 0 || moveZ !== 0) {
      const forward = new THREE.Vector3(Math.sin(this.fpsYaw), 0, Math.cos(this.fpsYaw));
      const right = new THREE.Vector3(Math.cos(this.fpsYaw), 0, -Math.sin(this.fpsYaw));

      const dir = new THREE.Vector3()
        .addScaledVector(forward, moveZ)
        .addScaledVector(right, moveX)
        .normalize();

      const dx2d = dir.x * (950 / 17.5);
      const dy2d = dir.z * (920 / 15.0);
      const len = Math.hypot(dx2d, dy2d);
      if (len > 0) {
        const ndx = (dx2d / len) * step;
        const ndy = (dy2d / len) * step;

        const res = this.world.resolveMove(avatar.x, avatar.y, ndx, ndy, avatar.radius);
        if (res.moved) {
          avatar.x = res.x;
          avatar.y = res.y;
          avatar.heading = this.fpsYaw;
          avatar.moving = true;
        }
      }
    } else {
      avatar.moving = false;
    }

    // Follow avatar eye level
    const avatarPos = this.to3D(avatar.x, avatar.y, 1.65);
    this.camera.position.copy(avatarPos);

    // Camera look direction from yaw and pitch
    const lookDir = new THREE.Vector3(
      Math.sin(this.fpsYaw) * Math.cos(this.fpsPitch),
      Math.sin(this.fpsPitch),
      Math.cos(this.fpsYaw) * Math.cos(this.fpsPitch)
    );
    this.camera.lookAt(this.camera.position.clone().add(lookDir));
  }

  updateCompassHud() {
    const needle = document.getElementById('compassNeedle');
    const readout = document.getElementById('compassReadout');
    if (!needle && !readout) return;

    let deg = 0;
    if (this.viewMode === 'fps') {
      deg = Math.round(((this.fpsYaw * 180) / Math.PI) % 360 + 360) % 360;
    } else if (this.controls) {
      const az = this.controls.getAzimuthalAngle();
      deg = Math.round(((az * 180) / Math.PI) % 360 + 360) % 360;
    }

    if (needle) {
      needle.style.transform = `rotate(${-deg}deg)`;
    }
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

  dispose() {
    if (this.animFrame) cancelAnimationFrame(this.animFrame);
    if (this.renderer) this.renderer.dispose();
  }
}
