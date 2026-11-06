import React, { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { Session } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "./supabase";

interface TimeLeft {
  years: number;
  months: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  diff: number;
  status: "pre" | "active" | "done";
}

type SaveState = "idle" | "saving" | "saved" | "error";

const START = new Date("2026-06-16T00:00:00+05:30");
const END = new Date("2031-06-16T00:00:00+05:30");

function getTimeLeft(): TimeLeft {
  const now = new Date();
  let target = END;
  let status: TimeLeft["status"] = "active";

  if (now < START) {
    target = START;
    status = "pre";
  } else if (now >= END) {
    status = "done";
  }

  const diff = target.getTime() - now.getTime();

  if (status === "done") {
    return {
      years: 0,
      months: 0,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      diff: 0,
      status,
    };
  }

  let remaining = diff;
  const msInYear = 365.25 * 24 * 60 * 60 * 1000;
  const msInMonth = 30.4375 * 24 * 60 * 60 * 1000;
  const msInDay = 24 * 60 * 60 * 1000;
  const msInHour = 60 * 60 * 1000;

  const years = Math.floor(remaining / msInYear);
  remaining -= years * msInYear;
  const months = Math.floor(remaining / msInMonth);
  remaining -= months * msInMonth;
  const days = Math.floor(remaining / msInDay);
  remaining -= days * msInDay;
  const hours = Math.floor(remaining / msInHour);
  remaining -= hours * msInHour;
  const minutes = Math.floor(remaining / 60000);
  remaining -= minutes * 60000;
  const seconds = Math.floor(remaining / 1000);

  return { years, months, days, hours, minutes, seconds, diff, status };
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export default function App() {
  const [time, setTime] = useState<TimeLeft>(getTimeLeft());
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [notesLoading, setNotesLoading] = useState(false);
  const [note, setNote] = useState("");
  const [titleText, setTitleText] = useState("Sanjeev");
  const [editTitle, setEditTitle] = useState(false);
  const [email, setEmail] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [authError, setAuthError] = useState("");
  const [sendingLink, setSendingLink] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => setTime(getTimeLeft()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const client = supabase;

    if (!client) {
      setAuthLoading(false);
      return;
    }

    void client.auth.getSession().then(({ data, error }) => {
      if (error) {
        setAuthError(error.message);
      }
      setSession(data.session);
      setAuthLoading(false);
    });

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const client = supabase;

    if (!client || !session) {
      setNote("");
      setTitleText("Sanjeev");
      setNotesLoading(false);
      setSaveState("idle");
      return;
    }

    let active = true;
    setNotesLoading(true);
    setSaveState("idle");

    void client
      .from("user_notes")
      .select("note, title")
      .eq("user_id", session.user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) {
          return;
        }

        if (error) {
          setAuthError(
            error.code === "42P01"
              ? "Notes storage still needs its database migration."
              : error.message,
          );
        } else if (data) {
          setNote(data.note ?? "");
          setTitleText(data.title ?? "Sanjeev");
        }

        setNotesLoading(false);
      });

    return () => {
      active = false;
    };
  }, [session]);

  useEffect(
    () => () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
      }
    },
    [],
  );

  const persistSave = useCallback(
    async (nextNote: string, nextTitle: string) => {
      const client = supabase;

      if (!client || !session) {
        return;
      }

      setSaveState("saving");
      const { error } = await client.from("user_notes").upsert(
        {
          user_id: session.user.id,
          note: nextNote,
          title: nextTitle.trim() || "Sanjeev",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );

      if (error) {
        setSaveState("error");
        setAuthError(error.message);
        return;
      }

      setSaveState("saved");
      window.setTimeout(() => setSaveState("idle"), 2000);
    },
    [session],
  );

  const handleNoteChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = event.target.value;
    setNote(value);

    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
    }

    saveTimer.current = window.setTimeout(() => {
      void persistSave(value, titleText);
    }, 800);
  };

  const handleTitleSave = () => {
    setEditTitle(false);

    if (session) {
      void persistSave(note, titleText);
    }
  };

  const handleSignIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const client = supabase;

    if (!client) {
      setAuthError("Private notes are not configured yet.");
      return;
    }

    setSendingLink(true);
    setAuthError("");
    setAuthMessage("");

    const { error } = await client.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    });

    if (error) {
      setAuthError(error.message);
    } else {
      setAuthMessage("Check your email for a secure sign-in link.");
    }

    setSendingLink(false);
  };

  const handleSignOut = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    setAuthMessage("");
    setAuthError("");
  };

  const totalDuration = END.getTime() - START.getTime();
  const elapsed = Date.now() - START.getTime();
  const progress =
    time.status === "pre"
      ? 0
      : time.status === "done"
        ? 100
        : Math.max(0, Math.min(100, (elapsed / totalDuration) * 100));

  if (time.status === "done") {
    return (
      <div style={styles.root}>
        <div style={styles.doneBox}>
          <div style={styles.doneEmoji}>🏆</div>
          <h1 style={styles.doneTitle}>You made it, {titleText}.</h1>
          <p style={styles.doneSub}>
            June 16, 2031 — 5 years of work, faith, and fire.
          </p>
        </div>
      </div>
    );
  }

  const { years, months, days, hours, minutes, seconds, status } = time;
  const saveLabel =
    notesLoading || authLoading
      ? "Loading..."
      : saveState === "saving"
        ? "Saving..."
        : saveState === "saved"
          ? "✅ Saved privately"
          : saveState === "error"
            ? "Could not save"
            : "Auto-saves privately";

  return (
    <div style={styles.root}>
      <div style={styles.bgGlow1} />
      <div style={styles.bgGlow2} />

      <main style={styles.main}>
        <div style={styles.titleRow}>
          {editTitle && session ? (
            <input
              autoFocus
              value={titleText}
              onChange={(event) => setTitleText(event.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  handleTitleSave();
                }
              }}
              style={styles.titleInput}
              maxLength={30}
            />
          ) : (
            <h1
              style={{
                ...styles.heroTitle,
                cursor: session ? "pointer" : "default",
              }}
              onClick={() => session && setEditTitle(true)}
              title={session ? "Click to edit your name" : undefined}
            >
              {titleText}
              {session && <span style={styles.editHint}>✏️</span>}
            </h1>
          )}
        </div>

        <p style={styles.heroSub}>
          {status === "pre" ? "journey begins in" : "you have"}
        </p>

        <div style={styles.countdownGrid}>
          {[
            { value: years, label: "Years" },
            { value: months, label: "Months" },
            { value: days, label: "Days" },
            { value: hours, label: "Hours" },
            { value: minutes, label: "Minutes" },
            { value: seconds, label: "Seconds" },
          ].map(({ value, label }) => (
            <div key={label} style={styles.block}>
              <span style={styles.blockNum}>{pad(value)}</span>
              <span style={styles.blockLabel}>{label}</span>
            </div>
          ))}
        </div>

        <p style={styles.heroEnd}>
          {status === "pre"
            ? "until your transformation officially starts."
            : "left to become who you're meant to be."}
        </p>

        <div style={styles.progressWrap}>
          <div style={styles.progressTrack}>
            <div style={{ ...styles.progressFill, width: `${progress}%` }} />
          </div>
          <div style={styles.progressLabels}>
            <span style={styles.progressDate}>Jun 16, 2026</span>
            <span style={styles.progressPct}>
              {status === "pre" ? "Not started yet" : `${progress.toFixed(2)}% elapsed`}
            </span>
            <span style={styles.progressDate}>Jun 16, 2031</span>
          </div>
        </div>

        <div style={styles.divider}>
          <span style={styles.dividerText}>✦ YOUR SPACE ✦</span>
        </div>

        <div style={styles.notepadWrap}>
          <div style={styles.notepadHeader}>
            <span style={styles.notepadIcon}>📝</span>
            <span style={styles.notepadLabel}>Private notes</span>
            {session && (
              <button style={styles.signOutButton} onClick={() => void handleSignOut()}>
                Sign out
              </button>
            )}
            <span style={styles.saveStatus}>
              {session ? saveLabel : "Private to your account"}
            </span>
          </div>

          {!isSupabaseConfigured ? (
            <div style={styles.authPanel}>
              <strong>Private notes are being configured.</strong>
              <p style={styles.authCopy}>
                The public countdown is ready; private notes will be available after the
                production environment variables are deployed.
              </p>
            </div>
          ) : !session ? (
            <div style={styles.authPanel}>
              <strong>Sign in to open your private notes.</strong>
              <p style={styles.authCopy}>
                The countdown is public. Your notes are not — a secure email link unlocks
                only your own saved space.
              </p>
              <form style={styles.authForm} onSubmit={handleSignIn}>
                <input
                  style={styles.emailInput}
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  aria-label="Email address"
                  required
                />
                <button style={styles.authButton} type="submit" disabled={sendingLink}>
                  {sendingLink ? "Sending..." : "Email me a sign-in link"}
                </button>
              </form>
              {authMessage && <p style={styles.authSuccess}>{authMessage}</p>}
              {authError && <p style={styles.authError}>{authError}</p>}
            </div>
          ) : (
            <>
              <textarea
                value={note}
                onChange={handleNoteChange}
                placeholder="This is your space. Write your dreams, plans, wins, and thoughts. 🔥"
                style={styles.textarea}
                spellCheck={false}
                disabled={notesLoading}
              />
              <div style={styles.notepadFooter}>
                <span style={styles.charCount}>{note.length} characters</span>
                <span style={styles.notepadTip}>
                  Private to {session.user.email ?? "your account"} · emoji supported 🌍
                </span>
              </div>
              {authError && <p style={styles.authError}>{authError}</p>}
            </>
          )}
        </div>

        <footer style={styles.footer}>
          Made for Sanjeev · Started June 16, 2026 at 12:00 AM IST · Ends June 16, 2031 at
          12:00 AM IST
        </footer>
      </main>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  root: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #0a0a0f 0%, #0d0d1a 50%, #0a0f0a 100%)",
    fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
    color: "#e8e8f0",
    position: "relative",
    overflowX: "hidden",
  },
  bgGlow1: {
    position: "fixed",
    top: "-20%",
    right: "-10%",
    width: "500px",
    height: "500px",
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)",
    pointerEvents: "none",
  },
  bgGlow2: {
    position: "fixed",
    bottom: "-20%",
    left: "-10%",
    width: "600px",
    height: "600px",
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)",
    pointerEvents: "none",
  },
  main: {
    maxWidth: "900px",
    margin: "0 auto",
    padding: "60px 24px 40px",
    position: "relative",
    zIndex: 1,
  },
  titleRow: { textAlign: "center", marginBottom: "4px" },
  heroTitle: {
    fontSize: "clamp(2.4rem, 6vw, 4rem)",
    fontWeight: 800,
    letterSpacing: "-0.02em",
    background: "linear-gradient(90deg, #a5b4fc, #6ee7b7, #a5b4fc)",
    backgroundSize: "200%",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
    margin: 0,
    display: "inline-flex",
    alignItems: "center",
    gap: "12px",
  },
  editHint: {
    fontSize: "1.2rem",
    opacity: 0.4,
    WebkitTextFillColor: "initial",
    background: "none",
    WebkitBackgroundClip: "unset",
  },
  titleInput: {
    fontSize: "clamp(2rem, 5vw, 3.5rem)",
    fontWeight: 800,
    background: "transparent",
    border: "none",
    borderBottom: "2px solid #6366f1",
    color: "#a5b4fc",
    outline: "none",
    textAlign: "center",
    width: "300px",
    letterSpacing: "-0.02em",
  },
  heroSub: {
    textAlign: "center",
    fontSize: "1.1rem",
    color: "#6b7280",
    marginBottom: "28px",
    letterSpacing: "0.1em",
    textTransform: "uppercase",
  },
  heroEnd: {
    textAlign: "center",
    fontSize: "1rem",
    color: "#4b5563",
    marginTop: "20px",
    fontStyle: "italic",
    letterSpacing: "0.03em",
  },
  countdownGrid: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: "12px",
    margin: "0 auto",
    maxWidth: "860px",
  },
  block: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(99,102,241,0.2)",
    borderRadius: "16px",
    padding: "20px 18px 14px",
    minWidth: "110px",
    flex: "1 1 100px",
    maxWidth: "140px",
    backdropFilter: "blur(8px)",
  },
  blockNum: {
    fontSize: "clamp(2rem, 4vw, 2.8rem)",
    fontWeight: 700,
    fontVariantNumeric: "tabular-nums",
    color: "#e0e7ff",
    lineHeight: 1,
    fontFamily: "'SF Mono', 'Fira Code', monospace",
  },
  blockLabel: {
    fontSize: "0.65rem",
    textTransform: "uppercase",
    letterSpacing: "0.14em",
    color: "#6366f1",
    marginTop: "8px",
    fontWeight: 600,
  },
  progressWrap: { marginTop: "32px" },
  progressTrack: {
    height: "4px",
    background: "rgba(255,255,255,0.07)",
    borderRadius: "2px",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    background: "linear-gradient(90deg, #6366f1, #10b981)",
    borderRadius: "2px",
    transition: "width 1s linear",
  },
  progressLabels: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: "8px",
  },
  progressDate: { fontSize: "0.7rem", color: "#374151", letterSpacing: "0.05em" },
  progressPct: { fontSize: "0.7rem", color: "#6366f1", fontFamily: "monospace" },
  divider: { textAlign: "center", margin: "48px 0 36px", position: "relative" },
  dividerText: {
    fontSize: "0.65rem",
    letterSpacing: "0.3em",
    color: "#374151",
    background: "#0a0a0f",
    padding: "0 16px",
    position: "relative",
    zIndex: 1,
  },
  notepadWrap: {
    background: "rgba(255,255,255,0.025)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "20px",
    overflow: "hidden",
    backdropFilter: "blur(10px)",
  },
  notepadHeader: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "14px 20px",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    background: "rgba(99,102,241,0.05)",
  },
  notepadIcon: { fontSize: "1rem" },
  notepadLabel: {
    fontSize: "0.8rem",
    fontWeight: 600,
    color: "#9ca3af",
    flex: 1,
    letterSpacing: "0.05em",
  },
  saveStatus: { fontSize: "0.7rem", color: "#4b5563", fontStyle: "italic" },
  textarea: {
    width: "100%",
    minHeight: "420px",
    background: "transparent",
    border: "none",
    outline: "none",
    color: "#d1d5db",
    fontSize: "1rem",
    lineHeight: 1.8,
    padding: "24px",
    resize: "vertical",
    fontFamily: "'Inter', system-ui, sans-serif",
    boxSizing: "border-box",
  },
  notepadFooter: {
    display: "flex",
    justifyContent: "space-between",
    padding: "10px 20px",
    borderTop: "1px solid rgba(255,255,255,0.04)",
    gap: "12px",
  },
  charCount: { fontSize: "0.68rem", color: "#374151", fontFamily: "monospace" },
  notepadTip: { fontSize: "0.68rem", color: "#374151", textAlign: "right" },
  footer: {
    textAlign: "center",
    marginTop: "48px",
    fontSize: "0.7rem",
    color: "#1f2937",
    letterSpacing: "0.08em",
  },
  doneBox: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    padding: "40px",
  },
  doneEmoji: { fontSize: "5rem", marginBottom: "20px" },
  doneTitle: {
    fontSize: "3rem",
    fontWeight: 800,
    background: "linear-gradient(90deg, #fbbf24, #f59e0b)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    margin: "0 0 12px",
  },
  doneSub: { color: "#6b7280", fontSize: "1.1rem" },
  authPanel: { padding: "28px 24px", textAlign: "center", color: "#d1d5db" },
  authCopy: {
    color: "#9ca3af",
    lineHeight: 1.6,
    margin: "12px auto 20px",
    maxWidth: "560px",
  },
  authForm: {
    display: "flex",
    justifyContent: "center",
    gap: "10px",
    flexWrap: "wrap",
  },
  emailInput: {
    minWidth: "220px",
    flex: "1 1 220px",
    maxWidth: "320px",
    borderRadius: "10px",
    border: "1px solid rgba(165,180,252,0.35)",
    background: "rgba(10,10,15,0.7)",
    color: "#e0e7ff",
    padding: "12px 14px",
    outline: "none",
    font: "inherit",
  },
  authButton: {
    border: "1px solid rgba(110,231,183,0.45)",
    borderRadius: "10px",
    background: "linear-gradient(90deg, #4f46e5, #059669)",
    color: "#fff",
    padding: "12px 16px",
    font: "inherit",
    fontWeight: 700,
    cursor: "pointer",
  },
  signOutButton: {
    border: "none",
    background: "transparent",
    color: "#a5b4fc",
    cursor: "pointer",
    fontSize: "0.72rem",
    padding: "4px",
  },
  authSuccess: { color: "#6ee7b7", marginBottom: 0 },
  authError: { color: "#fca5a5", margin: "12px 24px 20px", textAlign: "center" },
};
