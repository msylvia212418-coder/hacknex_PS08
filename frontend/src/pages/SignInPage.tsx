import { useState, type FormEvent } from 'react';
import { ShieldCheck } from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import { Button } from '../components/ui/Button';

export function SignInPage() {
  const { configured, signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Sign in failed. Check your credentials and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-900/5">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-700 text-white">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-slate-950">VERIPROOF</h1>
            <p className="text-xs font-medium text-slate-500">Evidence-bound analytics verification</p>
          </div>
        </div>

        {!configured ? (
          <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
            <h2 className="font-bold">Supabase Auth needs configuration</h2>
            <p className="mt-2">Set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> in <code>frontend/.env.local</code>, then restart the frontend.</p>
          </div>
        ) : (
          <>
            <h2 className="text-lg font-bold text-slate-900">Sign in to verify claims</h2>
            <p className="mt-1 text-sm text-slate-500">Use your Supabase Auth account to access owned datasets.</p>
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <label className="block text-sm font-semibold text-slate-700">
                Email
                <input
                  autoComplete="username"
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-3 font-normal outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                />
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                Password
                <input
                  autoComplete="current-password"
                  type="password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-300 px-3.5 py-3 font-normal outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                />
              </label>
              {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
              <Button type="submit" isLoading={submitting} className="w-full py-3">
                Sign in securely
              </Button>
            </form>
          </>
        )}
      </section>
    </main>
  );
}
