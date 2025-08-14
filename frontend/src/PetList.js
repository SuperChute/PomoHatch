import React, { useEffect, useState } from "react";
import axios from "axios";
import { sfx } from "./sfx";

const EVOLVE_INFO = {
  egg:     { label: "Crack Egg", cost: 1 },
  cracked: { label: "Hatch",     cost: 1 },
  hatched: { label: "Evolve",    cost: 3 },
  evolved: { label: "Maxed",     cost: 0 },
};

export default function PetList({ onProgressChanged, onCollectionChanged, pointsVersion, petsVersion }) {
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [points, setPoints] = useState(0);
  const [newName, setNewName] = useState("");

  const loadPets = () => {
    setLoading(true);
    axios.get("http://localhost:8000/api/eggpets/")
      .then(res => setPets(res.data))
      .finally(() => setLoading(false));
  };

  const loadPoints = async () => {
    const { data } = await axios.get("http://localhost:8000/api/progress/");
    setPoints(data.pomodoro_points);
  };

  useEffect(() => { loadPets(); loadPoints(); }, []);
  useEffect(() => { loadPets(); loadPoints(); }, [petsVersion]);
  useEffect(() => { loadPoints(); }, [pointsVersion]);

  const activatePet = async (id) => {
    try {
      setBusyId(id);
      await axios.patch(`http://localhost:8000/api/eggpets/${id}/activate/`, {});
      await loadPets();
    } finally {
      setBusyId(null);
    }
  };

  const evolvePet = async (id) => {
    try {
      setBusyId(id);
     // figure out the current stage BEFORE the evolve call
      const before = pets.find(p => p.id === id)?.stage;
      await axios.patch(`http://localhost:8000/api/eggpets/${id}/evolve/`, {});
      await loadPets();
      await loadPoints();
      onProgressChanged?.();
      onCollectionChanged?.(); // collection may change on hatch
      // play sfx matching the transition we just triggered
      if (before === 'egg')      sfx.play('crack');
      else if (before === 'cracked') sfx.play('hatch');
      else if (before === 'hatched') sfx.play('evolve');
    } catch (e) {
      alert(e?.response?.data?.error || "Failed to evolve.");
    } finally {
      setBusyId(null);
    }
  };

  const resetPet = async (id) => {
    try {
      setBusyId(id);
      await axios.patch(`http://localhost:8000/api/eggpets/${id}/reset/`, {});
      await loadPets();
      onCollectionChanged?.();
    } catch {
      alert("Couldn’t reset pet.");
    } finally {
      setBusyId(null);
    }
  };

  const renamePet = async (id, currentName) => {
    const input = window.prompt("New nickname:", currentName || "");
    if (input == null) return;
    const nickname = input.trim();
    if (!nickname) return alert("Nickname cannot be empty.");
    try {
      setBusyId(id);
      await axios.patch(`http://localhost:8000/api/eggpets/${id}/rename/`, { nickname });
      await loadPets();
    } catch (e) {
      alert(e?.response?.data?.error || "Couldn’t rename pet.");
    } finally {
      setBusyId(null);
    }
  };

  const newEgg = async () => {
    try {
      setBusyId("new");
      const nickname = newName.trim() || `Egg ${pets.length + 1}`;
      const { data } = await axios.post("http://localhost:8000/api/eggpets/", {
        nickname,
        is_active: false,
      });
      await axios.patch(`http://localhost:8000/api/eggpets/${data.id}/activate/`, {});
      setNewName("");
      await loadPets();
    } catch (e) {
      alert("Couldn’t create egg.");
    } finally {
      setBusyId(null);
    }
  };

  const imageFor = (pet) => {
    if (pet.stage === "egg") return "http://localhost:8000/media/ui/egg.png";
    if (pet.stage === "cracked") return "http://localhost:8000/media/ui/cracked.png";
    const base = pet.species_data;
    if (!base) return "http://localhost:8000/media/ui/egg.png";
    const chosen = (pet.stage === "evolved" && base.evolved_image) ? base.evolved_image : base.image;
    return `http://localhost:8000${chosen}`;
  };

  const activePet = pets.find(p => p.is_active) || null;

  if (loading) return <div>Loading pets...</div>;

  return (
    <div>
      <h2>Your Pet</h2>

      <div className="pet-panel">
        {/* Sidebar: horizontal strip of eggs/pets (choose active) */}
        <aside className="pet-sidebar">
          <div style={{ display:"flex", gap:8, marginBottom:10 }}>
            <input
              className="input"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New egg nickname"
            />
            <button className="btn btn--primary" onClick={newEgg} disabled={busyId === "new"}>
              {busyId === "new" ? "Creating…" : "New Egg"}
            </button>
          </div>

          {pets.length === 0 ? (
            <div className="subtle">No pets yet.</div>
          ) : (
            <div className="pet-strip">
              {pets.map((pet) => (
                <button
                  key={pet.id}
                  className={`pet-chip ${pet.is_active ? "is-active" : ""}`}
                  onClick={() => !pet.is_active && activatePet(pet.id)}
                  title={pet.is_active ? "Active" : "Click to activate"}
                >
                  <img src={imageFor(pet)} alt={pet.nickname} className="pet-chip-img" />
                  <div className="pet-chip-name">{pet.nickname}</div>
                  <div className="pet-chip-stage">{pet.stage}</div>
                </button>
              ))}
            </div>
          )}
        </aside>

        {/* Main: ONLY the active pet is shown big */}
        <section className="pet-main">
          {!activePet ? (
            <div className="subtle">Select or create an egg to begin.</div>
          ) : (
            <div className="pet-card is-active">
              <div className="pet-title">{activePet.nickname}</div>
              <div className="pet-stage">Stage: {activePet.stage} (Active)</div>

              <img
                className="pet-img"
                src={imageFor(activePet)}     // 👈 uses evolved art if present
                alt={activePet.species_data?.name || activePet.stage}
                style={{ width: 110, height: 110 }}
              />

              <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginTop:6 }}>
                {/* Evolve */}
                {(() => {
                  const info = EVOLVE_INFO[activePet.stage] || { label:"Unknown", cost:0 };
                  const isMaxed = activePet.stage === "evolved";
                  const notEnough = points < info.cost;
                  return (
                    <button
                      className="btn btn--primary"
                      onClick={() => evolvePet(activePet.id)}
                      disabled={busyId === activePet.id || isMaxed || notEnough}
                      title={
                        isMaxed
                          ? "Fully evolved"
                          : notEnough
                            ? `Need ${info.cost} point${info.cost === 1 ? "" : "s"}`
                            : `Costs ${info.cost}`
                      }
                    >
                      {isMaxed
                        ? "Maxed"
                        : busyId === activePet.id
                          ? "Evolving..."
                          : `${info.label} (−${info.cost})`}
                    </button>
                  );
                })()}

                {/* Reset */}
                <button
                  className="btn btn--ghost"
                  onClick={() => resetPet(activePet.id)}
                  disabled={busyId === activePet.id || activePet.stage === "egg"}
                  title={activePet.stage === "egg" ? "Already an egg" : "Reset this pet to egg"}
                >
                  {busyId === activePet.id ? "Resetting..." : "Reset"}
                </button>

                {/* Rename */}
                <button
                  className="btn"
                  onClick={() => renamePet(activePet.id, activePet.nickname)}
                  disabled={busyId === activePet.id}
                >
                  {busyId === activePet.id ? "Renaming…" : "Rename"}
                </button>

                {/* Points pill */}
                <span className="pill">Points: {points}</span>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
