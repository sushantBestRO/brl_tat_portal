


// import { useState, useEffect } from "react";
// import api from "../api";

// // ─── Click-to-Call popup (Runo) ───
// //
// // FLOW (coordinator → pricer):
// //   1. YOUR phone rings first        → your number from Settings (caller_phone)
// //   2. you pick up → Runo connects   → the PRICER's number (from the team list)
// //
// // So in the Runo request:
// //   assignedTo            = YOUR number   (rings first)
// //   customer.phoneNumber  = PRICER number (the person actually called)
// //
// // Props:
// //   open        boolean
// //   onClose     fn
// //   inquiry     the inquiry (uses .id, .requester, .assigned_to, .assigned_to_key)
// //   callerPhone your number from Settings (e.g. "+919594964196")
// //   team        pricing team array — [{ name, phone|key|phoneNumber }]
// //   showToast   fn(message, type)
// //   onConnected fn(result) — optional, to refresh lists
// export default function CallModal({
//   open,
//   onClose,
//   inquiry,
//   callerPhone,
//   team = [],
//   showToast,
//   onConnected,
// }) {
//   const [pricerPhone, setPricerPhone] = useState(""); // the person being CALLED
//   const [pricerName, setPricerName] = useState("");
//   const [myPhone, setMyPhone] = useState(""); // your number — rings first
//   const [calling, setCalling] = useState(false);

//   // ─── helpers ───
//   const phoneOf = (obj) =>
//     obj?.phone || obj?.phoneNumber || obj?.key || obj?.whatsappNumber || "";
//   const digits = (p) => String(p || "").replace(/\D/g, "");
//   const pretty = (p) => {
//     const d = digits(p);
//     if (!d) return "";
//     const ten = d.length > 10 ? d.slice(-10) : d;
//     return `+91 ${ten.slice(0, 5)} ${ten.slice(5)}`;
//   };

//   // ─── seed the fields whenever the modal opens ───
//   useEffect(() => {
//     if (!open) return;

//     // YOUR number = the one set in Settings (rings first)
//     setMyPhone(digits(callerPhone || ""));

//     // PRICER = the inquiry's assignee; else the first team member with a number
//     const assigneeNum = digits(inquiry?.assigned_to_key || "");
//     const firstTeamNum = team.map((m) => digits(phoneOf(m))).find(Boolean) || "";
//     const target = assigneeNum || firstTeamNum;

//     setPricerPhone(target);
//     const match = team.find((m) => digits(phoneOf(m)) === target);
//     setPricerName(inquiry?.assigned_to || match?.name || "");
//   }, [open, inquiry, callerPhone, team]);

//   if (!open) return null;

//   const connect = async () => {
//     if (!digits(pricerPhone)) {
//       showToast?.("⚠️ Pricer number is missing — add it in Settings → Team", "warning");
//       return;
//     }
//     if (!digits(myPhone)) {
//       showToast?.("⚠️ Set your calling number in Settings → Integrations", "warning");
//       return;
//     }
//     setCalling(true);
//     try {
//       const res = await api.post("/calls/connect", {
//         inquiryId: inquiry?.id,
//         // the PRICER is the one being dialled
//         customerPhone: digits(pricerPhone),
//         customerName: pricerName || "Pricer",
//         // YOUR number rings first
//         agentPhone: digits(myPhone),
//       });
//       showToast?.("📞 Calling the pricer — your phone will ring first", "success");
//       onConnected?.(res.data);
//       onClose?.();
//     } catch (err) {
//       showToast?.(
//         err.response?.data?.message || "Call failed — check Runo settings",
//         "error"
//       );
//     } finally {
//       setCalling(false);
//     }
//   };

//   return (
//     <div
//       onClick={onClose}
//       style={{
//         position: "fixed",
//         inset: 0,
//         background: "rgba(0,0,0,0.5)",
//         display: "flex",
//         justifyContent: "center",
//         alignItems: "center",
//         zIndex: 1600,
//       }}
//     >
//       <div
//         onClick={(e) => e.stopPropagation()}
//         style={{
//           background: "var(--card-bg, #fff)",
//           borderRadius: "10px",
//           padding: "22px",
//           width: "420px",
//           maxWidth: "92vw",
//           boxShadow: "0 10px 40px rgba(0,0,0,0.25)",
//         }}
//       >
//         <h3 style={{ margin: "0 0 4px", fontSize: "17px", fontWeight: 700 }}>
//           📞 Call Pricer
//           {inquiry?.id ? ` — Inquiry #${inquiry.id}` : ""}
//         </h3>
//         <p style={{ margin: "0 0 16px", fontSize: "12px", color: "var(--text-muted)" }}>
//           {inquiry?.requester ? `Customer (requester): ${inquiry.requester}` : ""}
//           {inquiry?.lane ? ` · ${inquiry.lane}` : ""}
//         </p>

//         {/* ─── Who is being called: the pricer ─── */}
//         <label style={{ fontSize: "13px", fontWeight: 600 }}>
//           Call to — pricer (the call connects here)
//         </label>
//         <select
//           value={pricerPhone}
//           onChange={(e) => {
//             const num = e.target.value;
//             setPricerPhone(num);
//             const match = team.find((m) => digits(phoneOf(m)) === digits(num));
//             setPricerName(match?.name || "");
//           }}
//           style={{
//             width: "100%",
//             padding: "9px",
//             margin: "6px 0 14px",
//             borderRadius: "6px",
//             border: "1px solid var(--border)",
//             boxSizing: "border-box",
//           }}
//         >
//           {team.length === 0 && <option value="">No team members — add them in Settings</option>}
//           {team.map((m, i) => {
//             const num = digits(phoneOf(m));
//             if (!num) return null;
//             return (
//               <option key={i} value={num}>
//                 {m.name || num} ({pretty(num)})
//               </option>
//             );
//           })}
//         </select>

//         {/* ─── Your number: rings first ─── */}
//         <label style={{ fontSize: "13px", fontWeight: 600 }}>
//           Your number (rings first)
//         </label>
//         <input
//           value={myPhone}
//           onChange={(e) => setMyPhone(e.target.value)}
//           placeholder="+919594964196"
//           style={{
//             width: "100%",
//             padding: "9px",
//             margin: "6px 0 14px",
//             borderRadius: "6px",
//             border: "1px solid var(--border)",
//             boxSizing: "border-box",
//           }}
//         />
//         <p style={{ margin: "-8px 0 14px", fontSize: "11px", color: "var(--text-muted)" }}>
//           Default comes from Settings → Integrations → Calling Number.
//         </p>

//         {/* ─── Info line ─── */}
//         <div
//           style={{
//             fontSize: "13px",
//             padding: "10px",
//             background: "var(--light-gray, #f5f5f5)",
//             borderRadius: "6px",
//             marginBottom: "18px",
//           }}
//         >
//           Your phone rings first — call connects on{" "}
//           <strong>{pretty(pricerPhone) || "—"}</strong>
//           {pricerName ? ` (${pricerName})` : ""}
//         </div>

//         {/* ─── Actions ─── */}
//         <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
//           <button onClick={onClose} disabled={calling}>
//             Cancel
//           </button>
//           <button
//             className="small primary"
//             onClick={connect}
//             disabled={calling}
//             style={{ minWidth: "120px" }}
//           >
//             {calling ? "Connecting..." : "📞 Connect"}
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }









import { useState, useEffect } from "react";
import api from "../api";

// ─── Click-to-Call popup (Runo) ───
//
// FLOW (coordinator → pricer):
//   1. YOUR phone rings first        → your number from Settings (caller_phone)
//   2. you pick up → Runo connects   → the PRICER's number (from the team list)
//
// So in the Runo request:
//   assignedTo            = YOUR number   (rings first)
//   customer.phoneNumber  = PRICER number (the person actually called)
//
// Props:
//   open        boolean
//   onClose     fn
//   inquiry     the inquiry (uses .id, .requester, .assigned_to, .assigned_to_key)
//   callerPhone your number from Settings (e.g. "+919594964196")
//   team        pricing team array — [{ name, phone|key|phoneNumber }]
//   showToast   fn(message, type)
//   onConnected fn(result) — optional, to refresh lists
export default function CallModal({
  open,
  onClose,
  inquiry,
  callerPhone,
  team = [],
  showToast,
  onConnected,
}) {
  const [pricerPhone, setPricerPhone] = useState(""); // the person being CALLED
  const [pricerName, setPricerName] = useState("");
  const [myPhone, setMyPhone] = useState(""); // your number — rings first
  const [calling, setCalling] = useState(false);

  // ─── helpers ───
  const phoneOf = (obj) =>
    obj?.phone || obj?.phoneNumber || obj?.key || obj?.whatsappNumber || "";
  const digits = (p) => String(p || "").replace(/\D/g, "");
  const pretty = (p) => {
    const d = digits(p);
    if (!d) return "";
    const ten = d.length > 10 ? d.slice(-10) : d;
    return `+91 ${ten.slice(0, 5)} ${ten.slice(5)}`;
  };

  // ─── seed the fields whenever the modal opens ───
  useEffect(() => {
    if (!open) return;

    // YOUR number = the one set in Settings (rings first)
    setMyPhone(digits(callerPhone || ""));

    // PRICER = the inquiry's assignee; else the first team member with a number
    const assigneeNum = digits(inquiry?.assigned_to_key || "");
    const firstTeamNum = team.map((m) => digits(phoneOf(m))).find(Boolean) || "";
    const target = assigneeNum || firstTeamNum;

    setPricerPhone(target);
    const match = team.find((m) => digits(phoneOf(m)) === target);
    setPricerName(inquiry?.assigned_to || match?.name || "");
  }, [open, inquiry, callerPhone, team]);

  if (!open) return null;

  const connect = async () => {
    if (!digits(pricerPhone)) {
      showToast?.("⚠️ Pricer number is missing — add it in Settings → Team", "warning");
      return;
    }
    if (!digits(myPhone)) {
      showToast?.("⚠️ Set your calling number in Settings → Integrations", "warning");
      return;
    }
    setCalling(true);
    try {
      const res = await api.post("/calls/connect", {
        inquiryId: inquiry?.id,
        // the PRICER is the one being dialled
        customerPhone: digits(pricerPhone),
        customerName: pricerName || "Pricer",
        // YOUR number rings first
        agentPhone: digits(myPhone),
      });
      showToast?.("📞 Calling the pricer — your phone will ring first", "success");
      onConnected?.(res.data);
      onClose?.();
    } catch (err) {
      showToast?.(
        err.response?.data?.message || "Call failed — check Runo settings",
        "error"
      );
    } finally {
      setCalling(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1600,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--card-bg, #fff)",
          borderRadius: "10px",
          padding: "22px",
          width: "420px",
          maxWidth: "92vw",
          boxShadow: "0 10px 40px rgba(0,0,0,0.25)",
        }}
      >
        <h3 style={{ margin: "0 0 4px", fontSize: "17px", fontWeight: 700 }}>
          📞 Call Pricer
          {inquiry?.id ? ` — Inquiry #${inquiry.id}` : ""}
        </h3>
        <p style={{ margin: "0 0 16px", fontSize: "12px", color: "var(--text-muted)" }}>
          {inquiry?.requester ? `Customer (requester): ${inquiry.requester}` : ""}
          {inquiry?.lane ? ` · ${inquiry.lane}` : ""}
        </p>

        {/* ─── Who is being called: pricer OR any typed number ─── */}
        <label style={{ fontSize: "13px", fontWeight: 600 }}>
          Call to — pricer (the call connects here)
        </label>
        <input
          list="pricer-options"
          value={pricerPhone}
          onChange={(e) => {
            const v = e.target.value;
            setPricerPhone(v);
            // if the typed number matches a team member, show their name
            const match = team.find(
              (m) => digits(phoneOf(m)) === digits(v)
            );
            setPricerName(match?.name || "");
          }}
          placeholder="Type any number, e.g. 9594963468 — or pick from the list"
          style={{
            width: "100%",
            padding: "9px",
            margin: "6px 0 6px",
            borderRadius: "6px",
            border: "1px solid var(--border)",
            boxSizing: "border-box",
          }}
        />
        {/* team members appear as suggestions while typing */}
        <datalist id="pricer-options">
          {team.map((m, i) => {
            const num = digits(phoneOf(m));
            if (!num) return null;
            return (
              <option key={i} value={num} label={`${m.name || num} (${pretty(num)})`} />
            );
          })}
        </datalist>
        <p style={{ margin: "0 0 14px", fontSize: "11px", color: "var(--text-muted)" }}>
          {team.length > 0
            ? "Type any number, or pick a team member from the suggestions."
            : "No team members added yet — type the number manually."}
        </p>

        {/* ─── Your number: rings first ─── */}
        <label style={{ fontSize: "13px", fontWeight: 600 }}>
          Your number (rings first)
        </label>
        <input
          value={myPhone}
          onChange={(e) => setMyPhone(e.target.value)}
          placeholder="+919594964196"
          style={{
            width: "100%",
            padding: "9px",
            margin: "6px 0 14px",
            borderRadius: "6px",
            border: "1px solid var(--border)",
            boxSizing: "border-box",
          }}
        />
        <p style={{ margin: "-8px 0 14px", fontSize: "11px", color: "var(--text-muted)" }}>
          Default comes from Settings → Integrations → Calling Number.
        </p>

        {/* ─── Info line ─── */}
        <div
          style={{
            fontSize: "13px",
            padding: "10px",
            background: "var(--light-gray, #f5f5f5)",
            borderRadius: "6px",
            marginBottom: "18px",
          }}
        >
          Your phone rings first — call connects on{" "}
          <strong>{pretty(pricerPhone) || "—"}</strong>
          {pricerName ? ` (${pricerName})` : ""}
        </div>

        {/* ─── Actions ─── */}
        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <button onClick={onClose} disabled={calling}>
            Cancel
          </button>
          <button
            className="small primary"
            onClick={connect}
            disabled={calling}
            style={{ minWidth: "120px" }}
          >
            {calling ? "Connecting..." : "📞 Connect"}
          </button>
        </div>
      </div>
    </div>
  );
}
