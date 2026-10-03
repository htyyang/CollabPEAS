/**
 * CollabPEAS - Shared State Manager
 * Handles dual-participant state (Player A / Player B), PEAS configurations,
 * rule sets, and contribution metrics for CSCW empirical tracking.
 */

import { DEFAULT_RULE_TEMPLATES } from './data/blocks.js';

class StateManager {
  constructor() {
    this.currentStep = 1; // 1: Purpose/P, 2: World/E+S, 3: Body/A, 4: Logic/Code, 5: Test/Debug
    this.activePlayerId = 'Player A'; // 'Player A' (Lead) or 'Player B' (Reviewer/Partner)
    this.playerRoles = {
      'Player A': 'Lead Designer',
      'Player B': 'Reviewer / Co-designer'
    };

    // Step 1: Purpose & Performance Measures
    this.agentPurpose = 'Autonomous Household Cleaning & Hazard-Avoidance Assistant';
    this.selectedTasks = ['TASK_1', 'TASK_2', 'TASK_3', 'TASK_4', 'TASK_5', 'TASK_6'];
    this.activeTaskFocus = 'TASK_1';
    this.weights = {
      Coverage: 35,
      Safety: 25,
      Time: 20,
      Hazard: 20
    };

    // Step 2: Sensors
    // Default initial sensor selections (students refine these in Step 2)
    this.installedSensors = new Set([
      'SENSE_01', 'SENSE_02', 'SENSE_03', 'SENSE_04',
      'SENSE_05', 'SENSE_06', 'SENSE_07', 'SENSE_08',
      'SENSE_09', 'SENSE_12', 'SENSE_15'
    ]);
    this.isRobotPovActive = false;

    // Step 3: Actuators
    this.installedActuators = new Set([
      'ACTUATOR_WHEELS', 'ACTUATOR_ROTATION', 'ACTUATOR_ESTOP',
      'ACTUATOR_VACUUM', 'ACTUATOR_MOP', 'ACTUATOR_ARM_EXT',
      'ACTUATOR_GRIP_CLOSE', 'ACTUATOR_GRIP_OPEN', 'ACTUATOR_ARM_RET',
      'ACTUATOR_DOCK_PIN', 'ACTUATOR_LED', 'ACTUATOR_BIN_OPEN',
      'ACTUATOR_SPEAKER'
    ]);

    // Step 4: Decision Rules (6 Task Chains)
    this.rules = JSON.parse(JSON.stringify(DEFAULT_RULE_TEMPLATES));

    // Step 5: Simulation & Observation
    this.simRunning = false;
    this.simTick = 0;
    this.simSpeed = 1; // 1x, 2x, 5x
    this.observationLogs = []; // { id, timestamp, tick, playerId, stamp: '✓'|'✗'|'?', comment }

    // Debugging tracking (Design Flow 5.3)
    this.debugIterations = 1;
    this.debugMoves = {
      move1_swap: 0,
      move2_addRule: 0,
      move3_returnStep: 0
    };

    // Contribution Awareness Metrics (CSCW Paper Section 4.2 & Design Flow Part C)
    this.contributions = {
      'Player A': { blocksPlaced: 6, sensorsSelected: 6, actuatorsMounted: 5, logStamps: 0, debugInitiated: 0 },
      'Player B': { blocksPlaced: 5, sensorsSelected: 5, actuatorsMounted: 5, logStamps: 0, debugInitiated: 0 }
    };

    // Observers
    this.listeners = new Map();
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    return () => this.listeners.get(event).delete(callback);
  }

  notify(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(cb => {
        try { cb(data); } catch (e) { console.error(`Error in listener for ${event}:`, e); }
      });
    }
  }

  setStep(stepNumber) {
    if (stepNumber < 1 || stepNumber > 5) return;
    const oldStep = this.currentStep;
    this.currentStep = stepNumber;
    this.notify('stepChanged', { step: stepNumber, oldStep });
  }

  setPlayer(playerId) {
    if (playerId !== 'Player A' && playerId !== 'Player B') return;
    this.activePlayerId = playerId;
    this.notify('playerChanged', { playerId });
  }

  setWeight(dimension, value) {
    if (this.weights[dimension] !== undefined) {
      this.weights[dimension] = Math.max(0, Math.min(100, Math.round(value)));
      this.notify('weightsChanged', { weights: { ...this.weights } });
    }
  }

  toggleSensor(sensorId) {
    const isInstalled = this.installedSensors.has(sensorId);
    if (isInstalled) {
      this.installedSensors.delete(sensorId);
    } else {
      if (this.installedSensors.size >= 11) {
        return { success: false, reason: 'Robot chassis is at maximum capacity (11 sensors).' };
      }
      this.installedSensors.add(sensorId);
      this.contributions[this.activePlayerId].sensorsSelected++;
    }
    this.notify('sensorsChanged', { installed: Array.from(this.installedSensors) });
    return { success: true };
  }

  toggleActuator(actuatorId) {
    if (this.installedActuators.has(actuatorId)) {
      this.installedActuators.delete(actuatorId);
    } else {
      this.installedActuators.add(actuatorId);
      this.contributions[this.activePlayerId].actuatorsMounted++;
    }
    this.notify('actuatorsChanged', { installed: Array.from(this.installedActuators) });
  }

  setRuleSlot(taskIndex, slotName, blockId) {
    if (taskIndex < 0 || taskIndex >= this.rules.length) return;
    this.rules[taskIndex].slots[slotName] = blockId;
    this.contributions[this.activePlayerId].blocksPlaced++;
    this.notify('rulesChanged', { rules: this.rules });
  }

  clearRuleSlot(taskIndex, slotName) {
    if (taskIndex < 0 || taskIndex >= this.rules.length) return;
    this.rules[taskIndex].slots[slotName] = null;
    this.notify('rulesChanged', { rules: this.rules });
  }

  addObservationStamp(stamp, comment = '') {
    const entry = {
      id: Date.now() + Math.random().toString(36).substr(2, 5),
      timestamp: new Date().toLocaleTimeString(),
      tick: this.simTick,
      playerId: this.activePlayerId,
      stamp, // '✓' (Expected), '✗' (Mismatch), '?' (Uncertain)
      comment
    };
    this.observationLogs.push(entry);
    this.contributions[this.activePlayerId].logStamps++;
    this.notify('observationAdded', entry);
    return entry;
  }

  recordDebugMove(moveType) {
    if (moveType === 'move1_swap') this.debugMoves.move1_swap++;
    if (moveType === 'move2_addRule') this.debugMoves.move2_addRule++;
    if (moveType === 'move3_returnStep') this.debugMoves.move3_returnStep++;
    this.contributions[this.activePlayerId].debugInitiated++;
    this.debugIterations++;
    this.notify('debugMoveRecorded', { moveType, moves: this.debugMoves });
  }

  getDominantDimension() {
    let dominant = 'Coverage';
    let max = -1;
    for (const [dim, val] of Object.entries(this.weights)) {
      if (val > max) {
        max = val;
        dominant = dim;
      }
    }
    return dominant;
  }
}

export const appState = new StateManager();
