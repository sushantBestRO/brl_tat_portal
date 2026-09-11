import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

export default function Login() {
  const [email, setEmail] = useState("admin@bestroadways.com");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await api.post("/auth/login", { email, password });
      // localStorage.setItem('token', res.data.accessToken);
      // localStorage.setItem('user', JSON.stringify(res.data.user));
      // navigate('/dashboard');

      localStorage.setItem("token", res.data.accessToken);
      localStorage.setItem("user", JSON.stringify(res.data.user));

      window.location.href = "/dashboard";
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Login failed. Check if backend is running.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        background: "#1a202c",
      }}
    >
      <div className="card" style={{ width: "100%", maxWidth: "400px" }}>
        <h1
          style={{ fontSize: "20px", fontWeight: "700", marginBottom: "8px" }}
        >
          BRL TAT Portal
        </h1>
        <p style={{ color: "var(--text-muted)", marginBottom: "24px" }}>
          Sign in to your account
        </p>

        {error && (
          <div
            style={{
              background: "var(--light-red)",
              color: "#822727",
              padding: "10px 12px",
              borderRadius: "6px",
              marginBottom: "16px",
              fontSize: "13px",
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="col" style={{ gap: "16px" }}>
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "6px",
                  fontSize: "13px",
                  fontWeight: "500",
                }}
              >
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
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
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="primary"
              style={{ width: "100%" }}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
