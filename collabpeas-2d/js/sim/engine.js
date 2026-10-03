/**
 * CollabPEAS - 10Hz Simulation Engine & Rule Evaluator
 * Evaluates the 6 decision rules in parallel on every tick.
 * Updates robot motion, cat wandering, sensor perceptions, and PEAS scores.
 */

import { appState } from '../state.js';
import { sound } from '../view/audio.js';

export class SimulationEngine {
  constructor(world) {
    this.world = world;
    this.tickInterval = null;
    this.tickRateHz = 10; // 10 ticks / sec (100ms per tick)
    this.tickCount = 0;
    this.scores = {
      coverage: 0,
      safety: 100,
      time: 100,
      hazard: 100,
      composite: 80
    };
    this.activeRuleFired = null;
    this.catSafetyViolations = 0;
    this.humanSafetyViolations = 0;
    this.vacuumLiquidMistakes = 0;
  }

  start() {
    if (this.tickInterval) return;
    appState.simRunning = true;
    const intervalMs = 1000 / (this.tickRateHz * appState.simSpeed);
    this.tickInterval = setInterval(() => this.tick(), intervalMs);
    appState.notify('simStateChanged', { running: true });
  }

  stop() {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
    appState.simRunning = false;
    appState.notify('simStateChanged', { running: false });
  }

  setSpeed(speedMultiplier) {
    appState.simSpeed = speedMultiplier;
    if (this.tickInterval) {
      this.stop();
      this.start();
    }
  }

  reset() {
    this.stop();
    this.world.reset();
    this.tickCount = 0;
    appState.simTick = 0;
    this.catSafetyViolations = 0;
    this.humanSafetyViolations = 0;
    this.vacuumLiquidMistakes = 0;
    this.scores = { coverage: 0, safety: 100, time: 100, hazard: 100, composite: 80 };
    appState.notify('simReset', {});
  }

  tick() {
    this.tickCount++;
    appState.simTick = this.tickCount;

    // 1. Update Autonomous Cat NPC
    this.updateCat();

    // 2. Read Sensors based on Installed Set
    const percepts = this.readSensors();

    // 3. Evaluate Decision Rules in Parallel
    const actionToExecute = this.evaluateRules(percepts);

    // 4. Execute Selected Action
    if (actionToExecute) {
      this.executeAction(actionToExecute);
    } else {
      // Default idle drift or maintain current motion
      this.world.robot.traceState = { sense: null, decide: null, act: null };
    }

    // 5. Update Physics & Environment Interactions
    this.updateRobotPhysics();

    // 6. Calculate Real-Time PEAS Scores
    this.computeScores();

    // Notify UI
    appState.notify('tick', {
      tick: this.tickCount,
      scores: this.scores,
      percepts,
      robot: this.world.robot,
      cat: this.world.cat,
      avatar: this.world.avatar
    });
  }

  updateCat() {
    const cat = this.world.cat;
    if (cat.state === 'pause') {
      cat.pauseTimer--;
      if (cat.pauseTimer <= 0) {
        cat.state = 'walk';
        cat.targetIndex = (cat.targetIndex + 1) % cat.patrolTargets.length;
      }
      return;
    }

    const target = cat.patrolTargets[cat.targetIndex];
    const dx = target.x - cat.x;
    const dy = target.y - cat.y;
    const dist = Math.hypot(dx, dy);

    if (dist < 10) {
      cat.state = 'pause';
      cat.pauseTimer = Math.floor(Math.random() * 20) + 15; // 1.5 - 3.5s pause
    } else {
      cat.heading = Math.atan2(dy, dx);
      cat.x += Math.cos(cat.heading) * cat.speed;
      cat.y += Math.sin(cat.heading) * cat.speed;
    }
  }

  readSensors() {
    const robot = this.world.robot;
    const cat = this.world.cat;
    const avatar = this.world.avatar;
    const installed = appState.installedSensors;

    const percepts = {};

    // SENSE_01: Animal Detection
    if (installed.has('SENSE_01')) {
      const distToCat = Math.hypot(robot.x - cat.x, robot.y - cat.y);
      // 1.5m in world pixels is ~90px
      percepts.SENSE_01 = distToCat <= 90 ? 'DETECTED' : 'CLEAR';
      percepts.catDistancePx = distToCat;
    } else {
      percepts.SENSE_01 = 'NOT_INSTALLED';
    }

    // SENSE_02: Battery Sensor
    if (installed.has('SENSE_02')) {
      if (robot.battery > 60) percepts.SENSE_02 = 'HIGH';
      else if (robot.battery >= 30) percepts.SENSE_02 = 'MED';
      else percepts.SENSE_02 = 'LOW';
    } else {
      percepts.SENSE_02 = 'NOT_INSTALLED';
    }

    // SENSE_03: Destination Sensor (SINK/BIN/DOCK)
    if (installed.has('SENSE_03')) {
      const dockDist = Math.hypot(robot.x - this.world.dock.x, robot.y - this.world.dock.y);
      percepts.SENSE_03 = {
        dockDist,
        reached: dockDist < 30,
        far: dockDist > 120
      };
    } else {
      percepts.SENSE_03 = 'NOT_INSTALLED';
    }

    // SENSE_04: Distance Sensor (4 directions)
    if (installed.has('SENSE_04')) {
      const frontDist = this.raycastObstacle(robot.x, robot.y, robot.heading);
      if (frontDist < 35) percepts.SENSE_04 = 'BLOCKED';
      else if (frontDist < 90) percepts.SENSE_04 = 'NEAR';
      else percepts.SENSE_04 = 'FAR';
      percepts.frontRayDist = frontDist;
    } else {
      percepts.SENSE_04 = 'NOT_INSTALLED';
    }

    // SENSE_05: Floor Dirt Sensor
    if (installed.has('SENSE_05')) {
      const onDirt = this.world.dirtCells.some(d => !d.cleaned && Math.hypot(robot.x - d.x, robot.y - d.y) < d.radius + 10);
      percepts.SENSE_05 = onDirt ? 'DIRTY' : 'CLEAN';
    } else {
      percepts.SENSE_05 = 'NOT_INSTALLED';
    }

    // SENSE_06: Floor Wet Sensor
    if (installed.has('SENSE_06')) {
      const onWet = this.world.wetCells.some(w => !w.cleaned && Math.hypot(robot.x - w.x, robot.y - w.y) < w.radius + 10);
      percepts.SENSE_06 = onWet ? 'WET' : 'DRY';
    } else {
      percepts.SENSE_06 = 'NOT_INSTALLED';
    }

    // SENSE_07: Floor Map Sensor
    if (installed.has('SENSE_07')) {
      percepts.SENSE_07 = 'FULL_MAP_ONLINE';
    } else {
      percepts.SENSE_07 = 'NOT_INSTALLED';
    }

    // SENSE_08: Grip Sensor
    if (installed.has('SENSE_08')) {
      percepts.SENSE_08 = robot.heldObject ? 'GRIPPING' : 'EMPTY';
    } else {
      percepts.SENSE_08 = 'NOT_INSTALLED';
    }

    // SENSE_09: Human Proximity Sensor
    if (installed.has('SENSE_09')) {
      const distToAvatar = Math.hypot(robot.x - avatar.x, robot.y - avatar.y);
      // 2.0m is ~120px
      percepts.SENSE_09 = distToAvatar <= 120 ? 'NEAR' : 'CLEAR';
      percepts.avatarDistancePx = distToAvatar;
    } else {
      percepts.SENSE_09 = 'NOT_INSTALLED';
    }

    // SENSE_12: Session Timer
    if (installed.has('SENSE_12')) {
      percepts.SENSE_12 = (this.tickCount / 10).toFixed(1);
    } else {
      percepts.SENSE_12 = 'NOT_INSTALLED';
    }

    // SENSE_15: Vision Sensor (120° cone)
    if (installed.has('SENSE_15')) {
      const visible = this.world.objects.find(obj => {
        if (obj.disposed) return false;
        const dx = obj.x - robot.x;
        const dy = obj.y - robot.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 180) return false; // cone range
        const angleToObj = Math.atan2(dy, dx);
        let diff = Math.abs(angleToObj - robot.heading);
        while (diff > Math.PI) diff = Math.abs(diff - 2 * Math.PI);
        return diff <= (Math.PI / 3); // 60 deg each side = 120 deg
      });
      percepts.SENSE_15 = visible ? visible.type : 'NONE';
      percepts.visibleObject = visible;
    } else {
      percepts.SENSE_15 = 'NOT_INSTALLED';
    }

    return percepts;
  }

  raycastObstacle(ox, oy, angle) {
    const step = 8;
    const maxDist = 250;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    for (let d = 15; d < maxDist; d += step) {
      const px = ox + cos * d;
      const py = oy + sin * d;
      if (this.world.checkCollision(px, py, 6)) {
        return d;
      }
    }
    return maxDist;
  }

  evaluateRules(percepts) {
    const rules = appState.rules;
    const triggeredRules = [];

    for (let i = 0; i < rules.length; i++) {
      const rule = rules[i];
      const { sense, condition, action, control } = rule.slots;

      if (!sense || !condition || !action) continue;

      // Check if required SENSE is actually installed on the robot
      if (!appState.installedSensors.has(sense)) continue;

      // Evaluate condition against percepts
      let condPassed = false;

      if (condition === 'COND_01' && percepts.SENSE_04 === 'NEAR') condPassed = true;
      else if (condition === 'COND_02' && percepts.SENSE_04 === 'BLOCKED') condPassed = true;
      else if (condition === 'COND_03' && percepts.SENSE_05 === 'DIRTY') condPassed = true;
      else if (condition === 'COND_04' && percepts.SENSE_06 === 'WET') condPassed = true;
      else if (condition === 'COND_07' && percepts.SENSE_01 === 'DETECTED') condPassed = true;
      else if (condition === 'COND_08' && percepts.SENSE_02 === 'LOW') condPassed = true;
      else if (condition === 'COND_09' && percepts.SENSE_02 === 'HIGH') condPassed = true;
      else if (condition === 'COND_10' && percepts.SENSE_03?.reached) condPassed = true;
      else if (condition === 'COND_11' && percepts.SENSE_03?.far) condPassed = true;
      else if (condition === 'COND_12' && percepts.SENSE_09 === 'NEAR') condPassed = true;
      else if (condition === 'COND_13' && percepts.SENSE_09 === 'CLEAR') condPassed = true;
      else if (condition === 'COND_14' && percepts.SENSE_08 === 'GRIPPING') condPassed = true;
      else if (condition === 'COND_15' && percepts.SENSE_08 === 'EMPTY') condPassed = true;
      else if (condition === 'COND_16' && percepts.SENSE_15 === 'TRASH') condPassed = true;
      else if (condition === 'COND_17' && (percepts.SENSE_15 === 'CUP' || percepts.SENSE_15 === 'FOOD')) condPassed = true;

      if (condPassed) {
        const isHighPriority = control === 'CTRL_05';
        triggeredRules.push({
          ruleIndex: i,
          taskName: rule.taskName,
          action,
          priority: isHighPriority ? 10 : 1,
          trace: { sense, condition, action, control }
        });
      }
    }

    if (triggeredRules.length === 0) {
      // Default autonomous patrol action when no rule condition triggers:
      // Move forward, or rotate if obstacle is close ahead
      const frontDist = this.raycastObstacle(this.world.robot.x, this.world.robot.y, this.world.robot.heading);
      if (frontDist < 45) {
        return { action: 'ACT_04', priority: 0, trace: null }; // turn right
      } else {
        return { action: 'ACT_01', priority: 0, trace: null }; // cruise forward
      }
    }

    // Sort by priority (CTRL_05 HIGH priority wins over normal)
    triggeredRules.sort((a, b) => b.priority - a.priority);
    const winner = triggeredRules[0];
    this.world.robot.traceState = winner.trace || { sense: null, decide: null, act: null };
    return winner;
  }

  executeAction(decision) {
    const robot = this.world.robot;
    const act = decision.action;

    switch (act) {
      case 'ACT_01': // MOVE FORWARD
        robot.isStopped = false;
        const currentSpeed = robot.isSlow ? 0.9 : robot.speed;
        const nx = robot.x + Math.cos(robot.heading) * currentSpeed;
        const ny = robot.y + Math.sin(robot.heading) * currentSpeed;
        if (!this.world.checkCollision(nx, ny, robot.radius)) {
          robot.x = nx;
          robot.y = ny;
        } else {
          // Slide or turn when hitting wall
          robot.heading += Math.PI / 4;
        }
        break;

      case 'ACT_02': // MOVE BACKWARD
        robot.isStopped = false;
        robot.x -= Math.cos(robot.heading) * (robot.speed * 0.6);
        robot.y -= Math.sin(robot.heading) * (robot.speed * 0.6);
        break;

      case 'ACT_03': // ROTATE LEFT 90
        robot.heading -= Math.PI / 2;
        break;

      case 'ACT_04': // ROTATE RIGHT 90
        robot.heading += Math.PI / 2;
        break;

      case 'ACT_05': // ROTATE 180
        robot.heading += Math.PI;
        break;

      case 'ACT_06': // EMERGENCY STOP
        robot.isStopped = true;
        robot.ledColor = 'rgba(239, 68, 68, 0.9)'; // red alert
        sound.playEmergencyStop();
        break;

      case 'ACT_07': // SET SPEED: SLOW
        robot.isSlow = true;
        robot.ledColor = 'rgba(245, 158, 11, 0.85)'; // amber
        break;

      case 'ACT_08': // SET SPEED: NORMAL
        robot.isSlow = false;
        robot.ledColor = 'rgba(59, 130, 246, 0.8)'; // blue
        break;

      case 'ACT_09': // VACUUM ON
        robot.vacuumActive = true;
        robot.mopDeployed = false;
        robot.ledColor = 'rgba(234, 179, 8, 0.9)'; // yellow
        // Check if erroneously vacuuming on liquid! (Learning moment)
        const onWet = this.world.wetCells.some(w => !w.cleaned && Math.hypot(robot.x - w.x, robot.y - w.y) < w.radius + 10);
        if (onWet) {
          this.vacuumLiquidMistakes++;
          robot.ledColor = 'rgba(239, 68, 68, 1.0)';
          sound.playBeep();
        } else {
          // Clean dirt cells underfoot
          this.world.dirtCells.forEach(d => {
            if (!d.cleaned && Math.hypot(robot.x - d.x, robot.y - d.y) < d.radius + 15) {
              d.cleaned = true;
              sound.playClick();
            }
          });
        }
        break;

      case 'ACT_10': // VACUUM OFF
        robot.vacuumActive = false;
        break;

      case 'ACT_11': // MOP DEPLOY
        robot.mopDeployed = true;
        robot.vacuumActive = false;
        robot.ledColor = 'rgba(56, 189, 248, 0.9)'; // cyan/blue
        // Clean wet cells
        this.world.wetCells.forEach(w => {
          if (!w.cleaned && Math.hypot(robot.x - w.x, robot.y - w.y) < w.radius + 15) {
            w.cleaned = true;
            sound.playSnap();
          }
        });
        break;

      case 'ACT_12': // MOP RETRACT
        robot.mopDeployed = false;
        break;

      case 'ACT_13': // ARM EXTEND
        robot.armExtended = true;
        break;

      case 'ACT_14': // GRIPPER CLOSE
        robot.gripperClosed = true;
        if (robot.armExtended && !robot.heldObject) {
          // Pick up nearest object in range
          const obj = this.world.objects.find(o => !o.carried && !o.disposed && Math.hypot(robot.x - o.x, robot.y - o.y) < 45);
          if (obj) {
            robot.heldObject = obj;
            obj.carried = true;
            sound.playSnap();
          }
        }
        break;

      case 'ACT_15': // GRIPPER OPEN
        robot.gripperClosed = false;
        if (robot.heldObject) {
          const obj = robot.heldObject;
          // Check if at smart bin or deposit table
          const distToBin = Math.hypot(robot.x - this.world.smartBin.x, robot.y - this.world.smartBin.y);
          const distToTable = Math.hypot(robot.x - this.world.depositTable.x, robot.y - this.world.depositTable.y);

          if (obj.type === 'TRASH' && distToBin < 50) {
            obj.disposed = true;
            sound.playChime();
          } else if (distToTable < 60) {
            obj.disposed = true;
            sound.playChime();
          }
          obj.carried = false;
          robot.heldObject = null;
        }
        break;

      case 'ACT_16': // ARM RETRACT
        robot.armExtended = false;
        break;

      case 'ACT_17': // DOCK CONNECTOR ENGAGE
        const distToDock = Math.hypot(robot.x - this.world.dock.x, robot.y - this.world.dock.y);
        if (distToDock < 40) {
          robot.isDocked = true;
          robot.isCharging = true;
          robot.battery = Math.min(100, robot.battery + 2.5);
          sound.playChime();
        }
        break;

      case 'ACT_18': // LED RED
        robot.ledColor = 'rgba(239, 68, 68, 0.95)';
        break;

      case 'ACT_19': // LED AMBER
        robot.ledColor = 'rgba(245, 158, 11, 0.95)';
        break;

      case 'ACT_20': // LED BLUE
        robot.ledColor = 'rgba(59, 130, 246, 0.95)';
        break;

      case 'ACT_22': // SOUND BEEP
        sound.playBeep();
        break;

      case 'ACT_23': // SOUND CHIME
        sound.playChime();
        break;
    }
  }

  updateRobotPhysics() {
    const robot = this.world.robot;

    // Slowly drain battery if active
    if (!robot.isCharging && robot.battery > 0) {
      robot.battery = Math.max(0, robot.battery - 0.05);
    }

    // Update carried object position
    if (robot.heldObject) {
      robot.heldObject.x = robot.x + Math.cos(robot.heading) * 25;
      robot.heldObject.y = robot.y + Math.sin(robot.heading) * 25;
    }

    // Keep breadcrumb trail
    if (this.tickCount % 4 === 0) {
      robot.pathTrail.push({ x: robot.x, y: robot.y });
      if (robot.pathTrail.length > 50) robot.pathTrail.shift();
    }

    // Check Safety Violations with Cat (<40px and not stopped)
    const distToCat = Math.hypot(robot.x - this.world.cat.x, robot.y - this.world.cat.y);
    if (distToCat < 40 && !robot.isStopped) {
      this.catSafetyViolations++;
    }

    // Check Safety with Operator (<50px and not slow/stopped)
    const distToAvatar = Math.hypot(robot.x - this.world.avatar.x, robot.y - this.world.avatar.y);
    if (distToAvatar < 60 && !robot.isSlow && !robot.isStopped) {
      this.humanSafetyViolations++;
    }
  }

  computeScores() {
    // 1. Coverage Score (Clean dirt cells + Disposed objects)
    const cleanedDirt = this.world.dirtCells.filter(d => d.cleaned).length;
    const totalDirt = this.world.dirtCells.length;
    const disposedObj = this.world.objects.filter(o => o.disposed).length;
    const totalObj = this.world.objects.length;
    const coverageVal = Math.round(((cleanedDirt / totalDirt) * 0.7 + (disposedObj / totalObj) * 0.3) * 100);
    this.scores.coverage = Math.min(100, Math.max(0, coverageVal));

    // 2. Safety Score (starts 100, decreases on cat or human violations)
    const safetyVal = Math.max(0, 100 - (this.catSafetyViolations * 8 + this.humanSafetyViolations * 5));
    this.scores.safety = safetyVal;

    // 3. Hazard Response (Mop wet cells, penalized heavily if vacuumed liquid)
    const cleanedWet = this.world.wetCells.filter(w => w.cleaned).length;
    const totalWet = this.world.wetCells.length;
    const hazardVal = Math.max(0, Math.round((cleanedWet / totalWet) * 100 - (this.vacuumLiquidMistakes * 25)));
    this.scores.hazard = hazardVal;

    // 4. Time / Battery Efficiency
    const timeVal = Math.max(0, Math.round(this.world.robot.battery));
    this.scores.time = timeVal;

    // Weighted Composite Score based on Step 1.3 Sliders
    const w = appState.weights;
    const totalWeight = (w.Coverage + w.Safety + w.Time + w.Hazard) || 100;
    this.scores.composite = Math.round(
      (this.scores.coverage * w.Coverage +
       this.scores.safety * w.Safety +
       this.scores.time * w.Time +
       this.scores.hazard * w.Hazard) / totalWeight
    );
  }
}
