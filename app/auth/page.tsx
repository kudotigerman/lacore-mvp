"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { getSupabaseClient } from "@/lib/supabase";

type AuthMode = "signup" | "signin";

export default function AuthPage() {
  const [mode, setMode] = useState<AuthMode>("signup");
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
        router.replace("/dashboard");
      }
    }
    void redirectIfSession();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session?.user) return;
      if (event === "SIGNED_IN") {
        router.replace("/dashboard");
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
      if (mode === "signup") {
        const normalizedEmail = email.trim();
        // For easier local testing, disable email confirmations in Supabase Dashboard:
        // Authentication -> Providers -> Email -> turn off "Confirm email".
        const redirectUrl =
          typeof window !== "undefined" ? `${window.location.origin}/dashboard` : undefined;
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: redirectUrl ? { emailRedirectTo: redirectUrl } : undefined
        });
        if (signUpError) throw signUpError;
        if (signUpData.session?.user) {
          router.replace("/dashboard");
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
      router.replace("/dashboard");
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
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: origin ? `${origin}/dashboard` : "https://www.lacore.ai/dashboard"
        }
      });
      if (oauthError) throw oauthError;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign in failed.");
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "var(--bg-primary)",
        color: "var(--text-primary)",
        padding: "24px max(24px, 5vw)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        boxSizing: "border-box"
      }}
    >
      <section style={{ width: "100%", maxWidth: 560, flexShrink: 0 }}>
        <Link
          href="/"
          style={{
            display: "inline-block",
            fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
            fontSize: 11,
            letterSpacing: "0.14em",
            color: "var(--accent)",
            textDecoration: "none"
          }}
        >
          ← BACK TO LACORE
        </Link>
        <div style={{ marginTop: 12 }}>
          <Logo size="lg" variant="dark" href="/" />
        </div>
        <h1
          style={{
            margin: "14px 0 0",
            fontFamily: "var(--font-geist-sans), system-ui, sans-serif", fontWeight: 800, letterSpacing: "-0.02em",
            fontSize: "clamp(2rem, 6vw, 3.5rem)",
            lineHeight: 1.12
          }}
        >
          <span style={{ display: "block", color: "var(--text-primary)" }}>YOUR SALES MACHINE</span>
          <span style={{ display: "block", color: "var(--accent)" }}>STARTS HERE.</span>
        </h1>

        {!emailConfirmationSent ? (
          <>
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              style={{
                width: "100%",
                marginTop: 20,
                border: "1px solid var(--border-secondary)",
                background: "#ffffff",
                color: "#000000",
                fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                fontSize: 12,
                letterSpacing: "0.1em",
                padding: "14px",
                cursor: loading ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10
              }}
              onMouseEnter={(event) => {
                if (!loading) event.currentTarget.style.background = "var(--text-primary)";
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.background = "#ffffff";
              }}
            >
              <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
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
              CONTINUE WITH GOOGLE
            </button>

            <div
              style={{
                marginTop: 14,
                display: "flex",
                alignItems: "center",
                gap: 10
              }}
            >
              <div style={{ flex: 1, height: 1, background: "var(--border-secondary)" }} />
              <p
                style={{
                  margin: 0,
                  fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                  fontSize: 10,
                  color: "var(--text-muted)",
                  letterSpacing: "0.14em"
                }}
              >
                OR
              </p>
              <div style={{ flex: 1, height: 1, background: "var(--border-secondary)" }} />
            </div>

            <div style={{ marginTop: 18, display: "flex", gap: 24 }}>
              {[
                { key: "signup", label: "SIGN UP" },
                { key: "signin", label: "SIGN IN" }
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setMode(tab.key as AuthMode)}
                  style={{
                    border: "none",
                    background: "transparent",
                    padding: "0 0 8px",
                    color: mode === tab.key ? "var(--accent)" : "var(--text-muted)",
                    borderBottom: mode === tab.key ? "1px solid var(--accent)" : "1px solid transparent",
                    fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                    fontSize: 12,
                    letterSpacing: "0.15em",
                    cursor: "pointer"
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} style={{ marginTop: 20 }}>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Email"
                style={{
                  width: "100%",
                  border: "none",
                  borderBottom: "1px solid var(--border-primary)",
                  background: "transparent",
                  color: "var(--text-primary)",
                  padding: "12px 4px",
                  outline: "none",
                  fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                  fontSize: 14
                }}
              />
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Password"
                style={{
                  width: "100%",
                  marginTop: 18,
                  border: "none",
                  borderBottom: "1px solid var(--border-primary)",
                  background: "transparent",
                  color: "var(--text-primary)",
                  padding: "12px 4px",
                  outline: "none",
                  fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                  fontSize: 14
                }}
              />
              {error && (
                <p
                  style={{
                    margin: "14px 0 0",
                    fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                    color: "#f87171",
                    fontSize: 12
                  }}
                >
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={loading}
                style={{
                  marginTop: 22,
                  border: "1px solid var(--accent)",
                  background: "transparent",
                  color: "var(--accent)",
                  fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                  fontSize: 12,
                  letterSpacing: "0.18em",
                  padding: "12px 20px",
                  cursor: loading ? "not-allowed" : "pointer"
                }}
              >
                {loading
                  ? mode === "signup"
                    ? "CREATING ACCOUNT..."
                    : "SIGNING IN..."
                  : mode === "signup"
                    ? "CREATE ACCOUNT →"
                    : "SIGN IN →"}
              </button>
            </form>
          </>
        ) : (
          <div style={{ marginTop: 28, textAlign: "center" }}>
            <p
              style={{
                margin: 0,
                fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                color: "var(--accent)",
                fontSize: 13,
                lineHeight: 1.8
              }}
            >
              CHECK YOUR EMAIL. We sent a confirmation link to {confirmationEmail}. Click it to
              activate your account.
            </p>
            <Link
              href="/"
              style={{
                display: "inline-block",
                marginTop: 14,
                border: "1px solid var(--accent)",
                color: "var(--accent)",
                textDecoration: "none",
                fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
                fontSize: 11,
                letterSpacing: "0.14em",
                padding: "8px 12px"
              }}
            >
              ← BACK TO LACORE
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
