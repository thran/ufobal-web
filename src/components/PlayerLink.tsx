import { Link } from 'react-router';
import { playerPath } from '../paths';

const SIGNS: Record<string, string> = { man: '♂', woman: '♀' };

export default function PlayerLink({
  player,
}: {
  player: { pk: number; nickname: string; gender: string | null };
}) {
  const sign = player.gender ? SIGNS[player.gender] : undefined;
  return (
    <Link to={playerPath(player)}>
      {sign && <span aria-hidden="true">{sign} </span>}
      {player.nickname}
    </Link>
  );
}
