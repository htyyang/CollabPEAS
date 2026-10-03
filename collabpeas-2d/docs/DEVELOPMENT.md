# CollabPEAS 2D: Development & Architecture Document

## 1. Project Background & Research Context

This project implements a **functionally equivalent 2D web-based learning environment** for **CollabPEAS** (*A Collaborative VR System for Learning AI Agent Design Through the PEAS Framework*, ACM CSCW Companion '26 by Wanru Li, Yichen Yu, and Qiao Jin).

In the original research design, the lab developed a multiplayer immersive 3D VR environment in Unity 6 using Photon Fusion 2 (`fusion-vr-training-2.0.6`). To empirically evaluate whether embodied learning advantages persist beyond the novelty effect of VR headsets, the research protocol requires a **between-subject comparative study testing the VR condition against a functionally equivalent 2D desktop interface**.

This 2D application satisfies this requirement by preserving:
1. **The complete 5-step PEAS-guided design flow** (Performance measure, Environment, Actuators, Sensors, and Decision Logic).
2. **Spatially grounded exploration in a 2D house blueprint** derived directly from the project's 3D apartment assets (`Materials/Apartment.png`).
3. **Operator avatar locomotion** controlled via Arrow Keys / WASD, allowing the learner to physically navigate between household rooms and interact with spatial stations.
4. **The full 64-block decision logic library** arranged in strict 4-slot chains (`SENSE` ➔ `CONDITION` ➔ `ACTION` ➔ `CONTROL`) with compatibility validation and parallel 10Hz execution.
5. **The five CSCW collaborative design supports**:
   - Symmetrical dual-participant access (Player A / Player B toggle).
   - Mutual contribution awareness display (real-time equity tracking).
   - 2-second Verbal Agreement Protocol checkpoint before debugging.
   - Dual observation logging with automated divergence analysis.
   - Spatially embedded PEAS reflection prompts distinguishing irrational behavior from specification errors.

---

## 2. System Architecture

The project is built as a zero-dependency, modern ES6 modular web application rendered with HTML5 Canvas, Web Audio API, and CSS3 glassmorphism.

```
collabpeas-2d/
├── index.html               # Main entry point & layout
├── server.js                # Lightweight zero-dependency HTTP static server
├── assets/
│   └── Apartment.png        # High-res architectural layout of the apartment
├── styles/
│   ├── main.css             # Design system, responsive layout, glassmorphic UI
│   └── blocks.css           # 4-slot block canvas, color cards, robot POV HUD
├── js/
│   ├── app.js               # Application coordinator & event wiring
│   ├── state.js             # Shared state manager & contribution tracking
│   ├── data/
│   │   ├── tasks.js         # The 6 household tasks catalog
│   │   ├── sensors.js       # 15 Sensors catalog (11 valid, 4 distractors)
│   │   ├── actuators.js     # 14 Actuators catalog across 5 groups
│   │   └── blocks.js        # 64 Decision blocks & compatibility validator
│   ├── sim/
│   │   ├── world.js         # 2D apartment coordinate model, collision, dirt, spills, NPCs
│   │   ├── engine.js        # 10Hz simulation engine, parallel rule evaluator, scoring
│   │   └── (scoring inside engine.js)
│   ├── view/
│   │   ├── house-canvas.js  # 2D Canvas renderer: blueprint, avatar, robot, cat, stations
│   │   ├── pov-renderer.js  # Robot sensor-filtered POV visualization
│   │   ├── block-canvas.js  # Visual 4-slot decision rule canvas & library palette
│   │   ├── steps-view.js    # Dedicated UI panels for Steps 1 through 5
│   │   └── audio.js         # Web Audio procedural sound synthesizer
│   └── logging/
│       ├── session-log.js   # Research event logger with CSV export
│       └── dual-log.js      # Dual observation logger (✓, ✗, ?) with divergence detection
└── docs/
    └── DEVELOPMENT.md       # This comprehensive development document
```

---

## 3. PEAS 5-Step Learning Progression

### Step 1: Define Your Agent (Performance Measure — P)
- **1A. Purpose Formulation**: Students formulate what the robot is for (`appState.agentPurpose`).
- **1B. Six Household Tasks Catalog**:
  1. *Vacuum the floor* (Coverage)
  2. *Pick up and sort scattered objects* (Coverage + Hazard)
  3. *Detect and clean spills* (Hazard Response)
  4. *Detect and avoid the moving cat* (Safety)
  5. *Slow down near participants* (Safety)
  6. *Return to charging dock when battery is low* (Time / Battery)
- **1C. Performance Measure Sliders**:
  - Sliders configure weights for **Coverage**, **Safety**, **Time**, and **Hazard Response**.
  - Dynamic dominant priority indicator highlights robot behavior profile:
    - Yellow = Coverage dominant (methodical grid sweep)
    - Green = Safety dominant (wide berths around cat and avatar)
    - Blue = Time dominant (high speed, skip corners)
    - Purple = Hazard dominant (immediate stop at spills and cables)

### Step 2: Know Your World (Environment — E & Sensors — S)
- **2A. Environment Walkthrough**:
  Learners navigate the operator avatar using Arrow Keys through the apartment to inspect 5 educational tags:
  - *Kitchen Spill*: Partially observable environment ("Cannot see until underfoot").
  - *Roaming Cat*: Dynamic environment ("Obstacle moves continuously").
  - *Cluttered Living Room*: Continuous / non-deterministic pathing.
  - *Hallway Cable*: Sensor-specific detectability (distance sonar misses thin cables).
  - *Charging Dock*: Goal localization.
- **2B. 15-Sensor Hardware Library**:
  - 11 relevant sensors + 4 distractors (Light level, Stair edge detector, Sound sensor, Object weight sensor).
  - Physical mounting constraint: 11 maximum slots on the robot chassis (minimum 8 required to proceed).
  - **Percept Summary Screen**: Displays the *Bounded Percept Sequence* (what the robot CAN perceive vs what it CANNOT perceive).
- **2C. Robot POV Mode**:
  Simulates the apartment from the robot's sensor-limited perspective (120° vision cone, sonar cross-ranges, floor moisture/dirt probes, battery HUD). Unmounted sensors display explicit blindspot warnings.

### Step 3: Give Your Robot a Body (Actuators — A)
- **14 Actuators across 5 functional categories**:
  - *Locomotion*: Wheel Drive, Body Rotation, Emergency Stop.
  - *Cleaning Tools*: Vacuum Suction, Mop Pad Deploy / Retract.
  - *Mechanical Arm*: Arm Extend, Gripper Close, Gripper Open, Arm Retract.
  - *Docking*: Dock Connector Engage.
  - *Additional*: LED Body Flash, Bin Lid Open, Speaker / Voice Output, Arm Speed Control (distractor).
- Links actions to physical capabilities: learners learn that software rules cannot execute without corresponding hardware actuators (e.g., mopping without a mop pad fails).

### Step 4: Program Your Robot (Decision Logic / Vibe Coding)
- **Strict 4-Slot Rule Architecture**:
  `[Slot 1: SENSE]` ➔ `[Slot 2: CONDITION]` ➔ `[Slot 3: ACTION]` ➔ `[Slot 4: CONTROL (Opt)]`
- **SENSE ➔ CONDITION Compatibility Engine**:
  Enforces that conditions only accept compatible sensor return values (e.g., `COND_01 (IF obstacle is NEAR)` requires `SENSE_04`; snapping it to `SENSE_05` triggers an immediate error bounce).
- **Parallel 10Hz Execution**:
  Rules execute concurrently on every tick. The environment triggers whichever condition is met; high-priority rules (`CTRL_05`) arbitrate conflicts.
- **Live Execution Trace Pulses**:
  Active rule zones glow emerald green in real time during execution.

### Step 5: Test, Debug, and Reflect (PEAS Iteration)
- **Live 10Hz Simulation Engine**:
  The robot navigates the apartment, roaming cat patrols between waypoints, dirt particles disappear when vacuumed, and wet spills clear when mopped.
- **Real-Time Score Gauges**:
  Live metrics for Coverage, Safety, Time, Hazard Response, and weighted composite PEAS score.
- **Dual Observation Logging (✓ / ✗ / ?)**:
  Partners record observations independently; system highlights divergences to stimulate dialogue.
- **The Three Debug Moves**:
  - *Move 1*: Swap / modify a block.
  - *Move 2*: Add missing rule.
  - *Move 3*: Return to earlier PEAS step (mount missing sensor or actuator).
- **2-Second Verbal Agreement Protocol**:
  Presents a mandatory 2-second dialog checkpoint before changes are executed.
- **Spatially Embedded PEAS Reflection**:
  Diagnostic assessment: *"Is your robot behaving irrationally — or rationally with a wrong specification?"*
- **Final Summary Screen & CSV Export**:
  Generates a full empirical summary with contribution ratios and exportable CSV session log formatted for research analysis.

---

## 4. Collaborative Supports (CSCW Compliance)

| Support Element | Implementation in 2D Web |
|---|---|
| **Symmetric Dual-Role Access** | Header switcher allows toggling between `Player A (Lead)` and `Player B (Reviewer)`. All events are tagged with active PlayerID. |
| **Mutual Contribution Awareness** | Persistent header equity bar tracks relative contributions (blocks placed, sensors mounted, log entries). |
| **Verbal Agreement Protocol** | 2-second pause overlay upon initiating any debug move, prompting partners to discuss diagnosis before acting. |
| **Dual Observation Logging** | Separate logging columns for Player A and B; automatic divergence counter flags conflicting assessments. |
| **Spatially Embedded Reflection** | 4-choice diagnostic prompt connecting behavioral errors back to PEAS components. |

---

## 5. Controls & Interaction Guide

- **Operator Locomotion**: Use **Arrow Keys** (or **W, A, S, D**) to walk the operator avatar throughout the apartment.
- **Station Activation**: Walk near any of the 5 circular stations in the house and press **Spacebar** (or click on the station) to open that step.
- **Inspection Beacons**: Walk near or click the floating beacons to read environment characterizations.
- **Quick Jump**: Use the top step-navigation bar (`1. Purpose` through `5. Test & Debug`) to jump directly to any step.
- **Robot POV**: Click the `👁️ Robot POV` button in the header or in Step 2 to view through the robot's sensors.
- **Audio Feedback**: Click `🔊 Audio On` in the header to toggle procedural sound synthesis.
- **CSV Log Download**: In Step 5, click `📋 View Final PEAS Summary & Export CSV` to export the research session log.

---

## 6. How to Run Locally

1. Open a terminal in the project directory:
   ```bash
   cd collabpeas-2d
   ```
2. Start the local server:
   ```bash
   node server.js 8080
   # or with python:
   # python3 -m http.server 8080
   ```
3. Open your browser and navigate to:
   ```
   http://localhost:8080
   ```
