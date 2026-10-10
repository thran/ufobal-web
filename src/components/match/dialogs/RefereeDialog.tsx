import Modal from '../../Modal';

interface Props {
  open: boolean;
  players: { pk: number; nickname: string }[];
  value: number | null;
  onSave: (pk: number) => void;
  onClose: () => void;
}

export function RefereeDialog({ open, players, value, onSave, onClose }: Props) {
  if (!open) return null;
  return (
    <Modal open onClose={onClose} title="Volba hlavního rozhodčího">
      <select
        aria-label="Hlavní rozhodčí"
        className="w-full"
        value={value ?? ''}
        onChange={(e) => e.target.value && onSave(Number(e.target.value))}
      >
        <option value="">----</option>
        {players.map((p) => (
          <option key={p.pk} value={p.pk}>
            {p.nickname}
          </option>
        ))}
      </select>
    </Modal>
  );
}
