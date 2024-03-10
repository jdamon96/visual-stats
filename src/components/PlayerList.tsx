import { Button } from "../components/ui/button";
import { AvatarImage, AvatarFallback, Avatar } from "../components/ui/avatar";
import { EyeIcon, EyeOffIcon, Trash } from "lucide-react";
import { PlayerStats } from "@/App";

interface PlayerListItemProps {
  avatarImgSrcUrl: string;
  playerName: string;
}

const PlayerListItem: React.FC<PlayerListItemProps> = ({
  avatarImgSrcUrl,
  playerName,
}) => {
  return (
    <div className="flex items-center justify-between mt-4">
      <div className="flex items-center justify-center">
        <Avatar>
          <AvatarImage
            alt={playerName}
            // src={avatarImgSrcUrl}
            asChild
          >
            <img
              src={avatarImgSrcUrl}
              alt={playerName}
              style={{ objectFit: "cover", height: "100%", width: "100%" }}
            />
          </AvatarImage>
          <AvatarFallback>
            {playerName
              .split(" ")
              .map((name) => name[0])
              .join("")}
          </AvatarFallback>
        </Avatar>
        <span className="ml-2">{playerName}</span>
      </div>
      <div className="flex space-x-2">
        <Button className="" variant="outline">
          <EyeIcon className="h-4 w-4" />
        </Button>
        <Button variant="outline">
          <Trash className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

interface PlayerListProps {
  playerCareerStatsData: PlayerStats[] | null;
}

export default function PlayerList({ playerCareerStatsData }: PlayerListProps) {
  return (
    <div className="">
      <div className=" p-6 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Players</h2>
        {playerCareerStatsData &&
          playerCareerStatsData.map((playerStats) => (
            <PlayerListItem
              avatarImgSrcUrl={playerStats.image}
              playerName={playerStats.name}
            />
          ))}
      </div>
    </div>
  );
}
