/**
 * CollabPEAS - Main Application Coordinator
 * Boots all subsystems, binds top navigation bar, controls player role switching,
 * and coordinates 2D House rendering with simulation engine and PEAS workflows.
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

  // 2. Initialize 2D Interactive House Canvas
  const canvasEl = document.getElementById('houseCanvas');
  const houseCanvas = new HouseCanvasRenderer(canvasEl, world);

  // 3. Initialize 10Hz Simulation Engine
  const simEngine = new SimulationEngine(world);
  window.simEngine = simEngine; // accessible to step views

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

  // 6. Bind Top Navigation Steps
  const navItems = document.querySelectorAll('.step-nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const step = parseInt(item.getAttribute('data-step'), 10);
      appState.setStep(step);
      sound.playClick();
    });
  });

  appState.on('stepChanged', ({ step }) => {
    navItems.forEach(item => {
      const s = parseInt(item.getAttribute('data-step'), 10);
      if (s === step) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Toggle visibility between 4-slot code canvas and step panel
    if (step === 4) {
      if (blockCanvasContainer) blockCanvasContainer.style.display = 'block';
      if (stepsPanelEl) stepsPanelEl.style.display = 'none';
      blockCanvasView.render();
    } else {
      if (blockCanvasContainer) blockCanvasContainer.style.display = 'none';
      if (stepsPanelEl) stepsPanelEl.style.display = 'block';
      stepsView.render();
    }
  });

  // 7. Player Role Switcher (Player A / Player B)
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

  // 8. Audio Toggle
  const muteBtn = document.getElementById('muteToggleBtn');
  muteBtn?.addEventListener('click', () => {
    const isMuted = sound.toggleMute();
    muteBtn.innerText = isMuted ? '🔇 Audio Off' : '🔊 Audio On';
    if (!isMuted) sound.playClick();
  });

  // 9. View Mode Toggle (Architectural vs Hybrid)
  const viewModeBtn = document.getElementById('viewModeToggleBtn');
  viewModeBtn?.addEventListener('click', () => {
    const mode = houseCanvas.toggleViewMode();
    viewModeBtn.innerText = mode === 'architectural' ? '📐 Blueprint' : '🖼️ Hybrid';
    sound.playClick();
  });

  // 10. Quick POV Button in Top Bar
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

  // 10. Update Mutual Contribution Awareness Display
  function updateContributionBar() {
    const stats = sessionLogger.getSummaryStats();
    const ratioEl = document.getElementById('contribRatioA');
    const labelEl = document.getElementById('contribStatsText');
    if (ratioEl) ratioEl.style.width = `${stats.ratio}%`;
    if (labelEl) labelEl.innerText = `A: ${stats.playerACount} | B: ${stats.playerBCount}`;
  }

  appState.on('tick', () => {
    if (appState.simTick % 20 === 0) {
      updateContributionBar();
    }
  });

  // Initial render
  stepsView.render();
  updatePlayerUi(appState.activePlayerId);

  // Automatically start background simulation at 1x so environment is alive
  simEngine.start();
  console.log('🚀 CollabPEAS 2D Web Application Initialized Successfully.');
});
