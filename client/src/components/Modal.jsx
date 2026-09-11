import React from "react";

/**
 * Reusable custom Modal component.
 * Replaces window.confirm() and window.prompt() with a clean React UI.
 *
 * Usage:
 * <Modal
 *   title="Broadcast to All Pricers"
 *   message="Send WhatsApp + Email to everyone?"
 *   confirmText="Send"
 *   cancelText="Cancel"
 *   onConfirm={() => { ... }}
 *   onCancel={() => setShow(false)}
 * />
 *
 * For prompt-style (input field):
 * <Modal
 *   title="Enter Rate"
 *   input={{ placeholder: "₹60000", defaultValue: "" }}
 *   confirmText="Quote"
 *   onConfirm={(value) => { ... }}
 *   onCancel={() => setShow(false)}
 * />
 */
export default function Modal({
  title,
  message,
  input = null, // { placeholder, defaultValue, label }
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  danger = false,
}) {
  const [inputValue, setInputValue] = React.useState(input?.defaultValue || "");

  const handleConfirm = () => {
    if (input) {
      onConfirm(inputValue);
    } else {
      onConfirm();
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
        zIndex: 1500,
      }}
      onClick={onCancel}
    >
      <div
        className="card"
        style={{
          width: "100%",
          maxWidth: "420px",
          padding: "24px",
          boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3
          style={{ fontSize: "16px", fontWeight: "700", marginBottom: "12px" }}
        >
          {title}
        </h3>

        {message && (
          <p
            style={{
              fontSize: "14px",
              color: "var(--text-muted)",
              marginBottom: "16px",
            }}
          >
            {message}
          </p>
        )}

        {input && (
          <div style={{ marginBottom: "16px" }}>
            {input.label && (
              <label
                style={{
                  fontSize: "12px",
                  color: "var(--text-muted)",
                  display: "block",
                  marginBottom: "4px",
                }}
              >
                {input.label}
              </label>
            )}
            <input
              type="text"
              autoFocus
              placeholder={input.placeholder || ""}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleConfirm();
              }}
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: "4px",
                border: "1px solid var(--border)",
                background: "var(--bg, #fff)",
                fontSize: "14px",
              }}
            />
          </div>
        )}

        <div
          style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}
        >
          <button className="small secondary" onClick={onCancel}>
            {cancelText}
          </button>
          <button
            className={`small ${danger ? "danger" : "primary"}`}
            onClick={handleConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
