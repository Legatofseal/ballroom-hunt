import * as THREE from "three";
import "./styles.css";
import { createCharacters, registerCharacterHit, updateCharacters } from "./characters.js";
import { FirstPersonController } from "./controls.js";
import { Shooter } from "./shooter.js";
import { createOfficeWorld } from "./world.js";

const canvas = document.querySelector("#game");
const app = document.querySelector("#app");
const startButton = document.querySelector("#startButton");
const livesNode = document.querySelector("#lives");
const healthNode = document.querySelector("#health");
const scoreNode = document.querySelector("#score");
const hitsNode = document.querySelector("#hits");
const damageFlash = document.querySelector("#damageFlash");

const MAX_HEALTH = 100;
const MAX_LIVES = 3;
const PLAYER_START = new THREE.Vector3(0, 1.72, 4.25);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(74, window.innerWidth / window.innerHeight, 0.05, 80);
camera.position.copy(PLAYER_START);
scene.add(camera);

let score = 0;
let hits = 0;
let health = MAX_HEALTH;
let lives = MAX_LIVES;
let enemyHits = 0;
let invulnerableUntil = 0;
let controller;
let shooter;
let targets = [];
let worldState;
const previewMode = new URLSearchParams(window.location.search).has("preview");
let shotsFired = 0;

const clock = new THREE.Clock();

async function boot() {
  worldState = await createOfficeWorld(scene);
  targets = await createCharacters(scene);

  controller = new FirstPersonController(camera, canvas, {
    bounds: worldState.bounds,
    blockers: worldState.blockers,
    alwaysEnabled: previewMode,
    edgeLook: previewMode,
  });

  shooter = new Shooter(scene, camera, targets, (target) => {
    hits += 1;
    score += 10;
    hitsNode.textContent = String(hits);
    scoreNode.textContent = String(score);
    registerCharacterHit(target, clock.elapsedTime);
  });

  startButton.addEventListener("click", () => {
    controller.requestLock();
  });

  document.addEventListener("pointerlockchange", () => {
    const isLocked = document.pointerLockElement === canvas;
    if (!previewMode) {
      startButton.classList.toggle("is-hidden", isLocked);
    }
    app.classList.toggle("is-game-active", previewMode || isLocked);
  });

  if (previewMode) {
    startButton.classList.add("is-hidden");
    app.classList.add("is-game-active");
    const cameraForward = new THREE.Vector3();
    window.__officeWalkaboutDebug = {
      getCameraPosition: () => camera.position.toArray(),
      getCameraForward: () => camera.getWorldDirection(cameraForward).toArray(),
      getStats: () => ({ score, hits, health, lives, enemyHits, shotsFired }),
    };
  }

  window.addEventListener("mousedown", (event) => {
    const canFire = previewMode || document.pointerLockElement === canvas;
    if (canFire && event.button === 0) {
      shotsFired += 1;
      shooter.fire();
    }
  });

  window.addEventListener("resize", resize);

  renderer.setAnimationLoop(tick);
}

function tick() {
  const delta = Math.min(clock.getDelta(), 0.04);
  const elapsed = clock.elapsedTime;

  controller?.update(delta);
  shooter?.update(delta);
  updateCharacters(targets, elapsed, delta, {
    scene,
    playerPosition: camera.position,
    bounds: worldState?.bounds,
    blockers: worldState?.blockers,
    onPlayerHit,
  });

  renderer.render(scene, camera);
}

function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

function onPlayerHit(damage) {
  const elapsed = clock.elapsedTime;
  if (elapsed < invulnerableUntil) {
    return;
  }

  enemyHits += 1;
  health = Math.max(0, health - damage);
  flashDamage();

  if (health === 0) {
    loseLife(elapsed);
  } else {
    updateHud();
  }
}

function loseLife(elapsed) {
  lives -= 1;
  health = MAX_HEALTH;
  camera.position.copy(PLAYER_START);
  invulnerableUntil = elapsed + 1.25;

  if (lives <= 0) {
    lives = MAX_LIVES;
    score = 0;
    hits = 0;
    scoreNode.textContent = String(score);
    hitsNode.textContent = String(hits);
  }

  updateHud();
}

function updateHud() {
  livesNode.textContent = String(lives);
  healthNode.textContent = String(health);
}

function flashDamage() {
  damageFlash.classList.add("is-visible");
  window.setTimeout(() => damageFlash.classList.remove("is-visible"), 110);
}

boot();
