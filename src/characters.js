import * as THREE from "three";
import { fetchJson, loadTextureOrFallback, makeCharacterFallback } from "./assetTextures.js";

const DEFAULT_CHARACTERS = [
  {
    id: "character-1",
    displayName: "Main person 1",
    src: "/assets/characters/main-person.jpg",
    position: [-4.2, 0, -2.8],
    scale: [1.25, 2.25],
    rotateY: 0.75,
    textureRotation: 0,
    color: "#c96b48",
  },
  {
    id: "character-2",
    displayName: "Main person 2",
    src: "/assets/characters/main-person.jpg",
    position: [4.3, 0, -2.4],
    scale: [1.25, 2.25],
    rotateY: -0.65,
    textureRotation: 0,
    color: "#c96b48",
  },
  {
    id: "character-3",
    displayName: "Main person 3",
    src: "/assets/characters/main-person.jpg",
    position: [-5.6, 0, 2.85],
    scale: [1.25, 2.25],
    rotateY: 2.25,
    textureRotation: 0,
    color: "#c96b48",
  },
];

export async function createCharacters(scene) {
  const configs = await fetchJson("/assets/characters/manifest.json", DEFAULT_CHARACTERS);
  const targets = [];

  for (const config of configs) {
    const texture = await loadTextureOrFallback(
      config.src,
      makeCharacterFallback(config.displayName, config.color),
      { rotation: config.textureRotation ?? 0 },
    );

    const width = config.scale?.[0] ?? 1.2;
    const height = config.scale?.[1] ?? 2.2;
    const material = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.5,
      metalness: 0,
      transparent: false,
      side: THREE.DoubleSide,
    });

    const standee = new THREE.Group();
    standee.position.set(config.position[0], config.position[1], config.position[2]);
    standee.rotation.y = config.rotateY ?? 0;

    const panel = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
    panel.position.y = height / 2;
    panel.castShadow = true;
    panel.userData.target = true;
    panel.userData.health = 3;
    panel.userData.id = config.id;
    panel.userData.displayName = config.displayName;
    panel.userData.root = standee;
    standee.add(panel);

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(width * 0.38, width * 0.44, 0.08, 24),
      new THREE.MeshStandardMaterial({ color: "#252b30", roughness: 0.54, metalness: 0.2 }),
    );
    base.position.y = 0.04;
    base.castShadow = true;
    base.receiveShadow = true;
    standee.add(base);

    scene.add(standee);
    targets.push(panel);
  }

  return targets;
}

export function updateCharacters(targets, elapsed) {
  for (const target of targets) {
    const root = target.userData.root;
    const hitUntil = target.userData.hitUntil ?? 0;
    const recovering = hitUntil > elapsed;
    target.material.emissive = target.material.emissive ?? new THREE.Color("#000000");
    target.material.emissive.set(recovering ? "#ffffff" : "#000000");
    target.material.emissiveIntensity = recovering ? 0.25 : 0;

    const wobble = recovering ? Math.sin(elapsed * 34) * 0.1 : Math.sin(elapsed * 1.4 + root.position.x) * 0.018;
    root.rotation.z = wobble;
  }
}

export function registerCharacterHit(target, elapsed) {
  target.userData.health -= 1;
  target.userData.hitUntil = elapsed + 0.16;

  if (target.userData.health <= 0) {
    target.userData.health = 3;
    target.userData.root.rotation.y += Math.PI;
    target.userData.root.position.x += Math.sin(elapsed * 3.1) * 0.28;
  }
}
