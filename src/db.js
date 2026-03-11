import pg from "pg";

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS standup_entries (
      id              SERIAL PRIMARY KEY,
      discord_user_id TEXT NOT NULL,
      done            TEXT,
      todo            TEXT,
      notes           TEXT,
      blockers        TEXT,
      revisit         TEXT,
      created_at      TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS review_items (
      id              SERIAL PRIMARY KEY,
      discord_user_id TEXT NOT NULL,
      title           TEXT NOT NULL,
      category        TEXT,
      status          TEXT NOT NULL DEFAULT 'pending',
      added_at        TIMESTAMPTZ DEFAULT NOW(),
      done_at         TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS competitions (
      id              SERIAL PRIMARY KEY,
      discord_user_id TEXT NOT NULL,
      name            TEXT NOT NULL,
      team_name       TEXT,
      members         TEXT,
      notes           TEXT,
      url             TEXT,
      status          TEXT NOT NULL DEFAULT 'upcoming',
      start_date      TIMESTAMPTZ,
      end_date        TIMESTAMPTZ,
      ranking         TEXT,
      created_at      TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS challenges (
      id              SERIAL PRIMARY KEY,
      discord_user_id TEXT NOT NULL,
      title           TEXT NOT NULL,
      category        TEXT,
      status          TEXT NOT NULL DEFAULT 'stuck',
      link            TEXT,
      source_code     TEXT,
      writeup         TEXT,
      notes           TEXT,
      difficulty      TEXT,
      comp_id         INTEGER REFERENCES competitions(id) ON DELETE SET NULL,
      created_at      TIMESTAMPTZ DEFAULT NOW(),
      solved_at       TIMESTAMPTZ
    );
  `);
  console.log("✅ DB ready");
}

// ── Standup ──────────────────────────────────────────────────────────────────

export async function insertStandup(userId, { done, todo, notes, blockers, revisit }) {
  const res = await pool.query(
    `INSERT INTO standup_entries (discord_user_id, done, todo, notes, blockers, revisit)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [userId, done, todo, notes, blockers, revisit]
  );
  return res.rows[0];
}

export async function getStandups(userId, limit = 5) {
  const res = await pool.query(
    `SELECT * FROM standup_entries
     WHERE discord_user_id = $1
     ORDER BY created_at DESC LIMIT $2`,
    [userId, limit]
  );
  return res.rows;
}

export async function deleteStandup(userId, id) {
  const res = await pool.query(
    `DELETE FROM standup_entries WHERE id=$1 AND discord_user_id=$2 RETURNING id`,
    [id, userId]
  );
  return res.rowCount > 0;
}

// ── Review items ─────────────────────────────────────────────────────────────

export async function addReviewItem(userId, title, category = null) {
  const res = await pool.query(
    `INSERT INTO review_items (discord_user_id, title, category)
     VALUES ($1,$2,$3) RETURNING *`,
    [userId, title, category]
  );
  return res.rows[0];
}

export async function listReviewItems(userId, status = "pending") {
  const res = await pool.query(
    `SELECT *, NOW() AS now FROM review_items
     WHERE discord_user_id=$1 AND status=$2
     ORDER BY added_at ASC`,
    [userId, status]
  );
  return res.rows;
}

export async function markReviewDone(userId, id) {
  const res = await pool.query(
    `UPDATE review_items SET status='done', done_at=NOW()
     WHERE id=$1 AND discord_user_id=$2 AND status='pending'
     RETURNING *`,
    [id, userId]
  );
  return res.rows[0] ?? null;
}

export async function deleteReviewItem(userId, id) {
  const res = await pool.query(
    `DELETE FROM review_items WHERE id=$1 AND discord_user_id=$2 RETURNING id`,
    [id, userId]
  );
  return res.rowCount > 0;
}

export async function getReviewStats(userId) {
  const res = await pool.query(
    `SELECT
       COUNT(*) FILTER (WHERE status='pending') AS pending,
       COUNT(*) FILTER (WHERE status='done')    AS done,
       COUNT(*)                                 AS total
     FROM review_items WHERE discord_user_id=$1`,
    [userId]
  );
  return res.rows[0];
}

// ── Competitions ─────────────────────────────────────────────────────────────

export async function insertCompetition(userId, { name, team_name, members, url, notes, start_date, end_date }) {
  const res = await pool.query(
    `INSERT INTO competitions (discord_user_id, name, team_name, members, url, notes, start_date, end_date)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [userId, name, team_name || null, members || null, url || null, notes || null, start_date || null, end_date || null]
  );
  return res.rows[0];
}

export async function getCompetitions(userId) {
  const res = await pool.query(
    `SELECT c.*,
       COUNT(ch.id)::int AS challenge_count,
       COUNT(ch.id) FILTER (WHERE ch.status = 'solved')::int AS solved_count
     FROM competitions c
     LEFT JOIN challenges ch ON ch.comp_id = c.id AND ch.discord_user_id = c.discord_user_id
     WHERE c.discord_user_id = $1
     GROUP BY c.id
     ORDER BY c.created_at DESC`,
    [userId]
  );
  return res.rows;
}

export async function getCompetition(userId, id) {
  const res = await pool.query(
    `SELECT * FROM competitions WHERE id=$1 AND discord_user_id=$2`,
    [id, userId]
  );
  return res.rows[0] ?? null;
}

export async function updateCompetition(userId, id, fields) {
  const allowed = ["name", "team_name", "members", "url", "notes", "status", "ranking", "start_date", "end_date"];
  const sets = [];
  const vals = [];
  let idx = 1;

  for (const key of allowed) {
    if (fields[key] !== undefined) {
      sets.push(`${key}=$${idx++}`);
      vals.push(fields[key]);
    }
  }

  if (sets.length === 0) return null;

  vals.push(id, userId);
  const res = await pool.query(
    `UPDATE competitions SET ${sets.join(", ")}
     WHERE id=$${idx++} AND discord_user_id=$${idx}
     RETURNING *`,
    vals
  );
  return res.rows[0] ?? null;
}

export async function deleteCompetition(userId, id) {
  // Unlink challenges first
  await pool.query(
    `UPDATE challenges SET comp_id=NULL WHERE comp_id=$1 AND discord_user_id=$2`,
    [id, userId]
  );
  const res = await pool.query(
    `DELETE FROM competitions WHERE id=$1 AND discord_user_id=$2 RETURNING id`,
    [id, userId]
  );
  return res.rowCount > 0;
}

export async function addCompNote(userId, id, note) {
  const existing = await getCompetition(userId, id);
  if (!existing) return null;
  const updated = existing.notes ? existing.notes + "\n" + note : note;
  return updateCompetition(userId, id, { notes: updated });
}

// ── Challenges ───────────────────────────────────────────────────────────────

const VALID_STATUSES = ["solved", "upsolve", "need_review", "stuck"];
const VALID_CATEGORIES = ["pwn", "web", "rev", "crypto", "forensic", "misc"];

export function isValidStatus(s) {
  return VALID_STATUSES.includes(s);
}

export function isValidCategory(c) {
  // Allow fixed list + custom
  return typeof c === "string" && c.trim().length > 0;
}

export function getValidStatuses() {
  return [...VALID_STATUSES];
}

export function getFixedCategories() {
  return [...VALID_CATEGORIES];
}

export async function insertChallenge(userId, { title, category, link, comp_id, difficulty, notes }) {
  const res = await pool.query(
    `INSERT INTO challenges (discord_user_id, title, category, link, comp_id, difficulty, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [userId, title, category || null, link || null, comp_id || null, difficulty || null, notes || null]
  );
  return res.rows[0];
}

export async function getChallenges(userId, { status, category, comp_id, limit = 50, offset = 0 } = {}) {
  let where = "WHERE ch.discord_user_id = $1";
  const vals = [userId];
  let idx = 2;

  if (status) {
    where += ` AND ch.status = $${idx++}`;
    vals.push(status);
  }
  if (category) {
    where += ` AND ch.category = $${idx++}`;
    vals.push(category);
  }
  if (comp_id) {
    where += ` AND ch.comp_id = $${idx++}`;
    vals.push(comp_id);
  }

  vals.push(limit, offset);

  const data = await pool.query(
    `SELECT ch.*, c.name AS comp_name
     FROM challenges ch
     LEFT JOIN competitions c ON c.id = ch.comp_id
     ${where}
     ORDER BY ch.created_at DESC
     LIMIT $${idx++} OFFSET $${idx}`,
    vals
  );

  // Count with same filters
  const countVals = vals.slice(0, -2); // remove limit/offset
  const countRes = await pool.query(
    `SELECT COUNT(*) FROM challenges ch ${where}`,
    countVals
  );

  return { items: data.rows, total: parseInt(countRes.rows[0].count) };
}

export async function getChallenge(userId, id) {
  const res = await pool.query(
    `SELECT ch.*, c.name AS comp_name
     FROM challenges ch
     LEFT JOIN competitions c ON c.id = ch.comp_id
     WHERE ch.id=$1 AND ch.discord_user_id=$2`,
    [id, userId]
  );
  return res.rows[0] ?? null;
}

export async function updateChallengeStatus(userId, id, status) {
  if (!isValidStatus(status)) return null;
  const solved_at = status === "solved" ? "NOW()" : "NULL";
  const res = await pool.query(
    `UPDATE challenges SET status=$1, solved_at=${status === "solved" ? "NOW()" : "NULL"}
     WHERE id=$2 AND discord_user_id=$3
     RETURNING *`,
    [status, id, userId]
  );
  return res.rows[0] ?? null;
}

export async function updateChallenge(userId, id, fields) {
  const allowed = ["title", "category", "link", "source_code", "writeup", "notes", "difficulty", "comp_id", "status"];
  const sets = [];
  const vals = [];
  let idx = 1;

  for (const key of allowed) {
    if (fields[key] !== undefined) {
      sets.push(`${key}=$${idx++}`);
      vals.push(fields[key]);
    }
  }

  // Auto-set solved_at
  if (fields.status === "solved") {
    sets.push(`solved_at=NOW()`);
  } else if (fields.status && fields.status !== "solved") {
    sets.push(`solved_at=NULL`);
  }

  if (sets.length === 0) return null;

  vals.push(id, userId);
  const res = await pool.query(
    `UPDATE challenges SET ${sets.join(", ")}
     WHERE id=$${idx++} AND discord_user_id=$${idx}
     RETURNING *`,
    vals
  );
  return res.rows[0] ?? null;
}

export async function deleteChallenge(userId, id) {
  const res = await pool.query(
    `DELETE FROM challenges WHERE id=$1 AND discord_user_id=$2 RETURNING id`,
    [id, userId]
  );
  return res.rowCount > 0;
}

export async function addChallengeNote(userId, id, note) {
  const existing = await getChallenge(userId, id);
  if (!existing) return null;
  const updated = existing.notes ? existing.notes + "\n" + note : note;
  return updateChallenge(userId, id, { notes: updated });
}

export async function linkChallengeToComp(userId, challengeId, compId) {
  // Verify comp exists
  const comp = await getCompetition(userId, compId);
  if (!comp) return null;
  return updateChallenge(userId, challengeId, { comp_id: compId });
}

export async function getChallengeStats(userId) {
  const res = await pool.query(
    `SELECT
       COUNT(*)                                    AS total,
       COUNT(*) FILTER (WHERE status='solved')     AS solved,
       COUNT(*) FILTER (WHERE status='upsolve')    AS upsolve,
       COUNT(*) FILTER (WHERE status='need_review') AS need_review,
       COUNT(*) FILTER (WHERE status='stuck')      AS stuck
     FROM challenges WHERE discord_user_id=$1`,
    [userId]
  );
  return res.rows[0];
}

// ── Streak (standup submission days, WIB UTC+7) ───────────────────────────────

export async function getStreak(userId) {
  const res = await pool.query(
    `SELECT DISTINCT
       (created_at AT TIME ZONE 'Asia/Jakarta')::date AS day
     FROM standup_entries
     WHERE discord_user_id = $1
     ORDER BY day DESC`,
    [userId]
  );

  const days = res.rows.map((r) => r.day.toISOString().slice(0, 10));
  if (days.length === 0) return { current: 0, longest: 0, total: 0 };

  const todayStr = new Date()
    .toLocaleDateString("sv-SE", { timeZone: "Asia/Jakarta" });

  let current = 0;
  let cursor = new Date(todayStr);

  for (const day of days) {
    const expected = cursor.toISOString().slice(0, 10);
    if (day === expected) {
      current++;
      cursor.setDate(cursor.getDate() - 1);
    } else if (current === 0) {
      const yesterday = new Date(todayStr);
      yesterday.setDate(yesterday.getDate() - 1);
      if (day === yesterday.toISOString().slice(0, 10)) {
        current++;
        cursor = new Date(day);
        cursor.setDate(cursor.getDate() - 1);
      } else {
        break;
      }
    } else {
      break;
    }
  }

  let longest = current;
  let run = 1;
  for (let i = 1; i < days.length; i++) {
    const prev = new Date(days[i - 1]);
    const curr = new Date(days[i]);
    if ((prev - curr) / 86400000 === 1) {
      longest = Math.max(longest, ++run);
    } else {
      run = 1;
    }
  }

  return { current, longest, total: days.length };
}
