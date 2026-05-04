import * as THREE from "three";
import { makeOfficeFallback, makeWoodTexture, loadTextureOrFallback } from "./assetTextures.js";

const ROOM = {
  width: 18,
  depth: 12,
  height: 3.15,
};

const materials = {};

export async function createOfficeWorld(scene) {
  scene.background = new THREE.Color("#b8c3cb");
  scene.fog = new THREE.Fog("#c7d3dc", 16, 34);

  materials.floor = new THREE.MeshStandardMaterial({
    map: makeWoodTexture(),
    roughness: 0.67,
    metalness: 0.02,
  });
  materials.floor.map.wrapS = THREE.RepeatWrapping;
  materials.floor.map.wrapT = THREE.RepeatWrapping;
  materials.floor.map.repeat.set(7, 5);

  materials.wall = new THREE.MeshStandardMaterial({ color: "#dce3e4", roughness: 0.78 });
  materials.blueWall = new THREE.MeshStandardMaterial({ color: "#b8cfdd", roughness: 0.75 });
  materials.ceiling = new THREE.MeshStandardMaterial({ color: "#c8c8c3", roughness: 0.82 });
  materials.desk = new THREE.MeshStandardMaterial({ color: "#f1f2ef", roughness: 0.52 });
  materials.metal = new THREE.MeshStandardMaterial({ color: "#7f8589", roughness: 0.38, metalness: 0.55 });
  materials.blackPlastic = new THREE.MeshStandardMaterial({ color: "#10161b", roughness: 0.4 });
  materials.screen = new THREE.MeshStandardMaterial({
    color: "#091016",
    emissive: "#111e27",
    emissiveIntensity: 0.35,
    roughness: 0.25,
  });

  createShell(scene);
  createCeilingGrid(scene);
  createLights(scene);
  createWindows(scene);
  createFurniture(scene);
  await createOfficePhoto(scene);

  return {
    bounds: {
      minX: -ROOM.width / 2 + 0.2,
      maxX: ROOM.width / 2 - 0.2,
      minZ: -ROOM.depth / 2 + 0.2,
      maxZ: ROOM.depth / 2 - 0.2,
    },
    blockers: [
      boxBlocker(-2.8, -0.6, 5.6, 1.85),
      boxBlocker(3.7, 1.0, 5.9, 1.85),
      boxBlocker(-7.3, -3.2, 1.2, 3.7),
      boxBlocker(7.25, -2.8, 1.1, 5.0),
      boxBlocker(0.0, 5.35, 16.5, 0.7),
      boxBlocker(-8.15, 2.9, 0.7, 2.4),
    ],
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

  const beamMaterial = new THREE.MeshStandardMaterial({ color: "#9a9d9d", roughness: 0.68 });
  addBox(scene, [1.05, 0.22, ROOM.depth], [1.3, ROOM.height - 0.08, 0], beamMaterial);
  addBox(scene, [ROOM.width, 0.16, 0.22], [0, ROOM.height - 0.1, -1.25], beamMaterial);
}

function addWall(scene, x, y, z, width, height, rotationY, material) {
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
  wall.position.set(x, y, z);
  wall.rotation.y = rotationY;
  wall.receiveShadow = true;
  scene.add(wall);
}

function createCeilingGrid(scene) {
  const railMaterial = new THREE.MeshStandardMaterial({ color: "#8f9290", roughness: 0.6 });

  for (let x = -ROOM.width / 2; x <= ROOM.width / 2; x += 1.5) {
    addBox(scene, [0.035, 0.025, ROOM.depth], [x, ROOM.height - 0.03, 0], railMaterial);
  }

  for (let z = -ROOM.depth / 2; z <= ROOM.depth / 2; z += 1.5) {
    addBox(scene, [ROOM.width, 0.025, 0.035], [0, ROOM.height - 0.028, z], railMaterial);
  }
}

function createLights(scene) {
  scene.add(new THREE.HemisphereLight("#dbeeff", "#5e4e3d", 1.25));

  const sun = new THREE.DirectionalLight("#ffffff", 2.2);
  sun.position.set(-4.2, 8.5, 3.5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  scene.add(sun);

  const panelMaterial = new THREE.MeshStandardMaterial({
    color: "#fff7dd",
    emissive: "#fff1b6",
    emissiveIntensity: 2.4,
    roughness: 0.2,
  });

  [
    [-6, -4],
    [-2.8, -4.2],
    [2.6, -4.1],
    [6.1, -4.3],
    [-5, -0.8],
    [2.2, -0.9],
    [6, 1.2],
    [-3.4, 3.2],
  ].forEach(([x, z]) => {
    addBox(scene, [1.55, 0.035, 0.48], [x, ROOM.height - 0.045, z], panelMaterial);
    const light = new THREE.PointLight("#fff7de", 0.55, 5);
    light.position.set(x, ROOM.height - 0.2, z);
    scene.add(light);
  });
}

function createWindows(scene) {
  const glassMaterial = new THREE.MeshStandardMaterial({
    color: "#dff5ff",
    emissive: "#b9e8ff",
    emissiveIntensity: 0.75,
    roughness: 0.12,
    metalness: 0.08,
  });
  const frameMaterial = new THREE.MeshStandardMaterial({ color: "#22313a", roughness: 0.55 });
  const blindMaterial = new THREE.MeshStandardMaterial({ color: "#eee8dc", roughness: 0.72 });

  [-5.2, -1.7, 2.3, 5.8].forEach((x, index) => {
    addBox(scene, [2.2, 1.15, 0.04], [x, 1.86, -5.93], glassMaterial);
    addBox(scene, [2.35, 0.08, 0.08], [x, 2.49, -5.9], frameMaterial);
    addBox(scene, [2.35, 0.08, 0.08], [x, 1.22, -5.9], frameMaterial);
    addBox(scene, [0.07, 1.25, 0.08], [x - 1.17, 1.86, -5.9], frameMaterial);
    addBox(scene, [0.07, 1.25, 0.08], [x + 1.17, 1.86, -5.9], frameMaterial);

    if (index !== 0) {
      addBox(scene, [1.55, 0.78, 0.055], [x, 2.07, -5.86], blindMaterial);
    }
  });
}

function createFurniture(scene) {
  createDeskIsland(scene, -2.9, -0.8, 5.5, 1.65, 0);
  createDeskIsland(scene, 3.9, 0.9, 5.75, 1.65, 0);
  createDeskIsland(scene, 0.2, 5.25, 16, 0.62, 0);
  createRack(scene, -7.55, -3.3);
  createWhiteboard(scene);
  createShelving(scene);
  createBoxes(scene);
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
    addMonitor(group, i * 1.25, -depth * 0.28, 0.92);
    addKeyboard(group, i * 1.25, depth * 0.19, 0.84);
    addChair(group, i * 1.25, depth * 0.85);
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

function createRack(scene, x, z) {
  const dark = new THREE.MeshStandardMaterial({ color: "#2d353b", roughness: 0.48, metalness: 0.25 });
  const panel = new THREE.MeshStandardMaterial({ color: "#d9e0df", roughness: 0.44 });

  addBox(scene, [1.15, 2.15, 1.2], [x, 1.1, z], dark);
  for (let i = 0; i < 4; i += 1) {
    addBox(scene, [1.05, 0.35, 0.05], [x, 0.45 + i * 0.42, z + 0.62], panel);
  }
}

function createWhiteboard(scene) {
  const board = new THREE.MeshStandardMaterial({ color: "#eef2ef", roughness: 0.38 });
  const marker = new THREE.LineBasicMaterial({ color: "#46636c", linewidth: 2 });
  addBox(scene, [3.35, 1.25, 0.045], [6.95, 1.65, -5.82], board);

  for (let i = 0; i < 5; i += 1) {
    const points = [
      new THREE.Vector3(5.5 + i * 0.24, 1.4 + Math.sin(i) * 0.1, -5.78),
      new THREE.Vector3(5.9 + i * 0.28, 1.7 + Math.cos(i) * 0.1, -5.78),
      new THREE.Vector3(6.25 + i * 0.22, 1.45 + Math.sin(i * 1.7) * 0.12, -5.78),
    ];
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), marker));
  }
}

function createShelving(scene) {
  const shelfMaterial = new THREE.MeshStandardMaterial({ color: "#f1f2ee", roughness: 0.5 });
  const boxMaterial = new THREE.MeshStandardMaterial({ color: "#c8c0b6", roughness: 0.83 });

  addBox(scene, [3.2, 0.08, 0.42], [6.95, 2.44, -5.48], shelfMaterial);
  for (let i = 0; i < 5; i += 1) {
    addBox(scene, [0.44, 0.34, 0.34], [5.75 + i * 0.55, 2.67, -5.48], boxMaterial);
  }
}

function createBoxes(scene) {
  const cardboard = new THREE.MeshStandardMaterial({ color: "#b48a61", roughness: 0.9 });
  const plastic = new THREE.MeshStandardMaterial({
    color: "#d7edf0",
    transparent: true,
    opacity: 0.5,
    roughness: 0.25,
  });

  addBox(scene, [0.78, 0.64, 0.92], [-2.8, 0.32, 3.4], cardboard);
  addBox(scene, [0.9, 0.48, 0.6], [-1.6, 0.24, 3.9], plastic);
  addBox(scene, [1.0, 0.42, 0.8], [5.65, 0.21, 4.7], plastic);
  addBox(scene, [1.5, 0.55, 0.62], [7.45, 0.28, 2.7], cardboard);
}

async function createOfficePhoto(scene) {
  const fallback = makeOfficeFallback();
  const texture = await loadTextureOrFallback("/assets/office/open-office.jpg", fallback);
  const material = new THREE.MeshBasicMaterial({ map: texture, toneMapped: false });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.92), material);
  mesh.position.set(-6.85, 1.62, 5.82);
  mesh.rotation.y = Math.PI;
  scene.add(mesh);

  const frame = new THREE.MeshStandardMaterial({ color: "#20252a", roughness: 0.5 });
  addBox(scene, [3.55, 0.08, 0.08], [-6.85, 2.62, 5.78], frame);
  addBox(scene, [3.55, 0.08, 0.08], [-6.85, 0.62, 5.78], frame);
  addBox(scene, [0.08, 2.05, 0.08], [-8.65, 1.62, 5.78], frame);
  addBox(scene, [0.08, 2.05, 0.08], [-5.05, 1.62, 5.78], frame);
}

function addBox(parent, size, position, material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], size[2]), material);
  mesh.position.set(position[0], position[1], position[2]);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
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
