import * as THREE from "three";
import { makeWoodTexture } from "./assetTextures.js";

const ROOM = {
  width: 16,
  depth: 20,
  height: 3.15,
};

const materials = {};

export async function createOfficeWorld(scene) {
  const blockers = [];

  scene.background = new THREE.Color("#c6d0d5");
  scene.fog = new THREE.Fog("#cbd4d9", 18, 38);

  materials.floor = new THREE.MeshStandardMaterial({
    map: makeWoodTexture(),
    roughness: 0.7,
    metalness: 0.02,
  });
  materials.floor.map.wrapS = THREE.RepeatWrapping;
  materials.floor.map.wrapT = THREE.RepeatWrapping;
  materials.floor.map.repeat.set(7, 9);

  materials.wall = new THREE.MeshStandardMaterial({ color: "#dfe3e0", roughness: 0.8 });
  materials.blueWall = new THREE.MeshStandardMaterial({ color: "#b9cfd8", roughness: 0.76 });
  materials.ceiling = new THREE.MeshStandardMaterial({ color: "#c9c9c2", roughness: 0.84 });
  materials.desk = new THREE.MeshStandardMaterial({ color: "#f0f1ed", roughness: 0.52 });
  materials.cabinet = new THREE.MeshStandardMaterial({ color: "#e5e2d9", roughness: 0.58 });
  materials.cardboard = new THREE.MeshStandardMaterial({ color: "#b78a5d", roughness: 0.9 });
  materials.woodTrim = new THREE.MeshStandardMaterial({ color: "#b37b42", roughness: 0.62 });
  materials.metal = new THREE.MeshStandardMaterial({ color: "#7f8589", roughness: 0.38, metalness: 0.55 });
  materials.blackPlastic = new THREE.MeshStandardMaterial({ color: "#10161b", roughness: 0.4 });
  materials.screen = new THREE.MeshStandardMaterial({
    color: "#091016",
    emissive: "#132a35",
    emissiveIntensity: 0.42,
    roughness: 0.25,
  });
  materials.board = new THREE.MeshStandardMaterial({ color: "#edf1ec", roughness: 0.38 });
  materials.darkBoard = new THREE.MeshStandardMaterial({ color: "#26313a", roughness: 0.45 });
  materials.yellow = new THREE.MeshStandardMaterial({
    color: "#d8b337",
    emissive: "#806200",
    emissiveIntensity: 0.1,
    roughness: 0.48,
  });
  materials.green = new THREE.MeshStandardMaterial({ color: "#45675a", roughness: 0.6 });
  materials.couch = new THREE.MeshStandardMaterial({ color: "#373432", roughness: 0.78 });
  materials.bin = new THREE.MeshStandardMaterial({ color: "#252b2f", roughness: 0.55, metalness: 0.16 });

  createShell(scene);
  createInteriorWalls(scene, blockers);
  createCeilingGrid(scene);
  createLights(scene);
  createVideoOfficeDetails(scene, blockers);

  return {
    bounds: {
      minX: -ROOM.width / 2 + 0.2,
      maxX: ROOM.width / 2 - 0.2,
      minZ: -ROOM.depth / 2 + 0.2,
      maxZ: ROOM.depth / 2 - 0.2,
    },
    blockers,
  };
}

function createShell(scene) {
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(ROOM.width, ROOM.depth), materials.floor);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  addWall(scene, 0, ROOM.height / 2, -ROOM.depth / 2, ROOM.width, ROOM.height, 0, materials.blueWall);
  addWall(scene, 0, ROOM.height / 2, ROOM.depth / 2, ROOM.width, ROOM.height, Math.PI, materials.wall);
  addWall(scene, -ROOM.width / 2, ROOM.height / 2, 0, ROOM.depth, ROOM.height, Math.PI / 2, materials.wall);
  addWall(scene, ROOM.width / 2, ROOM.height / 2, 0, ROOM.depth, ROOM.height, -Math.PI / 2, materials.wall);

  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(ROOM.width, ROOM.depth), materials.ceiling);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = ROOM.height;
  scene.add(ceiling);

  const beamMaterial = new THREE.MeshStandardMaterial({ color: "#a2a2a0", roughness: 0.72 });
  addBox(scene, [ROOM.width, 0.22, 0.22], [0, ROOM.height - 0.08, 1.65], beamMaterial);
  addBox(scene, [0.92, 0.22, 5.9], [2.7, ROOM.height - 0.08, -4.6], beamMaterial);
}

function createInteriorWalls(scene, blockers) {
  addBlockingBox(scene, blockers, [5.2, ROOM.height, 0.18], [-5.4, ROOM.height / 2, 1.68], materials.wall);
  addBlockingBox(scene, blockers, [5.2, ROOM.height, 0.18], [5.4, ROOM.height / 2, 1.68], materials.wall);

  addBlockingBox(scene, blockers, [0.18, ROOM.height, 1.9], [-2.35, ROOM.height / 2, 2.78], materials.wall);
  addBlockingBox(scene, blockers, [0.18, ROOM.height, 3.15], [-2.35, ROOM.height / 2, 7.85], materials.wall);
  addBlockingBox(scene, blockers, [0.18, ROOM.height, 1.35], [2.35, ROOM.height / 2, 2.48], materials.wall);
  addBlockingBox(scene, blockers, [0.18, ROOM.height, 3.1], [2.35, ROOM.height / 2, 7.88], materials.wall);

  addDoorTrim(scene, -2.34, 5.25, Math.PI / 2, 1.8);
  addDoorTrim(scene, 2.34, 5.1, -Math.PI / 2, 1.8);
  addDoorTrim(scene, -2.1, 1.68, 0, 1.55);
  addDoorTrim(scene, 2.1, 1.68, 0, 1.55);
}

function createCeilingGrid(scene) {
  const railMaterial = new THREE.MeshStandardMaterial({ color: "#8f9290", roughness: 0.6 });

  for (let x = -ROOM.width / 2; x <= ROOM.width / 2; x += 1.6) {
    addBox(scene, [0.035, 0.025, ROOM.depth], [x, ROOM.height - 0.03, 0], railMaterial);
  }

  for (let z = -ROOM.depth / 2; z <= ROOM.depth / 2; z += 1.6) {
    addBox(scene, [ROOM.width, 0.025, 0.035], [0, ROOM.height - 0.028, z], railMaterial);
  }
}

function createLights(scene) {
  scene.add(new THREE.HemisphereLight("#dbeeff", "#5f5140", 1.28));

  const sun = new THREE.DirectionalLight("#ffffff", 2.1);
  sun.position.set(-3.8, 8.5, 4.5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  scene.add(sun);

  const panelMaterial = new THREE.MeshStandardMaterial({
    color: "#fff8dd",
    emissive: "#fff2b8",
    emissiveIntensity: 2.35,
    roughness: 0.2,
  });

  [
    [0, 7.35],
    [0, 4.7],
    [-5.4, 6.6],
    [4.9, 5.6],
    [-5.7, -5.9],
    [-1.9, -7.0],
    [2.7, -6.9],
    [6.1, -5.8],
    [-4.9, -1.1],
    [1.6, -1.3],
    [5.6, -1.6],
  ].forEach(([x, z]) => {
    addBox(scene, [1.55, 0.035, 0.48], [x, ROOM.height - 0.045, z], panelMaterial);
    const light = new THREE.PointLight("#fff7de", 0.45, 5.2);
    light.position.set(x, ROOM.height - 0.22, z);
    scene.add(light);
  });
}

function createVideoOfficeDetails(scene, blockers) {
  createCorridor(scene, blockers);
  createSideRooms(scene, blockers);
  createLab(scene, blockers);
  createBackWall(scene);
  createStorage(scene, blockers);
}

function createCorridor(scene, blockers) {
  createWhiteboard(scene, [-2.46, 1.55, 3.15], [0.05, 1.25, 1.85], "x");
  createWhiteboard(scene, [2.46, 1.55, 3.15], [0.05, 1.05, 1.45], "x");
  addCylinder(scene, 0.28, 0.52, [-1.9, 0.26, 4.2], materials.bin);
  blockers.push(boxBlocker(-1.9, 4.2, 0.62, 0.62));

  addBox(scene, [0.38, 1.7, 0.08], [0, 0.85, 9.85], materials.green);
  addBox(scene, [1.1, 0.1, 0.08], [0, 2.2, 9.83], materials.woodTrim);
}

function createSideRooms(scene, blockers) {
  addCouch(scene, -5.8, 6.45);
  blockers.push(boxBlocker(-5.8, 6.45, 2.45, 1.05));

  addBox(scene, [1.3, 0.12, 0.9], [4.9, 0.76, 5.15], materials.desk);
  addMonitor(scene, 4.9, 4.8, 0.92);
  addChair(scene, 4.9, 5.95);
  blockers.push(boxBlocker(4.9, 5.15, 1.75, 1.45));
}

function createLab(scene, blockers) {
  createDeskIsland(scene, -4.9, -3.35, 4.8, 1.45, 0);
  createDeskIsland(scene, 4.5, -2.55, 4.95, 1.45, 0);
  createDeskIsland(scene, 0.8, -7.55, 5.4, 1.35, 0);

  blockers.push(boxBlocker(-4.9, -3.35, 5.2, 1.8));
  blockers.push(boxBlocker(4.5, -2.55, 5.35, 1.85));
  blockers.push(boxBlocker(0.8, -7.55, 5.85, 1.8));

  createWhiteboard(scene, [-6.9, 1.58, -9.86], [2.55, 1.25, 0.05], "z");
  addMarkerScribbles(scene, -6.9, -9.82);

  addBox(scene, [1.15, 0.78, 0.58], [-1.7, 0.39, -6.0], materials.cabinet);
  addBox(scene, [0.95, 0.56, 0.7], [5.75, 0.28, -5.8], materials.cardboard);
  blockers.push(boxBlocker(-1.7, -6.0, 1.35, 0.8));
  blockers.push(boxBlocker(5.75, -5.8, 1.15, 0.9));
}

function createBackWall(scene) {
  addBox(scene, [1.75, 0.32, 0.42], [0, 2.88, -9.86], materials.cabinet);
  addPlanningBoard(scene, 2.15, 1.9, -9.86);
  addClock(scene, -2.05, 2.15, -9.84);
  addAirConditioner(scene, -0.2, 2.82, -9.84);
}

function createStorage(scene, blockers) {
  createTallShelf(scene, -7.35, -7.0);
  createTallShelf(scene, 7.25, -6.7);
  createMetalRack(scene, 7.15, -0.25);

  blockers.push(boxBlocker(-7.35, -7.0, 1.05, 2.4));
  blockers.push(boxBlocker(7.25, -6.7, 1.05, 2.6));
  blockers.push(boxBlocker(7.15, -0.25, 1.0, 2.1));

  addBox(scene, [0.95, 0.62, 0.8], [-6.9, 0.31, -0.5], materials.cardboard);
  addBox(scene, [0.9, 0.5, 0.7], [-6.0, 0.25, -0.15], materials.cardboard);
  addBox(scene, [1.2, 0.62, 0.85], [6.85, 0.31, 1.0], materials.cardboard);
  blockers.push(boxBlocker(-6.45, -0.35, 1.9, 1.0));
  blockers.push(boxBlocker(6.85, 1.0, 1.35, 1.05));
}

function createDeskIsland(scene, x, z, width, depth, rotationY) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = rotationY;

  addBox(group, [width, 0.12, depth], [0, 0.76, 0], materials.desk);

  const legPositions = [
    [-width / 2 + 0.23, -depth / 2 + 0.18],
    [width / 2 - 0.23, -depth / 2 + 0.18],
    [-width / 2 + 0.23, depth / 2 - 0.18],
    [width / 2 - 0.23, depth / 2 - 0.18],
  ];
  legPositions.forEach(([lx, lz]) => addBox(group, [0.08, 0.74, 0.08], [lx, 0.37, lz], materials.metal));

  for (let i = -1; i <= 1; i += 1) {
    addMonitor(group, i * 1.18, -depth * 0.26, 0.92);
    addKeyboard(group, i * 1.18, depth * 0.2, 0.84);
    addChair(group, i * 1.18, depth * 0.88);
  }

  scene.add(group);
}

function addMonitor(group, x, z, y) {
  addBox(group, [0.08, 0.52, 0.82], [x, y + 0.28, z], materials.blackPlastic);
  addBox(group, [0.06, 0.43, 0.72], [x - 0.045, y + 0.28, z], materials.screen);
  addBox(group, [0.06, 0.2, 0.08], [x, y - 0.04, z], materials.blackPlastic);
  addBox(group, [0.36, 0.035, 0.24], [x, y - 0.16, z], materials.blackPlastic);
}

function addKeyboard(group, x, z, y) {
  addBox(group, [0.74, 0.035, 0.23], [x, y, z], materials.blackPlastic);
  addBox(group, [0.2, 0.03, 0.28], [x + 0.56, y + 0.005, z + 0.02], materials.blackPlastic);
}

function addChair(group, x, z) {
  const chairMaterial = new THREE.MeshStandardMaterial({ color: "#202b31", roughness: 0.62 });
  const seatMaterial = new THREE.MeshStandardMaterial({ color: "#314f5a", roughness: 0.75 });

  addBox(group, [0.72, 0.15, 0.62], [x, 0.5, z], seatMaterial);
  addBox(group, [0.72, 0.72, 0.12], [x, 0.92, z + 0.26], chairMaterial);
  addBox(group, [0.08, 0.48, 0.08], [x, 0.25, z], materials.metal);
}

function addCouch(scene, x, z) {
  addBox(scene, [2.35, 0.42, 0.82], [x, 0.36, z], materials.couch);
  addBox(scene, [2.35, 0.82, 0.18], [x, 0.75, z + 0.38], materials.couch);
  addBox(scene, [0.18, 0.55, 0.82], [x - 1.16, 0.55, z], materials.couch);
  addBox(scene, [0.18, 0.55, 0.82], [x + 1.16, 0.55, z], materials.couch);
}

function createTallShelf(scene, x, z) {
  addBox(scene, [0.9, 2.0, 1.9], [x, 1.02, z], materials.cabinet);
  for (let i = 0; i < 4; i += 1) {
    addBox(scene, [0.82, 0.05, 1.75], [x, 0.45 + i * 0.42, z], materials.metal);
  }

  for (let i = 0; i < 5; i += 1) {
    addBox(scene, [0.34, 0.28, 0.36], [x, 0.62 + (i % 3) * 0.42, z - 0.65 + i * 0.31], materials.cardboard);
  }
}

function createMetalRack(scene, x, z) {
  addBox(scene, [0.85, 1.7, 1.75], [x, 0.86, z], materials.metal);
  addBox(scene, [0.72, 0.3, 1.35], [x, 1.55, z], materials.cardboard);
  addBox(scene, [0.72, 0.3, 1.35], [x, 0.85, z], materials.cardboard);
}

function createWhiteboard(scene, position, size, axis) {
  const board = addBox(scene, size, position, materials.board);
  board.receiveShadow = true;

  if (axis === "x") {
    addBox(scene, [0.055, size[1] + 0.1, 0.055], [position[0], position[1], position[2] - size[2] / 2], materials.metal);
    addBox(scene, [0.055, size[1] + 0.1, 0.055], [position[0], position[1], position[2] + size[2] / 2], materials.metal);
  } else {
    addBox(scene, [size[0] + 0.1, 0.055, 0.055], [position[0], position[1] - size[1] / 2, position[2]], materials.metal);
    addBox(scene, [size[0] + 0.1, 0.055, 0.055], [position[0], position[1] + size[1] / 2, position[2]], materials.metal);
  }
}

function addMarkerScribbles(scene, x, z) {
  const marker = new THREE.LineBasicMaterial({ color: "#46636c", linewidth: 2 });

  for (let i = 0; i < 5; i += 1) {
    const points = [
      new THREE.Vector3(x - 0.8 + i * 0.3, 1.45 + Math.sin(i) * 0.1, z),
      new THREE.Vector3(x - 0.35 + i * 0.32, 1.7 + Math.cos(i) * 0.1, z),
      new THREE.Vector3(x + 0.05 + i * 0.25, 1.48 + Math.sin(i * 1.7) * 0.12, z),
    ];
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), marker));
  }
}

function addPlanningBoard(scene, x, y, z) {
  addBox(scene, [5.2, 1.28, 0.05], [x, y, z], materials.darkBoard);

  for (let i = 0; i < 5; i += 1) {
    addBox(scene, [4.85, 0.045, 0.07], [x, y - 0.47 + i * 0.24, z + 0.02], materials.yellow);
  }

  for (let i = 0; i < 8; i += 1) {
    const color = i % 3 === 0 ? materials.green : i % 3 === 1 ? materials.cabinet : materials.cardboard;
    addBox(scene, [0.42, 0.14, 0.065], [x - 2.1 + i * 0.6, y + 0.4 - (i % 2) * 0.24, z + 0.04], color);
  }
}

function addClock(scene, x, y, z) {
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(0.28, 0.035, 8, 32),
    new THREE.MeshStandardMaterial({ color: "#111518", roughness: 0.42 }),
  );
  rim.position.set(x, y, z);
  scene.add(rim);

  const face = new THREE.Mesh(
    new THREE.CircleGeometry(0.25, 32),
    new THREE.MeshStandardMaterial({ color: "#f6f6ee", roughness: 0.5 }),
  );
  face.position.set(x, y, z + 0.012);
  scene.add(face);

  addBox(scene, [0.03, 0.2, 0.02], [x, y + 0.08, z + 0.03], materials.blackPlastic);
  addBox(scene, [0.16, 0.03, 0.02], [x + 0.07, y, z + 0.03], materials.blackPlastic);
}

function addAirConditioner(scene, x, y, z) {
  addBox(scene, [1.6, 0.34, 0.24], [x, y, z], materials.cabinet);
  addBox(scene, [1.45, 0.04, 0.05], [x, y - 0.13, z + 0.08], materials.metal);
}

function addDoorTrim(scene, x, z, rotationY, width) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = rotationY;
  addBox(group, [0.08, 2.35, 0.08], [-width / 2, 1.18, 0], materials.woodTrim);
  addBox(group, [0.08, 2.35, 0.08], [width / 2, 1.18, 0], materials.woodTrim);
  addBox(group, [width + 0.08, 0.1, 0.08], [0, 2.35, 0], materials.woodTrim);
  scene.add(group);
}

function addWall(scene, x, y, z, width, height, rotationY, material) {
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
  wall.position.set(x, y, z);
  wall.rotation.y = rotationY;
  wall.receiveShadow = true;
  scene.add(wall);
}

function addBox(parent, size, position, material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], size[2]), material);
  mesh.position.set(position[0], position[1], position[2]);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function addBlockingBox(scene, blockers, size, position, material) {
  addBox(scene, size, position, material);
  blockers.push(boxBlocker(position[0], position[2], size[0], size[2]));
}

function addCylinder(scene, radius, height, position, material) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 0.86, height, 24), material);
  mesh.position.set(position[0], position[1], position[2]);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  return mesh;
}

function boxBlocker(x, z, width, depth) {
  return {
    minX: x - width / 2,
    maxX: x + width / 2,
    minZ: z - depth / 2,
    maxZ: z + depth / 2,
  };
}
