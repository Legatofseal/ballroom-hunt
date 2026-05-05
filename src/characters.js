import * as THREE from "three";
import { fetchJson, loadTextureOrFallback, makeCharacterFallback } from "./assetTextures.js";

const enemyProjectiles = [];
const projectileGeometry = new THREE.SphereGeometry(0.07, 12, 12);
const projectileMaterial = new THREE.MeshStandardMaterial({
  color: "#ff5b3d",
  emissive: "#ff2c16",
  emissiveIntensity: 2.4,
  roughness: 0.18,
});
const RESPAWN_DELAY = 2.8;
const DEFAULT_HEALTH = 3;
const DEFAULT_DAMAGE = 10;
const DEFAULT_KILL_BONUS = 50;

const DEFAULT_CHARACTERS = [
  {
    id: "character-1",
    displayName: "Main person 1",
    src: "/assets/characters/main-person.jpg",
    position: [-4.7, 0, -5.25],
    scale: [1.25, 2.25],
    rotateY: 0.75,
    textureRotation: 0,
    color: "#c96b48",
  },
  {
    id: "character-2",
    displayName: "Main person 2",
    src: "/assets/characters/main-person.jpg",
    position: [4.8, 0, -4.65],
    scale: [1.25, 2.25],
    rotateY: -0.65,
    textureRotation: 0,
    color: "#c96b48",
  },
  {
    id: "character-3",
    displayName: "Main person 3",
    src: "/assets/characters/main-person.jpg",
    position: [0.15, 0, 0.15],
    scale: [1.25, 2.25],
    rotateY: 2.25,
    textureRotation: 0,
    color: "#c96b48",
  },
  {
    id: "lizard-character-1",
    type: "lizard",
    displayName: "Lizard person 1",
    src: "/assets/characters/lizard-person.jpg",
    position: [1.0, 0, -4.95],
    scale: [1.28, 2.35],
    rotateY: 0.2,
    textureRotation: 0,
    color: "#7d4739",
    health: 4,
    speed: 1.18,
    damage: 15,
    scoreBonus: 80,
    projectileColor: "#ffd35a",
  },
  {
    id: "lizard-character-2",
    type: "lizard",
    displayName: "Lizard person 2",
    src: "/assets/characters/lizard-person.jpg",
    position: [6.25, 0, -5.15],
    scale: [1.28, 2.35],
    rotateY: -0.55,
    textureRotation: 0,
    color: "#7d4739",
    health: 4,
    speed: 1.14,
    damage: 15,
    scoreBonus: 80,
    projectileColor: "#ffd35a",
  },
];

export async function createCharacters(scene) {
  const configs = await fetchJson("/assets/characters/manifest.json", DEFAULT_CHARACTERS);
  const targets = [];

  for (const [index, config] of configs.entries()) {
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
    standee.userData.ai = {
      destination: null,
      nextTargetAt: 0,
      nextShotAt: 1.2 + index * 0.55,
      speed: config.speed ?? 1.35 + index * 0.16,
      radius: config.radius ?? 0.56,
      damage: config.damage ?? DEFAULT_DAMAGE,
      projectileColor: config.projectileColor ?? "#ff5b3d",
    };

    const panel = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
    panel.position.y = height / 2;
    panel.castShadow = true;
    panel.userData.target = true;
    panel.userData.type = config.type ?? "basic";
    panel.userData.maxHealth = config.health ?? DEFAULT_HEALTH;
    panel.userData.health = panel.userData.maxHealth;
    panel.userData.dead = false;
    panel.userData.respawnAt = 0;
    panel.userData.scoreBonus = config.scoreBonus ?? DEFAULT_KILL_BONUS;
    panel.userData.id = config.id;
    panel.userData.displayName = config.displayName;
    panel.userData.root = standee;
    panel.userData.ai = standee.userData.ai;
    standee.add(panel);

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(width * 0.38, width * 0.44, 0.08, 24),
      new THREE.MeshStandardMaterial({ color: config.baseColor ?? "#252b30", roughness: 0.54, metalness: 0.2 }),
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

export function updateCharacters(targets, elapsed, delta = 0, options = {}) {
  updateEnemyProjectiles(delta, options);

  for (const target of targets) {
    const root = target.userData.root;
    const ai = target.userData.ai;

    if (target.userData.dead) {
      if (elapsed >= target.userData.respawnAt) {
        respawnCharacter(target, elapsed, options);
      }
      continue;
    }

    const hitUntil = target.userData.hitUntil ?? 0;
    const recovering = hitUntil > elapsed;
    target.material.emissive = target.material.emissive ?? new THREE.Color("#000000");
    target.material.emissive.set(recovering ? "#ffffff" : "#000000");
    target.material.emissiveIntensity = recovering ? 0.25 : 0;

    runEnemyAi(root, target, ai, elapsed, delta, options);

    const wobble = recovering ? Math.sin(elapsed * 34) * 0.1 : Math.sin(elapsed * 1.4 + root.position.x) * 0.018;
    root.rotation.z = wobble;
  }
}

export function registerCharacterHit(target, elapsed) {
  if (target.userData.dead) {
    return false;
  }

  target.userData.health -= 1;
  target.userData.hitUntil = elapsed + 0.16;

  if (target.userData.health <= 0) {
    killCharacter(target, elapsed);
    return true;
  }

  return false;
}

function killCharacter(target, elapsed) {
  const root = target.userData.root;
  const ai = target.userData.ai;

  target.userData.dead = true;
  target.userData.respawnAt = elapsed + RESPAWN_DELAY + Math.random() * 1.2;
  root.visible = false;
  root.rotation.z = 0;

  if (ai) {
    ai.destination = null;
    ai.nextShotAt = target.userData.respawnAt + 0.8;
  }
}

function respawnCharacter(target, elapsed, options = {}) {
  const root = target.userData.root;
  const ai = target.userData.ai;
  const radius = ai?.radius ?? 0.55;
  const spawnPosition = options.bounds
    ? pickDestination(root.position, options.bounds, options.blockers, radius)
    : root.position.clone();

  root.position.set(spawnPosition.x, 0, spawnPosition.z);
  root.visible = true;
  root.rotation.z = 0;

  target.userData.dead = false;
  target.userData.health = target.userData.maxHealth ?? DEFAULT_HEALTH;
  target.userData.hitUntil = elapsed + 0.2;

  if (ai) {
    ai.destination = options.bounds ? pickDestination(root.position, options.bounds, options.blockers, radius) : null;
    ai.nextTargetAt = elapsed + 1.5;
    ai.nextShotAt = elapsed + 1.4 + Math.random() * 1.4;
  }
}

function runEnemyAi(root, target, ai, elapsed, delta, options) {
  if (!delta || !options.bounds) return;

  const playerPosition = options.playerPosition;
  const playerDistance = playerPosition ? root.position.distanceTo(playerPosition) : Infinity;
  const canShoot = playerPosition && playerDistance < 9.5 && playerDistance > 1.35;

  if (!ai.destination || elapsed > ai.nextTargetAt || root.position.distanceTo(ai.destination) < 0.35) {
    ai.destination = pickDestination(root.position, options.bounds, options.blockers, ai.radius);
    ai.nextTargetAt = elapsed + 2.4 + Math.random() * 2.8;
  }

  if (ai.destination) {
    const direction = ai.destination.clone().sub(root.position);
    direction.y = 0;

    if (direction.lengthSq() > 0.01) {
      direction.normalize();
      const nextPosition = root.position.clone().addScaledVector(direction, ai.speed * delta);

      if (isAllowed(nextPosition, options.bounds, options.blockers, ai.radius)) {
        root.position.copy(nextPosition);
      } else {
        ai.destination = pickDestination(root.position, options.bounds, options.blockers, ai.radius);
      }
    }
  }

  if (playerPosition && playerDistance < 11) {
    const lookDirection = playerPosition.clone().sub(root.position);
    root.rotation.y = Math.atan2(lookDirection.x, lookDirection.z);
  } else if (ai.destination) {
    const moveDirection = ai.destination.clone().sub(root.position);
    root.rotation.y = Math.atan2(moveDirection.x, moveDirection.z);
  }

  if (canShoot && elapsed > ai.nextShotAt) {
    fireEnemyProjectile(root, target, playerPosition, options.scene);
    ai.nextShotAt = elapsed + 1.15 + Math.random() * 1.25;
    target.userData.hitUntil = Math.max(target.userData.hitUntil ?? 0, elapsed + 0.08);
  }
}

function pickDestination(currentPosition, bounds, blockers = [], radius = 0.55) {
  for (let attempt = 0; attempt < 24; attempt += 1) {
    const candidate = new THREE.Vector3(
      THREE.MathUtils.lerp(bounds.minX + radius, bounds.maxX - radius, Math.random()),
      0,
      THREE.MathUtils.lerp(bounds.minZ + radius, bounds.maxZ - radius, Math.random()),
    );

    if (candidate.distanceTo(currentPosition) < 2.2) continue;
    if (isAllowed(candidate, bounds, blockers, radius)) return candidate;
  }

  return currentPosition.clone();
}

function isAllowed(position, bounds, blockers = [], radius = 0.55) {
  if (
    position.x < bounds.minX + radius ||
    position.x > bounds.maxX - radius ||
    position.z < bounds.minZ + radius ||
    position.z > bounds.maxZ - radius
  ) {
    return false;
  }

  return !blockers.some(
    (blocker) =>
      position.x > blocker.minX - radius &&
      position.x < blocker.maxX + radius &&
      position.z > blocker.minZ - radius &&
      position.z < blocker.maxZ + radius,
  );
}

function fireEnemyProjectile(root, target, playerPosition, scene) {
  if (!scene) return;

  const start = root.position.clone();
  start.y = 1.35;
  const aimPoint = playerPosition.clone();
  aimPoint.y = 1.28;

  const direction = aimPoint.sub(start).normalize();
  direction.x += (Math.random() - 0.5) * 0.08;
  direction.z += (Math.random() - 0.5) * 0.08;
  direction.normalize();

  const projectile = new THREE.Mesh(projectileGeometry, projectileMaterial.clone());
  projectile.material.color.set(target.userData.ai.projectileColor ?? "#ff5b3d");
  projectile.material.emissive.set(target.userData.ai.projectileColor ?? "#ff2c16");
  projectile.position.copy(start).addScaledVector(direction, 0.35);
  projectile.userData.velocity = direction.multiplyScalar(6.2);
  projectile.userData.life = 2.1;
  projectile.userData.damage = target.userData.ai.damage ?? DEFAULT_DAMAGE;
  projectile.userData.owner = target.userData.id;
  scene.add(projectile);
  enemyProjectiles.push(projectile);
}

function updateEnemyProjectiles(delta, options) {
  if (!delta) return;

  const playerPosition = options.playerPosition;
  const playerChest = playerPosition?.clone();
  if (playerChest) playerChest.y = 1.24;

  for (let i = enemyProjectiles.length - 1; i >= 0; i -= 1) {
    const projectile = enemyProjectiles[i];
    projectile.position.addScaledVector(projectile.userData.velocity, delta);
    projectile.userData.life -= delta;

    const hitPlayer = playerChest && projectile.position.distanceTo(playerChest) < 0.48;
    if (hitPlayer) {
      options.onPlayerHit?.(projectile.userData.damage);
    }

    if (hitPlayer || projectile.userData.life <= 0 || projectile.position.y < 0.2) {
      options.scene?.remove(projectile);
      projectile.material.dispose();
      enemyProjectiles.splice(i, 1);
    }
  }
}
