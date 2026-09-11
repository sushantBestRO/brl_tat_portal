import { useState, useEffect } from "react";
import api from "../api";

// ─── Modal for adding/editing a pricing team member ───
export default function TeamMemberModal({ member, onClose, onSaved }) {
  const isEdit = !!member; // If member is passed, we're editing

  const [form, setForm] = useState({
    phone: "",
    name: "",
    email: "",
    role: "",
    assign_order: "00",
    active: true,
    is_default: false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Pre-fill form if editing
  useEffect(() => {
    if (member) {
      setForm({
        phone: member.phone || "",
        name: member.name || "",
        email: member.email || "",
        role: member.role || "",
        assign_order: member.assign_order || 99,
        active: member.active !== false,
        is_default: member.is_default || false,
      });
    }
  }, [member]);

  const handleChange = (field, value) => {
    setForm({ ...form, [field]: value });
  };

  const handleSubmit = async () => {
    if (!form.phone.trim()) {
      setError("Phone number is required");
      return;
    }
    if (!form.name.trim()) {
      setError("Name is required");
      return;
    }

    setSaving(true);
    setError("");
    try {
      if (isEdit) {
        await api.put(`/settings/team/${member.id}`, form);
      } else {
        await api.post("/settings/team", form);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to save. Check if phone already exists.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
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
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          width: "100%",
          maxWidth: "480px",
          maxHeight: "85vh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="between" style={{ marginBottom: "16px" }}>
          <h2 style={{ fontSize: "18px", fontWeight: "700" }}>
            {isEdit ? "Edit Team Member" : "Add Team Member"}
          </h2>
          <button className="small secondary" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="col" style={{ gap: "12px" }}>
          <div>
            <label style={{ fontSize: "12px", color: "var(--text-muted)" }}>
              Phone Number *
            </label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
              placeholder="e.g. 919594963449"
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: "4px",
                border: "1px solid var(--border)",
                fontSize: "14px",
                marginTop: "4px",
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: "12px", color: "var(--text-muted)" }}>
              Name *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="e.g. Kamlesh Yogi"
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: "4px",
                border: "1px solid var(--border)",
                fontSize: "14px",
                marginTop: "4px",
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: "12px", color: "var(--text-muted)" }}>
              Email
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => handleChange("email", e.target.value)}
              placeholder="e.g. kamlesh@brl.com"
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: "4px",
                border: "1px solid var(--border)",
                fontSize: "14px",
                marginTop: "4px",
              }}
            />
            <p
              style={{
                fontSize: "11px",
                color: "var(--text-muted)",
                marginTop: "4px",
              }}
            >
              Email is used to send email reminders directly to this team
              member.
            </p>
          </div>

          {/* Role */}
          <div>
            <label style={{ fontSize: "12px", color: "var(--text-muted)" }}>
              Role
            </label>
            <input
              type="text"
              value={form.role}
              onChange={(e) => handleChange("role", e.target.value)}
              placeholder="e.g. Pricing Executive, Senior Pricer"
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: "4px",
                border: "1px solid var(--border)",
                fontSize: "14px",
                marginTop: "4px",
              }}
            />
          </div>

          {/* Aliases */}
          <div>
            <label style={{ fontSize: "12px", color: "var(--text-muted)" }}>
              Aliases (optional)
            </label>
            <input
              type="text"
              value={form.aliases}
              onChange={(e) => handleChange("aliases", e.target.value)}
              placeholder="e.g. 919876543210, 919876543211"
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: "4px",
                border: "1px solid var(--border)",
                fontSize: "14px",
                marginTop: "4px",
              }}
            />
            <p
              style={{
                fontSize: "11px",
                color: "var(--text-muted)",
                marginTop: "4px",
              }}
            >
              Add additional phone numbers if this person messages from multiple
              numbers. Separate with commas.
            </p>
          </div>

          <div>
            <label style={{ fontSize: "12px", color: "var(--text-muted)" }}>
              Assign Order
            </label>
            <input
              type="number"
              value={form.assign_order}
              onChange={(e) =>
                handleChange("assign_order", Number(e.target.value))
              }
              placeholder="99"
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: "4px",
                border: "1px solid var(--border)",
                fontSize: "14px",
                marginTop: "4px",
              }}
            />
            <p
              style={{
                fontSize: "11px",
                color: "var(--text-muted)",
                marginTop: "4px",
              }}
            >
              Lower number = higher priority when loads are tied.
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => handleChange("active", e.target.checked)}
              style={{ width: "18px", height: "18px" }}
            />
            <label style={{ fontSize: "14px" }}>
              Active (inactive members are skipped in auto-assignment)
            </label>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <input
              type="checkbox"
              checked={form.is_default}
              onChange={(e) => handleChange("is_default", e.target.checked)}
              style={{ width: "18px", height: "18px" }}
            />
            <label style={{ fontSize: "14px" }}>
              Default (preferred pick when loads are tied)
            </label>
          </div>

          {error && (
            <div style={{ color: "var(--danger)", fontSize: "13px" }}>
              {error}
            </div>
          )}

          <div className="row" style={{ gap: "8px", marginTop: "8px" }}>
            <button
              className="primary"
              onClick={handleSubmit}
              disabled={saving}
              style={{ padding: "8px 20px" }}
            >
              {saving ? "Saving..." : isEdit ? "Update Member" : "Add Member"}
            </button>
            <button
              className="secondary"
              onClick={onClose}
              style={{ padding: "8px 20px" }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
