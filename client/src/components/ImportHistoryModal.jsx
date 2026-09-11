// import { useState, useEffect } from 'react';
// import api from '../api';

// export default function ImportHistoryModal({ onClose }) {
//   const [start, setStart] = useState('');
//   const [end, setEnd] = useState('');
//   const [status, setStatus] = useState(null);
//   const [polling, setPolling] = useState(false);
//   const [error, setError] = useState('');

//   const startImport = async () => {
//     setError('');
//     try {
//       const payload = {};
//       if (start) payload.start = start;
//       if (end) payload.end = end;

//       const res = await api.post('/import-history/start', payload);

//       if (res.data.error) {
//         setError(res.data.error);
//         return;
//       }

//       setPolling(true);
//       pollStatus();
//     } catch (err) {
//       setError(err.response?.data?.message || 'Failed to start import');
//     }
//   };

//   const pollStatus = async () => {
//     try {
//       const res = await api.get('/import-history/status');
//       setStatus(res.data);

//       if (res.data.running) {
//         setTimeout(pollStatus, 2000);
//       } else {
//         setPolling(false);
//       }
//     } catch (err) {
//       setError('Failed to get status');
//       setPolling(false);
//     }
//   };

//   useEffect(() => {
//     if (polling) pollStatus();
//   }, [polling]);

//   const progress = status?.progress;
//   const percent = progress?.fetched > 0
//     ? Math.round((progress.ingested / progress.fetched) * 100)
//     : 0;

//   return (
//     <div style={{
//       position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
//       background: 'rgba(0,0,0,0.5)', display: 'flex',
//       justifyContent: 'center', alignItems: 'center', zIndex: 1000
//     }} onClick={() => !polling && onClose()}>
//       <div className="card" style={{ width: '100%', maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
//         <div className="between" style={{ marginBottom: '16px' }}>
//           <h2 style={{ fontSize: '18px', fontWeight: '700' }}>Import History</h2>
//           <button className="small secondary" onClick={() => onClose()} disabled={polling}>Close</button>
//         </div>

//         {!polling && !progress?.done && (
//           <div className="col" style={{ gap: '12px' }}>
//             <div>
//               <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Start (Month or Year)</label>
//               <input
//                 type="text"
//                 placeholder="e.g. 2026-01 or 2026"
//                 value={start}
//                 onChange={e => setStart(e.target.value)}
//                 style={{ width: '100%', padding: '8px', marginTop: '4px' }}
//               />
//             </div>
//             <div>
//               <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>End (optional, for year range)</label>
//               <input
//                 type="text"
//                 placeholder="e.g. 2026-06"
//                 value={end}
//                 onChange={e => setEnd(e.target.value)}
//                 style={{ width: '100%', padding: '8px', marginTop: '4px' }}
//               />
//             </div>
//             <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
//               Leave blank for last 3 months. Use YYYY-MM for a specific month, or YYYY for a full year.
//             </p>
//             {error && <p style={{ color: 'var(--danger)', fontSize: '13px' }}>{error}</p>}
//             <button className="primary" onClick={startImport}>Start Import</button>
//           </div>
//         )}

//         {(polling || progress?.done) && progress && (
//           <div className="col" style={{ gap: '12px' }}>
//             <div style={{ fontSize: '14px', fontWeight: '600' }}>
//               {progress.label}
//             </div>
//             <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
//               {progress.message}
//             </div>

//             {progress.fetched > 0 && (
//               <>
//                 <div style={{
//                   width: '100%',
//                   height: '8px',
//                   background: 'var(--light-gray)',
//                   borderRadius: '4px',
//                   overflow: 'hidden',
//                 }}>
//                   <div style={{
//                     width: `${percent}%`,
//                     height: '100%',
//                     background: 'var(--primary, #0066ff)',
//                     transition: 'width 0.3s',
//                   }} />
//                 </div>
//                 <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
//                   {percent}% • Ingested: {progress.ingested} • Skipped: {progress.skipped} • Out of range: {progress.outOfRange}
//                 </div>
//               </>
//             )}

//             <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
//               Page: {progress.currentPage} • Fetched: {progress.fetched} • Errors: {progress.errors}
//             </div>

//             {progress.done && (
//               <button className="primary" onClick={onClose}>Done</button>
//             )}
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }

// import { useState, useEffect } from "react";
// import api from "../api";

// export default function ImportHistoryModal({ onClose }) {
//   const [start, setStart] = useState("");
//   const [end, setEnd] = useState("");
//   const [status, setStatus] = useState(null);
//   const [polling, setPolling] = useState(false);
//   const [error, setError] = useState("");

//   const startImport = async () => {
//     setError("");
//     try {
//       const payload = {};
//       if (start) payload.start = start;
//       if (end) payload.end = end;

//       const res = await api.post("/import-history/start", payload);

//       if (res.data.error) {
//         setError(res.data.error);
//         return;
//       }

//       setPolling(true);
//       pollStatus();
//     } catch (err) {
//       setError(err.response?.data?.message || "Failed to start import");
//     }
//   };

//   const stopImport = async () => {
//     try {
//       await api.post("/import-history/stop");
//     } catch (err) {
//       setError("Failed to stop import");
//     }
//   };

//   const pollStatus = async () => {
//     try {
//       const res = await api.get("/import-history/status");
//       setStatus(res.data);

//       if (res.data.running) {
//         setTimeout(pollStatus, 2000);
//       } else {
//         setPolling(false);
//       }
//     } catch (err) {
//       setError("Failed to get status");
//       setPolling(false);
//     }
//   };

//   useEffect(() => {
//     if (polling) pollStatus();
//   }, [polling]);

//   const progress = status?.progress;
//   const percent =
//     progress?.fetched > 0
//       ? Math.round((progress.ingested / progress.fetched) * 100)
//       : 0;

//   return (
//     <div
//       style={{
//         position: "fixed",
//         top: 0,
//         left: 0,
//         right: 0,
//         bottom: 0,
//         background: "rgba(0,0,0,0.5)",
//         display: "flex",
//         justifyContent: "center",
//         alignItems: "center",
//         zIndex: 1000,
//       }}
//       onClick={() => !polling && onClose()}
//     >
//       <div
//         className="card"
//         style={{ width: "100%", maxWidth: "500px" }}
//         onClick={(e) => e.stopPropagation()}
//       >
//         <div className="between" style={{ marginBottom: "16px" }}>
//           <h2 style={{ fontSize: "18px", fontWeight: "700" }}>
//             Import History
//           </h2>
//           <button
//             className="small secondary"
//             onClick={() => onClose()}
//             disabled={polling}
//           >
//             Close
//           </button>
//         </div>

//         {!polling && !progress?.done && (
//           <div className="col" style={{ gap: "12px" }}>
//             <div>
//               <label style={{ fontSize: "12px", color: "var(--text-muted)" }}>
//                 Start (Month or Year)
//               </label>
//               <input
//                 type="text"
//                 placeholder="e.g. 2026-01 or 2026"
//                 value={start}
//                 onChange={(e) => setStart(e.target.value)}
//                 style={{ width: "100%", padding: "8px", marginTop: "4px" }}
//               />
//             </div>
//             <div>
//               <label style={{ fontSize: "12px", color: "var(--text-muted)" }}>
//                 End (optional, for year range)
//               </label>
//               <input
//                 type="text"
//                 placeholder="e.g. 2026-06"
//                 value={end}
//                 onChange={(e) => setEnd(e.target.value)}
//                 style={{ width: "100%", padding: "8px", marginTop: "4px" }}
//               />
//             </div>
//             <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
//               Leave blank for last 3 months. Use YYYY-MM for a specific month,
//               or YYYY for a full year.
//             </p>
//             {error && (
//               <p style={{ color: "var(--danger)", fontSize: "13px" }}>
//                 {error}
//               </p>
//             )}
//             <button className="primary" onClick={startImport}>
//               Start Import
//             </button>
//           </div>
//         )}

//         {(polling || progress?.done) && progress && (
//           <div className="col" style={{ gap: "12px" }}>
//             <div style={{ fontSize: "14px", fontWeight: "600" }}>
//               {progress.label}
//             </div>
//             <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>
//               {progress.message}
//             </div>

//             {progress.fetched > 0 && (
//               <>
//                 <div
//                   style={{
//                     width: "100%",
//                     height: "8px",
//                     background: "var(--light-gray)",
//                     borderRadius: "4px",
//                     overflow: "hidden",
//                   }}
//                 >
//                   <div
//                     style={{
//                       width: `${percent}%`,
//                       height: "100%",
//                       background: "var(--primary, #0066ff)",
//                       transition: "width 0.3s",
//                     }}
//                   />
//                 </div>
//                 <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
//                   {percent}% • Ingested: {progress.ingested} • Skipped:{" "}
//                   {progress.skipped} • Out of range: {progress.outOfRange}
//                 </div>
//               </>
//             )}

//             <div style={{ fontSize: "12px", color: "var(--text-muted)" }}>
//               Page: {progress.currentPage} • Fetched: {progress.fetched} •
//               Errors: {progress.errors}
//             </div>

//             {progress.done ? (
//               <button className="primary" onClick={onClose}>
//                 Done
//               </button>
//             ) : (
//               <button
//                 className="secondary"
//                 style={{ color: "var(--danger)" }}
//                 onClick={stopImport}
//               >
//                 Stop Import
//               </button>
//             )}
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }
