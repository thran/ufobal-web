import Modal from '../../Modal';
import { PlayerTiles } from '../PlayerTiles';

interface Props {
  open: boolean;
  teamName: string;
  players: { pk: number; nickname: string }[];
  /** Excluded from the choices: changing to the goalie already in goal is a no-op. */
  currentGoalie?: number | null;
  onSave: (goalie: number) => void;
  onClose: () => void;
}

export function GoalieChangeDialog({ open, teamName, players, currentGoalie, onSave, onClose }: Props) {
  if (!open) return null;
  return (
    <Modal open onClose={onClose} title={`Změna brankáře - ${teamName}`}>
      <PlayerTiles players={players.filter((p) => p.pk !== currentGoalie)} onPick={onSave} />
    </Modal>
  );
}
