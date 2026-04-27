import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { AnimatePresence, motion } from "framer-motion";
import "./style.css";

const GAME_W = 1536;
const GAME_H = 1024;
const ROUND_TIME = 60;
const MAX_DAMAGE = 7;

const HARRISON_SPOTS = [
  { id: "left-back", x: 335, y: 430 },
  { id: "center-table", x: 770, y: 420 },
  { id: "right-column", x: 1195, y: 505 },
  { id: "front-left", x: 450, y: 760 },
  { id: "far-right", x: 1380, y: 430 },
];

const CROSSHAIRS = [
  { id: "classic", label: "Classic" },
  { id: "diamond", label: "Diamond" },
  { id: "dot", label: "Dot" },
  { id: "box", label: "Box" },
  { id: "arcade", label: "Arcade" },
];

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function distance(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function Crosshair({ type, x, y, visible }) {
  if (!visible) return null;
  return <div className={`crosshair crosshair-${type}`} style={{ left: x, top: y }} />;
}

function Tomato({ tomato }) {
  const size = tomato.size;
  return (
    <motion.div
      className="tomato"
      style={{ left: tomato.x, top: tomato.y, width: size, height: size, opacity: tomato.opacity }}
      initial={false}
      animate={{ scale: tomato.scale, rotate: tomato.rot }}
      transition={{ duration: 0.06 }}
    >
      <div className="tomato-leaf" />
    </motion.div>
  );
}

function CharacterHitbox({ spot, onHit, visible }) {
  if (!visible) return null;
  return (
    <button
      className="character-hitbox"
      style={{ left: spot.x - 70, top: spot.y - 70 }}
      onPointerDown={(e) => {
        e.stopPropagation();
        onHit(spot);
      }}
      aria-label="hit character"
    />
  );
}

function App() {
  const [running, setRunning] = useState(false);
  const [score, setScore] = useState(0);
  const [time, setTime] = useState(ROUND_TIME);
  const [damage, setDamage] = useState(0);
  const [wave, setWave] = useState(1);
  const [message, setMessage] = useState("Press Start");
  const [crosshair, setCrosshair] = useState("diamond");
  const [pointer, setPointer] = useState({ x: GAME_W / 2, y: GAME_H / 2, visible: false });
  const [flash, setFlash] = useState(false);
  const [tomatoes, setTomatoes] = useState([]);
  const [activeSpot, setActiveSpot] = useState(HARRISON_SPOTS[1]);
  const [soundOn, setSoundOn] = useState(true);

  const gameRef = useRef(null);
  const timers = useRef([]);
  const tomatoRef = useRef([]);
  const lastShot = useRef(0);

  const difficulty = useMemo(() => 1 + Math.floor(score / 12), [score]);

  useEffect(() => {
    tomatoRef.current = tomatoes;
  }, [tomatoes]);

  const clearAllTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  const playTone = (freq, duration = 70, type = "square", volume = 0.08) => {
    if (!soundOn) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.value = volume;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration / 1000);
      osc.stop(ctx.currentTime + duration / 1000);
    } catch {
      // Audio is optional.
    }
  };

  const startGame = () => {
    clearAllTimers();
    setRunning(true);
    setScore(0);
    setTime(ROUND_TIME);
    setDamage(0);
    setWave(1);
    setTomatoes([]);
    setActiveSpot(HARRISON_SPOTS[1]);
    setMessage("Shoot the tomatoes before they hit you.");
    scheduleCharacterMove(600);
    scheduleTomatoThrow(900);
  };

  const endGame = (text) => {
    clearAllTimers();
    setRunning(false);
    setMessage(text);
  };

  const scheduleCharacterMove = (delay) => {
    const id = setTimeout(() => {
      setActiveSpot((prev) => {
        const choices = HARRISON_SPOTS.filter((s) => s.id !== prev.id);
        return choices[Math.floor(Math.random() * choices.length)];
      });
      scheduleCharacterMove(Math.max(650, 1600 - difficulty * 90));
    }, delay);
    timers.current.push(id);
  };

  const throwTomato = () => {
    const spot = activeSpot;
    const targetX = GAME_W / 2 + rand(-180, 180);
    const targetY = GAME_H - 120 + rand(-30, 40);
    const speed = rand(0.012, 0.018) + difficulty * 0.0015;

    const tomato = {
      id: crypto.randomUUID(),
      startX: spot.x,
      startY: spot.y - 15,
      targetX,
      targetY,
      progress: 0,
      speed,
      x: spot.x,
      y: spot.y,
      size: 34,
      scale: 0.65,
      rot: rand(-40, 40),
      opacity: 1,
    };

    setTomatoes((old) => [...old, tomato]);
  };

  const scheduleTomatoThrow = (delay) => {
    const id = setTimeout(() => {
      if (!running) return;
      throwTomato();
      const nextDelay = Math.max(360, 1200 - difficulty * 90 - wave * 35 + rand(-120, 160));
      scheduleTomatoThrow(nextDelay);
    }, delay);
    timers.current.push(id);
  };

  const shootAt = (point) => {
    if (!running) return;
    const now = performance.now();
    if (now - lastShot.current < 90) return;
    lastShot.current = now;

    setFlash(true);
    setTimeout(() => setFlash(false), 55);
    playTone(95, 55, "sawtooth", 0.09);

    let hitTomato = false;
    setTomatoes((old) => {
      const next = [];
      for (const tomato of old) {
        const radius = Math.max(42, tomato.size * tomato.scale * 0.75);
        if (!hitTomato && distance(point, tomato) <= radius) {
          hitTomato = true;
          setScore((s) => s + 2);
          setMessage("Tomato splashed! +2");
          playTone(520, 80, "triangle", 0.08);
        } else {
          next.push(tomato);
        }
      }
      return next;
    });

    if (!hitTomato) {
      setMessage("Miss!");
    }
  };

  const hitCharacter = () => {
    if (!running) return;
    setScore((s) => s + 5);
    setMessage("Harrison ducked! +5");
    playTone(720, 70, "triangle", 0.06);
    setActiveSpot((prev) => {
      const choices = HARRISON_SPOTS.filter((s) => s.id !== prev.id);
      return choices[Math.floor(Math.random() * choices.length)];
    });
  };

  const updatePointerFromEvent = (e) => {
    const rect = gameRef.current.getBoundingClientRect();
    const scaleX = GAME_W / rect.width;
    const scaleY = GAME_H / rect.height;
    setPointer({
      x: clamp((e.clientX - rect.left) * scaleX, 0, GAME_W),
      y: clamp((e.clientY - rect.top) * scaleY, 0, GAME_H),
      visible: true,
    });
  };

  const handlePointerDown = (e) => {
    updatePointerFromEvent(e);
    const rect = gameRef.current.getBoundingClientRect();
    const point = {
      x: clamp((e.clientX - rect.left) * (GAME_W / rect.width), 0, GAME_W),
      y: clamp((e.clientY - rect.top) * (GAME_H / rect.height), 0, GAME_H),
    };
    shootAt(point);
  };

  useEffect(() => {
    if (!running) return;

    let raf;
    const tick = () => {
      setTomatoes((old) => {
        const next = [];
        let hits = 0;

        for (const t of old) {
          const p = t.progress + t.speed;
          if (p >= 1) {
            hits++;
            continue;
          }

          const arc = Math.sin(p * Math.PI) * -120;
          const wobble = Math.sin(p * Math.PI * 6) * 12;
          const x = t.startX + (t.targetX - t.startX) * p + wobble;
          const y = t.startY + (t.targetY - t.startY) * p + arc;

          next.push({
            ...t,
            progress: p,
            x,
            y,
            size: 34 + p * 48,
            scale: 0.75 + p * 1.3,
            rot: t.rot + 9,
            opacity: 1 - Math.max(0, p - 0.82) * 1.5,
          });
        }

        if (hits > 0) {
          setDamage((d) => d + hits);
          setMessage(hits > 1 ? "Tomato barrage hit you!" : "Tomato hit you!");
          playTone(150, 120, "square", 0.08);
        }

        return next;
      });

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running, soundOn]);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setTime((t) => {
        if (t <= 1) {
          endGame("Time! You survived the tomato storm.");
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (damage >= MAX_DAMAGE) {
      endGame("Game over. Too many tomato hits.");
    }
  }, [damage]);

  useEffect(() => {
    const newWave = 1 + Math.floor(score / 20);
    setWave(newWave);
  }, [score]);

  return (
    <div className="page">
      <div className="game-shell">
        <div
          ref={gameRef}
          className="game"
          onPointerMove={updatePointerFromEvent}
          onPointerEnter={() => setPointer((p) => ({ ...p, visible: true }))}
          onPointerLeave={() => setPointer((p) => ({ ...p, visible: false }))}
          onPointerDown={handlePointerDown}
        >
          <img src="/ballroom.png" className="background" draggable="false" />

          <div className="hud hud-left">
            <div className="label">Score</div>
            <div className="big">{score}</div>
            <div className="divider" />
            <div className="label">Wave</div>
            <div className="big">{wave}</div>
          </div>

          <div className="hud hud-center">
            <div className="label">Time</div>
            <div className="big">{time}</div>
          </div>

          <div className="hud hud-right">
            <div className="label">Harrison</div>
            <div className="hearts">{"🍅".repeat(Math.max(0, MAX_DAMAGE - damage))}</div>
          </div>

          <CharacterHitbox spot={activeSpot} visible={running} onHit={hitCharacter} />

          <AnimatePresence>
            {tomatoes.map((t) => (
              <Tomato key={t.id} tomato={t} />
            ))}
          </AnimatePresence>

          <Crosshair type={crosshair} x={pointer.x} y={pointer.y} visible={pointer.visible && running} />
          {flash && <div className="flash" />}

          <div className="controls">
            <div className="control-title">Crosshair</div>
            <div className="crosshair-picker">
              {CROSSHAIRS.map((c) => (
                <button
                  key={c.id}
                  className={`pick ${crosshair === c.id ? "selected" : ""}`}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    setCrosshair(c.id);
                  }}
                  title={c.label}
                >
                  <span className={`mini mini-${c.id}`} />
                </button>
              ))}
            </div>
          </div>

          <button
            className="sound-btn"
            onPointerDown={(e) => {
              e.stopPropagation();
              setSoundOn((v) => !v);
            }}
          >
            {soundOn ? "🔊" : "🔇"}
          </button>

          {!running && (
            <div className="overlay">
              <div className="panel">
                <h1>Ballroom Hunt</h1>
                <p>{message}</p>
                <p className="small">Shoot incoming tomatoes before they reach you. Hitting Harrison gives bonus points.</p>
                <button className="start" onPointerDown={startGame}>Start</button>
              </div>
            </div>
          )}
        </div>

        <div className="mobile-note">
          Desktop: mouse aim + click. Mobile: drag/tap. Tomatoes are valid targets while they fly toward you.
        </div>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
