import { useState, useEffect, useCallback } from "react"; // ← must be at top
import api from "../api";
// however you import your axios instance

// ─── NotesSection: placed at TOP LEVEL, before the main component ───
export default function NotesSection({ inquiry, api }) {
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadNotes = useCallback(async () => {
    if (!inquiry?.id) return;
    setLoading(true);
    try {
      const res = await api.get(`/inquiries/${inquiry.id}/notes`);
      setNotes(res.data);
    } catch {
      setNotes([]);
    } finally {
      setLoading(false);
    }
  }, [inquiry?.id, api]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  const addNote = async () => {
    const clean = newNote.trim();
    if (!clean) return;
    setSaving(true);
    try {
      await api.post(`/inquiries/${inquiry.id}/note`, { note: clean });
      setNewNote("");
      await loadNotes();
    } catch {
      alert("Failed to save note");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ marginTop: 16 }}>
      <label style={{ fontWeight: 600 }}>📝 Coordinator Notes</label>
      <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
        <input
          type="text"
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addNote()}
          placeholder="e.g. Called Shashikant — not picking up"
          style={{ flex: 1, padding: 8 }}
        />
        <button
          className="primary"
          onClick={addNote}
          disabled={saving || !newNote.trim()}
        >
          {saving ? "Saving..." : "Add Note"}
        </button>
      </div>
      {loading ? (
        <p style={{ fontSize: 12, color: "#888", marginTop: 8 }}>
          Loading notes...
        </p>
      ) : notes.length > 0 ? (
        <ul style={{ marginTop: 10, paddingLeft: 18, fontSize: 13 }}>
          {notes.map((n) => (
            <li key={n.id} style={{ marginBottom: 4 }}>
              <span style={{ color: "#888" }}>
                {new Date(n.at).toLocaleString("en-IN", {
                  day: "2-digit",
                  month: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                })}
              </span>{" "}
              — {n.detail}
            </li>
          ))}
        </ul>
      ) : (
        <p style={{ fontSize: 12, color: "#888", marginTop: 8 }}>
          No notes yet — add the first follow-up note above.
        </p>
      )}
    </div>
  );
}
