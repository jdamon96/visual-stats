import { useEffect, useState } from "react";
import "./App.css";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

function App() {
  interface ChartData {
    date: string;
    points: number;
    assists: number;
    rebounds: number;
  }

  const [careerStatsChartData, setCareerStatsChartData] = useState<
    ChartData[] | null
  >(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const getCareerStats = async () => {
    setIsLoading(true);
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    chrome.scripting
      .executeScript({
        target: { tabId: tab.id! },
        func: () => {
          const table = document.querySelector("#per_game");
          const headerRow = table?.querySelector("thead tr");
          const bodyRows = table?.querySelectorAll("tbody tr:not(.thead)");
          let chartDataArray: ChartData[] = [];

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
            const date =
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

            chartDataArray.push({ date, points, assists, rebounds });
          });

          return chartDataArray;
        },
      })
      .then((results) => {
        // Update state with the fetched career statistics
        const careerStatsChartData = (results && results[0]?.result) || null;

        setCareerStatsChartData(careerStatsChartData);
        setIsLoading(false);
      });
  };

  useEffect(() => {
    if (careerStatsChartData) {
      console.log(careerStatsChartData);
    }
  }, [careerStatsChartData]);

  return (
    <div className="card">
      <button onClick={getCareerStats}>Show Career Stats on Chart</button>
      {isLoading ? (
        <p>Loading...</p>
      ) : (
        careerStatsChartData !== null && (
          <LineChart
            width={500}
            height={300}
            data={careerStatsChartData}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="points"
              stroke="#8884d8"
              activeDot={{ r: 8 }}
            />
            <Line type="monotone" dataKey="assists" stroke="#82ca9d" />
            <Line type="monotone" dataKey="rebounds" stroke="#82ca9d" />
          </LineChart>
        )
      )}
    </div>
  );
}

export default App;
