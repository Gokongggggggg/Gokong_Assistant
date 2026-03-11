import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../lib/api.js";

const PAGE_SIZE = 30;

const STATUS_CONFIG = {
  solved:      { icon: "✅", label: "solved",  tagClass: "tag-green"  },
  upsolve:     { icon: "🔄", label: "upsolve", tagClass: "tag-blue"   },
  need_review: { icon: "📋", label: "review",  tagClass: "tag-orange" },
  stuck:       { icon: "🔴", label: "stuck",   tagClass: "tag-gray"   },
};

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("id-ID", {
    day: "numeric", month: "short", year: "numeric",
    timeZone: "Asia/Jakarta",
  });
}

function daysSince(d) {
  return Math.floor((Date.now() - new Date(d)) / 86400000);
}

/* ── Status dropdown (replaces tiny icon buttons) ─────────────────────────── */
function StatusDropdown({ current, onChange }) {
  const [open, setOpen] = useState(false);
  const cfg = STATUS_CONFIG[current] || STATUS_CONFIG.stuck;

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        className={`tag ${cfg.tagClass}`}
        style={{ cursor: 'pointer', border: '1px solid transparent', fontSize: 11, padding: '4px 10px' }}
      >
        {cfg.icon} {cfg.label} ▾
      </button>
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 50 }} onClick={() => setOpen(false)} />
          <div style={{
            position: 'absolute', top: '100%', left: 0, marginTop: 4, zIndex: 51,
            background: 'var(--bg1)', border: '1px solid var(--border2)', borderRadius: 'var(--radius-sm)',
            padding: 4, minWidth: 140, boxShadow: 'var(--shadow-md)',
          }}>
            {Object.entries(STATUS_CONFIG).map(([key, val]) => (
              <button
                key={key}
                onClick={() => { onChange(key); setOpen(false); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                  padding: '7px 10px', border: 'none', borderRadius: 'var(--radius-xs)',
                  background: current === key ? 'rgba(255,255,255,.06)' : 'none',
                  color: current === key ? 'var(--text)' : 'var(--text2)',
                  fontFamily: 'var(--font-mono)', fontSize: 12, cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <span>{val.icon}</span>
                <span>{val.label}</span>
                {current === key && <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--green)' }}>●</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ── Add Modal ────────────────────────────────────────────────────────────── */
function AddModal({ comps, onAdd, onClose }) {
  const [form, setForm] = useState({
    title: "", category: "", custom_category: "", link: "", comp_id: "", difficulty: "", notes: "",
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const CATS = ["pwn", "web", "rev", "crypto", "forensic", "misc"];

  async function submit() {
    if (!form.title.trim()) return;
    setSaving(true);
    await onAdd({
      title: form.title.trim(),
      category: form.category === "__custom" ? form.custom_category.trim() : form.category || null,
      link: form.link.trim() || null,
      comp_id: form.comp_id ? parseInt(form.comp_id) : null,
      difficulty: form.difficulty.trim() || null,
      notes: form.notes.trim() || null,
    });
    setSaving(false);
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: 500 }}>
        <div className="modal-title">Add Challenge</div>
        <div className="form-group">
          <label className="input-label">TITLE *</label>
          <input type="text" value={form.title} onChange={e => set("title", e.target.value)}
            placeholder="e.g. heap overflow - babypwn" autoFocus
            onKeyDown={e => e.key === "Enter" && submit()} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="form-group">
            <label className="input-label">CATEGORY</label>
            <select value={form.category} onChange={e => set("category", e.target.value)}>
              <option value="">— select —</option>
              {CATS.map(c => <option key={c} value={c}>{c}</option>)}
              <option value="__custom">custom...</option>
            </select>
          </div>
          <div className="form-group">
            <label className="input-label">{form.category === "__custom" ? "CUSTOM CATEGORY" : "DIFFICULTY"}</label>
            {form.category === "__custom" ? (
              <input type="text" value={form.custom_category}
                onChange={e => set("custom_category", e.target.value)} placeholder="e.g. osint, stego..." />
            ) : (
              <input type="text" value={form.difficulty} onChange={e => set("difficulty", e.target.value)}
                placeholder="easy / medium / hard" />
            )}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="form-group">
            <label className="input-label">LINK</label>
            <input type="text" value={form.link} onChange={e => set("link", e.target.value)}
              placeholder="https://..." />
          </div>
          <div className="form-group">
            <label className="input-label">COMPETITION</label>
            <select value={form.comp_id} onChange={e => set("comp_id", e.target.value)}>
              <option value="">— none —</option>
              {comps.map(c => <option key={c.id} value={c.id}>#{c.id} {c.name}</option>)}
            </select>
          </div>
        </div>
        {form.category === "__custom" && (
          <div className="form-group">
            <label className="input-label">DIFFICULTY</label>
            <input type="text" value={form.difficulty} onChange={e => set("difficulty", e.target.value)}
              placeholder="easy / medium / hard" />
          </div>
        )}
        <div className="form-group">
          <label className="input-label">NOTES</label>
          <textarea rows={2} value={form.notes} onChange={e => set("notes", e.target.value)}
            placeholder="approach, writeup, observations..." />
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={saving || !form.title.trim()}>
            {saving ? "Adding..." : "Add"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Edit Modal ───────────────────────────────────────────────────────────── */
function EditModal({ item, comps, onSave, onClose }) {
  const CATS = ["pwn", "web", "rev", "crypto", "forensic", "misc"];
  const isCustom = item.category && !CATS.includes(item.category);

  const [form, setForm] = useState({
    title: item.title || "",
    category: isCustom ? "__custom" : (item.category || ""),
    custom_category: isCustom ? item.category : "",
    link: item.link || "",
    writeup: item.writeup || "",
    source_code: item.source_code || "",
    notes: item.notes || "",
    difficulty: item.difficulty || "",
    comp_id: item.comp_id ? String(item.comp_id) : "",
    status: item.status || "stuck",
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function submit() {
    setSaving(true);
    await onSave(item.id, {
      title: form.title,
      category: form.category === "__custom" ? form.custom_category.trim() : form.category || null,
      link: form.link || null,
      writeup: form.writeup || null,
      source_code: form.source_code || null,
      notes: form.notes || null,
      difficulty: form.difficulty || null,
      comp_id: form.comp_id ? parseInt(form.comp_id) : null,
      status: form.status,
    });
    setSaving(false);
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ width: 520 }}>
        <div className="modal-title">Edit Challenge #{item.id}</div>
        <div className="form-group">
          <label className="input-label">TITLE</label>
          <input type="text" value={form.title} onChange={e => set("title", e.target.value)} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="form-group">
            <label className="input-label">CATEGORY</label>
            <select value={form.category} onChange={e => set("category", e.target.value)}>
              <option value="">— select —</option>
              {CATS.map(c => <option key={c} value={c}>{c}</option>)}
              <option value="__custom">custom...</option>
            </select>
          </div>
          <div className="form-group">
            <label className="input-label">{form.category === "__custom" ? "CUSTOM CATEGORY" : "DIFFICULTY"}</label>
            {form.category === "__custom" ? (
              <input type="text" value={form.custom_category}
                onChange={e => set("custom_category", e.target.value)} placeholder="e.g. osint" />
            ) : (
              <input type="text" value={form.difficulty} onChange={e => set("difficulty", e.target.value)}
                placeholder="easy / medium / hard" />
            )}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="form-group">
            <label className="input-label">STATUS</label>
            <select value={form.status} onChange={e => set("status", e.target.value)}>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.icon} {v.label}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="input-label">COMPETITION</label>
            <select value={form.comp_id} onChange={e => set("comp_id", e.target.value)}>
              <option value="">— none —</option>
              {comps.map(c => <option key={c.id} value={c.id}>#{c.id} {c.name}</option>)}
            </select>
          </div>
        </div>
        <div className="form-group">
          <label className="input-label">LINK</label>
          <input type="text" value={form.link} onChange={e => set("link", e.target.value)} />
        </div>
        <div className="form-group">
          <label className="input-label">WRITEUP URL</label>
          <input type="text" value={form.writeup} onChange={e => set("writeup", e.target.value)}
            placeholder="https://..." />
        </div>
        <div className="form-group">
          <label className="input-label">SOURCE CODE / SOLVE SCRIPT</label>
          <textarea rows={2} value={form.source_code} onChange={e => set("source_code", e.target.value)}
            placeholder="paste code or link..." />
        </div>
        <div className="form-group">
          <label className="input-label">NOTES</label>
          <textarea rows={3} value={form.notes} onChange={e => set("notes", e.target.value)} />
        </div>
        {form.category === "__custom" && (
          <div className="form-group">
            <label className="input-label">DIFFICULTY</label>
            <input type="text" value={form.difficulty} onChange={e => set("difficulty", e.target.value)} />
          </div>
        )}
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={saving}>Save</button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ────────────────────────────────────────────────────────────── */
export default function ChallengesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [items,    setItems]    = useState([]);
  const [total,    setTotal]    = useState(0);
  const [stats,    setStats]    = useState({});
  const [comps,    setComps]    = useState([]);
  const [offset,   setOffset]   = useState(0);
  const [adding,   setAdding]   = useState(false);
  const [editing,  setEditing]  = useState(null);
  const [loading,  setLoading]  = useState(true);

  const filter    = searchParams.get("status") || "all";
  const catFilter = searchParams.get("category") || "";

  async function load(off = 0, status, category) {
    setLoading(true);
    const params = { limit: PAGE_SIZE, offset: off };
    if (status && status !== "all") params.status = status;
    if (category) params.category = category;

    const [result, s, c] = await Promise.all([
      api.getChallenges(params),
      api.getChallengeStats(),
      api.getCompetitions(),
    ]);
    setItems(result.items);
    setTotal(result.total);
    setStats(s);
    setComps(c.items || []);
    setOffset(off);
    setLoading(false);
  }

  useEffect(() => {
    load(0, filter, catFilter);
  }, [filter, catFilter]);

  function setFilter(f) {
    const params = {};
    if (f !== "all") params.status = f;
    if (catFilter) params.category = catFilter;
    setSearchParams(params);
  }

  function setCatFilter(c) {
    const params = {};
    if (filter !== "all") params.status = filter;
    if (c) params.category = c;
    setSearchParams(params);
  }

  async function handleAdd(data) {
    await api.createChallenge(data);
    await load(0, filter, catFilter);
    setAdding(false);
  }

  async function handleEdit(id, data) {
    const updated = await api.updateChallenge(id, data);
    setItems(is => is.map(i => i.id === id ? updated : i));
    api.getChallengeStats().then(setStats);
    setEditing(null);
  }

  async function handleStatusChange(id, status) {
    const updated = await api.setChallengeStatus(id, status);
    setItems(is => is.map(i => i.id === id ? updated : i));
    api.getChallengeStats().then(setStats);
  }

  async function handleDelete(id) {
    if (!confirm(`Delete challenge #${id}?`)) return;
    await api.deleteChallenge(id);
    setItems(is => is.filter(i => i.id !== id));
    setTotal(t => t - 1);
    api.getChallengeStats().then(setStats);
  }

  const pages = Math.ceil(total / PAGE_SIZE);
  const page  = Math.floor(offset / PAGE_SIZE) + 1;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Challenges</h1>
        <button className="btn btn-primary" onClick={() => setAdding(true)}>+ Add Challenge</button>
      </div>

      {/* Stats bar */}
      <div style={{ display: "flex", gap: 14, marginBottom: 22 }}>
        {[
          { label: "Solved",  value: stats.solved  ?? 0, color: "var(--green)" },
          { label: "Upsolve", value: stats.upsolve ?? 0, color: "var(--blue)" },
          { label: "Review",  value: stats.need_review ?? 0, color: "var(--orange)" },
          { label: "Stuck",   value: stats.stuck   ?? 0, color: "var(--red)" },
          { label: "Total",   value: stats.total   ?? 0, color: "var(--text2)" },
        ].map(({ label, value, color }) => (
          <div key={label} className="card-sm" style={{ flex: 1, textAlign: "center" }}>
            <div style={{ fontSize: 10, color: "var(--text3)", letterSpacing: ".12em", marginBottom: 6, fontFamily: 'var(--font-mono)', fontWeight: 500 }}>
              {label.toUpperCase()}
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color, fontFamily: 'var(--font-sans)', letterSpacing: '-.02em' }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Filter row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 18 }}>
        <div className="filter-tabs" style={{ marginBottom: 0 }}>
          {["all", "solved", "upsolve", "need_review", "stuck"].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`filter-tab ${filter === f ? "active" : ""}`}
            >
              {f === "need_review" ? "REVIEW" : f.toUpperCase()}
            </button>
          ))}
        </div>
        <select
          value={catFilter}
          onChange={e => setCatFilter(e.target.value)}
          style={{
            background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xs)',
            color: 'var(--text2)', fontFamily: 'var(--font-mono)', fontSize: 11, padding: '6px 10px',
            cursor: 'pointer',
          }}
        >
          <option value="">all categories</option>
          {["pwn", "web", "rev", "crypto", "forensic", "misc"].map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text3" style={{ paddingTop: 40, textAlign: 'center', fontSize: 12 }}>loading...</div>
      ) : items.length === 0 ? (
        <div className="empty-state">
          {filter === "need_review" ? "Ga ada yang perlu di-review 👍" : filter === "stuck" ? "Ga ada yang stuck 💪" : "Belum ada challenge."}
        </div>
      ) : (
        <>
          <div className="table-wrap">
            <table style={{ tableLayout: 'fixed', width: '100%' }}>
              <colgroup>
                <col style={{ width: 50 }} />
                <col style={{ width: '30%' }} />
                <col style={{ width: 90 }} />
                <col style={{ width: '15%' }} />
                <col style={{ width: 120 }} />
                <col style={{ width: 60 }} />
                <col style={{ width: 70 }} />
                <col style={{ width: 90 }} />
              </colgroup>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>TITLE</th>
                  <th>CAT</th>
                  <th>COMP</th>
                  <th>STATUS</th>
                  <th>DAYS</th>
                  <th>DIFF</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => {
                  const days = item.solved_at
                    ? Math.floor((new Date(item.solved_at) - new Date(item.created_at)) / 86400000)
                    : daysSince(item.created_at);

                  return (
                    <tr key={item.id}>
                      <td style={{ color: "var(--text3)", fontFamily: 'var(--font-mono)', fontSize: 12 }}>#{item.id}</td>
                      <td>
                        <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.title}
                        </div>
                        {item.link && (
                          <a href={item.link} target="_blank" rel="noopener"
                            style={{ fontSize: 11, color: 'var(--blue)' }}
                            onClick={e => e.stopPropagation()}>
                            🔗 link
                          </a>
                        )}
                      </td>
                      <td>
                        {item.category
                          ? <span className="tag tag-blue">{item.category}</span>
                          : <span className="text3">—</span>}
                      </td>
                      <td style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <span style={{ fontSize: 12, color: 'var(--text2)' }}>
                          {item.comp_name || <span className="text3">—</span>}
                        </span>
                      </td>
                      <td>
                        <StatusDropdown
                          current={item.status}
                          onChange={(s) => handleStatusChange(item.id, s)}
                        />
                      </td>
                      <td style={{
                        color: item.status === 'stuck' && days > 7 ? 'var(--orange)' : 'var(--text2)',
                        fontFamily: 'var(--font-mono)', fontSize: 12,
                      }}>
                        {days === 0 ? "today" : days < 0 ? "—" : `${days}d`}
                      </td>
                      <td style={{ fontSize: 11, color: 'var(--text3)' }}>
                        {item.difficulty || "—"}
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => setEditing(item)}
                            style={{ fontSize: 11 }}
                          >
                            Edit
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDelete(item.id)}
                            style={{ fontSize: 11 }}
                          >
                            Del
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {pages > 1 && (
            <div className="pagination">
              <span className="page-info">{total} challenges · page {page}/{pages}</span>
              <button className="btn btn-ghost btn-sm" disabled={offset === 0}
                onClick={() => load(offset - PAGE_SIZE, filter, catFilter)}>← prev</button>
              <button className="btn btn-ghost btn-sm" disabled={offset + PAGE_SIZE >= total}
                onClick={() => load(offset + PAGE_SIZE, filter, catFilter)}>next →</button>
            </div>
          )}
        </>
      )}

      {adding  && <AddModal comps={comps} onAdd={handleAdd} onClose={() => setAdding(false)} />}
      {editing && <EditModal item={editing} comps={comps} onSave={handleEdit} onClose={() => setEditing(null)} />}
    </div>
  );
}
