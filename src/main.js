import * as THREE from "three";
import "./styles.css";
import { createCharacters, registerCharacterHit, updateCharacters } from "./characters.js";
import { FirstPersonController } from "./controls.js";
import { Shooter } from "./shooter.js";
import { createOfficeWorld } from "./world.js";

const canvas = document.querySelector("#game");
const app = document.querySelector("#app");
const startButton = document.querySelector("#startButton");
const scoreNode = document.querySelector("#score");
const hitsNode = document.querySelector("#hits");

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
camera.position.set(0, 1.72, 4.25);
scene.add(camera);

let score = 0;
let hits = 0;
let controller;
let shooter;
let targets = [];
const previewMode = new URLSearchParams(window.location.search).has("preview");
let shotsFired = 0;

const clock = new THREE.Clock();

async function boot() {
  const world = await createOfficeWorld(scene);
  targets = await createCharacters(scene);

  controller = new FirstPersonController(camera, canvas, {
    bounds: world.bounds,
    blockers: world.blockers,
    alwaysEnabled: previewMode,
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
    window.__officeWalkaboutDebug = {
      getCameraPosition: () => camera.position.toArray(),
      getStats: () => ({ score, hits, shotsFired }),
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
  updateCharacters(targets, elapsed);

  renderer.render(scene, camera);
}

function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

boot();
