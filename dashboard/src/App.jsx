import React, { useState, useEffect } from "react";
import { Routes, Route, NavLink, useNavigate, Navigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard.jsx";
import StandupPage from "./pages/StandupPage.jsx";
import CompetitionsPage from "./pages/CompetitionsPage.jsx";
import ChallengesPage from "./pages/ChallengesPage.jsx";

function Login({ onLogin }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setErr("");
    try {
      localStorage.setItem("dashboard_key", pw);
      const res = await fetch("/api/standup/streak", {
        headers: { "x-dashboard-key": pw },
      });
      if (res.status === 401) { setErr("Wrong password"); setLoading(false); return; }
      onLogin();
    } catch {
      setErr("Connection failed");
      setLoading(false);
    }
  }

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-brand">
          ⚡ Menyala<span>Gokong</span>
        </div>
        <div className="login-sub">DASHBOARD ACCESS</div>
        <form onSubmit={submit}>
          <div className="form-group">
            <label className="input-label">PASSWORD</label>
            <input
              type="password"
              value={pw}
              onChange={e => setPw(e.target.value)}
              autoFocus
              placeholder="enter dashboard password"
              style={{ fontSize: 14, padding: '12px 16px' }}
            />
          </div>
          {err && (
            <div style={{
              color: "var(--red)",
              fontSize: 12,
              marginBottom: 14,
              padding: '8px 12px',
              background: 'var(--red-glow)',
              borderRadius: 'var(--radius-xs)',
              border: '1px solid rgba(248,113,113,.2)',
            }}>
              {err}
            </div>
          )}
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: "100%", justifyContent: "center", padding: '12px 20px', fontSize: 13 }}
          >
            {loading ? "CONNECTING..." : "ENTER →"}
          </button>
        </form>
        <div style={{ marginTop: 32, textAlign: 'center', fontSize: 11, color: 'var(--text3)' }}>
          powered by discord bot
        </div>
      </div>
    </div>
  );
}

function Sidebar({ onLogout }) {
  const navItems = [
    { to: "/",             icon: "◫", label: "DASHBOARD" },
    { to: "/standup",      icon: "☰", label: "STANDUP" },
    { to: "/competitions", icon: "🏆", label: "COMPETITIONS" },
    { to: "/challenges",   icon: "⚡", label: "CHALLENGES" },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">⚡ Menyala<span>Gokong</span></div>
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
        <div style={{ padding: '0 12px', marginBottom: 8 }}>
          <div style={{ height: 1, background: 'var(--border)', marginBottom: 12 }} />
        </div>
        <button className="nav-item" onClick={onLogout} style={{ color: 'var(--text3)' }}>
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
          <Route path="/"             element={<Dashboard />} />
          <Route path="/standup"      element={<StandupPage />} />
          <Route path="/competitions" element={<CompetitionsPage />} />
          <Route path="/challenges"   element={<ChallengesPage />} />
          <Route path="/review"       element={<Navigate to="/challenges?status=need_review" replace />} />
        </Routes>
      </main>
    </div>
  );
}
