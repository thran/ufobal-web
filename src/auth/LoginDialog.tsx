import { useState, type FormEvent } from 'react';
import { FieldError, useValidation } from '../components/forms/validation';
import Modal from '../components/Modal';
import { useLogin } from './user';

export default function LoginDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const login = useLogin();
  const v = useValidation({
    username: !username.trim() && 'Vyplň jméno.',
    password: !password && 'Vyplň heslo.',
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!v.attempt()) return;
    login.mutate({ username, password }, { onSuccess: onClose });
  };

  return (
    <Modal open={open} onClose={onClose} title="Přihlášení">
      <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
        <input
          className="input"
          placeholder="jméno"
          name="username"
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          className="input"
          placeholder="heslo"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit" className="btn" disabled={login.isPending}>
          Přihlásit
        </button>
      </form>
      <FieldError error={v.error('username') || v.error('password')} />
    </Modal>
  );
}
