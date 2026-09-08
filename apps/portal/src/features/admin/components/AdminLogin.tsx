import { useState } from 'react';
import { CpcButton } from '@vigooth/ui';
import { login, type User } from '@/lib/api/auth';

interface AdminLoginProps {
  onSignedIn: (user: User) => void;
}

const fieldClass =
  'w-full border-2 border-cpc-green-900 bg-black px-2 py-1 font-mono text-xs text-cpc-green-500 ' +
  'outline-none focus:border-cpc-green-500';

/**
 * Sign-in only, no account creation: an account is useless here unless it is
 * already on the admin list, so offering to create one would only mislead.
 */
export function AdminLogin({ onSignedIn }: AdminLoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEmailChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(event.target.value);
  };

  const handlePasswordChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(event.target.value);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !password) {
      setError('Email et mot de passe requis');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      onSignedIn(await login(email.trim(), password));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Connexion impossible');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-full place-items-center p-4">
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-sm flex-col gap-4 border-2 border-cpc-green-500 p-6"
      >
        <header className="flex flex-col gap-1">
          <span className="text-cpc-yellow-500">ADMIN</span>
          <span className="text-xs text-cpc-green-900">CONNEXION</span>
        </header>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-cpc-green-900">Email</span>
          <input
            type="email"
            autoComplete="username"
            value={email}
            onChange={handleEmailChange}
            className={fieldClass}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-cpc-green-900">Mot de passe</span>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={handlePasswordChange}
            className={fieldClass}
          />
        </label>

        {error && <p className="text-xs text-cpc-red-500">{error}</p>}

        <CpcButton type="submit" variant="filled" color="green" size="sm" disabled={busy} fullWidth>
          {busy ? 'PATIENCE...' : 'SE CONNECTER'}
        </CpcButton>
      </form>
    </div>
  );
}
