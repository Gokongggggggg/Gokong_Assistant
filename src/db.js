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

  // Today in WIB
  const todayStr = new Date()
    .toLocaleDateString("sv-SE", { timeZone: "Asia/Jakarta" }); // "YYYY-MM-DD"

  // Current streak
  let current = 0;
  let cursor = new Date(todayStr);

  for (const day of days) {
    const expected = cursor.toISOString().slice(0, 10);
    if (day === expected) {
      current++;
      cursor.setDate(cursor.getDate() - 1);
    } else if (current === 0) {
      // Allow streak if last entry was yesterday (hasn't submitted today yet)
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

  // Longest streak
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
