import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { motion, AnimatePresence } from "framer-motion";
import ballroomBackground from "./assets/ballroom-reference.png";
import "./styles.css";

const ROUND_TIME = 50;
const MAX_MISSES = 8;
const MAX_AMMO = 6;
const STAGE_W = 900;
const STAGE_H = 540;

const SPOTS = [
  { id: "plant", x: 214, y: 402, lean: -18, scale: 1.05 },
  { id: "table", x: 382, y: 246, lean: 14, scale: 0.82 },
  { id: "sofa", x: 620, y: 254, lean: -7, scale: 0.9 },
  { id: "window", x: 754, y: 220, lean: 0, scale: 0.74 },
  { id: "pillar", x: 836, y: 286, lean: -15, scale: 0.95 },
];

const CROSSHAIRS = [
  { id: "classic", name: "Classic" },
  { id: "dot", name: "Dot" },
  { id: "circle", name: "Circle" },
  { id: "star", name: "Star" },
  { id: "square", name: "Square" },
];

function pickSpot(previousId) {
  const pool = SPOTS.filter((s) => s.id !== previousId);
  return pool[Math.floor(Math.random() * pool.length)];
}

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function makeTone(type) {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === "shot") {
      osc.type = "square";
      osc.frequency.setValueAtTime(110, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(45, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.16, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      osc.start();
      osc.stop(ctx.currentTime + 0.11);
    }

    if (type === "hit") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(520, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(980, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    }

    if (type === "tomato") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(260, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.18);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.start();
      osc.stop(ctx.currentTime + 0.21);
    }
  } catch {
    // Audio is optional. Some browsers block WebAudio until the first user gesture.
  }
}

function HudBox({ title, value, className = "" }) {
  return (
    <div className={`hud-box ${className}`}>
      <div className="hud-title">{title}</div>
      <div className="hud-value">{value}</div>
    </div>
  );
}

function Ammo({ ammo }) {
  return (
    <div className="ammo-box">
      {Array.from({ length: MAX_AMMO }).map((_, i) => (
        <div key={i} className={`shell ${i < ammo ? "full" : "empty"}`}>
          <div className="shell-cap" />
        </div>
      ))}
    </div>
  );
}

function Misses({ misses }) {
  return (
    <div className="miss-box">
      <div className="hud-title orange">MISSES</div>
      <div className="miss-row">
        {Array.from({ length: 3 }).map((_, i) => (
          <span key={i} className={i < Math.ceil(misses / 3) ? "miss-on" : "miss-off"}>
            ×
          </span>
        ))}
      </div>
    </div>
  );
}

function Crosshair({ pos, type }) {
  return <div className={`crosshair crosshair-${type}`} style={{ left: pos.x, top: pos.y }} />;
}

function CrosshairPicker({ selected, onSelect }) {
  return (
    <div className="picker">
      <div className="picker-title">AIM</div>
      <div className="picker-row">
        {CROSSHAIRS.map((c) => (
          <button
            key={c.id}
            className={`picker-button ${selected === c.id ? "active" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(c.id);
            }}
            title={c.name}
          >
            <span className={`picker-preview crosshair-${c.id}`} />
          </button>
        ))}
      </div>
    </div>
  );
}

function Shotgun({ recoil }) {
  return (
    <motion.div
      className="shotgun"
      animate={{ y: recoil ? 18 : 0, rotate: recoil ? -2 : 0 }}
      transition={{ duration: 0.08 }}
    >
      <div className="hand" />
      <div className="barrel barrel-left" />
      <div className="barrel barrel-right" />
      <div className="stock" />
    </motion.div>
  );
}

function ParodyTarget({ target, onHit }) {
  if (!target.visible) return null;

  return (
    <motion.button
      className="target"
      style={{ left: target.x, top: target.y, scale: target.scale }}
      initial={{ opacity: 0, y: 38, rotate: target.lean }}
      animate={{ opacity: 1, y: 0, rotate: target.lean }}
      exit={{ opacity: 0, y: 42, rotate: target.lean }}
      transition={{ type: "spring", stiffness: 380, damping: 22 }}
      onClick={(e) => {
        e.stopPropagation();
        onHit();
      }}
      aria-label="Cartoon parody target"
    >
      <div className="target-body" />
      <div className="target-arm arm-left" />
      <div className="target-arm arm-right" />
      <div className="target-head">
        <div className="hair hair-main" />
        <div className="hair hair-front" />
        <div className="glasses left" />
        <div className="glasses right" />
        <div className="eye eye-left" />
        <div className="eye eye-right" />
        <div className="nose" />
        <div className="mouth" />
      </div>
      <div className="tie" />
    </motion.button>
  );
}

function Tomato({ tomato, onClick }) {
  return (
    <button
      className="tomato"
      style={{ left: tomato.x, top: tomato.y, scale: tomato.scale }}
      onClick={(e) => {
        e.stopPropagation();
        onClick(tomato.id);
      }}
      aria-label="incoming tomato"
    >
      <span className="tomato-leaf" />
    </button>
  );
}

function Splat({ splat }) {
  return (
    <motion.div
      className={splat.kind === "tomato" ? "tomato-splat" : "splat"}
      style={{ left: splat.x, top: splat.y }}
      initial={{ scale: 0.2, opacity: 0.9 }}
      animate={{ scale: 1.45, opacity: 0 }}
      transition={{ duration: 0.6 }}
    />
  );
}

function MuzzleFlash({ flash }) {
  return <AnimatePresence>{flash && <motion.div className="muzzle-flash" initial={{ opacity: 0, scale: 0.4 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.5 }} transition={{ duration: 0.1 }} />}</AnimatePresence>;
}

function ScreenFlash({ active }) {
  return <AnimatePresence>{active && <motion.div className="screen-flash" initial={{ opacity: 0.9 }} animate={{ opacity: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} />}</AnimatePresence>;
}

function StartOverlay({ running, score, message, onStart }) {
  if (running) return null;
  return (
    <div className="overlay">
      <div className="panel">
        <h1>Ballroom Hunt</h1>
        <p>{message}</p>
        <p className="small">Score: {score}</p>
        <button onClick={onStart}>PLAY</button>
      </div>
    </div>
  );
}

function App() {
  const [running, setRunning] = useState(false);
  const [score, setScore] = useState(0);
  const [time, setTime] = useState(ROUND_TIME);
  const [misses, setMisses] = useState(0);
  const [ammo, setAmmo] = useState(MAX_AMMO);
  const [streak, setStreak] = useState(0);
  const [message, setMessage] = useState("Click PLAY and hit the cartoon parody targets as fast as possible.");
  const [target, setTarget] = useState({ visible: false, x: 0, y: 0, id: null, born: 0, lean: 0, scale: 1 });
  const [splatters, setSplatters] = useState([]);
  const [tomatoes, setTomatoes] = useState([]);
  const [mouse, setMouse] = useState({ x: 450, y: 270 });
  const [crosshair, setCrosshair] = useState("classic");
  const [recoil, setRecoil] = useState(false);
  const [flash, setFlash] = useState(false);
  const [hitFlash, setHitFlash] = useState(false);

  const spawnTimer = useRef(null);
  const hideTimer = useRef(null);
  const reloadTimer = useRef(null);
  const tomatoTimer = useRef(null);
  const raf = useRef(null);
  const lastFrame = useRef(0);
  const targetRef = useRef(target);
  const mouseRef = useRef(mouse);

  const level = useMemo(() => Math.min(9, 1 + Math.floor(score / 12)), [score]);

  useEffect(() => {
    targetRef.current = target;
  }, [target]);

  useEffect(() => {
    mouseRef.current = mouse;
  }, [mouse]);

  const clearGameTimers = () => {
    clearTimeout(spawnTimer.current);
    clearTimeout(hideTimer.current);
    clearTimeout(reloadTimer.current);
    clearTimeout(tomatoTimer.current);
    cancelAnimationFrame(raf.current);
  };

  const spawnTomato = () => {
    const t = targetRef.current;
    if (!running || !t.visible) return;

    const aim = mouseRef.current;
    const dx = aim.x - t.x;
    const dy = aim.y - t.y;
    const len = Math.max(1, Math.sqrt(dx * dx + dy * dy));
    const speed = 220 + level * 28;

    makeTone("tomato");
    setTomatoes((old) => [
      ...old.slice(-5),
      {
        id: crypto.randomUUID(),
        x: t.x,
        y: t.y + 12,
        vx: (dx / len) * speed,
        vy: (dy / len) * speed,
        scale: 0.65,
      },
    ]);
  };

  const scheduleTomato = () => {
    clearTimeout(tomatoTimer.current);
    tomatoTimer.current = setTimeout(() => {
      spawnTomato();
      scheduleTomato();
    }, Math.max(520, 1200 - level * 80));
  };

  const spawn = (previousId = targetRef.current.id) => {
    if (!running) return;
    const spot = pickSpot(previousId);
    const ttl = Math.max(1000, 1950 - level * 90);

    setTarget({
      visible: true,
      x: spot.x + rand(-14, 14),
      y: spot.y + rand(-10, 10),
      id: spot.id,
      born: performance.now(),
      lean: spot.lean + rand(-4, 4),
      scale: spot.scale,
    });

    scheduleTomato();

    hideTimer.current = setTimeout(() => {
      setTarget((t) => ({ ...t, visible: false }));
      clearTimeout(tomatoTimer.current);
      setMisses((m) => m + 1);
      setStreak(0);
      setMessage("Too slow — he ducked away.");
      spawnTimer.current = setTimeout(() => spawn(spot.id), Math.max(520, 1000 - level * 50));
    }, ttl);
  };

  const start = () => {
    clearGameTimers();
    setScore(0);
    setTime(ROUND_TIME);
    setMisses(0);
    setAmmo(MAX_AMMO);
    setStreak(0);
    setSplatters([]);
    setTomatoes([]);
    setTarget({ visible: false, x: 0, y: 0, id: null, born: 0, lean: 0, scale: 1 });
    setMessage("Fast hits give bonus points. Shoot incoming tomatoes before they splat you.");
    setRunning(true);
  };

  const stop = (text) => {
    clearGameTimers();
    setRunning(false);
    setTarget((t) => ({ ...t, visible: false }));
    setTomatoes([]);
    setMessage(text);
  };

  const shootVisual = () => {
    setRecoil(true);
    setFlash(true);
    makeTone("shot");
    setTimeout(() => setRecoil(false), 95);
    setTimeout(() => setFlash(false), 85);
  };

  const reload = () => {
    setMessage("Reloading...");
    reloadTimer.current = setTimeout(() => {
      setAmmo(MAX_AMMO);
      setMessage("Reloaded.");
    }, 750);
  };

  const consumeAmmo = () => {
    let hadAmmo = true;
    setAmmo((a) => {
      if (a <= 0) {
        hadAmmo = false;
        return 0;
      }
      const next = a - 1;
      if (next === 0) reload();
      return next;
    });
    return hadAmmo;
  };

  const hit = () => {
    if (!running || !target.visible) return;
    if (!consumeAmmo()) return;
    shootVisual();
    makeTone("hit");

    clearTimeout(hideTimer.current);
    clearTimeout(tomatoTimer.current);
    const reaction = performance.now() - target.born;
    const speedBonus = reaction < 380 ? 3 : reaction < 750 ? 2 : 1;
    const comboBonus = streak >= 4 ? 2 : streak >= 2 ? 1 : 0;
    const gained = speedBonus + comboBonus;

    setScore((s) => s + gained * 100);
    setStreak((s) => s + 1);
    setMessage(`HIT +${gained * 100}`);
    setSplatters((old) => [...old.slice(-8), { id: crypto.randomUUID(), x: target.x, y: target.y, kind: "target" }]);
    setTarget((t) => ({ ...t, visible: false }));
    spawnTimer.current = setTimeout(() => spawn(target.id), Math.max(420, 820 - level * 42));
  };

  const hitTomato = (id) => {
    if (!running) return;
    if (!consumeAmmo()) return;
    shootVisual();
    makeTone("hit");
    setTomatoes((old) => {
      const tomato = old.find((x) => x.id === id);
      if (tomato) {
        setSplatters((splats) => [...splats.slice(-8), { id: crypto.randomUUID(), x: tomato.x, y: tomato.y, kind: "tomato" }]);
        setScore((s) => s + 50);
        setMessage("Tomato blocked +50");
      }
      return old.filter((x) => x.id !== id);
    });
  };

  const miss = () => {
    if (!running) return;
    if (!consumeAmmo()) {
      setMessage("No ammo — wait for reload.");
      return;
    }
    shootVisual();
    setMisses((m) => m + 1);
    setStreak(0);
    setMessage("MISS");
  };

  useEffect(() => {
    if (!running) return;
    spawnTimer.current = setTimeout(() => spawn(null), 850);
    return clearGameTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  useEffect(() => {
    if (!running) return;
    const tick = (ts) => {
      if (!lastFrame.current) lastFrame.current = ts;
      const dt = Math.min(0.035, (ts - lastFrame.current) / 1000);
      lastFrame.current = ts;
      const aim = mouseRef.current;
      let gotHit = false;

      setTomatoes((old) => {
        const next = [];
        for (const p of old) {
          const nx = p.x + p.vx * dt;
          const ny = p.y + p.vy * dt;
          const ns = clamp(p.scale + dt * 1.3, 0.65, 1.25);
          const dx = nx - aim.x;
          const dy = ny - aim.y;
          const collidesWithAim = Math.sqrt(dx * dx + dy * dy) < 34;
          const out = nx < -80 || nx > STAGE_W + 80 || ny < -80 || ny > STAGE_H + 80;

          if (collidesWithAim) {
            gotHit = true;
            setSplatters((splats) => [...splats.slice(-8), { id: crypto.randomUUID(), x: nx, y: ny, kind: "tomato" }]);
          } else if (!out) {
            next.push({ ...p, x: nx, y: ny, scale: ns });
          }
        }
        return next;
      });

      if (gotHit) {
        setHitFlash(true);
        setTimeout(() => setHitFlash(false), 180);
        setMisses((m) => m + 1);
        setStreak(0);
        setMessage("Tomato hit you!");
      }

      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [running]);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setTime((t) => {
        if (t <= 1) {
          stop("Time is up.");
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  useEffect(() => {
    if (misses >= MAX_MISSES) stop("Game over. Too many misses.");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [misses]);

  return (
    <div className="page">
      <div className="game-shell">
        <div
          className="stage"
          onMouseMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            const sx = STAGE_W / r.width;
            const sy = STAGE_H / r.height;
            setMouse({ x: (e.clientX - r.left) * sx, y: (e.clientY - r.top) * sy });
          }}
          onClick={miss}
        >
          <img className="background" src={ballroomBackground} alt="cartoon ballroom background" draggable="false" />
          <div className="shade" />

          <HudBox title="SCORE" value={score} className="score" />
          <HudBox title="TIME" value={time} className="timer" />
          <HudBox title="LEVEL" value={level} className="level" />
          <Misses misses={misses} />
          <Ammo ammo={ammo} />
          <div className="streak-box">
            <div className="hud-title">STREAK</div>
            <div className="streak-value">x {streak}</div>
          </div>
          <CrosshairPicker selected={crosshair} onSelect={setCrosshair} />

          {splatters.map((s) => <Splat key={s.id} splat={s} />)}
          {tomatoes.map((t) => <Tomato key={t.id} tomato={t} onClick={hitTomato} />)}

          <AnimatePresence>
            <ParodyTarget target={target} onHit={hit} />
          </AnimatePresence>

          <MuzzleFlash flash={flash} />
          <ScreenFlash active={hitFlash} />
          <Crosshair pos={mouse} type={crosshair} />
          <Shotgun recoil={recoil} />
          <StartOverlay running={running} score={score} message={message} onStart={start} />
        </div>

        <div className="caption">
          Choose one of five crosshairs. Hit the target, block tomatoes, and avoid empty shots.
        </div>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
