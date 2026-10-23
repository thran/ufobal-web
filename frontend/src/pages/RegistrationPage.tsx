import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import type { TeamDto } from '../api/types';
import ErrorBox from '../components/ErrorBox';
import { EMAIL_RE, FieldError, useValidation } from '../components/forms/validation';
import Modal from '../components/Modal';
import Spinner from '../components/Spinner';
import { formatDateTime } from '../format';
import { rosterPath } from '../paths';
import { useGraph, useTournament } from '../queries/data';
import { useAddTeam, useRegisterTeam } from '../queries/mutations';

type TeamOption = Pick<TeamDto, 'pk' | 'name' | 'name_short'>;

function NewTeamDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (team: TeamOption) => void;
}) {
  const addTeam = useAddTeam();
  const [name, setName] = useState('');
  const [nameShort, setNameShort] = useState('');
  const [description, setDescription] = useState('');
  const v = useValidation({ name: !name.trim() && 'Vyplň jméno týmu.' });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!v.attempt()) return;
    addTeam.mutate(
      {
        name: name.trim(),
        ...(nameShort.trim() && { name_short: nameShort.trim() }),
        ...(description.trim() && { description: description.trim() }),
      },
      {
        onSuccess: (pk) => {
          onCreated({ pk, name: name.trim(), name_short: nameShort.trim() || null });
          setName('');
          setNameShort('');
          setDescription('');
          v.reset();
          onClose();
        },
      },
    );
  };

  return (
    <Modal open={open} onClose={onClose} title="Nový tým">
      <form onSubmit={submit} noValidate>
        <div className="mb-3">
          <label className="block">
            Jméno
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={v.touch('name')}
              aria-invalid={!!v.error('name')}
            />
          </label>
          <FieldError error={v.error('name')} />
        </div>
        <label className="mb-3 block">
          Zkrácené jméno
          <input
            className="input"
            value={nameShort}
            onChange={(e) => setNameShort(e.target.value)}
            placeholder="nepovinné, např. (JZM, DIK, DvT, ...)"
          />
        </label>
        <label className="mb-3 block">
          Popis (volitelné)
          <textarea
            className="input"
            rows={10}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <button type="submit" className="btn btn-primary" disabled={addTeam.isPending}>
          Vytvořit
        </button>
      </form>
    </Modal>
  );
}

export default function RegistrationPage() {
  const id = Number(useParams().id);
  const navigate = useNavigate();
  const tournamentQuery = useTournament(id);
  const { graph, error: graphError, refetch: refetchGraph } = useGraph();
  const register = useRegisterTeam();
  const [created, setCreated] = useState<TeamOption[]>([]);
  const [teamPk, setTeamPk] = useState('');
  const [name, setName] = useState('');
  const [nameShort, setNameShort] = useState('');
  const [mail, setMail] = useState('');
  const [phone, setPhone] = useState('');
  const [strength, setStrength] = useState('');
  const [dialog, setDialog] = useState(false);

  const teams = useMemo<TeamOption[]>(
    () => [...(graph?.teams ?? []), ...created].sort((a, b) => a.name.localeCompare(b.name, 'cs')),
    [graph, created],
  );
  const team = teams.find((t) => String(t.pk) === teamPk);
  const strengthNum = Number(strength);
  const v = useValidation({
    team: !team && 'Vyber tým.',
    mail: (!mail.trim() && 'Vyplň kontaktní email.') || (!EMAIL_RE.test(mail.trim()) && 'Neplatný email.'),
    phone: !phone.trim() && 'Vyplň kontaktní telefon.',
    strength:
      !(strength && Number.isInteger(strengthNum) && strengthNum >= 1 && strengthNum <= 4) &&
      'Zadej číslo 1 až 4.',
  });

  const error = (tournamentQuery.data ? null : tournamentQuery.error) ?? graphError;
  if (error)
    return (
      <ErrorBox
        error={error}
        onRetry={() => {
          void tournamentQuery.refetch();
          void refetchGraph();
        }}
      />
    );
  const tournament = tournamentQuery.data;
  if (!tournament || !graph) return <Spinner />;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!v.attempt() || !team) return;
    register.mutate(
      {
        tournament: id,
        team: team.pk,
        ...(name.trim() && { name: name.trim() }),
        ...(nameShort.trim() && { name_short: nameShort.trim() }),
        contact_mail: mail.trim(),
        contact_phone: phone.trim(),
        strength: strengthNum,
      },
      { onSuccess: (totPk) => void navigate(rosterPath(id, totPk)) },
    );
  };

  let body;
  if (tournament.registration_open) {
    body = (
      <>
        <form onSubmit={submit} noValidate>
          <h3 className="mb-3 text-xl font-bold">{tournament.full_name}</h3>
          <div className="flex items-end gap-3">
            <label className="block flex-1">
              Tým
              <select
                className="input"
                value={teamPk}
                onChange={(e) => setTeamPk(e.target.value)}
                onBlur={v.touch('team')}
                aria-invalid={!!v.error('team')}
              >
                <option value="">----</option>
                {teams.map((t) => (
                  <option key={t.pk} value={t.pk}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" className="pb-2 text-primary underline" onClick={() => setDialog(true)}>
              vytvořit nový tým
            </button>
          </div>
          <FieldError error={v.error('team')} />
          <label className="mt-3 mb-3 block">
            Jméno na tomto turnaji (pouze pokud se liší od běžného jména týmu)
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={team?.name ?? ''}
            />
          </label>
          <label className="mb-3 block">
            Zkrácené jméno na tomto turnaji (pouze pokud se liší od běžného zkráceného jména týmu)
            <input
              className="input"
              value={nameShort}
              onChange={(e) => setNameShort(e.target.value)}
              placeholder={team?.name_short ?? ''}
            />
          </label>
          <div className="mb-3">
            <label className="block">
              Kontaktní email
              <input
                className="input"
                type="email"
                value={mail}
                onChange={(e) => setMail(e.target.value)}
                onBlur={v.touch('mail')}
                aria-invalid={!!v.error('mail')}
              />
            </label>
            <FieldError error={v.error('mail')} />
          </div>
          <div className="mb-3">
            <label className="block">
              Kontaktní telefon
              <input
                className="input"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onBlur={v.touch('phone')}
                aria-invalid={!!v.error('phone')}
              />
            </label>
            <FieldError error={v.error('phone')} />
          </div>
          <label className="mb-1 block">
            Odhad síly (1 - 4)
            <input
              className="input"
              type="number"
              min={1}
              max={4}
              value={strength}
              onChange={(e) => setStrength(e.target.value)}
              onBlur={v.touch('strength')}
              aria-invalid={!!v.error('strength')}
            />
          </label>
          <FieldError error={v.error('strength')} />
          <ol className="mb-3 list-decimal pl-6 text-[0.8em]">
            <li>Budeme na bedně</li>
            <li>Budeme ve finálové skupině (top 8)</li>
            <li>Budeme kolem poloviny</li>
            <li>Přišli jsme si jen zahrát, na nějaké umístění to nevidíme.</li>
          </ol>
          <button type="submit" className="btn btn-primary" disabled={register.isPending}>
            Přihlásit
          </button>
        </form>
        {dialog && (
          <NewTeamDialog
            open
            onClose={() => setDialog(false)}
            onCreated={(t) => {
              setCreated((c) => [...c, t]);
              setTeamPk(String(t.pk));
            }}
          />
        )}
      </>
    );
  } else if (tournament.registration_scheduled) {
    body = <p>Přihlašování na turnaj začne {formatDateTime(tournament.registration_from)}.</p>;
  } else {
    body = <p>Přihlašování na turnaj bylo již uzavřeno.</p>;
  }

  return <div className="mx-auto max-w-xl">{body}</div>;
}
