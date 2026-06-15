import React, { useState, useEffect, useRef, useCallback } from "react";
import { CSSProperties } from "react";

// Types for the countdown data
interface TimeLeft {
  years: number;
  months: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  diff: number;
}

// Global window extension for the custom storage API
declare global {
  interface Window {
    storage: {
      get: (key: string) => Promise<{ value: string } | null>;
      set: (key: string, value: string) => Promise<void>;
    };
  }
}

const START = new Date("2026-06-16T00:00:00+05:30");
const END   = new Date("2031-06-16T00:00:00+05:30");
const TOTAL_MS = END.getTime() - START.getTime();

function getTimeLeft(): TimeLeft | null {
  const now = new Date();
  const diff = END.getTime() - now.getTime();
  if (diff <= 0) return null;

  let remaining = diff;
  const msInYear = 365.25 * 24 * 3600 * 1000;
  const years   = Math.floor(remaining / msInYear);
  remaining    -= years * msInYear;
  
  const msInMonth = 30.4375 * 24 * 3600 * 1000;
  const months  = Math.floor(remaining / msInMonth);
  remaining    -= months * msInMonth;
  
  const msInDay = 24 * 3600 * 1000;
  const days    = Math.floor(remaining / msInDay);
  remaining    -= days * msInDay;
  
  const msInHour = 3600 * 1000;
  const hours   = Math.floor(remaining / msInHour);
  remaining    -= hours * msInHour;
  
  const minutes = Math.floor(remaining / 60000);
  remaining    -= minutes * 60000;
  
  const seconds = Math.floor(remaining / 1000);

  return { years, months, days, hours, minutes, seconds, diff };
}

function pad(n: number): string { return String(n).padStart(2, "0"); }

const STORAGE_KEY = "sanjeev-notes-v1";

export default function App() {
  const [time, setTime]         = useState<TimeLeft | null>(getTimeLeft());
  const [note, setNote]         = useState<string>("");
  const [saved, setSaved]       = useState<boolean>(false);
  const [loading, setLoading]   = useState<boolean>(true);
  const [editTitle, setEditTitle] = useState<boolean>(false);
  const [titleText, setTitleText] = useState<string>("Sanjeev");
  const [notePlaceholder] = useState<string>(
    "This is your space. Write in any language — your dreams, plans, daily thoughts, wins, struggles. Everything stays here, waiting for you. 🔥"
  );
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load from persistent storage
  useEffect(() => {
    (async () => {
      try {
        if (window.storage) {
          const r = await window.storage.get(STORAGE_KEY);
          if (r && r.value) {
            const data = JSON.parse(r.value);
            setNote(data.note || "");
            setTitleText(data.title || "Sanjeev");
          }
        }
      } catch (_) {}
      setLoading(false);
    })();
  }, []);

  // Countdown tick
  useEffect(() => {
    const id = setInterval(() => setTime(getTimeLeft()), 1000);
    return () => clearInterval(id);
  }, []);

  // Auto-save note to storage
  const persistSave = useCallback(async (noteVal: string, titleVal: string) => {
    try {
      if (window.storage) {
        await window.storage.set(STORAGE_KEY, JSON.stringify({ note: noteVal, title: titleVal }));
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (_) {}
  }, []);

  const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setNote(val);
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
    }
    saveTimer.current = setTimeout(() => persistSave(val, titleText), 800);
  };

  const handleTitleSave = () => {
    setEditTitle(false);
    persistSave(note, titleText);
  };

  const progress = time ? Math.max(0, Math.min(100, ((Date.now() - START.getTime()) / TOTAL_MS) * 100)) : 100;

  if (!time) {
    return (
      <div style={styles.root}>
        <div style={styles.doneBox}>
          <div style={styles.doneEmoji}>🏆</div>
          <h1 style={styles.doneTitle}>You made it, {titleText}.</h1>
          <p style={styles.doneSub}>June 16, 2031 — 5 years of work, faith, and fire.</p>
        </div>
      </div>
    );
  }

  const { years, months, days, hours, minutes, seconds } = time;

  return (
    <div style={styles.root}>
      {/* Background particles */}
      <div style={styles.bgGlow1} />
      <div style={styles.bgGlow2} />

      <main style={styles.main}>
        {/* TITLE */}
        <div style={styles.titleRow}>
          {editTitle ? (
            <input
              autoFocus
              value={titleText}
              onChange={e => setTitleText(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={e => e.key === "Enter" && handleTitleSave()}
              style={styles.titleInput}
              maxLength={30}
            />
          ) : (
            <h1 style={styles.heroTitle} onClick={() => setEditTitle(true)} title="Click to edit your name">
              {titleText}
              <span style={styles.editHint}>✏️</span>
            </h1>
          )}
        </div>

        <p style={styles.heroSub}>you have</p>

        {/* COUNTDOWN BLOCKS */}
        <div style={styles.countdownGrid}>
          {[
            { value: years,   label: "Years"   },
            { value: months,  label: "Months"  },
            { value: days,    label: "Days"    },
            { value: hours,   label: "Hours"   },
            { value: minutes, label: "Minutes" },
            { value: seconds, label: "Seconds" },
          ].map(({ value, label }) => (
            <div key={label} style={styles.block}>
              <span style={styles.blockNum}>{pad(value)}</span>
              <span style={styles.blockLabel}>{label}</span>
            </div>
          ))}
        </div>

        <p style={styles.heroEnd}>left to become who you're meant to be.</p>

        {/* PROGRESS BAR */}
        <div style={styles.progressWrap}>
          <div style={styles.progressTrack}>
            <div style={{ ...styles.progressFill, width: `${progress}%` }} />
          </div>
          <div style={styles.progressLabels}>
            <span style={styles.progressDate}>Jun 16, 2026</span>
            <span style={styles.progressPct}>{progress.toFixed(2)}% elapsed</span>
            <span style={styles.progressDate}>Jun 16, 2031</span>
          </div>
        </div>

        {/* DIVIDER */}
        <div style={styles.divider}>
          <span style={styles.dividerText}>✦ YOUR SPACE ✦</span>
        </div>

        {/* NOTEPAD */}
        <div style={styles.notepadWrap}>
          <div style={styles.notepadHeader}>
            <span style={styles.notepadIcon}>📝</span>
            <span style={styles.notepadLabel}>Notes — write in any language</span>
            <span style={styles.saveStatus}>
              {loading ? "Loading..." : saved ? "✅ Saved" : "Auto-saves as you type"}
            </span>
          </div>
          <textarea
            ref={textareaRef}
            value={note}
            onChange={handleNoteChange}
            placeholder={notePlaceholder}
            style={styles.textarea}
            spellCheck={false}
          />
          <div style={styles.notepadFooter}>
            <span style={styles.charCount}>{note.length} characters</span>
            <span style={styles.notepadTip}>Supports any language, emoji, symbols 🌍</span>
          </div>
        </div>

        <footer style={styles.footer}>
          Made for Sanjeev · Started June 16, 2026 at 12:00 AM IST · Ends June 16, 2031 at 12:00 AM IST
        </footer>
      </main>
    </div>
  );
}

const styles: { [key: string]: CSSProperties } = {
  root: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #0a0a0f 0%, #0d0d1a 50%, #0a0f0a 100%)",
    fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
    color: "#e8e8f0",
    position: "relative",
    overflowX: "hidden",
  },
  bgGlow1: {
    position: "fixed", top: "-20%", right: "-10%",
    width: "500px", height: "500px",
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)",
    pointerEvents: "none",
  },
  bgGlow2: {
    position: "fixed", bottom: "-20%", left: "-10%",
    width: "600px", height: "600px",
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
  titleRow: {
    textAlign: "center",
    marginBottom: "4px",
  },
  heroTitle: {
    fontSize: "clamp(2.4rem, 6vw, 4rem)",
    fontWeight: 800,
    letterSpacing: "-0.02em",
    background: "linear-gradient(90deg, #a5b4fc, #6ee7b7, #a5b4fc)",
    backgroundSize: "200%",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text" as any,
    margin: 0,
    cursor: "pointer",
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
    transition: "border-color 0.3s",
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
  progressWrap: {
    marginTop: "32px",
  },
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
  progressDate: {
    fontSize: "0.7rem",
    color: "#374151",
    letterSpacing: "0.05em",
  },
  progressPct: {
    fontSize: "0.7rem",
    color: "#6366f1",
    fontFamily: "monospace",
  },
  divider: {
    textAlign: "center",
    margin: "48px 0 36px",
    position: "relative",
  },
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
  saveStatus: {
    fontSize: "0.7rem",
    color: "#4b5563",
    fontStyle: "italic",
  },
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
  },
  charCount: {
    fontSize: "0.68rem",
    color: "#374151",
    fontFamily: "monospace",
  },
  notepadTip: {
    fontSize: "0.68rem",
    color: "#374151",
  },
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
};
            
