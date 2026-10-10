import { useState } from 'react';
import Modal from '../components/Modal';
import { useCreatePairingRequest } from '../queries/mutations';

export default function PlayerPairingDialog({
  open,
  onClose,
  playerPk,
}: {
  open: boolean;
  onClose: () => void;
  playerPk: number;
}) {
  const create = useCreatePairingRequest();
  const [text, setText] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    create.mutate(
      { player: playerPk, text },
      {
        onSuccess: () => {
          setText('');
          onClose();
        },
      },
    );
  };

  return (
    <Modal open={open} onClose={onClose} title="Spárovat s hráčem">
      <form onSubmit={submit}>
        <label htmlFor="pairing-text">
          Nějaké dodatečné informace pro spárování s hráčem? Třeba odkaz někam, kde je tvoje jméno i fotka.
        </label>
        <textarea
          id="pairing-text"
          className="input mb-3"
          rows={4}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="flex gap-3">
          <button type="submit" className="btn btn-primary" disabled={create.isPending}>
            Odeslat žádost
          </button>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Zrušit
          </button>
        </div>
      </form>
    </Modal>
  );
}
