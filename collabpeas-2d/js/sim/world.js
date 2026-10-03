/**
 * CollabPEAS - 2D Apartment World Model (Expanded Architecture & Fusion VR Features)
 * True architectural room layout based on Apartment.png with expanded rooms:
 * - Living Room, Kitchen, Dining Room, Master Bedroom, Modern Bathroom, Main Hallway
 * - PLUS: Robot Charging & Assembly Workshop Bay, Sun Balcony & Terrace
 * Contains collision polygons, interactive furniture, teleport markers, inspection tags.
 */

export class ApartmentWorld {
  constructor() {
    this.width = 1326;
    this.height = 1220;

    // View mode: 'architectural' (crisp vector blueprint) or 'hybrid' (render + vector overlay)
    this.viewMode = 'architectural';

    // Architectural Rooms
    this.rooms = [
      {
        id: 'living',
        name: 'Living Room',
        type: 'living',
        floorStyle: 'herringbone_oak',
        x: 180,
        y: 110,
        width: 480,
        height: 480,
        color: '#2a221b',
        ambientLight: 'rgba(251, 191, 36, 0.06)'
      },
      {
        id: 'kitchen',
        name: 'Gourmet Kitchen',
        type: 'kitchen',
        floorStyle: 'marble_tile',
        x: 140,
        y: 610,
        width: 320,
        height: 380,
        color: '#1a202c',
        ambientLight: 'rgba(56, 189, 248, 0.05)'
      },
      {
        id: 'dining',
        name: 'Dining Room',
        type: 'dining',
        floorStyle: 'walnut_parquet',
        x: 480,
        y: 640,
        width: 270,
        height: 350,
        color: '#241c18',
        ambientLight: 'rgba(245, 158, 11, 0.05)'
      },
      {
        id: 'bedroom',
        name: 'Master Bedroom',
        type: 'bedroom',
        floorStyle: 'ash_hardwood',
        x: 770,
        y: 700,
        width: 290,
        height: 320,
        color: '#221e25',
        ambientLight: 'rgba(168, 85, 247, 0.05)'
      },
      {
        id: 'bathroom',
        name: 'Modern Bathroom',
        type: 'bathroom',
        floorStyle: 'slate_stone',
        x: 800,
        y: 360,
        width: 270,
        height: 320,
        color: '#181e26',
        ambientLight: 'rgba(6, 182, 212, 0.05)'
      },
      {
        id: 'hallway',
        name: 'Central Corridor & Foyer',
        type: 'corridor',
        floorStyle: 'chevron_hall',
        x: 520,
        y: 430,
        width: 460,
        height: 200,
        color: '#201b17',
        ambientLight: 'rgba(255, 255, 255, 0.03)'
      },
      // New Room 1: Robot Charging & Assembly Workshop Bay (Fusion VR Training Assembly Zone)
      {
        id: 'workshop',
        name: 'Robot Assembly & Maintenance Bay',
        type: 'workshop',
        floorStyle: 'tech_grid',
        x: 680,
        y: 80,
        width: 340,
        height: 260,
        color: '#0f172a',
        ambientLight: 'rgba(2, 132, 199, 0.1)'
      },
      // New Room 2: Sun Balcony & Terrace
      {
        id: 'balcony',
        name: 'Outdoor Terrace & Balcony',
        type: 'balcony',
        floorStyle: 'deck_plank',
        x: 140,
        y: 20,
        width: 230,
        height: 110,
        color: '#1c221c',
        ambientLight: 'rgba(34, 197, 94, 0.06)'
      }
    ];

    // Teleport Markers (Inspired by Fusion VR Training TeleportTargetMarker.cs)
    this.teleportMarkers = [
      { id: 'TP_LIVING', name: 'Living Room', x: 420, y: 380, icon: '🛋️' },
      { id: 'TP_WORKSHOP', name: 'Assembly Bay', x: 820, y: 220, icon: '🦾' },
      { id: 'TP_KITCHEN', name: 'Kitchen', x: 330, y: 720, icon: '🍳' },
      { id: 'TP_DINING', name: 'Dining Room', x: 610, y: 840, icon: '🍽️' },
      { id: 'TP_BEDROOM', name: 'Master Bed', x: 910, y: 860, icon: '🛏️' },
      { id: 'TP_BALCONY', name: 'Balcony Terrace', x: 250, y: 70, icon: '🌿' }
    ];

    // Interactive Control Stand (Inspired by Fusion VR Training ControlStandActivityStatusUI.cs)
    this.controlStand = {
      x: 540,
      y: 450,
      width: 48,
      height: 36,
      name: 'Interactive Control Stand',
      screenStatus: 'SYSTEM READY • 10Hz TICK',
      activeActivity: 'CollabPEAS Household Agent Specification'
    };

    // Solid Obstacles for Physics & Navigation (Accurate bounding boxes)
    this.obstacles = [
      // Outer Boundary Walls
      { x: 130, y: 10, w: 20, h: 1000, type: 'wall' },  // West perimeter wall
      { x: 1080, y: 70, w: 20, h: 960, type: 'wall' },   // East perimeter wall
      { x: 140, y: 1010, w: 930, h: 20, type: 'wall' },  // South perimeter wall
      { x: 140, y: 10, w: 890, h: 20, type: 'wall' },   // North perimeter wall

      // Interior Partition Walls
      { x: 460, y: 610, w: 18, h: 390, type: 'wall' },  // Kitchen-Dining wall
      { x: 750, y: 650, w: 18, h: 360, type: 'wall' },  // Dining-Bedroom wall
      { x: 790, y: 350, w: 18, h: 290, type: 'wall' },  // Bathroom West wall
      { x: 660, y: 70, w: 18, h: 260, type: 'wall' },   // Living-Workshop wall
      { x: 140, y: 120, w: 240, h: 18, type: 'wall' },  // Balcony partition wall

      // Handcrafted Furniture Obstacles
      { x: 230, y: 200, w: 90, h: 200, type: 'furniture', name: 'Living Sofa Suite' },
      { x: 370, y: 260, w: 80, h: 90, type: 'furniture', name: 'Oak Coffee Table' },
      { x: 390, y: 120, w: 170, h: 45, type: 'furniture', name: 'TV Media Console & Desk' },
      { x: 160, y: 640, w: 110, h: 210, type: 'furniture', name: 'Kitchen Counter Island' },
      { x: 530, y: 720, w: 140, h: 140, type: 'furniture', name: 'Walnut Dining Set' },
      { x: 800, y: 750, w: 180, h: 190, type: 'furniture', name: 'King Platform Bed' },
      { x: 850, y: 380, w: 170, h: 80, type: 'furniture', name: 'Soaking Bathtub' },
      { x: 850, y: 580, w: 110, h: 50, type: 'furniture', name: 'Bathroom Vanity' },
      { x: 750, y: 100, w: 140, h: 60, type: 'furniture', name: 'Assembly Workbench & Racks' }
    ];

    // Doors & Passageways
    this.doors = [
      { x: 460, y: 550, w: 50, orientation: 'horizontal', name: 'Kitchen Opening' },
      { x: 680, y: 640, w: 60, orientation: 'horizontal', name: 'Dining Arch' },
      { x: 790, y: 580, w: 50, orientation: 'vertical', name: 'Bathroom Door' },
      { x: 770, y: 720, w: 50, orientation: 'horizontal', name: 'Master Bed Door' },
      { x: 660, y: 280, w: 50, orientation: 'vertical', name: 'Workshop Glass Door' },
      { x: 260, y: 120, w: 60, orientation: 'horizontal', name: 'Balcony Slider' }
    ];

    // Environmental Walkthrough Tags (Step 2A)
    this.inspectionTags = [
      {
        id: 'TAG_KITCHEN_SPILL',
        x: 340,
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
        y: 210,
        dimension: 'Continuous / Non-deterministic',
        text: 'Cluttered Living Space: Multiple continuous trajectories exist through furniture.',
        icon: '🛋️'
      },
      {
        id: 'TAG_HALLWAY_CABLE',
        x: 700,
        y: 530,
        dimension: 'Sensor-Specific Detectability',
        text: 'Thin Hallway Cable: Acoustic distance sonars can miss it; floor SLAM detects it.',
        icon: '🔌'
      },
      {
        id: 'TAG_CHARGING_DOCK',
        x: 820,
        y: 110,
        dimension: 'Goal Localization',
        text: 'Charging Station: Requires reliable coordinate localization for docking return.',
        icon: '⚡'
      }
    ];

    // Charging Dock Station (relocated to dedicated Workshop Bay)
    this.dock = {
      x: 820,
      y: 110,
      width: 60,
      height: 44,
      angle: 0
    };

    // Smart Trash Bin (Kitchen area)
    this.smartBin = {
      x: 410,
      y: 690,
      width: 38,
      height: 38,
      isOpen: false
    };

    // Belongings Destination Table
    this.depositTable = {
      x: 590,
      y: 750,
      width: 70,
      height: 70
    };

    // Interactive Floor Dirt Cells (for Task 1)
    this.dirtCells = this.generateDirtCells();

    // Interactive Floor Wet Spills (for Task 3)
    this.wetCells = this.generateWetCells();

    // Scattered Objects (for Task 2)
    this.objects = [
      { id: 'TRASH_1', type: 'TRASH', name: 'Crumpled Paper', x: 380, y: 440, carried: false, disposed: false, icon: '📄' },
      { id: 'TRASH_2', type: 'TRASH', name: 'Soda Can', x: 520, y: 310, carried: false, disposed: false, icon: '🥫' },
      { id: 'CUP_1', type: 'CUP', name: 'Ceramic Mug', x: 420, y: 240, carried: false, disposed: false, icon: '☕' },
      { id: 'FOOD_1', type: 'FOOD', name: 'Cat Food Bowl', x: 300, y: 780, carried: false, disposed: false, icon: '🥣' }
    ];

    // Operator Avatar (Controlled by Arrow Keys / WASD)
    this.avatar = {
      x: 540,
      y: 510,
      radius: 18,
      heading: -Math.PI / 2,
      speed: 3.6,
      moving: false,
      targetX: null,
      targetY: null
    };

    // Roaming Cat NPC (Autonomous dynamic obstacle)
    this.cat = {
      x: 580,
      y: 360,
      radius: 14,
      heading: Math.PI / 4,
      speed: 1.5,
      state: 'walk',
      pauseTimer: 0,
      patrolTargets: [
        { x: 580, y: 360 },
        { x: 370, y: 440 },
        { x: 510, y: 550 },
        { x: 690, y: 460 },
        { x: 440, y: 220 },
        { x: 230, y: 70 } // Visits balcony terrace
      ],
      targetIndex: 0
    };

    // Autonomous Cleaning Robot
    this.robot = {
      x: 820,
      y: 170,
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
      lastTickLog: 'Robot ready at Workshop Bay',
      traceState: { sense: null, decide: null, act: null },
      pathTrail: []
    };
  }

  generateDirtCells() {
    const list = [];
    const dirtCoords = [
      { x: 320, y: 300 }, { x: 340, y: 320 }, { x: 360, y: 340 },
      { x: 480, y: 220 }, { x: 500, y: 240 }, { x: 520, y: 260 },
      { x: 350, y: 460 }, { x: 380, y: 490 }, { x: 410, y: 510 },
      { x: 480, y: 460 }, { x: 510, y: 480 }, { x: 530, y: 500 },
      { x: 580, y: 640 }, { x: 610, y: 660 }, { x: 640, y: 680 },
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
      { id: 'WET_1', x: 310, y: 740, radius: 24, cleaned: false, inKitchen: true },
      { id: 'WET_2', x: 340, y: 770, radius: 20, cleaned: false, inKitchen: true },
      { id: 'WET_3', x: 920, y: 510, radius: 22, cleaned: false, inBathroom: true }
    ];
  }

  reset() {
    this.dirtCells.forEach(c => c.cleaned = false);
    this.wetCells.forEach(c => c.cleaned = false);
    this.objects.forEach(o => { o.carried = false; o.disposed = false; });
    this.robot.x = 820;
    this.robot.y = 170;
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
