import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router';
import type { RefereeMatchDto } from '../api/types';
import BackLink from '../components/BackLink';
import ErrorBox from '../components/ErrorBox';
import { FieldError, useValidation } from '../components/forms/validation';
import Modal from '../components/Modal';
import Spinner from '../components/Spinner';
import StarRating from '../components/StarRating';
import { tournamentResultsPath } from '../paths';
import { useRefereeFeedbacks, useTournament } from '../queries/data';
import { useSaveRefereeFeedback } from '../queries/mutations';

function StringList({
  title,
  itemLabel,
  addLabel,
  removeLabel,
  items,
  onChange,
}: {
  title: string;
  itemLabel: string;
  addLabel: string;
  removeLabel: string;
  items: string[];
  onChange: (items: string[]) => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const grew = useRef(false);

  useEffect(() => {
    if (!grew.current) return;
    grew.current = false;
    const inputs = box.current?.querySelectorAll<HTMLInputElement>('input');
    inputs?.[inputs.length - 1]?.focus();
  }, [items.length]);

  return (
    <div className="mb-3">
      <h3 className="mb-1 font-bold">{title}</h3>
      <div ref={box}>
        {items.map((text, i) => (
          <div key={i} className="mb-1 flex gap-2">
            <input
              className="input flex-1"
              aria-label={`${itemLabel} ${i + 1}`}
              value={text}
              onChange={(e) => onChange(items.map((t, j) => (j === i ? e.target.value : t)))}
            />
            <button
              type="button"
              className="cursor-pointer text-red-700"
              aria-label={removeLabel}
              onClick={() => onChange(items.filter((_, j) => j !== i))}
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        className="btn"
        onClick={() => {
          grew.current = true;
          onChange([...items, '']);
        }}
      >
        {addLabel}
      </button>
    </div>
  );
}

function FeedbackDialog({
  match,
  tournament,
  onClose,
}: {
  match: RefereeMatchDto;
  tournament: number;
  onClose: () => void;
}) {
  const save = useSaveRefereeFeedback(tournament);
  const existing = match.referee_feedback;
  const [stars, setStars] = useState(existing?.feedback.stars ?? 0);
  const [positives, setPositives] = useState(existing?.feedback.positives ?? []);
  const [negatives, setNegatives] = useState(existing?.feedback.negatives ?? []);
  const [comment, setComment] = useState(existing?.feedback.comment ?? '');
  const v = useValidation({ stars: stars === 0 && 'Vyber celkové hodnocení.' });

  const submit = () =>
    v.attempt() &&
    save.mutate(
      {
        pk: existing?.pk,
        match: match.pk,
        feedback: {
          stars,
          positives: positives.map((t) => t.trim()).filter(Boolean),
          negatives: negatives.map((t) => t.trim()).filter(Boolean),
          comment,
        },
      },
      { onSuccess: onClose },
    );

  return (
    <Modal open onClose={onClose} title={match.referee_team?.name_pure ?? 'Rozhodčí'}>
      {match.referee && (
        <p className="mb-3">
          hlavní rozhodčí: <b>{match.referee.full_name}</b>
        </p>
      )}
      <StringList
        title="Pozitiva"
        itemLabel="Pozitivum"
        addLabel="Přidat pozitivum"
        removeLabel="Odebrat pozitivum"
        items={positives}
        onChange={setPositives}
      />
      <StringList
        title="Negativa"
        itemLabel="Negativum"
        addLabel="Přidat negativum"
        removeLabel="Odebrat negativum"
        items={negatives}
        onChange={setNegatives}
      />
      <label className="mb-3 block">
        <span className="font-bold">Komentář</span>
        <textarea className="input" rows={3} value={comment} onChange={(e) => setComment(e.target.value)} />
      </label>
      <div className="mb-3">
        <h3 className="mb-1 font-bold">Celkové hodnocení</h3>
        <StarRating value={stars} onChange={setStars} />
        <FieldError error={v.error('stars')} />
      </div>
      <button type="button" className="btn btn-primary" disabled={save.isPending} onClick={submit}>
        Uložit
      </button>
    </Modal>
  );
}

export default function RefereeFeedbackPage() {
  const id = Number(useParams().id);
  const tournament = useTournament(id);
  const feedbacks = useRefereeFeedbacks(id);
  const [active, setActive] = useState<RefereeMatchDto | null>(null);

  const t = tournament.data;
  if (tournament.error && !t)
    return <ErrorBox error={tournament.error} onRetry={() => void tournament.refetch()} />;

  return (
    <div>
      <BackLink fallback={tournamentResultsPath(id)} />
      <div className="mb-2 text-right">
        <button type="button" className="btn" onClick={() => void feedbacks.refetch()}>
          Obnovit
        </button>
      </div>
      {!t ? (
        <Spinner />
      ) : (
        <>
          <h1 className="mb-4 text-2xl font-bold">Hodnocení rozhodčích - {t.full_name}</h1>
          {t.closed_edit && <div className="callout my-3">Turnaj je uzavřený, hodnocení už nelze měnit.</div>}
          {feedbacks.error ? (
            <ErrorBox error={feedbacks.error} onRetry={() => void feedbacks.refetch()} />
          ) : !feedbacks.data ? (
            <Spinner />
          ) : feedbacks.data.length === 0 ? (
            <p className="text-gray-500">Žádné odehrané zápasy k hodnocení.</p>
          ) : (
            <ul>
              {[...feedbacks.data]
                .sort((a, b) => a.pk - b.pk)
                .map((m) => (
                  <li key={m.pk} className={m.referee_feedback ? 'text-gray-500' : undefined}>
                    <b>{m.referee_team?.name_pure}</b>: {m.team_one.name_pure} - {m.team_two.name_pure} -{' '}
                    <button
                      type="button"
                      className="text-primary underline disabled:cursor-not-allowed disabled:text-gray-400"
                      disabled={t.closed_edit}
                      onClick={() => setActive(m)}
                    >
                      {m.referee_feedback ? 'upravit' : 'hodnotit'}
                    </button>
                  </li>
                ))}
            </ul>
          )}
        </>
      )}
      {active && <FeedbackDialog match={active} tournament={id} onClose={() => setActive(null)} />}
    </div>
  );
}
