import './theme.css';
import React, { useState } from "react";
import PetList from "./PetList";
import Progress from "./progress";
import PomodoroTimer from "./PomodoroTimer";
import Collection from "./Collection";
import TaskList from "./TaskList";

export default function App() {
  const [pointsVersion, setPointsVersion] = useState(0);
  const [collectionVersion, setCollectionVersion] = useState(0);
  const [petsVersion, setPetsVersion] = useState(0);

  const bumpPoints = () => setPointsVersion(v => v + 1);
  const bumpCollection = () => setCollectionVersion(v => v + 1);
  const bumpPets = () => setPetsVersion(v => v + 1);
  const bumpEverything = () => { bumpPoints(); bumpCollection(); bumpPets(); };

  return (
    <div className="container">
      <h1 className="app-title">PomoHatch</h1>

      {/* Add 'split-lines' to draw faint lines like the mock */}
      <div className="layout split-lines">
        {/* TIME (top-left) */}
        <div className="card area-timer">
          <Progress pointsVersion={pointsVersion} />
          <div className="timer">
            <PomodoroTimer onAwardedPoint={bumpPoints} />
          </div>
        </div>

        {/* PET (top-right) */}
        <div className="card area-pet">
          <Collection version={collectionVersion} onAfterReset={bumpEverything} />
          <PetList
            pointsVersion={pointsVersion}
            onProgressChanged={bumpPoints}
            onCollectionChanged={bumpCollection}
            petsVersion={petsVersion}
          />
        </div>

        {/* TASK (bottom, full width) */}
        <div className="card area-tasks">
          <TaskList />
        </div>
      </div>
    </div>
  );
}
