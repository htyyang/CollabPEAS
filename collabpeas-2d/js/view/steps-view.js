/**
 * CollabPEAS - Step Views Component (Steps 1 through 5)
 * Renders dedicated panels for PEAS components:
 * Step 1: Purpose & Performance Measures (P)
 * Step 2: Environment & Sensors (E & S)
 * Step 3: Actuators (A)
 * Step 4: Decision Logic (Vibe Coding Canvas)
 * Step 5: Test, Debug & PEAS Reflection (Full Iteration)
 */

import { appState } from '../state.js';
import { TASKS_CATALOG, PEAS_DIMENSIONS } from '../data/tasks.js';
import { SENSORS_CATALOG, MAX_SENSOR_SLOTS, MIN_SENSOR_SLOTS } from '../data/sensors.js';
import { ACTUATORS_CATALOG, ACTUATOR_CATEGORIES } from '../data/actuators.js';
import { sound } from './audio.js';
import { sessionLogger } from '../logging/session-log.js';

export class StepsView {
  constructor(panelElement, blockCanvasView, dualLogView) {
    this.panel = panelElement;
    this.blockCanvasView = blockCanvasView;
    this.dualLogView = dualLogView;
    this.init();
  }

  init() {
    appState.on('stepChanged', () => this.render());
    appState.on('playerChanged', () => this.render());
    appState.on('weightsChanged', () => this.render());
    appState.on('sensorsChanged', () => this.render());
    appState.on('actuatorsChanged', () => this.render());
    appState.on('tick', ({ scores, percepts, robot }) => this.updateStep5LiveDashboard(scores, percepts, robot));
  }

  render() {
    if (!this.panel) return;
    const step = appState.currentStep;

    switch (step) {
      case 1:
        this.renderStep1();
        break;
      case 2:
        this.renderStep2();
        break;
      case 3:
        this.renderStep3();
        break;
      case 4:
        this.renderStep4();
        break;
      case 5:
        this.renderStep5();
        break;
    }
  }

  // -------------------------------------------------------------
  // STEP 1: Purpose & Performance Measures (P)
  // -------------------------------------------------------------
  renderStep1() {
    const w = appState.weights;
    const dominant = appState.getDominantDimension();
    const dominantColor = PEAS_DIMENSIONS[dominant].color;

    this.panel.innerHTML = `
      <div class="step-view-card">
        <div class="step-header">
          <div class="step-tag">Step 1 of 5 • PEAS: Performance Measure (P)</div>
          <h2>🎯 Define Your Agent & Evaluation Criteria</h2>
          <p class="step-desc">
            Define what your cleaning robot is designed to achieve and how success will be measured.
            A goal ("clean the apartment") differs from a <strong>Performance Measure</strong>
            which mathematically specifies tradeoffs between speed, coverage, safety, and hazard handling.
          </p>
        </div>

        <!-- 1A. Agent Purpose Statement -->
        <div class="card-section">
          <h3>1A. Agent Purpose Statement</h3>
          <div class="purpose-box">
            <span class="purpose-icon">🤖</span>
            <input type="text" class="purpose-input" id="purposeInput" value="${appState.agentPurpose}" />
          </div>
        </div>

        <!-- 1B. The Six Household Tasks -->
        <div class="card-section">
          <div class="section-title-row">
            <h3>1B. Six Household Tasks Catalog</h3>
            <span class="badge badge-info">All 6 Required in Study</span>
          </div>
          <div class="task-catalog-grid">
            ${TASKS_CATALOG.map(t => `
              <div class="task-card ${appState.activeTaskFocus === t.id ? 'active-task' : ''}" data-task-id="${t.id}">
                <div class="task-card-header">
                  <span class="task-card-icon">${t.icon}</span>
                  <strong>${t.name}</strong>
                </div>
                <p class="task-card-desc">${t.description}</p>
                <div class="task-card-footer">
                  <span class="dim-pill" style="border-color: ${PEAS_DIMENSIONS[t.primaryDimension].color}; color: ${PEAS_DIMENSIONS[t.primaryDimension].color}">
                    ${t.primaryDimension}
                  </span>
                  <span class="req-modules">${t.requiredModuleNames.length} modules needed</span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- 1C. Performance Measure Sliders -->
        <div class="card-section">
          <div class="section-title-row">
            <h3>1C. Performance Measure Sliders</h3>
            <span class="badge" style="background: ${dominantColor}; color: #000; font-weight: bold;">
              Dominant Priority: ${dominant}
            </span>
          </div>
          <p class="slider-guidance">
            Adjust the weights below to shape the robot's objective function.
            Opposing priorities (e.g. maximum speed vs maximum safety) will trigger conflict trade-offs.
          </p>

          <div class="slider-group">
            <!-- Coverage -->
            <div class="slider-row">
              <div class="slider-meta">
                <span class="slider-label" style="color: #eab308">🧹 Coverage Weight (Clean Area & Objects)</span>
                <span class="slider-val" id="val-Coverage">${w.Coverage}%</span>
              </div>
              <input type="range" min="0" max="100" value="${w.Coverage}" class="range-slider" data-dim="Coverage" />
            </div>

            <!-- Safety -->
            <div class="slider-row">
              <div class="slider-meta">
                <span class="slider-label" style="color: #22c55e">🛡️ Safety Weight (Cat & Operator Clearance)</span>
                <span class="slider-val" id="val-Safety">${w.Safety}%</span>
              </div>
              <input type="range" min="0" max="100" value="${w.Safety}" class="range-slider" data-dim="Safety" />
            </div>

            <!-- Time -->
            <div class="slider-row">
              <div class="slider-meta">
                <span class="slider-label" style="color: #3b82f6">⏱️ Time / Speed Weight (Duration & Efficiency)</span>
                <span class="slider-val" id="val-Time">${w.Time}%</span>
              </div>
              <input type="range" min="0" max="100" value="${w.Time}" class="range-slider" data-dim="Time" />
            </div>

            <!-- Hazard Response -->
            <div class="slider-row">
              <div class="slider-meta">
                <span class="slider-label" style="color: #a855f7">⚠️ Hazard Response Weight (Wet Spills & Cables)</span>
                <span class="slider-val" id="val-Hazard">${w.Hazard}%</span>
              </div>
              <input type="range" min="0" max="100" value="${w.Hazard}" class="range-slider" data-dim="Hazard" />
            </div>
          </div>
        </div>

        <!-- Navigation Next -->
        <div class="step-nav-footer">
          <div class="partner-agreement-check">
            <span>🤝 Player A & B Alignment: Both partners confirmed Step 1 specifications.</span>
          </div>
          <button class="btn btn-primary next-step-btn" data-next="2">Proceed to Step 2: Sensors ➔</button>
        </div>
      </div>
    `;

    this.attachStep1Events();
  }

  attachStep1Events() {
    this.panel.querySelectorAll('.range-slider').forEach(slider => {
      slider.oninput = (e) => {
        const dim = slider.getAttribute('data-dim');
        const val = parseInt(e.target.value, 10);
        appState.setWeight(dim, val);
        const valEl = this.panel.querySelector(`#val-${dim}`);
        if (valEl) valEl.innerText = `${val}%`;
      };
    });

    this.panel.querySelector('#purposeInput')?.addEventListener('change', (e) => {
      appState.agentPurpose = e.target.value;
      sessionLogger.log('PURPOSE_UPDATED', e.target.value);
    });

    this.panel.querySelector('.next-step-btn')?.addEventListener('click', () => {
      sound.playSnap();
      appState.setStep(2);
    });
  }

  // -------------------------------------------------------------
  // STEP 2: Know Your World & Select Sensors (E & S)
  // -------------------------------------------------------------
  renderStep2() {
    const installed = appState.installedSensors;
    const count = installed.size;
    const isReady = count >= MIN_SENSOR_SLOTS && count <= MAX_SENSOR_SLOTS;

    // Percept Summary data
    const canPerceive = [];
    const cannotPerceive = [];

    SENSORS_CATALOG.forEach(s => {
      if (installed.has(s.id)) {
        canPerceive.push(`<strong>${s.name}</strong>: ${s.measures}`);
      } else {
        cannotPerceive.push(`<strong>${s.name}</strong>: Cannot detect (${s.misses})`);
      }
    });

    this.panel.innerHTML = `
      <div class="step-view-card">
        <div class="step-header">
          <div class="step-tag">Step 2 of 5 • PEAS: Environment (E) + Sensors (S)</div>
          <h2>📡 Select Hardware Sensors & Explore the Apartment</h2>
          <p class="step-desc">
            Equip your robot with the sensory apparatus required for the household tasks.
            The chassis holds a maximum of <strong>11 physical sensor slots</strong> (minimum 8 required).
            Sensors not mounted create critical blindspots.
          </p>
        </div>

        <!-- POV Mode CTA -->
        <div class="pov-callout">
          <div>
            <h4>👁️ Test Robot Point-of-View (POV) Mode</h4>
            <p>Experience the apartment filtered through your selected sensors.</p>
          </div>
          <button class="btn btn-accent trigger-pov-btn">Enter Robot POV</button>
        </div>

        <!-- Sensor Slot Capacity Bar -->
        <div class="capacity-bar-section">
          <div class="capacity-header">
            <span>Chassis Mounting Slots: <strong>${count} / ${MAX_SENSOR_SLOTS}</strong></span>
            <span class="badge ${isReady ? 'badge-success' : 'badge-danger'}">
              ${isReady ? '✓ Capacity Valid' : count < MIN_SENSOR_SLOTS ? `Need at least ${MIN_SENSOR_SLOTS} sensors` : 'Chassis Full!'}
            </span>
          </div>
          <div class="capacity-track">
            <div class="capacity-fill" style="width: ${(count / MAX_SENSOR_SLOTS) * 100}%; background: ${count > MAX_SENSOR_SLOTS ? '#ef4444' : '#0284c7'}"></div>
          </div>
        </div>

        <!-- Sensor Catalog Grid (15 Sensors) -->
        <div class="sensor-selection-grid">
          ${SENSORS_CATALOG.map(s => {
            const isInstalled = installed.has(s.id);
            return `
              <div class="sensor-card ${isInstalled ? 'installed' : ''} ${s.isDistractor ? 'distractor-item' : ''}" data-sensor-id="${s.id}">
                <div class="sensor-card-top">
                  <span class="sensor-id-pill">${s.id}</span>
                  <span class="sensor-icon">${s.icon}</span>
                  <button class="sensor-toggle-btn ${isInstalled ? 'btn-remove' : 'btn-add'}">
                    ${isInstalled ? '✓ Mounted' : '+ Mount'}
                  </button>
                </div>
                <div class="sensor-card-name">${s.name}</div>
                <div class="sensor-meta-row">
                  <span>Returns: <strong>${s.returns}</strong></span>
                </div>
                <p class="sensor-measures">${s.measures}</p>
                <div class="sensor-misses">⚠️ Misses: ${s.misses}</div>
                ${s.isDistractor ? `<div class="distractor-warning">⚠️ Note: Check if relevant to cleaning task!</div>` : ''}
              </div>
            `;
          }).join('')}
        </div>

        <!-- Percept Summary Screen (Design Flow 2.2.3) -->
        <div class="card-section percept-summary-box">
          <h3>Percept Summary (Bounded Percept Sequence)</h3>
          <p class="summary-sub">Bridging sensor selection to decision logic:</p>
          <div class="percept-columns">
            <div class="percept-col can-col">
              <h4>✓ What Robot CAN Perceive</h4>
              <ul>
                ${canPerceive.map(item => `<li>${item}</li>`).join('')}
              </ul>
            </div>
            <div class="percept-col cannot-col">
              <h4>🚫 Perception Blindspots (Unmounted)</h4>
              <ul>
                ${cannotPerceive.slice(0, 5).map(item => `<li>${item}</li>`).join('')}
              </ul>
            </div>
          </div>
        </div>

        <!-- Navigation Next -->
        <div class="step-nav-footer">
          <button class="btn btn-secondary prev-step-btn" data-prev="1">⬅ Back to Step 1</button>
          <button class="btn btn-primary next-step-btn ${!isReady ? 'disabled' : ''}" data-next="3">
            Proceed to Step 3: Actuators ➔
          </button>
        </div>
      </div>
    `;

    this.attachStep2Events();
  }

  attachStep2Events() {
    this.panel.querySelectorAll('.sensor-card').forEach(card => {
      card.onclick = (e) => {
        const id = card.getAttribute('data-sensor-id');
        const res = appState.toggleSensor(id);
        if (!res.success) {
          alert(res.reason);
        } else {
          sound.playSnap();
        }
      };
    });

    this.panel.querySelector('.trigger-pov-btn')?.addEventListener('click', () => {
      appState.isRobotPovActive = true;
      const povEl = document.getElementById('robotPovModal');
      if (povEl) povEl.style.display = 'block';
      sound.playClick();
    });

    this.panel.querySelector('.prev-step-btn')?.addEventListener('click', () => {
      appState.setStep(1);
    });

    this.panel.querySelector('.next-step-btn')?.addEventListener('click', () => {
      if (appState.installedSensors.size >= MIN_SENSOR_SLOTS) {
        sound.playSnap();
        appState.setStep(3);
      }
    });
  }

  // -------------------------------------------------------------
  // STEP 3: Give Your Robot a Body (Actuators - A)
  // -------------------------------------------------------------
  renderStep3() {
    const installed = appState.installedActuators;
    const requiredActuators = [
      'ACTUATOR_WHEELS', 'ACTUATOR_ROTATION', 'ACTUATOR_ESTOP',
      'ACTUATOR_VACUUM', 'ACTUATOR_MOP', 'ACTUATOR_ARM_EXT',
      'ACTUATOR_GRIP_CLOSE', 'ACTUATOR_GRIP_OPEN', 'ACTUATOR_ARM_RET',
      'ACTUATOR_DOCK_PIN'
    ];
    const installedRequiredCount = requiredActuators.filter(id => installed.has(id)).length;
    const assemblyPct = Math.round((installedRequiredCount / requiredActuators.length) * 100);

    this.panel.innerHTML = `
      <div class="step-view-card">
        <div class="step-header">
          <div class="step-tag">Step 3 of 5 • PEAS: Actuators (A)</div>
          <h2>🦾 Mount Physical Actuators & Robot Hardware</h2>
          <p class="step-desc">
            Select physical capabilities (drive wheels, rotation pivot, vacuum suction, mop pad,
            robotic arm, gripper, docking pin) that determine what actions your robot can physically execute.
            Actions programmed without their required actuator will fail.
          </p>
        </div>

        <!-- Magnetic Structure Assembly Bay (Inspired by Fusion VR Training ActivityMagnetStructureAttachment) -->
        <div class="assembly-bay-card">
          <div class="bay-header">
            <div>
              <h4>🧲 Magnetic Structure Assembly Bay</h4>
              <span class="bay-sub">Live Hardware Snapping Pedestal • Fusion VR Training Mechanics</span>
            </div>
            <div class="assembly-meter">
              <span class="meter-score">${installedRequiredCount} / ${requiredActuators.length} Required Modules (${assemblyPct}%)</span>
              <div class="meter-track">
                <div class="meter-bar" style="width: ${assemblyPct}%; background: ${assemblyPct >= 100 ? '#22c55e' : '#38bdf8'}"></div>
              </div>
            </div>
          </div>

          <!-- Robot Visual Assembly Diagram -->
          <div class="robot-schematic-diagram">
            <div class="schematic-center">
              <div class="robot-chassis-core">
                <span class="core-label">CHASSIS CORE</span>
                <span class="core-status ${installed.has('ACTUATOR_LED') ? 'glowing' : ''}">
                  ${installed.has('ACTUATOR_LED') ? '🚨 LED HALO ACTIVE' : 'NO STATUS LIGHT'}
                </span>
              </div>
            </div>

            <!-- Magnetic Slots Around Chassis -->
            <div class="schematic-slots-grid">
              <div class="schematic-slot ${installed.has('ACTUATOR_WHEELS') ? 'attached' : 'empty'}" data-act-id="ACTUATOR_WHEELS">
                <span class="slot-icon">⚙️</span>
                <span class="slot-name">Drive Wheels</span>
                <span class="slot-magnet-badge">${installed.has('ACTUATOR_WHEELS') ? 'BONDED' : 'OPEN'}</span>
              </div>
              <div class="schematic-slot ${installed.has('ACTUATOR_ROTATION') ? 'attached' : 'empty'}" data-act-id="ACTUATOR_ROTATION">
                <span class="slot-icon">🔄</span>
                <span class="slot-name">Turntable Pivot</span>
                <span class="slot-magnet-badge">${installed.has('ACTUATOR_ROTATION') ? 'BONDED' : 'OPEN'}</span>
              </div>
              <div class="schematic-slot ${installed.has('ACTUATOR_ESTOP') ? 'attached' : 'empty'}" data-act-id="ACTUATOR_ESTOP">
                <span class="slot-icon">🛑</span>
                <span class="slot-name">Emergency Brake</span>
                <span class="slot-magnet-badge">${installed.has('ACTUATOR_ESTOP') ? 'BONDED' : 'OPEN'}</span>
              </div>
              <div class="schematic-slot ${installed.has('ACTUATOR_VACUUM') ? 'attached' : 'empty'}" data-act-id="ACTUATOR_VACUUM">
                <span class="slot-icon">🌪️</span>
                <span class="slot-name">Vacuum Suction</span>
                <span class="slot-magnet-badge">${installed.has('ACTUATOR_VACUUM') ? 'BONDED' : 'OPEN'}</span>
              </div>
              <div class="schematic-slot ${installed.has('ACTUATOR_MOP') ? 'attached' : 'empty'}" data-act-id="ACTUATOR_MOP">
                <span class="slot-icon">🧽</span>
                <span class="slot-name">Mop Deployer</span>
                <span class="slot-magnet-badge">${installed.has('ACTUATOR_MOP') ? 'BONDED' : 'OPEN'}</span>
              </div>
              <div class="schematic-slot ${installed.has('ACTUATOR_ARM_EXT') ? 'attached' : 'empty'}" data-act-id="ACTUATOR_ARM_EXT">
                <span class="slot-icon">🦾</span>
                <span class="slot-name">Telescopic Arm</span>
                <span class="slot-magnet-badge">${installed.has('ACTUATOR_ARM_EXT') ? 'BONDED' : 'OPEN'}</span>
              </div>
              <div class="schematic-slot ${installed.has('ACTUATOR_GRIP_CLOSE') ? 'attached' : 'empty'}" data-act-id="ACTUATOR_GRIP_CLOSE">
                <span class="slot-icon">✊</span>
                <span class="slot-name">Gripper Claw</span>
                <span class="slot-magnet-badge">${installed.has('ACTUATOR_GRIP_CLOSE') ? 'BONDED' : 'OPEN'}</span>
              </div>
              <div class="schematic-slot ${installed.has('ACTUATOR_DOCK_PIN') ? 'attached' : 'empty'}" data-act-id="ACTUATOR_DOCK_PIN">
                <span class="slot-icon">🔌</span>
                <span class="slot-name">Docking Pin</span>
                <span class="slot-magnet-badge">${installed.has('ACTUATOR_DOCK_PIN') ? 'BONDED' : 'OPEN'}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Grouped Actuator Library (14 Actuators) -->
        <div class="actuator-categories-list">
          ${ACTUATOR_CATEGORIES.map(category => {
            const actuators = ACTUATORS_CATALOG.filter(a => a.category === category);
            return `
              <div class="actuator-category-block">
                <h4 class="category-heading">${category}</h4>
                <div class="actuator-cards-grid">
                  ${actuators.map(act => {
                    const isMounted = installed.has(act.id);
                    return `
                      <div class="actuator-card ${isMounted ? 'mounted' : ''} ${act.isDistractor ? 'distractor-item' : ''}" data-act-id="${act.id}">
                        <div class="actuator-card-top">
                          <span class="act-icon">${act.icon}</span>
                          <strong>${act.name}</strong>
                          <button class="act-toggle-btn ${isMounted ? 'btn-remove' : 'btn-add'}">
                            ${isMounted ? '✓ Bonded' : '+ Attach'}
                          </button>
                        </div>
                        <p class="act-does"><strong>Does:</strong> ${act.does}</p>
                        <p class="act-cannot"><strong>Limit:</strong> ${act.cannot}</p>
                        <div class="act-part">Hardware Module: ${act.bodyPart}</div>
                        ${act.isDistractor ? `<div class="distractor-warning">⚠️ Redundant: arm speed is set in software!</div>` : ''}
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <!-- Navigation Next -->
        <div class="step-nav-footer">
          <button class="btn btn-secondary prev-step-btn" data-prev="2">⬅ Back to Step 2</button>
          <button class="btn btn-primary next-step-btn" data-next="4">
            Proceed to Step 4: Block Coding ➔
          </button>
        </div>
      </div>
    `;

    this.attachStep3Events();
  }

  attachStep3Events() {
    this.panel.querySelectorAll('.actuator-card').forEach(card => {
      card.onclick = () => {
        const id = card.getAttribute('data-act-id');
        appState.toggleActuator(id);
        sound.playSnap();
      };
    });

    this.panel.querySelector('.prev-step-btn')?.addEventListener('click', () => {
      appState.setStep(2);
    });

    this.panel.querySelector('.next-step-btn')?.addEventListener('click', () => {
      sound.playSnap();
      appState.setStep(4);
    });
  }

  // -------------------------------------------------------------
  // STEP 4: Program Your Robot (Decision Logic / Vibe Coding)
  // -------------------------------------------------------------
  renderStep4() {
    // Delegated to blockCanvasView
    if (this.blockCanvasView) {
      this.blockCanvasView.render();
    }
  }

  // -------------------------------------------------------------
  // STEP 5: Test, Debug, and Reflect (PEAS Iteration)
  // -------------------------------------------------------------
  renderStep5() {
    const scores = { coverage: 0, safety: 100, time: 100, hazard: 100, composite: 80 };

    this.panel.innerHTML = `
      <div class="step-view-card">
        <div class="step-header">
          <div class="step-tag">Step 5 of 5 • PEAS: Test, Debug & Closing Reflection</div>
          <h2>🔬 Live Simulation, Dual Logging & Reflection</h2>
          <p class="step-desc">
            Observe your specified robot executing in the 2D Apartment.
            Mark observations, trigger structured debug moves, and respond to the PEAS reflection prompts.
          </p>
        </div>

        <!-- Fusion VR Training Control Stand Kiosk Display (Inspired by ControlStandActivityStatusUI) -->
        <div class="control-stand-kiosk">
          <div class="kiosk-header">
            <span class="kiosk-badge">🖥️ FUSION VR CONTROL STAND</span>
            <span class="kiosk-status" id="kioskActivityStatus">● ACTIVITY IN PROGRESS (10Hz SHARED TICK)</span>
          </div>
          <div class="kiosk-body">
            <div class="kiosk-metric">
              <span class="kiosk-lbl">Role Authority:</span>
              <strong class="kiosk-val" id="kioskUserRole">${appState.activePlayerId} (${appState.playerRoles[appState.activePlayerId]})</strong>
            </div>
            <div class="kiosk-metric">
              <span class="kiosk-lbl">Active Activity:</span>
              <strong class="kiosk-val">PEAS Agent Specification & Test</strong>
            </div>
            <div class="kiosk-metric">
              <span class="kiosk-lbl">Target Environment:</span>
              <strong class="kiosk-val">Apartment (8 Rooms + Workshop)</strong>
            </div>
          </div>
        </div>

        <!-- Simulation Control Bar -->
        <div class="sim-control-bar">
          <div class="btn-group">
            <button class="btn btn-success sim-play-btn" id="simPlayBtn">▶ Run Simulation</button>
            <button class="btn btn-warning sim-pause-btn" id="simPauseBtn">⏸ Pause</button>
            <button class="btn btn-outline sim-reset-btn" id="simResetBtn">↺ Reset Activity</button>
            <button class="btn btn-outline watch-map-btn" id="watchInMapBtn" title="Close modal and observe robot on full-screen map">↗ Watch in Full-Screen Map</button>
          </div>
          <div class="speed-control">
            <span>Speed:</span>
            <button class="speed-btn active" data-speed="1">1x</button>
            <button class="speed-btn" data-speed="2">2x</button>
            <button class="speed-btn" data-speed="4">4x</button>
          </div>
          <div class="sim-tick-clock">
            Tick: <strong id="simTickCounter">0</strong> (0.0s)
          </div>
        </div>

        <!-- Real-Time PEAS Score Gauges -->
        <div class="score-dashboard-grid">
          <div class="score-card coverage">
            <div class="score-title">🧹 Coverage Score</div>
            <div class="score-value" id="scoreCoverageVal">0%</div>
            <div class="score-progress"><div class="score-bar" id="scoreCoverageBar" style="width: 0%"></div></div>
          </div>
          <div class="score-card safety">
            <div class="score-title">🛡️ Safety Score</div>
            <div class="score-value" id="scoreSafetyVal">100%</div>
            <div class="score-progress"><div class="score-bar" id="scoreSafetyBar" style="width: 100%"></div></div>
          </div>
          <div class="score-card time">
            <div class="score-title">⏱️ Time / Power</div>
            <div class="score-value" id="scoreTimeVal">100%</div>
            <div class="score-progress"><div class="score-bar" id="scoreTimeBar" style="width: 100%"></div></div>
          </div>
          <div class="score-card hazard">
            <div class="score-title">⚠️ Hazard Response</div>
            <div class="score-value" id="scoreHazardVal">100%</div>
            <div class="score-progress"><div class="score-bar" id="scoreHazardBar" style="width: 100%"></div></div>
          </div>
          <div class="score-card composite">
            <div class="score-title">🏆 Weighted PEAS Total</div>
            <div class="score-value" id="scoreCompositeVal">80%</div>
            <div class="score-progress"><div class="score-bar" id="scoreCompositeBar" style="width: 80%"></div></div>
          </div>
        </div>

        <!-- Dual Observation Log & Agreement (CSCW Paper 4.2) -->
        <div class="card-section" id="dualLogMount"></div>

        <!-- The Three Debug Moves (Design Flow 5.3) -->
        <div class="card-section">
          <div class="section-title-row">
            <h3>🛠️ The Three Debug Moves (Symmetric Protocol)</h3>
            <span class="badge badge-info">Iteration #${appState.debugIterations}</span>
          </div>
          <p class="slider-guidance">
            Before changing anything, the system enforces a 2-second verbal agreement checkpoint:
            <em>"What caused this? Discuss before changing anything."</em>
          </p>
          <div class="debug-moves-grid">
            <div class="debug-move-card" data-move="move1_swap">
              <h4>Move 1: Swap / Modify a Block</h4>
              <p>Pick up an underperforming block on the canvas and swap it with a replacement from the library.</p>
              <button class="btn btn-sm btn-outline debug-btn" data-move="move1_swap">Execute Move 1</button>
            </div>
            <div class="debug-move-card" data-move="move2_addRule">
              <h4>Move 2: Add Missing Rule</h4>
              <p>Construct a new rule frame to handle an unhandled environmental contingency.</p>
              <button class="btn btn-sm btn-outline debug-btn" data-move="move2_addRule">Execute Move 2</button>
            </div>
            <div class="debug-move-card" data-move="move3_returnStep">
              <h4>Move 3: Return to Earlier PEAS Step</h4>
              <p>Return to Step 2 (mount missing sensor) or Step 3 (install needed actuator) to address structural gaps.</p>
              <button class="btn btn-sm btn-outline debug-btn" data-move="move3_returnStep">Execute Move 3</button>
            </div>
          </div>
        </div>

        <!-- PEAS Reflection Prompt Modal Trigger -->
        <div class="card-section reflection-section">
          <h3>💭 Spatially Embedded PEAS Reflection</h3>
          <p>
            When a performance score drops, learners reason:
            <strong>"Is your robot behaving irrationally — or rationally with a wrong specification?"</strong>
          </p>
          <div class="reflection-options">
            <button class="ref-opt-btn" data-opt="sensor">A. My sensor doesn't detect what I expected</button>
            <button class="ref-opt-btn" data-opt="rule">B. My decision rule fires at the wrong time</button>
            <button class="ref-opt-btn" data-opt="actuator">C. My actuator can't do what my performance measure requires</button>
            <button class="ref-opt-btn" data-opt="weights">D. My performance measure weights are set incorrectly</button>
          </div>
        </div>

        <!-- Closing Summary & Export -->
        <div class="step-nav-footer">
          <button class="btn btn-secondary prev-step-btn" data-prev="4">⬅ Back to Code Canvas</button>
          <button class="btn btn-primary export-summary-btn" id="exportSummaryBtn">
            📋 View Final PEAS Summary & Export CSV
          </button>
        </div>
      </div>
    `;

    // Mount Dual Observation Logger inside Step 5
    const dualLogEl = this.panel.querySelector('#dualLogMount');
    if (dualLogEl && this.dualLogView) {
      this.dualLogView.container = dualLogEl;
      this.dualLogView.render();
    }

    this.attachStep5Events();
  }

  attachStep5Events() {
    this.panel.querySelector('#simPlayBtn')?.addEventListener('click', () => {
      window.simEngine?.start();
      sound.playSnap();
    });

    this.panel.querySelector('#simPauseBtn')?.addEventListener('click', () => {
      window.simEngine?.stop();
      sound.playClick();
    });

    this.panel.querySelector('#simResetBtn')?.addEventListener('click', () => {
      window.simEngine?.reset();
      sound.playChime();
    });

    this.panel.querySelector('#watchInMapBtn')?.addEventListener('click', () => {
      window.closeStepModal?.();
      sound.playClick();
    });

    this.panel.querySelectorAll('.speed-btn').forEach(btn => {
      btn.onclick = () => {
        this.panel.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const spd = parseFloat(btn.getAttribute('data-speed'));
        window.simEngine?.setSpeed(spd);
      };
    });

    this.panel.querySelectorAll('.debug-btn').forEach(btn => {
      btn.onclick = () => {
        const move = btn.getAttribute('data-move');
        // 2-second Verbal Agreement Protocol Prompt
        this.triggerVerbalAgreementPrompt(() => {
          appState.recordDebugMove(move);
          if (move === 'move1_swap' || move === 'move2_addRule') {
            appState.setStep(4);
          } else if (move === 'move3_returnStep') {
            appState.setStep(2);
          }
        });
      };
    });

    this.panel.querySelectorAll('.ref-opt-btn').forEach(btn => {
      btn.onclick = () => {
        this.panel.querySelectorAll('.ref-opt-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        sound.playSnap();
        sessionLogger.log('PEAS_REFLECTION_ANSWERED', btn.innerText);
        alert(`Recorded selection for ${appState.activePlayerId}: "${btn.innerText}"`);
      };
    });

    this.panel.querySelector('#exportSummaryBtn')?.addEventListener('click', () => {
      this.showFinalSummaryModal();
    });

    this.panel.querySelector('.prev-step-btn')?.addEventListener('click', () => {
      appState.setStep(4);
    });
  }

  triggerVerbalAgreementPrompt(onProceed) {
    const modal = document.createElement('div');
    modal.className = 'verbal-prompt-overlay';
    modal.innerHTML = `
      <div class="verbal-prompt-card">
        <span class="prompt-icon">💬</span>
        <h3>What caused this? Discuss with your partner before changing anything.</h3>
        <p>Take 2 seconds to verbally agree on diagnosis before touching the specification...</p>
        <div class="prompt-timer-bar"><div class="timer-fill"></div></div>
      </div>
    `;
    document.body.appendChild(modal);

    setTimeout(() => {
      modal.remove();
      onProceed();
    }, 2000);
  }

  updateStep5LiveDashboard(scores, percepts, robot) {
    if (appState.currentStep !== 5) return;

    const tickEl = document.getElementById('simTickCounter');
    if (tickEl) {
      tickEl.innerText = `${appState.simTick} (${(appState.simTick / 10).toFixed(1)}s)`;
    }

    const setGauge = (id, val) => {
      const vEl = document.getElementById(`score${id}Val`);
      const bEl = document.getElementById(`score${id}Bar`);
      if (vEl) vEl.innerText = `${val}%`;
      if (bEl) bEl.style.width = `${val}%`;
    };

    setGauge('Coverage', scores.coverage);
    setGauge('Safety', scores.safety);
    setGauge('Time', scores.time);
    setGauge('Hazard', scores.hazard);
    setGauge('Composite', scores.composite);
  }

  showFinalSummaryModal() {
    const stats = sessionLogger.getSummaryStats();
    const w = appState.weights;
    const scores = window.simEngine?.scores || { coverage: 90, safety: 95, time: 85, hazard: 100, composite: 92 };

    const modal = document.createElement('div');
    modal.className = 'modal-backdrop';
    modal.innerHTML = `
      <div class="summary-modal-card">
        <div class="modal-header">
          <h2>📊 CollabPEAS Final Session Summary</h2>
          <button class="close-modal-btn">✕</button>
        </div>

        <div class="summary-grid">
          <div class="summary-col">
            <h4>🎯 Agent Purpose & Weights</h4>
            <p><strong>Purpose:</strong> ${appState.agentPurpose}</p>
            <ul>
              <li>Coverage: ${w.Coverage}%</li>
              <li>Safety: ${w.Safety}%</li>
              <li>Time: ${w.Time}%</li>
              <li>Hazard: ${w.Hazard}%</li>
            </ul>

            <h4>📡 Sensors & Actuators Installed</h4>
            <p><strong>Sensors (${appState.installedSensors.size}):</strong> ${Array.from(appState.installedSensors).join(', ')}</p>
            <p><strong>Actuators (${appState.installedActuators.size}):</strong> ${Array.from(appState.installedActuators).join(', ')}</p>
          </div>

          <div class="summary-col">
            <h4>🏆 Performance Measure Scores</h4>
            <div class="metric-row"><span>Coverage Score:</span><strong>${scores.coverage}%</strong></div>
            <div class="metric-row"><span>Safety Score:</span><strong>${scores.safety}%</strong></div>
            <div class="metric-row"><span>Time / Battery:</span><strong>${scores.time}%</strong></div>
            <div class="metric-row"><span>Hazard Response:</span><strong>${scores.hazard}%</strong></div>
            <div class="metric-row highlight"><span>Weighted PEAS Score:</span><strong>${scores.composite}%</strong></div>

            <h4>🤝 Collaborative Contribution Equity</h4>
            <p>Total Behavioral Events: <strong>${stats.totalEvents}</strong></p>
            <div class="equity-bar">
              <div class="equity-a" style="width: ${stats.ratio}%;">Player A (${stats.playerACount})</div>
              <div class="equity-b" style="width: ${100 - stats.ratio}%;">Player B (${stats.playerBCount})</div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn btn-secondary download-csv-btn">📥 Download Session CSV Log</button>
          <button class="btn btn-primary finish-btn">Done</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector('.close-modal-btn')?.addEventListener('click', () => modal.remove());
    modal.querySelector('.finish-btn')?.addEventListener('click', () => modal.remove());
    modal.querySelector('.download-csv-btn')?.addEventListener('click', () => {
      sessionLogger.exportCsv();
      sound.playChime();
    });
  }
}
