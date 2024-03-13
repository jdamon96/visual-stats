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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DialogClose } from "@radix-ui/react-dialog";
import { RadioGroup, RadioGroupItem } from "./components/ui/radio-group";
import { Label } from "./components/ui/label";
import { v4 as uuidv4 } from "uuid";

interface ChartData {
  date: string;
  points: number | null;
  assists: number | null;
  rebounds: number | null;
}

export interface PlayerStats {
  name: string;
  id: string;
  image: string;
  hideStatus: boolean;
  stats: ChartData[];
}

function App() {
  const [playerCareerStatsData, setPlayerCareerStatsData] = useState<
    PlayerStats[] | null
  >(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedStat, setSelectedStat] = useState<string>("points");

  const getCareerStats = async () => {
    console.log("getCareerStats function started");
    setIsLoading(true);
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    console.log("Active tab queried: ", tab);

    const playerPageRegex =
      /https:\/\/www\.basketball-reference\.com\/players\/[a-z]\/[a-z]+[0-9]+\.html/;
    if (!playerPageRegex.test(tab.url!)) {
      console.log("URL does not match player page regex, exiting function");
      setIsLoading(false);
      return;
    }

    chrome.scripting
      .executeScript({
        target: { tabId: tab.id! },
        func: () => {
          console.log("Executing script in tab");
          const getPlayerName = () => {
            const playerName =
              document.querySelector("div#meta h1 span")?.textContent || "";
            console.log("Player name: ", playerName);
            return playerName;
          };

          const getPlayerImage = () => {
            const playerImage =
              document.querySelector(".media-item img")?.getAttribute("src") ||
              "";
            console.log("Player image: ", playerImage);
            return playerImage;
          };

          const getTable = () => {
            const table = document.querySelector("#per_game");
            console.log("Table element: ", table);
            return table;
          };

          const getHeaderRow = (table: Element | null) => {
            const headerRow = table?.querySelector("thead tr");
            console.log("Header row: ", headerRow);
            return headerRow;
          };

          const getBodyRows = (table: Element | null) => {
            const bodyRows = table?.querySelectorAll("tbody tr:not(.thead)");
            console.log("Body rows: ", bodyRows);
            return bodyRows;
          };

          const getColumnIndex = (
            columnName: string,
            headerRow: Element | null
          ) => {
            const columnIndex = Array.from(headerRow?.children || []).findIndex(
              (th) => th.textContent === columnName
            );
            console.log(`Column index for ${columnName}: `, columnIndex);
            return columnIndex;
          };

          const getStatElement = (row: Element, index: number) => {
            const statElement = row.querySelector(`td:nth-child(${index})`);
            console.log(`Stat element for index ${index}: `, statElement);
            return statElement;
          };

          const getStatValue = (element: Element | null) => {
            const statValue = element
              ? parseFloat(element.textContent || "0")
              : 0;
            console.log("Stat value: ", statValue);
            return statValue;
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

          const playerData = {
            name: playerName,
            id: crypto.randomUUID(),
            image: playerImage,
            hideStatus: false,
            stats: chartDataArray,
          };

          console.log("Player Data: ", playerData);

          return playerData;
        },
      })
      .then(async (results) => {
        console.log("Processing results: ", results);
        const playerStats = (results && results[0]?.result) || null;

        if (playerStats) {
          console.log("Player stats found: ", playerStats);
          let allPlayerStatsObj = await chrome.storage.local.get(
            "allPlayerStats"
          );
          console.log("All player stats object: ", allPlayerStatsObj);
          let allPlayerStats = allPlayerStatsObj.allPlayerStats
            ? allPlayerStatsObj.allPlayerStats
            : [];

          // Check if player already exists in the array
          const playerExists = allPlayerStats.some(
            (player: PlayerStats) => player.name === playerStats.name
          );
          console.log("Player exists: ", playerExists);

          // Only add player if they don't already exist in the array
          if (!playerExists) {
            console.log("Adding new player to the stats");
            allPlayerStats.push(playerStats);
            await chrome.storage.local.set({ allPlayerStats });
            setPlayerCareerStatsData(allPlayerStats);
          }
        }
        setIsLoading(false);
        console.log("Loading status set to false");
      });
  };

  const removePlayer = (playerId: string) => {
    const updatedPlayerStats = (playerCareerStatsData || []).filter(
      (player) => player.id !== playerId
    );
    setPlayerCareerStatsData(updatedPlayerStats);
    chrome.storage.local.set({ allPlayerStats: updatedPlayerStats });
  };

  const togglePlayerLineVisibility = (playerId: string) => {
    const updatedPlayerStats = (playerCareerStatsData || []).map((player) => {
      if (player.id === playerId) {
        player.hideStatus = !player.hideStatus;
      }
      return player;
    });
    setPlayerCareerStatsData(updatedPlayerStats);
    chrome.storage.local.set({ allPlayerStats: updatedPlayerStats });
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
    playerCareerStatsData?.forEach((player) => {
      player.stats.forEach((stat) => {
        allSeasons.add(stat.date);
      });
    });

    // Ensure each player has all seasons, add missing ones with null stats
    playerCareerStatsData?.forEach((player) => {
      console.log(`Processing player: ${player.name}`);
      const playerSeasons = new Set(player.stats.map((stat) => stat.date));
      allSeasons?.forEach((season) => {
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
                  {normalizePlayerStats(playerCareerStatsData)?.map(
                    (playerStats, index) => {
                      console.log(playerStats.stats, playerStats.name);
                      return (
                        <Line
                          key={playerStats.id}
                          hide={playerStats.hideStatus}
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
          <PlayerList
            playerCareerStatsData={playerCareerStatsData}
            removePlayer={removePlayer}
            togglePlayerLineVisibility={togglePlayerLineVisibility}
          />
        </Card>
      </div>
    </div>
  );
}

export default App;
