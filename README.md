# CollabPEAS 2D - Collaborative AI Agent Design Platform (v0.2)

> **Research Context**: Based on the CSCW '26 research paper *"CollabPEAS: Designing Household Autonomous Agents via Dyadic PEAS Specification"* and the 61-page *Design Flow* specification. Re-engineered from the 3D Unity VR environment (`fusion-vr-training-2.0.6`) into a zero-dependency, high-fidelity 2D web application.

---

## 🌟 Key Updates in Version 0.2

### 1. Immersive Full-Screen Realistic Apartment Map
- **Full Viewport Upon Entry**: Entering the application opens directly to an expansive, high-DPI full-screen interactive view of the authentic apartment layout (`Apartment.png`, derived directly from `Apartment.glb`).
- **Photorealistic Visuals**: Retains native textures, lighting, furniture boundaries (sectional sofa, coffee table, kitchen island, dining set, bathtub, king bed), and spatial architectural proportions.
- **Dynamic Physics & Entities**:
  - **Operator Avatar**: Move using <kbd>Arrow Keys</kbd> or <kbd>WASD</kbd>, with heading vectors and walking animation.
  - **Autonomous Metallic Cleaning Robot**: Equipped with LED status ring, battery gauge, bump sensors, action indicators (`⚙️ VACUUMING_DIRT`), and live sonar radar wave pulses (`SENSE_04`).
  - **Roaming Cat NPC**: Dynamic wandering animal with safety collision radius to test agent hazard avoidance.
  - **Environmental Elements**: Dirt specks, liquid spills, scattered trash objects, and personal belongings.
  - **Teleportation Pads**: Fast-travel across rooms (Living Room, Kitchen, Dining Room, Master Bedroom, Bathroom, Charging Dock).

### 2. Floating Step Popup Workstations (Steps 1–5)
- Rather than a split-screen panel, step workflows now open as **frosted-glass popup modals** on top of the full-screen map:
  - **Step 1: Purpose & Performance Measures (P)** — Define purpose statement, inspect 6 household tasks, and dynamically balance PEAS weights (Coverage, Safety, Time, Hazard).
  - **Step 2: Environment & Sensors (E+S)** — Inspect apartment environmental dimensions and allocate sensors within the 11-slot physical capacity limit (with distractors).
  - **Step 3: Actuator Assembly Bay (A)** — Select physical hardware actuators (differential drive, high-torque suction motor, soft silicone brush, smart gripper, wet squeegee, warning speaker).
  - **Step 4: Decision Logic (Vibe Coding Canvas)** — Strict 4-slot rule chains: `SENSE` ➔ `CONDITION` ➔ `ACTION` ➔ `CONTROL (Optional)` for all 6 tasks with compatibility validation and parallel execution.
  - **Step 5: Live Simulation, Dual Logging & Reflection** — 10Hz tick-based simulation, dyadic observation stamping (✓ Pass, ✗ Mismatch, ? Discuss), divergence detection, verbal agreement prompt, and final research CSV export.
- **Convenient Modal Controls**:
  - Open via top header pills, glowing station rings, or <kbd>Space</kbd>.
  - Close back to full-screen map via <kbd>Esc</kbd>, top-right <kbd>✕ Close [Esc]</kbd>, or by clicking outside the dialog.

### 3. Floating Simulation HUD
- When the modal is closed or minimized during Step 5 testing, a sleek **Floating HUD** remains active at the bottom center of the screen:
  - **Sim Status & Clock**: `▶ SIM RUNNING` / `⏸ SIM PAUSED` with live tick counter.
  - **Playback Controls**: Play/Pause, 1x / 2x / 5x speed multipliers, and Reset.
  - **Live PEAS Scores**: Composite score, Coverage %, Safety %, Time %.
  - **Dyadic Quick-Stamp Buttons**: Immediate `✓`, `✗`, `?` stamping directly while observing the robot navigate the apartment.
  - **Quick Lab Reopen**: Jump back into the full Step 5 workstation at any moment.

---

## 🚀 Quick Start

The project runs completely client-side in standard modern web browsers with zero npm dependencies or build tools.

### Starting the Local Server

```bash
node collabpeas-2d/server.js 8088
```

Open your browser at:
```
http://localhost:8088
```

---

## 🎮 Navigation & Keyboard Controls

| Control | Action |
| :--- | :--- |
| <kbd>↑</kbd> <kbd>↓</kbd> <kbd>←</kbd> <kbd>→</kbd> or <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> | Move operator avatar across the apartment |
| <kbd>Space</kbd> | Open workstation modal (or enter nearest glowing station ring) |
| <kbd>Esc</kbd> | Close workstation popup and return to full-screen map |
| **Mouse Drag** | Smoothly pan around the apartment floor |
| **Mouse Wheel** | Zoom in / out (0.4x to 2.5x magnification) |
| **Left Click on Pad** | Instant teleport to room |
| **Left Click on Station** | Open corresponding step workstation |
| <kbd>⛶ Fit Map</kbd> | Recenter and fit entire apartment to viewport |

---

## 🏛️ Project Architecture

```
CollabPEAS/
├── Materials/
│   ├── Apartment.png         # Photorealistic 3D apartment render (1326 x 1220)
│   └── Apartment.glb         # 3D GLTF model
├── collabpeas-2d/
│   ├── index.html            # Main full-screen app container & modal markup
│   ├── server.js             # Zero-dependency local Node HTTP server
│   ├── assets/
│   │   └── Apartment.png     # Native web asset
│   ├── styles/
│   │   ├── main.css          # Glassmorphic layout, modal styling & floating HUD
│   │   └── blocks.css        # 4-slot logic block palettes & robot POV HUD
│   └── js/
│       ├── app.js            # Coordinator, modal lifecycle, and floating HUD
│       ├── state.js          # Reactive dual-participant state store
│       ├── data/
│       │   ├── tasks.js      # 6 Household Tasks catalog & dimensions
│       │   ├── sensors.js    # 15 Sensors catalog (11 capacity slots)
│       │   ├── actuators.js  # 14 Actuators catalog (5 categories)
│       │   └── blocks.js     # 64 Decision Logic blocks & compatibility rules
│       ├── sim/
│       │   ├── world.js      # World obstacles, dirt/wet grids, dock, cat, robot
│       │   └── engine.js     # 10Hz tick simulation, rule evaluation, PEAS scoring
│       ├── view/
│       │   ├── house-canvas.js # High-DPI canvas engine with pan/zoom & entities
│       │   ├── steps-view.js   # Workstation views for Steps 1, 2, 3, 5
│       │   ├── block-canvas.js # Vibe coding 4-slot canvas for Step 4
│       │   ├── pov-renderer.js # Robot sensor POV HUD
│       │   └── audio.js        # Synthesized sound effects (Web Audio API)
│       └── logging/
│           ├── session-log.js  # CSCW research telemetry & CSV exporter
│           └── dual-log.js     # Dual observation stamp logging & divergence tracker
```

---

## 📑 Research Alignment (CSCW '26)

1. **Dyadic Collaboration**: Symmetrical roles for Player A (Lead) and Player B (Reviewer), with mutual contribution equity tracking.
2. **PEAS Framework Fidelity**:
   - **P**: Mathematically bound weight sliders with single-dominant warning.
   - **E**: Apartment environment dimensions inspected through floor walkthrough tags.
   - **S**: Strict 11-slot capacity budget across 15 sensors (11 valid, 4 distractors).
   - **A**: 14 actuators with explicit physical capabilities and limitations.
   - **Logic**: 4-slot decision rules (`SENSE` ➔ `CONDITION` ➔ `ACTION` ➔ `CONTROL`) executed in parallel at 10Hz.
3. **Dual Observation Logging**: Independent stamping of robot runs with divergence detection and verbal agreement prompts before modifications.
4. **Data Export**: Full export of timestamped study logs matching `PeasSessionLog.cs`.
