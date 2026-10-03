/**
 * CollabPEAS - Dual Observation Logging (CSCW Paper Section 4.2 & Design Flow 5.2)
 * Supports collaborative observation stamping (✓ / ✗ / ?), divergence detection,
 * and verbal coordination prompts between Player A and Player B.
 */

import { appState } from '../state.js';

export class DualObservationLogger {
  constructor(containerElement) {
    this.container = containerElement;
    this.init();
  }

  init() {
    appState.on('observationAdded', () => this.render());
  }

  render() {
    if (!this.container) return;

    const logs = appState.observationLogs;
    const playerALogs = logs.filter(l => l.playerId === 'Player A');
    const playerBLogs = logs.filter(l => l.playerId === 'Player B');

    // Divergence analysis
    const divergenceCount = this.computeDivergence(logs);

    let html = `
      <div class="dual-log-panel">
        <div class="dual-log-header">
          <div class="title-row">
            <h4>📋 Dual Observation Log</h4>
            <span class="badge ${divergenceCount > 0 ? 'badge-warning' : 'badge-neutral'}">
              ${divergenceCount > 0 ? `⚠️ ${divergenceCount} Divergences` : '🤝 Agreement Synced'}
            </span>
          </div>
          <p class="subtitle">Both participants independently mark robot execution observations.</p>
        </div>

        <div class="stamp-controls">
          <span class="active-player-tag">Acting: <strong>${appState.activePlayerId}</strong></span>
          <div class="btn-group">
            <button class="btn btn-stamp pass" data-stamp="✓" title="Behavior matches specification">✓ Pass</button>
            <button class="btn btn-stamp fail" data-stamp="✗" title="Behavior violated expected specification">✗ Mismatch</button>
            <button class="btn btn-stamp query" data-stamp="?" title="Uncertain / Needs Discussion">? Discuss</button>
          </div>
        </div>

        <div class="log-columns">
          <div class="log-col player-a-col">
            <div class="col-header">
              <span class="player-dot player-a"></span> Player A (${playerALogs.length})
            </div>
            <div class="log-list">
              ${playerALogs.length === 0 ? '<div class="empty-log">No observations yet</div>' : ''}
              ${playerALogs.map(entry => `
                <div class="log-item stamp-${entry.stamp === '✓' ? 'pass' : entry.stamp === '✗' ? 'fail' : 'query'}">
                  <span class="stamp-badge">${entry.stamp}</span>
                  <div class="log-body">
                    <span class="log-time">${entry.timestamp} (Tick ${entry.tick})</span>
                    <span class="log-comment">${entry.comment || 'Observation logged'}</span>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <div class="log-col player-b-col">
            <div class="col-header">
              <span class="player-dot player-b"></span> Player B (${playerBLogs.length})
            </div>
            <div class="log-list">
              ${playerBLogs.length === 0 ? '<div class="empty-log">No observations yet</div>' : ''}
              ${playerBLogs.map(entry => `
                <div class="log-item stamp-${entry.stamp === '✓' ? 'pass' : entry.stamp === '✗' ? 'fail' : 'query'}">
                  <span class="stamp-badge">${entry.stamp}</span>
                  <div class="log-body">
                    <span class="log-time">${entry.timestamp} (Tick ${entry.tick})</span>
                    <span class="log-comment">${entry.comment || 'Observation logged'}</span>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    `;

    this.container.innerHTML = html;

    // Attach stamp handlers
    this.container.querySelectorAll('.btn-stamp').forEach(btn => {
      btn.onclick = () => {
        const stamp = btn.getAttribute('data-stamp');
        appState.addObservationStamp(stamp, `Observed during simulation run`);
      };
    });
  }

  computeDivergence(logs) {
    // Check if within recent 10 ticks, Player A stamped Pass and Player B stamped Mismatch or vice versa
    let divergences = 0;
    for (let i = 0; i < logs.length; i++) {
      for (let j = i + 1; j < logs.length; j++) {
        if (logs[i].playerId !== logs[j].playerId && Math.abs(logs[i].tick - logs[j].tick) <= 20) {
          if ((logs[i].stamp === '✓' && logs[j].stamp === '✗') || (logs[i].stamp === '✗' && logs[j].stamp === '✓')) {
            divergences++;
          }
        }
      }
    }
    return divergences;
  }
}
