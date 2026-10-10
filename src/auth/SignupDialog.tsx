import { useState, type FormEvent } from 'react';
import type { SignupData } from '../api/auth';
import Modal from '../components/Modal';
import { useSignup } from './user';

const EMPTY: SignupData = { username: '', email: '', password: '', password_check: '', first_name: '', last_name: '' };

const FIELDS: { key: keyof SignupData; label: string; type: string; required: boolean }[] = [
  { key: 'username', label: 'Uživatelské jméno', type: 'text', required: true },
  { key: 'email', label: 'Email', type: 'email', required: true },
  { key: 'password', label: 'Heslo', type: 'password', required: true },
  { key: 'password_check', label: 'Kontrola hesla', type: 'password', required: true },
  { key: 'first_name', label: 'Jméno', type: 'text', required: false },
  { key: 'last_name', label: 'Příjmení', type: 'text', required: false },
];

export default function SignupDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [data, setData] = useState<SignupData>(EMPTY);
  const signup = useSignup();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    signup.mutate(data, { onSuccess: onClose });
  };

  return (
    <Modal open={open} onClose={onClose} title="Registrace">
      <form onSubmit={submit} className="flex flex-col gap-3">
        {FIELDS.map((f) => (
          <label key={f.key} className="block text-sm">
            {f.label}
            <input
              className="input mt-1"
              type={f.type}
              required={f.required}
              placeholder={f.required ? undefined : 'nepovinné'}
              value={data[f.key] ?? ''}
              onChange={(e) => setData({ ...data, [f.key]: e.target.value })}
            />
          </label>
        ))}
        <button type="submit" className="btn self-start" disabled={signup.isPending}>
          Registrovat
        </button>
      </form>
    </Modal>
  );
}
