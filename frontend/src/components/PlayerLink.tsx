import { Link } from 'react-router';
import { playerPath } from '../paths';

const SIGNS: Record<string, string> = { man: '♂', woman: '♀' };

export default function PlayerLink({
  player,
  label,
}: {
  player: { pk: number; nickname: string; gender: string | null };
  /** Text shown instead of the nickname. */
  label?: string;
}) {
  const sign = player.gender ? SIGNS[player.gender] : undefined;
  return (
    <Link to={playerPath(player)}>
      {sign && <span aria-hidden="true">{sign} </span>}
      {label ?? player.nickname}
    </Link>
  );
}
