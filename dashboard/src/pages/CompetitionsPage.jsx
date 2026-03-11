import React, { useEffect, useState } from "react";
import { api } from "../lib/api.js";

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("id-ID", {
    day: "numeric", month: "short", year: "numeric",
    timeZone: "Asia/Jakarta",
  });
}

function AddModal({ onAdd, onClose }) {
  const [form, setForm] = useState({ name: "", team_name: "", members: "", url: "", notes: "" });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function submit() {
    if (!form.name.trim()) return;
    setSaving(true);
    await onAdd({
      name: form.name.trim(),
      team_name: form.team_name.trim() || null,
      members: form.members.trim() || null,
      url: form.url.trim() || null,
      notes: form.notes.trim() || null,
    });
    setSaving(false);
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: 480 }}>
        <div className="modal-title">Add Competition</div>
        <div className="form-group">
          <label className="input-label">COMPETITION NAME *</label>
          <input type="text" value={form.name} onChange={e => set("name", e.target.value)}
            placeholder="e.g. HTB Cyber Apocalypse 2026" autoFocus
            onKeyDown={e => e.key === "Enter" && submit()} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="form-group">
            <label className="input-label">TEAM NAME</label>
            <input type="text" value={form.team_name} onChange={e => set("team_name", e.target.value)}
              placeholder="e.g. N0pSl3d" />
          </div>
          <div className="form-group">
            <label className="input-label">MEMBERS</label>
            <input type="text" value={form.members} onChange={e => set("members", e.target.value)}
              placeholder="alice, bob, charlie" />
          </div>
        </div>
        <div className="form-group">
          <label className="input-label">URL</label>
          <input type="text" value={form.url} onChange={e => set("url", e.target.value)}
            placeholder="https://ctftime.org/..." />
        </div>
        <div className="form-group">
          <label className="input-label">NOTES</label>
          <textarea rows={2} value={form.notes} onChange={e => set("notes", e.target.value)}
            placeholder="writeup links, notes..." />
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={saving || !form.name.trim()}>
            {saving ? "Adding..." : "Add"}
          </button>
        </div>
      </div>
    </div>
  );
}

function EditModal({ item, onSave, onClose }) {
  const [form, setForm] = useState({
    name: item.name || "",
    team_name: item.team_name || "",
    members: item.members || "",
    url: item.url || "",
    notes: item.notes || "",
    ranking: item.ranking || "",
    status: item.status || "upcoming",
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function submit() {
    setSaving(true);
    await onSave(item.id, {
      name: form.name,
      team_name: form.team_name || null,
      members: form.members || null,
      url: form.url || null,
      notes: form.notes || null,
      ranking: form.ranking || null,
      status: form.status,
    });
    setSaving(false);
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: 480 }}>
        <div className="modal-title">Edit Competition #{item.id}</div>
        <div className="form-group">
          <label className="input-label">NAME</label>
          <input type="text" value={form.name} onChange={e => set("name", e.target.value)} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="form-group">
            <label className="input-label">TEAM NAME</label>
            <input type="text" value={form.team_name} onChange={e => set("team_name", e.target.value)} />
          </div>
          <div className="form-group">
            <label className="input-label">MEMBERS</label>
            <input type="text" value={form.members} onChange={e => set("members", e.target.value)} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="form-group">
            <label className="input-label">RANKING</label>
            <input type="text" value={form.ranking} onChange={e => set("ranking", e.target.value)}
              placeholder="e.g. #12 / 500" />
          </div>
          <div className="form-group">
            <label className="input-label">STATUS</label>
            <select value={form.status} onChange={e => set("status", e.target.value)}>
              <option value="upcoming">upcoming</option>
              <option value="ongoing">ongoing</option>
              <option value="done">done</option>
            </select>
          </div>
        </div>
        <div className="form-group">
          <label className="input-label">URL</label>
          <input type="text" value={form.url} onChange={e => set("url", e.target.value)} />
        </div>
        <div className="form-group">
          <label className="input-label">NOTES / WRITEUP</label>
          <textarea rows={3} value={form.notes} onChange={e => set("notes", e.target.value)} />
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={saving}>Save</button>
        </div>
      </div>
    </div>
  );
}

function DetailModal({ compId, onClose }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.getCompetition(compId).then(setData);
  }, [compId]);

  if (!data) return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ width: 520, textAlign: 'center', padding: 40 }}>
        <span className="text3">loading...</span>
      </div>
    </div>
  );

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: 520 }}>
        <div className="modal-title">🏆 {data.name}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
          {data.team_name && <div><span className="text3" style={{ fontSize: 10 }}>TEAM</span><div style={{ fontSize: 13 }}>{data.team_name}</div></div>}
          {data.members && <div><span className="text3" style={{ fontSize: 10 }}>MEMBERS</span><div style={{ fontSize: 13 }}>{data.members}</div></div>}
          {data.ranking && <div><span className="text3" style={{ fontSize: 10 }}>RANKING</span><div style={{ fontSize: 13 }}>{data.ranking}</div></div>}
          {data.status && <div><span className="text3" style={{ fontSize: 10 }}>STATUS</span><div style={{ fontSize: 13 }}>{data.status}</div></div>}
        </div>

        {data.url && (
          <div style={{ marginBottom: 12 }}>
            <span className="text3" style={{ fontSize: 10 }}>URL</span>
            <div style={{ fontSize: 12, wordBreak: 'break-all' }}>
              <a href={data.url} target="_blank" rel="noopener" style={{ color: 'var(--blue)' }}>{data.url}</a>
            </div>
          </div>
        )}

        {data.notes && (
          <div style={{ marginBottom: 16 }}>
            <span className="text3" style={{ fontSize: 10 }}>NOTES</span>
            <div style={{ fontSize: 12, color: 'var(--text2)', whiteSpace: 'pre-wrap', marginTop: 4 }}>{data.notes}</div>
          </div>
        )}

        {data.challenges && data.challenges.length > 0 && (
          <div>
            <span className="text3" style={{ fontSize: 10 }}>LINKED CHALLENGES ({data.challenges.length})</span>
            <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {data.challenges.map(ch => (
                <div key={ch.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '6px 10px', background: 'var(--bg2)', borderRadius: 'var(--radius-xs)',
                  fontSize: 12,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="text3">#{ch.id}</span>
                    <span>{ch.title}</span>
                    {ch.category && <span className="tag tag-blue">{ch.category}</span>}
                  </div>
                  <span className={`tag ${ch.status === 'solved' ? 'tag-green' : ch.status === 'upsolve' ? 'tag-blue' : ch.status === 'need_review' ? 'tag-orange' : 'tag-gray'}`}>
                    {ch.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

export default function CompetitionsPage() {
  const [items,   setItems]   = useState([]);
  const [adding,  setAdding]  = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { items } = await api.getCompetitions();
    setItems(items);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleAdd(data) {
    const item = await api.createCompetition(data);
    setItems(is => [item, ...is]);
    setAdding(false);
  }

  async function handleEdit(id, data) {
    const updated = await api.updateCompetition(id, data);
    setItems(is => is.map(i => i.id === id ? { ...i, ...updated } : i));
    setEditing(null);
  }

  async function handleDelete(id) {
    if (!confirm(`Delete competition #${id}? Challenges will be unlinked.`)) return;
    await api.deleteCompetition(id);
    setItems(is => is.filter(i => i.id !== id));
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Competitions</h1>
        <button className="btn btn-primary" onClick={() => setAdding(true)}>+ Add Competition</button>
      </div>

      {loading ? (
        <div className="text3" style={{ paddingTop: 40, textAlign: 'center', fontSize: 12 }}>loading...</div>
      ) : items.length === 0 ? (
        <div className="empty-state">
          Belum ada competition. Tambah pake <code>/comp add</code> di Discord atau klik button di atas.
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ width: 36 }}>ID</th>
                <th>NAME</th>
                <th style={{ width: 120 }}>TEAM</th>
                <th style={{ width: 120 }}>MEMBERS</th>
                <th style={{ width: 100 }}>CHALLENGES</th>
                <th style={{ width: 80 }}>STATUS</th>
                <th style={{ width: 90 }}>DATE</th>
                <th style={{ width: 100 }}></th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id}>
                  <td style={{ color: "var(--text3)", fontFamily: 'var(--font-mono)' }}>#{item.id}</td>
                  <td>
                    <button
                      onClick={() => setViewing(item.id)}
                      style={{
                        background: 'none', border: 'none', color: 'var(--text)', cursor: 'pointer',
                        fontWeight: 500, fontFamily: 'var(--font-mono)', fontSize: 13, padding: 0, textAlign: 'left',
                      }}
                    >
                      {item.name}
                    </button>
                    {item.url && <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--blue)' }}>🔗</span>}
                  </td>
                  <td style={{ color: 'var(--text2)', fontSize: 12 }}>{item.team_name || <span className="text3">—</span>}</td>
                  <td className="td-clamp" style={{ maxWidth: 120, color: 'var(--text2)', fontSize: 12 }}>
                    {item.members || <span className="text3">—</span>}
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                    <span style={{ color: 'var(--green)' }}>{item.solved_count}</span>
                    <span className="text3"> / {item.challenge_count}</span>
                  </td>
                  <td>
                    <span className={`tag ${item.status === 'done' ? 'tag-green' : item.status === 'ongoing' ? 'tag-orange' : 'tag-gray'}`}>
                      {item.status}
                    </span>
                  </td>
                  <td style={{ color: "var(--text3)", fontSize: 11 }}>{fmtDate(item.created_at)}</td>
                  <td>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button className="btn btn-ghost btn-sm btn-icon" onClick={() => setEditing(item)}>✎</button>
                      <button className="btn btn-danger btn-sm btn-icon" onClick={() => handleDelete(item.id)}>✕</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {adding  && <AddModal onAdd={handleAdd} onClose={() => setAdding(false)} />}
      {editing && <EditModal item={editing} onSave={handleEdit} onClose={() => setEditing(null)} />}
      {viewing && <DetailModal compId={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}
