import { useState, useRef, useEffect } from "react";

const TODAY = "07/07/2026";
const SYS = `You are a provider billing and administrative support assistant. You help billing staff navigate payer rules, resolve billing questions, and make informed decisions about claims, prior authorization, denial management, and payment reconciliation across Medicare FFS, Medicare Advantage, and Medicaid. You are not a payer. You interpret rules. Cite sources with [Source: Document, Section, eff. date]. Use [Tier 1 - Regulatory], [Tier 2 - Plan Policy], or [Tier 3 - Contract] labels. Lead with the actionable answer. Use Illinois as default state. Use realistic values. End responses with a Sources section. Keep responses concise and operational.`;

const METRICS = [
  { label: "Claims Scrubbed", value: "342", delta: "+28", up: true, sub: "98.2% clean rate" },
  { label: "Denials Pending", value: "47", delta: "-12", up: false, sub: "vs. 59 last week" },
  { label: "Active PAs", value: "23", delta: "+5", up: true, sub: "4 expiring this week" },
  { label: "Underpayments", value: "$34,218", delta: "+$8,400", up: true, sub: "18 claims to recover" },
];

const initClaims = () => [
  { id: "CLM-4821", patient: "M. Johnson", cpt: "27447", payer: "UHC Medicare Advantage", status: "flagged", issue: "PA not on file. UHC MA requires prior auth for total knee arthroplasty.", action: "Obtain PA before submission", priority: "high" },
  { id: "CLM-4822", patient: "R. Davis", cpt: "99214", payer: "Aetna Better Health IL", status: "clean", issue: null, action: "Ready to submit", priority: "low" },
  { id: "CLM-4823", patient: "S. Chen", cpt: "70553, 70551", payer: "Medicare FFS", status: "flagged", issue: "NCCI PTP edit: 70553/70551 code pair conflict. Modifier 59 required on 70551 with documentation of distinct procedure.", action: "Add modifier 59 to 70551", priority: "medium" },
  { id: "CLM-4824", patient: "T. Williams", cpt: "97110 x6", payer: "Molina Healthcare IL", status: "flagged", issue: "MUE limit: Molina caps 97110 at 4 units/encounter without supporting documentation. Claim has 6 units.", action: "Reduce to 4 units or attach documentation", priority: "medium" },
  { id: "CLM-4825", patient: "A. Patel", cpt: "59510", payer: "BCBS Medicare Advantage", status: "clean", issue: null, action: "Ready to submit", priority: "low" },
  { id: "CLM-4826", patient: "L. Brown", cpt: "90837", payer: "Meridian Health IL", status: "flagged", issue: "Timely filing risk: DOS 01/15/2026. Meridian 180-day limit expires 07/14/2026 (7 days remaining).", action: "Submit immediately", priority: "high" },
  { id: "CLM-4827", patient: "J. Garcia", cpt: "99213", payer: "Medicare FFS", status: "auto-corrected", issue: "POS code corrected from 11 to 22 (telehealth modifier 95 present).", action: "Review and approve", priority: "low" },
  { id: "CLM-4828", patient: "K. Nguyen", cpt: "99215", payer: "Humana MA", status: "flagged", issue: "Dual-eligible (Medicare + IL Medicaid QMB). Medicare is primary. QMB: cannot balance-bill patient.", action: "Verify COB sequencing", priority: "medium" },
];

const PA_DATA = [
  { id: "PA-1190", patient: "M. Johnson", service: "CPT 27447 - Total Knee Arthroplasty", payer: "UHC Medicare Advantage", submitted: "07/01/2026", status: "pending", eta: "07/15/2026", daysLeft: 8 },
  { id: "PA-1185", patient: "D. Thompson", service: "CPT 22612 - Lumbar Spinal Fusion", payer: "Aetna Better Health IL", submitted: "06/28/2026", status: "approved", expires: "09/28/2026", daysLeft: 83 },
  { id: "PA-1182", patient: "F. Martinez", service: "CPT 70553 - Brain MRI w/ and w/o contrast", payer: "Molina Healthcare IL", submitted: "06/25/2026", status: "denied", reason: "Insufficient clinical documentation. Appeal recommended." },
  { id: "PA-1178", patient: "R. Kim", service: "CPT 27447 - Total Knee Arthroplasty", payer: "BCBS Medicare Advantage", submitted: "06/20/2026", status: "approved", expires: "07/10/2026", daysLeft: 3 },
  { id: "PA-1175", patient: "C. Adams", service: "CPT 43239 - Upper GI Endoscopy w/ Biopsy", payer: "Meridian Health IL", submitted: "07/03/2026", status: "pending", eta: "07/17/2026", daysLeft: 10 },
];

const initDenials = () => [
  { id: "DEN-302", patient: "H. Rivera", cpt: "70553", payer: "Aetna Better Health IL", carc: "197", rarc: "N657", reason: "Prior authorization not obtained", amount: "$1,842", status: "appeal_ready", deadline: "08/09/2026", strategy: "PA was obtained (PA-1162) but auth number not attached to claim. Resubmit with auth number." },
  { id: "DEN-299", patient: "W. Taylor", cpt: "99215", payer: "Medicare FFS", carc: "11", rarc: "MA130", reason: "Diagnosis inconsistent with procedure", amount: "$211", status: "correctable", strategy: "ICD-10 Z00.00 does not support 99215 level visit. Recode to appropriate E/M diagnosis. Resubmit." },
  { id: "DEN-295", patient: "E. Lee", cpt: "97110 x8", payer: "Molina Healthcare IL", carc: "59", rarc: "N362", reason: "Exceeds benefit maximum (MUE)", amount: "$480", status: "partial_recovery", deadline: "08/04/2026", strategy: "4 units payable, 4 denied. Appeal with clinical notes documenting medical necessity for extended session." },
  { id: "DEN-291", patient: "P. Harris", cpt: "99214", payer: "UHC Medicare Advantage", carc: "29", rarc: "N56", reason: "Timely filing limit exceeded", amount: "$148", status: "unrecoverable", strategy: "UHC MA 90-day limit expired. No appeal pathway. System now flags approaching deadlines to prevent recurrence." },
  { id: "DEN-288", patient: "N. Clark", cpt: "43239", payer: "Meridian Health IL", carc: "4", rarc: "MA01", reason: "Missing modifier", amount: "$2,105", status: "correctable", strategy: "Modifier 26 (professional component) missing. Add modifier 26 and resubmit." },
];

const PAYMENTS = [
  { id: "PAY-5501", patient: "G. Morris", cpt: "99214", payer: "Aetna Better Health IL", expected: "$128.52", paid: "$98.20", variance: "-$30.32", status: "underpaid", reason: "Paid at IL Medicaid FFS rate instead of contracted MCO rate." },
  { id: "PAY-5498", patient: "Y. Robinson", cpt: "27447", payer: "BCBS Medicare Advantage", expected: "$1,542.86", paid: "$1,542.86", variance: "$0.00", status: "correct" },
  { id: "PAY-5495", patient: "M. Walker", cpt: "90837", payer: "Molina Healthcare IL", expected: "$112.40", paid: "$89.92", variance: "-$22.48", status: "underpaid", reason: "Sequestration reduction applied incorrectly. Medicaid claims exempt." },
  { id: "PAY-5492", patient: "S. Hall", cpt: "99213", payer: "Medicare FFS", expected: "$92.76", paid: "$92.76", variance: "$0.00", status: "correct" },
  { id: "PAY-5489", patient: "J. Young", cpt: "97110 x4", payer: "Meridian Health IL", expected: "$104.80", paid: "$78.60", variance: "-$26.20", status: "underpaid", reason: "3 of 4 units paid. Contract allows 4. Recovery documentation generated." },
];

const ALERTS = [
  { date: "07/06", payer: "Molina Healthcare IL", text: "CPT 64483 (epidural injection) now requires PA effective 07/15. 3 scheduled procedures affected.", sev: "high" },
  { date: "07/05", payer: "CMS", text: "MPFS Q3 2026 update. 99214: $128.52\u2192$130.18 (+1.3%). Fee schedule updated.", sev: "medium" },
  { date: "07/03", payer: "Aetna Better Health IL", text: "Telehealth modifier policy change: Modifier 95 now required with POS 02. 12 pending claims auto-updated.", sev: "medium" },
];

// ─── Colors ───
const C = { navy: "#1B2A4A", blue: "#2563EB", bg: "#F8FAFC", white: "#FFFFFF", bdr: "#E2E8F0", txt: "#1E293B", sub: "#64748B", mut: "#94A3B8", grn: "#059669", grnBg: "#F0FDF4", red: "#DC2626", redBg: "#FEF2F2", amb: "#D97706", ambBg: "#FFFBEB", pur: "#7C3AED" };

// ─── Shared Components ───
const Badge = ({ c, bg, children }) => <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 4, color: c, backgroundColor: bg, whiteSpace: "nowrap" }}>{children}</span>;

const SB = ({ s }) => {
  const m = { clean: [C.grn, C.grnBg, "Clean"], flagged: [C.red, C.redBg, "Flagged"], "auto-corrected": [C.blue, "#EFF6FF", "Auto-Fixed"],
    pending: [C.amb, C.ambBg, "Pending"], approved: [C.grn, C.grnBg, "Approved"], denied: [C.red, C.redBg, "Denied"],
    appeal_ready: [C.amb, C.ambBg, "Appeal Ready"], correctable: [C.blue, "#EFF6FF", "Correctable"], partial_recovery: [C.pur, "#F5F3FF", "Partial Recovery"],
    unrecoverable: [C.red, C.redBg, "Unrecoverable"], underpaid: [C.red, C.redBg, "Underpaid"], correct: [C.grn, C.grnBg, "Correct"],
    submitted: [C.grn, C.grnBg, "Submitted"], resolved: [C.grn, C.grnBg, "Resolved"], recovered: [C.grn, C.grnBg, "Recovered"] };
  const v = m[s] || [C.mut, "#F1F5F9", s];
  return <Badge c={v[0]} bg={v[1]}>{v[2]}</Badge>;
};

const Dot = ({ p }) => <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: p === "high" ? C.red : p === "medium" ? C.amb : C.grn, flexShrink: 0 }} />;

const AIButton = ({ onClick, label }) => (
  <button onClick={onClick} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 5, border: `1px solid ${C.blue}30`, backgroundColor: `${C.blue}08`, color: C.blue, fontSize: 11, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
    <span style={{ fontSize: 12 }}>{"\u2728"}</span> {label || "Ask AI"}
  </button>
);

const ActionBtn = ({ label, color, onClick }) => (
  <button onClick={onClick} style={{ padding: "4px 10px", borderRadius: 5, border: "none", backgroundColor: color || C.navy, color: C.white, fontSize: 11, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>{label}</button>
);

// ─── AI Panel ───
function AIPanel({ context, onClose }) {
  const [msgs, setMsgs] = useState([]);
  const [inp, setInp] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    if (context) {
      setMsgs([]);
      send(context);
    }
  }, [context]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, loading]);

  const send = async (text) => {
    if (!text.trim() || loading) return;
    const um = { role: "user", content: text.trim() };
    const next = [...msgs, um];
    setMsgs(next);
    setInp("");
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.map(m => ({ role: m.role, content: m.content })) })
      });
      const data = await res.json();
      const t = data.content?.filter(b => b.type === "text").map(b => b.text).join("\n") || "Error processing.";
      setMsgs(prev => [...prev, { role: "assistant", content: t }]);
    } catch { setMsgs(prev => [...prev, { role: "assistant", content: "Connection error." }]); }
    finally { setLoading(false); }
  };

  const fmt = (text) => text.split("\n").map((line, i) => {
    const t = line.trim();
    if (!t) return <div key={i} style={{ height: 3 }} />;
    if (t.toLowerCase().startsWith("sources") || t.toLowerCase().startsWith("**sources")) return <div key={i} style={{ marginTop: 8, paddingTop: 6, borderTop: "1px solid #E5E7EB", fontSize: 10, color: C.mut, fontWeight: 600 }}>{t.replace(/\*\*/g, "")}</div>;
    if (t.startsWith("**") && t.endsWith("**")) return <div key={i} style={{ fontWeight: 700, marginTop: 6, color: C.navy, fontSize: 12 }}>{t.replace(/\*\*/g, "")}</div>;
    const nm = t.match(/^(\d+)\.\s+(.*)/);
    if (nm) return <div key={i} style={{ display: "flex", gap: 5, fontSize: 12, lineHeight: 1.5, marginBottom: 1 }}><span style={{ color: C.blue, fontWeight: 700 }}>{nm[1]}.</span><span>{nm[2].replace(/\*\*/g, "")}</span></div>;
    if (t.startsWith("- ") || t.startsWith("\u2022 ")) return <div key={i} style={{ fontSize: 12, lineHeight: 1.5, paddingLeft: 10 }}>{"\u2022 "}{t.replace(/^[-\u2022]\s*/, "").replace(/\*\*/g, "")}</div>;
    return <div key={i} style={{ fontSize: 12, lineHeight: 1.5 }}>{t.replace(/\*\*/g, "")}</div>;
  });

  return (
    <div style={{ width: 360, borderLeft: `1px solid ${C.bdr}`, backgroundColor: C.white, display: "flex", flexDirection: "column", flexShrink: 0 }}>
      <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.bdr}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 24, height: 24, borderRadius: 6, background: `linear-gradient(135deg, ${C.navy}, ${C.blue})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 10, color: C.white, fontWeight: 800 }}>AI</span>
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: C.navy }}>Policy Assistant</span>
        </div>
        <button onClick={onClose} style={{ border: "none", background: "none", fontSize: 16, color: C.mut, cursor: "pointer" }}>{"\u2715"}</button>
      </div>
      <div style={{ flex: 1, overflow: "auto", padding: 12 }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ marginBottom: 10, display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
            <div style={{
              maxWidth: "92%", padding: "8px 12px", fontSize: 12,
              borderRadius: m.role === "user" ? "10px 10px 2px 10px" : "2px 10px 10px 10px",
              backgroundColor: m.role === "user" ? C.navy : "#F8FAFC", color: m.role === "user" ? C.white : C.txt,
              border: m.role === "user" ? "none" : `1px solid ${C.bdr}`, lineHeight: 1.5
            }}>
              {m.role === "user" ? m.content : fmt(m.content)}
            </div>
          </div>
        ))}
        {loading && <div style={{ fontSize: 11, color: C.mut, padding: 8 }}>Analyzing payer rules...</div>}
        <div ref={endRef} />
      </div>
      <div style={{ padding: "8px 12px", borderTop: `1px solid ${C.bdr}`, display: "flex", gap: 6 }}>
        <input value={inp} onChange={e => setInp(e.target.value)} onKeyDown={e => e.key === "Enter" && send(inp)}
          placeholder="Follow up..." style={{ flex: 1, padding: "8px 10px", borderRadius: 6, border: `1px solid ${C.bdr}`, fontSize: 12, outline: "none", fontFamily: "inherit" }} />
        <button onClick={() => send(inp)} disabled={!inp.trim() || loading}
          style={{ padding: "8px 12px", borderRadius: 6, border: "none", backgroundColor: inp.trim() && !loading ? C.navy : "#E2E8F0", color: inp.trim() && !loading ? C.white : C.mut, fontSize: 12, fontWeight: 600, cursor: inp.trim() ? "pointer" : "default" }}>{"\u2191"}</button>
      </div>
    </div>
  );
}

// ─── Main App ───
const NAV = [
  { id: "dashboard", icon: "\u{1F4CA}", label: "Dashboard" },
  { id: "claims", icon: "\u{1F4CB}", label: "Claims Queue" },
  { id: "pa", icon: "\u{1F510}", label: "Prior Auth" },
  { id: "denials", icon: "\u26A0\uFE0F", label: "Denials" },
  { id: "payments", icon: "\u{1F4B0}", label: "Payments" },
];

export default function App() {
  const [page, setPage] = useState("dashboard");
  const [aiContext, setAiContext] = useState(null);
  const [claims, setClaims] = useState(initClaims);
  const [denials, setDenials] = useState(initDenials);
  const [expanded, setExpanded] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [toast, setToast] = useState(null);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const askAI = (q) => setAiContext(q);

  const approveClaim = (id) => {
    setClaims(prev => prev.map(c => c.id === id ? { ...c, status: "submitted", action: "Submitted to clearinghouse" } : c));
    showToast(`${id} approved and submitted`);
  };

  const bulkSubmit = () => {
    setClaims(prev => prev.map(c => selected.has(c.id) ? { ...c, status: "submitted", action: "Submitted to clearinghouse" } : c));
    showToast(`${selected.size} claims submitted`);
    setSelected(new Set());
  };

  const resolveDenial = (id, newStatus) => {
    setDenials(prev => prev.map(d => d.id === id ? { ...d, status: newStatus } : d));
    showToast(`${id} ${newStatus === "resolved" ? "resubmitted" : "appeal filed"}`);
  };

  const titles = { dashboard: "Operations Dashboard", claims: "Pre-Submission Claims Queue", pa: "Prior Authorization Tracker", denials: "Denial Management", payments: "Payment Reconciliation" };

  const cleanClaims = claims.filter(c => c.status === "clean");
  const allCleanSelected = cleanClaims.length > 0 && cleanClaims.every(c => selected.has(c.id));

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "'Inter', -apple-system, sans-serif", color: C.txt, fontSize: 13 }}>
      {/* Sidebar */}
      <div style={{ width: 192, backgroundColor: C.navy, display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "14px 14px 18px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: `linear-gradient(135deg, ${C.blue}, ${C.pur})`, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 800, fontSize: 11 }}>PI</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.white }}>Provider Intel</div>
              <div style={{ fontSize: 8, color: "rgba(255,255,255,0.4)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Athinia + Everlign</div>
            </div>
          </div>
        </div>
        <nav style={{ flex: 1, padding: "6px" }}>
          {NAV.map(n => (
            <button key={n.id} onClick={() => { setPage(n.id); setExpanded(null); }} style={{
              display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 10px", borderRadius: 6, border: "none", cursor: "pointer",
              backgroundColor: page === n.id ? "rgba(255,255,255,0.12)" : "transparent", color: page === n.id ? C.white : "rgba(255,255,255,0.55)",
              fontSize: 12, fontWeight: page === n.id ? 600 : 400, marginBottom: 1, textAlign: "left"
            }}><span style={{ fontSize: 14 }}>{n.icon}</span>{n.label}
              {n.id === "denials" && <span style={{ marginLeft: "auto", fontSize: 10, backgroundColor: "rgba(255,100,100,0.3)", color: "#FCA5A5", padding: "1px 5px", borderRadius: 3 }}>{denials.filter(d => !["resolved", "recovered", "unrecoverable"].includes(d.status)).length}</span>}
            </button>
          ))}
        </nav>
        <div style={{ padding: "10px 14px", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", backgroundColor: "#22C55E" }} />
            <span style={{ fontSize: 9, color: "rgba(255,255,255,0.4)" }}>Everlign JEKL/ERAG</span>
          </div>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "12px 20px", backgroundColor: C.white, borderBottom: `1px solid ${C.bdr}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <h1 style={{ fontSize: 17, fontWeight: 700, color: C.navy }}>{titles[page]}</h1>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => askAI("I'm a billing administrator. Give me a quick status summary: how many claims need attention, what denials are actionable, and any payer rule changes I should know about today.")} style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 6, border: `1px solid ${C.blue}30`, backgroundColor: `${C.blue}06`, color: C.blue, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
              <span>{"\u2728"}</span> AI Briefing
            </button>
            <span style={{ fontSize: 11, color: C.mut }}>{TODAY}</span>
          </div>
        </div>

        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          {/* Content */}
          <div style={{ flex: 1, overflow: "auto", padding: 20, backgroundColor: C.bg }}>

            {/* DASHBOARD */}
            {page === "dashboard" && (
              <div>
                <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
                  {METRICS.map((m, i) => (
                    <div key={i} style={{ padding: "14px 16px", backgroundColor: C.white, borderRadius: 8, border: `1px solid ${C.bdr}`, flex: 1, minWidth: 150 }}>
                      <div style={{ fontSize: 10, color: C.sub, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 6 }}>{m.label}</div>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                        <span style={{ fontSize: 26, fontWeight: 700, color: C.navy }}>{m.value}</span>
                        <span style={{ fontSize: 11, fontWeight: 600, color: m.up ? C.grn : C.red }}>{m.delta}</span>
                      </div>
                      <div style={{ fontSize: 10, color: C.mut, marginTop: 3 }}>{m.sub}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <div style={{ backgroundColor: C.white, borderRadius: 8, border: `1px solid ${C.bdr}`, padding: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.navy, marginBottom: 10 }}>Requires Attention</div>
                    {claims.filter(c => c.status === "flagged").slice(0, 4).map((c, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 0", borderBottom: i < 3 ? `1px solid ${C.bdr}` : "none" }}>
                        <Dot p={c.priority} />
                        <span style={{ fontSize: 12, fontFamily: "monospace", color: C.navy, fontWeight: 600 }}>{c.id}</span>
                        <span style={{ fontSize: 12, color: C.txt, flex: 1 }}>{c.patient}</span>
                        <AIButton onClick={() => askAI(`Claim ${c.id} for ${c.patient}, CPT ${c.cpt}, payer ${c.payer}. Issue: ${c.issue} What should I do? Give me the specific fix and any rules I should cite.`)} label="Fix this" />
                      </div>
                    ))}
                    <button onClick={() => setPage("claims")} style={{ marginTop: 8, fontSize: 11, color: C.blue, fontWeight: 600, border: "none", background: "none", cursor: "pointer" }}>View all claims {"\u2192"}</button>
                  </div>
                  <div style={{ backgroundColor: C.white, borderRadius: 8, border: `1px solid ${C.bdr}`, padding: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.navy, marginBottom: 10 }}>Payer Rule Changes</div>
                    {ALERTS.map((a, i) => (
                      <div key={i} style={{ padding: "8px 0 8px 10px", borderBottom: i < ALERTS.length - 1 ? `1px solid ${C.bdr}` : "none", borderLeft: `3px solid ${a.sev === "high" ? C.red : C.amb}` }}>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ fontSize: 11, fontWeight: 600, color: C.navy }}>{a.payer}</span>
                          <span style={{ fontSize: 10, color: C.mut }}>{a.date}</span>
                        </div>
                        <div style={{ fontSize: 11, color: C.txt, lineHeight: 1.4, marginTop: 2 }}>{a.text}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ marginTop: 14, backgroundColor: C.white, borderRadius: 8, border: `1px solid ${C.bdr}`, padding: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.navy, marginBottom: 12 }}>Denial Rate by Payer (30-Day Trend)</div>
                  <div style={{ display: "flex", gap: 20, justifyContent: "center" }}>
                    {[{ p: "Medicare FFS", r: "4.2%", d: "-0.8%" }, { p: "UHC MA", r: "12.1%", d: "-2.3%" }, { p: "Aetna IL", r: "8.7%", d: "-1.5%" }, { p: "Molina IL", r: "14.3%", d: "-3.1%" }, { p: "Meridian IL", r: "11.8%", d: "-1.9%" }].map((x, i) => (
                      <div key={i} style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 20, fontWeight: 700, color: C.navy }}>{x.r}</div>
                        <div style={{ fontSize: 10, color: C.grn, fontWeight: 600 }}>{x.d}</div>
                        <div style={{ fontSize: 10, color: C.sub, marginTop: 2 }}>{x.p}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* CLAIMS */}
            {page === "claims" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div style={{ display: "flex", gap: 6 }}>
                    <Badge c={C.grn} bg={C.grnBg}>{claims.filter(c => c.status === "clean").length} Clean</Badge>
                    <Badge c={C.red} bg={C.redBg}>{claims.filter(c => c.status === "flagged").length} Flagged</Badge>
                    <Badge c={C.blue} bg="#EFF6FF">{claims.filter(c => c.status === "auto-corrected").length} Auto-Fixed</Badge>
                    <Badge c={C.grn} bg={C.grnBg}>{claims.filter(c => c.status === "submitted").length} Submitted</Badge>
                  </div>
                  {selected.size > 0 && <ActionBtn label={`Submit ${selected.size} Clean Claims`} color={C.grn} onClick={bulkSubmit} />}
                </div>
                <div style={{ border: `1px solid ${C.bdr}`, borderRadius: 8, backgroundColor: C.white, overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead><tr style={{ backgroundColor: "#F8FAFC" }}>
                      <th style={{ padding: "8px 10px", textAlign: "left", width: 30 }}>
                        <input type="checkbox" checked={allCleanSelected} onChange={() => {
                          if (allCleanSelected) setSelected(new Set());
                          else setSelected(new Set(cleanClaims.map(c => c.id)));
                        }} />
                      </th>
                      {["", "Claim", "Patient", "CPT", "Payer", "Status", "Actions"].map((h, i) => (
                        <th key={i} style={{ padding: "8px 10px", textAlign: "left", fontWeight: 600, color: C.sub, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: `1px solid ${C.bdr}` }}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {claims.map((c, i) => (
                        <tr key={i} style={{ borderBottom: `1px solid ${C.bdr}`, backgroundColor: expanded === i ? "#FAFBFD" : "transparent" }}>
                          <td style={{ padding: "8px 10px" }}>
                            {c.status === "clean" && <input type="checkbox" checked={selected.has(c.id)} onChange={() => {
                              const n = new Set(selected); n.has(c.id) ? n.delete(c.id) : n.add(c.id); setSelected(n);
                            }} />}
                          </td>
                          <td style={{ padding: "8px 10px" }}><Dot p={c.priority} /></td>
                          <td style={{ padding: "8px 10px", fontWeight: 600, color: C.navy, fontFamily: "monospace", fontSize: 11 }}>{c.id}</td>
                          <td style={{ padding: "8px 10px" }}>{c.patient}</td>
                          <td style={{ padding: "8px 10px", fontFamily: "monospace", fontSize: 11 }}>{c.cpt}</td>
                          <td style={{ padding: "8px 10px", fontSize: 11 }}>{c.payer}</td>
                          <td style={{ padding: "8px 10px" }}><SB s={c.status} /></td>
                          <td style={{ padding: "8px 10px" }}>
                            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                              {c.status === "flagged" && <>
                                <AIButton onClick={() => askAI(`Claim ${c.id}: ${c.patient}, CPT ${c.cpt}, payer ${c.payer}. Issue: ${c.issue} Explain the exact fix, cite the applicable rule, and tell me if there are any additional risks I should check before resubmitting.`)} />
                                <ActionBtn label="Mark Fixed" color={C.blue} onClick={() => { setClaims(prev => prev.map(x => x.id === c.id ? { ...x, status: "clean", action: "Reviewed and corrected" } : x)); showToast(`${c.id} corrected`); }} />
                              </>}
                              {c.status === "auto-corrected" && <ActionBtn label="Approve" color={C.grn} onClick={() => approveClaim(c.id)} />}
                              {c.status === "clean" && <ActionBtn label="Submit" color={C.grn} onClick={() => approveClaim(c.id)} />}
                              {c.status === "submitted" && <span style={{ fontSize: 11, color: C.grn }}>{"\u2713"} Sent</span>}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* PA */}
            {page === "pa" && (
              <div>
                <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                  <Badge c={C.amb} bg={C.ambBg}>{PA_DATA.filter(p => p.status === "pending").length} Pending</Badge>
                  <Badge c={C.grn} bg={C.grnBg}>{PA_DATA.filter(p => p.status === "approved").length} Approved</Badge>
                  <Badge c={C.red} bg={C.redBg}>{PA_DATA.filter(p => p.status === "denied").length} Denied</Badge>
                </div>
                <div style={{ border: `1px solid ${C.bdr}`, borderRadius: 8, backgroundColor: C.white, overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead><tr style={{ backgroundColor: "#F8FAFC" }}>
                      {["PA ID", "Patient", "Service", "Payer", "Status", "Timeline", "Actions"].map((h, i) => (
                        <th key={i} style={{ padding: "8px 10px", textAlign: "left", fontWeight: 600, color: C.sub, fontSize: 10, textTransform: "uppercase", borderBottom: `1px solid ${C.bdr}` }}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {PA_DATA.map((p, i) => (
                        <tr key={i} style={{ borderBottom: `1px solid ${C.bdr}`, backgroundColor: p.daysLeft && p.daysLeft <= 7 && p.status === "approved" ? "#FFF7ED" : "transparent" }}>
                          <td style={{ padding: "8px 10px", fontFamily: "monospace", fontSize: 11, fontWeight: 600, color: C.navy }}>{p.id}</td>
                          <td style={{ padding: "8px 10px" }}>{p.patient}</td>
                          <td style={{ padding: "8px 10px", fontSize: 11 }}>{p.service}</td>
                          <td style={{ padding: "8px 10px", fontSize: 11 }}>{p.payer}</td>
                          <td style={{ padding: "8px 10px" }}><SB s={p.status} /></td>
                          <td style={{ padding: "8px 10px", fontSize: 11 }}>
                            {p.status === "pending" && <span style={{ color: C.amb }}>ETA: {p.eta}</span>}
                            {p.status === "approved" && <span style={{ color: p.daysLeft <= 7 ? C.red : C.grn, fontWeight: p.daysLeft <= 7 ? 700 : 400 }}>Expires {p.expires} ({p.daysLeft}d)</span>}
                            {p.status === "denied" && <span style={{ color: C.red }}>{p.reason}</span>}
                          </td>
                          <td style={{ padding: "8px 10px" }}>
                            {p.status === "denied" && <AIButton onClick={() => askAI(`PA ${p.id} for ${p.patient}: ${p.service} was denied by ${p.payer}. Reason: ${p.reason} What documentation do I need for the appeal? What is the appeal deadline and process for this payer?`)} label="Appeal help" />}
                            {p.status === "pending" && <AIButton onClick={() => askAI(`PA ${p.id} for ${p.service} is pending with ${p.payer}, submitted ${p.submitted}. ETA ${p.eta}. What is the standard turnaround for this payer, and should I follow up?`)} label="Check status" />}
                            {p.status === "approved" && p.daysLeft <= 7 && <Badge c={C.red} bg={C.redBg}>Expiring!</Badge>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* DENIALS */}
            {page === "denials" && (
              <div>
                <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                  <Badge c={C.blue} bg="#EFF6FF">{denials.filter(d => d.status === "correctable").length} Correctable</Badge>
                  <Badge c={C.amb} bg={C.ambBg}>{denials.filter(d => d.status === "appeal_ready").length} Appeal Ready</Badge>
                  <Badge c={C.pur} bg="#F5F3FF">{denials.filter(d => d.status === "partial_recovery").length} Partial</Badge>
                  <Badge c={C.grn} bg={C.grnBg}>{denials.filter(d => ["resolved", "recovered"].includes(d.status)).length} Resolved</Badge>
                </div>
                <div style={{ border: `1px solid ${C.bdr}`, borderRadius: 8, backgroundColor: C.white, overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead><tr style={{ backgroundColor: "#F8FAFC" }}>
                      {["ID", "Patient", "CPT", "Payer", "CARC/RARC", "Amount", "Status", "Actions"].map((h, i) => (
                        <th key={i} style={{ padding: "8px 10px", textAlign: "left", fontWeight: 600, color: C.sub, fontSize: 10, textTransform: "uppercase", borderBottom: `1px solid ${C.bdr}` }}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {denials.map((d, i) => (
                        <>
                          <tr key={i} style={{ borderBottom: `1px solid ${C.bdr}`, cursor: "pointer" }} onClick={() => setExpanded(expanded === i ? null : i)}>
                            <td style={{ padding: "8px 10px", fontFamily: "monospace", fontSize: 11, fontWeight: 600, color: C.navy }}>{d.id}</td>
                            <td style={{ padding: "8px 10px" }}>{d.patient}</td>
                            <td style={{ padding: "8px 10px", fontFamily: "monospace", fontSize: 11 }}>{d.cpt}</td>
                            <td style={{ padding: "8px 10px", fontSize: 11 }}>{d.payer}</td>
                            <td style={{ padding: "8px 10px", fontFamily: "monospace", fontSize: 11 }}>{d.carc}/{d.rarc}</td>
                            <td style={{ padding: "8px 10px", fontWeight: 600, color: C.red }}>{d.amount}</td>
                            <td style={{ padding: "8px 10px" }}><SB s={d.status} /></td>
                            <td style={{ padding: "8px 10px" }}>
                              <div style={{ display: "flex", gap: 4 }} onClick={e => e.stopPropagation()}>
                                <AIButton onClick={() => askAI(`Denial ${d.id}: ${d.patient}, CPT ${d.cpt}, payer ${d.payer}. CARC ${d.carc} / RARC ${d.rarc}. Reason: ${d.reason}. Current strategy: ${d.strategy}. ${d.deadline ? `Appeal deadline: ${d.deadline}.` : ""} Is this the right approach? What documentation do I need? Draft the key points for an appeal letter if applicable.`)} />
                                {d.status === "correctable" && <ActionBtn label="Correct & Resubmit" color={C.blue} onClick={() => resolveDenial(d.id, "resolved")} />}
                                {d.status === "appeal_ready" && <ActionBtn label="File Appeal" color={C.amb} onClick={() => resolveDenial(d.id, "resolved")} />}
                                {d.status === "partial_recovery" && <ActionBtn label="Appeal Remainder" color={C.pur} onClick={() => resolveDenial(d.id, "recovered")} />}
                              </div>
                            </td>
                          </tr>
                          {expanded === i && (
                            <tr key={`${i}-d`}><td colSpan={8} style={{ padding: "10px 10px 10px 36px", backgroundColor: "#FAFBFD", borderBottom: `1px solid ${C.bdr}` }}>
                              <div style={{ borderLeft: `3px solid ${C.blue}`, paddingLeft: 10, fontSize: 12, lineHeight: 1.6 }}>
                                <div><strong style={{ color: C.navy }}>Root Cause:</strong> {d.reason}</div>
                                <div style={{ marginTop: 4 }}><strong style={{ color: C.navy }}>AI Recommendation:</strong> {d.strategy}</div>
                                {d.deadline && <div style={{ marginTop: 4 }}><strong style={{ color: C.navy }}>Appeal Deadline:</strong> <span style={{ color: C.red, fontWeight: 600 }}>{d.deadline}</span></div>}
                              </div>
                            </td></tr>
                          )}
                        </>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* PAYMENTS */}
            {page === "payments" && (
              <div>
                {(() => { const uv = PAYMENTS.filter(p => p.status === "underpaid"); const tv = uv.reduce((s, p) => s + Math.abs(parseFloat(p.variance.replace(/[$,]/g, ""))), 0); return (
                  <div style={{ backgroundColor: C.redBg, border: "1px solid #FECACA", borderRadius: 8, padding: "12px 16px", marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: C.red }}>Underpayment Recovery Queue</div>
                      <div style={{ fontSize: 11, color: "#7F1D1D", marginTop: 2 }}>{uv.length} claims with variances. Recovery documentation auto-generated.</div>
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: C.red }}>${tv.toFixed(2)}</div>
                  </div>
                ); })()}
                <div style={{ border: `1px solid ${C.bdr}`, borderRadius: 8, backgroundColor: C.white, overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead><tr style={{ backgroundColor: "#F8FAFC" }}>
                      {["ID", "Patient", "CPT", "Payer", "Expected", "Paid", "Variance", "Status", "Actions"].map((h, i) => (
                        <th key={i} style={{ padding: "8px 10px", textAlign: "left", fontWeight: 600, color: C.sub, fontSize: 10, textTransform: "uppercase", borderBottom: `1px solid ${C.bdr}` }}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {PAYMENTS.map((p, i) => (
                        <tr key={i} style={{ borderBottom: `1px solid ${C.bdr}` }}>
                          <td style={{ padding: "8px 10px", fontFamily: "monospace", fontSize: 11, fontWeight: 600, color: C.navy }}>{p.id}</td>
                          <td style={{ padding: "8px 10px" }}>{p.patient}</td>
                          <td style={{ padding: "8px 10px", fontFamily: "monospace", fontSize: 11 }}>{p.cpt}</td>
                          <td style={{ padding: "8px 10px", fontSize: 11 }}>{p.payer}</td>
                          <td style={{ padding: "8px 10px" }}>{p.expected}</td>
                          <td style={{ padding: "8px 10px" }}>{p.paid}</td>
                          <td style={{ padding: "8px 10px", fontWeight: 600, color: p.status === "underpaid" ? C.red : C.grn }}>{p.variance}</td>
                          <td style={{ padding: "8px 10px" }}><SB s={p.status} /></td>
                          <td style={{ padding: "8px 10px" }}>
                            {p.status === "underpaid" && <AIButton onClick={() => askAI(`Payment ${p.id}: ${p.patient}, CPT ${p.cpt}, payer ${p.payer}. Expected: ${p.expected}, Paid: ${p.paid}, Variance: ${p.variance}. ${p.reason} What is the correct rate I should be paid? What documentation do I need to send to the payer to recover this underpayment?`)} label="Recovery help" />}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* AI Panel */}
          {aiContext && <AIPanel context={aiContext} onClose={() => setAiContext(null)} />}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)", padding: "10px 20px", borderRadius: 8, backgroundColor: C.navy, color: C.white, fontSize: 13, fontWeight: 600, boxShadow: "0 4px 16px rgba(0,0,0,0.15)", zIndex: 100, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: "#4ADE80" }}>{"\u2713"}</span> {toast}
        </div>
      )}

      <style>{`* { box-sizing: border-box; margin: 0; padding: 0; } button:hover { opacity: 0.92; } input[type="checkbox"] { cursor: pointer; }`}</style>
    </div>
  );
}
