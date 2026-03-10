import React, { useEffect, useState } from "react";
import { api } from "../lib/api.js";

const PAGE_SIZE = 20;

function fmtDate(d) {
  return new Date(d).toLocaleDateString("id-ID", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta",
  });
}

function EntryRow({ entry, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <tr style={{ cursor: "pointer" }} onClick={() => setExpanded(x => !x)}>
        <td style={{ width: 36, color: "var(--text3)" }}>#{entry.id}</td>
        <td style={{ width: 160, color: "var(--text2)", whiteSpace: "nowrap" }}>{fmtDate(entry.created_at)}</td>
        <td className="td-clamp">{entry.done || <span className="text3">—</span>}</td>
        <td className="td-clamp">{entry.todo || <span className="text3">—</span>}</td>
        <td style={{ width: 80 }}>
          <div style={{ display: "flex", gap: 4 }} onClick={e => e.stopPropagation()}>
            <button className="btn btn-ghost btn-sm btn-icon" onClick={() => onEdit(entry)}>✎</button>
            <button className="btn btn-danger btn-sm btn-icon" onClick={() => onDelete(entry.id)}>✕</button>
          </div>
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={5} style={{ background: "var(--bg2)", paddingBottom: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, padding: "8px 14px 0" }}>
              {[
                { key: "done",     icon: "✅", label: "Done"     },
                { key: "todo",     icon: "🎯", label: "Todo"     },
                { key: "notes",    icon: "📝", label: "Notes"    },
                { key: "blockers", icon: "🚧", label: "Blockers" },
                { key: "revisit",  icon: "🔁", label: "Revisit"  },
              ].filter(s => entry[s.key]?.trim()).map(({ key, icon, label }) => (
                <div key={key}>
                  <div style={{ fontSize: 10, color: "var(--text3)", letterSpacing: ".1em", marginBottom: 4 }}>
                    {icon} {label.toUpperCase()}
                  </div>
                  <div style={{ color: "var(--text2)", whiteSpace: "pre-wrap", fontSize: 12 }}>{entry[key]}</div>
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function EditModal({ entry, onSave, onClose }) {
  const [form, setForm] = useState({
    done: entry.done || "", todo: entry.todo || "",
    notes: entry.notes || "", blockers: entry.blockers || "",
    revisit: entry.revisit || "",
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await onSave(entry.id, form);
    setSaving(false);
  }

  const fields = [
    { key: "done",     label: "✅ DONE",     rows: 3 },
    { key: "todo",     label: "🎯 TODO",     rows: 3 },
    { key: "notes",    label: "📝 NOTES",    rows: 2 },
    { key: "blockers", label: "🚧 BLOCKERS", rows: 2 },
    { key: "revisit",  label: "🔁 REVISIT",  rows: 2 },
  ];

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">Edit Standup #{entry.id}</div>
        {fields.map(({ key, label, rows }) => (
          <div className="form-group" key={key}>
            <label className="input-label">{label}</label>
            <textarea
              rows={rows}
              value={form[key]}
              onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
            />
          </div>
        ))}
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function StandupPage() {
  const [entries, setEntries] = useState([]);
  const [total,   setTotal]   = useState(0);
  const [offset,  setOffset]  = useState(0);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);

  async function load(off = 0) {
    setLoading(true);
    const { entries, total } = await api.getStandups(PAGE_SIZE, off);
    setEntries(entries);
    setTotal(total);
    setOffset(off);
    setLoading(false);
  }

  useEffect(() => { load(0); }, []);

  async function handleSave(id, data) {
    const updated = await api.updateStandup(id, data);
    setEntries(es => es.map(e => e.id === id ? updated : e));
    setEditing(null);
  }

  async function handleDelete(id) {
    if (!confirm(`Delete standup #${id}?`)) return;
    await api.deleteStandup(id);
    setEntries(es => es.filter(e => e.id !== id));
    setTotal(t => t - 1);
  }

  const pages = Math.ceil(total / PAGE_SIZE);
  const page  = Math.floor(offset / PAGE_SIZE) + 1;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Standup Log</h1>
        <button className="btn btn-ghost" onClick={() => api.exportXlsx()}>
          ↓ Export Excel
        </button>
      </div>

      {loading ? (
        <div className="text3">loading...</div>
      ) : entries.length === 0 ? (
        <div className="empty-state">Belum ada standup. Pake <code>/standup</code> di Discord.</div>
      ) : (
        <>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>DATE</th>
                  <th>DONE</th>
                  <th>TODO</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {entries.map(e => (
                  <EntryRow key={e.id} entry={e} onEdit={setEditing} onDelete={handleDelete} />
                ))}
              </tbody>
            </table>
          </div>

          <div className="pagination">
            <span className="page-info">{total} entries · page {page}/{pages}</span>
            <button className="btn btn-ghost btn-sm" disabled={offset === 0} onClick={() => load(offset - PAGE_SIZE)}>← prev</button>
            <button className="btn btn-ghost btn-sm" disabled={offset + PAGE_SIZE >= total} onClick={() => load(offset + PAGE_SIZE)}>next →</button>
          </div>
        </>
      )}

      {editing && (
        <EditModal entry={editing} onSave={handleSave} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}
