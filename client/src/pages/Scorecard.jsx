// import { useState, useEffect } from "react";
// import api from "../api";
// import {
//   BarChart,
//   Bar,
//   XAxis,
//   YAxis,
//   CartesianGrid,
//   Tooltip,
//   ResponsiveContainer,
//   Legend,
// } from "recharts";

// export default function Scorecard() {
//   const [pricerData, setPricerData] = useState([]);
//   const [requesterData, setRequesterData] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState("");
//   const [days, setDays] = useState(7);

//   useEffect(() => {
//     fetchScorecards();
//   }, [days]);

//   const fetchScorecards = async () => {
//     setLoading(true);
//     setError("");
//     try {
//       const [pricerRes, requesterRes] = await Promise.all([
//         api.get("/inquiries/scorecard", { params: { days } }),
//         api.get("/inquiries/scorecard/requesters", { params: { days } }),
//       ]);
//       setPricerData(pricerRes.data);
//       setRequesterData(requesterRes.data);
//     } catch (err) {
//       setError("Failed to load scorecard.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   if (loading) return <div className="card">Loading scorecard...</div>;
//   if (error)
//     return (
//       <div className="card" style={{ color: "var(--danger)" }}>
//         {error}
//       </div>
//     );

//   // Prepare data for charts
//   const chartData = pricerData.map((d) => ({
//     name: d.pricer?.split(" ")[0] || "Unknown",
//     rates: d.rates_given,
//     median_min: d.median_tat_min,
//     avg_min: d.avg_tat_min,
//     within_1hr: d.within_1hr_pct,
//     over_4hr: d.over_4hr,
//     chases: d.chases_received,
//   }));
//   // Calculate dynamic width: 100px per pricer, minimum 100% of container
//   const minBarWidth = 100;
//   const chartWidth = Math.max(chartData.length * minBarWidth, 400);

//   return (
//     <div>
//       <h1 className="page-title">Scorecard</h1>

//       {/* Date filter */}
//       <div
//         className="card"
//         style={{ padding: "16px 20px", marginBottom: "16px" }}
//       >
//         <div className="col" style={{ flex: 1, minWidth: "150px" }}>
//           <label style={{ fontSize: "12px", color: "var(--text-muted)" }}>
//             Time Window
//           </label>
//           <select
//             value={days}
//             onChange={(e) => setDays(Number(e.target.value))}
//           >
//             <option value={7}>Last 7 days</option>
//             <option value={30}>Last 30 days</option>
//             <option value={90}>Last 90 days</option>
//             <option value={365}>Last 365 days</option>
//           </select>
//         </div>
//       </div>

//       {pricerData.length === 0 ? (
//         <div className="card">
//           No scorecard data yet. Once inquiries are quoted, performance metrics
//           will appear here.
//         </div>
//       ) : (
//         <>
//           {/* Pricer Charts */}
//           <div className="card">
//             <h2
//               style={{
//                 fontSize: "16px",
//                 fontWeight: "600",
//                 marginBottom: "16px",
//               }}
//             >
//               Pricer TAT Performance (Median vs Avg)
//             </h2>
//             {/* <ResponsiveContainer width="100%" height={300}>
//               <BarChart data={chartData}>
//                 <CartesianGrid strokeDasharray="3 3" stroke="#e5e8ec" />
//                 <XAxis dataKey="name" tick={{ fontSize: 12 }} />
//                 <YAxis tick={{ fontSize: 12 }} />
//                 <Tooltip />
//                 <Legend />
//                 <Bar
//                   dataKey="median_min"
//                   name="Median TAT (min)"
//                   fill="#2b6cb0"
//                   radius={[4, 4, 0, 0]}
//                 />
//                 <Bar
//                   dataKey="avg_min"
//                   name="Avg TAT (min)"
//                   fill="#63b3ed"
//                   radius={[4, 4, 0, 0]}
//                 />
//               </BarChart>
//             </ResponsiveContainer> */}

//             <div style={{ overflowX: "auto", width: "100%" }}>
//               <ResponsiveContainer
//                 width={chartWidth}
//                 height={300}
//                 minWidth={400}
//               >
//                 <BarChart data={chartData}>
//                   <CartesianGrid strokeDasharray="3 3" stroke="#e5e8ec" />
//                   <XAxis dataKey="name" tick={{ fontSize: 12 }} />
//                   <YAxis tick={{ fontSize: 12 }} />
//                   <Tooltip />
//                   <Legend />
//                   <Bar
//                     dataKey="median_min"
//                     name="Median TAT (min)"
//                     fill="#2b6cb0"
//                     radius={[4, 4, 0, 0]}
//                   />
//                   <Bar
//                     dataKey="avg_min"
//                     name="Avg TAT (min)"
//                     fill="#63b3ed"
//                     radius={[4, 4, 0, 0]}
//                   />
//                 </BarChart>
//               </ResponsiveContainer>
//             </div>
//           </div>

//           <div className="card">
//             <h2
//               style={{
//                 fontSize: "16px",
//                 fontWeight: "600",
//                 marginBottom: "16px",
//               }}
//             >
//               Rates Quoted & Chases Received
//             </h2>
//             {/* <ResponsiveContainer width="100%" height={300}>
//               <BarChart data={chartData}>
//                 <CartesianGrid strokeDasharray="3 3" stroke="#e5e8ec" />
//                 <XAxis dataKey="name" tick={{ fontSize: 12 }} />
//                 <YAxis tick={{ fontSize: 12 }} />
//                 <Tooltip />
//                 <Legend />
//                 <Bar
//                   dataKey="rates"
//                   name="Rates Given"
//                   fill="#38a169"
//                   radius={[4, 4, 0, 0]}
//                 />
//                 <Bar
//                   dataKey="chases"
//                   name="Chases Received"
//                   fill="#dd6b20"
//                   radius={[4, 4, 0, 0]}
//                 />
//               </BarChart>
//             </ResponsiveContainer> */}
//             <div style={{ overflowX: "auto", width: "100%" }}>
//               <ResponsiveContainer
//                 width={chartWidth}
//                 height={300}
//                 minWidth={400}
//               >
//                 <BarChart data={chartData}>
//                   <CartesianGrid strokeDasharray="3 3" stroke="#e5e8ec" />
//                   <XAxis dataKey="name" tick={{ fontSize: 12 }} />
//                   <YAxis tick={{ fontSize: 12 }} />
//                   <Tooltip />
//                   <Legend />
//                   <Bar
//                     dataKey="rates"
//                     name="Rates Given"
//                     fill="#38a169"
//                     radius={[4, 4, 0, 0]}
//                   />
//                   <Bar
//                     dataKey="chases"
//                     name="Chases Received"
//                     fill="#dd6b20"
//                     radius={[4, 4, 0, 0]}
//                   />
//                 </BarChart>
//               </ResponsiveContainer>
//             </div>
//           </div>

//           {/* Pricer Table */}
//           <div className="card" style={{ padding: 0, marginTop: "16px" }}>
//             <h2 style={{ padding: "16px", marginBottom: 0 }}>
//               Pricer Performance
//             </h2>
//             <div style={{ overflowX: "auto" }}>
//               <table>
//                 <thead>
//                   <tr>
//                     <th>Pricer</th>
//                     <th>Rates Given</th>
//                     <th>Median TAT</th>
//                     <th>Avg TAT</th>
//                     <th>Within 1hr</th>
//                     <th>Over 4hr</th>
//                     <th>Chases</th>
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {pricerData.map((row, i) => (
//                     <tr key={i}>
//                       <td style={{ fontWeight: "600" }}>{row.pricer}</td>
//                       <td>{row.rates_given}</td>
//                       <td>{row.median_tat_min}m</td>
//                       <td>{row.avg_tat_min}m</td>
//                       <td>
//                         <span
//                           style={{
//                             color:
//                               row.within_1hr_pct >= 80
//                                 ? "var(--success)"
//                                 : row.within_1hr_pct >= 50
//                                   ? "var(--amber)"
//                                   : "var(--danger)",
//                             fontWeight: "600",
//                           }}
//                         >
//                           {row.within_1hr_pct}%
//                         </span>
//                       </td>
//                       <td
//                         style={{
//                           color: row.over_4hr > 0 ? "var(--danger)" : "inherit",
//                         }}
//                       >
//                         {row.over_4hr}
//                       </td>
//                       <td>{row.chases_received}</td>
//                     </tr>
//                   ))}
//                 </tbody>
//               </table>
//             </div>
//           </div>

//           {/* Requester Table */}
//           <div className="card" style={{ padding: 0, marginTop: "16px" }}>
//             <h2 style={{ padding: "16px", marginBottom: 0 }}>
//               Requester Activity
//             </h2>
//             <div style={{ overflowX: "auto" }}>
//               <table>
//                 <thead>
//                   <tr>
//                     <th>Requester</th>
//                     <th>Total Inquiries</th>
//                     <th>Quoted</th>
//                     <th>Open</th>
//                     <th>Avg TAT</th>
//                     <th>Pricers Used</th>
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {requesterData.length === 0 ? (
//                     <tr>
//                       <td
//                         colSpan={6}
//                         style={{
//                           color: "var(--text-muted)",
//                           textAlign: "center",
//                         }}
//                       >
//                         No requester data yet.
//                       </td>
//                     </tr>
//                   ) : (
//                     requesterData.map((row, i) => (
//                       <tr key={i}>
//                         <td style={{ fontWeight: "600" }}>{row.requester}</td>
//                         <td>{row.total_inquiries}</td>
//                         <td style={{ color: "var(--success)" }}>
//                           {row.quoted}
//                         </td>
//                         <td style={{ color: "var(--warning)" }}>{row.open}</td>
//                         <td>{row.avg_tat_min}m</td>
//                         <td style={{ fontSize: "12px" }}>{row.pricers_used}</td>
//                       </tr>
//                     ))
//                   )}
//                 </tbody>
//               </table>
//             </div>
//           </div>
//         </>
//       )}
//     </div>
//   );
// }

import { useState, useEffect, useRef } from "react";
import api from "../api";
import {
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ComposedChart,
} from "recharts";

export default function Scorecard() {
  const [pricerData, setPricerData] = useState([]);
  const [requesterData, setRequesterData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [days, setDays] = useState(7);

  // ─── Ref to measure container width ───
  const chartContainerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(1000);

  useEffect(() => {
    fetchScorecards();
  }, [days]);

  // ─── Update container width on screen resize ───
  useEffect(() => {
    const updateWidth = () => {
      if (chartContainerRef.current) {
        setContainerWidth(chartContainerRef.current.offsetWidth);
      }
    };
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  const fetchScorecards = async () => {
    setLoading(true);
    setError("");
    try {
      const [pricerRes, requesterRes] = await Promise.all([
        api.get("/inquiries/scorecard", { params: { days } }),
        api.get("/inquiries/scorecard/requesters", { params: { days } }),
      ]);
      setPricerData(pricerRes.data);
      setRequesterData(requesterRes.data);
    } catch (err) {
      setError("Failed to load scorecard.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="card">Loading scorecard...</div>;
  if (error)
    return (
      <div className="card" style={{ color: "var(--danger)" }}>
        {error}
      </div>
    );

  // Prepare data for charts
  const chartData = pricerData.map((d) => ({
    name: d.pricer || "Unknown", // This uses the full name
    rates: d.rates_given,
    median_min: d.median_tat_min,
    avg_min: d.avg_tat_min,
    within_1hr: d.within_1hr_pct,
    over_4hr: d.over_4hr,
    chases: d.chases_received,
  }));

  // Calculate dynamic chart width to prevent squished bars
  const minRequiredWidth = chartData.length * 150;
  const chartWidth = Math.max(minRequiredWidth, containerWidth - 40); // account for padding

  return (
    <div>
      <h1 className="page-title">Scorecard</h1>

      {/* Date filter */}
      <div
        className="card"
        style={{ padding: "16px 20px", marginBottom: "16px" }}
      >
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
            <option value={365}>Last 365 days</option>
          </select>
        </div>
      </div>

      {pricerData.length === 0 ? (
        <div className="card">
          No scorecard data yet. Once inquiries are quoted, performance metrics
          will appear here.
        </div>
      ) : (
        <>
          {/* Chart 1: Pricer Turnaround Time */}
          <div
            className="card"
            ref={chartContainerRef}
            style={{ marginBottom: "16px" }}
          >
            <h2
              style={{
                fontSize: "16px",
                fontWeight: "600",
                marginBottom: "16px",
              }}
            >
              Pricer TAT Performance (Median vs Avg)
            </h2>
            <div style={{ overflowX: "auto", width: "100%" }}>
              {/* Direct chart width assignment solves layout collapsing inside overflow scroll */}
              <BarChart
                width={chartWidth}
                height={400}
                maxBarSize={60} // Forces bars to be thick and prominent
                data={chartData}
                margin={{ top: 10, right: 30, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e8ec" />
                <XAxis
                  dataKey="name"
                  tickFormatter={(value) =>
                    value.length > 12 ? value.substring(0, 12) + "..." : value
                  }
                  tick={{ fontSize: 12, angle: -45, textAnchor: "end" }} // <--- CHANGED
                  interval={0} // <--- ADDED (forces all names to show)
                  height={80} // <--- ADDED (gives room for angled text)
                />
                <YAxis
                  label={{
                    value: "Minutes",
                    angle: -90,
                    position: "insideLeft",
                    fontSize: 12,
                  }}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip />
                <Legend />
                <Bar
                  dataKey="median_min"
                  name="Median TAT (min)"
                  fill="#2b6cb0"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="avg_min"
                  name="Avg TAT (min)"
                  fill="#63b3ed"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </div>
          </div>

          {/* Chart 2: Mixed Composed View (Rates Volume vs Chases Alerts) */}
          <div className="card" style={{ marginBottom: "16px" }}>
            <h2
              style={{
                fontSize: "16px",
                fontWeight: "600",
                marginBottom: "16px",
              }}
            >
              Rates Quoted & Chases Received
            </h2>
            <div style={{ overflowX: "auto", width: "100%" }}>
              <ComposedChart
                width={chartWidth}
                height={300}
                data={chartData}
                margin={{ top: 10, right: 5, left: 5, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e8ec" />
                <XAxis
                  dataKey="name"
                  tickFormatter={(value) =>
                    value.length > 12 ? value.substring(0, 12) + "..." : value
                  }
                  tick={{ fontSize: 12, angle: -45, textAnchor: "end" }} // <--- CHANGED
                  interval={0} // <--- ADDED
                  height={70} // <--- ADDED
                />
                {/* Left Y-Axis for Quantities */}
                <YAxis
                  yAxisId="left"
                  orientation="left"
                  stroke="#38a169"
                  tick={{ fontSize: 12 }}
                  label={{
                    value: "Rates Given",
                    angle: -90,
                    position: "insideLeft",
                    fontSize: 12,
                    fill: "#38a169",
                  }}
                />
                {/* Right Y-Axis for Escalations/Chases */}
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="#dd6b20"
                  tick={{ fontSize: 12 }}
                  label={{
                    value: "Chases Received",
                    angle: 90,
                    position: "insideRight",
                    fontSize: 12,
                    fill: "#dd6b20",
                  }}
                />
                <Tooltip />
                <Legend />
                <Bar
                  yAxisId="left"
                  dataKey="rates"
                  name="Rates Given"
                  fill="#38a169"
                  radius={[4, 4, 0, 0]}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="chases"
                  name="Chases Received"
                  stroke="#dd6b20"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                />
              </ComposedChart>
            </div>
          </div>

          {/* Pricer Performance Table */}
          <div className="card" style={{ padding: 0, marginTop: "16px" }}>
            <h2
              style={{
                padding: "16px",
                marginBottom: 0,
                fontSize: "16px",
                fontWeight: "600",
              }}
            >
              Pricer Performance Details
            </h2>
            <div style={{ overflowX: "auto" }}>
              <table>
                <thead>
                  <tr>
                    <th>Pricer</th>
                    <th>Rates Given</th>
                    <th>Median TAT</th>
                    <th>Avg TAT</th>
                    <th>Within 1hr</th>
                    <th>Over 4hr</th>
                    <th>Chases</th>
                  </tr>
                </thead>
                <tbody>
                  {pricerData.map((row, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: "600" }}>{row.pricer}</td>
                      <td>{row.rates_given}</td>
                      <td>{row.median_tat_min}m</td>
                      <td>{row.avg_tat_min}m</td>
                      <td>
                        <span
                          style={{
                            color:
                              row.within_1hr_pct >= 80
                                ? "var(--success)"
                                : row.within_1hr_pct >= 50
                                  ? "var(--amber)"
                                  : "var(--danger)",
                            fontWeight: "600",
                          }}
                        >
                          {row.within_1hr_pct}%
                        </span>
                      </td>
                      <td
                        style={{
                          color: row.over_4hr > 0 ? "var(--danger)" : "inherit",
                        }}
                      >
                        {row.over_4hr}
                      </td>
                      <td>{row.chases_received}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Requester Activity Table */}
          <div className="card" style={{ padding: 0, marginTop: "16px" }}>
            <h2
              style={{
                padding: "16px",
                marginBottom: 0,
                fontSize: "16px",
                fontWeight: "600",
              }}
            >
              Requester Activity
            </h2>
            <div style={{ overflowX: "auto" }}>
              <table>
                <thead>
                  <tr>
                    <th>Requester</th>
                    <th>Total Inquiries</th>
                    <th>Quoted</th>
                    <th>Open</th>
                    <th>Avg TAT</th>
                    <th>Pricers Used</th>
                  </tr>
                </thead>
                <tbody>
                  {requesterData.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        style={{
                          color: "var(--text-muted)",
                          textAlign: "center",
                          padding: "16px",
                        }}
                      >
                        No requester activity metrics recorded.
                      </td>
                    </tr>
                  ) : (
                    requesterData.map((row, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: "600" }}>
                          {row.requester || "Unknown"}
                        </td>
                        <td>{row.total_inquiries || 0}</td>
                        <td>{row.quoted_inquiries || 0}</td>
                        <td>{row.open_inquiries || 0}</td>
                        <td>{row.avg_tat_min ? `${row.avg_tat_min}m` : "-"}</td>
                        <td>{row.pricers_used_count || 0}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
