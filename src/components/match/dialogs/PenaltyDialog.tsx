import { useState } from 'react';
import type { CardType } from '../../../api/types';
import { CARDS, PENALTY_REASONS, type PenaltyData } from '../../../domain/matchEvents';
import Modal from '../../Modal';
import { PlayerTiles } from '../PlayerTiles';

interface Props {
  open: boolean;
  teamName: string;
  players: { pk: number; nickname: string }[];
  onSave: (data: PenaltyData) => void;
  onClose: () => void;
}

function PenaltyDialogBody({ teamName, players, onSave, onClose }: Omit<Props, 'open'>) {
  const [player, setPlayer] = useState<number | null>(null);
  const [card, setCard] = useState<CardType>('yellow');
  const [reason, setReason] = useState('');
  const [extra, setExtra] = useState('');
  const extraTrimmed = extra.trim();
  const nickname = players.find((p) => p.pk === player)?.nickname;

  return (
    <Modal
      open
      onClose={onClose}
      title={nickname ? `Karta - ${teamName} - ${nickname}` : `Karta - ${teamName}`}
    >
      {player == null ? (
        <PlayerTiles players={players} onPick={setPlayer} />
      ) : (
        <div className="flex flex-col gap-3">
          <label className="flex flex-col">
            Karta
            <select value={card} onChange={(e) => setCard(e.target.value as CardType)}>
              {CARDS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.text}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col">
            Odůvodnění
            <select value={reason} onChange={(e) => setReason(e.target.value)}>
              <option value="">----</option>
              {PENALTY_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
          <input
            type="text"
            aria-label="dodatečné info"
            placeholder="dodatečné info"
            value={extra}
            onChange={(e) => setExtra(e.target.value)}
          />
          <button
            type="button"
            className="pressbutton"
            disabled={!reason}
            onClick={() =>
              onSave({ player, card, reason: extraTrimmed ? `${reason} - ${extraTrimmed}` : reason })
            }
          >
            Udělit
          </button>
        </div>
      )}
    </Modal>
  );
}

export function PenaltyDialog({ open, ...rest }: Props) {
  return open ? <PenaltyDialogBody {...rest} /> : null;
}
