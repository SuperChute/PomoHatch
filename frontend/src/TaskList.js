import React, { useEffect, useState } from "react";
import axios from "axios";

export default function TaskList() {
  const [tasks, setTasks] = useState([]);
  const [newTitle, setNewTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [togglingId, setTogglingId] = useState(null);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get("http://localhost:8000/api/tasks/");
      // Only keep active tasks in view per spec
      setTasks(data.filter(t => !t.completed));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTasks(); }, []);

  const addTask = async () => {
    const title = newTitle.trim();
    if (!title) return;
    setPosting(true);
    try {
      const { data } = await axios.post("http://localhost:8000/api/tasks/", { title });
      setTasks(prev => [data, ...prev]); // show immediately
      setNewTitle("");
    } catch {
      alert("Couldn’t add task.");
    } finally {
      setPosting(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter") addTask();
  };

  const toggleTask = async (id) => {
    setTogglingId(id);
    try {
      await axios.patch(`http://localhost:8000/api/tasks/${id}/toggle/`, {});
      // Disappear from the active list
      setTasks(prev => prev.filter(t => t.id !== id));
    } catch {
      alert("Couldn’t toggle task.");
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div style={{ marginTop: 24 }}>
      <h2>Tasks</h2>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input
          className="input"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Add a task and press Enter"
          style={{ flex: 1 }}
        />
        <button className="btn btn--success" onClick={addTask} disabled={posting}>
          {posting ? "Adding…" : "Add"}
        </button>
      </div>

      {loading ? (
        <div>Loading tasks…</div>
      ) : tasks.length === 0 ? (
        <div className="subtle">No active tasks. You’re clear! 🎉</div>
      ) : (
        <ul className="list">
          {tasks.map(task => (
            <li key={task.id} className="row">
              <input
                type="checkbox"
                checked={false}
                onChange={() => toggleTask(task.id)}
                disabled={togglingId === task.id}
                title="Mark complete"
              />
              <span>{task.title}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
