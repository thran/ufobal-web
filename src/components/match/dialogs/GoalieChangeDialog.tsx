import Modal from '../../Modal';
import { PlayerTiles } from '../PlayerTiles';

interface Props {
  open: boolean;
  teamName: string;
  players: { pk: number; nickname: string }[];
  onSave: (goalie: number) => void;
  onClose: () => void;
}

export function GoalieChangeDialog({ open, teamName, players, onSave, onClose }: Props) {
  if (!open) return null;
  return (
    <Modal open onClose={onClose} title={`Změna brankáře - ${teamName}`}>
      <PlayerTiles players={players} onPick={onSave} />
    </Modal>
  );
}
