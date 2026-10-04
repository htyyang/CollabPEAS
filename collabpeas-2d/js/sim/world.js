/**
 * CollabPEAS - 2D Apartment World Model
 * Grounded directly in Materials/Apartment.png layout.
 * Accurate room boundaries, obstacles, dirt/wet cells, interactive stations, and NPCs.
 */

export class ApartmentWorld {
  constructor() {
    // Coordinate space matches Apartment.png native dimensions (1326 x 1220)
    this.width = 1326;
    this.height = 1220;

    // Room boundaries aligned with Apartment.png
    this.rooms = [
      {
        id: 'living',
        name: 'Living Room',
        x: 200,
        y: 110,
        width: 480,
        height: 480,
        labelX: 420,
        labelY: 190
      },
      {
        id: 'kitchen',
        name: 'Kitchen',
        x: 170,
        y: 610,
        width: 290,
        height: 380,
        labelX: 300,
        labelY: 660
      },
      {
        id: 'dining',
        name: 'Dining Room',
        x: 470,
        y: 640,
        width: 270,
        height: 350,
        labelX: 580,
        labelY: 680
      },
      {
        id: 'bedroom',
        name: 'Master Bedroom',
        x: 740,
        y: 690,
        width: 290,
        height: 320,
        labelX: 860,
        labelY: 740
      },
      {
        id: 'bathroom',
        name: 'Bathroom',
        x: 780,
        y: 380,
        width: 280,
        height: 290,
        labelX: 880,
        labelY: 410
      },
      {
        id: 'hallway',
        name: 'Hallway / Foyer',
        x: 520,
        y: 430,
        width: 460,
        height: 200,
        labelX: 680,
        labelY: 510
      }
    ];

    // Solid obstacles matching the visible walls & furniture in Apartment.png / Apartment.glb
    // Configured with generous open doorways (no air walls) and clear corridors
    this.obstacles = [
      // Outer Perimeter Boundaries
      { x: 130, y: 90, w: 22, h: 920, type: 'wall' },   // West outer wall
      { x: 1075, y: 360, w: 22, h: 650, type: 'wall' }, // East outer wall
      { x: 140, y: 1005, w: 940, h: 22, type: 'wall' }, // South outer wall
      { x: 380, y: 30, w: 22, h: 110, type: 'wall' },   // Top TV alcove wall

      // Interior Architectural Partitions & Doorways
      // Living Room <-> Hallway (wide open corridor from y: 250 to 370)
      { x: 780, y: 85, w: 20, h: 165, type: 'wall' },

      // Kitchen <-> Dining (wide open archway y: 600..790, counter divider at y: 800..1005)
      { x: 450, y: 800, w: 18, h: 205, type: 'wall' },

      // Hallway <-> Master Bedroom (wide doorway y: 610..720, wall divider at y: 720..1005)
      { x: 745, y: 720, w: 18, h: 285, type: 'wall' },

      // Bathroom Walls (wide doorway into bathroom between y: 475 and 565)
      { x: 780, y: 370, w: 18, h: 105, type: 'wall' }, // Bathroom left upper wall
      { x: 780, y: 565, w: 18, h: 95, type: 'wall' },  // Bathroom left lower wall
      { x: 780, y: 370, w: 295, h: 18, type: 'wall' }, // Bathroom top wall
      { x: 1060, y: 440, w: 18, h: 220, type: 'wall' },// Bathroom right wall

      // Furniture Footprints (Trimmed to visual boundaries for smooth walking clearance)
      { x: 235, y: 225, w: 80, h: 170, type: 'furniture', name: 'Grey Sectional Sofa' },
      { x: 385, y: 295, w: 65, h: 80, type: 'furniture', name: 'Coffee Table' },
      { x: 395, y: 90, w: 150, h: 55, type: 'furniture', name: 'TV Console & Monitors' },
      { x: 185, y: 650, w: 85, h: 190, type: 'furniture', name: 'Kitchen Counter Island' },
      { x: 285, y: 780, w: 65, h: 70, type: 'furniture', name: 'Refrigerator' },
      { x: 540, y: 730, w: 110, h: 110, type: 'furniture', name: 'Round Dining Set' },
      { x: 790, y: 780, w: 150, h: 170, type: 'furniture', name: 'King Bed' },
      { x: 850, y: 400, w: 145, h: 70, type: 'furniture', name: 'Bathtub' },
      { x: 865, y: 575, w: 50, h: 40, type: 'furniture', name: 'Vanity Sink' }
    ];

    // Charging Dock Station (Living room north alcove)
    this.dock = {
      x: 580,
      y: 160,
      width: 52,
      height: 42,
      angle: 0
    };

    // Smart Trash Bin (Kitchen entrance)
    this.smartBin = {
      x: 410,
      y: 690,
      width: 36,
      height: 36,
      isOpen: false
    };

    // Belongings Destination Table (Dining table center)
    this.depositTable = {
      x: 580,
      y: 760,
      width: 60,
      height: 60
    };

    // Teleport Markers (Inspired by Fusion VR Training TeleportTargetMarker.cs)
    this.teleportMarkers = [
      { id: 'TP_LIVING', name: 'Living Room', x: 420, y: 380, icon: '🛋️' },
      { id: 'TP_DOCK', name: 'Charging Dock', x: 580, y: 160, icon: '⚡' },
      { id: 'TP_KITCHEN', name: 'Kitchen', x: 330, y: 720, icon: '🍳' },
      { id: 'TP_DINING', name: 'Dining Room', x: 610, y: 840, icon: '🍽️' },
      { id: 'TP_BEDROOM', name: 'Bedroom', x: 880, y: 850, icon: '🛏️' },
      { id: 'TP_BATHROOM', name: 'Bathroom', x: 920, y: 520, icon: '🚿' }
    ];

    // Environmental Walkthrough Tags (Step 2A)
    this.inspectionTags = [
      {
        id: 'TAG_KITCHEN_SPILL',
        x: 320,
        y: 840,
        dimension: 'Partially Observable',
        text: 'Hidden Spill: Your robot cannot see liquid puddles until it arrives directly over them.',
        icon: '👁️‍🗨️'
      },
      {
        id: 'TAG_CAT_PATROL',
        x: 580,
        y: 380,
        dimension: 'Dynamic Environment',
        text: 'Roaming Pet: This obstacle moves! Your robot\'s static map may quickly become invalid.',
        icon: '🐾'
      },
      {
        id: 'TAG_LIVING_ROOM',
        x: 360,
        y: 220,
        dimension: 'Continuous / Non-deterministic',
        text: 'Cluttered Living Space: Multiple continuous trajectories exist through furniture.',
        icon: '🛋️'
      },
      {
        id: 'TAG_HALLWAY_CABLE',
        x: 690,
        y: 530,
        dimension: 'Sensor-Specific Detectability',
        text: 'Thin Hallway Cable: Acoustic distance sonars can miss it; floor SLAM detects it.',
        icon: '🔌'
      },
      {
        id: 'TAG_CHARGING_DOCK',
        x: 580,
        y: 160,
        dimension: 'Goal Localization',
        text: 'Charging Station: Requires reliable coordinate localization for docking return.',
        icon: '⚡'
      }
    ];

    // Interactive Dirt Cells (for Task 1)
    this.dirtCells = this.generateDirtCells();

    // Interactive Wet Spills (for Task 3)
    this.wetCells = this.generateWetCells();

    // Scattered Objects (for Task 2)
    this.objects = [
      { id: 'TRASH_1', type: 'TRASH', name: 'Crumpled Paper', x: 360, y: 440, carried: false, disposed: false, icon: '📄' },
      { id: 'TRASH_2', type: 'TRASH', name: 'Soda Can', x: 500, y: 310, carried: false, disposed: false, icon: '🥫' },
      { id: 'CUP_1', type: 'CUP', name: 'Ceramic Mug', x: 420, y: 240, carried: false, disposed: false, icon: '☕' },
      { id: 'FOOD_1', type: 'FOOD', name: 'Cat Food Bowl', x: 290, y: 780, carried: false, disposed: false, icon: '🥣' }
    ];

    // Operator Avatar (Controlled by Arrow Keys / WASD)
    this.avatar = {
      x: 520,
      y: 480,
      radius: 18,
      heading: -Math.PI / 2,
      speed: 3.8,
      moving: false,
      targetX: null,
      targetY: null
    };

    // Roaming Cat NPC (Autonomous dynamic obstacle)
    this.cat = {
      x: 580,
      y: 380,
      radius: 14,
      heading: Math.PI / 4,
      speed: 1.6,
      state: 'walk',
      pauseTimer: 0,
      patrolTargets: [
        { x: 580, y: 380 },
        { x: 360, y: 460 },
        { x: 510, y: 560 },
        { x: 680, y: 460 },
        { x: 440, y: 230 }
      ],
      targetIndex: 0
    };

    // Autonomous Cleaning Robot (Spawned prominently in Living Room ready to clean)
    this.robot = {
      x: 480,
      y: 320,
      radius: 20,
      heading: -Math.PI / 2, // Facing North towards open living room / dirt
      speed: 2.2,
      isSlow: false,
      isStopped: false,
      battery: 100,
      isDocked: false,
      isCharging: false,
      vacuumActive: false,
      mopDeployed: false,
      armExtended: false,
      gripperClosed: false,
      heldObject: null,
      ledColor: 'rgba(59, 130, 246, 0.9)',
      lastTickLog: 'Robot ready in Living Room',
      traceState: { sense: null, decide: null, act: null },
      pathTrail: []
    };
  }

  generateDirtCells() {
    const list = [];
    const dirtCoords = [
      { x: 320, y: 310 }, { x: 340, y: 330 }, { x: 360, y: 350 },
      { x: 470, y: 230 }, { x: 490, y: 250 }, { x: 510, y: 270 },
      { x: 350, y: 470 }, { x: 380, y: 490 }, { x: 410, y: 510 },
      { x: 480, y: 470 }, { x: 510, y: 490 }, { x: 530, y: 510 },
      { x: 580, y: 650 }, { x: 610, y: 670 }, { x: 640, y: 690 },
      { x: 860, y: 840 }, { x: 880, y: 860 }
    ];
    dirtCoords.forEach((pt, i) => {
      list.push({
        id: `DIRT_${i}`,
        x: pt.x,
        y: pt.y,
        radius: 12,
        cleaned: false
      });
    });
    return list;
  }

  generateWetCells() {
    return [
      { id: 'WET_1', x: 300, y: 740, radius: 24, cleaned: false, inKitchen: true },
      { id: 'WET_2', x: 330, y: 770, radius: 20, cleaned: false, inKitchen: true },
      { id: 'WET_3', x: 920, y: 520, radius: 22, cleaned: false, inBathroom: true }
    ];
  }

  reset() {
    this.dirtCells.forEach(c => c.cleaned = false);
    this.wetCells.forEach(c => c.cleaned = false);
    this.objects.forEach(o => { o.carried = false; o.disposed = false; });
    this.robot.x = 480;
    this.robot.y = 320;
    this.robot.heading = -Math.PI / 2;
    this.robot.battery = 98;
    this.robot.heldObject = null;
    this.robot.vacuumActive = false;
    this.robot.mopDeployed = false;
    this.robot.armExtended = false;
    this.robot.gripperClosed = false;
    this.robot.pathTrail = [];
  }

  checkCollision(x, y, radius = 16) {
    // 1. Apartment outer perimeter boundaries
    if (x - radius < 145 || x + radius > 1070 || y - radius < 90 || y + radius > 1005) {
      return true;
    }

    // 2. Obstacles check
    for (const ob of this.obstacles) {
      if (x + radius > ob.x && x - radius < ob.x + ob.w &&
          y + radius > ob.y && y - radius < ob.y + ob.h) {
        return true;
      }
    }
    return false;
  }

  /**
   * Smooth movement resolver with wall-sliding collision response.
   * Prevents getting stuck on corners or invisible barriers.
   */
  resolveMove(startX, startY, dx, dy, radius = 16) {
    const targetX = startX + dx;
    const targetY = startY + dy;

    // 1. Try full diagonal/composite move
    if (!this.checkCollision(targetX, targetY, radius)) {
      return { x: targetX, y: targetY, moved: true };
    }

    // 2. Try sliding along X axis
    if (Math.abs(dx) > 0.001 && !this.checkCollision(targetX, startY, radius)) {
      return { x: targetX, y: startY, moved: true };
    }

    // 3. Try sliding along Y axis
    if (Math.abs(dy) > 0.001 && !this.checkCollision(startX, targetY, radius)) {
      return { x: startX, y: targetY, moved: true };
    }

    // Blocked
    return { x: startX, y: startY, moved: false };
  }
}
