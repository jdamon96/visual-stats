import { Button } from "../components/ui/button";
import { EyeIcon, EyeOffIcon, Trash } from "lucide-react";
import { PlayerStats } from "@/App";

interface PlayerListItemProps {
  avatarImgSrcUrl: string;
  playerName: string;
  playerBballRefUrl: string;
  playerId: string;
  playerHideStatus: boolean;
  removePlayer: (playerId: string) => void;
  togglePlayerLineVisibility: (playerId: string) => void;
}

const PlayerListItem: React.FC<PlayerListItemProps> = ({
  avatarImgSrcUrl,
  playerName,
  playerBballRefUrl,
  playerId,
  playerHideStatus,
  removePlayer,
  togglePlayerLineVisibility,
}) => {
  return (
    <div className="flex items-center justify-between mt-4">
      <div className="flex items-center justify-center">
        <div className="h-16 w-16 rounded-full border-gray-300 border-2 overflow-hidden">
          <img
            src={avatarImgSrcUrl}
            alt="Player Avatar"
            className="transform -translate-y-4 scale-[0.65] object-cover object-top"
          />
        </div>
        <a
          href={playerBballRefUrl}
          className="ml-2 font-semibold text-lg hover:underline"
        >
          {playerName}
        </a>
      </div>
      <div className="flex space-x-2">
        <Button
          className=""
          variant="outline"
          onClick={() => togglePlayerLineVisibility(playerId)}
        >
          {playerHideStatus ? (
            <EyeOffIcon className="h-4 w-4" />
          ) : (
            <EyeIcon className="h-4 w-4" />
          )}
        </Button>
        <Button variant="outline" onClick={() => removePlayer(playerId)}>
          <Trash className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

interface PlayerListProps {
  playerCareerStatsData: PlayerStats[] | null;
  removePlayer: (playerId: string) => void;
  togglePlayerLineVisibility: (playerId: string) => void;
}

export default function PlayerList({
  playerCareerStatsData,
  removePlayer,
  togglePlayerLineVisibility,
}: PlayerListProps) {
  return (
    <div className="">
      <div className=" p-6 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Players</h2>
        {playerCareerStatsData &&
          playerCareerStatsData.map((playerStats) => (
            <PlayerListItem
              avatarImgSrcUrl={playerStats.image}
              playerName={playerStats.name}
              playerBballRefUrl={playerStats.bballRefUrl}
              playerId={playerStats.id}
              playerHideStatus={playerStats.hideStatus}
              key={playerStats.id}
              removePlayer={removePlayer}
              togglePlayerLineVisibility={togglePlayerLineVisibility}
            />
          ))}
      </div>
    </div>
  );
}
