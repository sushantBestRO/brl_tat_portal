// import { useState, useEffect, use } from "react";
// import api from "../api";
// import { Pointer } from "lucide-react";

// export default function Inquiries() {
//   const [inquiries, setInquiries] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState("");
//   const [filter, setFilter] = useState("");
//   const [days, setDays] = useState(7);
//   const [selectedInquiry, setSelectedInquiry] = useState(null);
//   const [detail, setDetail] = useState(null);
//   const [pricingTeam, setPricingTeam] = useState([]);
//   const [toast, setToast] = useState(null);

//   // Vechicle
//   // ─── Helper: extract vehicle type (container spec + weight from message) ───
//   function vehicleTypeOf(body) {
//     if (!body) return "";

//     const SPEC_KEYWORDS = new Set([
//       "MT",
//       "KG",
//       "HC",
//       "HQ",
//       "SXL",
//       "MXL",
//       "GP",
//       "OT",
//       "FR",
//       "RT",
//       "DC",
//       "C",
//       "MT+C",
//       "+C",
//       "WEIGHT",
//       "WT",
//       "WT+C",
//       "TON",
//     ]);

//     const lines = body.split("\n");
//     for (const line of lines) {
//       const trimmed = line.trim();
//       if (!trimmed) continue;

//       const specStartMatch = trimmed.match(
//         /\d+\s*[xX]\s*\d+'?|\d+'\s*(?:HC|HQ|SXL|MXL)|\d+'\s*[xX]\s*\d+/,
//       );
//       if (!specStartMatch || specStartMatch.index === undefined) continue;

//       let segment = trimmed.slice(specStartMatch.index);

//       const routeRe =
//         /\s+(?:to|from)\s+|\s+empty\s*[,;]?\s*back\b|\s+loaded\s*back\b/i;
//       const routeMatch = segment.match(routeRe);
//       if (routeMatch && routeMatch.index !== undefined) {
//         segment = segment.slice(0, routeMatch.index);
//       }

//       const tokens = segment.trim().split(/\s+/);
//       let lastSpecIdx = -1;
//       for (let i = 0; i < tokens.length; i++) {
//         const tok = tokens[i];
//         const upper = tok.replace(/[^A-Z+]/g, "").toUpperCase();
//         const hasDigit = /\d/.test(tok);
//         if (SPEC_KEYWORDS.has(upper) || hasDigit) {
//           lastSpecIdx = i;
//         }
//       }

//       if (lastSpecIdx >= 0) {
//         segment = tokens.slice(0, lastSpecIdx + 1).join(" ");
//       } else {
//         segment = "";
//       }

//       segment = segment.replace(/[,;\s]+$/, "").trim();

//       if (segment.length >= 3) {
//         return segment.slice(0, 120);
//       }
//     }
//     return "";
//   }

//   const showToast = (message, type = "success") => {
//     setToast({ message, type });
//     setTimeout(() => setToast(null), 3000);
//   };

//   const fetchInquiries = async () => {
//     setLoading(true);
//     try {
//       const res = await api.get("/inquiries", {
//         params: { status: filter, days },
//       });
//       setInquiries(res.data);
//       setError("");
//     } catch (err) {
//       setError("Failed to load inquiries.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const fetchDetail = async (id) => {
//     if (!id) return; // ← Add this guard
//     try {
//       const res = await api.get(`/inquiries/${id}`);
//       setDetail(res.data);
//       setSelectedInquiry(id);
//     } catch (err) {
//       setError("Failed to load inquiry detail.");
//     }
//   };

//   useEffect(() => {
//     fetchInquiries();
//     api
//       .get("/pricing-team")
//       .then((res) => setPricingTeam(res.data))
//       .catch(() => {});
//   }, [filter, days]);

//   useEffect(() => {
//     const interval = setInterval(() => {
//       fetchInquiries();
//     }, 15000);
//     return () => clearInterval(interval);
//   }, [filter, days]);

//   const handleAction = async (action, id, payload = {}) => {
//     try {
//       let endpoint = "";
//       switch (action) {
//         case "quote":
//           endpoint = `/inquiries/${id}/quote`;
//           break;
//         case "call":
//           endpoint = `/inquiries/${id}/call`;
//           break;
//         case "reassign":
//           endpoint = `/inquiries/${id}/reassign`;
//           break;
//         case "remind":
//           endpoint = `/inquiries/${id}/remind`;
//           break;
//         case "close":
//           endpoint = `/inquiries/${id}/close`;
//           break;
//         case "broadcast":
//           endpoint = `/inquiries/${id}/broadcast`;
//           break;
//         default:
//           return;
//       }
//       await api.post(endpoint, payload);
//       await fetchInquiries();
//       if (selectedInquiry === id) await fetchDetail(id);
//     } catch (err) {
//       setError(
//         `Action failed: ${err.response?.data?.message || "Unknown error"}`,
//       );
//     }
//   };

//   if (loading) return <div className="card">Loading inquiries...</div>;
//   if (error)
//     return (
//       <div className="card" style={{ color: "var(--danger)" }}>
//         {error}
//       </div>
//     );

//   return (
//     <div>
//       <h1 className="page-title">Inquiries</h1>

//       {/* Filter Bar */}
//       <div className="card" style={{ padding: "16px 20px" }}>
//         <div className="row" style={{ flexWrap: "wrap" }}>
//           <div className="col" style={{ flex: 1, minWidth: "150px" }}>
//             <label style={{ fontSize: "12px", color: "var(--text-muted)" }}>
//               Status
//             </label>
//             <select value={filter} onChange={(e) => setFilter(e.target.value)}>
//               <option value="">All</option>
//               <option value="OPEN">Open</option>
//               <option value="QUOTED">Quoted</option>
//               <option value="CLOSED_WON">Won</option>
//               <option value="CLOSED_LOST">Lost</option>
//               <option value="WITHDRAWN">Withdrawn</option>
//             </select>
//           </div>
//           <div className="col" style={{ flex: 1, minWidth: "150px" }}>
//             <label style={{ fontSize: "12px", color: "var(--text-muted)" }}>
//               Time Window
//             </label>
//             <select
//               value={days}
//               onChange={(e) => setDays(Number(e.target.value))}
//             >
//               <option value={7}>Last 7 days</option>
//               <option value={30}>Last 30 days</option>
//               <option value={90}>Last 90 days</option>
//               <option value={400}>All time</option>
//             </select>
//           </div>
//           <button onClick={fetchInquiries} className="secondary">
//             Refresh
//           </button>
//           <a href="/api/export.csv" target="_blank" rel="noreferrer">
//             <button className="secondary" style={{ textDecoration: "none" }}>
//               Export CSV
//             </button>
//           </a>
//         </div>
//       </div>

//       {/* Inquiries Table */}
//       <div className="card" style={{ padding: 0, marginTop: "16px" }}>
//         {inquiries.length === 0 ? (
//           <p style={{ padding: "20px", color: "var(--text-muted)" }}>
//             No inquiries found for this filter.
//           </p>
//         ) : (
//           <div style={{ overflowX: "auto" }}>
//             <table>
//               <thead>
//                 <tr>
//                   <th>ID</th>
//                   <th>Requester</th>
//                   <th>Lane</th>
//                   <th>Vehicle Type</th>
//                   <th>Posted At</th>
//                   <th>Status</th>
//                   <th>Assigned To</th>
//                   <th>Age/TAT</th>
//                   <th>Actions</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {inquiries.map((inq) => {
//                   const isRed = inq.status === "OPEN" && inq.age_minutes >= 120;
//                   const isAmber =
//                     inq.status === "OPEN" && inq.age_minutes >= 60;

//                   return (
//                     <tr key={inq.id}>
//                       <td>#{inq.id}</td>
//                       <td>{inq.requester || "Unknown"}</td>
//                       <td
//                         style={{
//                           maxWidth: "280px",
//                           overflow: "hidden",
//                           textOverflow: "ellipsis",
//                           whiteSpace: "nowrap",
//                           cursor: "pointer",
//                         }}
//                         title={inq.lane}
//                         onClick={() => fetchDetail(inq.id)}
//                       >
//                         {inq.lane}
//                       </td>
//                       <td
//                         style={{
//                           maxWidth: "280px",
//                           overflow: "hidden",
//                           textOverflow: "ellipsis",
//                           whiteSpace: "nowrap",
//                           cursor: "pointer",
//                         }}
//                         title={inq.vehicle_type}
//                         onClick={() => fetchDetail(inq.id)}
//                       >
//                         {inq.vehicle_type || "-"}
//                       </td>
//                       <td>
//                         {inq.posted_at
//                           ? new Date(inq.posted_at).toLocaleString("en-IN", {
//                               timeZone: "Asia/Kolkata",
//                               day: "2-digit",
//                               month: "2-digit",
//                               year: "numeric",
//                               hour: "2-digit",
//                               minute: "2-digit",
//                             })
//                           : "-"}
//                       </td>
//                       <td>
//                         <span
//                           className={`badge badge-${inq.status.toLowerCase().replace("_", "-")}`}
//                         >
//                           {inq.status.replace("_", " ")}
//                         </span>
//                       </td>
//                       <td>
//                         {/* <select
//   value={inq.assigned_to_key || ''}
//   onChange={(e) => {
//     if (e.target.value) handleAction('reassign', inq.id, { assignee_key: e.target.value });
//   }}
//   style={{
//     padding: '4px 8px',
//     borderRadius: '4px',
//     border: '1px solid var(--border)',
//     background: 'var(--bg, #fff)',
//     fontSize: '13px',
//     cursor: 'pointer',
//   }}
// >
//   <option value="" disabled>Select...</option>
//   {pricingTeam.map((p) => (
//     <option key={p.phone} value={p.phone}>{p.name}</option>
//   ))}
// </select> */}
//                         {/* <select
//                           value={inq.assigned_to_key || ""}
//                            onChange={(e) => {
//                             const value = e.target.value;

//                             handleAction("reassign", inq.id, {
//                               assignee_key: value === "NONE" ? null : value,
//                             });
//                           }}
//                           style={{
//                             padding: "4px 8px",
//                             borderRadius: "4px",
//                             border: "1px solid var(--border)",
//                             background: "var(--bg, #fff)",
//                             fontSize: "13px",
//                             cursor: "pointer",
//                           }}
//                         >
//                           <option value="" disabled>
//                             Select...
//                           </option>

//                           <option value="NONE">None</option>

//                           {pricingTeam.map((p) => (
//                             <option key={p.phone} value={p.phone}>
//                               {p.name}
//                             </option>
//                           ))}
//                         </select> */}
//                         <select
//                           value={
//                             inq.assigned_to_key
//                               ? inq.assigned_to_key.replace(/^91/, "")
//                               : ""
//                           }
//                           onChange={(e) => {
//                             const value = e.target.value;

//                             handleAction("reassign", inq.id, {
//                               assignee_key: value === "NONE" ? null : value,
//                             });
//                           }}
//                           style={{
//                             padding: "4px 8px",
//                             borderRadius: "4px",
//                             border: "1px solid var(--border)",
//                             background: "var(--bg, #fff)",
//                             fontSize: "13px",
//                             cursor: "pointer",
//                           }}
//                         >
//                           <option value="" disabled>
//                             Select...
//                           </option>

//                           <option value="NONE">None</option>

//                           {pricingTeam.map((p) => (
//                             <option key={p.phone} value={p.phone}>
//                               {p.name}
//                             </option>
//                           ))}
//                         </select>
//                       </td>
//                       <td>
//                         <span
//                           style={{
//                             fontWeight: "600",
//                             color: isRed
//                               ? "var(--red)"
//                               : isAmber
//                                 ? "var(--amber)"
//                                 : "inherit",
//                           }}
//                         >
//                           {inq.status === "OPEN" ? inq.age_display : inq.tat}
//                         </span>
//                       </td>
//                       <td>
//                         <div className="row" style={{ gap: "4px" }}>
//                           <button
//                             className="small secondary"
//                             onClick={() => fetchDetail(inq.id)}
//                           >
//                             View
//                           </button>

//                           <button
//                             className="small primary"
//                             onClick={() => {
//                               if (!inq.assigned_to_key) {
//                                 showToast(
//                                   "⚠️ Please select an assignee before quoting a rate",
//                                   "warning",
//                                 );
//                                 return;
//                               }
//                               const rates = prompt(
//                                 `Enter rate for #${inq.id}:`,
//                               );
//                               if (rates)
//                                 handleAction("quote", inq.id, {
//                                   rates,
//                                   quoted_by: "coordinator",
//                                 });
//                             }}
//                           >
//                             Quote
//                           </button>

//                           <button
//                             className="small secondary"
//                             onClick={() => {
//                               const outcome = prompt(
//                                 `Enter call outcome for #${inq.id}:`,
//                               );
//                               if (outcome)
//                                 handleAction("call", inq.id, { outcome });
//                             }}
//                           >
//                             Call
//                           </button>
//                         </div>
//                       </td>
//                     </tr>
//                   );
//                 })}
//               </tbody>
//             </table>
//           </div>
//         )}
//       </div>

//       {/* Detail Modal */}
//       {detail && (
//         <div
//           style={{
//             position: "fixed",
//             top: 0,
//             left: 0,
//             right: 0,
//             bottom: 0,
//             background: "rgba(0,0,0,0.5)",
//             display: "flex",
//             justifyContent: "center",
//             alignItems: "center",
//             zIndex: 1000,
//           }}
//           onClick={() => {
//             setSelectedInquiry(null);
//             setDetail(null);
//           }}
//         >
//           <div
//             className="card"
//             style={{
//               width: "100%",
//               maxWidth: "600px",
//               maxHeight: "80vh",
//               overflowY: "auto",
//             }}
//             onClick={(e) => e.stopPropagation()}
//           >
//             <div className="between" style={{ marginBottom: "16px" }}>
//               <h2 style={{ fontSize: "18px", fontWeight: "700" }}>
//                 Inquiry #{detail.id}
//               </h2>
//               <button
//                 className="small secondary"
//                 onClick={() => {
//                   setSelectedInquiry(null);
//                   setDetail(null);
//                 }}
//               >
//                 Close
//               </button>
//             </div>

//             <div className="col" style={{ gap: "8px" }}>
//               <div>
//                 <strong>Status:</strong>{" "}
//                 <span
//                   className={`badge badge-${detail.status.toLowerCase().replace("_", "-")}`}
//                 >
//                   {detail.status.replace("_", " ")}
//                 </span>
//               </div>
//               <div>
//                 <strong>Requester:</strong> {detail.requester}
//               </div>
//               <div>
//                 <strong>Lane:</strong> {detail.lane}
//               </div>
//               <div>
//                 <strong>Vehicle Type:</strong> {detail.vehicle_type || "-"}
//               </div>
//               <div>
//                 <strong>Spec:</strong> {detail.spec || "-"}
//               </div>
//               <div>
//                 <strong>Posted:</strong>{" "}
//                 {detail.posted_at
//                   ? new Date(detail.posted_at).toLocaleString("en-IN", {
//                       timeZone: "Asia/Kolkata",
//                       day: "2-digit",
//                       month: "2-digit",
//                       year: "numeric",
//                       hour: "2-digit",
//                       minute: "2-digit",
//                     })
//                   : "-"}
//               </div>
//               <div>
//                 <strong>Assigned To:</strong> {detail.assigned_to}
//               </div>
//               <div>
//                 <strong>Age:</strong> {detail.age_minutes} min
//               </div>
//               <div>
//                 <strong>TAT:</strong> {detail.tat}
//               </div>
//               <div>
//                 <strong>Reminders:</strong> {detail.reminders}
//               </div>
//               <div>
//                 <strong>Followups:</strong> {detail.followups}
//               </div>
//               {detail.quoted_rates && (
//                 // <div>
//                 //   <strong>Rate:</strong> ₹{detail.quoted_rates}
//                 // </div>

//                 <div>
//                   <strong>Rate:</strong>{" "}
//                   {detail.previous_rates ? (
//                     <span>
//                       <span
//                         style={{
//                           textDecoration: "line-through",
//                           color: "var(--text-muted)",
//                           fontSize: "12px",
//                         }}
//                       >
//                         ₹{detail.previous_rates}
//                       </span>
//                       {" → "}
//                       <strong>₹{detail.quoted_rates}</strong>
//                     </span>
//                   ) : (
//                     <strong>₹{detail.quoted_rates}</strong>
//                   )}
//                 </div>
//               )}

//               {detail.raw_body && (
//                 <div style={{ marginTop: "10px" }}>
//                   <strong>Raw Message:</strong>
//                   <pre
//                     style={{
//                       background: "var(--light-gray)",
//                       padding: "12px",
//                       borderRadius: "6px",
//                       whiteSpace: "pre-wrap",
//                       fontSize: "12px",
//                     }}
//                   >
//                     {detail.raw_body}
//                   </pre>
//                 </div>
//               )}

//               {detail.events && detail.events.length > 0 && (
//                 <div style={{ marginTop: "10px" }}>
//                   <strong>Event Log:</strong>
//                   <div className="col" style={{ gap: "6px", marginTop: "8px" }}>
//                     {detail.events.map((ev, i) => (
//                       <div
//                         key={i}
//                         style={{
//                           fontSize: "12px",
//                           padding: "8px",
//                           background: "var(--light-gray)",
//                           borderRadius: "4px",
//                         }}
//                       >
//                         <strong>{ev.kind}</strong> — {ev.detail}
//                         <br />
//                         <span style={{ color: "var(--text-muted)" }}>
//                           {ev.at
//                             ? new Date(ev.at).toLocaleString("en-IN", {
//                                 timeZone: "Asia/Kolkata",
//                                 day: "2-digit",
//                                 month: "2-digit",
//                                 year: "numeric",
//                                 hour: "2-digit",
//                                 minute: "2-digit",
//                               })
//                             : ""}{" "}
//                           by {ev.actor}
//                         </span>
//                       </div>
//                     ))}
//                   </div>
//                 </div>
//               )}

//               {/* Action Buttons */}
//               <div
//                 className="row"
//                 style={{ marginTop: "12px", flexWrap: "wrap" }}
//               >
//                 <button
//                   className="small primary"
//                   onClick={() => {
//                     const rates = prompt(`Enter rate for #${detail.id}:`);
//                     if (rates)
//                       handleAction("quote", detail.id, {
//                         rates,
//                         quoted_by: "coordinator",
//                       });
//                   }}
//                 >
//                   Manual Quote
//                 </button>

//                 <button
//                   className="small secondary"
//                   onClick={() => {
//                     const outcome = prompt(
//                       `Enter call outcome for #${detail.id}:`,
//                     );
//                     if (outcome) handleAction("call", detail.id, { outcome });
//                   }}
//                 >
//                   Log Call
//                 </button>

//                 <button
//                   className="small secondary"
//                   onClick={() => {
//                     handleAction("remind", detail.id, { channel: "whatsapp" });
//                   }}
//                 >
//                   Send WA Reminder
//                 </button>

//                 {/* ─── Email reminder — sends to coordinator_email from settings ─── */}
//                 <button
//                   className="small secondary"
//                   onClick={() => {
//                     handleAction("remind", detail.id, { channel: "email" });
//                   }}
//                 >
//                   📧 Email Reminder
//                 </button>

//                 <button
//                   className="small danger"
//                   onClick={() => {
//                     const reason = prompt(
//                       `Close reason (won/lost/withdrawn) for #${detail.id}:`,
//                     );
//                     if (reason) handleAction("close", detail.id, { reason });
//                   }}
//                 >
//                   Close
//                 </button>
//               </div>
//             </div>
//           </div>
//         </div>
//       )}

//       {toast && (
//         <div
//           style={{
//             position: "fixed",
//             top: "20px",
//             right: "20px",
//             zIndex: 2000,
//             padding: "12px 20px",
//             borderRadius: "8px",
//             boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
//             background:
//               toast.type === "error"
//                 ? "#fee2e2"
//                 : toast.type === "warning"
//                   ? "#fef3c7"
//                   : "#dcfce7",
//             color:
//               toast.type === "error"
//                 ? "#991b1b"
//                 : toast.type === "warning"
//                   ? "#92400e"
//                   : "#166534",
//             fontWeight: "600",
//             fontSize: "14px",
//             maxWidth: "400px",
//           }}
//         >
//           {toast.message}
//         </div>
//       )}
//     </div>
//   );
// }

import { useState, useEffect } from "react";
import api from "../api";
import Modal from "../components/Modal";
import NotesSection from "../components/NoteSection";
import { FaWhatsapp } from "react-icons/fa";
import { SiGmail } from "react-icons/si";
import { Phone, Megaphone } from "lucide-react";
// import { FaWhatsapp, FaStickyNote } from "react-icons/fa";

export default function Inquiries() {
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");
  const [days, setDays] = useState(7);
  const [selectedInquiry, setSelectedInquiry] = useState(null);
  const [detail, setDetail] = useState(null);
  const [pricingTeam, setPricingTeam] = useState([]);
  const [toast, setToast] = useState(null);

  // ─── Custom modal state ───
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [quoteTarget, setQuoteTarget] = useState(null);
  const [showCallModal, setShowCallModal] = useState(false);
  const [callTarget, setCallTarget] = useState(null);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [closeTarget, setCloseTarget] = useState(null);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastTarget, setBroadcastTarget] = useState(null);

  const [showKebab, setShowKebab] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [closeChoice, setCloseChoice] = useState(""); // 'won' | 'lost' | 'withdrawn'
  const [closeNote, setCloseNote] = useState("");

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchInquiries = async () => {
    setLoading(true);
    try {
      const res = await api.get("/inquiries", {
        params: { status: filter, days },
      });
      setInquiries(res.data);
      setError("");
    } catch (err) {
      setError("Failed to load inquiries.");
    } finally {
      setLoading(false);
    }
  };

  const fetchDetail = async (id) => {
    if (!id) return;
    try {
      const res = await api.get(`/inquiries/${id}`);
      setDetail(res.data);
      setSelectedInquiry(id);
    } catch (err) {
      setError("Failed to load inquiry detail.");
    }
  };

  // ─── Close kebab menu when clicking anywhere else ───
  useEffect(() => {
    if (!showKebab) return;
    const close = () => setShowKebab(null);
    // tiny delay so the click that OPENED the menu doesn't also close it
    const t = setTimeout(() => document.addEventListener("click", close), 0);
    return () => {
      clearTimeout(t);
      document.removeEventListener("click", close);
    };
  }, [showKebab]);

  useEffect(() => {
    fetchInquiries();
    api
      .get("/pricing-team")
      .then((res) => setPricingTeam(res.data))
      .catch(() => {});
  }, [filter, days]);

  // useEffect(() => {
  //   const interval = setInterval(() => {
  //     fetchInquiries();
  //   }, 15000);
  //   return () => clearInterval(interval);
  // }, [filter, days]);

  // ─── Anything open/being-interacted with? Pause auto-refresh ───
  const isInteracting =
    detail || // View modal open
    showDeleteModal || // delete confirmation
    showKebab || // kebab dropdown open
    showCallModal ||
    showCloseModal; // + any other modal states on this page

  useEffect(() => {
    const interval = setInterval(() => {
      if (!isInteracting) {
        fetchInquiries();
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [isInteracting, filter, days]); // ← isInteracting in deps (no stale value)

  const handleAction = async (action, id, payload = {}) => {
    try {
      let endpoint = "";
      switch (action) {
        case "quote":
          endpoint = `/inquiries/${id}/quote`;
          break;
        case "call":
          endpoint = `/inquiries/${id}/call`;
          break;
        case "reassign":
          endpoint = `/inquiries/${id}/reassign`;
          break;
        case "remind":
          endpoint = `/inquiries/${id}/remind`;
          break;
        case "close":
          endpoint = `/inquiries/${id}/close`;
          break;
        case "broadcast":
          endpoint = `/inquiries/${id}/broadcast`;
          break;
        default:
          return;
      }
      await api.post(endpoint, payload);
      fetchInquiries();
      if (selectedInquiry === id) await fetchDetail(id);
    } catch (err) {
      setError(
        `Action failed: ${err.response?.data?.message || "Unknown error"}`,
      );
      fetchInquiries();
    }
  };

  if (loading && inquiries.length === 0)
    return <div className="card">Loading inquiries...</div>;
  if (error)
    return (
      <div className="card" style={{ color: "var(--danger)" }}>
        {error}
      </div>
    );

  return (
    <div>
      <h1 className="page-title">Inquiries</h1>
      {/* Filter Bar */}
      <div className="card" style={{ padding: "16px 20px" }}>
        <div className="row" style={{ flexWrap: "wrap" }}>
          <div className="col" style={{ flex: 1, minWidth: "150px" }}>
            <label style={{ fontSize: "12px", color: "var(--text-muted)" }}>
              Status
            </label>
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="">All</option>
              <option value="OPEN">Open</option>
              <option value="QUOTED">Quoted</option>
              <option value="CLOSED_WON">Won</option>
              <option value="CLOSED_LOST">Lost</option>
              <option value="WITHDRAWN">Withdrawn</option>
            </select>
          </div>
          <div className="col" style={{ flex: 1, minWidth: "150px" }}>
            <label style={{ fontSize: "12px", color: "var(--text-muted)" }}>
              Time Window
            </label>
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
              <option value={400}>All time</option>
            </select>
          </div>
          <button onClick={fetchInquiries} className="primary">
            Refresh
          </button>
          {/* <a href="/api/export.csv" target="_blank" rel="noreferrer">
            <button className="secondary" style={{ textDecoration: "none" }}>
              Export CSV
            </button>
          </a> */}
        </div>
      </div>
      {/* Inquiries Table */}
      <div className="card" style={{ padding: 0, marginTop: "16px" }}>
        {inquiries.length === 0 ? (
          <p style={{ padding: "20px", color: "var(--text-muted)" }}>
            No inquiries found for this filter.
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ minWidth: "900px", width: "100%" }}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Requester</th>
                  <th>Lane</th>
                  <th>Vehicle Type</th>
                  <th>Posted At</th>
                  <th>Status</th>
                  <th>Assigned To</th>
                  <th>Age/TAT</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {inquiries.map((inq) => {
                  const isRed = inq.status === "OPEN" && inq.age_minutes >= 120;
                  const isAmber =
                    inq.status === "OPEN" && inq.age_minutes >= 60;

                  return (
                    <tr key={inq.id}>
                      <td onClick={() => fetchDetail(inq.id)}>#{inq.id}</td>

                      <td onClick={() => fetchDetail(inq.id)}>
                        {inq.requester || "Unknown"}
                      </td>
                      <td
                        style={{
                          maxWidth: "280px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          cursor: "pointer",
                        }}
                        title={inq.lane}
                        onClick={() => fetchDetail(inq.id)}
                      >
                        {inq.lane}
                      </td>
                      <td
                        style={{
                          maxWidth: "280px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          cursor: "pointer",
                        }}
                        title={inq.vehicle_type}
                        onClick={() => fetchDetail(inq.id)}
                      >
                        {inq.vehicle_type || "-"}
                      </td>
                      <td onClick={() => fetchDetail(inq.id)}>
                        {inq.posted_at
                          ? new Date(inq.posted_at).toLocaleString("en-IN", {
                              timeZone: "Asia/Kolkata",
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "-"}
                      </td>
                      <td onClick={() => fetchDetail(inq.id)}>
                        <span
                          className={`badge badge-${inq.status.toLowerCase().replace("_", "-")}`}
                        >
                          {inq.status.replace("_", " ")}
                        </span>
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <select
                          value={
                            inq.assigned_to_key
                              ? inq.assigned_to_key.replace(/^91/, "")
                              : ""
                          }
                          onChange={(e) => {
                            const value = e.target.value;
                            const key = value === "NONE" ? null : value;

                            // ─── Optimistic: show instantly, don't wait ───
                            setInquiries((prev) =>
                              prev.map((i) =>
                                i.id === inq.id
                                  ? { ...i, assigned_to_key: key }
                                  : i,
                              ),
                            );

                            // handleAction("reassign", inq.id, {
                            //   assignee_key: value === "NONE" ? null : value,
                            // });
                            handleAction("reassign", inq.id, {
                              assignee_key: key,
                            });
                          }}
                          style={{
                            padding: "4px 8px",
                            borderRadius: "4px",
                            border: "1px solid var(--border)",
                            background: "var(--bg, #fff)",
                            fontSize: "13px",
                            cursor: "pointer",
                          }}
                        >
                          <option value="" disabled>
                            Select...
                          </option>
                          <option value="NONE">None</option>
                          {pricingTeam.map((p) => (
                            <option key={p.phone} value={p.phone}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <span
                          style={{
                            fontWeight: "600",
                            color: isRed
                              ? "var(--red)"
                              : isAmber
                                ? "var(--amber)"
                                : "inherit",
                          }}
                        >
                          {inq.status === "OPEN" ? inq.age_display : inq.tat}
                        </span>
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div
                          className="row"
                          style={{ gap: "4px", alignItems: "center" }}
                        >
                          {/* View button - opens modal with all actions inside */}
                          <button
                            className="small secondary"
                            onClick={() => fetchDetail(inq.id)}
                          >
                            View
                          </button>

                          {/* Quick Quote button on each row */}
                          <button
                            className="small primary"
                            onClick={() => {
                              if (!inq.assigned_to_key) {
                                showToast(
                                  "⚠️ Please select an assignee before quoting a rate",
                                  "warning",
                                );
                                return;
                              }
                              setQuoteTarget(inq);
                              setShowQuoteModal(true);
                            }}
                          >
                            Quote
                          </button>
                          {/* <button
                            title="Add note"
                            onClick={() => fetchDetail(inq.id)}
                          >
                            📝
                          </button> */}
                          {/* <button
                            title="Add note"
                            onClick={() => fetchDetail(inq.id)}
                          >
                            <FaStickyNote size={16} color="#eab308" />
                          </button> */}

                          <div style={{ position: "relative" }}>
                            <button
                              title="More options"
                              onClick={() =>
                                setShowKebab(
                                  showKebab === inq.id ? null : inq.id,
                                )
                              }
                            >
                              ⋮
                            </button>
                            {showKebab === inq.id && (
                              <div
                                style={{
                                  position: "absolute",
                                  right: 0,
                                  top: "100%",
                                  zIndex: 100,
                                  background: "#fff",
                                  border: "1px solid var(--border)",
                                  borderRadius: "6px",
                                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                                  minWidth: "160px",
                                }}
                              >
                                <button
                                  style={{
                                    display: "block",
                                    width: "100%",
                                    padding: "8px 12px",
                                    textAlign: "left",
                                    background: "transparent",
                                    border: "none",
                                    cursor: "pointer",
                                    color: "var(--danger)",
                                  }}
                                  onClick={() => {
                                    setShowKebab(null);
                                    setDeleteTarget(inq);
                                    setShowDeleteModal(true);
                                  }}
                                >
                                  🗑 Delete Inquiry
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {/* Detail Modal with Action Buttons */}
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
          onClick={() => {
            setSelectedInquiry(null);
            setDetail(null);
          }}
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
            {/* Header with X close button */}
            <div className="between" style={{ marginBottom: "16px" }}>
              <h2 style={{ fontSize: "18px", fontWeight: "700" }}>
                Inquiry #{detail.id}
              </h2>
              <button
                className="small secondary"
                onClick={() => {
                  setSelectedInquiry(null);
                  setDetail(null);
                }}
              >
                Close
              </button>
            </div>

            {/* Inquiry details */}
            <div className="col" style={{ gap: "8px" }}>
              <div>
                <strong>Status:</strong>{" "}
                <span
                  className={`badge badge-${detail.status.toLowerCase().replace("_", "-")}`}
                >
                  {detail.status.replace("_", " ")}
                </span>
              </div>
              <div>
                <strong>Close Reason:</strong>
                {detail.close_reason}
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
                  ? new Date(detail.posted_at).toLocaleString("en-IN", {
                      timeZone: "Asia/Kolkata",
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "-"}
              </div>
              <div>
                <strong>Assigned To:</strong> {detail.assigned_to}
              </div>
              <div>
                <strong>Age:</strong> {detail.age_minutes} min
              </div>
              <div>
                <strong>TAT:</strong> {detail.tat}
              </div>
              <div>
                <strong>Reminders:</strong> {detail.reminders}
              </div>
              <div>
                <strong>Followups:</strong> {detail.followups}
              </div>

              {detail.quoted_rates && (
                <div>
                  <strong>Rate:</strong>{" "}
                  {detail.previous_rates ? (
                    <span>
                      <span
                        style={{
                          textDecoration: "line-through",
                          color: "var(--text-muted)",
                          fontSize: "12px",
                        }}
                      >
                        ₹{detail.previous_rates}
                      </span>
                      {" → "}
                      <strong>₹{detail.quoted_rates}</strong>
                    </span>
                  ) : (
                    <strong>₹{detail.quoted_rates}</strong>
                  )}
                </div>
              )}

              {/* Assignee dropdown inside modal */}
              <div style={{ marginTop: "8px" }}>
                <label
                  style={{
                    fontSize: "12px",
                    color: "var(--text-muted)",
                    display: "block",
                    marginBottom: "4px",
                  }}
                >
                  Assigned To:
                </label>
                <select
                  value={
                    detail.assigned_to_key
                      ? detail.assigned_to_key.replace(/^91/, "")
                      : ""
                  }
                  onChange={(e) => {
                    const value = e.target.value;
                    handleAction("reassign", detail.id, {
                      assignee_key: value === "NONE" ? null : value,
                    });
                  }}
                  style={{
                    padding: "6px 10px",
                    borderRadius: "4px",
                    border: "1px solid var(--border)",
                    background: "var(--bg, #fff)",
                    fontSize: "14px",
                    cursor: "pointer",
                    width: "100%",
                  }}
                >
                  <option value="" disabled>
                    Select...
                  </option>
                  <option value="NONE">None</option>
                  {pricingTeam.map((p) => (
                    <option key={p.phone} value={p.phone}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

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

              {/* ─── Coordinator Notes — ADD THIS BLOCK ─── */}
              <NotesSection inquiry={detail} api={api} />

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
                          {ev.at
                            ? new Date(ev.at).toLocaleString("en-IN", {
                                timeZone: "Asia/Kolkata",
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : ""}{" "}
                          by {ev.actor}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ─── Action Buttons at the bottom of modal ─── */}
              <div
                style={{
                  marginTop: "16px",
                  paddingTop: "16px",
                  borderTop: "1px solid var(--border)",
                }}
              >
                <div
                  className="row"
                  style={{ gap: "8px", flexWrap: "wrap", alignItems: "center" }}
                >
                  {/* Quote */}
                  <button
                    className="small primary"
                    onClick={() => {
                      if (!detail.assigned_to_key) {
                        showToast(
                          "⚠️ Please select an assignee before quoting a rate",
                          "warning",
                        );
                        return;
                      }
                      setQuoteTarget(detail);
                      setShowQuoteModal(true);
                    }}
                  >
                    Quote Rate
                  </button>

                  {/* WhatsApp */}
                  <button
                    title="Send WhatsApp Reminder"
                    style={{
                      padding: "6px",
                      display: "flex",
                      alignItems: "center",
                      borderRadius: "4px",
                      cursor: "pointer",
                      background: "transparent",
                      opacity: 0.85,
                      border: "none",
                    }}
                    onClick={async () => {
                      if (!detail.assigned_to_key) {
                        showToast(
                          "⚠️ Please select an assignee first",
                          "warning",
                        );
                        return;
                      }
                      try {
                        const res = await api.post(
                          `/inquiries/${detail.id}/remind`,
                          { channel: "whatsapp" },
                        );
                        showToast(
                          res.data?.sent
                            ? "✅ WhatsApp reminder sent!"
                            : "⚠️ WhatsApp not sent",
                          res.data?.sent ? "success" : "warning",
                        );
                      } catch (err) {
                        showToast("❌ Reminder failed", "error");
                      }
                    }}
                  >
                    <FaWhatsapp size={18} color="#25D366" />
                  </button>

                  {/* Email */}
                  <button
                    title="Send Email Reminder"
                    style={{
                      padding: "6px",
                      display: "flex",
                      alignItems: "center",
                      borderRadius: "4px",
                      cursor: "pointer",
                      background: "transparent",
                      opacity: 0.85,
                      border: "none",
                    }}
                    onClick={async () => {
                      if (!detail.assigned_to_key) {
                        showToast(
                          "⚠️ Please select an assignee first",
                          "warning",
                        );
                        return;
                      }
                      try {
                        const res = await api.post(
                          `/inquiries/${detail.id}/remind`,
                          { channel: "email" },
                        );
                        if (res.data?.error) {
                          showToast(`⚠️ ${res.data.error}`, "warning");
                        } else {
                          showToast(
                            res.data?.sent
                              ? "✅ Email sent!"
                              : "⚠️ Email not sent",
                            res.data?.sent ? "success" : "warning",
                          );
                        }
                      } catch (err) {
                        showToast("❌ Email failed", "error");
                      }
                    }}
                  >
                    <SiGmail size={18} color="#EA4335" />
                  </button>

                  {/* Call */}
                  <button
                    title="Log Call"
                    style={{
                      padding: "6px",
                      display: "flex",
                      alignItems: "center",
                      borderRadius: "4px",
                      cursor: "pointer",
                      background: "transparent",
                      opacity: 0.85,
                      border: "none",
                    }}
                    onClick={() => {
                      setCallTarget(detail);
                      setShowCallModal(true);
                    }}
                  >
                    <Phone size={18} color="#34B7F1" />
                  </button>

                  {/* Broadcast */}
                  <button
                    title="Broadcast to All Pricers"
                    style={{
                      padding: "6px",
                      display: "flex",
                      alignItems: "center",
                      borderRadius: "4px",
                      cursor: "pointer",
                      background: "transparent",
                      opacity: 0.85,
                      border: "none",
                    }}
                    onClick={() => {
                      setBroadcastTarget(detail);
                      setShowBroadcastModal(true);
                    }}
                  >
                    <Megaphone size={18} color="#4285F4" />
                  </button>

                  {/* Close */}
                  <button
                    className="small danger"
                    onClick={() => {
                      setCloseTarget(detail);
                      setShowCloseModal(true);
                    }}
                  >
                    Close Inquiry
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Custom Modals ─── */}

      {/* Quote Modal
      {showQuoteModal && quoteTarget && (
        <Modal
          title="Enter Rate Quote"
          input={{
            placeholder: "₹60000",
            label: `Enter rate for #${quoteTarget.id}:`,
          }}
          confirmText="Quote"
          cancelText="Cancel"
          onConfirm={(rates) => {
            setShowQuoteModal(false);
            if (rates)
              handleAction("quote", quoteTarget.id, {
                rates,
                quoted_by: "coordinator",
              });
          }}
          onCancel={() => setShowQuoteModal(false)}
        />
      )} */}
      {/* Quote Modal */}
      {showQuoteModal && quoteTarget && (
        <Modal
          title={
            quoteTarget.status === "QUOTED"
              ? `Update Rate — Inquiry #${quoteTarget.id}`
              : `Enter Rate Quote — Inquiry #${quoteTarget.id}`
          }
          input={{
            placeholder:
              quoteTarget.status === "QUOTED"
                ? `Current: ₹${quoteTarget.rate ?? "—"}`
                : "₹60000",
            label:
              quoteTarget.status === "QUOTED"
                ? `Current rate: ₹${quoteTarget.rate ?? "—"} — enter the updated rate:`
                : `Enter rate for #${quoteTarget.id}:`,
          }}
          confirmText={
            quoteTarget.status === "QUOTED" ? "Update Rate" : "Quote"
          }
          cancelText="Cancel"
          onConfirm={(rates) => {
            setShowQuoteModal(false);
            if (rates)
              handleAction("quote", quoteTarget.id, {
                rates,
                quoted_by: "coordinator",
                rate_changed: quoteTarget.status === "QUOTED",
              });
          }}
          onCancel={() => setShowQuoteModal(false)}
        />
      )}
      {/* Call Modal */}
      {showCallModal && callTarget && (
        <Modal
          title="Log Call Outcome"
          input={{
            placeholder: "e.g., Customer will revert",
            label: `Enter call outcome for #${callTarget.id}:`,
          }}
          confirmText="Save Call"
          cancelText="Cancel"
          onConfirm={(outcome) => {
            setShowCallModal(false);
            if (outcome) handleAction("call", callTarget.id, { outcome });
          }}
          onCancel={() => setShowCallModal(false)}
        />
      )}
      {/* Close Modal */}
      {/* {showCloseModal && closeTarget && (
        <Modal
          title="Close Inquiry"
          input={{
            placeholder: "won / lost / withdrawn",
            label: `Close reason for #${closeTarget.id}:`,
          }}
          confirmText="Close Inquiry"
          cancelText="Cancel"
          danger={true}
          onConfirm={(reason) => {
            setShowCloseModal(false);
            if (reason) handleAction("close", closeTarget.id, { reason });
          }}
          onCancel={() => setShowCloseModal(false)}
        />
      )} */}
      {/* {showCloseModal && closeTarget && (
        <Modal
          title="Close Inquiry"
          input={{
            placeholder:
              "e.g. duplicate request / requester deleted on WhatsApp / no response",
            label: `Close #${closeTarget.id} as WITHDRAWN — reason:`,
          }}
          confirmText="Close as Withdrawn"
          cancelText="Cancel"
          danger={true}
          onConfirm={(note) => {
            setShowCloseModal(false);
            if (note)
              handleAction("close", closeTarget.id, {
                reason: "withdrawn",
                note,
              });
          }}
          onCancel={() => setShowCloseModal(false)}
        />
      )} */}

      {showCloseModal && closeTarget && (
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
          onClick={() => setShowCloseModal(false)}
        >
          <div
            className="card"
            style={{ padding: "20px", width: "100%", maxWidth: "440px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              style={{
                fontSize: "16px",
                fontWeight: "700",
                marginBottom: "14px",
              }}
            >
              Close Inquiry #{closeTarget.id}
            </h2>

            <p
              style={{
                fontSize: "13px",
                color: "var(--text-muted)",
                marginBottom: "8px",
              }}
            >
              Select outcome:
            </p>
            <div style={{ display: "flex", gap: "8px", marginBottom: "14px" }}>
              <button
                className={closeChoice === "won" ? "primary" : "secondary"}
                style={{ flex: 1 }}
                onClick={() => setCloseChoice("won")}
              >
                🏆 Won
              </button>
              <button
                className={closeChoice === "lost" ? "primary" : "secondary"}
                style={{ flex: 1 }}
                onClick={() => setCloseChoice("lost")}
              >
                ❌ Lost
              </button>
              <button
                className={
                  closeChoice === "withdrawn" ? "primary" : "secondary"
                }
                style={{ flex: 1 }}
                onClick={() => setCloseChoice("withdrawn")}
              >
                ↩️ Withdrawn
              </button>
            </div>

            <p
              style={{
                fontSize: "13px",
                color: "var(--text-muted)",
                marginBottom: "8px",
              }}
            >
              Reason:
            </p>
            <input
              type="text"
              value={closeNote}
              onChange={(e) => setCloseNote(e.target.value)}
              placeholder={
                closeChoice === "withdrawn"
                  ? "e.g. self rated / customer withdrew"
                  : "e.g. lost to competitor on rate"
              }
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: "4px",
                border: "1px solid var(--border)",
                background: "var(--bg, #fff)",
                marginBottom: "16px",
                fontSize: "14px",
              }}
            />

            <div
              style={{
                display: "flex",
                gap: "8px",
                justifyContent: "flex-end",
              }}
            >
              <button
                className="secondary"
                onClick={() => setShowCloseModal(false)}
              >
                Cancel
              </button>
              <button
                className="primary"
                disabled={!closeChoice}
                onClick={() => {
                  handleAction("close", closeTarget.id, {
                    reason: closeChoice,
                    note: closeNote.trim(),
                  });
                  setShowCloseModal(false);
                  setCloseChoice("");
                  setCloseNote("");
                }}
              >
                Close Inquiry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {/* {showDeleteModal && deleteTarget && (
        <Modal
          title="🗑 Delete Inquiry"
          message={`Delete inquiry #${deleteTarget.id}? It will be removed from lists, dashboard and CSV reports. This can only be undone in the database.`}
          confirmText="Delete"
          cancelText="Cancel"
          danger={true}
          onConfirm={async () => {
            setShowDeleteModal(false);
            try {
              await api.post(`/inquiries/${deleteTarget.id}/delete`, {});
              showToast("🗑 Inquiry deleted");
              fetchInquiries();
            } catch {
              showToast("❌ Delete failed", "error");
            }
          }}
          onCancel={() => setShowDeleteModal(false)}
        />
      )} */}

      {showDeleteModal && deleteTarget && (
        <Modal
          title="🗑 Delete Inquiry"
          input={{
            placeholder:
              "e.g. duplicate request / requester deleted on WhatsApp",
            label: `Reason for deleting #${deleteTarget.id} (recorded for audit):`,
          }}
          confirmText="Delete"
          cancelText="Cancel"
          danger={true}
          onConfirm={(reason) => {
            setShowDeleteModal(false);
            if (reason) {
              api
                .post(`/inquiries/${deleteTarget.id}/delete`, { reason })
                .then(() => {
                  showToast("🗑 Inquiry deleted");
                  fetchInquiries();
                })
                .catch(() => showToast("❌ Delete failed", "error"));
            }
          }}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}

      {/* Broadcast Modal */}
      {showBroadcastModal && broadcastTarget && (
        <Modal
          title="📢 Broadcast to All Pricers"
          message={`Send WhatsApp + Email to ALL active pricing members for inquiry #${broadcastTarget.id}?`}
          confirmText="Send Broadcast"
          cancelText="Cancel"
          onConfirm={async () => {
            const inq = broadcastTarget;
            setShowBroadcastModal(false);
            try {
              const res = await api.post(`/inquiries/${inq.id}/broadcast`, {
                channel: "both",
              });
              showToast(
                `📢 Broadcast sent! WA: ${res.data.wa_sent}/${res.data.total_members}, Email: ${res.data.email_sent}/${res.data.total_members}`,
              );
            } catch (err) {
              showToast("❌ Broadcast failed", "error");
            }
          }}
          onCancel={() => setShowBroadcastModal(false)}
        />
      )}
      {toast && (
        <div
          style={{
            position: "fixed",
            top: "20px",
            right: "20px",
            zIndex: 2000,
            padding: "12px 20px",
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            background:
              toast.type === "error"
                ? "#fee2e2"
                : toast.type === "warning"
                  ? "#fef3c7"
                  : "#dcfce7",
            color:
              toast.type === "error"
                ? "#991b1b"
                : toast.type === "warning"
                  ? "#92400e"
                  : "#166534",
            fontWeight: "600",
            fontSize: "14px",
            maxWidth: "400px",
          }}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
