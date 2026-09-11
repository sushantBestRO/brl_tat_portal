import { useState, useEffect } from "react";
import api from "../api";

export default function ConnectionStatus() {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    const check = async () => {
      try {
        const res = await api.get("/status/maytapi");
        setStatus(res.data);
      } catch {
        setStatus({
          connected: false,
          lastChecked: null,
          lastError: "Cannot reach backend",
        });
      }
    };

    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, []);

  if (!status) return null;

  const lastChecked = status.lastChecked
    ? new Date(status.lastChecked).toLocaleTimeString("en-IN")
    : "Never";

  return (
    <>
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          padding: "4px 12px",
          borderRadius: "20px",
          background: status.connected
            ? "rgba(34, 197, 94, 0.1)"
            : "rgba(239, 68, 68, 0.1)",
          fontSize: "12px",
          fontWeight: "600",
        }}
      >
        <span
          style={{
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            background: status.connected ? "#22c55e" : "#ef4444",
            display: "inline-block",
            animation: status.connected ? "pulse-green 1.5s infinite" : "none",
          }}
        />
        {status.connected ? "WhatsApp Connected" : "WhatsApp Disconnected"}
        <span
          style={{
            color: "var(--text-muted)",
            fontWeight: "400",
            marginLeft: "4px",
          }}
        >
          ({lastChecked})
        </span>
      </div>

      <style>{`
        @keyframes pulse-green {
          0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.5); }
          70% { box-shadow: 0 0 0 6px rgba(34, 197, 94, 0); }
          100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
        }
      `}</style>
    </>
  );
}
