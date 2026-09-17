// // export default function Settings() {
// //   return <div><h1 className="page-title">Settings</h1><div className="card">Coming soon...</div></div>;
// // }

// import { useState, useEffect } from "react";
// import api from "../api";
// import ImportHistoryModal from "../components/ImportHistoryModal";
// import TeamMemberModal from "../components/TeamMemberModal";

// export default function Settings() {
//   const [tab, setTab] = useState("team");
//   const [team, setTeam] = useState([]);
//   const [phrases, setPhrases] = useState([]);
//   const [config, setConfig] = useState({});
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState("");
//   const [showImport, setShowImport] = useState(false);
//   const [showMemberModal, setShowMemberModal] = useState(false);
//   const [editingMember, setEditingMember] = useState(null);

//   const fetchAll = async () => {
//     setLoading(true);
//     try {
//       const [t, p, c] = await Promise.all([
//         api.get("/settings/team"),
//         api.get("/settings/phrases"),
//         api.get("/settings/config"),
//       ]);
//       setTeam(t.data);
//       setPhrases(p.data);
//       setConfig(c.data);
//       setError("");
//     } catch (err) {
//       setError("Failed to load settings.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchAll();
//     fetchTeam();
//   }, []);

//   // Team Handlers
//   // const addTeamMember = async () => {
//   //   const phone = prompt("Enter phone number (digits only):");
//   //   if (!phone) return;
//   //   const name = prompt("Enter name:");
//   //   if (!name) return;
//   //   try {
//   //     await api.post("/settings/team", { phone, name });
//   //     fetchAll();
//   //   } catch (err) {
//   //     alert(err.response?.data?.message || "Failed to add member");
//   //   }
//   // };

//   // const deleteTeamMember = async (id) => {
//   //   if (!confirm("Delete this team member?")) return;
//   //   try {
//   //     await api.delete(`/settings/team/${id}`);
//   //     fetchAll();
//   //   } catch (err) {
//   //     alert(err.response?.data?.message || "Failed to delete");
//   //   }
//   // };

//   // Phrase Handlers
//   const addPhrase = async () => {
//     const phrase = prompt("Enter phrase:");
//     if (!phrase) return;
//     const kind = prompt("Type (ask or chase):", "ask");
//     try {
//       await api.post("/settings/phrases", { phrase, kind });
//       fetchAll();
//     } catch (err) {
//       alert(err.response?.data?.message || "Failed to add phrase");
//     }
//   };

//   const deletePhrase = async (id) => {
//     if (!confirm("Delete this phrase?")) return;
//     try {
//       await api.delete(`/settings/phrases/${id}`);
//       fetchAll();
//     } catch (err) {
//       alert("Failed to delete");
//     }
//   };

//   // Config Handler
//   const saveConfig = async () => {
//     try {
//       await api.post("/settings/config", payload);
//       alert("Settings saved!");
//       fetchAll();
//     } catch (err) {
//       alert("Failed to save settings");
//     }
//   };
//   // ─── Fetch the pricing team from backend ───
//   const fetchTeam = async () => {
//     try {
//       const res = await api.get("/settings/team");
//       setTeam(res.data); // This assumes your state variable is called 'team'
//     } catch (err) {
//       console.error("Failed to fetch team", err);
//     }
//   };

//   const handleAddMember = () => {
//     setEditingMember(null);
//     setShowMemberModal(true);
//   };

//   const handleEditMember = (member) => {
//     setEditingMember(member);
//     setShowMemberModal(true);
//   };

//   const handleDeleteMember = async (id, name) => {
//     if (!window.confirm(`Delete ${name}? This cannot be undone.`)) return;
//     try {
//       await api.delete(`/settings/team/${id}`);
//       fetchTeam(); // refresh list
//     } catch (err) {
//       alert("Delete failed");
//     }
//   };

//   if (loading) return <div className="card">Loading settings...</div>;
//   if (error)
//     return (
//       <div className="card" style={{ color: "var(--danger)" }}>
//         {error}
//       </div>
//     );

//   return (
//     <div>
//       <h1 className="page-title">Settings</h1>
//       {/* Tabs */}
//       <div
//         className="row"
//         style={{
//           borderBottom: "2px solid var(--border)",
//           marginBottom: "20px",
//         }}
//       >
//         <button
//           className={tab === "team" ? "primary" : "secondary"}
//           onClick={() => setTab("team")}
//           style={{ borderRadius: "0", borderBottom: "none" }}
//         >
//           Pricing Team
//         </button>
//         <button
//           className={tab === "phrases" ? "primary" : "secondary"}
//           onClick={() => setTab("phrases")}
//           style={{ borderRadius: "0", borderBottom: "none" }}
//         >
//           Phrases
//         </button>
//         <button
//           className={tab === "config" ? "primary" : "secondary"}
//           onClick={() => setTab("config")}
//           style={{ borderRadius: "0", borderBottom: "none" }}
//         >
//           Integrations
//         </button>
//         <button
//           className={tab === "history" ? "primary" : "secondary"}
//           onClick={() => setTab("history")}
//           style={{ borderRadius: "0", borderBottom: "none" }}
//         >
//           Inquiry History
//         </button>
//       </div>
//       {/* Pricing Team Tab
//       // {tab === "team" && (
//         <div className="card" style={{ padding: 0 }}>
//           <div
//             className="between"
//             style={{
//               padding: "16px 20px",
//               borderBottom: "1px solid var(--border)",
//             }}
//           >
//             <h2 style={{ fontSize: "16px", fontWeight: "600" }}>
//               Pricing Team Roster
//             </h2>
//             <button className="small primary" onClick={addTeamMember}>
//               + Add Member
//             </button>
//           </div>
//           <table>
//             <thead>
//               <tr>
//                 <th>Phone</th>
//                 <th>Name</th>
//                 <th>Role</th>
//                 <th>Assign Order</th>
//                 <th>Active</th>
//                 <th>Default</th>
//                 <th>Actions</th>
//               </tr>
//             </thead>
//             <tbody>
//               {team.map((m) => (
//                 <tr key={m.id}>
//                   <td>{m.phone}</td>
//                   <td style={{ fontWeight: "600" }}>{m.name}</td>
//                   <td>{m.role || "-"}</td>
//                   <td>{m.assign_order}</td>
//                   <td>{m.active ? "✅" : "❌"}</td>
//                   <td>{m.is_default ? "⭐" : "-"}</td>
//                   <td>
//                     <button
//                       className="small danger"
//                       onClick={() => deleteTeamMember(m.id)}
//                     >
//                       Delete
//                     </button>
//                   </td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </div>
//       )} */}
//       {tab === "team" && (
//         <div className="card" style={{ padding: 0 }}>
//           <div
//             style={{
//               padding: "16px 20px",
//               borderBottom: "1px solid var(--border)",
//               display: "flex",
//               justifyContent: "space-between",
//               alignItems: "center",
//             }}
//           >
//             <h2 style={{ fontSize: "16px", fontWeight: "600" }}>
//               Pricing Team Roster
//             </h2>
//             <button
//               className="primary"
//               onClick={handleAddMember}
//               style={{ padding: "6px 16px", fontSize: "13px" }}
//             >
//               + Add Member
//             </button>
//           </div>
//           <div style={{ overflowX: "auto" }}>
//             <table>
//               <thead>
//                 <tr>
//                   <th>Phone</th>
//                   <th>Name</th>
//                   <th>Email</th>
//                   <th>Role</th>
//                   <th>Assign Order</th>
//                   <th>Active</th>
//                   <th>Default</th>
//                   <th>Actions</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {team.map((m) => (
//                   <tr key={m.id}>
//                     <td>{m.phone}</td>
//                     <td>
//                       <strong>{m.name}</strong>
//                     </td>
//                     <td style={{ fontSize: "12px" }}>{m.email || "-"}</td>
//                     <td style={{ fontSize: "12px" }}>{m.role || "-"}</td>
//                     <td>{m.assign_order}</td>

//                     {/* ─── Clickable Active Toggle ─── */}
//                     <td
//                       style={{ cursor: "pointer", fontSize: "16px" }}
//                       onClick={() => toggleActive(m)}
//                       title={
//                         m.active ? "Click to deactivate" : "Click to activate"
//                       }
//                     >
//                       {m.active ? "✅" : "❌"}
//                     </td>

//                     <td>{m.is_default ? "✅" : "-"}</td>

//                     {/* ─── Actions Column ─── */}
//                     <td
//                       style={{
//                         display: "flex",
//                         gap: "4px",
//                         flexWrap: "wrap",
//                       }}
//                     >
//                       <button
//                         className="small primary"
//                         onClick={() => handleEditMember(m)}
//                       >
//                         Edit
//                       </button>

//                       {/* Delete button removed to prevent 409 errors */}

//                       <button
//                         className="small danger"
//                         onClick={() => handleDeleteMember(m.id)}
//                       >
//                         Delete
//                       </button>
//                     </td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         </div>
//       )}
//       {/* ─── The Modal ─── */}
//       {showMemberModal && (
//         <TeamMemberModal
//           member={editingMember}
//           onClose={() => setShowMemberModal(false)}
//           onSaved={fetchTeam}
//         />
//       )}
//       {/* Phrases Tab */}
//       {tab === "phrases" && (
//         <div className="card" style={{ padding: 0 }}>
//           <div
//             className="between"
//             style={{
//               padding: "16px 20px",
//               borderBottom: "1px solid var(--border)",
//             }}
//           >
//             <h2 style={{ fontSize: "16px", fontWeight: "600" }}>
//               Classification Phrases
//             </h2>
//             <button className="small primary" onClick={addPhrase}>
//               + Add Phrase
//             </button>
//           </div>
//           <table>
//             <thead>
//               <tr>
//                 <th>Phrase</th>
//                 <th>Type</th>
//                 <th>Actions</th>
//               </tr>
//             </thead>
//             <tbody>
//               {phrases.length === 0 ? (
//                 <tr>
//                   <td
//                     colSpan="3"
//                     style={{ color: "var(--text-muted)", textAlign: "center" }}
//                   >
//                     No custom phrases yet.
//                   </td>
//                 </tr>
//               ) : (
//                 phrases.map((p) => (
//                   <tr key={p.id}>
//                     <td style={{ fontWeight: "500" }}>{p.phrase}</td>
//                     <td>
//                       <span
//                         className="badge"
//                         style={{
//                           background:
//                             p.kind === "ask"
//                               ? "var(--light-amber)"
//                               : "var(--light-gray)",
//                         }}
//                       >
//                         {p.kind}
//                       </span>
//                     </td>
//                     <td>
//                       <button
//                         className="small danger"
//                         onClick={() => deletePhrase(p.id)}
//                       >
//                         Delete
//                       </button>
//                     </td>
//                   </tr>
//                 ))
//               )}
//             </tbody>
//           </table>
//         </div>
//       )}

//       {tab === "config" && (
//         <div className="card">
//           <h2
//             style={{
//               fontSize: "16px",
//               fontWeight: "600",
//               marginBottom: "16px",
//             }}
//           >
//             Integration Settings
//           </h2>

//           <div
//             className="col"
//             style={{ display: "flex", flexDirection: "column", gap: "20px" }}
//           >
//             {/* ─── Maytapi Configuration ─── */}
//             <div
//               style={{
//                 padding: "16px",
//                 background: "var(--light-gray)",
//                 borderRadius: "8px",
//               }}
//             >
//               <h3
//                 style={{
//                   fontSize: "14px",
//                   fontWeight: "600",
//                   marginBottom: "12px",
//                 }}
//               >
//                 Maytapi WhatsApp Configuration
//               </h3>

//               <div className="row" style={{ flexWrap: "wrap", gap: "12px" }}>
//                 <div style={{ flex: 1, minWidth: "250px" }}>
//                   <label
//                     style={{
//                       display: "block",
//                       marginBottom: "6px",
//                       fontSize: "12px",
//                       color: "var(--text-muted)",
//                     }}
//                   >
//                     API Key{" "}
//                     {config.maytapi_api_key_is_set && (
//                       <span style={{ color: "var(--success)" }}>(set)</span>
//                     )}
//                   </label>
//                   <input
//                     type="password"
//                     placeholder="Leave blank to keep existing"
//                     onChange={(e) =>
//                       setConfig({ ...config, maytapi_api_key: e.target.value })
//                     }
//                     required
//                   />
//                 </div>
//                 <div style={{ flex: 1, minWidth: "200px" }}>
//                   <label
//                     style={{
//                       display: "block",
//                       marginBottom: "6px",
//                       fontSize: "12px",
//                       color: "var(--text-muted)",
//                     }}
//                   >
//                     Product ID
//                   </label>
//                   <input
//                     value={config.maytapi_product_id || ""}
//                     onChange={(e) =>
//                       setConfig({
//                         ...config,
//                         maytapi_product_id: e.target.value,
//                       })
//                     }
//                   />
//                 </div>
//                 <div style={{ flex: 1, minWidth: "150px" }}>
//                   <label
//                     style={{
//                       display: "block",
//                       marginBottom: "6px",
//                       fontSize: "12px",
//                       color: "var(--text-muted)",
//                     }}
//                   >
//                     Phone ID
//                   </label>
//                   <input
//                     value={config.maytapi_phone_id || ""}
//                     onChange={(e) =>
//                       setConfig({ ...config, maytapi_phone_id: e.target.value })
//                     }
//                   />
//                 </div>
//                 <button
//                   className="primary"
//                   onClick={async () => {
//                     try {
//                       const payload = {
//                         maytapi_product_id: config.maytapi_product_id || "",
//                         maytapi_phone_id: config.maytapi_phone_id || "",
//                       };
//                       // Only send API key if user typed a new one
//                       if (config.maytapi_api_key) {
//                         payload.maytapi_api_key = config.maytapi_api_key;
//                       }
//                       await api.post("/settings/config", payload);
//                       alert(
//                         "✅ Maytapi credentials saved! Scheduler will use them within 30 seconds.",
//                       );
//                       fetchAll();
//                     } catch (err) {
//                       alert("Failed to save Maytapi settings");
//                     }
//                   }}
//                   style={{ marginTop: "16px" }}
//                 >
//                   Save Maytapi Settings
//                 </button>
//               </div>

//               {/* ─── Whats App Group Management ─── */}
//             </div>

//             <div
//               style={{
//                 padding: "16px",
//                 background: "var(--light-gray)",
//                 borderRadius: "8px",
//               }}
//             >
//               <h3
//                 style={{
//                   fontSize: "14px",
//                   fontWeight: "600",
//                   marginBottom: "12px",
//                 }}
//               >
//                 {" "}
//                 Whats App Group Management
//               </h3>
//               <div style={{ marginTop: "12px" }}>
//                 <label
//                   style={{
//                     display: "block",
//                     marginBottom: "6px",
//                     fontSize: "12px",
//                     color: "var(--text-muted)",
//                   }}
//                 >
//                   WhatsApp Group ID
//                 </label>
//                 <div
//                   className="row"
//                   style={{ gap: "8px", alignItems: "flex-end" }}
//                 >
//                   <div style={{ flex: 1 }}>
//                     <input
//                       value={config.group_key || ""}
//                       onChange={(e) =>
//                         setConfig({ ...config, group_key: e.target.value })
//                       }
//                       placeholder="e.g. 120363428995537219@g.us"
//                     />
//                   </div>
//                   <button
//                     className="primary"
//                     onClick={async () => {
//                       if (!config.group_key) {
//                         alert("Please enter a Group ID");
//                         return;
//                       }
//                       if (
//                         !confirm(
//                           "This will CLOSE all open inquiries and switch to the new group. Continue?",
//                         )
//                       )
//                         return;
//                       try {
//                         const res = await api.post("/settings/switch-group", {
//                           group_id: config.group_key,
//                         });
//                         alert(`✅ ${res.data.message}`);
//                         fetchAll();
//                       } catch (err) {
//                         alert("Failed to switch group");
//                       }
//                     }}
//                   >
//                     Close All & Switch Group
//                   </button>
//                   <button
//                     className="danger"
//                     onClick={async () => {
//                       const days = prompt(
//                         "Archive inquiries older than how many days?",
//                         "7",
//                       );
//                       if (!days) return;
//                       try {
//                         const res = await api.post("/settings/cleanup-old", {
//                           days: parseInt(days),
//                         });
//                         alert(`✅ ${res.data.message}`);
//                       } catch (err) {
//                         alert("Failed to cleanup");
//                       }
//                     }}
//                   >
//                     Clean Old Data
//                   </button>
//                 </div>
//                 <p
//                   style={{
//                     fontSize: "11px",
//                     color: "var(--text-muted)",
//                     marginTop: "8px",
//                   }}
//                 >
//                   "Close All & Switch Group" archives old group inquiries and
//                   starts fresh. "Clean Old Data" archives inquiries older than X
//                   days.
//                 </p>
//               </div>
//             </div>
//             {/* ─── WhatsApp Provider ─── */}
//             <div>
//               <label
//                 style={{
//                   display: "block",
//                   marginBottom: "6px",
//                   fontSize: "13px",
//                   fontWeight: "500",
//                 }}
//               >
//                 WhatsApp Provider (automsg / maytapi)
//               </label>
//               <input
//                 value={config.wa_provider || ""}
//                 onChange={(e) =>
//                   setConfig({ ...config, wa_provider: e.target.value })
//                 }
//               />
//             </div>

//             {/* ─── AutoMSG ─── */}
//             <div
//               style={{
//                 borderTop: "1px solid var(--border)",
//                 paddingTop: "16px",
//               }}
//             >
//               <h3
//                 style={{
//                   fontSize: "14px",
//                   fontWeight: "600",
//                   marginBottom: "12px",
//                 }}
//               >
//                 AutoMSG
//               </h3>
//               <div className="row" style={{ flexWrap: "wrap" }}>
//                 <div style={{ flex: 1, minWidth: "200px" }}>
//                   <label
//                     style={{
//                       display: "block",
//                       marginBottom: "6px",
//                       fontSize: "12px",
//                       color: "var(--text-muted)",
//                     }}
//                   >
//                     Username
//                   </label>
//                   <input
//                     value={config.automsg_user || ""}
//                     onChange={(e) =>
//                       setConfig({ ...config, automsg_user: e.target.value })
//                     }
//                   />
//                 </div>
//                 <div style={{ flex: 1, minWidth: "200px" }}>
//                   <label
//                     style={{
//                       display: "block",
//                       marginBottom: "6px",
//                       fontSize: "12px",
//                       color: "var(--text-muted)",
//                     }}
//                   >
//                     Password{" "}
//                     {config.automsg_pass_is_set && (
//                       <span style={{ color: "var(--success)" }}>(set)</span>
//                     )}
//                   </label>
//                   <input
//                     type="password"
//                     placeholder="Leave blank to keep existing"
//                     onChange={(e) =>
//                       setConfig({ ...config, automsg_pass: e.target.value })
//                     }
//                   />
//                 </div>
//               </div>
//             </div>

//             {/* ─── Email SMTP ─── */}
//             <div
//               style={{
//                 borderTop: "1px solid var(--border)",
//                 paddingTop: "16px",
//               }}
//             >
//               <h3
//                 style={{
//                   fontSize: "14px",
//                   fontWeight: "600",
//                   marginBottom: "12px",
//                 }}
//               >
//                 Email (SMTP)
//               </h3>
//               <div className="row" style={{ flexWrap: "wrap" }}>
//                 <div style={{ flex: 1, minWidth: "200px" }}>
//                   <label
//                     style={{
//                       display: "block",
//                       marginBottom: "6px",
//                       fontSize: "12px",
//                       color: "var(--text-muted)",
//                     }}
//                   >
//                     Host
//                   </label>
//                   <input
//                     value={config.smtp_host || ""}
//                     onChange={(e) =>
//                       setConfig({ ...config, smtp_host: e.target.value })
//                     }
//                   />
//                 </div>
//                 <div style={{ flex: 1, minWidth: "100px" }}>
//                   <label
//                     style={{
//                       display: "block",
//                       marginBottom: "6px",
//                       fontSize: "12px",
//                       color: "var(--text-muted)",
//                     }}
//                   >
//                     Port
//                   </label>
//                   <input
//                     value={config.smtp_port || ""}
//                     onChange={(e) =>
//                       setConfig({ ...config, smtp_port: e.target.value })
//                     }
//                   />
//                 </div>
//                 <div style={{ flex: 1, minWidth: "200px" }}>
//                   <label
//                     style={{
//                       display: "block",
//                       marginBottom: "6px",
//                       fontSize: "12px",
//                       color: "var(--text-muted)",
//                     }}
//                   >
//                     User
//                   </label>
//                   <input
//                     value={config.smtp_user || ""}
//                     onChange={(e) =>
//                       setConfig({ ...config, smtp_user: e.target.value })
//                     }
//                   />
//                 </div>
//                 <div style={{ flex: 1, minWidth: "200px" }}>
//                   <label
//                     style={{
//                       display: "block",
//                       marginBottom: "6px",
//                       fontSize: "12px",
//                       color: "var(--text-muted)",
//                     }}
//                   >
//                     Password{" "}
//                     {config.smtp_pass_is_set && (
//                       <span style={{ color: "var(--success)" }}>(set)</span>
//                     )}
//                   </label>
//                   <input
//                     type="password"
//                     placeholder="Leave blank to keep existing"
//                     onChange={(e) =>
//                       setConfig({ ...config, smtp_pass: e.target.value })
//                     }
//                   />
//                 </div>
//               </div>
//             </div>

//             {/* ─── Coordinator ─── */}
//             <div
//               style={{
//                 borderTop: "1px solid var(--border)",
//                 paddingTop: "16px",
//               }}
//             >
//               <h3
//                 style={{
//                   fontSize: "14px",
//                   fontWeight: "600",
//                   marginBottom: "12px",
//                 }}
//               >
//                 Coordinator
//               </h3>
//               <div className="row" style={{ flexWrap: "wrap" }}>
//                 <div style={{ flex: 1, minWidth: "200px" }}>
//                   <label
//                     style={{
//                       display: "block",
//                       marginBottom: "6px",
//                       fontSize: "12px",
//                       color: "var(--text-muted)",
//                     }}
//                   >
//                     Name
//                   </label>
//                   <input
//                     value={config.coordinator_name || ""}
//                     onChange={(e) =>
//                       setConfig({ ...config, coordinator_name: e.target.value })
//                     }
//                   />
//                 </div>
//                 <div style={{ flex: 1, minWidth: "200px" }}>
//                   <label
//                     style={{
//                       display: "block",
//                       marginBottom: "6px",
//                       fontSize: "12px",
//                       color: "var(--text-muted)",
//                     }}
//                   >
//                     Email
//                   </label>
//                   <input
//                     value={config.coordinator_email || ""}
//                     onChange={(e) =>
//                       setConfig({
//                         ...config,
//                         coordinator_email: e.target.value,
//                       })
//                     }
//                   />
//                 </div>
//               </div>
//             </div>

//             <button
//               className="primary"
//               onClick={saveConfig}
//               style={{ marginTop: "8px", alignSelf: "flex-start" }}
//             >
//               Save All Settings
//             </button>
//           </div>
//         </div>
//       )}
//       {/*
// History Tab */}
//       {tab === "history" && (
//         <div className="card">
//           <button className="primary" onClick={() => setShowImport(true)}>
//             Import History
//           </button>
//           {showImport && (
//             <ImportHistoryModal onClose={() => setShowImport(false)} />
//           )}
//         </div>
//       )}
//     </div>
//   );
// }

import { useState, useEffect } from "react";
import api from "../api";
// import ImportHistoryModal from "../components/ImportHistoryModal";
import TeamMemberModal from "../components/TeamMemberModal";

export default function Settings() {
  const [tab, setTab] = useState("team");
  const [team, setTeam] = useState([]);
  const [phrases, setPhrases] = useState([]);
  const [config, setConfig] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [editingMember, setEditingMember] = useState(null);

  // ─── History state ───
  const [historyStartDate, setHistoryStartDate] = useState("");
  const [historyEndDate, setHistoryEndDate] = useState("");
  const [historyData, setHistoryData] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [autoWhatsAppEnabled, setAutoWhatsAppEnabled] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [t, p, c] = await Promise.all([
        api.get("/settings/team"),
        api.get("/settings/phrases"),
        api.get("/settings/config"),
      ]);
      setTeam(t.data);
      setPhrases(p.data);
      setConfig(c.data);
      setError("");
    } catch (err) {
      setError("Failed to load settings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    fetchTeam();
    api
      .get("/settings/auto-whatsapp")
      .then((res) => setAutoWhatsAppEnabled(res.data.autoWhatsAppEnabled))
      .catch(() => {});
  }, []);

  // Phrase Handlers
  const addPhrase = async () => {
    const phrase = prompt("Enter phrase:");
    if (!phrase) return;
    const kind = prompt("Type (ask or chase):", "ask");
    try {
      await api.post("/settings/phrases", { phrase, kind });
      fetchAll();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to add phrase");
    }
  };

  const deletePhrase = async (id) => {
    if (!confirm("Delete this phrase?")) return;
    try {
      await api.delete(`/settings/phrases/${id}`);
      fetchAll();
    } catch (err) {
      alert("Failed to delete");
    }
  };

  // Config Handler
  const saveConfig = async () => {
    try {
      const payload = { ...config };
      if (!payload.maytapi_api_key) delete payload.maytapi_api_key;
      if (!payload.automsg_pass) delete payload.automsg_pass;
      if (!payload.smtp_pass) delete payload.smtp_pass;
      await api.post("/settings/config", payload);
      alert("✅ Settings saved!");
      fetchAll();
    } catch (err) {
      alert("Failed to save settings");
    }
  };

  const fetchTeam = async () => {
    try {
      const res = await api.get("/settings/team");
      setTeam(res.data);
    } catch (err) {
      console.error("Failed to fetch team", err);
    }
  };

  const handleAddMember = () => {
    setEditingMember(null);
    setShowMemberModal(true);
  };

  const handleEditMember = (member) => {
    setEditingMember(member);
    setShowMemberModal(true);
  };

  const handleDeleteMember = async (id, name) => {
    if (!window.confirm(`Delete ${name}? This cannot be undone.`)) return;
    try {
      await api.delete(`/settings/team/${id}`);
      fetchTeam();
    } catch (err) {
      alert("Delete failed");
    }
  };

  const toggleActive = async (member) => {
    try {
      await api.post(`/settings/team/${member.id}`, {
        ...member,
        active: !member.active,
      });
      fetchTeam();
    } catch (err) {
      alert("Failed to toggle active status");
    }
  };

  // ─── Fetch history data for the selected date range ───
  const fetchHistory = async () => {
    if (!historyStartDate) {
      setHistoryError("Please select a From Date");
      return;
    }
    setHistoryLoading(true);
    setHistoryError("");
    try {
      const res = await api.get("/inquiries", {
        params: {
          startDate: historyStartDate,
          endDate: historyEndDate || undefined,
          days: 9999, // override default days filter
        },
      });
      setHistoryData(res.data);
      if (res.data.length === 0) {
        setHistoryError("No inquiries found in this date range.");
      }
    } catch (err) {
      setHistoryError("Failed to fetch history.");
    } finally {
      setHistoryLoading(false);
    }
  };

  // // ─── Download CSV for the selected date range ───
  // const downloadHistoryCsv = () => {
  //   if (!historyStartDate) {
  //     alert("Please select a From Date first");
  //     return;
  //   }
  //   const params = new URLSearchParams({ startDate: historyStartDate });
  //   if (historyEndDate) params.append("endDate", historyEndDate);
  //   window.open(`/api/export.csv?${params.toString()}`, "_blank");
  // };
  // ─── Download CSV for the selected date range ───
  const downloadHistoryCsv = async () => {
    if (!historyStartDate) {
      alert("Please select a From Date first");
      return;
    }
    try {
      const params = { startDate: historyStartDate };
      if (historyEndDate) params.endDate = historyEndDate;

      const res = await api.get("/export.csv", {
        params,
        responseType: "blob",
      });

      // Trigger the browser download from the authenticated response
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = `inquiries-${historyStartDate}${
        historyEndDate ? `-to-${historyEndDate}` : ""
      }.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert("Failed to export CSV — please try again.");
    }
  };

  if (loading) return <div className="card">Loading settings...</div>;
  if (error)
    return (
      <div className="card" style={{ color: "var(--danger)" }}>
        {error}
      </div>
    );

  return (
    <div>
      <h1 className="page-title">Settings</h1>

      {/* Tabs */}
      <div
        className="row"
        style={{
          borderBottom: "2px solid var(--border)",
          marginBottom: "20px",
        }}
      >
        <button
          className={tab === "team" ? "primary" : "secondary"}
          onClick={() => setTab("team")}
          style={{ borderRadius: "0", borderBottom: "none" }}
        >
          Pricing Team
        </button>
        <button
          className={tab === "phrases" ? "primary" : "secondary"}
          onClick={() => setTab("phrases")}
          style={{ borderRadius: "0", borderBottom: "none" }}
        >
          Phrases
        </button>
        <button
          className={tab === "config" ? "primary" : "secondary"}
          onClick={() => setTab("config")}
          style={{ borderRadius: "0", borderBottom: "none" }}
        >
          Integrations
        </button>
        <button
          className={tab === "history" ? "primary" : "secondary"}
          onClick={() => setTab("history")}
          style={{ borderRadius: "0", borderBottom: "none" }}
        >
          Inquiry History
        </button>
      </div>

      {/* Pricing Team Tab */}
      {tab === "team" && (
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
            <h2 style={{ fontSize: "16px", fontWeight: "600" }}>
              Pricing Team Roster
            </h2>
            <button
              className="primary"
              onClick={handleAddMember}
              style={{ padding: "6px 16px", fontSize: "13px" }}
            >
              + Add Member
            </button>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>Phone</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Assign Order</th>
                  <th>Active</th>
                  <th>Default</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {team.map((m) => (
                  <tr key={m.id}>
                    <td>{m.phone}</td>
                    <td>
                      <strong>{m.name}</strong>
                    </td>
                    <td style={{ fontSize: "12px" }}>{m.email || "-"}</td>
                    <td style={{ fontSize: "12px" }}>{m.role || "-"}</td>
                    <td>{m.assign_order}</td>
                    <td
                      style={{ cursor: "pointer", fontSize: "16px" }}
                      onClick={() => toggleActive(m)}
                      title={
                        m.active ? "Click to deactivate" : "Click to activate"
                      }
                    >
                      {m.active ? "✅" : "❌"}
                    </td>
                    <td>{m.is_default ? "✅" : "-"}</td>
                    <td
                      style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}
                    >
                      <button
                        className="small primary"
                        onClick={() => handleEditMember(m)}
                      >
                        Edit
                      </button>
                      <button
                        className="small danger"
                        onClick={() => handleDeleteMember(m.id, m.name)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showMemberModal && (
        <TeamMemberModal
          member={editingMember}
          onClose={() => setShowMemberModal(false)}
          onSaved={fetchTeam}
        />
      )}

      {/* Phrases Tab */}
      {tab === "phrases" && (
        <div className="card" style={{ padding: 0 }}>
          <div
            className="between"
            style={{
              padding: "16px 20px",
              borderBottom: "1px solid var(--border)",
            }}
          >
            <h2 style={{ fontSize: "16px", fontWeight: "600" }}>
              Classification Phrases
            </h2>
            <button className="small primary" onClick={addPhrase}>
              + Add Phrase
            </button>
          </div>
          <table>
            <thead>
              <tr>
                <th>Phrase</th>
                <th>Type</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {phrases.length === 0 ? (
                <tr>
                  <td
                    colSpan="3"
                    style={{ color: "var(--text-muted)", textAlign: "center" }}
                  >
                    No custom phrases yet.
                  </td>
                </tr>
              ) : (
                phrases.map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: "500" }}>{p.phrase}</td>
                    <td>
                      <span
                        className="badge"
                        style={{
                          background:
                            p.kind === "ask"
                              ? "var(--light-amber)"
                              : "var(--light-gray)",
                        }}
                      >
                        {p.kind}
                      </span>
                    </td>
                    <td>
                      <button
                        className="small danger"
                        onClick={() => deletePhrase(p.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Config Tab */}
      {tab === "config" && (
        <div className="card">
          <h2
            style={{
              fontSize: "16px",
              fontWeight: "600",
              marginBottom: "16px",
            }}
          >
            Integration Settings
          </h2>
          <div
            className="col"
            style={{ display: "flex", flexDirection: "column", gap: "20px" }}
          >
            <div
              style={{
                padding: "16px",
                background: "var(--light-gray)",
                borderRadius: "8px",
              }}
            >
              <h3
                style={{
                  fontSize: "14px",
                  fontWeight: "600",
                  marginBottom: "12px",
                }}
              >
                Maytapi WhatsApp Configuration
              </h3>
              <div className="row" style={{ flexWrap: "wrap", gap: "12px" }}>
                <div style={{ flex: 1, minWidth: "250px" }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "6px",
                      fontSize: "12px",
                      color: "var(--text-muted)",
                    }}
                  >
                    API Key{" "}
                    {config.maytapi_api_key_is_set && (
                      <span style={{ color: "var(--success)" }}>(set)</span>
                    )}
                  </label>
                  <input
                    type="password"
                    placeholder="Leave blank to keep existing"
                    onChange={(e) =>
                      setConfig({ ...config, maytapi_api_key: e.target.value })
                    }
                  />
                </div>
                <div style={{ flex: 1, minWidth: "200px" }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "6px",
                      fontSize: "12px",
                      color: "var(--text-muted)",
                    }}
                  >
                    Product ID
                  </label>
                  <input
                    value={config.maytapi_product_id || ""}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        maytapi_product_id: e.target.value,
                      })
                    }
                  />
                </div>
                <div style={{ flex: 1, minWidth: "150px" }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "6px",
                      fontSize: "12px",
                      color: "var(--text-muted)",
                    }}
                  >
                    Phone ID
                  </label>
                  <input
                    value={config.maytapi_phone_id || ""}
                    onChange={(e) =>
                      setConfig({ ...config, maytapi_phone_id: e.target.value })
                    }
                  />
                </div>
                <button
                  className="primary"
                  onClick={async () => {
                    try {
                      const payload = {
                        maytapi_product_id: config.maytapi_product_id || "",
                        maytapi_phone_id: config.maytapi_phone_id || "",
                      };
                      if (config.maytapi_api_key)
                        payload.maytapi_api_key = config.maytapi_api_key;
                      await api.post("/settings/config", payload);
                      alert("✅ Maytapi credentials saved!");
                      fetchAll();
                    } catch (err) {
                      alert("Failed to save Maytapi settings");
                    }
                  }}
                  style={{ marginTop: "16px" }}
                >
                  Save Maytapi Settings
                </button>
              </div>
            </div>
            <div
              style={{
                padding: "16px",
                background: "var(--light-gray)",
                borderRadius: "8px",
              }}
            >
              <h3
                style={{
                  fontSize: "14px",
                  fontWeight: "600",
                  marginBottom: "12px",
                }}
              >
                WhatsApp Group Management
              </h3>
              <div style={{ marginTop: "12px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "6px",
                    fontSize: "12px",
                    color: "var(--text-muted)",
                  }}
                >
                  WhatsApp Group ID
                </label>
                <div
                  className="row"
                  style={{ gap: "8px", alignItems: "flex-end" }}
                >
                  <div style={{ flex: 1 }}>
                    <input
                      value={config.group_key || ""}
                      onChange={(e) =>
                        setConfig({ ...config, group_key: e.target.value })
                      }
                      placeholder="e.g. 120363428995537219@g.us"
                    />
                  </div>
                  <button
                    className="primary"
                    onClick={async () => {
                      if (!config.group_key) {
                        alert("Please enter a Group ID");
                        return;
                      }
                      if (
                        !confirm(
                          "This will CLOSE all open inquiries and switch to the new group. Continue?",
                        )
                      )
                        return;
                      try {
                        const res = await api.post("/settings/switch-group", {
                          group_id: config.group_key,
                        });
                        alert(`✅ ${res.data.message}`);
                        fetchAll();
                      } catch (err) {
                        alert("Failed to switch group");
                      }
                    }}
                  >
                    Close All & Switch Group
                  </button>
                  <button
                    className="danger"
                    onClick={async () => {
                      const days = prompt(
                        "Archive inquiries older than how many days?",
                        "7",
                      );
                      if (!days) return;
                      try {
                        const res = await api.post("/settings/cleanup-old", {
                          days: parseInt(days),
                        });
                        alert(`✅ ${res.data.message}`);
                      } catch (err) {
                        alert("Failed to cleanup");
                      }
                    }}
                  >
                    Clean Old Data
                  </button>
                </div>
                <p
                  style={{
                    fontSize: "11px",
                    color: "var(--text-muted)",
                    marginTop: "8px",
                  }}
                >
                  "Close All & Switch Group" archives old group inquiries and
                  starts fresh. "Clean Old Data" archives inquiries older than X
                  days.
                </p>
              </div>
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "6px",
                  fontSize: "13px",
                  fontWeight: "500",
                }}
              >
                WhatsApp Provider (automsg / maytapi)
              </label>
              <input
                value={config.wa_provider || ""}
                onChange={(e) =>
                  setConfig({ ...config, wa_provider: e.target.value })
                }
              />
            </div>
            <div
              style={{
                borderTop: "1px solid var(--border)",
                paddingTop: "16px",
              }}
            >
              <h3
                style={{
                  fontSize: "14px",
                  fontWeight: "600",
                  marginBottom: "12px",
                }}
              >
                AutoMSG
              </h3>
              <div className="row" style={{ flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: "200px" }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "6px",
                      fontSize: "12px",
                      color: "var(--text-muted)",
                    }}
                  >
                    Username
                  </label>
                  <input
                    value={config.automsg_user || ""}
                    onChange={(e) =>
                      setConfig({ ...config, automsg_user: e.target.value })
                    }
                  />
                </div>
                <div style={{ flex: 1, minWidth: "200px" }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "6px",
                      fontSize: "12px",
                      color: "var(--text-muted)",
                    }}
                  >
                    Password{" "}
                    {config.automsg_pass_is_set && (
                      <span style={{ color: "var(--success)" }}>(set)</span>
                    )}
                  </label>
                  <input
                    type="password"
                    placeholder="Leave blank to keep existing"
                    onChange={(e) =>
                      setConfig({ ...config, automsg_pass: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>
            <div
              style={{
                borderTop: "1px solid var(--border)",
                paddingTop: "16px",
              }}
            >
              <h3
                style={{
                  fontSize: "14px",
                  fontWeight: "600",
                  marginBottom: "12px",
                }}
              >
                Email (SMTP)
              </h3>
              <div className="row" style={{ flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: "200px" }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "6px",
                      fontSize: "12px",
                      color: "var(--text-muted)",
                    }}
                  >
                    Host
                  </label>
                  <input
                    value={config.smtp_host || ""}
                    onChange={(e) =>
                      setConfig({ ...config, smtp_host: e.target.value })
                    }
                  />
                </div>
                <div style={{ flex: 1, minWidth: "100px" }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "6px",
                      fontSize: "12px",
                      color: "var(--text-muted)",
                    }}
                  >
                    Port
                  </label>
                  <input
                    value={config.smtp_port || ""}
                    onChange={(e) =>
                      setConfig({ ...config, smtp_port: e.target.value })
                    }
                  />
                </div>
                <div style={{ flex: 1, minWidth: "200px" }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "6px",
                      fontSize: "12px",
                      color: "var(--text-muted)",
                    }}
                  >
                    User
                  </label>
                  <input
                    value={config.smtp_user || ""}
                    onChange={(e) =>
                      setConfig({ ...config, smtp_user: e.target.value })
                    }
                  />
                </div>
                <div style={{ flex: 1, minWidth: "200px" }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "6px",
                      fontSize: "12px",
                      color: "var(--text-muted)",
                    }}
                  >
                    Password{" "}
                    {config.smtp_pass_is_set && (
                      <span style={{ color: "var(--success)" }}>(set)</span>
                    )}
                  </label>
                  <input
                    type="password"
                    placeholder="Leave blank to keep existing"
                    onChange={(e) =>
                      setConfig({ ...config, smtp_pass: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>
            <div
              style={{
                borderTop: "1px solid var(--border)",
                paddingTop: "16px",
              }}
            >
              <h3
                style={{
                  fontSize: "14px",
                  fontWeight: "600",
                  marginBottom: "12px",
                }}
              >
                Coordinator
              </h3>
              <div className="row" style={{ flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: "200px" }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "6px",
                      fontSize: "12px",
                      color: "var(--text-muted)",
                    }}
                  >
                    Name
                  </label>
                  <input
                    value={config.coordinator_name || ""}
                    onChange={(e) =>
                      setConfig({ ...config, coordinator_name: e.target.value })
                    }
                  />
                </div>
                <div style={{ flex: 1, minWidth: "200px" }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "6px",
                      fontSize: "12px",
                      color: "var(--text-muted)",
                    }}
                  >
                    Email
                  </label>
                  <input
                    value={config.coordinator_email || ""}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        coordinator_email: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
            </div>
            <div
              className="row"
              style={{
                gap: "16px",
                alignItems: "center",
                marginBottom: "16px",
              }}
            >
              <label style={{ fontWeight: "600", fontSize: "14px" }}>
                WhatsApp Auto Message
              </label>
              <button
                className={autoWhatsAppEnabled ? "primary" : "secondary"}
                onClick={async () => {
                  const newVal = !autoWhatsAppEnabled;
                  try {
                    await api.post("/settings/auto-whatsapp", {
                      enabled: newVal,
                    });
                    setAutoWhatsAppEnabled(newVal);
                    alert(
                      newVal
                        ? "✅ Auto WhatsApp enabled"
                        : "⏸️ Auto WhatsApp disabled",
                    );
                  } catch (err) {
                    alert("❌ Failed to update setting");
                  }
                }}
                style={{ padding: "8px 20px" }}
              >
                {autoWhatsAppEnabled ? "ON" : "OFF"}
              </button>

              <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                When ON, rate updates are sent automatically to the requester.
                When OFF, coordinator must send manually using the WhatsApp
                button.
              </span>
            </div>

            <button
              className="primary"
              onClick={saveConfig}
              style={{ marginTop: "8px", alignSelf: "flex-start" }}
            >
              Save All Settings
            </button>
          </div>
        </div>
      )}

      {/* ─── Inquiry History Tab ─── */}
      {tab === "history" && (
        <div>
          {/* Date Range Selector + Results Table + Download */}
          <div
            className="card"
            style={{ padding: "20px", marginBottom: "20px" }}
          >
            <h2
              style={{
                fontSize: "18px",
                fontWeight: "700",
                marginBottom: "8px",
              }}
            >
              📋 Inquiry History
            </h2>
            <p
              style={{
                fontSize: "14px",
                color: "var(--text-muted)",
                marginBottom: "16px",
              }}
            >
              Select a date range to view inquiry history on this page, then
              download it as CSV.
            </p>

            {/* Date inputs + buttons */}
            <div
              className="row"
              style={{ gap: "16px", flexWrap: "wrap", alignItems: "flex-end" }}
            >
              <div className="col" style={{ flex: 1, minWidth: "150px" }}>
                <label
                  style={{
                    fontSize: "12px",
                    color: "var(--text-muted)",
                    marginBottom: "4px",
                  }}
                >
                  From Date
                </label>
                <input
                  type="date"
                  value={historyStartDate}
                  onChange={(e) => setHistoryStartDate(e.target.value)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: "4px",
                    border: "1px solid var(--border)",
                    background: "var(--bg, #fff)",
                    fontSize: "14px",
                    width: "100%",
                  }}
                />
              </div>
              <div className="col" style={{ flex: 1, minWidth: "150px" }}>
                <label
                  style={{
                    fontSize: "12px",
                    color: "var(--text-muted)",
                    marginBottom: "4px",
                  }}
                >
                  To Date
                </label>
                <input
                  type="date"
                  value={historyEndDate}
                  onChange={(e) => setHistoryEndDate(e.target.value)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: "4px",
                    border: "1px solid var(--border)",
                    background: "var(--bg, #fff)",
                    fontSize: "14px",
                    width: "100%",
                  }}
                />
              </div>
              <button
                className="primary"
                onClick={fetchHistory}
                disabled={historyLoading}
                style={{ padding: "8px 20px" }}
              >
                {historyLoading ? "Loading..." : "🔍 Show History"}
              </button>
              {historyData.length > 0 && (
                <button
                  className="secondary"
                  onClick={downloadHistoryCsv}
                  style={{ padding: "8px 20px" }}
                >
                  📥 Download CSV ({historyData.length})
                </button>
              )}
            </div>

            {/* Quick presets */}
            <div
              className="row"
              style={{ gap: "8px", marginTop: "16px", flexWrap: "wrap" }}
            >
              <button
                className="small secondary"
                onClick={() => {
                  const d = new Date();
                  d.setMonth(d.getMonth() - 1);
                  setHistoryStartDate(d.toISOString().split("T")[0]);
                  setHistoryEndDate(new Date().toISOString().split("T")[0]);
                }}
              >
                Last 1 Month
              </button>
              <button
                className="small secondary"
                onClick={() => {
                  const d = new Date();
                  d.setMonth(d.getMonth() - 3);
                  setHistoryStartDate(d.toISOString().split("T")[0]);
                  setHistoryEndDate(new Date().toISOString().split("T")[0]);
                }}
              >
                Last 3 Months
              </button>
              <button
                className="small secondary"
                onClick={() => {
                  const d = new Date();
                  d.setFullYear(d.getFullYear() - 1);
                  setHistoryStartDate(d.toISOString().split("T")[0]);
                  setHistoryEndDate(new Date().toISOString().split("T")[0]);
                }}
              >
                Last 1 Year
              </button>
              <button
                className="small secondary"
                onClick={() => {
                  const d = new Date(new Date().getFullYear(), 0, 1);
                  setHistoryStartDate(d.toISOString().split("T")[0]);
                  setHistoryEndDate(new Date().toISOString().split("T")[0]);
                }}
              >
                This Year
              </button>
              <button
                className="small secondary"
                onClick={() => {
                  setHistoryStartDate("");
                  setHistoryEndDate("");
                  setHistoryData([]);
                  setHistoryError("");
                }}
              >
                Clear
              </button>
            </div>

            {/* Error message */}
            {historyError && (
              <div
                style={{
                  marginTop: "16px",
                  padding: "12px",
                  background: "#fef3c7",
                  borderRadius: "6px",
                  fontSize: "14px",
                  color: "#92400e",
                }}
              >
                {historyError}
              </div>
            )}

            {/* Results Table */}
            {historyData.length > 0 && (
              <div
                style={{
                  marginTop: "20px",
                  overflowX: "auto",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                }}
              >
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
                      <th>Rate</th>
                      <th>TAT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyData.map((inq) => (
                      <tr key={inq.id}>
                        <td>#{inq.id}</td>
                        <td>{inq.requester || "Unknown"}</td>
                        <td
                          style={{
                            maxWidth: "200px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                          title={inq.lane}
                        >
                          {inq.lane}
                        </td>
                        <td
                          style={{
                            maxWidth: "150px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                          title={inq.spec}
                        >
                          {inq.spec || "-"}
                        </td>
                        <td>
                          {inq.posted_at
                            ? new Date(inq.posted_at).toLocaleDateString(
                                "en-IN",
                                {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "numeric",
                                },
                              )
                            : "-"}
                        </td>
                        <td>
                          <span
                            className={`badge badge-${inq.status.toLowerCase().replace("_", "-")}`}
                          >
                            {inq.status.replace("_", " ")}
                          </span>
                        </td>
                        <td>{inq.assigned_to || "-"}</td>
                        <td>
                          {inq.quoted_rates ? `₹${inq.quoted_rates}` : "-"}
                        </td>
                        <td>{inq.tat || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Import WhatsApp History (existing) */}
          {/* <div className="card" style={{ padding: "20px" }}>
            <h2
              style={{
                fontSize: "18px",
                fontWeight: "700",
                marginBottom: "8px",
              }}
            >
              📤 Import WhatsApp History
            </h2>
            <p
              style={{
                fontSize: "14px",
                color: "var(--text-muted)",
                marginBottom: "16px",
              }}
            >
              Import old WhatsApp messages from Maytapi to backfill inquiry
              data.
            </p>
            <button className="primary" onClick={() => setShowImport(true)}>
              Import History
            </button>
            {showImport && (
              <ImportHistoryModal onClose={() => setShowImport(false)} />
            )}
          </div> */}
        </div>
      )}
    </div>
  );
}
