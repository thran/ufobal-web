import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import ErrorBox from '../components/ErrorBox';
import BirthdateAgeInput from '../components/forms/BirthdateAgeInput';
import GenderSelect from '../components/forms/GenderSelect';
import PlayerCombobox from '../components/forms/PlayerCombobox';
import { FieldError, useValidation } from '../components/forms/validation';
import Modal from '../components/Modal';
import PlayerLink from '../components/PlayerLink';
import Spinner from '../components/Spinner';
import type { PlayerVM, TotVM } from '../domain/graph';
import { recordPath } from '../paths';
import { useGraph } from '../queries/data';
import {
  useAddAttendance,
  useAddPlayer,
  useRemoveAttendance,
  useSetCaptain,
  useSetDefaultGoalie,
} from '../queries/mutations';

function NewPlayerDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (pk: number) => void;
}) {
  const addPlayer = useAddPlayer();
  const [nickname, setNickname] = useState('');
  const [gender, setGender] = useState<'man' | 'woman' | null>(null);
  const [name, setName] = useState('');
  const [lastname, setLastname] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const v = useValidation({ nickname: !nickname.trim() && 'Vyplň přezdívku.' });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!v.attempt()) return;
    addPlayer.mutate(
      {
        nickname: nickname.trim(),
        ...(name.trim() && { name: name.trim() }),
        ...(lastname.trim() && { lastname: lastname.trim() }),
        ...(gender && { gender }),
        ...(birthdate && { birthdate }),
      },
      {
        onSuccess: (pk) => {
          onCreated(pk);
          setNickname('');
          setGender(null);
          setName('');
          setLastname('');
          setBirthdate('');
          v.reset();
          onClose();
        },
      },
    );
  };

  return (
    <Modal open={open} onClose={onClose} title="Nový hráč">
      <form onSubmit={submit} noValidate>
        <p className="mb-3">Ujisti se prosím, že hráč určitě není v systému.</p>
        <div className="mb-3 flex gap-3">
          <div className="flex-1">
            <label className="block">
              Přezdívka
              <input
                className="input"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                onBlur={v.touch('nickname')}
                aria-invalid={!!v.error('nickname')}
                placeholder="povinné"
              />
            </label>
            <FieldError error={v.error('nickname')} />
          </div>
          <div className="flex-1">
            <label htmlFor="np-gender">Pohlaví</label>
            <GenderSelect id="np-gender" value={gender} onChange={setGender} />
          </div>
        </div>
        <div className="mb-3 flex gap-3">
          <label className="block flex-1">
            Jméno
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="block flex-1">
            Příjmení
            <input className="input" value={lastname} onChange={(e) => setLastname(e.target.value)} />
          </label>
        </div>
        <div className="mb-1">
          <BirthdateAgeInput value={birthdate} onChange={setBirthdate} idPrefix="np" />
        </div>
        <p className="mb-3 italic">Datum narození nebude zveřejňováno (pouze jako věk).</p>
        <button type="submit" className="btn btn-primary" disabled={addPlayer.isPending}>
          Vytvořit
        </button>
      </form>
    </Modal>
  );
}

function PlayerSelectRow({
  title,
  roster,
  initial,
  onSave,
  pending,
}: {
  title: string;
  roster: PlayerVM[];
  initial: number | null;
  onSave: (player: number) => void;
  pending: boolean;
}) {
  const [value, setValue] = useState(initial == null ? '' : String(initial));
  const v = useValidation({ value: !value && 'Vyber hráče.' });
  return (
    <>
      <h3 className="mt-4 mb-2 text-xl font-bold">{title}</h3>
      <div className="flex gap-3">
        <select
          className="input flex-1"
          aria-label={title}
          value={value}
          onChange={(e) => setValue(e.target.value)}
        >
          <option value="">----</option>
          {roster.map((p) => (
            <option key={p.pk} value={p.pk}>
              {p.full_name}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="btn"
          disabled={pending}
          onClick={() => v.attempt() && onSave(Number(value))}
        >
          Nastavit
        </button>
      </div>
      <FieldError error={v.error('value')} />
    </>
  );
}

function Roster({ tot, players }: { tot: TotVM; players: PlayerVM[] }) {
  const addAttendance = useAddAttendance();
  const removeAttendance = useRemoveAttendance();
  const setCaptain = useSetCaptain();
  const setDefaultGoalie = useSetDefaultGoalie();
  const [selected, setSelected] = useState<PlayerVM | null>(null);
  const [dialog, setDialog] = useState(false);
  const v = useValidation({ selected: !selected && 'Vyber hráče.' });

  const roster = useMemo(
    () => [...tot.players].sort((a, b) => a.full_name.localeCompare(b.full_name, 'cs')),
    [tot.players],
  );
  const exclude = useMemo(() => new Set(tot.playerPks), [tot.playerPks]);

  const add = () => {
    if (!v.attempt() || !selected) return;
    addAttendance.mutate(
      { player: selected.pk, team: tot.pk },
      {
        onSuccess: () => {
          setSelected(null);
          v.reset();
        },
      },
    );
  };
  const remove = (p: PlayerVM) => {
    if (window.confirm(`Opravdu odebrat hráče ${p.nickname} z týmu?`))
      removeAttendance.mutate({ player: p.pk, team: tot.pk });
  };

  return (
    <div className="max-w-xl">
      <Link to={recordPath(tot.tournament.pk)} className="text-primary hover:text-primary-dark">
        ‹ zpět
      </Link>
      <hr className="my-3 border-gray-300" />
      <h1 className="mb-4 text-2xl font-bold">
        {tot.tournament.full_name} - {tot.name}
      </h1>
      <h3 className="mb-2 text-xl font-bold">Hráči</h3>
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <PlayerCombobox
            players={players}
            value={selected}
            onChange={setSelected}
            label="Hráč"
            exclude={exclude}
          />
        </div>
        <button type="button" className="btn btn-primary" disabled={addAttendance.isPending} onClick={add}>
          Přidat
        </button>
      </div>
      <FieldError error={v.error('selected')} />
      <div className="my-2 text-right">
        <button type="button" className="text-primary underline" onClick={() => setDialog(true)}>
          Nový hráč
        </button>
      </div>
      <ul className="mb-2">
        {roster.map((p) => (
          <li key={p.pk}>
            <button
              type="button"
              className="mr-2 cursor-pointer text-red-700"
              aria-label={`Odebrat ${p.nickname}`}
              onClick={() => remove(p)}
            >
              ×
            </button>
            <PlayerLink player={p} label={p.full_name} />
          </li>
        ))}
      </ul>
      <hr className="my-3 border-gray-300" />
      <PlayerSelectRow
        key={`captain-${tot.pk}-${tot.captain}`}
        title="Kapitán"
        roster={roster}
        initial={tot.captain}
        pending={setCaptain.isPending}
        onSave={(player) => setCaptain.mutate({ player, team: tot.pk })}
      />
      <PlayerSelectRow
        key={`goalie-${tot.pk}-${tot.default_goalie}`}
        title="Výchozí brankář"
        roster={roster}
        initial={tot.default_goalie}
        pending={setDefaultGoalie.isPending}
        onSave={(player) => setDefaultGoalie.mutate({ player, team: tot.pk })}
      />
      {dialog && (
        <NewPlayerDialog
          open
          onClose={() => setDialog(false)}
          onCreated={(player) => addAttendance.mutate({ player, team: tot.pk })}
        />
      )}
    </div>
  );
}

export default function RosterPage() {
  const { id: idParam, totId: totParam } = useParams();
  const { graph, error, refetch, isFetching: fetching } = useGraph();
  if (error) return <ErrorBox error={error} onRetry={() => void refetch()} />;
  if (!graph) return <Spinner />;
  const tot = graph.totsById.get(Number(totParam));
  if (!tot && fetching) return <Spinner />;
  if (!tot || tot.tournament.pk !== Number(idParam))
    return (
      <div role="alert" className="callout callout-alert my-4">
        Tým nenalezen.
      </div>
    );
  return <Roster key={tot.pk} tot={tot} players={graph.players} />;
}
