import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Inquiries from "./pages/Inquiries";
import Scorecard from "./pages/Scorecard";
import Settings from "./pages/Settings";
import DangerZone from "./pages/DangerZone";
import DailyDetails from "./pages/DailyDetails";

function App() {
  const token = localStorage.getItem("token");

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      {token ? (
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/dashboard" />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/inquiries" element={<Inquiries />} />
          <Route path="/scorecard" element={<Scorecard />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/danger-zone" element={<DangerZone />} />
          <Route path="/daily-details" element={<DailyDetails />} />
        </Route>
      ) : (
        <Route path="*" element={<Navigate to="/login" />} />
      )}
    </Routes>
  );
}

export default App;
