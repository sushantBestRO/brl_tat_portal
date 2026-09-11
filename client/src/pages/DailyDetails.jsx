import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

export default function DailyDetails() {
  const navigate = useNavigate();
  const [dailyData, setDailyData] = useState(null);
  const [dailyDate, setDailyDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState(null);

  const fetchDetail = async (id) => {
    try {
      const res = await api.get(`/inquiries/${id}`);
      setDetail(res.data);
    } catch (err) {
      setError("Failed to load inquiry detail.");
    }
  };

  // ─── Fetch daily details from backend ───
  const fetchDailyDetails = async (date) => {
    setLoading(true);
    try {
      const res = await api.get("/daily-details", { params: { date } });
      setDailyData(res.data);
      setError("");
    } catch (err) {
      setError("Failed to load daily details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDailyDetails(dailyDate);
  }, []);

  // ─── Back button → navigate to dashboard ───
  const goBack = () => {
    navigate("/dashboard");
  };

  if (loading && !dailyData)
    return (
      <div>
        {/* ─── Back button at top ─── */}
        <button
          className="secondary"
          onClick={goBack}
          style={{ marginBottom: "16px" }}
        >
          ← Back to Dashboard
        </button>
        <div className="card">Loading daily details...</div>
      </div>
    );

  if (error)
    return (
      <div>
        <button
          className="secondary"
          onClick={goBack}
          style={{ marginBottom: "16px" }}
        >
          ← Back to Dashboard
        </button>
        <div className="card" style={{ color: "var(--danger)" }}>
          {error}
        </div>
      </div>
    );

  return (
    <div>
      {/* ─── Header with Back button + date picker ─── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          {/* ─── Back to Dashboard button ─── */}
          <button
            className="secondary"
            onClick={goBack}
            style={{ padding: "6px 16px" }}
          >
            ← Back
          </button>
          <h1 className="page-title" style={{ marginBottom: 0 }}>
            Daily Details
          </h1>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {/* ─── Date picker — change date to see different day ─── */}
          <label style={{ fontSize: "12px", color: "var(--text-muted)" }}>
            Date:
          </label>
          <input
            type="date"
            value={dailyDate}
            onChange={(e) => {
              setDailyDate(e.target.value);
              fetchDailyDetails(e.target.value);
            }}
            style={{
              padding: "6px 10px",
              borderRadius: "4px",
              border: "1px solid var(--border)",
              fontSize: "13px",
            }}
          />
        </div>
      </div>

      {/* ─── Summary cards row ─── */}
      <div className="row" style={{ marginBottom: "20px", flexWrap: "wrap" }}>
        <div
          className="card"
          style={{ flex: 1, minWidth: "150px", margin: "0 10px 10px 0" }}
        >
          <h3
            style={{
              color: "var(--text-muted)",
              fontSize: "12px",
              textTransform: "uppercase",
              marginBottom: "8px",
            }}
          >
            Total Inquiries
          </h3>
          <p style={{ fontSize: "28px", fontWeight: "700" }}>
            {dailyData?.total_inquiries ?? 0}
          </p>
        </div>
        <div
          className="card"
          style={{ flex: 1, minWidth: "150px", margin: "0 10px 10px 0" }}
        >
          <h3
            style={{
              color: "var(--text-muted)",
              fontSize: "12px",
              textTransform: "uppercase",
              marginBottom: "8px",
            }}
          >
            Quoted
          </h3>
          <p
            style={{
              fontSize: "28px",
              fontWeight: "700",
              color: "var(--success)",
            }}
          >
            {dailyData?.quoted_count ?? 0}
          </p>
        </div>
        <div
          className="card"
          style={{ flex: 1, minWidth: "150px", margin: "0 0 10px 0" }}
        >
          <h3
            style={{
              color: "var(--text-muted)",
              fontSize: "12px",
              textTransform: "uppercase",
              marginBottom: "8px",
            }}
          >
            Rate Changed
          </h3>
          <p
            style={{
              fontSize: "28px",
              fontWeight: "700",
              color: "var(--amber)",
            }}
          >
            {dailyData?.rate_changed_count ?? 0}
          </p>
        </div>
      </div>

      {/* ─── Inquiries table ─── */}
      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <p style={{ padding: "20px", color: "var(--text-muted)" }}>
            Loading...
          </p>
        ) : !dailyData || dailyData.inquiries.length === 0 ? (
          <p style={{ padding: "20px", color: "var(--text-muted)" }}>
            No inquiries on {dailyData?.date || dailyDate}.
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Requester</th>
                  <th>Lane</th>
                  <th>Vehicle Type</th>
                  <th>Posted At</th>
                  <th>Status</th>
                  <th>Assigned To</th>
                  <th>Rate History</th>
                </tr>
              </thead>
              <tbody>
                {dailyData.inquiries.map((inq) => (
                  <tr
                    // key={inq.id}
                    // onClick={() => fetchDetail(inq.id)}
                    // style={{
                    //   background: inq.has_rate_change
                    //     ? "rgba(255, 165, 0, 0.05)"
                    //     : "inherit",
                    //   cursor: "pointer",
                    // }}
                    key={inq.id}
                    onClick={() => fetchDetail(inq.id)}
                    style={{
                      background: inq.has_rate_change
                        ? "rgba(255, 165, 0, 0.05)"
                        : "inherit",
                      cursor: "pointer",
                    }}
                  >
                    <td>#{inq.id}</td>
                    <td>{inq.requester || "Unknown"}</td>
                    <td
                      style={{
                        maxWidth: "250px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {inq.lane}
                    </td>
                    <td
                      style={{
                        maxWidth: "150px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        fontSize: "12px",
                      }}
                    >
                      {inq.vehicle_type || "-"}
                    </td>
                    <td style={{ fontSize: "12px", whiteSpace: "nowrap" }}>
                      {inq.posted_at
                        ? new Date(inq.posted_at).toLocaleString("en-IN", {
                            timeZone: "Asia/Kolkata",
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "-"}
                    </td>
                    <td>
                      <span
                        className={`badge badge-${inq.status.toLowerCase().replace("_", "-")}`}
                      >
                        {inq.status.replace("_", " ")}
                      </span>
                    </td>
                    <td style={{ fontSize: "12px" }}>
                      {inq.assigned_to || "-"}
                    </td>
                    {/* ─── Rate History column ─── */}
                    {/* Shows first rate (green "1st") and all rate changes (amber "CHG") */}
                    {/* e.g. if rate went 444 → 99349, you'll see both here */}
                    <td>
                      {inq.rate_history.length === 0 ? (
                        <span
                          style={{
                            color: "var(--text-muted)",
                            fontSize: "12px",
                          }}
                        >
                          No rate yet
                        </span>
                      ) : (
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "4px",
                          }}
                        >
                          {inq.rate_history.map((rh, i) => (
                            <div
                              key={i}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                                fontSize: "12px",
                                padding: "4px 8px",
                                borderRadius: "4px",
                                background:
                                  rh.kind === "RATE_CHANGED"
                                    ? "rgba(255, 165, 0, 0.12)"
                                    : "var(--light-gray, #f5f5f5)",
                                border:
                                  rh.kind === "RATE_CHANGED"
                                    ? "1px solid rgba(255, 165, 0, 0.3)"
                                    : "none",
                              }}
                            >
                              {/* Badge: "1st" for first rate (green), "CHG" for rate change (amber) */}
                              <span
                                style={{
                                  fontWeight: "600",
                                  color:
                                    rh.kind === "RATE_CHANGED"
                                      ? "var(--amber, #f59e0b)"
                                      : "var(--success, #22c55e)",
                                  fontSize: "10px",
                                  textTransform: "uppercase",
                                  minWidth: "40px",
                                }}
                              >
                                {rh.kind === "QUOTED" ? "1st" : "CHG"}
                              </span>
                              {/* Detail text (includes "rate changed: 444 → 99349" for changes) */}
                              <span style={{ flex: 1 }}>{rh.detail}</span>
                              {/* Time when this rate was given */}
                              <span
                                style={{
                                  color: "var(--text-muted)",
                                  fontSize: "11px",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {rh.at
                                  ? new Date(rh.at).toLocaleString("en-IN", {
                                      timeZone: "Asia/Kolkata",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })
                                  : ""}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {/* ─── Detail Modal ─── */}
      {detail && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
          onClick={() => setDetail(null)}
        >
          <div
            className="card"
            style={{
              width: "100%",
              maxWidth: "600px",
              maxHeight: "80vh",
              overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="between" style={{ marginBottom: "16px" }}>
              <h2 style={{ fontSize: "18px", fontWeight: "700" }}>
                Inquiry #{detail.id}
              </h2>
              <button
                className="small secondary"
                onClick={() => setDetail(null)}
              >
                Close
              </button>
            </div>

            <div className="col" style={{ gap: "8px" }}>
              <div>
                <strong>Status:</strong> {detail.status.replace("_", " ")}
              </div>
              <div>
                <strong>Requester:</strong> {detail.requester}
              </div>
              <div>
                <strong>Lane:</strong> {detail.lane}
              </div>
              <div>
                <strong>Vehicle Type:</strong> {detail.vehicle_type || "-"}
              </div>
              <div>
                <strong>Spec:</strong> {detail.spec || "-"}
              </div>
              <div>
                <strong>Posted:</strong>{" "}
                {detail.posted_at
                  ? new Date(detail.posted_at).toLocaleString("en-IN")
                  : "-"}
              </div>
              <div>
                <strong>Assigned To:</strong> {detail.assigned_to || "-"}
              </div>
              <div>
                <strong>TAT:</strong> {detail.tat || "-"}
              </div>

              {detail.quoted_rates && (
                <div>
                  <strong>Rate:</strong> ₹{detail.quoted_rates}
                </div>
              )}

              {detail.raw_body && (
                <div style={{ marginTop: "10px" }}>
                  <strong>Raw Message:</strong>
                  <pre
                    style={{
                      background: "var(--light-gray)",
                      padding: "12px",
                      borderRadius: "6px",
                      whiteSpace: "pre-wrap",
                      fontSize: "12px",
                    }}
                  >
                    {detail.raw_body}
                  </pre>
                </div>
              )}

              {detail.events && detail.events.length > 0 && (
                <div style={{ marginTop: "10px" }}>
                  <strong>Event Log:</strong>
                  <div className="col" style={{ gap: "6px", marginTop: "8px" }}>
                    {detail.events.map((ev, i) => (
                      <div
                        key={i}
                        style={{
                          fontSize: "12px",
                          padding: "8px",
                          background: "var(--light-gray)",
                          borderRadius: "4px",
                        }}
                      >
                        <strong>{ev.kind}</strong> — {ev.detail}
                        <br />
                        <span style={{ color: "var(--text-muted)" }}>
                          {ev.at ? new Date(ev.at).toLocaleString("en-IN") : ""}{" "}
                          by {ev.actor}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
