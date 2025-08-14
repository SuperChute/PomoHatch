import React, { useEffect, useState } from "react";
import axios from "axios";

export default function Collection({ version, onAfterReset }) {
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false); // 👈 toggle drawer

  const load = async () => {
    const res = await axios.get("http://localhost:8000/api/collection/");
    setData(res.data);
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { load(); }, [version]);

  const fullReset = async () => {
    if (!window.confirm("Reset ALL pets and points? This cannot be undone.")) return;
    try {
      setBusy(true);
      await axios.post("http://localhost:8000/api/reset/", {});
      onAfterReset?.();
      await load();
    } finally {
      setBusy(false);
    }
  };

  if (!data) return <div>Loading collection…</div>;

  const { collected_count, total_species, has_all, collected_species } = data;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <h2 style={{ margin: 0 }}>Collection {has_all ? "🏆" : ""}</h2>
          <span className="pill">{collected_count} / {total_species} collected</span>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            className="btn"
            aria-expanded={open}
            aria-controls="collection-drawer"
            onClick={() => setOpen(o => !o)}
            title={open ? "Hide collection" : "Show collection"}
          >
            {open ? "Hide" : "Show"} Collection
          </button>

          <button className="btn btn--danger" onClick={fullReset} disabled={busy}>
            {busy ? "Resetting…" : "Reset ALL"}
          </button>
        </div>
      </div>

      {/* Collapsible drawer */}
      <div id="collection-drawer" className={`collapser ${open ? "is-open" : ""}`}>
        <div className="collapser-inner">
          {collected_species.length === 0 ? (
            <div className="subtle">No pets collected yet — hatch your first!</div>
          ) : (
            <div className="collection-grid">
              {collected_species.map(s => (
                <div key={s.id} className="collection-item">
                  <img
                    className="collection-thumb"
                    src={`http://localhost:8000${s.display_image || s.image}`}
                    alt={s.name}
                  />
                  <div className="collection-name">{s.name}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
