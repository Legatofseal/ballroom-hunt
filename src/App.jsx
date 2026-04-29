import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const ROUND_TIME = 60;
const MAX_DAMAGE = 6;

const TARGET_SPOTS = [
  { id: "left-desk", x: 20, y: 50 },
  { id: "front-desk", x: 52, y: 45 },
  { id: "right-monitor", x: 88, y: 46 },
  { id: "low-left", x: 34, y: 63 },
  { id: "center", x: 50, y: 33 },
  { id: "right-desk", x: 76, y: 54 },
];

const TOMATO_SPAWNS = [
  { x: 10, y: 14 },
  { x: 30, y: 24 },
  { x: 70, y: 16 },
  { x: 86, y: 30 },
  { x: 12, y: 74 },
  { x: 55, y: 52 },
];

function pickDifferent(list, previousId) {
  const filtered = list.filter((item) => item.id !== previousId);
  return filtered[Math.floor(Math.random() * filtered.length)];
}

function playTone(type, enabled) {
  if (!enabled) return;
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type === "hit" ? "square" : type === "damage" ? "sawtooth" : "triangle";
    osc.frequency.value = type === "hit" ? 720 : type === "damage" ? 120 : 320;
    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.11);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  } catch {
    // Browser can block audio until user gesture. Ignore safely.
  }
}

function CrosshairIcon({ type }) {
  if (type === 1) {
    return <svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" strokeWidth="6"/><line x1="50" y1="5" x2="50" y2="28" stroke="currentColor" strokeWidth="6"/><line x1="50" y1="72" x2="50" y2="95" stroke="currentColor" strokeWidth="6"/><line x1="5" y1="50" x2="28" y2="50" stroke="currentColor" strokeWidth="6"/><line x1="72" y1="50" x2="95" y2="50" stroke="currentColor" strokeWidth="6"/></svg>;
  }
  if (type === 2) {
    return <svg viewBox="0 0 100 100"><rect x="22" y="22" width="56" height="56" fill="none" stroke="currentColor" strokeWidth="6" transform="rotate(45 50 50)"/><line x1="50" y1="0" x2="50" y2="100" stroke="currentColor" strokeWidth="4"/><line x1="0" y1="50" x2="100" y2="50" stroke="currentColor" strokeWidth="4"/></svg>;
  }
  if (type === 3) {
    return <svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="8" fill="currentColor"/><circle cx="50" cy="50" r="34" fill="none" stroke="currentColor" strokeWidth="4" strokeDasharray="10 8"/></svg>;
  }
  if (type === 4) {
    return <svg viewBox="0 0 100 100"><line x1="50" y1="15" x2="50" y2="42" stroke="currentColor" strokeWidth="8"/><line x1="50" y1="58" x2="50" y2="85" stroke="currentColor" strokeWidth="8"/><line x1="15" y1="50" x2="42" y2="50" stroke="currentColor" strokeWidth="8"/><line x1="58" y1="50" x2="85" y2="50" stroke="currentColor" strokeWidth="8"/></svg>;
  }
  return <svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="28" fill="none" stroke="currentColor" strokeWidth="5"/><circle cx="50" cy="50" r="5" fill="currentColor"/><line x1="50" y1="8" x2="50" y2="22" stroke="currentColor" strokeWidth="5"/><line x1="50" y1="78" x2="50" y2="92" stroke="currentColor" strokeWidth="5"/><line x1="8" y1="50" x2="22" y2="50" stroke="currentColor" strokeWidth="5"/><line x1="78" y1="50" x2="92" y2="50" stroke="currentColor" strokeWidth="5"/></svg>;
}

export default function App() {
  const [running, setRunning] = useState(false);
  const [score, setScore] = useState(0);
  const [damage, setDamage] = useState(0);
  const [time, setTime] = useState(ROUND_TIME);
  const [wave, setWave] = useState(1);
  const [crosshair, setCrosshair] = useState(2);
  const [sound, setSound] = useState(true);
  const [flash, setFlash] = useState(false);
  const [pointer, setPointer] = useState({ x: 50, y: 50 });

  const [target, setTarget] = useState({ visible: false, id: null, x: 50, y: 50 });
  const [tomatoes, setTomatoes] = useState([]);
  const [splats, setSplats] = useState([]);

  const targetTimer = useRef(null);
  const tomatoTimer = useRef(null);
  const tickTimer = useRef(null);

  const difficulty = useMemo(() => Math.min(7, 1 + Math.floor(score / 12)), [score]);

  const clearTimers = () => {
    clearTimeout(targetTimer.current);
    clearTimeout(tomatoTimer.current);
    clearInterval(tickTimer.current);
  };

  const start = () => {
    clearTimers();
    setRunning(true);
    setScore(0);
    setDamage(0);
    setTime(ROUND_TIME);
    setWave(1);
    setTomatoes([]);
    setSplats([]);
    setTarget({ visible: false, id: null, x: 50, y: 50 });
  };

  const stop = () => {
    clearTimers();
    setRunning(false);
    setTarget((t) => ({ ...t, visible: false }));
  };

  const spawnTarget = (previousId = target.id) => {
    if (!running) return;

    const spot = pickDifferent(TARGET_SPOTS, previousId);
    const ttl = Math.max(850, 1900 - difficulty * 120);

    setTarget({
      visible: true,
      id: spot.id,
      x: spot.x,
      y: spot.y,
    });

    targetTimer.current = setTimeout(() => {
      setTarget((t) => ({ ...t, visible: false }));
      targetTimer.current = setTimeout(() => spawnTarget(spot.id), Math.max(520, 1100 - difficulty * 70));
    }, ttl);
  };

  const spawnTomato = () => {
    if (!running) return;

    const src = TOMATO_SPAWNS[Math.floor(Math.random() * TOMATO_SPAWNS.length)];

    setTomatoes((old) => [
      ...old,
      {
        id: crypto.randomUUID(),
        x: src.x,
        y: src.y,
        size: 1,
        vx: (50 - src.x) / (80 + Math.random() * 45),
        vy: (92 - src.y) / (80 + Math.random() * 45),
      },
    ]);

    tomatoTimer.current = setTimeout(spawnTomato, Math.max(420, 1250 - difficulty * 110));
  };

  const doFlash = () => {
    setFlash(true);
    setTimeout(() => setFlash(false), 65);
  };

  const addSplat = (x, y) => {
    const id = crypto.randomUUID();
    setSplats((old) => [...old.slice(-8), { id, x, y }]);
    setTimeout(() => {
      setSplats((old) => old.filter((s) => s.id !== id));
    }, 550);
  };

  const hitTarget = (event) => {
    event.stopPropagation();
    if (!running || !target.visible) return;

    doFlash();
    playTone("hit", sound);
    addSplat(target.x, target.y);
    setScore((s) => s + 3);
    setTarget((t) => ({ ...t, visible: false }));
    clearTimeout(targetTimer.current);
    targetTimer.current = setTimeout(() => spawnTarget(target.id), Math.max(430, 980 - difficulty * 70));
  };

  const hitTomato = (event, tomato) => {
    event.stopPropagation();
    if (!running) return;

    doFlash();
    playTone("hit", sound);
    addSplat(tomato.x, tomato.y);
    setScore((s) => s + 1);
    setTomatoes((old) => old.filter((t) => t.id !== tomato.id));
  };

  const miss = () => {
    if (!running) return;
    doFlash();
    playTone("miss", sound);
  };

  const updatePointer = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    setPointer({
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y)),
    });
  };

  useEffect(() => {
    if (!running) return;

    targetTimer.current = setTimeout(() => spawnTarget(null), 500);
    tomatoTimer.current = setTimeout(spawnTomato, 900);

    tickTimer.current = setInterval(() => {
      setTomatoes((old) => {
        const next = [];
        let hits = 0;

        for (const tomato of old) {
          const updated = {
            ...tomato,
            x: tomato.x + tomato.vx * (1 + difficulty * 0.12),
            y: tomato.y + tomato.vy * (1 + difficulty * 0.12),
            size: tomato.size + 0.018 + difficulty * 0.002,
          };

          if (updated.y > 92 || updated.size > 2.45) {
            hits += 1;
            addSplat(updated.x, updated.y);
          } else {
            next.push(updated);
          }
        }

        if (hits > 0) {
          playTone("damage", sound);
          setDamage((d) => Math.min(MAX_DAMAGE, d + hits));
        }

        return next;
      });
    }, 33);

    return clearTimers;
  }, [running, difficulty, sound]);

  useEffect(() => {
    if (!running) return;

    const id = setInterval(() => {
      setTime((t) => {
        if (t <= 1) {
          stop();
          return 0;
        }
        return t - 1;
      });

      setWave((w) => Math.max(1, Math.floor((ROUND_TIME - time) / 15) + 1));
    }, 1000);

    return () => clearInterval(id);
  }, [running, time]);

  useEffect(() => {
    if (damage >= MAX_DAMAGE) stop();
  }, [damage]);

  return (
    <main className="game-shell">
      <section
        className="game-stage"
        onPointerMove={updatePointer}
        onPointerDown={(event) => {
          updatePointer(event);
          miss();
        }}
      >
        <div className="bg" />
        <div className="dark-vignette" />

        <div className="hud">
          <div className="hud-card">
            <div className="label">SCORE</div>
            <div className="value">{score}</div>
          </div>
          <div className="hud-card">
            <div className="label">TIME</div>
            <div className="value">{time}</div>
          </div>
          <div className="hud-card">
            <div className="label">WAVE</div>
            <div className="value">{wave}</div>
          </div>
        </div>

        <div className="top-right">
          <div className="hud-card">
            <div className="label">DAMAGE</div>
            <div className="value">
              {"🍅".repeat(damage)}
              {"♡".repeat(Math.max(0, MAX_DAMAGE - damage))}
            </div>
          </div>
          <button className="primary" onPointerDown={(e) => e.stopPropagation()} onClick={start}>
            {running ? "Restart" : "Start"}
          </button>
        </div>

        <AnimatePresence>
          {target.visible && (
            <motion.div
              className="target"
              style={{ left: `${target.x}%`, top: `${target.y}%` }}
              initial={{ scale: 0.2, y: 35, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.1, y: 25, opacity: 0 }}
              transition={{ type: "spring", stiffness: 280, damping: 19 }}
              onPointerDown={hitTarget}
            >
              <div className="target-hitbox" />
              <img src="/target-character.png" alt="target character" draggable="false" />
            </motion.div>
          )}
        </AnimatePresence>

        {tomatoes.map((tomato) => (
          <motion.div
            key={tomato.id}
            className="tomato"
            style={{
              left: `${tomato.x}%`,
              top: `${tomato.y}%`,
              scale: tomato.size,
            }}
            onPointerDown={(event) => hitTomato(event, tomato)}
          />
        ))}

        {splats.map((splat) => (
          <motion.div
            key={splat.id}
            className="splat"
            style={{ left: `${splat.x}%`, top: `${splat.y}%` }}
            initial={{ scale: 0.15, opacity: 0.95 }}
            animate={{ scale: 1.45, opacity: 0 }}
            transition={{ duration: 0.55 }}
          />
        ))}

        {flash && <div className="flash" />}

        <div className="crosshair" style={{ left: `${pointer.x}%`, top: `${pointer.y}%` }}>
          <CrosshairIcon type={crosshair} />
        </div>

        <div className="controls" onPointerDown={(e) => e.stopPropagation()}>
          <div className="label">AIM</div>
          {[1, 2, 3, 4, 5].map((id) => (
            <button
              key={id}
              className={`crosshair-btn ${crosshair === id ? "active" : ""}`}
              onClick={() => setCrosshair(id)}
              title={`Crosshair ${id}`}
            >
              <CrosshairIcon type={id} />
            </button>
          ))}
          <button className="crosshair-btn" onClick={() => setSound((s) => !s)} title="Toggle sound">
            {sound ? "🔊" : "🔇"}
          </button>
        </div>

        {!running && (
          <div className="start-overlay">
            <div className="start-panel">
              <h1>Office Tomato Hunt</h1>
              <p>
                Сбивай летящие помидоры и попадай по всплывающему персонажу. На мобильном — тапай по целям.
              </p>
              <button className="primary" onClick={start}>
                Play
              </button>
              <br />
              <a
                className="donate"
                href="https://www.paypal.com/donate/?hosted_button_id=YOUR_BUTTON_ID"
                target="_blank"
                rel="noreferrer"
              >
                💛 Donate via PayPal
              </a>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
