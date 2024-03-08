import { useEffect, useState, FC } from "react";
import { LineChart } from "@tremor/react";

interface PlayerStat {
  season: string;
  PTS: number | null;
}

interface PlayerStatsLineChartProps {
  tableId: string;
}

const PlayerStatsLineChart: FC<PlayerStatsLineChartProps> = ({ tableId }) => {
  const [parsedPlayerStats, setParsedPlayerStats] = useState<PlayerStat[]>([]);

  useEffect(() => {
    const parsePlayerStats = (tableId: string): PlayerStat[] => {
      console.log(`Parsing player stats for tableId: ${tableId}`);
      const table = document.getElementById(tableId);
      if (!table) {
        console.error("Table not found");
        return [];
      }

      const headers = table.querySelectorAll("thead th");
      let ptsIndex = -1;

      headers.forEach((th, index) => {
        if (th.textContent === "PTS") ptsIndex = index - 1;
      });

      console.log(`PTS index found at: ${ptsIndex}`);

      if (ptsIndex === -1) {
        console.error("PTS column not found");
        return [];
      }

      const rows = table.querySelectorAll("tbody tr");
      const parsedStats: PlayerStat[] = [];

      rows.forEach((row) => {
        const seasonElement = row.querySelector("th");
        const season =
          seasonElement && seasonElement.textContent
            ? seasonElement.textContent
            : "N/A";
        const cells = row.querySelectorAll("td");
        const pts =
          cells[ptsIndex] && cells[ptsIndex].textContent
            ? parseFloat(cells[ptsIndex].textContent || "")
            : null;
        console.log(`Parsed season: ${season}, PTS: ${pts}`);
        parsedStats.push({ season, PTS: pts });
      });

      console.log(`Parsed stats: ${JSON.stringify(parsedStats)}`);
      return parsedStats;
    };

    const stats = parsePlayerStats(tableId);
    setParsedPlayerStats(stats);
  }, [tableId]);

  const chartData = parsedPlayerStats.map((stat) => ({
    date: stat.season,
    PlayerStats: stat.PTS,
  }));

  const dataFormatter = (number: number) => `${number} pts`;

  return (
    <LineChart
      className="h-80"
      data={chartData}
      index="date"
      categories={["PlayerStats"]}
      colors={["indigo"]}
      valueFormatter={dataFormatter}
      yAxisWidth={60}
      onValueChange={(v) => console.log(v)}
    />
  );
};

export default PlayerStatsLineChart;
