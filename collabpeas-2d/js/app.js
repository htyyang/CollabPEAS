/**
 * CollabPEAS - Main Application Coordinator (v0.3)
 * Integrates 3D 360-Degree WebGL Engine (Apartment.glb), 360° OrbitControls & FPS Walkthrough,
 * 2D 360-degree Rotatable Blueprint Canvas, Interactive 360° Compass Widget,
 * Fullscreen Map Layer with Step Popup Workstations, 10Hz Simulation Engine, and Dual Logging.
 */

import { appState } from './state.js';
import { ApartmentWorld } from './sim/world.js';
import { SimulationEngine } from './sim/engine.js';
import { HouseCanvasRenderer } from './view/house-canvas.js';
import { Apartment3DMap } from './view/map-3d.js';
import { RobotPovRenderer } from './view/pov-renderer.js';
import { BlockCanvasView } from './view/block-canvas.js';
import { DualObservationLogger } from './logging/dual-log.js';
import { StepsView } from './view/steps-view.js';
import { sound } from './view/audio.js';
import { sessionLogger } from './logging/session-log.js';

window.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize World Model
  const world = new ApartmentWorld();

  // 2. Initialize 2D Interactive House Canvas (Rotatable 360°)
  const canvasEl = document.getElementById('houseCanvas');
  const houseCanvas = new HouseCanvasRenderer(canvasEl, world);
  window.houseCanvas = houseCanvas;

  // 3. Initialize 3D 360° WebGL Three.js Engine (Apartment.glb)
  const threeCanvasEl = document.getElementById('threeCanvas');
  let map3d = null;
  try {
    map3d = new Apartment3DMap(threeCanvasEl, world);
    window.map3d = map3d;
  } catch (err) {
    console.warn('⚠️ WebGL 3D Map failed to initialize, falling back to 360° 2D Canvas:', err);
  }

  // 4. Initialize 10Hz Simulation Engine
  const simEngine = new SimulationEngine(world);
  window.simEngine = simEngine;

  // 5. Initialize Subview Components
  const blockCanvasContainer = document.getElementById('blockCanvasMount');
  const blockCanvasView = new BlockCanvasView(blockCanvasContainer);

  const dualLogView = new DualObservationLogger(null);

  const stepsPanelEl = document.getElementById('stepsPanelMount');
  const stepsView = new StepsView(stepsPanelEl, blockCanvasView, dualLogView);

  const povModalEl = document.getElementById('robotPovModal');
  const povRenderer = new RobotPovRenderer(povModalEl, world);

  // 6. Connect Tick Event to POV Renderer
  appState.on('tick', ({ percepts }) => {
    if (appState.isRobotPovActive && povModalEl.style.display !== 'none') {
      povRenderer.render(percepts);
    }
  });

  // -------------------------------------------------------------
  // 360-DEGREE VIEW MODE SWITCHER (3D 360° / FPS 360° / 2D Map)
  // -------------------------------------------------------------
  const viewMode3DBtn = document.getElementById('viewMode3DBtn');
  const viewModeFpsBtn = document.getElementById('viewModeFpsBtn');
  const viewMode2DBtn = document.getElementById('viewMode2DBtn');
  const mapControlsHint = document.getElementById('mapControlsHint');

  let currentViewMode = '3d'; // '3d' | 'fps' | '2d'
  window.currentViewMode = '3d';

  function switchViewMode(mode) {
    currentViewMode = mode;
    window.currentViewMode = mode;
    [viewMode3DBtn, viewModeFpsBtn, viewMode2DBtn].forEach(b => b?.classList.remove('active'));

    if (mode === '3d') {
      viewMode3DBtn?.classList.add('active');
      if (threeCanvasEl) threeCanvasEl.style.display = 'block';
      if (canvasEl) canvasEl.style.display = 'none';
      if (map3d) {
        map3d.setViewMode('orbit');
        map3d.onResize();
      }
      if (mapControlsHint) {
        mapControlsHint.innerHTML = `
          <span class="hint-key">🖱️ Orbit</span> Left-Drag 360°
          <span class="hint-sep">•</span>
          <span class="hint-key">📜 Zoom</span> Wheel
          <span class="hint-sep">•</span>
          <span class="hint-key">📐 Pan</span> Right-Drag
          <span class="hint-sep">•</span>
          <span class="hint-key">🎮 Move</span> WASD / Arrows
          <span class="hint-sep">•</span>
          <span class="hint-key">🎯 Stations</span> Click 3D Ring
        `;
      }
    } else if (mode === 'fps') {
      viewModeFpsBtn?.classList.add('active');
      if (threeCanvasEl) threeCanvasEl.style.display = 'block';
      if (canvasEl) canvasEl.style.display = 'none';
      if (map3d) {
        map3d.setViewMode('fps');
        map3d.onResize();
      }
      if (mapControlsHint) {
        mapControlsHint.innerHTML = `
          <span class="hint-key">🚶 Walk</span> WASD / Arrows
          <span class="hint-sep">•</span>
          <span class="hint-key">👁️ Look 360°</span> Drag Mouse
          <span class="hint-sep">•</span>
          <span class="hint-key">🎯 Stations</span> Walk to Ring & [SPACE]
        `;
      }
    } else if (mode === '2d') {
      viewMode2DBtn?.classList.add('active');
      if (threeCanvasEl) threeCanvasEl.style.display = 'none';
      if (canvasEl) canvasEl.style.display = 'block';
      houseCanvas.resizeCanvas();
      houseCanvas.fitView();
      if (mapControlsHint) {
        mapControlsHint.innerHTML = `
          <span class="hint-key">🎮 Move</span> WASD / Arrows
          <span class="hint-sep">•</span>
          <span class="hint-key">🖱️ Pan</span> Drag
          <span class="hint-sep">•</span>
          <span class="hint-key">📜 Zoom</span> Wheel
          <span class="hint-sep">•</span>
          <span class="hint-key">🧭 360°</span> Q / E Keys
          <span class="hint-sep">•</span>
          <span class="hint-key">🎯 Stations</span> [SPACE]
        `;
      }
    }
  }

  window.switchViewMode = switchViewMode;

  viewMode3DBtn?.addEventListener('click', () => { switchViewMode('3d'); sound.playClick(); });
  viewModeFpsBtn?.addEventListener('click', () => { switchViewMode('fps'); sound.playClick(); });
  viewMode2DBtn?.addEventListener('click', () => { switchViewMode('2d'); sound.playClick(); });

  // -------------------------------------------------------------
  // ACTIVE TASK / MISSION SELECTOR WIRING
  // -------------------------------------------------------------
  const headerTaskSelect = document.getElementById('headerTaskSelect');
  const hudTaskBadge = document.getElementById('hudTaskBadge');
  const hudTaskIcon = document.getElementById('hudTaskIcon');
  const hudTaskName = document.getElementById('hudTaskName');

  const TASK_NAME_MAP = {
    'ALL': { icon: '🤖', name: 'All 6 Tasks (Multi-Task)' },
    'TASK_1': { icon: '🧹', name: 'Task 1: Vacuum Floor' },
    'TASK_2': { icon: '📦', name: 'Task 2: Sort Objects' },
    'TASK_3': { icon: '💧', name: 'Task 3: Clean Spills' },
    'TASK_4': { icon: '🐱', name: 'Task 4: Avoid Cat' },
    'TASK_5': { icon: '🚶', name: 'Task 5: Slow Near Humans' },
    'TASK_6': { icon: '⚡', name: 'Task 6: Return to Dock' }
  };

  headerTaskSelect?.addEventListener('change', (e) => {
    appState.setActiveTask(e.target.value);
    sound.playSnap();
  });

  hudTaskBadge?.addEventListener('click', () => {
    const tasks = ['ALL', 'TASK_1', 'TASK_2', 'TASK_3', 'TASK_4', 'TASK_5', 'TASK_6'];
    const currentIdx = tasks.indexOf(appState.activeTaskFocus);
    const nextTask = tasks[(currentIdx + 1) % tasks.length];
    appState.setActiveTask(nextTask);
    sound.playSnap();
  });

  appState.on('taskChanged', ({ taskId }) => {
    if (headerTaskSelect) headerTaskSelect.value = taskId;
    const info = TASK_NAME_MAP[taskId] || { icon: '🎯', name: taskId };
    if (hudTaskIcon) hudTaskIcon.innerText = info.icon;
    if (hudTaskName) hudTaskName.innerText = info.name;

    // Refresh active step view if open
    if (appState.currentStep === 1) stepsView.renderStep1();
    else if (appState.currentStep === 2) stepsView.renderStep2();
    else if (appState.currentStep === 3) stepsView.renderStep3();
  });

  // -------------------------------------------------------------
  // INTERACTIVE 360-DEGREE COMPASS WIDGET
  // -------------------------------------------------------------
  document.querySelectorAll('.compass-btn[data-angle]').forEach(btn => {
    btn.addEventListener('click', () => {
      const angle = parseInt(btn.getAttribute('data-angle'), 10);
      if (currentViewMode === '2d') {
        houseCanvas.setHeading(angle);
      } else if (map3d) {
        map3d.setHeading(angle);
      }
      sound.playSnap();
    });
  });

  const autoSpinBtn = document.getElementById('autoSpinBtn');
  autoSpinBtn?.addEventListener('click', () => {
    if (map3d) {
      const isSpinning = map3d.toggleAutoSpin();
      if (isSpinning) {
        autoSpinBtn.classList.add('active');
      } else {
        autoSpinBtn.classList.remove('active');
      }
      sound.playClick();
    }
  });

  // Compass Dial Dragging to Spin 360°
  const compassDial = document.getElementById('compassDial');
  let isDialDragging = false;

  const handleDialRotation = (e) => {
    if (!compassDial) return;
    const rect = compassDial.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const rad = Math.atan2(dx, -dy);
    const deg = Math.round(((rad * 180 / Math.PI) % 360 + 360) % 360);

    if (currentViewMode === '2d') {
      houseCanvas.setHeading(deg);
    } else if (map3d) {
      map3d.setHeading(deg);
    }
  };

  compassDial?.addEventListener('mousedown', (e) => {
    isDialDragging = true;
    handleDialRotation(e);
  });

  window.addEventListener('mousemove', (e) => {
    if (isDialDragging) {
      handleDialRotation(e);
    }
  });

  window.addEventListener('mouseup', () => {
    isDialDragging = false;
  });

  // Focus Robot Button
  const focusRobotBtn = document.getElementById('focusRobotBtn');
  focusRobotBtn?.addEventListener('click', () => {
    if (currentViewMode === '2d') {
      houseCanvas.focusRobot();
    } else if (map3d) {
      map3d.focusRobot();
    }
    sound.playSnap();
  });

  // Follow Robot Camera Toggle
  const followRobotBtn = document.getElementById('followRobotBtn');
  followRobotBtn?.addEventListener('click', () => {
    if (map3d) {
      const isFollowing = map3d.toggleFollowRobot();
      if (isFollowing) {
        followRobotBtn.classList.add('active');
        followRobotBtn.innerText = '🎥 Following...';
      } else {
        followRobotBtn.classList.remove('active');
        followRobotBtn.innerText = '🎥 Follow Robot';
      }
    }
    sound.playClick();
  });

  // Recenter Map Button
  const recenterMapBtn = document.getElementById('recenterMapBtn');
  recenterMapBtn?.addEventListener('click', () => {
    if (currentViewMode === '2d') {
      houseCanvas.setHeading(0);
      houseCanvas.fitView();
    } else if (map3d) {
      map3d.setViewMode('orbit');
    }
    sound.playClick();
  });

  // -------------------------------------------------------------
  // STEP MODAL POPUP SYSTEM (Full-Screen Map -> Popup Workstation)
  // -------------------------------------------------------------
  const modalOverlay = document.getElementById('stepModalOverlay');
  const modalBadge = document.getElementById('modalStepBadge');
  const modalHeading = document.getElementById('modalStepHeading');
  const modalCloseBtn = document.getElementById('stepModalCloseBtn');
  const modalTabs = document.querySelectorAll('.modal-tab-btn');
  const topNavItems = document.querySelectorAll('.step-nav-item');
  const openWorkstationBtn = document.getElementById('openWorkstationBtn');
  const openWorkstationFabBtn = document.getElementById('openWorkstationFabBtn');

  const STEP_METADATA = {
    1: { badge: 'STEP 1 OF 5 • PEAS: P', heading: '🎯 Purpose & Performance Measures (P)' },
    2: { badge: 'STEP 2 OF 5 • PEAS: E + S', heading: '📡 Environment Inspection & Sensor Allocation (E & S)' },
    3: { badge: 'STEP 3 OF 5 • PEAS: A', heading: '🦾 Actuator Specification Bay (A)' },
    4: { badge: 'STEP 4 OF 5 • PEAS: LOGIC', heading: '🧩 Decision Logic (Vibe Coding Canvas)' },
    5: { badge: 'STEP 5 OF 5 • PEAS: TEST & REFLECT', heading: '🔬 Live Simulation, Dual Logging & Reflection' }
  };

  function updateStepUi(step) {
    topNavItems.forEach(item => {
      const s = parseInt(item.getAttribute('data-step'), 10);
      if (s === step) item.classList.add('active');
      else item.classList.remove('active');
    });

    modalTabs.forEach(tab => {
      const s = parseInt(tab.getAttribute('data-step'), 10);
      if (s === step) tab.classList.add('active');
      else tab.classList.remove('active');
    });

    if (STEP_METADATA[step]) {
      if (modalBadge) modalBadge.innerText = STEP_METADATA[step].badge;
      if (modalHeading) modalHeading.innerText = STEP_METADATA[step].heading;
    }

    if (step === 4) {
      if (blockCanvasContainer) blockCanvasContainer.style.display = 'block';
      if (stepsPanelEl) stepsPanelEl.style.display = 'none';
      blockCanvasView.render();
    } else {
      if (blockCanvasContainer) blockCanvasContainer.style.display = 'none';
      if (stepsPanelEl) stepsPanelEl.style.display = 'block';
      stepsView.render();
    }
  }

  function openStepModal(stepNumber) {
    if (stepNumber !== undefined && stepNumber !== null) {
      appState.setStep(stepNumber);
    }
    updateStepUi(appState.currentStep);
    if (modalOverlay) {
      modalOverlay.style.display = 'flex';
    }
    sound.playSnap();
  }

  function closeStepModal() {
    if (modalOverlay) {
      modalOverlay.style.display = 'none';
    }
    sound.playClick();
  }

  window.openStepModal = openStepModal;
  window.closeStepModal = closeStepModal;

  modalCloseBtn?.addEventListener('click', closeStepModal);

  modalOverlay?.addEventListener('click', (e) => {
    if (e.target === modalOverlay) {
      closeStepModal();
    }
  });

  topNavItems.forEach(item => {
    item.addEventListener('click', () => {
      const step = parseInt(item.getAttribute('data-step'), 10);
      openStepModal(step);
    });
  });

  modalTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const step = parseInt(tab.getAttribute('data-step'), 10);
      appState.setStep(step);
      sound.playClick();
    });
  });

  openWorkstationBtn?.addEventListener('click', () => openStepModal(appState.currentStep));
  openWorkstationFabBtn?.addEventListener('click', () => openStepModal(appState.currentStep));

  // Global Keyboard Shortcuts
  window.addEventListener('keydown', (e) => {
    if (modalOverlay && modalOverlay.style.display !== 'none') {
      if (e.key === 'Escape') {
        closeStepModal();
        e.preventDefault();
      }
      return;
    }

    if (e.key === ' ' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
      if (houseCanvas.activeStationPrompt) {
        openStepModal(houseCanvas.activeStationPrompt.step);
      } else {
        openStepModal(appState.currentStep);
      }
      e.preventDefault();
    }
  });

  appState.on('stepChanged', ({ step }) => {
    updateStepUi(step);
  });

  // -------------------------------------------------------------
  // PLAYER ROLE SWITCHER (Player A / Player B Dyadic Collaboration)
  // -------------------------------------------------------------
  const playerBtnA = document.getElementById('playerToggleA');
  const playerBtnB = document.getElementById('playerToggleB');

  const updatePlayerUi = (activeId) => {
    if (activeId === 'Player A') {
      playerBtnA?.classList.add('active');
      playerBtnB?.classList.remove('active');
    } else {
      playerBtnB?.classList.add('active');
      playerBtnA?.classList.remove('active');
    }
    updateContributionBar();
  };

  playerBtnA?.addEventListener('click', () => {
    appState.setPlayer('Player A');
    sound.playClick();
  });

  playerBtnB?.addEventListener('click', () => {
    appState.setPlayer('Player B');
    sound.playClick();
  });

  appState.on('playerChanged', ({ playerId }) => {
    updatePlayerUi(playerId);
  });

  // -------------------------------------------------------------
  // AUDIO & POV CONTROLS
  // -------------------------------------------------------------
  const muteBtn = document.getElementById('muteToggleBtn');
  muteBtn?.addEventListener('click', () => {
    const isMuted = sound.toggleMute();
    muteBtn.innerText = isMuted ? '🔇 Off' : '🔊 On';
    if (!isMuted) sound.playClick();
  });

  const quickPovBtn = document.getElementById('quickPovBtn');
  quickPovBtn?.addEventListener('click', () => {
    appState.isRobotPovActive = !appState.isRobotPovActive;
    if (povModalEl) {
      povModalEl.style.display = appState.isRobotPovActive ? 'block' : 'none';
      if (appState.isRobotPovActive) {
        povRenderer.render(simEngine.readSensors());
        sound.playClick();
      }
    }
  });

  // -------------------------------------------------------------
  // MUTUAL CONTRIBUTION AWARENESS (CSCW 4.2)
  // -------------------------------------------------------------
  function updateContributionBar() {
    const stats = sessionLogger.getSummaryStats();
    const ratioEl = document.getElementById('contribRatioA');
    const labelEl = document.getElementById('contribStatsText');
    if (ratioEl) ratioEl.style.width = `${stats.ratio}%`;
    if (labelEl) labelEl.innerText = `A: ${stats.playerACount} | B: ${stats.playerBCount}`;
  }

  // -------------------------------------------------------------
  // FLOATING SIMULATION HUD ON THE FULLSCREEN MAP
  // -------------------------------------------------------------
  const hudPlayPauseBtn = document.getElementById('hudPlayPauseBtn');
  const hudResetBtn = document.getElementById('hudResetBtn');
  const hudStatusDot = document.getElementById('hudStatusDot');
  const hudStatusText = document.getElementById('hudStatusText');
  const hudTickText = document.getElementById('hudTickText');
  const hudPeasScore = document.getElementById('hudPeasScore');
  const hudCoverageScore = document.getElementById('hudCoverageScore');
  const hudSafetyScore = document.getElementById('hudSafetyScore');
  const hudOpenLabBtn = document.getElementById('hudOpenLabBtn');
  const hudSpeedBtns = document.querySelectorAll('.hud-speed-btn');

  hudPlayPauseBtn?.addEventListener('click', () => {
    if (appState.simRunning) {
      simEngine.stop();
      hudPlayPauseBtn.innerText = '▶';
      hudStatusDot?.classList.remove('running');
      hudStatusDot?.classList.add('paused');
      if (hudStatusText) hudStatusText.innerText = 'SIM PAUSED';
    } else {
      simEngine.start();
      hudPlayPauseBtn.innerText = '⏸';
      hudStatusDot?.classList.add('running');
      hudStatusDot?.classList.remove('paused');
      if (hudStatusText) hudStatusText.innerText = 'SIM RUNNING';
    }
    sound.playClick();
  });

  hudResetBtn?.addEventListener('click', () => {
    simEngine.reset();
    simEngine.start();
    hudPlayPauseBtn.innerText = '⏸';
    hudStatusDot?.classList.add('running');
    hudStatusDot?.classList.remove('paused');
    if (hudStatusText) hudStatusText.innerText = 'SIM RUNNING';
    sound.playClick();
  });

  hudSpeedBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const spd = parseInt(btn.getAttribute('data-speed'), 10);
      simEngine.setSpeed(spd);
      hudSpeedBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      sound.playClick();
    });
  });

  document.getElementById('hudStampPass')?.addEventListener('click', () => {
    appState.addObservation('✓', 'Observed in full-screen 360° map');
    sound.playSnap();
  });
  document.getElementById('hudStampFail')?.addEventListener('click', () => {
    appState.addObservation('✗', 'Observed mismatch in full-screen 360° map');
    sound.playSnap();
  });
  document.getElementById('hudStampQuery')?.addEventListener('click', () => {
    appState.addObservation('?', 'Marked for dyadic discussion');
    sound.playSnap();
  });

  hudOpenLabBtn?.addEventListener('click', () => {
    openStepModal(5);
  });

  appState.on('tick', ({ tick, scores }) => {
    if (hudTickText) hudTickText.innerText = `Tick ${tick}`;
    if (hudPeasScore) hudPeasScore.innerText = scores.composite.toFixed(1);
    if (hudCoverageScore) hudCoverageScore.innerText = `${Math.round(scores.coverage)}%`;
    if (hudSafetyScore) hudSafetyScore.innerText = `${Math.round(scores.safety)}%`;

    if (tick % 20 === 0) {
      updateContributionBar();
    }
  });

  // Initialize UI with initial state (Default Step 1 loaded in background)
  updateStepUi(appState.currentStep);
  updatePlayerUi(appState.activePlayerId);

  // Default to 3D 360° Orbit view
  switchViewMode('3d');

  // Automatically start background simulation at 1x so environment is alive
  simEngine.start();

  console.log('🚀 CollabPEAS 3D (v0.3) Initialized with 360° Interactive WebGL Engine & Rotatable Map.');
});
