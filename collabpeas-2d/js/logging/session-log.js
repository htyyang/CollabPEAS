/**
 * CollabPEAS - Session Event Logger (Design Flow Part C)
 * Records all behavioral events with PlayerID tags, wall-clock ISO-8601,
 * and sequence order for empirical AI literacy research analysis.
 */

import { appState } from '../state.js';

class SessionLogger {
  constructor() {
    this.events = [];
    this.sessionStartTime = Date.now();
    this.order = 1;
    this.initEventListeners();
  }

  log(type, arg = '', value = 0, actingPlayer = null) {
    const now = Date.now();
    const event = {
      order: this.order++,
      playerId: actingPlayer || appState.activePlayerId,
      senderTime: ((now - this.sessionStartTime) / 1000).toFixed(3),
      localTime: ((now - this.sessionStartTime) / 1000).toFixed(3),
      utc: new Date(now).toISOString(),
      type,
      arg,
      value
    };
    this.events.push(event);
    console.log(`[CollabPEAS Log #${event.order}] [${event.playerId}] ${type}: ${arg} (${value})`);
    return event;
  }

  initEventListeners() {
    appState.on('stepChanged', ({ step, oldStep }) => {
      this.log('STEP_TRANSITION', `From Step ${oldStep} to Step ${step}`, step);
    });

    appState.on('playerChanged', ({ playerId }) => {
      this.log('PLAYER_ROLE_SWITCH', `Switched active control to ${playerId}`);
    });

    appState.on('weightsChanged', ({ weights }) => {
      this.log('WEIGHTS_UPDATED', JSON.stringify(weights));
    });

    appState.on('sensorsChanged', ({ installed }) => {
      this.log('SENSOR_SELECTION_UPDATED', installed.join(';'), installed.length);
    });

    appState.on('actuatorsChanged', ({ installed }) => {
      this.log('ACTUATOR_SELECTION_UPDATED', installed.join(';'), installed.length);
    });

    appState.on('rulesChanged', () => {
      this.log('RULE_CANVAS_EDITED', 'Block placement / rule chain modified');
    });

    appState.on('observationAdded', (entry) => {
      this.log('OBSERVATION_STAMP', `${entry.stamp} - ${entry.comment || 'no note'}`, entry.tick, entry.playerId);
    });

    appState.on('debugMoveRecorded', ({ moveType }) => {
      this.log('DEBUG_MOVE_INITIATED', moveType, appState.debugIterations);
    });
  }

  exportCsv() {
    const headers = ['Order', 'PlayerID', 'SenderTime_s', 'LocalTime_s', 'Timestamp_UTC', 'EventType', 'Argument', 'Value'];
    const rows = this.events.map(e => [
      e.order,
      `"${e.playerId}"`,
      e.senderTime,
      e.localTime,
      `"${e.utc}"`,
      `"${e.type}"`,
      `"${(e.arg + '').replace(/"/g, '""')}"`,
      e.value
    ].join(','));

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `CollabPEAS_Session_Log_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  getSummaryStats() {
    const playerAEvents = this.events.filter(e => e.playerId === 'Player A');
    const playerBEvents = this.events.filter(e => e.playerId === 'Player B');
    return {
      totalEvents: this.events.length,
      playerACount: playerAEvents.length,
      playerBCount: playerBEvents.length,
      ratio: this.events.length > 0 ? (playerAEvents.length / this.events.length * 100).toFixed(1) : 50
    };
  }
}

export const sessionLogger = new SessionLogger();
