import { useState } from 'react';
import type { CardType } from '../../../api/types';
import { CARDS, type MatchEvent, type PenaltyData } from '../../../domain/matchEvents';
import { isValidHms } from '../../../domain/time';
import { FieldError, useValidation } from '../../forms/validation';
import Modal from '../../Modal';

interface Props {
  open: boolean;
  teamName: string;
  players: { pk: number; nickname: string }[];
  event: MatchEvent;
  onSave: (time: string, data: PenaltyData) => void;
  onClose: () => void;
}

function EditPenaltyBody({ teamName, players, event, onSave, onClose }: Omit<Props, 'open'>) {
  const initial = event.data as PenaltyData;
  const [time, setTime] = useState(event.time);
  const [player, setPlayer] = useState(initial.player);
  const [card, setCard] = useState<CardType>(initial.card);
  const [reason, setReason] = useState(initial.reason);
  const valid = isValidHms(time);
  const reasonTrimmed = reason.trim();
  const v = useValidation({ reason: !reasonTrimmed && 'Vyplň odůvodnění.' });

  return (
    <Modal open onClose={onClose} title={`Karta - ${teamName}`}>
      <div className="flex flex-col gap-3">
        <label className="flex flex-col">
          Čas
          <input type="text" className="input" value={time} onChange={(e) => setTime(e.target.value)} />
        </label>
        {!valid && <p className="text-alert">Neplatný čas (HH:MM:SS).</p>}
        <label className="flex flex-col">
          Hráč
          <select className="input" value={player} onChange={(e) => setPlayer(Number(e.target.value))}>
            {players.map((p) => (
              <option key={p.pk} value={p.pk}>
                {p.nickname}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col">
          Karta
          <select className="input" value={card} onChange={(e) => setCard(e.target.value as CardType)}>
            {CARDS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.text}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col">
          Odůvodnění
          <textarea
            className="input"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            onBlur={v.touch('reason')}
            aria-invalid={!!v.error('reason')}
          />
        </label>
        <FieldError error={v.error('reason')} />
        <button
          type="button"
          className="pressbutton"
          disabled={!valid}
          onClick={() => v.attempt() && onSave(time, { player, card, reason: reasonTrimmed })}
        >
          Upravit
        </button>
      </div>
    </Modal>
  );
}

export function EditPenaltyDialog({ open, ...rest }: Props) {
  return open ? <EditPenaltyBody {...rest} /> : null;
}
