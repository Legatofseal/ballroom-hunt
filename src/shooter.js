import * as THREE from "three";

export class Shooter {
  constructor(scene, camera, targets, onHit) {
    this.scene = scene;
    this.camera = camera;
    this.targets = targets;
    this.onHit = onHit;
    this.raycaster = new THREE.Raycaster();
    this.tracers = [];
    this.audioContext = null;
    this.createBlaster();
  }

  fire() {
    this.raycaster.setFromCamera({ x: 0, y: 0 }, this.camera);
    const hit = this.raycaster.intersectObjects(this.targets, false)[0];
    const endPoint = new THREE.Vector3();

    if (hit) {
      endPoint.copy(hit.point);
      this.onHit(hit.object);
      this.playTone(620, 0.05);
    } else {
      this.raycaster.ray.at(18, endPoint);
      this.playTone(240, 0.035);
    }

    this.addTracer(endPoint);
    this.kickBlaster();
  }

  update(delta) {
    for (let i = this.tracers.length - 1; i >= 0; i -= 1) {
      const tracer = this.tracers[i];
      tracer.userData.life -= delta;
      tracer.material.opacity = Math.max(0, tracer.userData.life / 0.08);

      if (tracer.userData.life <= 0) {
        this.scene.remove(tracer);
        tracer.geometry.dispose();
        tracer.material.dispose();
        this.tracers.splice(i, 1);
      }
    }

    if (this.blaster) {
      this.blaster.position.lerp(this.blasterRest, Math.min(1, delta * 12));
      this.blaster.rotation.z = THREE.MathUtils.lerp(this.blaster.rotation.z, -0.08, Math.min(1, delta * 10));
    }
  }

  addTracer(endPoint) {
    const start = new THREE.Vector3(0.26, -0.22, -0.45).applyMatrix4(this.camera.matrixWorld);
    const geometry = new THREE.BufferGeometry().setFromPoints([start, endPoint]);
    const material = new THREE.LineBasicMaterial({
      color: "#fff4a7",
      transparent: true,
      opacity: 1,
    });
    const line = new THREE.Line(geometry, material);
    line.userData.life = 0.08;
    this.scene.add(line);
    this.tracers.push(line);
  }

  createBlaster() {
    this.blaster = new THREE.Group();
    this.blasterRest = new THREE.Vector3(0.32, -0.32, -0.64);
    this.blaster.position.copy(this.blasterRest);
    this.blaster.rotation.set(-0.05, -0.18, -0.08);

    const bodyMaterial = new THREE.MeshStandardMaterial({ color: "#ffcf33", roughness: 0.42 });
    const gripMaterial = new THREE.MeshStandardMaterial({ color: "#222a30", roughness: 0.54 });
    const tipMaterial = new THREE.MeshStandardMaterial({ color: "#f35f3d", roughness: 0.4 });

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.18, 0.52), bodyMaterial);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.34, 0.16), gripMaterial);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.38, 18), tipMaterial);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.z = -0.42;
    grip.position.set(0, -0.22, 0.1);

    this.blaster.add(body, grip, barrel);
    this.camera.add(this.blaster);
  }

  kickBlaster() {
    this.blaster.position.z += 0.08;
    this.blaster.position.y -= 0.025;
    this.blaster.rotation.z -= 0.1;
  }

  playTone(frequency, duration) {
    try {
      this.audioContext ??= new AudioContext();
      const oscillator = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      oscillator.frequency.value = frequency;
      oscillator.type = "square";
      gain.gain.setValueAtTime(0.03, this.audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);
      oscillator.connect(gain);
      gain.connect(this.audioContext.destination);
      oscillator.start();
      oscillator.stop(this.audioContext.currentTime + duration);
    } catch {
      // Audio is optional; browsers may block it until the page is focused.
    }
  }
}
