# CollabPEAS (3D / 2D Web Edition)

> **A Collaborative Web-Based Learning System for AI Agent Specification via the PEAS Framework**  
> *Companion research implementation for the ACM CSCW '26 study.*

---

## 🚀 Quick Start

To launch and test the application in your browser:

```bash
# Using Node.js (Recommended - supports byte-range streaming for GLB)
node server.js 8088

# Or using Python 3
python3 -m http.server 8088
```

Open **`http://localhost:8088`** in Google Chrome, Apple Safari, Microsoft Edge, or Mozilla Firefox.

---

## 🌟 Key Highlights

- **Dual-Engine 360° Architecture**:
  - **3D 360° Orbit View**: Freely orbit in full 360 degrees around the authentic 3D apartment model (`Apartment.glb`).
  - **FPS 360° Walkthrough**: Explore the apartment from a realistic first-person eye-level ($1.65\text{m}$) perspective.
  - **2D Architectural Blueprint**: Crisp vector blueprint with continuous 360° rotation and teleport pads.
- **Interactive 360° Compass Widget**: Live heading indicator needle, degree readout, drag-to-spin dial, and cardinal snap buttons (<kbd>N</kbd>, <kbd>E</kbd>, <kbd>S</kbd>, <kbd>W</kbd>, <kbd>ISO</kbd>, <kbd>🔄</kbd>).
- **High-Visibility 3D Cleaning Robot**:
  - Metallic disc chassis, rotating top LiDAR turret, dual forward headlights, and pulsing ground halo.
  - State-reactive LED ring (Blue = vacuum, Cyan = mop, Amber = slow near human, Red = cat avoidance brake, Purple = low battery / dock).
  - Unoccluded overhead billboard tag (`🤖 CLEANING ROBOT [ACTION • BATT%]`) visible through walls.
  - Camera tracking controls: **`🤖 Focus Robot`** and **`🎥 Follow Robot`**.
- **Interactive Spatial Stations**: Walk near Station 1 through 5 in the apartment (or click the floating holographic rings) to open each PEAS workstation.
- **Robot POV Mode**: Inhabit the robot's sensor-filtered perspective (vision cone, sonar ranges, moisture probe, battery gauge, unmounted sensor warnings).
- **4-Slot Block Canvas**: Visual decision rule chains (`SENSE` ➔ `CONDITION` ➔ `ACTION` ➔ `CONTROL`) with compatibility validation.
- **Parallel 10Hz Simulation Engine**: Real-time evaluation of parallel rules, collision detection, and PEAS scoring.
- **CSCW Collaborative Supports**:
  - Player A / Player B toggle with PlayerID event attribution.
  - Mutual contribution equity bar.
  - 2-second Verbal Agreement Protocol before debug moves.
  - Dual observation logging with divergence detection.
  - Spatially embedded PEAS diagnostic reflection.
  - Session CSV log export for empirical research.

---

## 📚 Documentation

- 📘 **[Workflow & User Guide](docs/WORKFLOW_AND_USER_GUIDE.md)**: End-to-end user manual, step-by-step PEAS walkthrough, simulation tracking, collaboration protocol, and shortcuts.
- 🛠️ **[Architecture & Development Document](docs/DEVELOPMENT.md)**: Deep technical architecture, data schemas, mathematical formulations, and CSCW alignment.
