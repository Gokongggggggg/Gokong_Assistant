import React, { useState, useEffect } from "react";
import { Routes, Route, NavLink, useNavigate, Navigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard.jsx";
import StandupPage from "./pages/StandupPage.jsx";
import ReviewPage from "./pages/ReviewPage.jsx";

function Login({ onLogin }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");

  async function submit(e) {
    e.preventDefault();
    try {
      localStorage.setItem("dashboard_key", pw);
      const res = await fetch("/api/standup/streak", {
        headers: { "x-dashboard-key": pw },
      });
      if (res.status === 401) { setErr("Wrong password"); return; }
      onLogin();
    } catch {
      setErr("Connection failed");
    }
  }

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "var(--bg)" }}>
      <div style={{ width: 340 }}>
        <div style={{ fontFamily: "var(--font-sans)", fontSize: 24, fontWeight: 800, marginBottom: 8, letterSpacing: "-.02em" }}>
          standup<span style={{ color: "var(--green)" }}>.log</span>
        </div>
        <div style={{ color: "var(--text3)", fontSize: 12, marginBottom: 28 }}>dashboard access</div>
        <form onSubmit={submit}>
          <div className="form-group">
            <label className="input-label">PASSWORD</label>
            <input
              type="password"
              value={pw}
              onChange={e => setPw(e.target.value)}
              autoFocus
              placeholder="enter dashboard password"
            />
          </div>
          {err && <div style={{ color: "var(--red)", fontSize: 12, marginBottom: 12 }}>{err}</div>}
          <button type="submit" className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }}>
            ENTER →
          </button>
        </form>
      </div>
    </div>
  );
}

function Sidebar({ onLogout }) {
  const navItems = [
    { to: "/",        icon: "▦", label: "DASHBOARD" },
    { to: "/standup", icon: "≡", label: "STANDUP" },
    { to: "/review",  icon: "↻", label: "REVIEW" },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">standup<span>.log</span></div>
      <nav className="nav">
        {navItems.map(({ to, icon, label }) => (
          <NavLink key={to} to={to} end={to === "/"}>
            {({ isActive }) => (
              <div className={`nav-item ${isActive ? "active" : ""}`}>
                <span className="icon">{icon}</span>
                {label}
              </div>
            )}
          </NavLink>
        ))}
        <div style={{ flex: 1 }} />
        <button className="nav-item" onClick={onLogout} style={{ marginTop: "auto" }}>
          <span className="icon">⏻</span> LOGOUT
        </button>
      </nav>
    </aside>
  );
}

export default function App() {
  const [authed, setAuthed] = useState(!!localStorage.getItem("dashboard_key"));

  function logout() {
    localStorage.removeItem("dashboard_key");
    setAuthed(false);
  }

  if (!authed) return <Login onLogin={() => setAuthed(true)} />;

  return (
    <div className="layout">
      <Sidebar onLogout={logout} />
      <main className="main">
        <Routes>
          <Route path="/"        element={<Dashboard />} />
          <Route path="/standup" element={<StandupPage />} />
          <Route path="/review"  element={<ReviewPage />} />
        </Routes>
      </main>
    </div>
  );
}
