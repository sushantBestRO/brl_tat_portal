// import { useState, useEffect } from "react";
// import api from "../api";
// import ConnectionStatus from "../components/ConnectionStatus";
// import { useNavigate } from "react-router-dom";
// import { FaWhatsapp } from "react-icons/fa";
// import { SiGmail } from "react-icons/si";
// import { Phone, Megaphone } from "lucide-react";
// import Modal from "../components/Modal";

// export default function Dashboard() {
//   const [stats, setStats] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState("");
//   const [pricingTeam, setPricingTeam] = useState([]);
//   const [detail, setDetail] = useState(null);
//   const navigate = useNavigate();
//   // ─── Email quota status ───
//   const [emailStatus, setEmailStatus] = useState(null);
//   // ─── Toast notification state ───
//   const [toast, setToast] = useState(null);
//   const [selectedInquiry, setSelectedInquiry] = useState(null);

//   const showToast = (message, type = "success") => {
//     setToast({ message, type });
//     setTimeout(() => setToast(null), 3000);
//   };

//   const fetchStats = async () => {
//     try {
//       const res = await api.get("/dashboard/stats");
//       setStats(res.data);
//       setError("");
//     } catch (err) {
//       setError("Failed to load dashboard stats. Is the backend running?");
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
//     // Fetch initial data
//     fetchStats();

//     api
//       .get("/pricing-team")
//       .then((res) => setPricingTeam(res.data))
//       .catch(() => {});

//     // ─── Fetch email quota status ───
//     api
//       .get("/email-status")
//       .then((res) => setEmailStatus(res.data))
//       .catch(() => {});

//     // Auto-refresh dashboard stats every 15 seconds
//     const interval = setInterval(fetchStats, 15000);

//     // Cleanup function (this MUST be the last thing in useEffect)
//     return () => clearInterval(interval);
//   }, []);

//   // For the Selection of Reassigning the Pricer from dropdown
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
//       await fetchStats(); // Refresh dashboard data
//     } catch (err) {
//       setError(
//         `Action failed: ${err.response?.data?.message || "Unknown error"}`,
//       );
//     }
//   };

//   if (loading) return <div className="card">Loading dashboard...</div>;
//   if (error)
//     return (
//       <div className="card" style={{ color: "var(--danger)" }}>
//         {error}
//       </div>
//     );
//   if (!stats) return null;

//   return (
//     <div>
//       {/* <h1 className="page-title">Dashboard</h1> */}

//       <div
//         style={{
//           display: "flex",
//           gap: "12px",
//           justifyContent: "space-between",
//           alignItems: "center",
//           marginBottom: "20px",
//         }}
//       >
//         <h1 className="page-title" style={{ marginBottom: 0 }}>
//           Dashboard
//         </h1>
//         <button
//           className="secondary"
//           onClick={() => navigate("/daily-details")}
//           style={{ padding: "6px 16px", fontSize: "13px" }}
//         >
//           📋 Check Daily Details
//         </button>

//         {/* ─── Add the connection status indicator here ─── */}
//         <ConnectionStatus />
//       </div>

//       {/* Summary Cards */}
//       <div className="row" style={{ marginBottom: "20px", flexWrap: "wrap" }}>
//         <div
//           className="card"
//           style={{ flex: 1, minWidth: "200px", margin: "0 10px 10px 0" }}
//         >
//           <h3
//             style={{
//               color: "var(--text-muted)",
//               fontSize: "12px",
//               textTransform: "uppercase",
//               marginBottom: "8px",
//             }}
//           >
//             Total Inquiries
//           </h3>
//           <p style={{ fontSize: "28px", fontWeight: "700" }}>{stats.total}</p>
//         </div>
//         <div
//           className="card"
//           style={{ flex: 1, minWidth: "200px", margin: "0 10px 10px 0" }}
//         >
//           <h3
//             style={{
//               color: "var(--text-muted)",
//               fontSize: "12px",
//               textTransform: "uppercase",
//               marginBottom: "8px",
//             }}
//           >
//             Open
//           </h3>
//           <p
//             style={{
//               fontSize: "28px",
//               fontWeight: "700",
//               color: "var(--amber)",
//             }}
//           >
//             {stats.open_count}
//           </p>
//         </div>
//         <div
//           className="card"
//           style={{ flex: 1, minWidth: "200px", margin: "0 10px 10px 0" }}
//         >
//           <h3
//             style={{
//               color: "var(--text-muted)",
//               fontSize: "12px",
//               textTransform: "uppercase",
//               marginBottom: "8px",
//             }}
//           >
//             Quoted
//           </h3>
//           <p
//             style={{
//               fontSize: "28px",
//               fontWeight: "700",
//               color: "var(--success)",
//             }}
//           >
//             {stats.quoted_count}
//           </p>
//         </div>
//         <div
//           className="card"
//           style={{ flex: 1, minWidth: "200px", margin: "0 0 10px 0" }}
//         >
//           <h3
//             style={{
//               color: "var(--text-muted)",
//               fontSize: "12px",
//               textTransform: "uppercase",
//               marginBottom: "8px",
//             }}
//           >
//             Median TAT
//           </h3>
//           <p style={{ fontSize: "28px", fontWeight: "700" }}>
//             {stats.median_tat_min}{" "}
//             <span style={{ fontSize: "14px", color: "var(--text-muted)" }}>
//               min
//             </span>
//           </p>
//         </div>
//       </div>

//       {/* ─── Email quota warning banner ─── */}
//       {emailStatus?.quota_exceeded && (
//         <div
//           style={{
//             background: "#fee2e2",
//             border: "1px solid #ef4444",
//             borderRadius: "8px",
//             padding: "12px 16px",
//             marginBottom: "16px",
//             display: "flex",
//             justifyContent: "space-between",
//             alignItems: "center",
//             flexWrap: "wrap",
//             gap: "8px",
//           }}
//         >
//           <div
//             style={{ color: "#991b1b", fontSize: "14px", fontWeight: "600" }}
//           >
//             ⚠️ Email quota exceeded — Google Script daily limit (100) reached.
//             Email reminders will not be sent. Please switch to SMTP or wait
//             until tomorrow.
//           </div>
//           <a
//             href="/settings"
//             style={{
//               background: "#991b1b",
//               color: "white",
//               padding: "6px 12px",
//               borderRadius: "4px",
//               fontSize: "12px",
//               textDecoration: "none",
//               fontWeight: "600",
//             }}
//           >
//             Configure SMTP →
//           </a>
//         </div>
//       )}

//       {/* ─── Low quota warning (not exceeded but low) ─── */}
//       {emailStatus &&
//         !emailStatus.quota_exceeded &&
//         emailStatus.remaining !== null &&
//         emailStatus.remaining <= 10 &&
//         emailStatus.remaining > 0 && (
//           <div
//             style={{
//               background: "#fef3c7",
//               border: "1px solid #f59e0b",
//               borderRadius: "8px",
//               padding: "10px 16px",
//               marginBottom: "16px",
//               color: "#92400e",
//               fontSize: "13px",
//               fontWeight: "600",
//             }}
//           >
//             ⚠️ Email quota low — only {emailStatus.remaining} emails left today.
//             Consider switching to SMTP soon.
//           </div>
//         )}

//       {/* Live Open Inquiries */}
//       <div className="card" style={{ padding: 0 }}>
//         <div
//           style={{
//             padding: "16px 20px",
//             borderBottom: "1px solid var(--border)",
//             display: "flex",
//             justifyContent: "space-between",
//             alignItems: "center",
//           }}
//         >
//           <h2 style={{ fontSize: "16px", fontWeight: "600" }}>
//             Live Open Inquiries
//           </h2>
//           <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
//             AMBER &gt; {stats.amber_minutes}m | RED &gt; {stats.red_minutes}m
//           </span>
//         </div>

//         {stats.open_inquiries.length === 0 ? (
//           <p style={{ padding: "20px", color: "var(--text-muted)" }}>
//             No open inquiries right now. 🎉
//           </p>
//         ) : (
//           <div style={{ overflowX: "auto" }}>
//             <table>
//               <thead>
//                 <tr>
//                   <th>ID</th>
//                   <th>Requester</th>
//                   <th>Lane</th>
//                   {/* <th>Posted At</th> */}
//                   <th>Vehicle Type</th>
//                   <th>Assigned To</th>
//                   <th>Age</th>
//                   <th>Status</th>
//                   <th>Actions</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {stats.open_inquiries.map((inq) => {
//                   const isRed = inq.age_minutes >= stats.red_minutes;
//                   const isAmber = inq.age_minutes >= stats.amber_minutes;

//                   return (
//                     <tr
//                       key={inq.id}
//                       onClick={() => fetchDetail(inq.id)}
//                       style={{
//                         cursor: "pointer",
//                         background: inq.has_rate_change
//                           ? "rgba(255, 165, 0, 0.05)"
//                           : "inherit",
//                       }}
//                     >
//                       <td>#{inq.id}</td>
//                       <td>{inq.requester || "Unknown"}</td>
//                       <td
//                         style={{
//                           maxWidth: "300px",
//                           overflow: "hidden",
//                           textOverflow: "ellipsis",
//                           whiteSpace: "nowrap",
//                           cursor: "pointer",
//                         }}
//                         title={inq.lane}
//                       >
//                         {inq.lane}
//                       </td>
//                       <td
//                         style={{
//                           maxWidth: "180px",
//                           overflow: "hidden",
//                           textOverflow: "ellipsis",
//                           whiteSpace: "nowrap",
//                           cursor: "pointer",
//                         }}
//                         title={inq.vehicle_type}
//                       >
//                         {inq.vehicle_type || "-"}
//                       </td>

//                       <td onClick={(e) => e.stopPropagation()}>
//                         <select
//                           value={
//                             inq.assigned_to_key
//                               ? inq.assigned_to_key.replace(/^91/, "")
//                               : ""
//                           }
//                           onChange={(e) => {
//                             const value = e.target.value;
//                             // If "None" is selected, it sends null to the backend
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
//                           {inq.age_display}
//                         </span>
//                       </td>
//                       <td>
//                         <span
//                           className="status-dot"
//                           style={{
//                             background: isRed
//                               ? "var(--red)"
//                               : isAmber
//                                 ? "var(--amber)"
//                                 : "var(--success)",
//                           }}
//                         ></span>
//                         {isRed ? "RED" : isAmber ? "AMBER" : "OK"}
//                       </td>

//                       {/* ─── Action buttons directly on the row ─── */}
//                       <td onClick={(e) => e.stopPropagation()}>
//                         <div
//                           style={{
//                             display: "flex",
//                             gap: "6px",
//                             alignItems: "center",
//                           }}
//                         >
//                           {/* WhatsApp */}
//                           <button
//                             title="Send WhatsApp Reminder"
//                             style={{
//                               padding: "6px",
//                               display: "flex",
//                               alignItems: "center",
//                               // border: "1px solid #050505",
//                               borderRadius: "4px",
//                               cursor: "pointer",
//                               background: "transparent",
//                               opacity: 0.85,
//                             }}
//                             onClick={async () => {
//                               if (!inq.assigned_to_key) {
//                                 showToast(
//                                   "⚠️ Please select an assignee first",
//                                   "warning",
//                                 );
//                                 return;
//                               }
//                               try {
//                                 const res = await api.post(
//                                   `/inquiries/${inq.id}/remind`,
//                                   { channel: "whatsapp" },
//                                 );
//                                 showToast(
//                                   res.data?.sent
//                                     ? "✅ WhatsApp reminder sent!"
//                                     : "⚠️ WhatsApp not sent (check WA config)",
//                                   res.data?.sent ? "success" : "warning",
//                                 );
//                               } catch (err) {
//                                 showToast("❌ Reminder failed", "error");
//                               }
//                             }}
//                           >
//                             <FaWhatsapp size={16} color="#25D366" />
//                           </button>

//                           {/* Email */}
//                           <button
//                             title="Send Email Reminder"
//                             style={{
//                               padding: "6px",
//                               display: "flex",
//                               alignItems: "center",
//                               // border: "1px solid #050505",
//                               borderRadius: "4px",
//                               cursor: "pointer",
//                               background: "transparent",
//                               opacity: 0.85,
//                             }}
//                             onClick={async () => {
//                               if (!inq.assigned_to_key) {
//                                 showToast(
//                                   "⚠️ Please select an assignee first",
//                                   "warning",
//                                 );
//                                 return;
//                               }
//                               try {
//                                 const res = await api.post(
//                                   `/inquiries/${inq.id}/remind`,
//                                   { channel: "email" },
//                                 );
//                                 if (res.data?.error) {
//                                   showToast(`⚠️ ${res.data.error}`, "warning");
//                                 } else {
//                                   showToast(
//                                     res.data?.sent
//                                       ? "✅ Email reminder sent!"
//                                       : "⚠️ Email not sent (check email config)",
//                                     res.data?.sent ? "success" : "warning",
//                                   );
//                                 }
//                               } catch (err) {
//                                 showToast("❌ Email failed", "error");
//                               }
//                             }}
//                           >
//                             <SiGmail size={16} color="#EA4335" />
//                           </button>

//                           {/* Call */}
//                           <button
//                             title="Log Call"
//                             style={{
//                               padding: "6px",
//                               display: "flex",
//                               alignItems: "center",
//                               // border: "1px solid #050505",
//                               borderRadius: "4px",
//                               cursor: "pointer",
//                               background: "transparent",
//                               opacity: 0.85,
//                             }}
//                             onClick={() => {
//                               const outcome = prompt(
//                                 `Enter call outcome for #${inq.id}:`,
//                               );
//                               if (outcome)
//                                 handleAction("call", inq.id, { outcome });
//                             }}
//                           >
//                             <Phone size={16} color="#34B7F1" />
//                           </button>

//                           {/* Broadcast */}
//                           <button
//                             title="Broadcast to All Pricers"
//                             style={{
//                               padding: "6px",
//                               display: "flex",
//                               alignItems: "center",
//                               // border: "1px solid #050505",
//                               borderRadius: "4px",
//                               cursor: "pointer",
//                               background: "transparent",
//                               opacity: 0.85,
//                             }}
//                             onClick={async () => {
//                               if (
//                                 !window.confirm(
//                                   `Broadcast to ALL active pricing members for #${inq.id}?\n\nThis will send WhatsApp + Email to everyone.`,
//                                 )
//                               )
//                                 return;
//                               try {
//                                 const res = await api.post(
//                                   `/inquiries/${inq.id}/broadcast`,
//                                   { channel: "both" },
//                                 );
//                                 showToast(
//                                   `📢 Broadcast sent! WA: ${res.data.wa_sent}/${res.data.total_members}, Email: ${res.data.email_sent}/${res.data.total_members}`,
//                                 );
//                                 fetchStats();
//                               } catch (err) {
//                                 showToast("❌ Broadcast failed", "error");
//                               }
//                             }}
//                           >
//                             <Megaphone size={16} color="#4285F4" />
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

//       {/* Recent Quoted */}
//       <div className="card" style={{ padding: 0, marginTop: "20px" }}>
//         <div
//           style={{
//             padding: "16px 20px",
//             borderBottom: "1px solid var(--border)",
//           }}
//         >
//           <h2 style={{ fontSize: "16px", fontWeight: "600" }}>
//             Recently Quoted
//           </h2>
//         </div>

//         {stats.recent_quoted.length === 0 ? (
//           <p style={{ padding: "20px", color: "var(--text-muted)" }}>
//             No inquiries quoted yet.
//           </p>
//         ) : (
//           <div style={{ overflowX: "auto" }}>
//             <table>
//               <thead>
//                 <tr>
//                   <th>ID</th>
//                   <th>Requester</th>
//                   <th>Lane</th>
//                   {/* <th>Posted At</th> */}
//                   <th>Vehicle Type</th>
//                   <th>Assigned To</th>
//                   <th>Rate</th>
//                   <th>TAT</th>
//                   <th>Status</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {stats.recent_quoted.map((inq) => (
//                   <tr key={inq.id}>
//                     <td>#{inq.id}</td>
//                     <td>{inq.requester || "Unknown"}</td>
//                     <td
//                       style={{
//                         maxWidth: "300px",
//                         overflow: "hidden",
//                         textOverflow: "ellipsis",
//                         whiteSpace: "nowrap",
//                         cursor: "pointer",
//                       }}
//                       title={inq.lane}
//                       onClick={() => fetchDetail(inq.id)}
//                     >
//                       {inq.lane}
//                     </td>
//                     <td
//                       style={{
//                         maxWidth: "180px",
//                         overflow: "hidden",
//                         textOverflow: "ellipsis",
//                         whiteSpace: "nowrap",
//                         cursor: "pointer",
//                       }}
//                       title={inq.vehicle_type}
//                       onClick={() => fetchDetail(inq.id)}
//                     >
//                       {inq.vehicle_type || "-"}
//                     </td>
//                     <td>{inq.assigned_to || "Unassigned"}</td>
//                     {/* <td>
//                       <strong>
//                         {inq.quoted_rates ? `₹${inq.quoted_rates}` : "-"}
//                       </strong>
//                     </td> */}

//                     <td>
//                       {inq.quoted_rates ? (
//                         inq.previous_rates ? (
//                           <span>
//                             <span
//                               style={{
//                                 textDecoration: "line-through",
//                                 color: "var(--text-muted)",
//                                 fontSize: "12px",
//                               }}
//                             >
//                               ₹{inq.previous_rates}
//                             </span>
//                             {" → "}
//                             <strong>₹{inq.quoted_rates}</strong>
//                           </span>
//                         ) : (
//                           <strong>₹{inq.quoted_rates}</strong>
//                         )
//                       ) : (
//                         "-"
//                       )}
//                     </td>

//                     <td>{inq.tat || "-"}</td>
//                     <td>
//                       <span className="badge badge-quoted">QUOTED</span>
//                     </td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         )}
//       </div>
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
//                 <strong>Assigned To:</strong> {detail.assigned_to}
//               </div>
//               {detail.quoted_rates && (
//                 <div>
//                   <strong>Rate:</strong> ₹{detail.quoted_rates}
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
//             </div>
//           </div>
//         </div>
//       )}

//       {/* ─── Toast notification (success/error feedback) ─── */}
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
import ConnectionStatus from "../components/ConnectionStatus";
import { useNavigate } from "react-router-dom";
import { FaWhatsapp } from "react-icons/fa";
import { SiGmail } from "react-icons/si";
import { Phone, Megaphone } from "lucide-react";
import Modal from "../components/Modal";

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pricingTeam, setPricingTeam] = useState([]);
  const [detail, setDetail] = useState(null);

  const navigate = useNavigate();
  // ─── Email quota status ───
  const [emailStatus, setEmailStatus] = useState(null);
  // ─── Toast notification state ───
  const [toast, setToast] = useState(null);
  const [selectedInquiry, setSelectedInquiry] = useState(null);

  // ─── Custom modal state ───
  const [showCallModal, setShowCallModal] = useState(false);
  const [callTarget, setCallTarget] = useState(null);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastTarget, setBroadcastTarget] = useState(null);

  // ─── Today-only lists (dashboard shows only today's) ───
  const [todayLive, setTodayLive] = useState([]);
  const [todayQuoted, setTodayQuoted] = useState([]);

  const fetchTodayLists = async () => {
    const today = new Date().toLocaleDateString("en-CA");
    try {
      const [live, quoted] = await Promise.all([
        api.get("/inquiries", {
          params: { status: "OPEN", startDate: today, endDate: today },
        }),
        api.get("/inquiries", {
          params: { status: "QUOTED", startDate: today, endDate: today },
        }),
      ]);
      setTodayLive(live.data);
      setTodayQuoted(quoted.data);
    } catch {
      // keep previous data on failure
    }
  };

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchStats = async () => {
    try {
      const res = await api.get("/dashboard/stats");
      setStats(res.data);
      setError("");
    } catch (err) {
      setError("Failed to load dashboard stats. Is the backend running?");
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

  // useEffect(() => {
  //   fetchStats();
  //   fetchTodayLists();
  //   api
  //     .get("/pricing-team")
  //     .then((res) => setPricingTeam(res.data))
  //     .catch(() => {});
  //   api
  //     .get("/email-status")
  //     .then((res) => setEmailStatus(res.data))
  //     .catch(() => {});
  //   // const interval = setInterval(fetchStats, 15000);
  //   const interval = setInterval(() => {
  //     fetchStats();
  //     fetchTodayLists(); // ← ADD (midnight rollover handled:
  //   }, 15000);
  //   return () => clearInterval(interval);
  // }, []);

  // ─── Pause auto-refresh while interacting ───
  const isInteracting =
    detail || // detail modal open
    showCallModal || // call modal open
    showBroadcastModal; // broadcast modal open

  useEffect(() => {
    fetchStats();
    fetchTodayLists();
    api
      .get("/pricing-team")
      .then((res) => setPricingTeam(res.data))
      .catch(() => {});
    api
      .get("/email-status")
      .then((res) => setEmailStatus(res.data))
      .catch(() => {});
    const interval = setInterval(() => {
      if (!isInteracting) {
        fetchStats();
        fetchTodayLists(); // midnight rollover still handled
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [isInteracting]);

  // For the Selection of Reassigning the Pricer from dropdown
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
      await fetchStats();
      if (selectedInquiry === id) await fetchDetail(id);
    } catch (err) {
      setError(
        `Action failed: ${err.response?.data?.message || "Unknown error"}`,
      );
    }
  };

  if (loading) return <div className="card">Loading dashboard...</div>;
  if (error)
    return (
      <div className="card" style={{ color: "var(--danger)" }}>
        {error}
      </div>
    );
  if (!stats) return null;

  return (
    <div>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      <div
        style={{
          display: "flex",
          gap: "12px",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <h1 className="page-title" style={{ marginBottom: 0 }}>
          Dashboard
        </h1>
        <button
          className="secondary"
          onClick={() => navigate("/daily-details")}
          style={{ padding: "6px 16px", fontSize: "13px" }}
        >
          📋 Check Daily Details
        </button>
        <ConnectionStatus />
      </div>

      {/* Summary Cards */}
      <div className="row" style={{ marginBottom: "20px", flexWrap: "wrap" }}>
        <div
          className="card"
          style={{ flex: 1, minWidth: "200px", margin: "0 10px 10px 0" }}
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
          <p style={{ fontSize: "28px", fontWeight: "700" }}>{stats.total}</p>
        </div>
        <div
          className="card"
          style={{ flex: 1, minWidth: "200px", margin: "0 10px 10px 0" }}
        >
          <h3
            style={{
              color: "var(--text-muted)",
              fontSize: "12px",
              textTransform: "uppercase",
              marginBottom: "8px",
            }}
          >
            Open
          </h3>
          <p
            style={{
              fontSize: "28px",
              fontWeight: "700",
              color: "var(--amber)",
            }}
          >
            {stats.open_count}
          </p>
        </div>
        <div
          className="card"
          style={{ flex: 1, minWidth: "200px", margin: "0 10px 10px 0" }}
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
            {stats.quoted_count}
          </p>
        </div>
        <div
          className="card"
          style={{ flex: 1, minWidth: "200px", margin: "0 0 10px 0" }}
        >
          <h3
            style={{
              color: "var(--text-muted)",
              fontSize: "12px",
              textTransform: "uppercase",
              marginBottom: "8px",
            }}
          >
            Median TAT
          </h3>
          <p style={{ fontSize: "28px", fontWeight: "700" }}>
            {stats.median_tat_min}{" "}
            <span style={{ fontSize: "14px", color: "var(--text-muted)" }}>
              min
            </span>
          </p>
        </div>
      </div>

      {/* Email quota warning banners */}
      {emailStatus?.quota_exceeded && (
        <div
          style={{
            background: "#fee2e2",
            border: "1px solid #ef4444",
            borderRadius: "8px",
            padding: "12px 16px",
            marginBottom: "16px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "8px",
          }}
        >
          <div
            style={{ color: "#991b1b", fontSize: "14px", fontWeight: "600" }}
          >
            ⚠️ Email quota exceeded — Google Script daily limit (100) reached.
            Email reminders will not be sent. Please switch to SMTP or wait
            until tomorrow.
          </div>
          <a
            href="/settings"
            style={{
              background: "#991b1b",
              color: "white",
              padding: "6px 12px",
              borderRadius: "4px",
              fontSize: "12px",
              textDecoration: "none",
              fontWeight: "600",
            }}
          >
            Configure SMTP →
          </a>
        </div>
      )}
      {emailStatus &&
        !emailStatus.quota_exceeded &&
        emailStatus.remaining !== null &&
        emailStatus.remaining <= 10 &&
        emailStatus.remaining > 0 && (
          <div
            style={{
              background: "#fef3c7",
              border: "1px solid #f59e0b",
              borderRadius: "8px",
              padding: "10px 16px",
              marginBottom: "16px",
              color: "#92400e",
              fontSize: "13px",
              fontWeight: "600",
            }}
          >
            ⚠️ Email quota low — only {emailStatus.remaining} emails left today.
            Consider switching to SMTP soon.
          </div>
        )}

      {/* Live Open Inquiries */}
      <div className="card" style={{ padding: 0 }}>
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h2
            style={{
              fontSize: "16px",
              fontWeight: "600",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span
              style={{
                display: "inline-block",
                width: "14px",
                height: "14px",
                border: "2px solid var(--border)",
                borderTopColor: "var(--primary, #007185)",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
              }}
              title="Live auto-refresh"
            ></span>
            Live Open Inquiries
          </h2>

          <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
            AMBER {stats.amber_minutes}m | RED {stats.red_minutes}m
          </span>
        </div>

        {/* {stats.open_inquiries.length === 0 ? ( */}
        {todayLive.length === 0 ? (
          <p style={{ padding: "20px", color: "var(--text-muted)" }}>
            No open inquiries right now. 🎉
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
                  <th>Assigned To</th>
                  <th>Age</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {/* {stats.open_inquiries.map((inq) => { */}
                {todayLive.map((inq) => {
                  const isRed = inq.age_minutes >= stats.red_minutes;
                  const isAmber = inq.age_minutes >= stats.amber_minutes;

                  return (
                    <tr
                      key={inq.id}
                      onClick={() => fetchDetail(inq.id)}
                      style={{
                        cursor: "pointer",
                        background: inq.has_rate_change
                          ? "rgba(255, 165, 0, 0.05)"
                          : "inherit",
                      }}
                    >
                      <td>#{inq.id}</td>
                      <td>{inq.requester || "Unknown"}</td>
                      <td
                        style={{
                          maxWidth: "300px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          cursor: "pointer",
                        }}
                        title={inq.lane}
                      >
                        {inq.lane}
                      </td>
                      <td
                        style={{
                          maxWidth: "180px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          cursor: "pointer",
                        }}
                        title={inq.vehicle_type}
                      >
                        {inq.vehicle_type || "-"}
                      </td>

                      {/* <td onClick={(e) => e.stopPropagation()}>
                        <select
                          value={
                            inq.assigned_to_key
                              ? inq.assigned_to_key.replace(/^91/, "")
                              : ""
                          }
                          onChange={(e) => {
                            const value = e.target.value;
                            handleAction("reassign", inq.id, {
                              assignee_key: value === "NONE" ? null : value,
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
                      </td> */}
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

                            // ─── Optimistic: reflect the choice instantly ───
                            setTodayLive((prev) =>
                              prev.map((i) =>
                                i.id === inq.id
                                  ? { ...i, assigned_to_key: key }
                                  : i,
                              ),
                            );

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
                          {inq.age_display}
                        </span>
                      </td>
                      <td>
                        <span
                          className="status-dot"
                          style={{
                            background: isRed
                              ? "var(--red)"
                              : isAmber
                                ? "var(--amber)"
                                : "var(--success)",
                          }}
                        ></span>
                        {isRed ? "RED" : isAmber ? "AMBER" : "OK"}
                      </td>

                      {/* Action buttons */}
                      <td onClick={(e) => e.stopPropagation()}>
                        <div
                          style={{
                            display: "flex",
                            gap: "6px",
                            alignItems: "center",
                          }}
                        >
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
                            }}
                            onClick={async () => {
                              if (!inq.assigned_to_key) {
                                showToast(
                                  "⚠️ Please select an assignee first",
                                  "warning",
                                );
                                return;
                              }
                              try {
                                const res = await api.post(
                                  `/inquiries/${inq.id}/remind`,
                                  { channel: "whatsapp" },
                                );
                                showToast(
                                  res.data?.sent
                                    ? "✅ WhatsApp reminder sent!"
                                    : "⚠️ WhatsApp not sent (check WA config)",
                                  res.data?.sent ? "success" : "warning",
                                );
                              } catch (err) {
                                showToast("❌ Reminder failed", "error");
                              }
                            }}
                          >
                            <FaWhatsapp size={16} color="#25D366" />
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
                            }}
                            onClick={async () => {
                              if (!inq.assigned_to_key) {
                                showToast(
                                  "⚠️ Please select an assignee first",
                                  "warning",
                                );
                                return;
                              }
                              try {
                                const res = await api.post(
                                  `/inquiries/${inq.id}/remind`,
                                  { channel: "email" },
                                );
                                if (res.data?.error) {
                                  showToast(`⚠️ ${res.data.error}`, "warning");
                                } else {
                                  showToast(
                                    res.data?.sent
                                      ? "✅ Email reminder sent!"
                                      : "⚠️ Email not sent (check email config)",
                                    res.data?.sent ? "success" : "warning",
                                  );
                                }
                              } catch (err) {
                                showToast("❌ Email failed", "error");
                              }
                            }}
                          >
                            <SiGmail size={16} color="#EA4335" />
                          </button>

                          {/* Call - Custom Modal */}
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
                            }}
                            onClick={() => {
                              setCallTarget(inq);
                              setShowCallModal(true);
                            }}
                          >
                            <Phone size={16} color="#34B7F1" />
                          </button>

                          {/* Broadcast - Custom Modal */}
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
                            }}
                            onClick={() => {
                              setBroadcastTarget(inq);
                              setShowBroadcastModal(true);
                            }}
                          >
                            <Megaphone size={16} color="#4285F4" />
                          </button>
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

      {/* Recent Quoted */}
      <div className="card" style={{ padding: 0, marginTop: "20px" }}>
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <h2 style={{ fontSize: "16px", fontWeight: "600" }}>
            Recently Quoted
          </h2>
        </div>

        {/* {stats.recent_quoted.length === 0 ? ( */}
        {todayQuoted.length === 0 ? (
          <p style={{ padding: "20px", color: "var(--text-muted)" }}>
            No inquiries quoted yet.
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
                  <th>Assigned To</th>
                  <th>Rate</th>
                  <th>TAT</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {/* {stats.recent_quoted.map((inq) => ( */}
                {todayQuoted.map((inq) => (
                  <tr key={inq.id}>
                    <td>#{inq.id}</td>
                    <td>{inq.requester || "Unknown"}</td>
                    <td
                      style={{
                        maxWidth: "300px",
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
                        maxWidth: "180px",
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
                    <td>{inq.assigned_to || "Unassigned"}</td>
                    <td>
                      {inq.quoted_rates ? (
                        inq.previous_rates ? (
                          <span>
                            <span
                              style={{
                                textDecoration: "line-through",
                                color: "var(--text-muted)",
                                fontSize: "12px",
                              }}
                            >
                              ₹{inq.previous_rates}
                            </span>
                            {" → "}
                            <strong>₹{inq.quoted_rates}</strong>
                          </span>
                        ) : (
                          <strong>₹{inq.quoted_rates}</strong>
                        )
                      ) : (
                        "-"
                      )}
                    </td>
                    <td>{inq.tat || "-"}</td>
                    <td>
                      <span className="badge badge-quoted">QUOTED</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal (Read-Only) */}
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
                <strong>Close Reason:</strong> {detail.close_reason}
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
                <strong>Assigned To:</strong> {detail.assigned_to}
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
            </div>
          </div>
        </div>
      )}

      {/* ─── Custom Modals ─── */}

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
              fetchStats();
            } catch (err) {
              showToast("❌ Broadcast failed", "error");
            }
          }}
          onCancel={() => setShowBroadcastModal(false)}
        />
      )}

      {/* Toast notification */}
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
