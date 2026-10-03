# CollabPEAS 2D

> **A 2D Web-Based Collaborative Learning System for AI Agent Specification via the PEAS Framework**  
> *Companion research implementation for the ACM CSCW '26 study.*

## Quick Start

To launch and test the application in your browser:

```bash
# Using Node.js
node server.js 8080

# Or using Python 3
python3 -m http.server 8080
```

Open **`http://localhost:8080`** in Google Chrome, Apple Safari, Microsoft Edge, or Mozilla Firefox.

---

## Key Highlights

- **2D House Blueprint**: Grounded in `Apartment.png` with interactive rooms, dirt spots, water spills, and roaming cat NPC.
- **Operator Movement**: Walk around using **Arrow Keys** or **WASD**.
- **Interactive Spatial Stations**: Walk near Station 1 through 5 in the apartment to enter each PEAS design step.
- **Robot POV Mode**: Inhabit the robot's sensor-filtered perspective (vision cone, sonar ranges, moisture probe, battery gauge).
- **4-Slot Block Canvas**: Visual decision rule chains (`SENSE` ➔ `CONDITION` ➔ `ACTION` ➔ `CONTROL`) with compatibility validation.
- **Parallel 10Hz Simulation Engine**: Real-time evaluation of parallel rules, collision detection, and PEAS scoring.
- **CSCW Collaborative Supports**:
  - Player A / Player B toggle with PlayerID event attribution.
  - Mutual contribution equity bar.
  - 2-second Verbal Agreement Protocol before debug moves.
  - Dual observation logging with divergence detection.
  - Spatially embedded PEAS diagnostic reflection.
  - Session CSV log export for empirical research.

See [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md) for full architecture and pedagogical specifications.
