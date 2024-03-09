import { Button } from "../components/ui/button";
import { AvatarImage, AvatarFallback, Avatar } from "../components/ui/avatar";
import { EyeIcon, EyeOffIcon, Trash } from "lucide-react";

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
          <AvatarImage alt={playerName} src={avatarImgSrcUrl} />
          <AvatarFallback>CN</AvatarFallback>
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

export default function PlayerList() {
  return (
    <div className="">
      <div className=" p-6 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Players</h2>

        <PlayerListItem
          avatarImgSrcUrl="/placeholder.svg?height=40&width=40"
          playerName="LeBron James"
        />
        <PlayerListItem
          avatarImgSrcUrl="/placeholder.svg?height=40&width=40"
          playerName="Stephen Curry"
        />
      </div>
    </div>
  );
}
