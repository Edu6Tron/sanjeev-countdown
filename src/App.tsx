import { useState, useEffect, useRef, useCallback } from "react";

const START = new Date("2026-06-16T00:00:00+05:30");
const END   = new Date("2031-06-16T00:00:00+05:30");
const TOTAL_MS = END - START;

function getTimeLeft() {
  const now = new Date();
  const diff = END - now;
  if (diff <= 0) return null;

  let remaining = diff;
  const years   = Math.floor(remaining / (365.25 * 24 * 3600 * 1000));
  remaining    -= years * (365.25 * 24 * 3600 * 1000);
  const months  = Math.floor(remaining / (30.4375 * 24 * 3600 * 1000));
  remaining    -= months * (30.4375 * 24 * 3600 * 1000);
  const days    = Math.floor(remaining / (24 * 3600 * 1000));
  remaining    -= days * (24 * 3600 * 1000);
  const hours   = Math.floor(remaining / (3600 * 1000));
  remaining    -= hours * (3600 * 1000);
  const minutes = Math.floor(remaining / 60000);
  remaining    -= minutes * 60000;
  const seconds = Math.floor(remaining / 1000);

  return { years, months, days, hours, minutes, seconds, diff };
}

function pad(n) { return String(n).padStart(2, "0"); }

const STORAGE_KEY = "sanjeev-notes-v1";

export default function App() {
  const [time, setTime]           = useState(getTimeLeft());
  const [note, setNote]           = useState("");
  const [saved, setSaved]         = useState(false);
  const [loading, setLoading]     = useState(true);
  const [editTitle, setEditTitle] = useState(false);
  const [titleText, setTitleText] = useState("Sanjeev");
  const saveTimer = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await window.storage.get(STORAGE_KEY);
        if (r && r.value) {
          const data = JSON.parse(r.value);
          setNote(data.note || "");
          setTitleText(data.title || "Sanjeev");
        }
      } catch (_) {}
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    const id = setInterval(() => setTime(getTimeLeft()), 1000);
    return () => clearInterval(id);
  }, []);

  const persistSave = useCallback(async (noteVal, titleVal) => {
    try {
      await window.storage.set(STORAGE_KEY, JSON.stringify({ note: noteVal, title: titleVal }));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (_) {}
  }, []);

  const handleNoteChange = (e) => {
    const val = e.target.value;
    setNote(val);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => persistSave(val, titleText), 800);
  };

  const handleTitleSave = () => {
    setEditTitle(false);
    persistSave(note, titleText);
  };

  const progress = time
    ? Math.max(0, Math.min(100, ((Date.now() - START) / TOTAL_MS) * 100))
    : 100;

  if (!time) {
    return (
      <div style={{ minHeight:"100vh", background:"#0a0a0f", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", textAlign:"center", padding:"40px", color:"#e8e8f0" }}>
        <div style={{ fontSize:"5rem", marginBottom:"20px" }}>🏆</div>
        <h1 style={{ fontSize:"3rem", fontWeight:800, color:"#fbbf24", margin:"0 0 12px" }}>You made it, {titleText}.</h1>
        <p style={{ color:"#6b7280", fontSize:"1.1rem" }}>June 16, 2031 — 5 years of work, faith, and fire.</p>
      </div>
    );
  }

  const { years, months, days, hours, minutes, seconds } = time;

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#0a0a0f 0%,#0d0d1a 50%,#0a0f0a 100%)", fontFamily:"'Inter','Segoe UI',system-ui,sans-serif", color:"#e8e8f0", position:"relative", overflowX:"hidden" }}>

      {/* Glow blobs */}
      <div style={{ position:"fixed", top:"-20%", right:"-10%", width:"500px", height:"500px", borderRadius:"50%", background:"radial-gradient(circle,rgba(99,102,241,0.12) 0%,transparent 70%)", pointerEvents:"none" }} />
      <div style={{ position:"fixed", bottom:"-20%", left:"-10%", width:"600px", height:"600px", borderRadius:"50%", background:"radial-gradient(circle,rgba(16,185,129,0.08) 0%,transparent 70%)", pointerEvents:"none" }} />

      <main style={{ maxWidth:"900px", margin:"0 auto", padding:"60px 24px 40px", position:"relative", zIndex:1 }}>

        {/* TITLE */}
        <div style={{ textAlign:"center", marginBottom:"4px" }}>
          {editTitle ? (
            <input
              autoFocus
              value={titleText}
              onChange={e => setTitleText(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={e => e.key === "Enter" && handleTitleSave()}
              maxLength={30}
              style={{ fontSize:"clamp(2rem,5vw,3.5rem)", fontWeight:800, background:"transparent", border:"none", borderBottom:"2px solid #6366f1", color:"#a5b4fc", outline:"none", textAlign:"center", width:"300px", letterSpacing:"-0.02em" }}
            />
          ) : (
            <h1
              onClick={() => setEditTitle(true)}
              title="Click to edit your name"
              style={{ fontSize:"clamp(2.4rem,6vw,4rem)", fontWeight:800, letterSpacing:"-0.02em", background:"linear-gradient(90deg,#a5b4fc,#6ee7b7,#a5b4fc)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent", backgroundClip:"text", margin:0, cursor:"pointer", display:"inline-flex", alignItems:"center", gap:"12px" }}
            >
              {titleText} <span style={{ fontSize:"1.2rem", opacity:0.4, WebkitTextFillColor:"initial" }}>✏️</span>
            </h1>
          )}
        </div>

        <p style={{ textAlign:"center", fontSize:"1.1rem", color:"#6b7280", marginBottom:"28px", letterSpacing:"0.1em", textTransform:"uppercase" }}>you have</p>

        {/* COUNTDOWN BLOCKS */}
        <div style={{ display:"flex", flexWrap:"wrap", justifyContent:"center", gap:"12px", margin:"0 auto", maxWidth:"860px" }}>
          {[
            { value: years,   label: "Years"   },
            { value: months,  label: "Months"  },
            { value: days,    label: "Days"    },
            { value: hours,   label: "Hours"   },
            { value: minutes, label: "Minutes" },
            { value: seconds, label: "Seconds" },
          ].map(({ value, label }) => (
            <div key={label} style={{ display:"flex", flexDirection:"column", alignItems:"center", background:"rgba(255,255,255,0.03)", border:"1px solid rgba(99,102,241,0.2)", borderRadius:"16px", padding:"20px 18px 14px", minWidth:"110px", flex:"1 1 100px", maxWidth:"140px", backdropFilter:"blur(8px)" }}>
              <span style={{ fontSize:"clamp(2rem,4vw,2.8rem)", fontWeight:700, fontVariantNumeric:"tabular-nums", color:"#e0e7ff", lineHeight:1, fontFamily:"'SF Mono','Fira Code',monospace" }}>{pad(value)}</span>
              <span style={{ fontSize:"0.65rem", textTransform:"uppercase", letterSpacing:"0.14em", color:"#6366f1", marginTop:"8px", fontWeight:600 }}>{label}</span>
            </div>
          ))}
        </div>

        <p style={{ textAlign:"center", fontSize:"1rem", color:"#4b5563", marginTop:"20px", fontStyle:"italic", letterSpacing:"0.03em" }}>left to become who you're meant to be.</p>

        {/* PROGRESS BAR */}
        <div style={{ marginTop:"32px" }}>
          <div style={{ height:"4px", background:"rgba(255,255,255,0.07)", borderRadius:"2px", overflow:"hidden" }}>
            <div style={{ height:"100%", width:`${progress}%`, background:"linear-gradient(90deg,#6366f1,#10b981)", borderRadius:"2px", transition:"width 1s linear" }} />
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:"8px" }}>
            <span style={{ fontSize:"0.7rem", color:"#374151", letterSpacing:"0.05em" }}>Jun 16, 2026</span>
            <span style={{ fontSize:"0.7rem", color:"#6366f1", fontFamily:"monospace" }}>{progress.toFixed(2)}% elapsed</span>
            <span style={{ fontSize:"0.7rem", color:"#374151", letterSpacing:"0.05em" }}>Jun 16, 2031</span>
          </div>
        </div>

        {/* DIVIDER */}
        <div style={{ textAlign:"center", margin:"48px 0 36px" }}>
          <span style={{ fontSize:"0.65rem", letterSpacing:"0.3em", color:"#374151", padding:"0 16px" }}>✦ YOUR SPACE ✦</span>
        </div>

        {/* NOTEPAD */}
        <div style={{ background:"rgba(255,255,255,0.025)", border:"1px solid rgba(255,255,255,0.08)", borderRadius:"20px", overflow:"hidden", backdropFilter:"blur(10px)" }}>
          <div style={{ display:"flex", alignItems:"center", gap:"10px", padding:"14px 20px", borderBottom:"1px solid rgba(255,255,255,0.06)", background:"rgba(99,102,241,0.05)" }}>
            <span>📝</span>
            <span style={{ fontSize:"0.8rem", fontWeight:600, color:"#9ca3af", flex:1, letterSpacing:"0.05em" }}>Notes — write in any language</span>
            <span style={{ fontSize:"0.7rem", color:"#4b5563", fontStyle:"italic" }}>
              {loading ? "Loading..." : saved ? "✅ Saved" : "Auto-saves as you type"}
            </span>
          </div>
          <textarea
            value={note}
            onChange={handleNoteChange}
            placeholder="This is your space. Write in any language — your dreams, plans, daily thoughts, wins, struggles. Everything stays here, waiting for you. 🔥"
            style={{ width:"100%", minHeight:"420px", background:"transparent", border:"none", outline:"none", color:"#d1d5db", fontSize:"1rem", lineHeight:1.8, padding:"24px", resize:"vertical", fontFamily:"'Inter',system-ui,sans-serif", boxSizing:"border-box" }}
          />
          <div style={{ display:"flex", justifyContent:"space-between", padding:"10px 20px", borderTop:"1px solid rgba(255,255,255,0.04)" }}>
            <span style={{ fontSize:"0.68rem", color:"#374151", fontFamily:"monospace" }}>{note.length} characters</span>
            <span style={{ fontSize:"0.68rem", color:"#374151" }}>Supports any language, emoji, symbols 🌍</span>
          </div>
        </div>

        <footer style={{ textAlign:"center", marginTop:"48px", fontSize:"0.7rem", color:"#1f2937", letterSpacing:"0.08em" }}>
          Made for Sanjeev · Started June 16, 2026 at 12:00 AM IST · Ends June 16, 2031 at 12:00 AM IST
        </footer>

      </main>
    </div>
  );
}
