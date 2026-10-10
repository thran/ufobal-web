import { useState } from 'react';
import type { GoalType } from '../../../api/types';
import type { GoalData } from '../../../domain/matchEvents';
import Modal from '../../Modal';
import { PlayerTiles } from '../PlayerTiles';

interface Props {
  open: boolean;
  teamName: string;
  players: { pk: number; nickname: string }[];
  onSave: (data: GoalData) => void;
  onClose: () => void;
}

function GoalDialogBody({ teamName, players, onSave, onClose }: Omit<Props, 'open'>) {
  const [shooter, setShooter] = useState<number | null>(null);
  const [picked, setPicked] = useState(false);
  const save = (assistance: number | null, goalType: GoalType) => onSave({ shooter, assistance, goalType });

  return (
    <Modal open onClose={onClose} title={`Gól - ${teamName} - ${picked ? 'asistence' : 'střelec'}`}>
      {picked ? (
        <>
          <PlayerTiles
            players={players}
            hiddenPk={shooter}
            onPick={(pk) => save(pk, 'normal')}
            extra={[
              { label: 'nikdo', onClick: () => save(null, 'normal') },
              { label: 'penalta', onClick: () => save(null, 'penalty') },
              { label: 'rozstřel', onClick: () => save(null, 'shootout') },
            ]}
          />
          <button type="button" className="mt-3 underline" onClick={() => setPicked(false)}>
            ‹ zpět na střelce
          </button>
        </>
      ) : (
        <PlayerTiles
          players={players}
          onPick={(pk) => {
            setShooter(pk);
            setPicked(true);
          }}
        />
      )}
    </Modal>
  );
}

export function GoalDialog({ open, ...rest }: Props) {
  return open ? <GoalDialogBody {...rest} /> : null;
}
