import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { motion, AnimatePresence } from "framer-motion";
import ballroomBackground from "./assets/ballroom-reference.png";
import "./styles.css";

const ROUND_TIME = 50;
const MAX_MISSES = 8;
const MAX_AMMO = 6;

const SPOTS = [
  { id: "plant", x: 214, y: 402, lean: -18, scale: 1.05 },
  { id: "table", x: 382, y: 246, lean: 14, scale: 0.82 },
  { id: "sofa", x: 620, y: 254, lean: -7, scale: 0.9 },
  { id: "window", x: 754, y: 220, lean: 0, scale: 0.74 },
  { id: "pillar", x: 836, y: 286, lean: -15, scale: 0.95 },
];

function pickSpot(previousId) {
  const pool = SPOTS.filter((s) => s.id !== previousId);
  return pool[Math.floor(Math.random() * pool.length)];
}

function rand(min, max) {
  return min + Math.random() * (max - min);
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

function Crosshair({ pos }) {
  return <div className="crosshair" style={{ left: pos.x, top: pos.y }} />;
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

function Splat({ splat }) {
  return (
    <motion.div
      className="splat"
      style={{ left: splat.x, top: splat.y }}
      initial={{ scale: 0.2, opacity: 0.9 }}
      animate={{ scale: 1.4, opacity: 0 }}
      transition={{ duration: 0.55 }}
    />
  );
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
  const [mouse, setMouse] = useState({ x: 450, y: 270 });
  const [recoil, setRecoil] = useState(false);
  const spawnTimer = useRef(null);
  const hideTimer = useRef(null);
  const reloadTimer = useRef(null);

  const level = useMemo(() => Math.min(9, 1 + Math.floor(score / 12)), [score]);

  const clearGameTimers = () => {
    clearTimeout(spawnTimer.current);
    clearTimeout(hideTimer.current);
    clearTimeout(reloadTimer.current);
  };

  const spawn = (previousId = target.id) => {
    if (!running) return;
    const spot = pickSpot(previousId);
    const ttl = Math.max(470, 1250 - level * 85);

    setTarget({
      visible: true,
      x: spot.x + rand(-14, 14),
      y: spot.y + rand(-10, 10),
      id: spot.id,
      born: performance.now(),
      lean: spot.lean + rand(-4, 4),
      scale: spot.scale,
    });

    hideTimer.current = setTimeout(() => {
      setTarget((t) => ({ ...t, visible: false }));
      setMisses((m) => m + 1);
      setStreak(0);
      setMessage("Too slow — he ducked away.");
      spawnTimer.current = setTimeout(() => spawn(spot.id), Math.max(240, 650 - level * 45));
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
    setTarget({ visible: false, x: 0, y: 0, id: null, born: 0, lean: 0, scale: 1 });
    setMessage("Fast hits give bonus points. Empty clicks waste ammo and count as misses.");
    setRunning(true);
  };

  const stop = (text) => {
    clearGameTimers();
    setRunning(false);
    setTarget((t) => ({ ...t, visible: false }));
    setMessage(text);
  };

  const shootVisual = () => {
    setRecoil(true);
    setTimeout(() => setRecoil(false), 95);
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

    clearTimeout(hideTimer.current);
    const reaction = performance.now() - target.born;
    const speedBonus = reaction < 360 ? 3 : reaction < 700 ? 2 : 1;
    const comboBonus = streak >= 4 ? 2 : streak >= 2 ? 1 : 0;
    const gained = speedBonus + comboBonus;

    setScore((s) => s + gained * 100);
    setStreak((s) => s + 1);
    setMessage(`HIT +${gained * 100}`);
    setSplatters((old) => [...old.slice(-8), { id: crypto.randomUUID(), x: target.x, y: target.y }]);
    setTarget((t) => ({ ...t, visible: false }));
    spawnTimer.current = setTimeout(() => spawn(target.id), Math.max(180, 540 - level * 38));
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
    spawnTimer.current = setTimeout(() => spawn(null), 450);
    return clearGameTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
            setMouse({ x: e.clientX - r.left, y: e.clientY - r.top });
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

          {splatters.map((s) => <Splat key={s.id} splat={s} />)}

          <AnimatePresence>
            <ParodyTarget target={target} onHit={hit} />
          </AnimatePresence>

          <Crosshair pos={mouse} />
          <Shotgun recoil={recoil} />
          <StartOverlay running={running} score={score} message={message} onStart={start} />
        </div>

        <div className="caption">Click targets. Empty clicks count as misses. The game gets faster as your score grows.</div>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
