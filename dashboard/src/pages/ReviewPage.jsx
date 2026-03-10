import React, { useEffect, useState } from "react";
import { api } from "../lib/api.js";

function daysSince(d) {
  return Math.floor((Date.now() - new Date(d)) / 86400000);
}

function fmtDate(d) {
  return new Date(d).toLocaleDateString("id-ID", {
    day: "numeric", month: "short", year: "numeric",
    timeZone: "Asia/Jakarta",
  });
}

function AddModal({ onAdd, onClose }) {
  const [title,    setTitle]    = useState("");
  const [category, setCategory] = useState("");
  const [saving,   setSaving]   = useState(false);

  async function submit() {
    if (!title.trim()) return;
    setSaving(true);
    await onAdd({ title: title.trim(), category: category.trim() || undefined });
    setSaving(false);
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: 440 }}>
        <div className="modal-title">Add Review Item</div>
        <div className="form-group">
          <label className="input-label">TITLE</label>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)}
            placeholder="e.g. heap overflow challenge, bab 3 thesis..." autoFocus
            onKeyDown={e => e.key === "Enter" && submit()}
          />
        </div>
        <div className="form-group">
          <label className="input-label">CATEGORY (optional)</label>
          <input type="text" value={category} onChange={e => setCategory(e.target.value)}
            placeholder="CTF, thesis, pwn, web..."
          />
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={saving || !title.trim()}>
            {saving ? "Adding..." : "Add"}
          </button>
        </div>
      </div>
    </div>
  );
}

function EditModal({ item, onSave, onClose }) {
  const [title,    setTitle]    = useState(item.title);
  const [category, setCategory] = useState(item.category || "");
  const [saving,   setSaving]   = useState(false);

  async function submit() {
    setSaving(true);
    await onSave(item.id, { title, category: category || null });
    setSaving(false);
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: 440 }}>
        <div className="modal-title">Edit Item #{item.id}</div>
        <div className="form-group">
          <label className="input-label">TITLE</label>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="input-label">CATEGORY</label>
          <input type="text" value={category} onChange={e => setCategory(e.target.value)} placeholder="CTF, thesis, pwn..." />
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={saving}>Save</button>
        </div>
      </div>
    </div>
  );
}

export default function ReviewPage() {
  const [items,   setItems]   = useState([]);
  const [stats,   setStats]   = useState({});
  const [filter,  setFilter]  = useState("pending");
  const [adding,  setAdding]  = useState(false);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { items, stats } = await api.getReviews();
    setItems(items);
    setStats(stats);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleAdd(data) {
    const item = await api.addReview(data);
    setItems(is => [item, ...is]);
    setStats(s => ({ ...s, pending: Number(s.pending) + 1, total: Number(s.total) + 1 }));
    setAdding(false);
  }

  async function handleDone(id) {
    await api.doneReview(id);
    setItems(is => is.map(i => i.id === id ? { ...i, status: "done", done_at: new Date().toISOString() } : i));
    setStats(s => ({ ...s, pending: Number(s.pending) - 1, done: Number(s.done) + 1 }));
  }

  async function handleReopen(id) {
    await api.reopenReview(id);
    setItems(is => is.map(i => i.id === id ? { ...i, status: "pending", done_at: null } : i));
    setStats(s => ({ ...s, pending: Number(s.pending) + 1, done: Number(s.done) - 1 }));
  }

  async function handleDelete(id) {
    if (!confirm(`Delete item #${id}?`)) return;
    await api.deleteReview(id);
    const item = items.find(i => i.id === id);
    setItems(is => is.filter(i => i.id !== id));
    setStats(s => ({
      ...s,
      total: Number(s.total) - 1,
      pending: item?.status === "pending" ? Number(s.pending) - 1 : s.pending,
      done:    item?.status === "done"    ? Number(s.done)    - 1 : s.done,
    }));
  }

  async function handleEdit(id, data) {
    const updated = await api.updateReview(id, data);
    setItems(is => is.map(i => i.id === id ? updated : i));
    setEditing(null);
  }

  const shown = items.filter(i => filter === "all" ? true : i.status === filter);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Review / Upsolve</h1>
        <button className="btn btn-primary" onClick={() => setAdding(true)}>+ Add Item</button>
      </div>

      {/* Stats bar */}
      <div style={{ display: "flex", gap: 14, marginBottom: 22 }}>
        {[
          { label: "Pending", value: stats.pending ?? 0, color: "var(--orange)" },
          { label: "Done",    value: stats.done    ?? 0, color: "var(--green)"  },
          { label: "Total",   value: stats.total   ?? 0, color: "var(--text2)"  },
          { label: "Rate",    value: stats.total > 0 ? `${Math.round(Number(stats.done)/Number(stats.total)*100)}%` : "0%", color: "var(--blue)" },
        ].map(({ label, value, color }) => (
          <div key={label} className="card-sm" style={{ flex: 1, textAlign: "center" }}>
            <div style={{ fontSize: 10, color: "var(--text3)", letterSpacing: ".12em", marginBottom: 6, fontFamily: 'var(--font-mono)', fontWeight: 500 }}>{label.toUpperCase()}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color, fontFamily: 'var(--font-sans)', letterSpacing: '-.02em' }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="filter-tabs">
        {["pending", "done", "all"].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`filter-tab ${filter === f ? "active" : ""}`}
          >
            {f.toUpperCase()}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text3" style={{ paddingTop: 40, textAlign: 'center', fontSize: 12 }}>loading...</div>
      ) : shown.length === 0 ? (
        <div className="empty-state">
          {filter === "pending" ? "List kosong 👍 ga ada yang pending" : "Belum ada item."}
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ width: 36 }}>ID</th>
                <th>TITLE</th>
                <th style={{ width: 100 }}>CATEGORY</th>
                <th style={{ width: 80 }}>STATUS</th>
                <th style={{ width: 80 }}>DAYS</th>
                <th style={{ width: 90 }}>ADDED</th>
                <th style={{ width: 120 }}></th>
              </tr>
            </thead>
            <tbody>
              {shown.map(item => {
                const days = item.status === "done"
                  ? Math.floor((new Date(item.done_at) - new Date(item.added_at)) / 86400000)
                  : daysSince(item.added_at);

                return (
                  <tr key={item.id}>
                    <td style={{ color: "var(--text3)", fontFamily: 'var(--font-mono)' }}>#{item.id}</td>
                    <td style={{ maxWidth: 280 }}>
                      <div style={{ fontWeight: 500 }}>{item.title}</div>
                    </td>
                    <td>
                      {item.category
                        ? <span className="tag tag-blue">{item.category}</span>
                        : <span className="text3">—</span>}
                    </td>
                    <td>
                      <span className={`tag ${item.status === "done" ? "tag-green" : "tag-orange"}`}>
                        {item.status}
                      </span>
                    </td>
                    <td style={{
                      color: item.status === "pending" && days > 7 ? "var(--orange)" : "var(--text2)",
                      fontFamily: 'var(--font-mono)',
                      fontSize: 12,
                    }}>
                      {days === 0 ? "today" : `${days}d`}
                    </td>
                    <td style={{ color: "var(--text3)", fontSize: 11 }}>{fmtDate(item.added_at)}</td>
                    <td>
                      <div style={{ display: "flex", gap: 4 }}>
                        {item.status === "pending"
                          ? <button className="btn btn-ghost btn-sm" style={{ color: "var(--green)" }} onClick={() => handleDone(item.id)}>✓ done</button>
                          : <button className="btn btn-ghost btn-sm" onClick={() => handleReopen(item.id)}>↺</button>
                        }
                        <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setEditing(item)}>✎</button>
                        <button className="btn btn-danger btn-sm btn-icon" onClick={() => handleDelete(item.id)}>✕</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {adding  && <AddModal onAdd={handleAdd}   onClose={() => setAdding(false)} />}
      {editing && <EditModal item={editing} onSave={handleEdit} onClose={() => setEditing(null)} />}
    </div>
  );
}
