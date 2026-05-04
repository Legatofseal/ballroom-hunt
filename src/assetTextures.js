import * as THREE from "three";

const textureLoader = new THREE.TextureLoader();

export async function fetchJson(url, fallback) {
  try {
    const response = await fetch(url, { cache: "no-cache" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  } catch {
    return fallback;
  }
}

export function loadTextureOrFallback(url, fallbackTexture, options = {}) {
  return new Promise((resolve) => {
    textureLoader.load(
      url,
      (texture) => {
        configureTexture(texture, options);
        resolve(texture);
      },
      undefined,
      () => resolve(fallbackTexture),
    );
  });
}

export function configureTexture(texture, options = {}) {
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = options.anisotropy ?? 6;
  texture.wrapS = options.wrapS ?? THREE.ClampToEdgeWrapping;
  texture.wrapT = options.wrapT ?? THREE.ClampToEdgeWrapping;

  if (options.repeat) {
    texture.repeat.set(options.repeat[0], options.repeat[1]);
  }

  if (options.rotation) {
    texture.center.set(0.5, 0.5);
    texture.rotation = THREE.MathUtils.degToRad(options.rotation);
  }

  texture.needsUpdate = true;
}

export function makeCanvasTexture(draw, width = 512, height = 512) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  draw(context, width, height);

  const texture = new THREE.CanvasTexture(canvas);
  configureTexture(texture, { anisotropy: 4 });
  return texture;
}

export function makeWoodTexture() {
  return makeCanvasTexture((context, width, height) => {
    context.fillStyle = "#76543a";
    context.fillRect(0, 0, width, height);

    for (let y = 0; y < height; y += 64) {
      const light = y % 128 === 0 ? "#8c6747" : "#674930";
      context.fillStyle = light;
      context.fillRect(0, y, width, 58);
      context.strokeStyle = "rgba(35, 22, 13, 0.42)";
      context.lineWidth = 3;
      context.strokeRect(0, y, width, 58);
    }

    for (let x = -80; x < width + 120; x += 120) {
      context.strokeStyle = "rgba(255, 231, 189, 0.09)";
      context.lineWidth = 7;
      context.beginPath();
      context.moveTo(x, 0);
      context.bezierCurveTo(x + 40, height * 0.26, x - 20, height * 0.62, x + 55, height);
      context.stroke();
    }

    for (let i = 0; i < 700; i += 1) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      context.fillStyle = `rgba(30, 18, 9, ${Math.random() * 0.14})`;
      context.fillRect(x, y, 2 + Math.random() * 7, 1);
    }
  });
}

export function makeCharacterFallback(label, accent = "#ffd54f") {
  return makeCanvasTexture((context, width, height) => {
    const gradient = context.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, "#f5f7fa");
    gradient.addColorStop(0.48, accent);
    gradient.addColorStop(1, "#23272d");
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);

    context.fillStyle = "rgba(255, 255, 255, 0.76)";
    context.beginPath();
    context.arc(width / 2, height * 0.3, width * 0.18, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = "rgba(20, 25, 31, 0.84)";
    context.fillRect(width * 0.31, height * 0.46, width * 0.38, height * 0.34);

    context.fillStyle = "#111820";
    context.font = "700 42px system-ui, sans-serif";
    context.textAlign = "center";
    context.fillText(label, width / 2, height * 0.9);
  }, 512, 768);
}

export function makeOfficeFallback() {
  return makeCanvasTexture((context, width, height) => {
    context.fillStyle = "#b8c9d6";
    context.fillRect(0, 0, width, height);

    context.fillStyle = "#f2f4f1";
    context.fillRect(0, height * 0.5, width, height * 0.26);

    context.fillStyle = "#6e7a82";
    for (let x = 40; x < width; x += 210) {
      context.fillRect(x, height * 0.22, 130, 170);
      context.fillStyle = "#e9f7ff";
      context.fillRect(x + 12, height * 0.24, 106, 94);
      context.fillStyle = "#6e7a82";
    }

    context.fillStyle = "#6f5137";
    context.fillRect(0, height * 0.75, width, height * 0.25);

    context.fillStyle = "#1e252d";
    context.font = "700 42px system-ui, sans-serif";
    context.textAlign = "center";
    context.fillText("Office photo", width / 2, height * 0.88);
  }, 1024, 576);
}
