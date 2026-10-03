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

    // Solid obstacles matching the visible 3D walls & furniture in Apartment.png
    this.obstacles = [
      // Outer Perimeter Walls
      { x: 130, y: 90, w: 25, h: 920, type: 'wall' },   // West outer wall
      { x: 1080, y: 360, w: 25, h: 650, type: 'wall' },  // East outer wall
      { x: 150, y: 1010, w: 930, h: 25, type: 'wall' },  // South outer wall
      { x: 380, y: 25, w: 25, h: 140, type: 'wall' },   // Top TV alcove wall
      { x: 780, y: 85, w: 25, h: 280, type: 'wall' },   // Living-corridor partition

      // Interior Dividing Walls
      { x: 450, y: 620, w: 22, h: 390, type: 'wall' },  // Kitchen-Dining wall
      { x: 740, y: 670, w: 22, h: 340, type: 'wall' },  // Dining-Bedroom wall
      { x: 780, y: 370, w: 22, h: 280, type: 'wall' },  // Bathroom left wall
      { x: 1060, y: 440, w: 22, h: 240, type: 'wall' }, // Bathroom right wall

      // Furniture in Apartment.png
      { x: 230, y: 220, w: 90, h: 180, type: 'furniture', name: 'Grey Sectional Sofa' },
      { x: 380, y: 290, w: 75, h: 90, type: 'furniture', name: 'Coffee Table' },
      { x: 390, y: 85, w: 160, h: 70, type: 'furniture', name: 'TV Console & Monitors' },
      { x: 180, y: 640, w: 100, h: 210, type: 'furniture', name: 'Kitchen Counter Island' },
      { x: 280, y: 770, w: 75, h: 80, type: 'furniture', name: 'Refrigerator' },
      { x: 530, y: 720, w: 130, h: 130, type: 'furniture', name: 'Round Dining Set' },
      { x: 780, y: 770, w: 170, h: 190, type: 'furniture', name: 'King Bed' },
      { x: 840, y: 395, w: 160, h: 80, type: 'furniture', name: 'Bathtub' },
      { x: 860, y: 570, w: 60, h: 45, type: 'furniture', name: 'Vanity Sink' }
    ];

    // Charging Dock Station (Living room corner / hallway)
    this.dock = {
      x: 620,
      y: 130,
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
      { id: 'TP_DOCK', name: 'Charging Dock', x: 620, y: 200, icon: '⚡' },
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
        x: 620,
        y: 130,
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

    // Autonomous Cleaning Robot
    this.robot = {
      x: 620,
      y: 190,
      radius: 20,
      heading: Math.PI / 2,
      speed: 2.2,
      isSlow: false,
      isStopped: false,
      battery: 100,
      isDocked: true,
      isCharging: false,
      vacuumActive: false,
      mopDeployed: false,
      armExtended: false,
      gripperClosed: false,
      heldObject: null,
      ledColor: 'rgba(59, 130, 246, 0.8)',
      lastTickLog: 'Robot ready at Dock',
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
    this.robot.x = 620;
    this.robot.y = 190;
    this.robot.heading = Math.PI / 2;
    this.robot.battery = 98;
    this.robot.heldObject = null;
    this.robot.vacuumActive = false;
    this.robot.mopDeployed = false;
    this.robot.armExtended = false;
    this.robot.gripperClosed = false;
    this.robot.pathTrail = [];
  }

  checkCollision(x, y, radius) {
    for (const ob of this.obstacles) {
      if (x + radius > ob.x && x - radius < ob.x + ob.w &&
          y + radius > ob.y && y - radius < ob.y + ob.h) {
        return true;
      }
    }
    return false;
  }
}
