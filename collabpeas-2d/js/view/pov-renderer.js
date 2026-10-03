/**
 * CollabPEAS - Robot POV (Point-of-View) Mode (Design Flow Step 2C)
 * Visualizes the world through the robot's sensor-filtered perception.
 * Demonstrates bounded percept sequence: what the robot perceives vs what it cannot.
 */

import { appState } from '../state.js';

export class RobotPovRenderer {
  constructor(containerElement, world) {
    this.container = containerElement;
    this.world = world;
  }

  render(percepts = {}) {
    if (!this.container) return;

    const robot = this.world.robot;
    const installed = appState.installedSensors;

    const hasAnimal = installed.has('SENSE_01');
    const hasBattery = installed.has('SENSE_02');
    const hasDest = installed.has('SENSE_03');
    const hasDist = installed.has('SENSE_04');
    const hasDirt = installed.has('SENSE_05');
    const hasWet = installed.has('SENSE_06');
    const hasHuman = installed.has('SENSE_09');
    const hasVision = installed.has('SENSE_15');

    const frontDistM = percepts.frontRayDist ? (percepts.frontRayDist / 60).toFixed(1) : '1.8';
    const catDistM = percepts.catDistancePx ? (percepts.catDistancePx / 60).toFixed(1) : '--';
    const humanDistM = percepts.avatarDistancePx ? (percepts.avatarDistancePx / 60).toFixed(1) : '--';

    this.container.innerHTML = `
      <div class="pov-overlay-card">
        <div class="pov-header">
          <div class="pov-title">
            <span class="blinking-rec">● REC</span>
            <h3>🤖 Robot Sensor-Filtered POV View</h3>
          </div>
          <button class="btn btn-sm btn-ghost close-pov-btn">✕ Exit POV</button>
        </div>

        <p class="pov-desc">
          You are viewing the apartment through your robot's mounted hardware sensors.
          Uninstalled sensors create perception blindspots.
        </p>

        <div class="pov-grid">
          <!-- 1. Stereoscopic Vision (SENSE_15) -->
          <div class="pov-tile ${hasVision ? 'active' : 'blind'}">
            <div class="tile-header">
              <span>👁️ Vision Classifier (SENSE_15)</span>
              <span class="badge ${hasVision ? 'badge-success' : 'badge-danger'}">
                ${hasVision ? 'ONLINE' : 'BLIND'}
              </span>
            </div>
            <div class="tile-body">
              ${hasVision ? `
                <div class="vision-hud">
                  <div class="vision-cone-radar">
                    <div class="cone-arc"></div>
                    <div class="detected-target">${percepts.SENSE_15 || 'CLEAR'}</div>
                  </div>
                  <div class="hud-stats">
                    <div>FOV: <strong>120° Forward</strong></div>
                    <div>Target: <strong>${percepts.visibleObject ? percepts.visibleObject.name : 'No tagged items'}</strong></div>
                  </div>
                </div>
              ` : `
                <div class="blind-warning">
                  <span>🚫 Sensor Not Mounted</span>
                  <p>Robot cannot identify trash, cups, food, or obstacles ahead.</p>
                </div>
              `}
            </div>
          </div>

          <!-- 2. Sonar Distance Radar (SENSE_04) -->
          <div class="pov-tile ${hasDist ? 'active' : 'blind'}">
            <div class="tile-header">
              <span>📡 Obstacle Distance (SENSE_04)</span>
              <span class="badge ${hasDist ? 'badge-success' : 'badge-danger'}">
                ${hasDist ? 'ONLINE' : 'BLIND'}
              </span>
            </div>
            <div class="tile-body">
              ${hasDist ? `
                <div class="distance-cross">
                  <div class="axis front">FRONT: <strong>${frontDistM}m (${percepts.SENSE_04 || 'FAR'})</strong></div>
                  <div class="axis sides">
                    <span>LEFT: 0.8m</span>
                    <span class="radar-dot"></span>
                    <span>RIGHT: 1.2m</span>
                  </div>
                  <div class="axis back">BACK: <strong>2.4m (FAR)</strong></div>
                </div>
              ` : `
                <div class="blind-warning">
                  <span>🚫 Sensor Not Mounted</span>
                  <p>Robot has no distance awareness and will collide with walls!</p>
                </div>
              `}
            </div>
          </div>

          <!-- 3. Animal Detection (SENSE_01) -->
          <div class="pov-tile ${hasAnimal ? 'active' : 'blind'}">
            <div class="tile-header">
              <span>🐾 Animal Radar (SENSE_01)</span>
              <span class="badge ${hasAnimal ? 'badge-success' : 'badge-danger'}">
                ${hasAnimal ? 'ONLINE' : 'BLIND'}
              </span>
            </div>
            <div class="tile-body">
              ${hasAnimal ? `
                <div class="status-reading ${percepts.SENSE_01 === 'DETECTED' ? 'alert' : 'ok'}">
                  <span class="reading-val">${percepts.SENSE_01 || 'CLEAR'}</span>
                  <span class="reading-sub">Cat Distance: ${catDistM}m (Threshold: 1.5m)</span>
                </div>
              ` : `
                <div class="blind-warning">
                  <span>🚫 Sensor Not Mounted</span>
                  <p>Cannot detect dynamic pets. Robot cannot avoid colliding with the cat.</p>
                </div>
              `}
            </div>
          </div>

          <!-- 4. Human Proximity (SENSE_09) -->
          <div class="pov-tile ${hasHuman ? 'active' : 'blind'}">
            <div class="tile-header">
              <span>👤 Human Beacon (SENSE_09)</span>
              <span class="badge ${hasHuman ? 'badge-success' : 'badge-danger'}">
                ${hasHuman ? 'ONLINE' : 'BLIND'}
              </span>
            </div>
            <div class="tile-body">
              ${hasHuman ? `
                <div class="status-reading ${percepts.SENSE_09 === 'NEAR' ? 'alert-human' : 'ok'}">
                  <span class="reading-val">${percepts.SENSE_09 || 'CLEAR'}</span>
                  <span class="reading-sub">Avatar Proximity: ${humanDistM}m (Limit: 2.0m)</span>
                </div>
              ` : `
                <div class="blind-warning">
                  <span>🚫 Sensor Not Mounted</span>
                  <p>Robot cannot recognize nearby human participants to slow down.</p>
                </div>
              `}
            </div>
          </div>

          <!-- 5. Underfoot Surface Inspection (SENSE_05 & SENSE_06) -->
          <div class="pov-tile ${hasDirt || hasWet ? 'active' : 'blind'}">
            <div class="tile-header">
              <span>✨ Floor Surface (SENSE_05 / 06)</span>
              <span class="badge ${hasDirt && hasWet ? 'badge-success' : 'badge-warning'}">
                ${hasDirt && hasWet ? 'DUAL ONLINE' : hasDirt ? 'DIRT ONLY' : hasWet ? 'WET ONLY' : 'BLIND'}
              </span>
            </div>
            <div class="tile-body dual-surface">
              <div class="surface-badge ${percepts.SENSE_05 === 'DIRTY' ? 'dirty' : 'clean'}">
                <span>Dirt Sensor:</span>
                <strong>${hasDirt ? (percepts.SENSE_05 || 'CLEAN') : 'NOT MOUNTED'}</strong>
              </div>
              <div class="surface-badge ${percepts.SENSE_06 === 'WET' ? 'wet' : 'dry'}">
                <span>Moisture Sensor:</span>
                <strong>${hasWet ? (percepts.SENSE_06 || 'DRY') : 'NOT MOUNTED'}</strong>
              </div>
            </div>
          </div>

          <!-- 6. Battery Gauge (SENSE_02) -->
          <div class="pov-tile ${hasBattery ? 'active' : 'blind'}">
            <div class="tile-header">
              <span>🔋 Power Reserve (SENSE_02)</span>
              <span class="badge ${hasBattery ? 'badge-success' : 'badge-danger'}">
                ${hasBattery ? 'ONLINE' : 'BLIND'}
              </span>
            </div>
            <div class="tile-body">
              ${hasBattery ? `
                <div class="battery-meter">
                  <div class="meter-bar">
                    <div class="meter-fill" style="width: ${robot.battery}%; background: ${robot.battery < 30 ? '#ef4444' : '#22c55e'}"></div>
                  </div>
                  <span class="meter-text">${Math.round(robot.battery)}% (${percepts.SENSE_02 || 'HIGH'})</span>
                </div>
              ` : `
                <div class="blind-warning">
                  <span>🚫 Sensor Not Mounted</span>
                  <p>Robot cannot monitor power and may shut down stranded across the room.</p>
                </div>
              `}
            </div>
          </div>
        </div>
      </div>
    `;

    this.container.querySelector('.close-pov-btn')?.addEventListener('click', () => {
      appState.isRobotPovActive = false;
      this.container.style.display = 'none';
    });
  }
}
