import { useEffect, useState } from 'react';
import { CpcButton } from '@vigooth/ui';
import { TextField } from '@/components/Field';
import { devLogin, login, register } from '@/lib/api/auth';
import { useAuth } from '@/stores/AuthStore';

type Mode = 'login' | 'register';

export function LoginScreen() {
  const { signIn } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Dev only: true while the automatic sign-in is being tried, or once it has failed. */
  const [devTried, setDevTried] = useState(false);

  // A `pnpm dev` frontend against the in-memory API lands straight in the
  // seeded garden. Against any other API the dev-login route is missing, the
  // call fails quietly and the form below is what the visitor sees.
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    let cancelled = false;
    devLogin()
      .then((user) => {
        if (!cancelled) signIn(user);
      })
      .catch(() => {
        // Not a dev API: nothing to do.
      })
      .finally(() => {
        if (!cancelled) setDevTried(true);
      });
    return () => {
      cancelled = true;
    };
  }, [signIn]);

  const handleDevLogin = async () => {
    setBusy(true);
    setError(null);
    try {
      signIn(await devLogin());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Compte de dev indisponible');
    } finally {
      setBusy(false);
    }
  };

  const handlePasswordChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(event.target.value);
  };

  const handleToggleMode = () => {
    setMode((previous) => (previous === 'login' ? 'register' : 'login'));
    setError(null);
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
      const user =
        mode === 'login'
          ? await login(email.trim(), password)
          : await register(email.trim(), password);
      signIn(user);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Connexion impossible');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="cpc-screen grid min-h-screen place-items-center bg-black p-4 font-mono">
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-sm flex-col gap-4 border-2 border-cpc-green-500 p-6"
      >
        <header className="flex flex-col gap-1">
          <span className="text-cpc-orange-500">🌱 GARDEN</span>
          <span className="text-xs text-cpc-green-900">
            {mode === 'login' ? 'CONNEXION' : 'CREATION DE COMPTE'}
          </span>
        </header>

        <TextField label="Email" value={email} onChange={setEmail} placeholder="moi@exemple.com" />

        <label className="flex flex-col gap-1">
          <span className="text-xs text-cpc-green-900">Mot de passe</span>
          <input
            type="password"
            value={password}
            onChange={handlePasswordChange}
            className="w-full border-2 border-cpc-green-900 bg-black px-2 py-1 font-mono text-xs text-cpc-green-500 outline-none focus:border-cpc-green-500"
          />
        </label>

        {error && <p className="text-xs text-cpc-red-500">{error}</p>}

        <CpcButton type="submit" variant="filled" color="green" size="sm" disabled={busy} fullWidth>
          {busy ? 'PATIENCE...' : mode === 'login' ? 'SE CONNECTER' : 'CREER LE COMPTE'}
        </CpcButton>

        {import.meta.env.DEV && devTried && (
          <CpcButton
            type="button"
            variant="outlined"
            color="yellow"
            size="xs"
            disabled={busy}
            onClick={handleDevLogin}
          >
            COMPTE DE DEV (JARDIN DE DEMO)
          </CpcButton>
        )}

        <CpcButton type="button" variant="text" color="cyan" size="xs" onClick={handleToggleMode}>
          {mode === 'login' ? 'PAS DE COMPTE ? EN CREER UN' : "J'AI DEJA UN COMPTE"}
        </CpcButton>
      </form>
    </div>
  );
}
