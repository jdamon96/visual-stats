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
import { Download, Ellipsis, MessageCircle } from "lucide-react";
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

const roundUpToNearestTen = (num: number) => {
  return Math.ceil(num / 10) * 10;
};

function App() {
  const [playerCareerStatsDataSource, setPlayerCareerStatsDataSource] =
    useState<PlayerStats[] | null>(null);
  const [selectedStat, setSelectedStat] = useState<string>("points");
  const [displayOption, setDisplayOption] = useState<string>("season");
  const [exportedPng, setExportedPng] = useState<string | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  const getMaxStatValue = (
    playerStats: PlayerStats[],
    selectedStat: string
  ) => {
    const maxValue = Math.max(
      ...playerStats.map((player) =>
        Math.max(
          ...player.stats.map(
            (stat) => Number(stat[selectedStat as keyof ChartData]) || 0
          )
        )
      )
    );
    return roundUpToNearestTen(maxValue);
  };

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

  const makeAllSeasonsSetContinuous = (allSeasons: Set<string>) => {
    const seasonYears = Array.from(allSeasons).map((season) =>
      parseInt(season.split("-")[0])
    );
    const minSeasonYear = Math.min(...seasonYears);
    const maxSeasonYear = Math.max(...seasonYears);

    const continuousSeasons = new Set<string>();

    for (let i = minSeasonYear; i <= maxSeasonYear; i++) {
      const formattedSeason = `${i}-${(i + 1).toString().slice(-2)}`;
      continuousSeasons.add(formattedSeason);
    }

    return continuousSeasons;
  };

  /**
   * This function normalizes the player stats data by ensuring that each player has stats for all seasons.
   *
   * This is to ensure that the line chart has a consistent x-axis for all players.
   *
   * If a player does not have stats for a particular season, it adds a record for that season with null stats.
   * It also prunes seasons that no player has stats for, which can occur when a player is added, the stats are normalized, and then the player is subsequently removed.
   */
  function normalizePlayerStatsBySeasonYear(
    playerCareerStatsData: PlayerStats[]
  ): PlayerStats[] {
    // Make a deep copy of the input data
    const copiedPlayerCareerStatsData: PlayerStats[] = JSON.parse(
      JSON.stringify(playerCareerStatsData)
    );

    // Collect all unique seasons from all players
    const allSeasons = new Set<string>();

    copiedPlayerCareerStatsData?.forEach((player) => {
      player.stats.forEach((stat) => {
        allSeasons.add(stat.date);
      });
    });

    console.log(`all seasons: ${JSON.stringify(allSeasons)}`);
    // Make all seasons set continuous
    const continuousSeasons = makeAllSeasonsSetContinuous(allSeasons);

    console.log(`continuous seasons: ${JSON.stringify(continuousSeasons)}`);

    // Ensure each player has all seasons, add missing ones with null stats
    copiedPlayerCareerStatsData?.forEach((player) => {
      const playerSeasons = new Set(player.stats.map((stat) => stat.date));
      continuousSeasons?.forEach((season) => {
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
    return copiedPlayerCareerStatsData;
  }

  function normalizePlayerStatsByRelativeSeasonOfCareer(
    playerCareerStatsData: PlayerStats[]
  ): PlayerStats[] {
    // Make a deep copy of the input data
    const copiedPlayerCareerStatsData: PlayerStats[] = JSON.parse(
      JSON.stringify(playerCareerStatsData)
    );

    const maxSeasons = Math.max(
      ...copiedPlayerCareerStatsData.map((player) => player.stats.length)
    );

    copiedPlayerCareerStatsData.forEach((player) => {
      // Denormalize data by removing seasons with all null stats so that we start counting
      // seasons from the first season with stats
      player.stats = player.stats.filter(
        (stat) =>
          stat.points !== null ||
          stat.assists !== null ||
          stat.rebounds !== null
      );

      player.stats.forEach((stat, index) => {
        stat.date = `Season ${index + 1}`;
      });

      for (let i = player.stats.length; i < maxSeasons; i++) {
        player.stats.push({
          assists: null,
          date: `Season ${i + 1}`,
          points: null,
          rebounds: null,
        });
      }
    });

    return copiedPlayerCareerStatsData;
  }

  const normalizePlayerStats = (
    playerCareerStatsDataSource: PlayerStats[],
    displayOption: string
  ) => {
    if (displayOption === "year") {
      return normalizePlayerStatsBySeasonYear(playerCareerStatsDataSource);
    } else {
      return normalizePlayerStatsByRelativeSeasonOfCareer(
        playerCareerStatsDataSource
      );
    }
  };

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
            const seasonElement = row.querySelector('th[data-stat="season"]');
            let date = "";

            if (seasonElement) {
              date = seasonElement.textContent || "";
            } else {
              const tdElements = row.querySelectorAll("td");
              if (tdElements.length > 0) {
                date = tdElements[0].textContent || "";
              }
            }

            const team =
              row.querySelector('td[data-stat="team_id"]')?.textContent || "";

            if (team === "TOT" || !processedSeasons.has(date)) {
              let points = 0;
              let assists = 0;
              let rebounds = 0;

              if (seasonElement) {
                const pointsElement = getStatElement(row, pointsIndex);
                const assistsElement = getStatElement(row, assistsIndex);
                const reboundsElement = getStatElement(row, reboundsIndex);

                points = getStatValue(pointsElement);
                assists = getStatValue(assistsElement);
                rebounds = getStatValue(reboundsElement);
              }

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
            setPlayerCareerStatsDataSource(allPlayerStats);
          }
        }
      });
  };

  const removePlayer = (playerId: string, displayOption: string) => {
    const updatedPlayerStats = (playerCareerStatsDataSource || []).filter(
      (player) => player.id !== playerId
    );
    setPlayerCareerStatsDataSource(updatedPlayerStats);
    chrome.storage.local.set({ allPlayerStats: updatedPlayerStats });
    setNormalizedPlayerStats(
      normalizePlayerStats(updatedPlayerStats, displayOption)
    );
  };

  const togglePlayerLineVisibility = (
    playerId: string,
    displayOption: string
  ) => {
    const updatedPlayerStats = (playerCareerStatsDataSource || []).map(
      (player) => {
        if (player.id === playerId) {
          player.hideStatus = !player.hideStatus;
        }
        return player;
      }
    );
    setPlayerCareerStatsDataSource(updatedPlayerStats);
    chrome.storage.local.set({ allPlayerStats: updatedPlayerStats });
    setNormalizedPlayerStats(
      normalizePlayerStats(updatedPlayerStats, displayOption)
    );
  };

  useEffect(() => {
    chrome.storage.local.get(["allPlayerStats"], function (result) {
      setPlayerCareerStatsDataSource(result.allPlayerStats);
    });
  }, []);

  const colors = ["#8884d8", "#82ca9d", "#ffc658", "#ff7f50", "#6a5acd"]; // Add more colors if needed
  const [normalizedPlayerStats, setNormalizedPlayerStats] = useState(
    normalizePlayerStats(playerCareerStatsDataSource || [], displayOption)
  );

  useEffect(() => {
    setNormalizedPlayerStats(
      normalizePlayerStats(playerCareerStatsDataSource || [], displayOption)
    );
  }, [playerCareerStatsDataSource, displayOption]);

  const getPlayerImgUrl = (
    playerName: string,
    playerCareerStatsDataSource: PlayerStats[] | null
  ) => {
    if (playerCareerStatsDataSource) {
      const player = playerCareerStatsDataSource.find(
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
      const columns =
        payload.length > 3 ? Math.floor(payload.length / 2) : payload.length;

      return (
        <div
          className="grid gap-2 w-full items-center justify-center"
          style={{
            gridTemplateColumns: `repeat(${columns}, minmax(100px, 1fr))`,
          }}
        >
          {payload.map(
            (entry: {
              color: string;
              payload: { image: string; name: string };
            }) => {
              const playerImgUrl = getPlayerImgUrl(
                entry.payload.name,
                playerCareerStatsDataSource
              );

              return (
                <div
                  key={`item-${entry.payload.name}`}
                  className="flex items-center justify-center space-x-2"
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
                  <span style={{ color: entry.color }} className="text-lg">
                    {entry.payload.name}
                  </span>
                </div>
              );
            }
          )}
        </div>
      );
    };
  }, [playerCareerStatsDataSource]);

  const downloadExportedPng = () => {
    if (exportedPng) {
      const link = document.createElement("a");
      link.href = exportedPng;
      link.download = "chart.png";
      link.click();
    }
  };

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
          {playerCareerStatsDataSource !== null &&
          playerCareerStatsDataSource !== undefined &&
          playerCareerStatsDataSource.length !== 0 ? (
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
                      </div>
                      <DialogFooter className="flex justify-between items-center">
                        <Button
                          className="w-full bg-orange-500 text-white"
                          variant="default"
                          onClick={downloadExportedPng}
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
                      <RadioGroup
                        value={displayOption}
                        onValueChange={(value) => {
                          setDisplayOption(value);

                          setNormalizedPlayerStats(
                            normalizePlayerStats(
                              playerCareerStatsDataSource || [],
                              displayOption
                            )
                          );
                        }}
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="season" id="season" />
                          <Label htmlFor="season">Player Season Number</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="year" id="year" />
                          <Label htmlFor="year">Year</Label>
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
              <div className="w-full">
                <ResponsiveContainer height={600} width="100%">
                  <LineChart
                    margin={{
                      top: 5,
                      right: 0,
                      left: 0,
                      bottom: 0,
                    }}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="date"
                      allowDuplicatedCategory={false}
                      axisLine={{ stroke: "gray" }}
                      height={20}
                    />
                    <YAxis
                      domain={[
                        0,
                        getMaxStatValue(normalizedPlayerStats, selectedStat),
                      ]}
                      axisLine={false}
                      width={20}
                    />
                    <Tooltip />

                    <Legend
                      content={renderLegend}
                      wrapperStyle={{
                        width: "100%",
                        position: "relative",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    />

                    {normalizedPlayerStats?.map((playerStats, index) => {
                      return (
                        <Line
                          key={playerStats.id}
                          hide={playerStats.hideStatus}
                          dot={false}
                          type="monotone"
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
        {playerCareerStatsDataSource !== null &&
          playerCareerStatsDataSource !== undefined && (
            <Card>
              <PlayerList
                playerCareerStatsData={playerCareerStatsDataSource}
                displayOption={displayOption}
                removePlayer={removePlayer}
                togglePlayerLineVisibility={togglePlayerLineVisibility}
              />
            </Card>
          )}
        <button
          className="bg-white border-black border w-full rounded-md flex items-center justify-center space-x-2 py-2 hover:bg-gray-100"
          onClick={() => {
            window.open(
              "https://www.twitter.com/direct_messages/create/visualstats_nba",
              "_blank"
            );
          }}
        >
          <MessageCircle className="h-6 w-6 text-black" />
          <p className="text-lg text-black">Share Feedback</p>
        </button>
      </div>
    </div>
  );
}

export default App;
