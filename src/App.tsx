import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import PlayerList from "./components/PlayerList";
import { Card } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Loader2 } from "lucide-react";

interface ChartData {
  date: string;
  points: number;
  assists: number;
  rebounds: number;
}

export interface PlayerStats {
  name: string;
  image: string;
  stats: ChartData[];
}

function App() {
  const [playerCareerStatsData, setPlayerCareerStatsData] = useState<
    PlayerStats[] | null
  >(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedStat, setSelectedStat] = useState<string>("points");

  const getCareerStats = async () => {
    setIsLoading(true);
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    const playerPageRegex =
      /https:\/\/www\.basketball-reference\.com\/players\/[a-z]\/[a-z]+[0-9]+\.html/;
    if (!playerPageRegex.test(tab.url!)) {
      setIsLoading(false);
      return;
    }

    chrome.scripting
      .executeScript({
        target: { tabId: tab.id! },
        func: () => {
          const playerName =
            document.querySelector("div#meta h1 span")?.textContent || "";
          const playerImage =
            document.querySelector(".media-item img")?.getAttribute("src") ||
            "";
          const table = document.querySelector("#per_game");
          const headerRow = table?.querySelector("thead tr");
          const bodyRows = table?.querySelectorAll("tbody tr:not(.thead)");
          let chartDataArray: ChartData[] = [];

          const getColumnIndex = (columnName: string) => {
            return Array.from(headerRow?.children || []).findIndex(
              (th) => th.textContent === columnName
            );
          };

          const pointsIndex = getColumnIndex("PTS") + 1;
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

          return {
            name: playerName,
            image: playerImage,
            stats: chartDataArray,
          };
        },
      })
      .then(async (results) => {
        const playerStats = (results && results[0]?.result) || null;

        if (playerStats) {
          let allPlayerStatsObj = await chrome.storage.local.get(
            "allPlayerStats"
          );
          let allPlayerStats = allPlayerStatsObj.allPlayerStats
            ? allPlayerStatsObj.allPlayerStats
            : [];
          allPlayerStats.push(playerStats);

          await chrome.storage.local.set({ allPlayerStats });

          setPlayerCareerStatsData(allPlayerStats);
        }
        setIsLoading(false);
      });
  };

  useEffect(() => {
    getCareerStats();
  }, []);

  useEffect(() => {
    chrome.storage.local.get(["allPlayerStats"], function (result) {
      console.log("Value currently is " + result.allPlayerStats);
      setPlayerCareerStatsData(result.allPlayerStats);
    });
  }, []);

  return (
    <div className="p-4">
      <h1 className="text-3xl font-bold mb-6">Visual Stats</h1>
      <div className="flex flex-col space-y-6">
        <Card className="flex flex-col space-y-4 p-4" title="Career Stats">
          <div className="flex items-center justify-center">
            {isLoading ? (
              <Loader2 className="h-8 w-8 animate-spin" />
            ) : playerCareerStatsData !== null ? (
              playerCareerStatsData.map((playerStats) => (
                <div key={playerStats.name}>
                  <h2 className="text-xl font-semibold mb-4">
                    {"Career " + selectedStat + " per game"}
                  </h2>
                  <LineChart
                    width={500}
                    height={300}
                    data={playerStats.stats}
                    margin={{
                      top: 5,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={[0, 40]} />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey={selectedStat}
                      stroke="#8884d8"
                      activeDot={{ r: 8 }}
                    />
                  </LineChart>
                </div>
              ))
            ) : (
              <div className="w-[500px] h-[300px] flex justify-center items-center">
                Add a player to visualize their stats
              </div>
            )}
          </div>
          <div className="flex items-center justify-center space-x-2">
            <Button
              onClick={() => setSelectedStat("points")}
              variant={"secondary"}
            >
              Points
            </Button>
            <Button
              onClick={() => setSelectedStat("assists")}
              variant={"secondary"}
            >
              Assists
            </Button>
            <Button
              onClick={() => setSelectedStat("rebounds")}
              variant={"secondary"}
            >
              Rebounds
            </Button>
          </div>
        </Card>
        <Card>
          <PlayerList playerCareerStatsData={playerCareerStatsData} />
        </Card>
      </div>
    </div>
  );
}

export default App;
