import { useState, useEffect } from "react";
import api from "../api";

// ─── Settings → Call Logs tab ───
// HISTORY VIEW ONLY — shows every call placed via the 📞 button:
// connected / not connected, when it started, and how long it lasted.
//
// All the logic lives in the backend (CallsService):
//   • starting a call        → POST /calls/connect
//   • status + duration      → Runo webhook → POST /calls/webhook
//                              (or the manual endpoint POST /calls/:id/outcome)
// This tab only READS:  GET /calls  and  GET /calls/stats
export default function CallLogs({ showToast }) {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [logsRes, statsRes] = await Promise.all([
        api.get("/calls", { params: { limit: 200 } }),
        api.get("/calls/stats"),
      ]);
      setLogs(logsRes.data || []);
      setStats(statsRes.data || null);
    } catch {
      showToast?.("Could not load call logs", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fmtTime = (t) =>
    t
      ? new Date(t).toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "—";

  const statusColor = (s) => {
    if (s === "CONNECTED" || s === "COMPLETED")
      return "var(--success, #16a34a)";
    if (s === "INITIATED") return "var(--warning, #d97706)";
    return "var(--danger, #dc2626)";
  };

  return (
    <div>
      {/* ─── Summary cards ─── */}
      {stats && (
        <div
          style={{
            display: "flex",
            gap: "12px",
            flexWrap: "wrap",
            marginBottom: "18px",
          }}
        >
          {[
            { label: "Total calls", value: stats.total },
            { label: "Connected", value: stats.connected },
            { label: "Not connected", value: stats.not_connected },
            { label: "Total talk time", value: `${stats.total_minutes} min` },
            { label: "Avg per call", value: `${stats.avg_minutes} min` },
          ].map((c, i) => (
            <div
              key={i}
              style={{
                padding: "12px 16px",
                borderRadius: "8px",
                border: "1px solid var(--border)",
                minWidth: "120px",
              }}
            >
              <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                {c.label}
              </div>
              <div style={{ fontSize: "20px", fontWeight: 700 }}>{c.value}</div>
            </div>
          ))}
        </div>
      )}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "10px",
        }}
      >
        <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 600 }}>
          Call History
        </h3>
        <button onClick={load} disabled={loading} className="small">
          {loading ? "..." : "↻ Refresh"}
        </button>
      </div>

      {logs.length === 0 && !loading && (
        <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>
          No calls yet. Use the 📞 Call button on any inquiry to place a call.
        </p>
      )}

      {logs.length > 0 && (
        <table
          style={{
            width: "100%",
            fontSize: "13px",
            borderCollapse: "collapse",
          }}
        >
          <thead>
            <tr
              style={{
                textAlign: "left",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <th style={{ padding: "6px" }}>Inquiry</th>
              <th style={{ padding: "6px" }}>Customer</th>
              <th style={{ padding: "6px" }}>Number</th>
              <th style={{ padding: "6px" }}>Rang on</th>
              <th style={{ padding: "6px" }}>Status</th>
              <th style={{ padding: "6px" }}>Started</th>
              <th style={{ padding: "6px" }}>Connected</th>
              <th style={{ padding: "6px" }}>Duration</th>
              <th style={{ padding: "6px" }}>By</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((c) => (
              <tr
                key={c.id}
                style={{ borderBottom: "1px solid var(--border)" }}
              >
                <td style={{ padding: "6px" }}>
                  {c.inquiry_id ? `#${c.inquiry_id}` : "—"}
                </td>
                <td style={{ padding: "6px" }}>{c.customer_name || "—"}</td>
                <td style={{ padding: "6px" }}>{c.customer_phone}</td>
                <td style={{ padding: "6px" }}>{c.agent_phone}</td>
                <td
                  style={{
                    padding: "6px",
                    fontWeight: 600,
                    color: statusColor(c.status),
                  }}
                >
                  {c.status}
                </td>
                <td style={{ padding: "6px" }}>{fmtTime(c.started_at)}</td>
                <td style={{ padding: "6px" }}>{fmtTime(c.connected_at)}</td>
                <td style={{ padding: "6px" }}>
                  {c.duration_min != null ? `${c.duration_min} min` : "—"}
                </td>
                <td style={{ padding: "6px" }}>{c.initiated_by || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
