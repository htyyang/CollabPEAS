/**
 * CollabPEAS - Main Application Coordinator
 * Boots all subsystems, binds top navigation bar, controls player role switching,
 * manages full-screen realistic apartment map with popup step workstations,
 * and coordinates 10Hz simulation engine, dual observation logging, and PEAS scoring.
 */

import { appState } from './state.js';
import { ApartmentWorld } from './sim/world.js';
import { SimulationEngine } from './sim/engine.js';
import { HouseCanvasRenderer } from './view/house-canvas.js';
import { RobotPovRenderer } from './view/pov-renderer.js';
import { BlockCanvasView } from './view/block-canvas.js';
import { DualObservationLogger } from './logging/dual-log.js';
import { StepsView } from './view/steps-view.js';
import { sound } from './view/audio.js';
import { sessionLogger } from './logging/session-log.js';

window.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize World Model
  const world = new ApartmentWorld();

  // 2. Initialize Full-Screen Realistic Apartment Canvas
  const canvasEl = document.getElementById('houseCanvas');
  const houseCanvas = new HouseCanvasRenderer(canvasEl, world);
  window.houseCanvas = houseCanvas;

  // 3. Initialize 10Hz Simulation Engine
  const simEngine = new SimulationEngine(world);
  window.simEngine = simEngine;

  // 4. Initialize Subview Components
  const blockCanvasContainer = document.getElementById('blockCanvasMount');
  const blockCanvasView = new BlockCanvasView(blockCanvasContainer);

  const dualLogView = new DualObservationLogger(null);

  const stepsPanelEl = document.getElementById('stepsPanelMount');
  const stepsView = new StepsView(stepsPanelEl, blockCanvasView, dualLogView);

  const povModalEl = document.getElementById('robotPovModal');
  const povRenderer = new RobotPovRenderer(povModalEl, world);

  // 5. Connect Tick Event to POV Renderer
  appState.on('tick', ({ percepts }) => {
    if (appState.isRobotPovActive && povModalEl.style.display !== 'none') {
      povRenderer.render(percepts);
    }
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
  const recenterMapBtn = document.getElementById('recenterMapBtn');

  const STEP_METADATA = {
    1: { badge: 'STEP 1 OF 5 • PEAS: P', heading: '🎯 Purpose & Performance Measures (P)' },
    2: { badge: 'STEP 2 OF 5 • PEAS: E + S', heading: '📡 Environment Inspection & Sensor Allocation (E & S)' },
    3: { badge: 'STEP 3 OF 5 • PEAS: A', heading: '🦾 Actuator Specification Bay (A)' },
    4: { badge: 'STEP 4 OF 5 • PEAS: LOGIC', heading: '🧩 Decision Logic (Vibe Coding Canvas)' },
    5: { badge: 'STEP 5 OF 5 • PEAS: TEST & REFLECT', heading: '🔬 Live Simulation, Dual Logging & Reflection' }
  };

  function updateStepUi(step) {
    // 1. Update Top Header Nav Pills
    topNavItems.forEach(item => {
      const s = parseInt(item.getAttribute('data-step'), 10);
      if (s === step) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // 2. Update Modal Header Tabs
    modalTabs.forEach(tab => {
      const s = parseInt(tab.getAttribute('data-step'), 10);
      if (s === step) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });

    // 3. Update Modal Heading & Badge
    if (STEP_METADATA[step]) {
      if (modalBadge) modalBadge.innerText = STEP_METADATA[step].badge;
      if (modalHeading) modalHeading.innerText = STEP_METADATA[step].heading;
    }

    // 4. Toggle visibility between 4-slot code canvas and step panel
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

  // Close modal button
  modalCloseBtn?.addEventListener('click', closeStepModal);

  // Click on background overlay to close
  modalOverlay?.addEventListener('click', (e) => {
    if (e.target === modalOverlay) {
      closeStepModal();
    }
  });

  // Top header step buttons open modal directly to that step
  topNavItems.forEach(item => {
    item.addEventListener('click', () => {
      const step = parseInt(item.getAttribute('data-step'), 10);
      openStepModal(step);
    });
  });

  // Tabs inside modal dialog
  modalTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const step = parseInt(tab.getAttribute('data-step'), 10);
      appState.setStep(step);
      sound.playClick();
    });
  });

  // Open Workstation Buttons
  openWorkstationBtn?.addEventListener('click', () => openStepModal(appState.currentStep));
  openWorkstationFabBtn?.addEventListener('click', () => openStepModal(appState.currentStep));

  // Recenter map button
  recenterMapBtn?.addEventListener('click', () => {
    houseCanvas.fitView();
    sound.playClick();
  });

  // Global Keyboard Shortcuts
  window.addEventListener('keydown', (e) => {
    // If modal is open, Escape closes it
    if (modalOverlay && modalOverlay.style.display !== 'none') {
      if (e.key === 'Escape') {
        closeStepModal();
        e.preventDefault();
      }
      return;
    }

    // Space opens modal or station
    if (e.key === ' ' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
      if (houseCanvas.activeStationPrompt) {
        openStepModal(houseCanvas.activeStationPrompt.step);
      } else {
        openStepModal(appState.currentStep);
      }
      e.preventDefault();
    }
  });

  // Listen to step changes
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
  // AUDIO & VIEW CONTROLS
  // -------------------------------------------------------------
  const muteBtn = document.getElementById('muteToggleBtn');
  muteBtn?.addEventListener('click', () => {
    const isMuted = sound.toggleMute();
    muteBtn.innerText = isMuted ? '🔇 Audio Off' : '🔊 Audio On';
    if (!isMuted) sound.playClick();
  });

  const viewModeBtn = document.getElementById('viewModeToggleBtn');
  viewModeBtn?.addEventListener('click', () => {
    const mode = houseCanvas.toggleViewMode();
    viewModeBtn.innerText = mode === 'architectural' ? '📐 Blueprint' : '🖼️ Hybrid';
    sound.playClick();
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

  // Play/Pause
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

  // Reset
  hudResetBtn?.addEventListener('click', () => {
    simEngine.reset();
    simEngine.start();
    hudPlayPauseBtn.innerText = '⏸';
    hudStatusDot?.classList.add('running');
    hudStatusDot?.classList.remove('paused');
    if (hudStatusText) hudStatusText.innerText = 'SIM RUNNING';
    sound.playClick();
  });

  // Speed Multiplier
  hudSpeedBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const spd = parseInt(btn.getAttribute('data-speed'), 10);
      simEngine.setSpeed(spd);
      hudSpeedBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      sound.playClick();
    });
  });

  // Quick Observation Stamps
  document.getElementById('hudStampPass')?.addEventListener('click', () => {
    appState.addObservation('✓', 'Observed in full-screen map');
    sound.playSnap();
  });
  document.getElementById('hudStampFail')?.addEventListener('click', () => {
    appState.addObservation('✗', 'Observed mismatch in full-screen map');
    sound.playSnap();
  });
  document.getElementById('hudStampQuery')?.addEventListener('click', () => {
    appState.addObservation('?', 'Marked for dyadic discussion');
    sound.playSnap();
  });

  // Open Step 5 Lab Button
  hudOpenLabBtn?.addEventListener('click', () => {
    openStepModal(5);
  });

  // Update HUD metrics on simulation tick
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

  // Automatically start background simulation at 1x so environment is alive
  simEngine.start();

  console.log('🚀 CollabPEAS 2D Web Application Initialized with Fullscreen Map & Modal Workstations.');
});
