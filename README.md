# CollabPEAS 3D/2D - Collaborative AI Agent Design Platform (v0.3)

> **Research Context**: Based on the CSCW '26 research paper *"CollabPEAS: Designing Household Autonomous Agents via Dyadic PEAS Specification"* and the 61-page *Design Flow* specification. Re-engineered from the 3D Unity VR environment (`fusion-vr-training-2.0.6`) into a high-fidelity 360-degree interactive web platform.

---

## 🌟 What's New in Version 0.3: 360-Degree Interactive UI

### 1. Interactive 3D 360° Apartment Map (Three.js WebGL + `Apartment.glb`)
- **Full 360° Orbital Exploration**: Freely orbit in 360 degrees around the authentic 3D apartment model (`Materials/Apartment.glb`, 419 nodes, 220 meshes, 42 materials).
  - Left-click drag to rotate 360° horizontally (azimuth $0^\circ - 360^\circ$) and vertically (pitch from top-down $90^\circ$ to ground level).
  - Mouse wheel to zoom smoothly in and out (2.5m to 35m).
  - Right-click drag to pan the camera across rooms.
- **First-Person 360° Walkthrough (FPS Mode)**:
  - Step into the apartment at true human eye level ($1.65\text{m}$).
  - Walk freely through interior doors and rooms using <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> or Arrow Keys.
  - Look around in full 360° using mouse look.
- **Interactive 3D Holographic Stations (Steps 1–5)**:
  - Floating 3D glowing rings and light pillars placed in key rooms:
    - **Station 1**: Living Room (`🎯 Purpose & Metrics`)
    - **Station 2**: Kitchen (`📡 Sensors Workbench`)
    - **Station 3**: Foyer / Dock (`🦾 Actuator Assembly Bay`)
    - **Station 4**: Dining Room (`🧩 Decision Logic`)
    - **Station 5**: Master Bedroom (`🔬 Observation & Debug`)
  - Raycaster hover effect expands the ring and highlights the title card.
  - Clicking any 3D station ring immediately pops open the Step workstation modal!
- **Dynamic 3D Entities**:
  - **Metallic Cleaning Robot**: Disc chassis, glowing LED status ring, headlights, dynamic action tag (`⚙️ VACUUMING_DIRT`), and live sonar pulse arcs.
  - **Roaming Cat NPC**: Procedural 3D cat with ears and swinging tail walking across rooms.
  - **Operator Avatar**: Stylized 3D humanoid figure with player color (Player A blue / Player B purple) and 360° sight cone.
  - **Floor Decals**: Dynamic 3D dirt spots and shimmering water puddles that clear as the robot cleans.

### 2. Interactive 360° Compass Widget
- **Rotating Compass Rose**: Sits at the top right of the viewport with a live heading indicator needle pointing North ($0^\circ$).
- **Live Degree Readout**: Shows current camera azimuth (e.g. `🧭 0° N`, `🧭 45° NE`, `🧭 90° E`, `🧭 180° S`, `🧭 270° W`).
- **Drag to Rotate 360°**: Click and drag the compass dial to spin the entire apartment in real-time.
- **Quick Snap Buttons**: Immediate 1-click rotation to cardinal angles:
  - <kbd>N</kbd> (0° North)
  - <kbd>E</kbd> (90° East)
  - <kbd>S</kbd> (180° South)
  - <kbd>W</kbd> (270° West)
  - <kbd>ISO</kbd> (45° Isometric 3D)
  - <kbd>🔄</kbd> (Auto 360° Cinematic Orbit toggle)

### 3. Dual-Engine Architecture (3D GLB & 2D Rotatable Canvas)
- **3-Way View Mode Switcher** in the top header:
  - `🌐 3D 360°`: Full 3D WebGL orbital view of `Apartment.glb`.
  - `🚶 FPS 360°`: First-person eye-level walkthrough with mouse look.
  - `📐 2D Map`: 2D architectural blueprint with continuous 360° canvas rotation (via <kbd>Q</kbd> / <kbd>E</kbd> keys or the compass dial).
- **100% Offline Support**: Local Three.js and GLTF loaders stored directly in `collabpeas-2d/lib/three/`.

### 4. Floating Step Workstations & Simulation HUD
- **Popup Modal Workstations**: Steps 1–5 pop up as frosted-glass modal dialogs over the full-screen 360° map (<kbd>Space</kbd> or station click).
- **Floating Simulation HUD**: Bottom center controls for Play/Pause, 1x/2x/5x speed, PEAS score gauges, and dyadic observation stamps (`✓`, `✗`, `?`).

---

## 🚀 Quick Start

The server runs locally with zero external npm dependencies:

```bash
node collabpeas-2d/server.js 8088
```

Open your browser at:
```
http://localhost:8088
```

---

## 🎮 Navigation & Controls Cheat Sheet

| Mode | Input | Action |
| :--- | :--- | :--- |
| **3D 360° Orbit** | **Left Mouse Drag** | Orbit camera 360° horizontally & vertically |
| | **Mouse Wheel** | Zoom in / out smoothly |
| | **Right Mouse Drag** | Pan camera across floor |
| | **Left Click on Ring** | Open corresponding Step Workstation |
| | **Left Click on Floor** | Raycast click to walk operator avatar to spot |
| **FPS Walkthrough** | <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> / Arrows | Walk forward, back, strafe left/right |
| | **Mouse Drag** | Look around 360° horizontally and vertically |
| **2D Blueprint** | <kbd>Q</kbd> / <kbd>E</kbd> | Rotate 2D map counter-clockwise / clockwise |
| | **Mouse Drag** | Pan 2D map |
| | **Mouse Wheel** | Zoom 2D map |
| **Global** | <kbd>Space</kbd> | Open workstation modal (or enter nearest station) |
| | <kbd>Esc</kbd> | Close workstation popup and return to 360° map |
| | **Compass Buttons** | Snap camera to N, E, S, W, or 45° ISO |
| | <kbd>🔄</kbd> Button | Toggle auto-spinning 360° cinematic orbit |

---

## 🏛️ Project Directory Structure

```
CollabPEAS/
├── Materials/
│   ├── Apartment.glb         # 3D glTF 2.0 model (81.4 MB)
│   ├── Apartment.png         # Photorealistic top-down render (1.6 MB)
│   └── Apartment_01.fbx      # FBX source model
├── collabpeas-2d/
│   ├── index.html            # Main web entry with 3D/2D viewports & modals
│   ├── server.js             # Local Node HTTP server with GLB streaming
│   ├── assets/
│   │   ├── Apartment.glb     # 3D model asset for WebGL
│   │   └── Apartment.png     # 2D texture asset
│   ├── lib/
│   │   ├── three/
│   │   │   ├── three.module.js   # Three.js ES6 module
│   │   │   ├── GLTFLoader.js     # glTF 2.0 loader
│   │   │   └── OrbitControls.js  # 360° orbit controller
│   │   └── utils/
│   │       └── BufferGeometryUtils.js # Geometry utilities
│   ├── styles/
│   │   ├── main.css          # Glassmorphic HUD, compass widget & modals
│   │   └── blocks.css        # 4-slot vibe coding canvas styles
│   └── js/
│       ├── app.js            # Coordinator, 360° view modes & HUD
│       ├── state.js          # Dual-participant reactive store
│       ├── view/
│       │   ├── map-3d.js     # Three.js 360° WebGL engine & raycasting
│       │   ├── house-canvas.js # Rotatable 2D blueprint canvas
│       │   ├── steps-view.js # Workstation views (Steps 1, 2, 3, 5)
│       │   ├── block-canvas.js # 4-slot logic block canvas (Step 4)
│       │   ├── pov-renderer.js # Robot sensor POV HUD
│       │   └── audio.js      # Web Audio API sound effects
│       ├── sim/
│       │   ├── world.js      # World bounds, collision, dock, cat, robot
│       │   └── engine.js     # 10Hz simulation engine & PEAS scoring
│       └── logging/
│           ├── session-log.js # Research telemetry & CSV exporter
│           └── dual-log.js   # Dual observation stamp logging
```

---

## 📑 Research Alignment (CSCW '26)

1. **Dyadic Collaboration**: Symmetrical roles for Player A (Lead) and Player B (Reviewer), with mutual contribution equity tracking.
2. **PEAS Framework Fidelity**:
   - **P**: Mathematically bound weight sliders with single-dominant warning.
   - **E**: Apartment environment dimensions inspected through floor walkthrough tags in 360°.
   - **S**: Strict 11-slot capacity budget across 15 sensors (11 valid, 4 distractors).
   - **A**: 14 actuators with physical capabilities and limitations.
   - **Logic**: 4-slot decision rules (`SENSE` ➔ `CONDITION` ➔ `ACTION` ➔ `CONTROL`) executed in parallel at 10Hz.
3. **Dual Observation Logging**: Independent stamping of robot runs with divergence detection and verbal agreement prompts before modifications.
4. **Data Export**: Full export of timestamped study logs matching `PeasSessionLog.cs`.
