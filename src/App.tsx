import { useEffect, useMemo, useRef, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import PlayerList from "./components/PlayerList";
import { Card } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Download, Ellipsis } from "lucide-react";
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
import html2canvas from "html2canvas-pro";

interface ChartData {
  date: string;
  points: number | null;
  assists: number | null;
  rebounds: number | null;
}

export interface PlayerStats {
  name: string;
  bballRefUrl: string;
  id: string;
  image: string;
  hideStatus: boolean;
  stats: ChartData[];
}

function App() {
  const [playerCareerStatsData, setPlayerCareerStatsData] = useState<
    PlayerStats[] | null
  >(null);

  const [selectedStat, setSelectedStat] = useState<string>("points");
  const chartRef = useRef<HTMLDivElement>(null);
  const [exportedPng, setExportedPng] = useState<string | null>(null);

  const setPng = async () => {
    if (chartRef.current) {
      const canvas = await html2canvas(chartRef.current, {
        allowTaint: true,
        scale: 4,
      });
      const png = canvas.toDataURL("image/png", 1.0);
      setExportedPng(png);
    }
  };

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
      const playerSeasons = new Set(player.stats.map((stat) => stat.date));
      allSeasons?.forEach((season) => {
        if (!playerSeasons.has(season)) {
          player.stats.push({
            assists: null,
            date: season,
            points: null,
            rebounds: null,
          });
        }
      });

      // Sort the player's stats array by date after adding missing seasons
      player.stats.sort((a, b) => a.date.localeCompare(b.date));
    });

    // Prune seasons that no player has stats for
    const seasonsWithStats = new Set<string>();
    playerCareerStatsData?.forEach((player) => {
      player.stats.forEach((stat) => {
        if (
          stat.points !== null ||
          stat.assists !== null ||
          stat.rebounds !== null
        ) {
          seasonsWithStats.add(stat.date);
        }
      });
    });

    allSeasons.forEach((season) => {
      if (!seasonsWithStats.has(season)) {
        playerCareerStatsData?.forEach((player) => {
          player.stats = player.stats.filter((stat) => stat.date !== season);
        });
      }
    });

    return playerCareerStatsData;
  }

  const getCareerStats = async () => {
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    const playerPageRegex =
      /https:\/\/www\.basketball-reference\.com\/players\/[a-z]\/[a-z]+[0-9]+\.html/;
    if (!playerPageRegex.test(tab.url!)) {
      return;
    }

    chrome.scripting
      .executeScript({
        target: { tabId: tab.id! },
        func: () => {
          const getPlayerName = () => {
            const playerName =
              document.querySelector("div#meta h1 span")?.textContent || "";

            return playerName;
          };

          const getPlayerImage = () => {
            const playerImage =
              document.querySelector(".media-item img")?.getAttribute("src") ||
              "";

            return playerImage;
          };

          const getTable = () => {
            const table = document.querySelector("#per_game");

            return table;
          };

          const getHeaderRow = (table: Element | null) => {
            const headerRow = table?.querySelector("thead tr");

            return headerRow;
          };

          const getBodyRows = (table: Element | null) => {
            const bodyRows = table?.querySelectorAll("tbody tr:not(.thead)");

            return bodyRows;
          };

          const getColumnIndex = (
            columnName: string,
            headerRow: Element | null
          ) => {
            const columnIndex = Array.from(headerRow?.children || []).findIndex(
              (th) => th.textContent === columnName
            );

            return columnIndex;
          };

          const getStatElement = (row: Element, index: number) => {
            const statElement = row.querySelector(`td:nth-child(${index})`);

            return statElement;
          };

          const getStatValue = (element: Element | null) => {
            const statValue = element
              ? parseFloat(element.textContent || "0")
              : 0;

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

          const processedSeasons: Set<string> = new Set();

          bodyRows?.forEach((row) => {
            const date =
              row.querySelector('th[data-stat="season"]')?.textContent || "";
            const team =
              row.querySelector('td[data-stat="team_id"]')?.textContent || "";

            if (team === "TOT" || !processedSeasons.has(date)) {
              const pointsElement = getStatElement(row, pointsIndex);
              const assistsElement = getStatElement(row, assistsIndex);
              const reboundsElement = getStatElement(row, reboundsIndex);

              const points = getStatValue(pointsElement);
              const assists = getStatValue(assistsElement);
              const rebounds = getStatValue(reboundsElement);

              chartDataArray.push({ date, points, assists, rebounds });
              processedSeasons.add(date);
            }
          });

          const playerData = {
            name: playerName,
            bballRefUrl: window.location.href,
            id: crypto.randomUUID(),
            image: playerImage,
            hideStatus: false,
            stats: chartDataArray,
          };

          return playerData;
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
      });
  };

  const removePlayer = (playerId: string) => {
    const updatedPlayerStats = (playerCareerStatsData || []).filter(
      (player) => player.id !== playerId
    );
    const normalizedUpdatedPlayerStats =
      normalizePlayerStats(updatedPlayerStats);
    setPlayerCareerStatsData(normalizedUpdatedPlayerStats);
    chrome.storage.local.set({ allPlayerStats: normalizedUpdatedPlayerStats });
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
      setPlayerCareerStatsData(result.allPlayerStats);
    });
  }, []);

  const colors = ["#8884d8", "#82ca9d", "#ffc658", "#ff7f50", "#6a5acd"]; // Add more colors if needed
  const [normalizedPlayerStats, setNormalizedPlayerStats] = useState(
    normalizePlayerStats(playerCareerStatsData || [])
  );

  useEffect(() => {
    console.log(
      `playerCareerStatsData`,
      JSON.stringify(playerCareerStatsData, null, 2)
    );
    setNormalizedPlayerStats(normalizePlayerStats(playerCareerStatsData || []));
  }, [playerCareerStatsData]);

  const getPlayerImgUrl = (
    playerName: string,
    playerCareerStatsData: PlayerStats[] | null
  ) => {
    if (playerCareerStatsData) {
      const player = playerCareerStatsData.find(
        (player) => player.name === playerName
      );
      return player?.image;
    }
  };

  //@ts-ignore
  const renderLegend = useMemo(() => {
    //@ts-ignore
    return (props) => {
      const { payload } = props;
      console.log(JSON.stringify(payload, null, 2));

      return (
        <div className="flex w-full items-center justify-center space-x-2 py-4">
          {payload.map(
            (
              entry: {
                color: string;
                payload: { image: string; name: string };
              },
              index: number
            ) => {
              const playerImgUrl = getPlayerImgUrl(
                entry.payload.name,
                playerCareerStatsData
              );

              return (
                <div
                  key={`item-${index}`}
                  className="flex items-center space-x-2"
                >
                  <div
                    className="h-8 w-8 rounded-full border-2"
                    style={{
                      borderColor: entry.color,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <img
                      src={playerImgUrl}
                      alt={entry.payload.name}
                      className="h-6 w-6 rounded-full object-cover"
                    />
                  </div>
                  <span style={{ color: entry.color }}>
                    {entry.payload.name}
                  </span>
                </div>
              );
            }
          )}
        </div>
      );
    };
  }, [playerCareerStatsData]);

  return (
    <div className="p-4">
      <div className="flex items-center justify-between pb-4">
        <h1 className="text-3xl font-bold">Visual Stats</h1>
        <Button className="bg-orange-500 text-white" onClick={getCareerStats}>
          Add Player
        </Button>
      </div>

      <div className="flex flex-col space-y-6">
        <Card
          className="flex flex-col space-y-4 p-4"
          title="Career Stats"
          ref={chartRef}
        >
          {playerCareerStatsData !== null &&
          playerCareerStatsData !== undefined &&
          playerCareerStatsData.length !== 0 ? (
            <>
              <div className="w-full flex items-center justify-between pb-4 pt-2 px-4">
                <h2 className="text-xl font-semibold flex items-center justify-start w-full">
                  {`Career ${selectedStat} per game`}
                </h2>
                <div
                  className="flex items-center justify-center space-x-2"
                  data-html2canvas-ignore="true"
                >
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        className="p-2"
                        variant={"outline"}
                        onClick={async () => {
                          const png = await setPng();
                        }}
                      >
                        <Download className="h-4 w-4 text-gray-500" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader className="border-b border-gray-200">
                        <DialogTitle className="pb-4">
                          Download Your Chart
                        </DialogTitle>
                      </DialogHeader>
                      <div className="pb-4 border-b border-gray-200">
                        <div className="h-[450px] w-full flex items-center justify-center">
                          {exportedPng ? (
                            <img src={exportedPng} alt="Exported Chart" />
                          ) : (
                            <p>Loading...</p>
                          )}
                        </div>
                        <div>
                          <label className="text-sm text-gray-500">
                            Background
                          </label>
                          <div className="flex space-x-2">
                            <Button
                              className="h-4 w-4 bg-red-500 rounded-full"
                              onClick={() =>
                                console.log("Red background selected")
                              }
                            />
                            <button
                              className="h-4 w-4 bg-green-500 rounded-full"
                              onClick={() =>
                                console.log("Green background selected")
                              }
                            />
                            <button
                              className="h-4 w-4 bg-orange-500 rounded-full"
                              onClick={() =>
                                console.log("Blue background selected")
                              }
                            />
                          </div>
                        </div>
                      </div>
                      <DialogFooter className="flex justify-between items-center">
                        <Button
                          className="w-full bg-orange-500 text-white"
                          variant="default"
                        >
                          Download
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button className="p-2" variant={"outline"}>
                        <Ellipsis className="h-4 w-4 text-gray-500" />
                      </Button>
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
              </div>
              <div className="w-full -ml-4">
                <ResponsiveContainer height={400} width="100%">
                  <LineChart
                    margin={{
                      top: 0,
                      right: 0,
                      left: 0,
                      bottom: 0,
                    }}
                  >
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="date"
                      allowDuplicatedCategory={false}
                      axisLine={{ stroke: "gray" }}
                    />
                    <YAxis
                      domain={
                        selectedStat === "points"
                          ? [0, 40]
                          : selectedStat === "assists"
                          ? [0, 20]
                          : [0, 30]
                      }
                      axisLine={false}
                    />
                    <Tooltip />
                    <Legend content={renderLegend} />
                    {normalizedPlayerStats?.map((playerStats, index) => {
                      return (
                        <Line
                          key={playerStats.id}
                          hide={playerStats.hideStatus}
                          dot={false}
                          type="natural"
                          dataKey={selectedStat}
                          data={playerStats.stats}
                          name={playerStats.name}
                          stroke={colors[index % colors.length]}
                          strokeWidth={3}
                        />
                      );
                    })}
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div
                className="flex items-center justify-center space-x-2 pt-4"
                data-html2canvas-ignore="true"
              >
                <Button
                  onClick={() => setSelectedStat("points")}
                  variant={"secondary"}
                  className={
                    selectedStat === "points" ? "bg-orange-500 text-white" : ""
                  }
                >
                  Points
                </Button>
                <Button
                  onClick={() => setSelectedStat("assists")}
                  variant={"secondary"}
                  className={
                    selectedStat === "assists" ? "bg-orange-500 text-white" : ""
                  }
                >
                  Assists
                </Button>
                <Button
                  onClick={() => setSelectedStat("rebounds")}
                  variant={"secondary"}
                  className={
                    selectedStat === "rebounds"
                      ? "bg-orange-500 text-white"
                      : ""
                  }
                >
                  Rebounds
                </Button>
              </div>
            </>
          ) : (
            <div className="w-full h-[300px] flex flex-col space-y-2 justify-center items-center">
              <p className="text-lg text-center">
                Go to a player's basketball reference page and click "Add
                Player" to get started.
              </p>
              <p className="text-lg text-center">
                For example, try with{" "}
                <a
                  href="https://www.basketball-reference.com/players/j/jamesle01.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "blue", textDecoration: "underline" }}
                >
                  LeBron James
                </a>
              </p>
            </div>
          )}
        </Card>
        {playerCareerStatsData !== null &&
          playerCareerStatsData !== undefined && (
            <Card>
              <PlayerList
                playerCareerStatsData={playerCareerStatsData}
                removePlayer={removePlayer}
                togglePlayerLineVisibility={togglePlayerLineVisibility}
              />
            </Card>
          )}
      </div>
    </div>
  );
}

export default App;
