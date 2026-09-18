// export default function DangerZone() {
//   return <div><h1 className="page-title">Danger Zone</h1><div className="card">Coming soon...</div></div>;
// }

import { useState, useEffect } from "react";
import api from "../api";

export default function DangerZone() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [deleted, setDeleted] = useState([]);
  const [loadingDeleted, setLoadingDeleted] = useState(true);

  const softDelete = async () => {
    if (
      !confirm(
        "Archive ALL messages and inquiries? They will be hidden but recoverable.",
      )
    )
      return;
    setLoading(true);
    try {
      const res = await api.post("/admin/soft-delete");
      setMessage(
        `Archived ${res.data.archived_messages} messages and ${res.data.archived_inquiries} inquiries.`,
      );
    } catch (err) {
      setMessage("Action failed.");
    } finally {
      setLoading(false);
    }
  };

  const fetchDeleted = () => {
    api
      .get("/inquiries/deleted")
      .then((res) => setDeleted(res.data))
      .catch(() => {})
      .finally(() => setLoadingDeleted(false));
  };

  useEffect(() => {
    fetchDeleted();
  }, []);

  const restore = async (id) => {
    try {
      await api.post(`/inquiries/${id}/restore`, {});
      fetchDeleted(); // refresh the list
    } catch {
      alert("Restore failed");
    }
  };

  const recover = async () => {
    if (!confirm("Recover ALL archived messages and inquiries?")) return;
    setLoading(true);
    try {
      const res = await api.post("/admin/recover-archived");
      setMessage(
        `Recovered ${res.data.recovered_messages} messages and ${res.data.recovered_inquiries} inquiries.`,
      );
    } catch (err) {
      setMessage("Action failed.");
    } finally {
      setLoading(false);
    }
  };

  const requestOtp = async () => {
    setLoading(true);
    try {
      const res = await api.post("/admin/hard-delete/request-otp");
      setOtpSent(true);
      setMessage(
        res.data.sent
          ? "OTP sent to configured email."
          : "SMTP not configured. Cannot send OTP.",
      );
    } catch (err) {
      setMessage("Failed to request OTP.");
    } finally {
      setLoading(false);
    }
  };

  const confirmHardDelete = async () => {
    if (
      !confirm(
        "PERMANENTLY DELETE ALL messages, inquiries, and events? This CANNOT be undone.",
      )
    )
      return;
    setLoading(true);
    try {
      const res = await api.post("/admin/hard-delete/confirm", { otp });
      setMessage(
        `Permanently deleted ${res.data.deleted_messages} messages, ${res.data.deleted_inquiries} inquiries, and ${res.data.deleted_events} events.`,
      );
      setOtpSent(false);
      setOtp("");
    } catch (err) {
      setMessage(err.response?.data?.message || "Hard delete failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="page-title">Danger Zone</h1>

      {message && (
        <div
          className="card"
          style={{ background: "var(--light-gray)", marginBottom: "16px" }}
        >
          {message}
        </div>
      )}

      <div className="card" style={{ borderColor: "var(--amber)" }}>
        <h2
          style={{ fontSize: "16px", fontWeight: "600", marginBottom: "8px" }}
        >
          Soft Delete (Archive)
        </h2>
        <p style={{ color: "var(--text-muted)", marginBottom: "16px" }}>
          Hides all messages and inquiries from the portal. Data remains in the
          database and can be recovered.
        </p>
        <div className="row">
          <button className="secondary" onClick={softDelete} disabled={loading}>
            Archive All
          </button>
          <button className="secondary" onClick={recover} disabled={loading}>
            Recover Archived
          </button>
        </div>
      </div>

      <div
        className="card"
        style={{ borderColor: "var(--red)", marginTop: "16px" }}
      >
        <h2
          style={{
            fontSize: "16px",
            fontWeight: "600",
            marginBottom: "8px",
            color: "var(--red)",
          }}
        >
          Hard Delete (Permanent)
        </h2>
        <p style={{ color: "var(--text-muted)", marginBottom: "16px" }}>
          Permanently deletes ALL messages, inquiries, and events. A
          confirmation code will be emailed to the configured admin mail and
          must be entered below.
          <br />
          <strong>Team roster, settings, and phrases are preserved.</strong>
        </p>

        {!otpSent ? (
          <button className="danger" onClick={requestOtp} disabled={loading}>
            Request OTP
          </button>
        ) : (
          <div className="col" style={{ gap: "12px" }}>
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "6px",
                  fontSize: "13px",
                  fontWeight: "500",
                }}
              >
                Enter OTP Code
              </label>
              <input
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="6-digit code"
                style={{ maxWidth: "200px" }}
              />
            </div>
            <div className="row">
              <button
                className="danger"
                onClick={confirmHardDelete}
                disabled={loading || !otp}
              >
                Confirm Hard Delete
              </button>
              <button className="secondary" onClick={() => setOtpSent(false)}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="card" style={{ padding: 0, marginTop: "20px" }}>
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <h2 style={{ fontSize: "16px", fontWeight: "600" }}>
            🗑 Deleted Inquiries (audit log)
          </h2>
        </div>
        {loadingDeleted ? (
          <p style={{ padding: "20px", color: "var(--text-muted)" }}>
            Loading...
          </p>
        ) : deleted.length === 0 ? (
          <p style={{ padding: "20px", color: "var(--text-muted)" }}>
            No deleted inquiries.
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Requester</th>
                  <th>Lane</th>
                  <th>Deleted At</th>
                  <th>Deleted By</th>
                  <th>Reason</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {deleted.map((d) => (
                  <tr key={d.id}>
                    <td>#{d.id}</td>
                    <td>{d.requester}</td>
                    <td
                      style={{
                        maxWidth: "220px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={d.lane}
                    >
                      {d.lane}
                    </td>
                    <td>
                      {d.deleted_at
                        ? new Date(d.deleted_at).toLocaleString("en-IN", {
                            timeZone: "Asia/Kolkata",
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: false,
                          })
                        : "-"}
                    </td>
                    <td>{d.deleted_by || "-"}</td>
                    <td
                      style={{
                        maxWidth: "260px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={d.delete_reason}
                    >
                      {d.delete_reason}
                    </td>
                    <td>
                      <button
                        className="small secondary"
                        onClick={() => restore(d.id)}
                      >
                        ♻️ Restore
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
