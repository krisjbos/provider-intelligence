import { useState, useRef, useEffect } from "react";

const QUICK_ACTIONS = [
  {
    icon: "\u{1F510}",
    label: "Prior Auth Check",
    query: "Does UnitedHealthcare Medicare Advantage require prior authorization for CPT 27447 (total knee arthroplasty)?",
    color: "#2563EB"
  },
  {
    icon: "\u26A0\uFE0F",
    label: "Denial Analysis",
    query: "Claim denied with CARC 197 and RARC N657 from Aetna Better Health of Illinois Medicaid. The service was an outpatient MRI (CPT 70553). What happened and what are my options?",
    color: "#D97706"
  },
  {
    icon: "\uD83D\uDCB2",
    label: "Fee Schedule Lookup",
    query: "What is the Medicare MPFS rate for CPT 99214 (established patient office visit, moderate complexity) in the Chicago locality?",
    color: "#059669"
  },
  {
    icon: "\uD83D\uDC65",
    label: "Dual-Eligible Check",
    query: "Patient has Medicare Part B and Illinois Medicaid (QMB). They need outpatient physical therapy (CPT 97110). Who is primary, what are the cost-sharing rules, and do I need prior auth from either payer?",
    color: "#7C3AED"
  }
];

const SAMPLE_SCENARIOS = [
  "What modifiers are required when billing CPT 59510 with 59400 for the same patient on the same date of service?",
  "Our Molina Healthcare Medicaid claim for CPT 90837 was denied for timely filing. The DOS was 9 months ago. Do we have any options?",
  "Compare the prior auth requirements for lumbar spinal fusion (CPT 22612) across Medicare FFS, UHC MA, and Illinois Medicaid.",
  "Patient has Medicare Advantage through Humana and secondary coverage through Illinois Medicaid. How do I handle a denied prior auth appeal?"
];

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showScenarios, setShowScenarios] = useState(false);
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async (text) => {
    if (!text.trim() || loading) return;

    const userMsg = { role: "user", content: text.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content }))
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "API error");
      }

      const assistantText = data.content
        ?.filter(b => b.type === "text")
        .map(b => b.text)
        .join("\n") || "I was unable to process that request. Please try again.";

      setMessages(prev => [...prev, { role: "assistant", content: assistantText }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "Connection error. Please check your network and try again."
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const renderInlineBold = (text) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={i} style={{ fontWeight: 700, color: "#1B2A4A" }}>{part.slice(2, -2)}</strong>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  const formatMessage = (text) => {
    const lines = text.split("\n");
    const elements = [];
    let inSources = false;

    lines.forEach((line, i) => {
      const trimmed = line.trim();

      if (trimmed.toLowerCase().startsWith("sources:") || trimmed.toLowerCase().startsWith("**sources")) {
        inSources = true;
        elements.push(
          <div key={i} style={{
            marginTop: 16, paddingTop: 12,
            borderTop: "1px solid #E5E7EB",
            fontSize: 12, color: "#6B7280", fontWeight: 600,
            textTransform: "uppercase", letterSpacing: "0.05em"
          }}>
            Sources
          </div>
        );
        const afterColon = trimmed.replace(/^\*?\*?sources:?\*?\*?/i, "").trim();
        if (afterColon) {
          elements.push(
            <div key={`${i}c`} style={{ fontSize: 12, color: "#6B7280", lineHeight: 1.5, paddingLeft: 8 }}>
              {afterColon}
            </div>
          );
        }
        return;
      }

      if (inSources) {
        if (trimmed) {
          elements.push(
            <div key={i} style={{ fontSize: 12, color: "#6B7280", lineHeight: 1.5, paddingLeft: 8 }}>
              {trimmed.replace(/^[-\u2022]\s*/, "\u2022 ")}
            </div>
          );
        }
        return;
      }

      // Tier badges
      let processed = line;
      const tierMatch = processed.match(/\[Tier\s*(\d)\s*[-\u2013]\s*([^\]]+)\]/i);
      if (tierMatch) {
        const tierNum = tierMatch[1];
        const tierLabel = tierMatch[2];
        const tierColors = { "1": "#2563EB", "2": "#7C3AED", "3": "#059669" };
        const c = tierColors[tierNum] || "#6B7280";
        elements.push(
          <div key={i} style={{ marginBottom: 4 }}>
            <span style={{
              display: "inline-block", padding: "1px 8px", borderRadius: 4,
              fontSize: 11, fontWeight: 600, color: c,
              backgroundColor: c + "14", border: `1px solid ${c}40`
            }}>
              TIER {tierNum} \u2014 {tierLabel.toUpperCase()}
            </span>
          </div>
        );
        processed = processed.replace(tierMatch[0], "").trim();
        if (!processed) return;
      }

      if (trimmed.startsWith("###")) {
        elements.push(<div key={i} style={{ fontWeight: 700, fontSize: 14, marginTop: 12, marginBottom: 4, color: "#1B2A4A" }}>{trimmed.replace(/^#+\s*/, "").replace(/\*\*/g, "")}</div>);
        return;
      }
      if (trimmed.startsWith("##")) {
        elements.push(<div key={i} style={{ fontWeight: 700, fontSize: 15, marginTop: 14, marginBottom: 6, color: "#1B2A4A" }}>{trimmed.replace(/^#+\s*/, "").replace(/\*\*/g, "")}</div>);
        return;
      }

      if (trimmed.startsWith("**") && trimmed.endsWith("**")) {
        elements.push(<div key={i} style={{ fontWeight: 700, marginTop: 10, marginBottom: 2, color: "#1B2A4A" }}>{trimmed.replace(/\*\*/g, "")}</div>);
        return;
      }

      const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
      if (numMatch) {
        elements.push(
          <div key={i} style={{ display: "flex", gap: 8, marginBottom: 4, lineHeight: 1.6 }}>
            <span style={{ color: "#2563EB", fontWeight: 700, minWidth: 20, flexShrink: 0 }}>{numMatch[1]}.</span>
            <span>{renderInlineBold(numMatch[2])}</span>
          </div>
        );
        return;
      }

      if (trimmed.startsWith("- ") || trimmed.startsWith("\u2022 ")) {
        elements.push(
          <div key={i} style={{ display: "flex", gap: 8, marginBottom: 3, lineHeight: 1.6, paddingLeft: 4 }}>
            <span style={{ color: "#2563EB", flexShrink: 0 }}>{"\u2022"}</span>
            <span>{renderInlineBold(trimmed.replace(/^[-\u2022]\s*/, ""))}</span>
          </div>
        );
        return;
      }

      if (!trimmed) {
        elements.push(<div key={i} style={{ height: 6 }} />);
        return;
      }

      elements.push(<div key={i} style={{ lineHeight: 1.6, marginBottom: 2 }}>{renderInlineBold(trimmed)}</div>);
    });

    return elements;
  };

  const hasMessages = messages.length > 0;

  return (
    <div style={{
      height: "100vh", display: "flex", flexDirection: "column",
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      backgroundColor: "#F8FAFC", color: "#1E293B"
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: "#FFFFFF",
        borderBottom: "1px solid #E2E8F0",
        padding: "12px 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexShrink: 0
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8,
            background: "linear-gradient(135deg, #1B2A4A 0%, #2563EB 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "white", fontWeight: 800, fontSize: 14
          }}>
            PI
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: "#1B2A4A", lineHeight: 1.2 }}>
              Provider Intelligence
            </div>
            <div style={{ fontSize: 11, color: "#64748B", letterSpacing: "0.02em" }}>
              Medicare & Medicaid Billing Assistant
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "4px 10px", borderRadius: 6,
            backgroundColor: "#F0FDF4", border: "1px solid #BBF7D0"
          }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#22C55E" }} />
            <span style={{ fontSize: 11, color: "#15803D", fontWeight: 600 }}>Connected</span>
          </div>
          <div style={{ fontSize: 11, color: "#94A3B8" }}>
            Demo Environment
          </div>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column" }}>
        {!hasMessages ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 24px 120px" }}>
            <div style={{
              width: 56, height: 56, borderRadius: 14,
              background: "linear-gradient(135deg, #1B2A4A 0%, #2563EB 100%)",
              display: "flex", alignItems: "center", justifyContent: "center",
              marginBottom: 20, boxShadow: "0 4px 12px rgba(37,99,235,0.25)"
            }}>
              <span style={{ fontSize: 24 }}>{"\u2695\uFE0F"}</span>
            </div>
            <h1 style={{
              fontSize: 22, fontWeight: 700, color: "#1B2A4A",
              marginBottom: 6, textAlign: "center"
            }}>
              Provider-Payer Intelligence
            </h1>
            <p style={{
              fontSize: 14, color: "#64748B", textAlign: "center",
              maxWidth: 480, lineHeight: 1.5, marginBottom: 32
            }}>
              Ask about prior authorizations, denial management, fee schedules,
              eligibility, and coverage rules across Medicare, Medicare Advantage,
              and Medicaid payers.
            </p>

            <div style={{
              display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10,
              width: "100%", maxWidth: 560
            }}>
              {QUICK_ACTIONS.map((action, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(action.query)}
                  style={{
                    display: "flex", alignItems: "flex-start", gap: 10,
                    padding: "14px 16px", borderRadius: 10,
                    border: "1px solid #E2E8F0", backgroundColor: "#FFFFFF",
                    cursor: "pointer", textAlign: "left",
                    transition: "all 0.15s ease",
                    boxShadow: "0 1px 2px rgba(0,0,0,0.04)"
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = action.color + "60";
                    e.currentTarget.style.backgroundColor = action.color + "06";
                    e.currentTarget.style.transform = "translateY(-1px)";
                    e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = "#E2E8F0";
                    e.currentTarget.style.backgroundColor = "#FFFFFF";
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 1px 2px rgba(0,0,0,0.04)";
                  }}
                >
                  <span style={{ fontSize: 20, flexShrink: 0, marginTop: 1 }}>{action.icon}</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13, color: "#1B2A4A", marginBottom: 3 }}>
                      {action.label}
                    </div>
                    <div style={{ fontSize: 11, color: "#94A3B8", lineHeight: 1.4 }}>
                      {action.query.length > 80 ? action.query.slice(0, 80) + "..." : action.query}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowScenarios(!showScenarios)}
              style={{
                marginTop: 16, padding: "6px 14px", borderRadius: 6,
                border: "none", backgroundColor: "transparent",
                color: "#2563EB", fontSize: 12, fontWeight: 600,
                cursor: "pointer"
              }}
            >
              {showScenarios ? "Hide" : "Show"} more example scenarios {"\u2193"}
            </button>
            {showScenarios && (
              <div style={{ width: "100%", maxWidth: 560, marginTop: 8 }}>
                {SAMPLE_SCENARIOS.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(s)}
                    style={{
                      display: "block", width: "100%", textAlign: "left",
                      padding: "10px 14px", marginBottom: 4, borderRadius: 8,
                      border: "1px solid #F1F5F9", backgroundColor: "#FFFFFF",
                      fontSize: 12, color: "#475569", cursor: "pointer",
                      lineHeight: 1.4
                    }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = "#F8FAFC"}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = "#FFFFFF"}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div style={{ flex: 1, padding: "16px 24px", maxWidth: 760, width: "100%", margin: "0 auto" }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ marginBottom: 16 }}>
                {msg.role === "user" ? (
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <div style={{
                      maxWidth: "85%", padding: "10px 16px",
                      borderRadius: "14px 14px 4px 14px",
                      backgroundColor: "#1B2A4A", color: "#FFFFFF",
                      fontSize: 14, lineHeight: 1.6
                    }}>
                      {msg.content}
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 7, flexShrink: 0,
                      background: "linear-gradient(135deg, #1B2A4A, #2563EB)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      marginTop: 2
                    }}>
                      <span style={{ fontSize: 12, color: "white", fontWeight: 800 }}>PI</span>
                    </div>
                    <div style={{
                      maxWidth: "90%", padding: "12px 16px",
                      borderRadius: "4px 14px 14px 14px",
                      backgroundColor: "#FFFFFF",
                      border: "1px solid #E2E8F0",
                      fontSize: 13.5, color: "#334155",
                      boxShadow: "0 1px 2px rgba(0,0,0,0.04)"
                    }}>
                      {formatMessage(msg.content)}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 16 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 7, flexShrink: 0,
                  background: "linear-gradient(135deg, #1B2A4A, #2563EB)",
                  display: "flex", alignItems: "center", justifyContent: "center"
                }}>
                  <span style={{ fontSize: 12, color: "white", fontWeight: 800 }}>PI</span>
                </div>
                <div style={{
                  padding: "14px 20px", borderRadius: "4px 14px 14px 14px",
                  backgroundColor: "#FFFFFF", border: "1px solid #E2E8F0"
                }}>
                  <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                    {[0, 1, 2].map(j => (
                      <div key={j} style={{
                        width: 7, height: 7, borderRadius: "50%",
                        backgroundColor: "#94A3B8",
                        animation: `pulse 1.2s ease-in-out ${j * 0.2}s infinite`
                      }} />
                    ))}
                    <span style={{ fontSize: 12, color: "#94A3B8", marginLeft: 8 }}>
                      Checking payer rules...
                    </span>
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{
        borderTop: "1px solid #E2E8F0", backgroundColor: "#FFFFFF",
        padding: "12px 24px 16px", flexShrink: 0
      }}>
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <div style={{
            display: "flex", alignItems: "flex-end", gap: 8,
            padding: "8px 8px 8px 16px",
            borderRadius: 12, border: "1px solid #E2E8F0",
            backgroundColor: "#F8FAFC",
            transition: "border-color 0.15s",
          }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about prior auth, denials, fee schedules, eligibility..."
              rows={1}
              style={{
                flex: 1, border: "none", outline: "none", resize: "none",
                fontSize: 14, lineHeight: 1.5, backgroundColor: "transparent",
                color: "#1E293B", padding: "4px 0",
                fontFamily: "inherit"
              }}
              onFocus={e => e.currentTarget.parentElement.style.borderColor = "#2563EB"}
              onBlur={e => e.currentTarget.parentElement.style.borderColor = "#E2E8F0"}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || loading}
              style={{
                width: 36, height: 36, borderRadius: 8,
                border: "none", flexShrink: 0,
                backgroundColor: input.trim() && !loading ? "#1B2A4A" : "#E2E8F0",
                color: input.trim() && !loading ? "#FFFFFF" : "#94A3B8",
                cursor: input.trim() && !loading ? "pointer" : "default",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.15s",
                fontSize: 16
              }}
            >
              {"\u2191"}
            </button>
          </div>
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            marginTop: 8, padding: "0 4px"
          }}>
            <div style={{ fontSize: 10, color: "#CBD5E1" }}>
              Powered by Everlign JEKL/ERAG {"\u00B7"} All responses cite authoritative sources
            </div>
            {hasMessages && (
              <button
                onClick={() => { setMessages([]); setInput(""); }}
                style={{
                  fontSize: 11, color: "#94A3B8", border: "none",
                  backgroundColor: "transparent", cursor: "pointer",
                  fontWeight: 500
                }}
              >
                Clear conversation
              </button>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1); }
        }
        textarea::placeholder { color: #94A3B8; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
      `}</style>
    </div>
  );
}
