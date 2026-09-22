import { useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { isSupabaseConfigured, getSupabase } from "../storage/supabase";

interface AuthGateProps {
  children: (session: Session) => ReactNode;
}

export default function AuthGate({ children }: AuthGateProps) {
  const configured = isSupabaseConfigured();
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!configured) {
      setReady(true);
      return;
    }
    const db = getSupabase();
    void db.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data } = db.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });
    return () => {
      data.subscription.unsubscribe();
    };
  }, [configured]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setBusy(true);
    try {
      const db = getSupabase();
      if (mode === "signup") {
        const { error: signError } = await db.auth.signUp({ email, password });
        if (signError) throw signError;
        setMessage("Check your email to confirm the account, then sign in.");
      } else {
        const { error: signError } = await db.auth.signInWithPassword({
          email,
          password,
        });
        if (signError) throw signError;
      }
    } catch (signError) {
      setError(
        signError instanceof Error ? signError.message : "Could not sign in",
      );
    } finally {
      setBusy(false);
    }
  }

  if (!ready) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-100 text-slate-500">
        Loading…
      </div>
    );
  }

  if (!configured) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-100 p-6">
        <div className="max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow">
          <h1 className="text-lg font-semibold">Database not configured</h1>
          <p className="mt-2 text-sm text-slate-600">
            Create a hosted Supabase project, copy{" "}
            <code className="text-xs">.env.example</code> to{" "}
            <code className="text-xs">.env.local</code>, and paste the project
            URL and anon key. Then run the migrations against that project.
          </p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-100 p-6">
        <form
          className="w-full max-w-sm space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow"
          onSubmit={(event) => void handleSubmit(event)}
        >
          <div>
            <h1 className="text-lg font-semibold">Footpath Warden</h1>
            <p className="mt-1 text-sm text-slate-500">
              {mode === "signup"
                ? "Create an account to save your parishes and inspections."
                : "Sign in to load your parishes and inspections."}
            </p>
          </div>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Password</span>
            <span className="relative mt-1 block">
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-10"
              />
              <button
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword((visible) => !visible)}
                className="absolute inset-y-0 right-0 flex cursor-pointer items-center px-3 text-slate-500 hover:text-slate-800"
              >
                {showPassword ? (
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M3 3l18 18" strokeLinecap="round" />
                    <path d="M10.6 10.6a2 2 0 102.8 2.8" />
                    <path d="M9.9 5.2A10.8 10.8 0 0121 12c-.5.9-1.2 1.8-2 2.6M6.1 6.1C4.4 7.5 3 9.2 2 12c1.7 4.5 6 7.5 10 7.5 1.5 0 3-.4 4.4-1.1" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M2 12c1.7-4.5 6-7.5 10-7.5S20.3 7.5 22 12c-1.7 4.5-6 7.5-10 7.5S3.7 16.5 2 12z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </span>
          </label>
          {error ? <p className="text-sm text-red-700">{error}</p> : null}
          {message ? <p className="text-sm text-slate-600">{message}</p> : null}
          <button
            type="submit"
            disabled={busy}
            className="w-full cursor-pointer rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-wait disabled:opacity-60"
          >
            {busy
              ? "Please wait…"
              : mode === "signup"
                ? "Create account"
                : "Sign in"}
          </button>
          <button
            type="button"
            className="w-full cursor-pointer text-sm text-slate-600 underline underline-offset-2"
            onClick={() => {
              setMode((current) => (current === "signin" ? "signup" : "signin"));
              setError(null);
              setMessage(null);
            }}
          >
            {mode === "signin"
              ? "Need an account? Create one"
              : "Already have an account? Sign in"}
          </button>
        </form>
      </div>
    );
  }

  return <>{children(session)}</>;
}
