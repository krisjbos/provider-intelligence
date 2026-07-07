import { useState, useRef, useEffect } from "react";

// ─── Mock Data ───
const TODAY = "07/07/2026";

const METRICS = [
  { label: "Claims Scrubbed Today", value: "342", delta: "+28", deltaUp: true, sub: "98.2% clean rate" },
  { label: "Denials Pending", value: "47", delta: "-12", deltaUp: false, sub: "vs. 59 last week" },
  { label: "PA Requests Active", value: "23", delta: "+5", deltaUp: true, sub: "4 expiring this week" },
  { label: "Underpayments Flagged", value: "$34,218", delta: "+$8,400", deltaUp: true, sub: "18 claims awaiting recovery" },
];

const CLAIMS_QUEUE = [
  { id: "CLM-4821", patient: "M. Johnson", cpt: "27447", payer: "UHC Medicare Advantage", status: "flagged", issue: "PA not on file. UHC MA requires prior auth for total knee arthroplasty.", action: "Obtain PA before submission", priority: "high" },
  { id: "CLM-4822", patient: "R. Davis", cpt: "99214", payer: "Aetna Better Health IL", status: "clean", issue: null, action: "Ready to submit", priority: "low" },
  { id: "CLM-4823", patient: "S. Chen", cpt: "70553, 70551", payer: "Medicare FFS", status: "flagged", issue: "NCCI PTP edit: 70553/70551 code pair conflict. Modifier 59 required on 70551 with documentation of distinct procedure.", action: "Add modifier 59 to 70551", priority: "medium" },
  { id: "CLM-4824", patient: "T. Williams", cpt: "97110 x6 units", payer: "Molina Healthcare IL", status: "flagged", issue: "MUE limit: Molina caps 97110 at 4 units per encounter without supporting documentation. Current claim has 6 units.", action: "Reduce to 4 units or attach medical necessity documentation", priority: "medium" },
  { id: "CLM-4825", patient: "A. Patel", cpt: "59510", payer: "BCBS Medicare Advantage", status: "clean", issue: null, action: "Ready to submit", priority: "low" },
  { id: "CLM-4826", patient: "L. Brown", cpt: "90837", payer: "Meridian Health IL", status: "flagged", issue: "Timely filing risk: DOS 01/15/2026. Meridian 180-day filing limit expires 07/14/2026 (7 days remaining).", action: "Submit immediately", priority: "high" },
  { id: "CLM-4827", patient: "J. Garcia", cpt: "99213", payer: "Medicare FFS", status: "auto-corrected", issue: "Place of service code corrected from 11 to 22 (telehealth modifier 95 present). Auto-corrected.", action: "Review and approve", priority: "low" },
  { id: "CLM-4828", patient: "K. Nguyen", cpt: "99215", payer: "Humana MA", status: "flagged", issue: "Dual-eligible patient (Medicare + IL Medicaid QMB). Medicare is primary. QMB: cannot balance-bill patient for deductible or coinsurance.", action: "Verify COB sequencing before submission", priority: "medium" },
];

const PA_TRACKER = [
  { id: "PA-1190", patient: "M. Johnson", service: "CPT 27447 - Total Knee Arthroplasty", payer: "UHC Medicare Advantage", submitted: "07/01/2026", status: "pending", eta: "07/15/2026", daysLeft: 8 },
  { id: "PA-1185", patient: "D. Thompson", service: "CPT 22612 - Lumbar Spinal Fusion", payer: "Aetna Better Health IL", submitted: "06/28/2026", status: "approved", eta: null, expires: "09/28/2026", daysLeft: 83 },
  { id: "PA-1182", patient: "F. Martinez", service: "CPT 70553 - Brain MRI w/ and w/o contrast", payer: "Molina Healthcare IL", submitted: "06/25/2026", status: "denied", eta: null, daysLeft: null, reason: "Insufficient clinical documentation. Appeal recommended." },
  { id: "PA-1178", patient: "R. Kim", service: "CPT 27447 - Total Knee Arthroplasty", payer: "BCBS Medicare Advantage", submitted: "06/20/2026", status: "approved", eta: null, expires: "07/10/2026", daysLeft: 3 },
  { id: "PA-1175", patient: "C. Adams", service: "CPT 43239 - Upper GI Endoscopy w/ Biopsy", payer: "Meridian Health IL", submitted: "07/03/2026", status: "pending", eta: "07/17/2026", daysLeft: 10 },
  { id: "PA-1171", patient: "B. Wilson", service: "CPT 64483 - Epidural Injection, Lumbar", payer: "Humana MA", submitted: "06/15/2026", status: "approved", eta: null, expires: "09/15/2026", daysLeft: 70 },
];

const DENIALS = [
  { id: "DEN-302", claimId: "CLM-4701", patient: "H. Rivera", cpt: "70553", payer: "Aetna Better Health IL", dos: "06/10/2026", carc: "197", rarc: "N657", reason: "Prior authorization not obtained", amount: "$1,842", status: "appeal_ready", appealDeadline: "08/09/2026", strategy: "PA was obtained (PA-1162) but auth number not attached to claim. Resubmit with auth number." },
  { id: "DEN-299", claimId: "CLM-4688", patient: "W. Taylor", cpt: "99215", payer: "Medicare FFS", dos: "05/28/2026", carc: "11", rarc: "MA130", reason: "Diagnosis inconsistent with procedure", amount: "$211", status: "correctable", appealDeadline: null, strategy: "ICD-10 Z00.00 (routine exam) does not support 99215 level visit. Recode to appropriate E/M diagnosis. Resubmit." },
  { id: "DEN-295", claimId: "CLM-4672", patient: "E. Lee", cpt: "97110 x8", payer: "Molina Healthcare IL", dos: "06/05/2026", carc: "59", rarc: "N362", reason: "Exceeds benefit maximum (MUE)", amount: "$480", status: "partial_recovery", appealDeadline: "08/04/2026", strategy: "MUE allows 4 units without documentation. 4 units payable, 4 units denied. Appeal with clinical notes documenting medical necessity for extended session." },
  { id: "DEN-291", claimId: "CLM-4658", patient: "P. Harris", cpt: "99214", payer: "UHC Medicare Advantage", dos: "05/15/2026", carc: "29", rarc: "N56", reason: "Timely filing limit exceeded", amount: "$148", status: "unrecoverable", appealDeadline: null, strategy: "UHC MA 90-day filing limit expired 08/13/2026. No appeal pathway. Preventable: system now flags claims approaching filing deadlines." },
  { id: "DEN-288", claimId: "CLM-4641", patient: "N. Clark", cpt: "43239", payer: "Meridian Health IL", dos: "06/01/2026", carc: "4", rarc: "MA01", reason: "Procedure code inconsistent with modifier or missing modifier", amount: "$2,105", status: "correctable", appealDeadline: null, strategy: "Modifier 26 (professional component) missing. Add modifier 26 and resubmit." },
];

const PAYMENTS = [
  { id: "PAY-5501", claimId: "CLM-4590", patient: "G. Morris", cpt: "99214", payer: "Aetna Better Health IL", expected: "$128.52", paid: "$98.20", variance: "-$30.32", pct: "-23.6%", status: "underpaid", reason: "Paid at IL Medicaid FFS rate instead of contracted MCO rate. Contract rate: $128.52. Paid: $98.20." },
  { id: "PAY-5498", claimId: "CLM-4585", patient: "Y. Robinson", cpt: "27447", payer: "BCBS Medicare Advantage", expected: "$1,542.86", paid: "$1,542.86", variance: "$0.00", pct: "0%", status: "correct", reason: null },
  { id: "PAY-5495", claimId: "CLM-4578", patient: "M. Walker", cpt: "90837", payer: "Molina Healthcare IL", expected: "$112.40", paid: "$89.92", variance: "-$22.48", pct: "-20.0%", status: "underpaid", reason: "Sequestration reduction applied incorrectly. Molina Medicaid claims exempt from Medicare sequestration. Recovery documentation generated." },
  { id: "PAY-5492", claimId: "CLM-4571", patient: "S. Hall", cpt: "99213", payer: "Medicare FFS", expected: "$92.76", paid: "$92.76", variance: "$0.00", pct: "0%", status: "correct", reason: null },
  { id: "PAY-5489", claimId: "CLM-4565", patient: "J. Young", cpt: "97110 x4", payer: "Meridian Health IL", expected: "$104.80", paid: "$78.60", variance: "-$26.20", pct: "-25.0%", status: "underpaid", reason: "3 of 4 units paid. Unit 4 denied as exceeding visit limit. Contract allows 4 units per visit. Recovery documentation generated." },
  { id: "PAY-5486", claimId: "CLM-4558", patient: "D. King", cpt: "99214", payer: "UHC Medicare Advantage", expected: "$142.18", paid: "$142.18", variance: "$0.00", pct: "0%", status: "correct", reason: null },
];

const RULE_ALERTS = [
  { date: "07/06/2026", payer: "Molina Healthcare IL", change: "Updated PA requirement list effective 07/15/2026. CPT 64483 (epidural injection) now requires PA. Previously exempt.", impact: "3 scheduled procedures affected. PA requests queued for review.", severity: "high" },
  { date: "07/05/2026", payer: "CMS", change: "MPFS quarterly update Q3 2026. 14 CPT codes with rate adjustments in Chicago locality. 99214: $128.52 to $130.18 (+1.3%). 99215: $172.40 to $175.12 (+1.6%).", impact: "Fee schedule updated in knowledge base. Payment reconciliation thresholds adjusted.", severity: "medium" },
  { date: "07/03/2026", payer: "Aetna Better Health IL", change: "Updated modifier policy for telehealth services. Modifier 95 now required in addition to POS 02. Previous policy accepted POS 02 alone.", impact: "12 pending telehealth claims updated with modifier 95 before submission.", severity: "medium" },
];

// ─── System prompt for chat ───
const SYS = `You are a provider billing and administrative support assistant. You help billing staff navigate payer rules, resolve billing questions, and make informed decisions about claims, prior authorization, denial management, and payment reconciliation across Medicare FFS, Medicare Advantage, and Medicaid. You are not a payer. You interpret rules. Cite sources. Use [Tier 1 - Regulatory], [Tier 2 - Plan Policy], or [Tier 3 - Contract] labels. Lead with the actionable answer. Use Illinois as default state. Use realistic Medicare, Medicaid, and MA rules. End responses with a Sources section.`;

// ─── Colors ───
const C = { navy: "#1B2A4A", blue: "#2563EB", bg: "#F8FAFC", white: "#FFFFFF", border: "#E2E8F0", text: "#1E293B", sub: "#64748B", muted: "#94A3B8", green: "#059669", greenBg: "#F0FDF4", red: "#DC2626", redBg: "#FEF2F2", amber: "#D97706", amberBg: "#FFFBEB", purple: "#7C3AED" };

// ─── Components ───
const Badge = ({ color, bg, children }) => (
  <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 4, color, backgroundColor: bg, whiteSpace: "nowrap" }}>{children}</span>
);

const StatusBadge = ({ status }) => {
  const map = {
    clean: { c: C.green, bg: C.greenBg, t: "Clean" }, flagged: { c: C.red, bg: C.redBg, t: "Flagged" },
    "auto-corrected": { c: C.blue, bg: "#EFF6FF", t: "Auto-Corrected" }, pending: { c: C.amber, bg: C.amberBg, t: "Pending" },
    approved: { c: C.green, bg: C.greenBg, t: "Approved" }, denied: { c: C.red, bg: C.redBg, t: "Denied" },
    appeal_ready: { c: C.amber, bg: C.amberBg, t: "Appeal Ready" }, correctable: { c: C.blue, bg: "#EFF6FF", t: "Correctable" },
    partial_recovery: { c: C.purple, bg: "#F5F3FF", t: "Partial Recovery" }, unrecoverable: { c: C.red, bg: C.redBg, t: "Unrecoverable" },
    underpaid: { c: C.red, bg: C.redBg, t: "Underpaid" }, correct: { c: C.green, bg: C.greenBg, t: "Correct" },
    high: { c: C.red, bg: C.redBg, t: "High" }, medium: { c: C.amber, bg: C.amberBg, t: "Medium" }, low: { c: C.green, bg: C.greenBg, t: "Low" }
  };
  const s = map[status] || { c: C.muted, bg: "#F1F5F9", t: status };
  return <Badge color={s.c} bg={s.bg}>{s.t}</Badge>;
};

const PriorityDot = ({ p }) => {
  const colors = { high: C.red, medium: C.amber, low: C.green };
  return <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: colors[p] || C.muted, flexShrink: 0 }} />;
};

function MetricCard({ m }) {
  return (
    <div style={{ padding: "16px 18px", backgroundColor: C.white, borderRadius: 10, border: `1px solid ${C.border}`, flex: 1, minWidth: 160 }}>
      <div style={{ fontSize: 11, color: C.sub, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>{m.label}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span style={{ fontSize: 28, fontWeight: 700, color: C.navy }}>{m.value}</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: m.deltaUp ? C.green : C.red }}>{m.delta}</span>
      </div>
      <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{m.sub}</div>
    </div>
  );
}

function DataTable({ columns, data, renderRow }) {
  return (
    <div style={{ overflowX: "auto", border: `1px solid ${C.border}`, borderRadius: 10, backgroundColor: C.white }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ backgroundColor: "#F8FAFC" }}>
            {columns.map((col, i) => (
              <th key={i} style={{ textAlign: "left", padding: "10px 14px", fontWeight: 600, color: C.sub, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap" }}>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => renderRow(row, i))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Pages ───
function DashboardPage() {
  return (
    <div>
      <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        {METRICS.map((m, i) => <MetricCard key={i} m={m} />)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: C.navy, marginBottom: 10 }}>Claims Queue Summary</h3>
          <div style={{ backgroundColor: C.white, borderRadius: 10, border: `1px solid ${C.border}`, padding: 16 }}>
            {[
              { label: "Clean (ready to submit)", count: CLAIMS_QUEUE.filter(c => c.status === "clean").length, color: C.green },
              { label: "Flagged (needs review)", count: CLAIMS_QUEUE.filter(c => c.status === "flagged").length, color: C.red },
              { label: "Auto-corrected (needs approval)", count: CLAIMS_QUEUE.filter(c => c.status === "auto-corrected").length, color: C.blue },
            ].map((item, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: i < 2 ? `1px solid ${C.border}` : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: item.color }} />
                  <span style={{ fontSize: 13, color: C.text }}>{item.label}</span>
                </div>
                <span style={{ fontSize: 18, fontWeight: 700, color: C.navy }}>{item.count}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: C.navy, marginBottom: 10 }}>Payer Rule Alerts</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {RULE_ALERTS.map((a, i) => (
              <div key={i} style={{ backgroundColor: C.white, borderRadius: 10, border: `1px solid ${C.border}`, padding: "12px 14px", borderLeft: `3px solid ${a.severity === "high" ? C.red : C.amber}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: C.navy }}>{a.payer}</span>
                  <span style={{ fontSize: 10, color: C.muted }}>{a.date}</span>
                </div>
                <div style={{ fontSize: 12, color: C.text, lineHeight: 1.5, marginBottom: 4 }}>{a.change}</div>
                <div style={{ fontSize: 11, color: C.sub, lineHeight: 1.4 }}>{a.impact}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div style={{ marginTop: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: C.navy, marginBottom: 10 }}>Denial Trend (Last 30 Days)</h3>
        <div style={{ backgroundColor: C.white, borderRadius: 10, border: `1px solid ${C.border}`, padding: 20 }}>
          <div style={{ display: "flex", gap: 24, justifyContent: "center", marginBottom: 16 }}>
            {[{ payer: "Medicare FFS", rate: "4.2%", trend: "-0.8%" }, { payer: "UHC MA", rate: "12.1%", trend: "-2.3%" }, { payer: "Aetna IL", rate: "8.7%", trend: "-1.5%" }, { payer: "Molina IL", rate: "14.3%", trend: "-3.1%" }, { payer: "Meridian IL", rate: "11.8%", trend: "-1.9%" }].map((p, i) => (
              <div key={i} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: C.navy }}>{p.rate}</div>
                <div style={{ fontSize: 10, color: C.green, fontWeight: 600 }}>{p.trend}</div>
                <div style={{ fontSize: 11, color: C.sub, marginTop: 2 }}>{p.payer}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11, color: C.muted, textAlign: "center" }}>Denial rate reduction since platform activation. Industry avg: 10-20%.</div>
        </div>
      </div>
    </div>
  );
}

function ClaimsPage() {
  const [expanded, setExpanded] = useState(null);
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: C.sub }}>{CLAIMS_QUEUE.length} claims in pre-submission queue &middot; {TODAY}</div>
        <div style={{ display: "flex", gap: 8 }}>
          <Badge color={C.green} bg={C.greenBg}>{CLAIMS_QUEUE.filter(c => c.status === "clean").length} Clean</Badge>
          <Badge color={C.red} bg={C.redBg}>{CLAIMS_QUEUE.filter(c => c.status === "flagged").length} Flagged</Badge>
          <Badge color={C.blue} bg="#EFF6FF">{CLAIMS_QUEUE.filter(c => c.status === "auto-corrected").length} Auto-Fixed</Badge>
        </div>
      </div>
      <DataTable
        columns={["", "Claim", "Patient", "CPT", "Payer", "Status", "Action"]}
        data={CLAIMS_QUEUE}
        renderRow={(row, i) => (
          <>
            <tr key={i} style={{ borderBottom: `1px solid ${C.border}`, cursor: row.issue ? "pointer" : "default" }} onClick={() => row.issue && setExpanded(expanded === i ? null : i)}>
              <td style={{ padding: "10px 14px" }}><PriorityDot p={row.priority} /></td>
              <td style={{ padding: "10px 14px", fontWeight: 600, color: C.navy, fontFamily: "monospace", fontSize: 12 }}>{row.id}</td>
              <td style={{ padding: "10px 14px" }}>{row.patient}</td>
              <td style={{ padding: "10px 14px", fontFamily: "monospace", fontSize: 12 }}>{row.cpt}</td>
              <td style={{ padding: "10px 14px", fontSize: 12 }}>{row.payer}</td>
              <td style={{ padding: "10px 14px" }}><StatusBadge status={row.status} /></td>
              <td style={{ padding: "10px 14px", fontSize: 12, color: C.sub }}>{row.action}</td>
            </tr>
            {expanded === i && row.issue && (
              <tr key={`${i}-detail`} style={{ backgroundColor: "#FAFBFD" }}>
                <td colSpan={7} style={{ padding: "12px 14px 12px 40px", borderBottom: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 12, color: C.text, lineHeight: 1.6, borderLeft: `3px solid ${C.blue}`, paddingLeft: 12 }}>
                    <strong style={{ color: C.navy }}>Issue Detail:</strong> {row.issue}
                  </div>
                </td>
              </tr>
            )}
          </>
        )}
      />
    </div>
  );
}

function PAPage() {
  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <Badge color={C.amber} bg={C.amberBg}>{PA_TRACKER.filter(p => p.status === "pending").length} Pending</Badge>
        <Badge color={C.green} bg={C.greenBg}>{PA_TRACKER.filter(p => p.status === "approved").length} Approved</Badge>
        <Badge color={C.red} bg={C.redBg}>{PA_TRACKER.filter(p => p.status === "denied").length} Denied</Badge>
        <Badge color={C.red} bg={C.redBg}>{PA_TRACKER.filter(p => p.daysLeft !== null && p.daysLeft <= 7 && p.status === "approved").length} Expiring Soon</Badge>
      </div>
      <DataTable
        columns={["PA ID", "Patient", "Service", "Payer", "Submitted", "Status", "Expires/ETA"]}
        data={PA_TRACKER}
        renderRow={(row, i) => (
          <tr key={i} style={{ borderBottom: `1px solid ${C.border}`, backgroundColor: row.daysLeft !== null && row.daysLeft <= 7 && row.status === "approved" ? "#FFF7ED" : "transparent" }}>
            <td style={{ padding: "10px 14px", fontFamily: "monospace", fontSize: 12, fontWeight: 600, color: C.navy }}>{row.id}</td>
            <td style={{ padding: "10px 14px" }}>{row.patient}</td>
            <td style={{ padding: "10px 14px", fontSize: 12 }}>{row.service}</td>
            <td style={{ padding: "10px 14px", fontSize: 12 }}>{row.payer}</td>
            <td style={{ padding: "10px 14px", fontSize: 12 }}>{row.submitted}</td>
            <td style={{ padding: "10px 14px" }}><StatusBadge status={row.status} /></td>
            <td style={{ padding: "10px 14px", fontSize: 12 }}>
              {row.status === "pending" && <span style={{ color: C.amber }}>ETA: {row.eta}</span>}
              {row.status === "approved" && <span style={{ color: row.daysLeft <= 7 ? C.red : C.green, fontWeight: row.daysLeft <= 7 ? 700 : 400 }}>Exp: {row.expires} ({row.daysLeft}d)</span>}
              {row.status === "denied" && <span style={{ color: C.red, fontSize: 11 }}>{row.reason}</span>}
            </td>
          </tr>
        )}
      />
    </div>
  );
}

function DenialsPage() {
  const [expanded, setExpanded] = useState(null);
  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <Badge color={C.blue} bg="#EFF6FF">{DENIALS.filter(d => d.status === "correctable").length} Correctable</Badge>
        <Badge color={C.amber} bg={C.amberBg}>{DENIALS.filter(d => d.status === "appeal_ready").length} Appeal Ready</Badge>
        <Badge color={C.purple} bg="#F5F3FF">{DENIALS.filter(d => d.status === "partial_recovery").length} Partial</Badge>
        <Badge color={C.red} bg={C.redBg}>{DENIALS.filter(d => d.status === "unrecoverable").length} Unrecoverable</Badge>
      </div>
      <DataTable
        columns={["Denial", "Patient", "CPT", "Payer", "CARC/RARC", "Amount", "Status", ""]}
        data={DENIALS}
        renderRow={(row, i) => (
          <>
            <tr key={i} style={{ borderBottom: `1px solid ${C.border}`, cursor: "pointer" }} onClick={() => setExpanded(expanded === i ? null : i)}>
              <td style={{ padding: "10px 14px", fontFamily: "monospace", fontSize: 12, fontWeight: 600, color: C.navy }}>{row.id}</td>
              <td style={{ padding: "10px 14px" }}>{row.patient}</td>
              <td style={{ padding: "10px 14px", fontFamily: "monospace", fontSize: 12 }}>{row.cpt}</td>
              <td style={{ padding: "10px 14px", fontSize: 12 }}>{row.payer}</td>
              <td style={{ padding: "10px 14px", fontFamily: "monospace", fontSize: 12 }}>{row.carc}/{row.rarc}</td>
              <td style={{ padding: "10px 14px", fontWeight: 600, color: C.red }}>{row.amount}</td>
              <td style={{ padding: "10px 14px" }}><StatusBadge status={row.status} /></td>
              <td style={{ padding: "10px 14px", color: C.muted, fontSize: 12 }}>{expanded === i ? "\u25B2" : "\u25BC"}</td>
            </tr>
            {expanded === i && (
              <tr key={`${i}-d`} style={{ backgroundColor: "#FAFBFD" }}>
                <td colSpan={8} style={{ padding: "14px 14px 14px 40px", borderBottom: `1px solid ${C.border}` }}>
                  <div style={{ borderLeft: `3px solid ${C.blue}`, paddingLeft: 12, fontSize: 12, lineHeight: 1.7 }}>
                    <div><strong style={{ color: C.navy }}>Reason:</strong> {row.reason}</div>
                    <div style={{ marginTop: 6 }}><strong style={{ color: C.navy }}>AI Strategy:</strong> {row.strategy}</div>
                    {row.appealDeadline && <div style={{ marginTop: 6 }}><strong style={{ color: C.navy }}>Appeal Deadline:</strong> <span style={{ color: C.red, fontWeight: 600 }}>{row.appealDeadline}</span></div>}
                  </div>
                </td>
              </tr>
            )}
          </>
        )}
      />
    </div>
  );
}

function PaymentsPage() {
  const [expanded, setExpanded] = useState(null);
  const totalVariance = PAYMENTS.filter(p => p.status === "underpaid").reduce((sum, p) => sum + parseFloat(p.variance.replace(/[$,]/g, "")), 0);
  return (
    <div>
      <div style={{ backgroundColor: C.redBg, border: `1px solid #FECACA`, borderRadius: 10, padding: "14px 18px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.red }}>Underpayment Recovery Queue</div>
          <div style={{ fontSize: 12, color: "#7F1D1D", marginTop: 2 }}>{PAYMENTS.filter(p => p.status === "underpaid").length} claims with payment variances detected. Recovery documentation auto-generated.</div>
        </div>
        <div style={{ fontSize: 24, fontWeight: 700, color: C.red }}>${Math.abs(totalVariance).toFixed(2)}</div>
      </div>
      <DataTable
        columns={["Payment", "Patient", "CPT", "Payer", "Expected", "Paid", "Variance", "Status"]}
        data={PAYMENTS}
        renderRow={(row, i) => (
          <>
            <tr key={i} style={{ borderBottom: `1px solid ${C.border}`, cursor: row.reason ? "pointer" : "default" }} onClick={() => row.reason && setExpanded(expanded === i ? null : i)}>
              <td style={{ padding: "10px 14px", fontFamily: "monospace", fontSize: 12, fontWeight: 600, color: C.navy }}>{row.id}</td>
              <td style={{ padding: "10px 14px" }}>{row.patient}</td>
              <td style={{ padding: "10px 14px", fontFamily: "monospace", fontSize: 12 }}>{row.cpt}</td>
              <td style={{ padding: "10px 14px", fontSize: 12 }}>{row.payer}</td>
              <td style={{ padding: "10px 14px", fontSize: 12 }}>{row.expected}</td>
              <td style={{ padding: "10px 14px", fontSize: 12 }}>{row.paid}</td>
              <td style={{ padding: "10px 14px", fontWeight: 600, color: row.status === "underpaid" ? C.red : C.green }}>{row.variance}</td>
              <td style={{ padding: "10px 14px" }}><StatusBadge status={row.status} /></td>
            </tr>
            {expanded === i && row.reason && (
              <tr key={`${i}-d`} style={{ backgroundColor: "#FAFBFD" }}>
                <td colSpan={8} style={{ padding: "14px 14px 14px 40px", borderBottom: `1px solid ${C.border}` }}>
                  <div style={{ borderLeft: `3px solid ${C.red}`, paddingLeft: 12, fontSize: 12, color: C.text, lineHeight: 1.6 }}>{row.reason}</div>
                </td>
              </tr>
            )}
          </>
        )}
      />
    </div>
  );
}

function ChatPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  const send = async (text) => {
    if (!text.trim() || loading) return;
    const userMsg = { role: "user", content: text.trim() };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.map(m => ({ role: m.role, content: m.content })) })
      });
      const data = await res.json();
      const t = data.content?.filter(b => b.type === "text").map(b => b.text).join("\n") || "Error processing request.";
      setMessages(prev => [...prev, { role: "assistant", content: t }]);
    } catch { setMessages(prev => [...prev, { role: "assistant", content: "Connection error." }]); }
    finally { setLoading(false); }
  };

  const renderMsg = (text) => {
    return text.split("\n").map((line, i) => {
      const t = line.trim();
      if (!t) return <div key={i} style={{ height: 4 }} />;
      if (t.toLowerCase().startsWith("sources")) return <div key={i} style={{ marginTop: 10, paddingTop: 8, borderTop: "1px solid #E5E7EB", fontSize: 11, color: C.muted, fontWeight: 600 }}>{t}</div>;
      if (t.startsWith("**") && t.endsWith("**")) return <div key={i} style={{ fontWeight: 700, marginTop: 8, color: C.navy, fontSize: 13 }}>{t.replace(/\*\*/g, "")}</div>;
      const numMatch = t.match(/^(\d+)\.\s+(.*)/);
      if (numMatch) return <div key={i} style={{ display: "flex", gap: 6, fontSize: 13, lineHeight: 1.5, marginBottom: 2 }}><span style={{ color: C.blue, fontWeight: 700 }}>{numMatch[1]}.</span><span>{numMatch[2].replace(/\*\*/g, "")}</span></div>;
      if (t.startsWith("- ") || t.startsWith("\u2022 ")) return <div key={i} style={{ fontSize: 13, lineHeight: 1.5, paddingLeft: 12, marginBottom: 1 }}>{"\u2022 "}{t.replace(/^[-\u2022]\s*/, "").replace(/\*\*/g, "")}</div>;
      return <div key={i} style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 2 }}>{t.replace(/\*\*/g, "")}</div>;
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ flex: 1, overflow: "auto", padding: "12px 0" }}>
        {messages.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px 20px", color: C.muted }}>
            <div style={{ fontSize: 14, marginBottom: 8 }}>Ask about prior auth, denials, fee schedules, or eligibility</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
              {["Does UHC MA require PA for CPT 27447?", "CARC 197 / RARC N657 - what do I do?", "Medicare rate for 99214 in Chicago?"].map((q, i) => (
                <button key={i} onClick={() => send(q)} style={{ padding: "6px 12px", borderRadius: 6, border: `1px solid ${C.border}`, backgroundColor: C.white, fontSize: 11, color: C.sub, cursor: "pointer" }}>{q}</button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{ marginBottom: 12, display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
            <div style={{
              maxWidth: "88%", padding: "10px 14px", borderRadius: m.role === "user" ? "12px 12px 2px 12px" : "2px 12px 12px 12px",
              backgroundColor: m.role === "user" ? C.navy : C.white, color: m.role === "user" ? C.white : C.text,
              border: m.role === "user" ? "none" : `1px solid ${C.border}`, fontSize: 13
            }}>
              {m.role === "user" ? m.content : renderMsg(m.content)}
            </div>
          </div>
        ))}
        {loading && <div style={{ padding: "10px 14px", fontSize: 12, color: C.muted }}>Checking payer rules...</div>}
        <div ref={endRef} />
      </div>
      <div style={{ display: "flex", gap: 8, padding: "8px 0 0", borderTop: `1px solid ${C.border}` }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send(input)}
          placeholder="Ask a billing question..." style={{ flex: 1, padding: "10px 14px", borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, outline: "none", fontFamily: "inherit" }} />
        <button onClick={() => send(input)} disabled={!input.trim() || loading}
          style={{ padding: "10px 16px", borderRadius: 8, border: "none", backgroundColor: input.trim() && !loading ? C.navy : "#E2E8F0", color: input.trim() && !loading ? C.white : C.muted, fontWeight: 600, fontSize: 13, cursor: input.trim() && !loading ? "pointer" : "default" }}>
          Send
        </button>
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
  { id: "chat", icon: "\u{1F4AC}", label: "Ask AI" },
];

export default function App() {
  const [page, setPage] = useState("dashboard");

  const titles = { dashboard: "Operations Dashboard", claims: "Pre-Submission Claims Queue", pa: "Prior Authorization Tracker", denials: "Denial Management", payments: "Payment Reconciliation", chat: "Policy Assistant" };

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "'Inter', -apple-system, sans-serif", color: C.text, fontSize: 13 }}>
      {/* Sidebar */}
      <div style={{ width: 200, backgroundColor: C.navy, display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "16px 16px 20px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 30, height: 30, borderRadius: 7, background: "linear-gradient(135deg, #2563EB, #7C3AED)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 800, fontSize: 12 }}>PI</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.white }}>Provider Intel</div>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.5)", letterSpacing: "0.05em" }}>ATHINIA + EVERLIGN</div>
            </div>
          </div>
        </div>
        <nav style={{ flex: 1, padding: "8px" }}>
          {NAV.map(n => (
            <button key={n.id} onClick={() => setPage(n.id)} style={{
              display: "flex", alignItems: "center", gap: 10, width: "100%",
              padding: "9px 12px", borderRadius: 7, border: "none", cursor: "pointer",
              backgroundColor: page === n.id ? "rgba(255,255,255,0.12)" : "transparent",
              color: page === n.id ? C.white : "rgba(255,255,255,0.6)",
              fontSize: 13, fontWeight: page === n.id ? 600 : 400,
              marginBottom: 2, textAlign: "left", transition: "all 0.1s"
            }}>
              <span style={{ fontSize: 15 }}>{n.icon}</span>{n.label}
            </button>
          ))}
        </nav>
        <div style={{ padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#22C55E" }} />
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>Demo Environment</span>
          </div>
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", marginTop: 4 }}>Powered by Everlign JEKL/ERAG</div>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "14px 24px", backgroundColor: C.white, borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: C.navy }}>{titles[page]}</h1>
          <div style={{ fontSize: 12, color: C.muted }}>{TODAY}</div>
        </div>
        <div style={{ flex: 1, overflow: "auto", padding: 24, backgroundColor: C.bg }}>
          {page === "dashboard" && <DashboardPage />}
          {page === "claims" && <ClaimsPage />}
          {page === "pa" && <PAPage />}
          {page === "denials" && <DenialsPage />}
          {page === "payments" && <PaymentsPage />}
          {page === "chat" && <ChatPage />}
        </div>
      </div>

      <style>{`* { box-sizing: border-box; margin: 0; padding: 0; } button:hover { opacity: 0.92; }`}</style>
    </div>
  );
}
