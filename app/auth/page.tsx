"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim() || !password) return;

    setLoading(true);
    setError(null);

    try {
      const supabase = getSupabaseClient();
      if (mode === "signup") {
        const normalizedEmail = email.trim();
        const { error: signUpError } = await supabase.auth.signUp({
          email: normalizedEmail,
          password
        });
        if (signUpError) throw signUpError;
        setConfirmationEmail(normalizedEmail);
        setEmailConfirmationSent(true);
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      });
      if (signInError) throw signInError;
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#09090B",
        color: "#F4F4F5",
        padding: "40px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}
    >
      <section style={{ width: "100%", maxWidth: 560 }}>
        <p
          style={{
            margin: 0,
            fontFamily: "var(--font-space-mono), monospace",
            fontSize: 12,
            letterSpacing: "0.3em",
            color: "#06B6D4"
          }}
        >
          LACORE
        </p>
        <h1
          style={{
            margin: "24px 0 0",
            fontFamily: "var(--font-bebas-neue), sans-serif",
            fontSize: "clamp(64px,10vw,110px)",
            lineHeight: 0.95
          }}
        >
          <span style={{ display: "block", color: "#F4F4F5" }}>YOUR SALES MACHINE</span>
          <span style={{ display: "block", color: "#06B6D4" }}>STARTS HERE.</span>
        </h1>

        {!emailConfirmationSent ? (
          <>
            <div style={{ marginTop: 26, display: "flex", gap: 24 }}>
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
                    color: mode === tab.key ? "#06B6D4" : "#52525B",
                    borderBottom: mode === tab.key ? "1px solid #06B6D4" : "1px solid transparent",
                    fontFamily: "var(--font-space-mono), monospace",
                    fontSize: 12,
                    letterSpacing: "0.15em",
                    cursor: "pointer"
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} style={{ marginTop: 28 }}>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Email"
                style={{
                  width: "100%",
                  border: "none",
                  borderBottom: "1px solid #1C1C1F",
                  background: "transparent",
                  color: "#F4F4F5",
                  padding: "12px 4px",
                  outline: "none",
                  fontFamily: "var(--font-space-mono), monospace",
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
                  borderBottom: "1px solid #1C1C1F",
                  background: "transparent",
                  color: "#F4F4F5",
                  padding: "12px 4px",
                  outline: "none",
                  fontFamily: "var(--font-space-mono), monospace",
                  fontSize: 14
                }}
              />
              {error && (
                <p
                  style={{
                    margin: "14px 0 0",
                    fontFamily: "var(--font-space-mono), monospace",
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
                  border: "1px solid #06B6D4",
                  background: "transparent",
                  color: "#06B6D4",
                  fontFamily: "var(--font-space-mono), monospace",
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
          <p
            style={{
              margin: "28px 0 0",
              fontFamily: "var(--font-space-mono), monospace",
              color: "#06B6D4",
              fontSize: 13,
              textAlign: "center",
              lineHeight: 1.8
            }}
          >
            CHECK YOUR EMAIL. We sent a confirmation link to {confirmationEmail}. Click it to
            activate your account.
          </p>
        )}
      </section>
    </main>
  );
}
