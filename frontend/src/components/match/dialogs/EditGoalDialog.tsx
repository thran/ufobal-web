import { useState } from 'react';
import type { GoalType } from '../../../api/types';
import type { GoalData, MatchEvent } from '../../../domain/matchEvents';
import { isValidHms } from '../../../domain/time';
import { FieldError, useValidation } from '../../forms/validation';
import Modal from '../../Modal';

interface Props {
  open: boolean;
  teamName: string;
  players: { pk: number; nickname: string }[];
  event: MatchEvent;
  onSave: (time: string, data: GoalData) => void;
  onClose: () => void;
}

const GOAL_TYPES: { id: GoalType; text: string }[] = [
  { id: 'normal', text: 'Běžný' },
  { id: 'penalty', text: 'Penalta' },
  { id: 'shootout', text: 'Penaltový rozstřel' },
];

const toPk = (v: string) => (v === '' ? null : Number(v));

function EditGoalBody({ teamName, players, event, onSave, onClose }: Omit<Props, 'open'>) {
  const initial = event.data as GoalData;
  const [time, setTime] = useState(event.time);
  const [shooter, setShooter] = useState(initial.shooter);
  const [assistance, setAssistance] = useState(initial.assistance);
  const [goalType, setGoalType] = useState<GoalType>(initial.goalType);
  const valid = isValidHms(time);
  const v = useValidation({ shooter: shooter == null && 'Vyber střelce.' });

  const playerOptions = players.map((p) => (
    <option key={p.pk} value={p.pk}>
      {p.nickname}
    </option>
  ));

  return (
    <Modal open onClose={onClose} title={`Gól - ${teamName}`}>
      <div className="flex flex-col gap-3">
        <label className="flex flex-col">
          Čas
          <input type="text" className="input" value={time} onChange={(e) => setTime(e.target.value)} />
        </label>
        {!valid && <p className="text-alert">Neplatný čas (HH:MM:SS).</p>}
        <label className="flex flex-col">
          Střelec
          <select
            className="input"
            value={shooter ?? ''}
            onChange={(e) => setShooter(toPk(e.target.value))}
            onBlur={v.touch('shooter')}
            aria-invalid={!!v.error('shooter')}
          >
            <option value="">----</option>
            {playerOptions}
          </select>
        </label>
        <FieldError error={v.error('shooter')} />
        <label className="flex flex-col">
          Asistence
          <select
            className="input"
            value={assistance ?? ''}
            onChange={(e) => setAssistance(toPk(e.target.value))}
          >
            <option value="">----</option>
            {playerOptions}
          </select>
        </label>
        <label className="flex flex-col">
          Typ gólu
          <select
            className="input"
            value={goalType}
            onChange={(e) => setGoalType(e.target.value as GoalType)}
          >
            {GOAL_TYPES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.text}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="pressbutton"
          disabled={!valid}
          onClick={() => v.attempt() && onSave(time, { shooter, assistance, goalType })}
        >
          Upravit
        </button>
      </div>
    </Modal>
  );
}

export function EditGoalDialog({ open, ...rest }: Props) {
  return open ? <EditGoalBody {...rest} /> : null;
}
