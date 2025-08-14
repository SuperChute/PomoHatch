import React, { useEffect, useState } from "react";
import axios from "axios";

export default function Progress({ pointsVersion }) {
  const [progress, setProgress] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setBusy(true);
    try {
      const { data } = await axios.get("http://localhost:8000/api/progress/");
      setProgress(data);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => { load(); }, []);                 // on mount
  useEffect(() => { if (pointsVersion != null) load(); }, [pointsVersion]); // on points change

  if (!progress) return <div>Loading progress…</div>;

  return (
    <div style={{ marginBottom: 16, display: "flex", alignItems: "center" }}>
      <div className="pill">
        <strong>Points:</strong> {progress.pomodoro_points} &nbsp;|&nbsp;
        <strong>Sessions:</strong> {progress.pomodoros_completed}
      </div>
      <button
        className="btn btn--ghost"
        onClick={load}
        disabled={busy}
        style={{ marginLeft: 8 }}
      >
        {busy ? "Refreshing…" : "Refresh"}
      </button>
    </div>
  );
}
