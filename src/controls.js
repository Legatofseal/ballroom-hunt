import * as THREE from "three";

const HALF_PI = Math.PI / 2;

export class FirstPersonController {
  constructor(camera, domElement, options = {}) {
    this.camera = camera;
    this.domElement = domElement;
    this.position = camera.position;
    this.yaw = 0;
    this.pitch = 0;
    this.enabled = options.alwaysEnabled ?? false;
    this.height = options.height ?? 1.72;
    this.radius = options.radius ?? 0.38;
    this.walkSpeed = options.walkSpeed ?? 4.2;
    this.sprintSpeed = options.sprintSpeed ?? 6.1;
    this.alwaysEnabled = options.alwaysEnabled ?? false;
    this.edgeLook = options.edgeLook ?? false;
    this.edgeYaw = 0;
    this.edgePitch = 0;
    this.edgeMargin = 34;
    this.touchStick = options.touchStick;
    this.touchKnob = options.touchKnob;
    this.touchMove = new THREE.Vector2();
    this.touchStickPointerId = null;
    this.touchStickRadius = 48;
    this.touchLookPointerId = null;
    this.touchLookX = 0;
    this.touchLookY = 0;
    this.bounds = options.bounds;
    this.blockers = options.blockers ?? [];
    this.keys = new Set();

    this.forward = new THREE.Vector3();
    this.right = new THREE.Vector3();
    this.move = new THREE.Vector3();
    this.nextPosition = new THREE.Vector3();

    this.onMouseMove = this.onMouseMove.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
    this.onPointerLockChange = this.onPointerLockChange.bind(this);
    this.onTouchStickDown = this.onTouchStickDown.bind(this);
    this.onTouchStickMove = this.onTouchStickMove.bind(this);
    this.onTouchStickEnd = this.onTouchStickEnd.bind(this);
    this.onTouchLookDown = this.onTouchLookDown.bind(this);
    this.onTouchLookMove = this.onTouchLookMove.bind(this);
    this.onTouchLookEnd = this.onTouchLookEnd.bind(this);

    document.addEventListener("mousemove", this.onMouseMove);
    document.addEventListener("keydown", this.onKeyDown);
    document.addEventListener("keyup", this.onKeyUp);
    document.addEventListener("pointerlockchange", this.onPointerLockChange);
    this.domElement.addEventListener("pointerdown", this.onTouchLookDown);
    this.domElement.addEventListener("pointermove", this.onTouchLookMove);
    this.domElement.addEventListener("pointerup", this.onTouchLookEnd);
    this.domElement.addEventListener("pointercancel", this.onTouchLookEnd);

    if (this.touchStick) {
      this.touchStick.addEventListener("pointerdown", this.onTouchStickDown);
      this.touchStick.addEventListener("pointermove", this.onTouchStickMove);
      this.touchStick.addEventListener("pointerup", this.onTouchStickEnd);
      this.touchStick.addEventListener("pointercancel", this.onTouchStickEnd);
    }
  }

  requestLock() {
    this.domElement.requestPointerLock();
  }

  enable() {
    this.enabled = true;
  }

  dispose() {
    document.removeEventListener("mousemove", this.onMouseMove);
    document.removeEventListener("keydown", this.onKeyDown);
    document.removeEventListener("keyup", this.onKeyUp);
    document.removeEventListener("pointerlockchange", this.onPointerLockChange);
    this.domElement.removeEventListener("pointerdown", this.onTouchLookDown);
    this.domElement.removeEventListener("pointermove", this.onTouchLookMove);
    this.domElement.removeEventListener("pointerup", this.onTouchLookEnd);
    this.domElement.removeEventListener("pointercancel", this.onTouchLookEnd);

    if (this.touchStick) {
      this.touchStick.removeEventListener("pointerdown", this.onTouchStickDown);
      this.touchStick.removeEventListener("pointermove", this.onTouchStickMove);
      this.touchStick.removeEventListener("pointerup", this.onTouchStickEnd);
      this.touchStick.removeEventListener("pointercancel", this.onTouchStickEnd);
    }
  }

  update(delta) {
    if (!this.enabled) {
      return;
    }

    this.updateEdgeLook(delta);

    this.camera.getWorldDirection(this.forward);
    this.forward.y = 0;
    this.forward.normalize();
    this.right.crossVectors(this.forward, this.camera.up).normalize();
    this.move.set(0, 0, 0);

    if (this.keys.has("KeyW")) this.move.add(this.forward);
    if (this.keys.has("KeyS")) this.move.sub(this.forward);
    if (this.keys.has("KeyA")) this.move.sub(this.right);
    if (this.keys.has("KeyD")) this.move.add(this.right);
    if (this.touchMove.y !== 0) this.move.addScaledVector(this.forward, this.touchMove.y);
    if (this.touchMove.x !== 0) this.move.addScaledVector(this.right, this.touchMove.x);

    if (this.move.lengthSq() === 0) {
      return;
    }

    const speed = this.keys.has("ShiftLeft") || this.keys.has("ShiftRight") ? this.sprintSpeed : this.walkSpeed;
    this.move.normalize().multiplyScalar(speed * delta);

    this.tryMoveAxis("x", this.move.x);
    this.tryMoveAxis("z", this.move.z);
  }

  tryMoveAxis(axis, amount) {
    if (amount === 0) return;

    this.nextPosition.copy(this.position);
    this.nextPosition[axis] += amount;

    if (this.isAllowed(this.nextPosition)) {
      this.position[axis] = this.nextPosition[axis];
    }
  }

  isAllowed(position) {
    if (this.bounds) {
      const minX = this.bounds.minX + this.radius;
      const maxX = this.bounds.maxX - this.radius;
      const minZ = this.bounds.minZ + this.radius;
      const maxZ = this.bounds.maxZ - this.radius;

      if (position.x < minX || position.x > maxX || position.z < minZ || position.z > maxZ) {
        return false;
      }
    }

    for (const blocker of this.blockers) {
      if (
        position.x > blocker.minX - this.radius &&
        position.x < blocker.maxX + this.radius &&
        position.z > blocker.minZ - this.radius &&
        position.z < blocker.maxZ + this.radius
      ) {
        return false;
      }
    }

    return true;
  }

  onMouseMove(event) {
    if (!this.enabled) {
      return;
    }

    if (this.edgeLook && document.pointerLockElement !== this.domElement) {
      this.updateEdgeIntent(event.clientX, event.clientY);
    }

    this.yaw -= event.movementX * 0.0023;
    this.pitch -= event.movementY * 0.002;
    this.applyRotation();
  }

  updateEdgeIntent(x, y) {
    const width = window.innerWidth || 1;
    const height = window.innerHeight || 1;
    this.edgeYaw = x >= width - this.edgeMargin ? -1 : x <= this.edgeMargin ? 1 : 0;
    this.edgePitch = y >= height - this.edgeMargin ? -1 : y <= this.edgeMargin ? 1 : 0;
  }

  updateEdgeLook(delta) {
    if (!this.edgeLook || document.pointerLockElement === this.domElement) {
      return;
    }

    if (this.edgeYaw === 0 && this.edgePitch === 0) {
      return;
    }

    this.yaw += this.edgeYaw * delta * 1.85;
    this.pitch += this.edgePitch * delta * 1.15;
    this.applyRotation();
  }

  applyRotation() {
    this.pitch = Math.max(-HALF_PI + 0.02, Math.min(HALF_PI - 0.02, this.pitch));
    this.camera.rotation.set(this.pitch, this.yaw, 0, "YXZ");
  }

  onKeyDown(event) {
    this.keys.add(event.code);
  }

  onKeyUp(event) {
    this.keys.delete(event.code);
  }

  onPointerLockChange() {
    this.enabled = this.alwaysEnabled || document.pointerLockElement === this.domElement;
  }

  onTouchStickDown(event) {
    if (event.pointerType !== "touch" && event.pointerType !== "pen") return;

    this.touchStickPointerId = event.pointerId;
    this.touchStick.setPointerCapture(event.pointerId);
    this.updateTouchStick(event);
    event.preventDefault();
  }

  onTouchStickMove(event) {
    if (event.pointerId !== this.touchStickPointerId) return;

    this.updateTouchStick(event);
    event.preventDefault();
  }

  onTouchStickEnd(event) {
    if (event.pointerId !== this.touchStickPointerId) return;

    this.touchStickPointerId = null;
    this.touchMove.set(0, 0);
    this.setTouchKnob(0, 0);
    event.preventDefault();
  }

  updateTouchStick(event) {
    const rect = this.touchStick.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const deltaX = event.clientX - centerX;
    const deltaY = event.clientY - centerY;
    const distance = Math.min(this.touchStickRadius, Math.hypot(deltaX, deltaY));
    const angle = Math.atan2(deltaY, deltaX);
    const knobX = Math.cos(angle) * distance;
    const knobY = Math.sin(angle) * distance;

    this.touchMove.set(knobX / this.touchStickRadius, -knobY / this.touchStickRadius);
    this.setTouchKnob(knobX, knobY);
  }

  setTouchKnob(x, y) {
    if (this.touchKnob) {
      this.touchKnob.style.transform = `translate(${x}px, ${y}px)`;
    }
  }

  onTouchLookDown(event) {
    if (event.pointerType !== "touch" && event.pointerType !== "pen") return;
    if (event.clientX < window.innerWidth * 0.42) return;

    this.touchLookPointerId = event.pointerId;
    this.touchLookX = event.clientX;
    this.touchLookY = event.clientY;
    this.domElement.setPointerCapture(event.pointerId);
    event.preventDefault();
  }

  onTouchLookMove(event) {
    if (event.pointerId !== this.touchLookPointerId) return;

    const deltaX = event.clientX - this.touchLookX;
    const deltaY = event.clientY - this.touchLookY;
    this.touchLookX = event.clientX;
    this.touchLookY = event.clientY;
    this.yaw -= deltaX * 0.006;
    this.pitch -= deltaY * 0.0052;
    this.applyRotation();
    event.preventDefault();
  }

  onTouchLookEnd(event) {
    if (event.pointerId === this.touchLookPointerId) {
      this.touchLookPointerId = null;
      event.preventDefault();
    }
  }
}
