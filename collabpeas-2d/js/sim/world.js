/**
 * CollabPEAS - 2D Apartment World Model
 * Grounded in Materials/Apartment.png layout.
 * Contains collision geometry, rooms, cells (dirt/wet), entities (cat, avatar, robot, dock).
 */

export class ApartmentWorld {
  constructor() {
    // Coordinate space matches Apartment.png aspect ratio (1326 x 1220)
    this.width = 1326;
    this.height = 1220;

    // Room boundaries (for display & spatial labeling)
    this.rooms = [
      { id: 'living', name: 'Living Room', x: 220, y: 150, width: 440, height: 460 },
      { id: 'kitchen', name: 'Kitchen', x: 180, y: 640, width: 280, height: 350 },
      { id: 'dining', name: 'Dining Room', x: 470, y: 660, width: 270, height: 330 },
      { id: 'bedroom', name: 'Bedroom', x: 740, y: 720, width: 260, height: 320 },
      { id: 'bathroom', name: 'Bathroom', x: 790, y: 390, width: 280, height: 300 },
      { id: 'hallway', name: 'Main Hallway / Corridor', x: 500, y: 450, width: 450, height: 200 }
    ];

    // Solid obstacles for collision (approximate bounding boxes of walls & heavy furniture)
    this.obstacles = [
      // Outer & Partition Walls
      { x: 120, y: 100, w: 20, h: 900, type: 'wall' }, // West outer wall
      { x: 1080, y: 360, w: 20, h: 680, type: 'wall' }, // East outer wall
      { x: 180, y: 1040, w: 860, h: 20, type: 'wall' }, // South outer wall
      { x: 380, y: 30, w: 20, h: 140, type: 'wall' }, // TV alcove wall
      { x: 780, y: 100, w: 20, h: 260, type: 'wall' }, // Entry partition
      { x: 450, y: 630, w: 20, h: 390, type: 'wall' }, // Kitchen-dining wall
      { x: 740, y: 680, w: 20, h: 340, type: 'wall' }, // Dining-bedroom wall
      { x: 780, y: 380, w: 20, h: 280, type: 'wall' }, // Bathroom left wall

      // Furniture Obstacles
      { x: 260, y: 220, w: 80, h: 180, type: 'furniture', name: 'Living Sofa' },
      { x: 400, y: 280, w: 70, h: 100, type: 'furniture', name: 'Coffee Table' },
      { x: 410, y: 80, w: 160, h: 80, type: 'furniture', name: 'TV Media Console' },
      { x: 220, y: 660, w: 100, h: 200, type: 'furniture', name: 'Kitchen Counter & Stove' },
      { x: 540, y: 740, w: 130, h: 130, type: 'furniture', name: 'Dining Table & Chairs' },
      { x: 780, y: 780, w: 170, h: 200, type: 'furniture', name: 'King Bed' },
      { x: 840, y: 400, w: 160, h: 90, type: 'furniture', name: 'Bathtub' }
    ];

    // Step 2A: Environment Walkthrough Tags
    this.inspectionTags = [
      {
        id: 'TAG_KITCHEN_SPILL',
        x: 320,
        y: 820,
        dimension: 'Partially Observable',
        text: 'Your robot cannot see this spill until it arrives directly here.',
        icon: '👁️‍🗨️'
      },
      {
        id: 'TAG_CAT_PATROL',
        x: 580,
        y: 400,
        dimension: 'Dynamic Environment',
        text: 'This obstacle moves! Your robot\'s map from a moment ago may already be wrong.',
        icon: '🐾'
      },
      {
        id: 'TAG_LIVING_ROOM',
        x: 380,
        y: 220,
        dimension: 'Continuous / Non-deterministic',
        text: 'There is no single correct path through cluttered furniture.',
        icon: '🛋️'
      },
      {
        id: 'TAG_HALLWAY_CABLE',
        x: 680,
        y: 530,
        dimension: 'Sensor-Specific Detectability',
        text: 'A simple distance sensor may miss thin cables. A floor map sensor would detect it.',
        icon: '🔌'
      },
      {
        id: 'TAG_CHARGING_DOCK',
        x: 620,
        y: 110,
        dimension: 'Goal Localization',
        text: 'Your robot needs to find this charging dock reliably from any location.',
        icon: '⚡'
      }
    ];

    // Charging Dock Station
    this.dock = {
      x: 620,
      y: 110,
      width: 50,
      height: 40,
      angle: 0
    };

    // Smart Trash Bin
    this.smartBin = {
      x: 390,
      y: 700,
      width: 36,
      height: 36,
      isOpen: false
    };

    // Belongings Destination Table
    this.depositTable = {
      x: 580,
      y: 760,
      width: 60,
      height: 60
    };

    // Interactive Dirt Cells (for Task 1)
    this.dirtCells = this.generateDirtCells();

    // Interactive Wet Spills (for Task 3)
    this.wetCells = this.generateWetCells();

    // Scattered Objects (for Task 2)
    this.objects = [
      { id: 'TRASH_1', type: 'TRASH', name: 'Crumpled Paper', x: 350, y: 440, carried: false, disposed: false, icon: '📄' },
      { id: 'TRASH_2', type: 'TRASH', name: 'Empty Soda Can', x: 500, y: 320, carried: false, disposed: false, icon: '🥫' },
      { id: 'CUP_1', type: 'CUP', name: 'Ceramic Mug', x: 440, y: 260, carried: false, disposed: false, icon: '☕' },
      { id: 'FOOD_1', type: 'FOOD', name: 'Cat Food Bowl', x: 280, y: 780, carried: false, disposed: false, icon: '🥣' }
    ];

    // Operator Avatar (Player Character controlled via Arrow Keys)
    this.avatar = {
      x: 520,
      y: 480,
      radius: 18,
      heading: 0,
      speed: 3.5,
      moving: false
    };

    // Roaming Cat NPC (Autonomous dynamic obstacle for Task 4)
    this.cat = {
      x: 580,
      y: 380,
      radius: 14,
      heading: Math.PI / 4,
      speed: 1.6,
      state: 'walk', // 'walk' | 'pause'
      pauseTimer: 0,
      patrolTargets: [
        { x: 580, y: 380 },
        { x: 350, y: 460 },
        { x: 500, y: 560 },
        { x: 670, y: 460 },
        { x: 440, y: 220 }
      ],
      targetIndex: 0
    };

    // Autonomous Cleaning Robot
    this.robot = {
      x: 620,
      y: 160,
      radius: 20,
      heading: Math.PI / 2, // Facing downwards
      speed: 2.2,
      baseSpeed: 2.2,
      isSlow: false,
      isStopped: false,
      battery: 100, // 0..100
      isDocked: false,
      isCharging: false,
      vacuumActive: false,
      mopDeployed: false,
      armExtended: false,
      gripperClosed: false,
      heldObject: null,
      ledColor: 'rgba(59, 130, 246, 0.8)', // blue
      lastTickLog: 'Robot initialized on dock',
      traceState: { sense: null, decide: null, act: null },
      pathTrail: []
    };
  }

  generateDirtCells() {
    const list = [];
    const dirtCoords = [
      { x: 320, y: 320 }, { x: 340, y: 340 }, { x: 360, y: 360 },
      { x: 480, y: 240 }, { x: 500, y: 260 }, { x: 520, y: 280 },
      { x: 360, y: 480 }, { x: 380, y: 500 }, { x: 400, y: 520 },
      { x: 480, y: 460 }, { x: 510, y: 480 }, { x: 530, y: 500 },
      { x: 580, y: 640 }, { x: 610, y: 660 }, { x: 640, y: 680 }
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
      { id: 'WET_1', x: 290, y: 740, radius: 24, cleaned: false, inKitchen: true },
      { id: 'WET_2', x: 320, y: 760, radius: 20, cleaned: false, inKitchen: true },
      { id: 'WET_3', x: 920, y: 540, radius: 22, cleaned: false, inBathroom: true }
    ];
  }

  reset() {
    this.dirtCells.forEach(c => c.cleaned = false);
    this.wetCells.forEach(c => c.cleaned = false);
    this.objects.forEach(o => { o.carried = false; o.disposed = false; });
    this.robot.x = 620;
    this.robot.y = 160;
    this.robot.heading = Math.PI / 2;
    this.robot.battery = 95;
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
