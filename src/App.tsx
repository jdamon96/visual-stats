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
import { Ellipsis, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DialogClose } from "@radix-ui/react-dialog";
import { RadioGroup, RadioGroupItem } from "./components/ui/radio-group";
import { Label } from "./components/ui/label";

interface ChartData {
  date: string;
  points: number | null;
  assists: number | null;
  rebounds: number | null;
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
          const getPlayerName = () => {
            return (
              document.querySelector("div#meta h1 span")?.textContent || ""
            );
          };

          const getPlayerImage = () => {
            return (
              document.querySelector(".media-item img")?.getAttribute("src") ||
              ""
            );
          };

          const getTable = () => {
            return document.querySelector("#per_game");
          };

          const getHeaderRow = (table: Element | null) => {
            return table?.querySelector("thead tr");
          };

          const getBodyRows = (table: Element | null) => {
            return table?.querySelectorAll("tbody tr:not(.thead)");
          };

          const getColumnIndex = (
            columnName: string,
            headerRow: Element | null
          ) => {
            return Array.from(headerRow?.children || []).findIndex(
              (th) => th.textContent === columnName
            );
          };

          const getStatElement = (row: Element, index: number) => {
            return row.querySelector(`td:nth-child(${index})`);
          };

          const getStatValue = (element: Element | null) => {
            return element ? parseFloat(element.textContent || "0") : 0;
          };

          const playerName = getPlayerName();
          const playerImage = getPlayerImage();
          const table = getTable();
          const headerRow = getHeaderRow(table) || null;
          const bodyRows = getBodyRows(table);
          let chartDataArray: ChartData[] = [];

          const pointsIndex = getColumnIndex("PTS", headerRow) + 1;
          const assistsIndex = getColumnIndex("AST", headerRow) + 1;
          const reboundsIndex = getColumnIndex("TRB", headerRow) + 1;

          bodyRows?.forEach((row) => {
            const date =
              row.querySelector('th[data-stat="season"]')?.textContent || "";
            const pointsElement = getStatElement(row, pointsIndex);
            const assistsElement = getStatElement(row, assistsIndex);
            const reboundsElement = getStatElement(row, reboundsIndex);

            const points = getStatValue(pointsElement);
            const assists = getStatValue(assistsElement);
            const rebounds = getStatValue(reboundsElement);

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

          // Check if player already exists in the array
          const playerExists = allPlayerStats.some(
            (player: PlayerStats) => player.name === playerStats.name
          );

          // Only add player if they don't already exist in the array
          if (!playerExists) {
            allPlayerStats.push(playerStats);
            await chrome.storage.local.set({ allPlayerStats });
            setPlayerCareerStatsData(allPlayerStats);
          }
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
  const colors = ["#8884d8", "#82ca9d", "#ffc658", "#ff7f50", "#6a5acd"]; // Add more colors if needed
  function normalizePlayerStats(
    playerCareerStatsData: PlayerStats[]
  ): PlayerStats[] {
    // Collect all unique seasons from all players
    const allSeasons = new Set<string>();
    playerCareerStatsData.forEach((player) => {
      player.stats.forEach((stat) => {
        allSeasons.add(stat.date);
      });
    });

    // Ensure each player has all seasons, add missing ones with null stats
    playerCareerStatsData.forEach((player) => {
      console.log(`Processing player: ${player.name}`);
      const playerSeasons = new Set(player.stats.map((stat) => stat.date));
      allSeasons.forEach((season) => {
        if (!playerSeasons.has(season)) {
          console.log(
            `Adding missing season: ${season} for player: ${player.name}`
          );
          player.stats.push({
            assists: null,
            date: season,
            points: null,
            rebounds: null,
          });
        }
      });
      // Print pre-sorted stats
      console.log(`Pre-sorted stats for player: ${player.name}`, player.stats);
      // Sort stats by date to maintain consistency
      console.log(`Sorting stats by date for player: ${player.name}`);
      player.stats.sort((a, b) => a.date.localeCompare(b.date));
      // Print post-sorted stats
      console.log(`Post-sorted stats for player: ${player.name}`, player.stats);
      console.log(`Finished processing player: ${player.name}`);
    });

    return playerCareerStatsData;
  }
  return (
    <div className="p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold mb-6">Visual Stats</h1>
        <Button onClick={getCareerStats}>Add Players Stats</Button>
      </div>
      <div className="flex flex-col space-y-6">
        <Card className="flex flex-col space-y-4 p-4" title="Career Stats">
          <div className="flex items-center justify-center">
            {isLoading ? (
              <Loader2 className="h-8 w-8 animate-spin" />
            ) : playerCareerStatsData !== null ? (
              <div>
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold mb-4 flex items-center justify-center w-full">
                    {`Career ${selectedStat} per game`}
                  </h2>
                  <Dialog>
                    <DialogTrigger asChild>
                      <div className="">
                        <Ellipsis className="h-6 w-6" />
                      </div>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Select Display Option</DialogTitle>
                      </DialogHeader>
                      <RadioGroup defaultValue="year">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="year" id="year" />
                          <Label htmlFor="year">Year</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="season" id="season" />
                          <Label htmlFor="season">Player Season Number</Label>
                        </div>
                      </RadioGroup>
                      <DialogFooter className="sm:justify-start">
                        <DialogClose asChild>
                          <Button type="button" variant="secondary">
                            Close
                          </Button>
                        </DialogClose>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
                <LineChart
                  width={500}
                  height={300}
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
                  {normalizePlayerStats(playerCareerStatsData).map(
                    (playerStats, index) => {
                      console.log(playerStats.stats, playerStats.name);
                      return (
                        <Line
                          key={playerStats.name}
                          type="monotone"
                          dataKey={selectedStat}
                          data={playerStats.stats}
                          name={playerStats.name}
                          stroke={colors[index % colors.length]}
                          activeDot={{ r: 8 }}
                        />
                      );
                    }
                  )}
                </LineChart>
              </div>
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
              className={
                selectedStat === "points" ? "bg-blue-500 text-white" : ""
              }
            >
              Points
            </Button>
            <Button
              onClick={() => setSelectedStat("assists")}
              variant={"secondary"}
              className={selectedStat === "assists" ? "bg-blue-500" : ""}
            >
              Assists
            </Button>
            <Button
              onClick={() => setSelectedStat("rebounds")}
              variant={"secondary"}
              className={selectedStat === "rebounds" ? "bg-blue-500" : ""}
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
