import { Router } from "express";
import {
  getCompetitions, getCompetition, insertCompetition,
  updateCompetition, deleteCompetition,
} from "../../src/db.js";
import { pool } from "../../src/db.js";

const router = Router();
const uid = () => process.env.DISCORD_USER_ID;

// GET /api/competitions
router.get("/", async (req, res) => {
  try {
    const items = await getCompetitions(uid());
    res.json({ items });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/competitions/:id
router.get("/:id", async (req, res) => {
  try {
    const item = await getCompetition(uid(), req.params.id);
    if (!item) return res.status(404).json({ error: "Not found" });

    // Also fetch linked challenges
    const chals = await pool.query(
      `SELECT id, title, category, status, solved_at, created_at
       FROM challenges WHERE comp_id=$1 AND discord_user_id=$2
       ORDER BY created_at DESC`,
      [req.params.id, uid()]
    );

    res.json({ ...item, challenges: chals.rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/competitions
router.post("/", async (req, res) => {
  try {
    const { name, team_name, members, url, notes, start_date, end_date } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: "Name required" });
    const item = await insertCompetition(uid(), {
      name: name.trim(),
      team_name: team_name?.trim() || null,
      members: members?.trim() || null,
      url: url?.trim() || null,
      notes: notes?.trim() || null,
      start_date: start_date || null,
      end_date: end_date || null,
    });
    res.json(item);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/competitions/:id
router.put("/:id", async (req, res) => {
  try {
    const item = await updateCompetition(uid(), req.params.id, req.body);
    if (!item) return res.status(404).json({ error: "Not found" });
    res.json(item);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/competitions/:id
router.delete("/:id", async (req, res) => {
  try {
    const ok = await deleteCompetition(uid(), req.params.id);
    ok ? res.json({ ok: true }) : res.status(404).json({ error: "Not found" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
