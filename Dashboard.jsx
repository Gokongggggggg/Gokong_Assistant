import React, { useEffect, useState } from "react";
import { api } from "../lib/api.js";

function fmtDate(d) {
  return new Date(d).toLocaleDateString("id-ID", {
    day: "numeric", month: "short", year: "numeric",
    timeZone: "Asia/Jakarta",
  });
}

function StreakBar({ current, longest }) {
  const pct = longest > 0 ? Math.round((current / longest) * 100) : 0;
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--text3)", marginBottom: 5 }}>
        <span>CURRENT vs LONGEST</span>
        <span>{pct}%</span>
      </div>
      <div style={{ height: 4, background: "var(--bg3)", borderRadius: 2, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: "var(--green)", borderRadius: 2, transition: "width .6s ease" }} />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [streak,  setStreak]  = useState(null);
  const [entries, setEntries] = useState([]);
  const [reviews, setReviews] = useState({ items: [], stats: {} });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getStreak(),
      api.getStandups(5, 0),
      api.getReviews(),
    ]).then(([s, e, r]) => {
      setStreak(s);
      setEntries(e.entries || []);
      setReviews(r);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text3" style={{ paddingTop: 40 }}>loading...</div>;

  const stats   = reviews.stats || {};
  const pending = reviews.items?.filter(i => i.status === "pending") || [];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <span style={{ fontSize: 11, color: "var(--text3)" }}>
          {new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Jakarta" }).toUpperCase()}
        </span>
      </div>

      {/* Stat cards */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label">CURRENT STREAK</div>
          <div className={`stat-value ${streak?.current > 0 ? "green" : ""}`}>
            {streak?.current ?? 0}
            <span style={{ fontSize: 14, color: "var(--text3)", marginLeft: 6 }}>days</span>
          </div>
          {streak && <StreakBar current={streak.current} longest={streak.longest} />}
        </div>

        <div className="stat-card">
          <div className="stat-label">LONGEST STREAK</div>
          <div className="stat-value">{streak?.longest ?? 0}
            <span style={{ fontSize: 14, color: "var(--text3)", marginLeft: 6 }}>days</span>
          </div>
          <div style={{ marginTop: 10, fontSize: 11, color: "var(--text3)" }}>
            {streak?.total ?? 0} total standups
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">REVIEW PENDING</div>
          <div className={`stat-value ${Number(stats.pending) > 0 ? "orange" : "green"}`}>
            {stats.pending ?? 0}
          </div>
          <div style={{ marginTop: 10, fontSize: 11, color: "var(--text3)" }}>
            {stats.done ?? 0} solved total
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">SOLVE RATE</div>
          <div className="stat-value">
            {stats.total > 0 ? Math.round(Number(stats.done) / Number(stats.total) * 100) : 0}
            <span style={{ fontSize: 14, color: "var(--text3)", marginLeft: 2 }}>%</span>
          </div>
          <div style={{ marginTop: 10, fontSize: 11, color: "var(--text3)" }}>
            {stats.total ?? 0} total items
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

        {/* Recent standups */}
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 11, letterSpacing: ".1em", color: "var(--text3)" }}>RECENT STANDUPS</div>
            <a href="/standup" style={{ fontSize: 11, color: "var(--green)" }}>view all →</a>
          </div>
          {entries.length === 0 ? (
            <div className="text3" style={{ fontSize: 12 }}>Belum ada standup.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {entries.map(e => (
                <div key={e.id} style={{ borderLeft: "2px solid var(--border2)", paddingLeft: 12 }}>
                  <div style={{ fontSize: 10, color: "var(--text3)", marginBottom: 3 }}>{fmtDate(e.created_at)} · #{e.id}</div>
                  {e.done && <div className="td-clamp" style={{ maxWidth: "100%", marginBottom: 2 }}>✅ {e.done}</div>}
                  {e.todo && <div className="td-clamp" style={{ maxWidth: "100%", color: "var(--text3)" }}>🎯 {e.todo}</div>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending review items */}
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 11, letterSpacing: ".1em", color: "var(--text3)" }}>PENDING REVIEW</div>
            <a href="/review" style={{ fontSize: 11, color: "var(--orange)" }}>view all →</a>
          </div>
          {pending.length === 0 ? (
            <div className="text3" style={{ fontSize: 12 }}>List kosong 👍</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {pending.slice(0, 6).map(item => {
                const days = Math.floor((Date.now() - new Date(item.added_at)) / 86400000);
                return (
                  <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="td-clamp" style={{ maxWidth: "100%" }}>{item.title}</div>
                      {item.category && <span className="tag tag-blue" style={{ marginTop: 3 }}>{item.category}</span>}
                    </div>
                    <span style={{ fontSize: 11, color: days > 7 ? "var(--orange)" : "var(--text3)", marginLeft: 12, whiteSpace: "nowrap" }}>
                      {days === 0 ? "today" : `${days}d`}
                    </span>
                  </div>
                );
              })}
              {pending.length > 6 && (
                <div style={{ fontSize: 11, color: "var(--text3)" }}>+{pending.length - 6} more</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
