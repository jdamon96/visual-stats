import { useState } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";

interface SeasonStats {
  season: string;
  points: number;
  assists: number;
  rebounds: number;
}

function App() {
  const [careerStats, setCareerStats] = useState<SeasonStats[] | null>(null);

  const showCareerStats = async () => {
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    chrome.scripting
      .executeScript({
        target: { tabId: tab.id! },
        func: () => {
          const table = document.querySelector("#per_game");
          const headerRow = table?.querySelector("thead tr");
          const bodyRows = table?.querySelectorAll("tbody tr:not(.thead)");
          let statsArray: SeasonStats[] = [];

          const getColumnIndex = (columnName: string) => {
            return Array.from(headerRow?.children || []).findIndex(
              (th) => th.textContent === columnName
            );
          };

          // Dynamically find column indices based on header names
          const pointsIndex = getColumnIndex("PTS") + 1; // +1 because nth-child is 1-based
          const assistsIndex = getColumnIndex("AST") + 1;
          const reboundsIndex = getColumnIndex("TRB") + 1;

          bodyRows?.forEach((row) => {
            const season =
              row.querySelector('th[data-stat="season"]')?.textContent || "";
            const pointsElement = row.querySelector(
              `td:nth-child(${pointsIndex})`
            );
            const assistsElement = row.querySelector(
              `td:nth-child(${assistsIndex})`
            );
            const reboundsElement = row.querySelector(
              `td:nth-child(${reboundsIndex})`
            );

            const points = pointsElement
              ? parseFloat(pointsElement.textContent || "0")
              : 0;
            const assists = assistsElement
              ? parseFloat(assistsElement.textContent || "0")
              : 0;
            const rebounds = reboundsElement
              ? parseFloat(reboundsElement.textContent || "0")
              : 0;

            statsArray.push({ season, points, assists, rebounds });
          });

          return statsArray;
        },
      })
      .then((results) => {
        // Update state with the fetched career statistics
        const careerStats = (results && results[0]?.result) || null;
        setCareerStats(careerStats);
      });
  };

  return (
    <>
      <div>
        <a href="https://vitejs.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={showCareerStats}>Show Career Stats</button>
        {careerStats !== null && (
          <>
            <h2>Career Stats</h2>
            <ul>
              {careerStats.map((stat, index) => (
                <li key={index}>
                  {stat.season} - Points: {stat.points}, Assists: {stat.assists}
                  , Rebounds: {stat.rebounds}
                </li>
              ))}
            </ul>
          </>
        )}
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  );
}

export default App;
