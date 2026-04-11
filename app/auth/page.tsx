"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { getSupabaseClient } from "@/lib/supabase";

type AuthTab = "signup" | "signin";

export default function AuthPage() {
  const [tab, setTab] = useState<AuthTab>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailConfirmationSent, setEmailConfirmationSent] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState("");
  const router = useRouter();

  useEffect(() => {
    const supabase = getSupabaseClient();
    let cancelled = false;

    async function redirectIfSession() {
      const {
        data: { session }
      } = await supabase.auth.getSession();
      if (!cancelled && session?.user) {
        router.replace("/dashboard/offer");
      }
    }
    void redirectIfSession();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session?.user) return;
      if (event === "SIGNED_IN") {
        router.replace("/dashboard/offer");
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim() || !password) return;

    setLoading(true);
    setError(null);

    try {
      const supabase = getSupabaseClient();
      if (tab === "signup") {
        const normalizedEmail = email.trim();
        const redirectUrl =
          typeof window !== "undefined" ? `${window.location.origin}/dashboard/offer` : undefined;
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: redirectUrl ? { emailRedirectTo: redirectUrl } : undefined
        });
        if (signUpError) throw signUpError;
        if (signUpData.session?.user) {
          router.replace("/dashboard/offer");
          return;
        }
        setConfirmationEmail(normalizedEmail);
        setEmailConfirmationSent(true);
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      });
      if (signInError) throw signInError;
      router.replace("/dashboard/offer");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setLoading(true);
    setError(null);
    try {
      const supabase = getSupabaseClient();
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: "https://www.lacore.ai/auth/callback"
        }
      });
      if (oauthError) throw oauthError;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign in failed.");
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-[#07080F] px-4">
      <Link
        href="/"
        className="absolute left-6 top-6 text-xs text-white/35 transition-colors hover:text-white/60"
      >
        ← Back to lacore.ai
      </Link>

      <div className="w-full max-w-sm">
        {!emailConfirmationSent ? (
          <>
            <div className="mb-8 flex justify-center">
              <Logo size="lg" variant="dark" href="/" />
            </div>

            <h1 className="mb-1 text-center text-2xl font-semibold text-white">
              {tab === "signup" ? "Create your account" : "Welcome back"}
            </h1>
            <p className="mb-8 text-center text-sm text-white/40">Your AI sales machine awaits.</p>

            <button
              type="button"
              onClick={() => void handleGoogleSignIn()}
              disabled={loading}
              className="mb-4 flex w-full items-center justify-center gap-3 rounded-xl bg-white px-4 py-3 text-sm font-medium text-gray-900 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
                <path
                  fill="#FFC107"
                  d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.3 6.3 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"
                />
                <path
                  fill="#FF3D00"
                  d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.3 6.3 29.4 4 24 4c-7.7 0-14.3 4.3-17.7 10.7z"
                />
                <path
                  fill="#4CAF50"
                  d="M24 44c5.2 0 10-2 13.6-5.3l-6.3-5.3C29.2 35 26.7 36 24 36c-5.3 0-9.7-3.3-11.4-8l-6.5 5C9.4 39.6 16.2 44 24 44z"
                />
                <path
                  fill="#1976D2"
                  d="M43.6 20.5H42V20H24v8h11.3c-1 2.9-3 5.1-5.9 6.5l6.3 5.3C39 36.9 44 31 44 24c0-1.3-.1-2.4-.4-3.5z"
                />
              </svg>
              Continue with Google
            </button>

            <div className="mb-4 flex items-center gap-3">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-xs text-white/30">or</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            <div className="mb-4 flex rounded-xl bg-white/5 p-1">
              <button
                type="button"
                onClick={() => setTab("signup")}
                className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                  tab === "signup"
                    ? "bg-white/10 text-white"
                    : "text-white/40 hover:text-white/60"
                }`}
              >
                Sign up
              </button>
              <button
                type="button"
                onClick={() => setTab("signin")}
                className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                  tab === "signin"
                    ? "bg-white/10 text-white"
                    : "text-white/40 hover:text-white/60"
                }`}
              >
                Sign in
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                autoComplete="email"
                className="mb-3 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/25 transition-colors focus:border-indigo-500/50 focus:outline-none"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                autoComplete={tab === "signup" ? "new-password" : "current-password"}
                className="mb-4 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/25 transition-colors focus:border-indigo-500/50 focus:outline-none"
              />
              {error ? <p className="mb-3 text-sm text-red-400">{error}</p> : null}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading
                  ? tab === "signup"
                    ? "Creating account…"
                    : "Signing in…"
                  : tab === "signup"
                    ? "Create account →"
                    : "Sign in →"}
              </button>
            </form>
          </>
        ) : (
          <div className="text-center">
            <div className="mb-8 flex justify-center">
              <Logo size="lg" variant="dark" href="/" />
            </div>
            <p className="mb-2 text-sm font-medium text-white">Check your email</p>
            <p className="mb-6 text-sm leading-relaxed text-white/45">
              We sent a confirmation link to <span className="text-white/70">{confirmationEmail}</span>.
              Click it to activate your account.
            </p>
            <Link
              href="/"
              className="inline-block text-sm text-indigo-400 transition-colors hover:text-indigo-300"
            >
              ← Back to lacore.ai
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
