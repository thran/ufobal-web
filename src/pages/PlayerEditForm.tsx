import { useState } from 'react';
import type { PlayerUpdate } from '../api/types';
import BirthdateAgeInput from '../components/forms/BirthdateAgeInput';
import GenderSelect from '../components/forms/GenderSelect';
import { FieldError, useValidation } from '../components/forms/validation';
import type { PlayerVM } from '../domain/graph';
import { useSavePlayer } from '../queries/mutations';

export default function PlayerEditForm({
  player,
  isStaffUser,
  onDone,
}: {
  player: PlayerVM;
  isStaffUser: boolean;
  onDone: () => void;
}) {
  const save = useSavePlayer();
  // Birthdate is only received for staff; for others the field starts empty.
  const initialBirthdate = player.birthdate?.slice(0, 10) ?? '';
  const [nickname, setNickname] = useState(player.nickname);
  const [name, setName] = useState(player.name);
  const [lastname, setLastname] = useState(player.lastname);
  const [gender, setGender] = useState<'man' | 'woman' | null>(
    player.gender === 'man' || player.gender === 'woman' ? player.gender : null,
  );
  const [birthdate, setBirthdate] = useState(initialBirthdate);
  const v = useValidation({ nickname: !nickname.trim() && 'Vyplň přezdívku.' });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!v.attempt()) return;
    const body: PlayerUpdate = { pk: player.pk, nickname, name, lastname, gender };
    if (birthdate !== initialBirthdate) body.birthdate = birthdate || null;
    save.mutate(body, { onSuccess: onDone });
  };

  return (
    <form onSubmit={submit} className="max-w-xl">
      <label htmlFor="pe-nickname">Přezdívka</label>
      <input
        id="pe-nickname"
        className="input"
        value={nickname}
        onChange={(e) => setNickname(e.target.value)}
        onBlur={v.touch('nickname')}
        aria-invalid={!!v.error('nickname')}
      />
      <FieldError error={v.error('nickname')} />
      <label htmlFor="pe-name">Jméno</label>
      <input id="pe-name" className="input" value={name} onChange={(e) => setName(e.target.value)} />
      <label htmlFor="pe-lastname">Příjmení</label>
      <input
        id="pe-lastname"
        className="input"
        value={lastname}
        onChange={(e) => setLastname(e.target.value)}
      />
      <label htmlFor="pe-gender">Pohlaví</label>
      <GenderSelect id="pe-gender" value={gender} onChange={setGender} />
      <BirthdateAgeInput idPrefix="pe" value={birthdate} onChange={setBirthdate} />
      {!isStaffUser && (
        <p className="text-sm text-gray-600">Datum narození vyplň jen pokud ho chceš změnit.</p>
      )}
      <p className="mb-3 italic">Datum narození nebude nikde zveřejňováno (pouze jako věk).</p>
      <div className="flex gap-3">
        <button type="submit" className="btn btn-primary" disabled={save.isPending}>
          Uložit
        </button>
        <button type="button" className="btn btn-secondary" onClick={onDone}>
          zrušit změny
        </button>
      </div>
    </form>
  );
}
