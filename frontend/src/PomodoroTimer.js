import React, { useEffect, useRef, useState } from "react";
import { api } from "./api";
import { sfx } from "./sfx";

const DURATIONS = {
  focus: 25 * 60,   // Pomodoro
  short: 5 * 60,    // Short break
  long: 10 * 60,    // Long break
};

export default function PomodoroTimer({ onAwardedPoint }) {
  const [mode, setMode] = useState("focus"); // 'focus' | 'short' | 'long'
  const [secondsLeft, setSecondsLeft] = useState(DURATIONS.focus);
  const [running, setRunning] = useState(false);

  const intervalRef = useRef(null);
  const awardedRef = useRef(false); // ensures one award per session

  // local Audio instance for the one-shot Pomodoro chime (controlled by this component)
  const pomoRef = useRef(null);
  useEffect(() => {
    // create once
    pomoRef.current = new Audio("/sfx/pomo-complete.mp3");
    pomoRef.current.preload = "auto";
    try { pomoRef.current.volume = 0.9; } catch {}
    // cleanup on unmount
    return () => {
      try {
        pomoRef.current.pause();
        pomoRef.current.currentTime = 0;
      } catch {}
      pomoRef.current = null;
    };
  }, []);

  // helper to stop the local chime
  const stopLocalPomo = () => {
    try {
      if (pomoRef.current) {
        pomoRef.current.loop = false;
        pomoRef.current.pause();
        pomoRef.current.currentTime = 0;
      }
    } catch {}
  };

  // Reset timer whenever mode changes
  useEffect(() => {
    setRunning(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    awardedRef.current = false;
    sfx.stopAll(); // stop any looping alarm when switching modes
    stopLocalPomo(); // also ensure the one-shot chime is stopped
    setSecondsLeft(DURATIONS[mode]);
  }, [mode]);

  // Timer tick
  useEffect(() => {
    if (!running) return;

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          // stop timer
          clearInterval(intervalRef.current);
          intervalRef.current = null;
          setRunning(false);

          // End-of-session sound behavior
          if (mode === "focus") {
            // Pomodoro: award + one-shot chime (use local audio to ensure stop works)
            if (!awardedRef.current) {
              awardedRef.current = true;
              try {
                // prefer local controlled audio for single-shot
                if (pomoRef.current) {
                  pomoRef.current.loop = false;
                  pomoRef.current.currentTime = 0;
                  pomoRef.current.play().catch(() => {}); // swallow play promise errors
                } else {
                  sfx.play("pomo");
                }
              } catch {
                // fallback
                try { sfx.play("pomo"); } catch {}
              }
              awardPoint();
            }
          } else {
            // Breaks: loop alarm until user presses Reset
            sfx.loop("pomo");
          }

          return 0;
        }
        return s - 1;
      });
    }, 1000);

    // cleanup (React 18 Strict Mode calls this twice in dev)
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [running, mode]);

  const start = () => {
    sfx.warmup();
    sfx.stopAll();       // stop any looping alarms
    stopLocalPomo();     // explicitly stop local pomo audio too
    if (secondsLeft === 0) setSecondsLeft(DURATIONS[mode]);
    awardedRef.current = false;
    setRunning(true);
  };

  const pause = () => setRunning(false);

  const reset = () => {
    setRunning(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    awardedRef.current = false;
    sfx.stopAll();       // stop any looping alarms
    stopLocalPomo();     // ensure local pomo chime is paused and rewound
    setSecondsLeft(DURATIONS[mode]);
  };

  const awardPoint = async () => {
    try {
      // Only focus sessions add points/sessions
      await api.patch("/progress/", { add_points: 1, add_sessions: 1 });
      onAwardedPoint?.();
    } catch (e) {
      console.error("Failed to award point:", e);
    }
  };

  const completeNow = () => {
    // developer helper to finish the current session immediately
    awardedRef.current = false; // allow award if mode === 'focus'
    setSecondsLeft(1);
    setRunning(true);
  };

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");

  const ModeButton = ({ id, label }) => (
    <button
      onClick={() => setMode(id)}
      disabled={running}
      style={{
        padding: "6px 10px",
        borderRadius: 8,
        border: "1px solid #ddd",
        background: mode === id ? "#eef6ff" : "white",
        fontWeight: mode === id ? 700 : 400,
      }}
      title={id === "focus" ? "Completing this awards +1 point" : "Break — no points"}
    >
      {label}
    </button>
  );

  useEffect(() => {
  const fmt = (n) => String(n).padStart(2, "0");
  const mm = fmt(Math.floor(secondsLeft / 60));
  const ss = fmt(secondsLeft % 60);

  const label =
    mode === "focus" ? "Focus" :
    mode === "short" ? "Break" : "Long Break";

  // e.g. "PomoHatch — 24:59 (Focus)"
  document.title = `PomoHatch — ${mm}:${ss} (${label})`;

  // optional cleanup if this component ever unmounts
  return () => { document.title = "PomoHatch"; };
  }, [secondsLeft, mode]);

  return (
    <div style={{ marginBottom: 16 }}>
      <h2>Pomodoro</h2>

      <div className="modebar">
        <ModeButton id="focus" label="Pomodoro (25)" />
        <ModeButton id="short" label="Short Break (5)" />
        <ModeButton id="long"  label="Long Break (10)" />
      </div>
      <div className="time">{mm}:{ss}</div>

      <div className="timer-actions">
        {!running ? (
          <button className="btn btn--primary" onClick={start}>Start</button>
        ) : (
          <button className="btn" onClick={pause}>Pause</button>
        )}
        <button className="btn btn--ghost" onClick={reset}>Reset</button>
        <button className="btn btn--ghost" onClick={completeNow}>(Dev) Complete Now</button>
      </div>

      <div style={{ marginTop: 6, color: "#666", fontSize: 12 }}>
        {mode === "focus" ? "Completing this session awards +1 Pomodoro point." : "Break sessions do not award points."}
      </div>
    </div>
  );
}
