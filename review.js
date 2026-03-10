import { Router } from "express";
import { pool, addReviewItem, listReviewItems, markReviewDone, deleteReviewItem, getReviewStats } from "../../src/db.js";

const router = Router();
const uid = () => process.env.DISCORD_USER_ID;

// GET /api/review?status=pending
router.get("/", async (req, res) => {
  try {
    const status = req.query.status || "pending";
    const items  = await listReviewItems(uid(), status === "all" ? undefined : status);
    const stats  = await getReviewStats(uid());
    res.json({ items, stats });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/review/all
router.get("/all", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM review_items WHERE discord_user_id=$1 ORDER BY added_at DESC`,
      [uid()]
    );
    const stats = await getReviewStats(uid());
    res.json({ items: result.rows, stats });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/review
router.post("/", async (req, res) => {
  try {
    const { title, category } = req.body;
    if (!title?.trim()) return res.status(400).json({ error: "Title required" });
    const item = await addReviewItem(uid(), title.trim(), category?.trim() || null);
    res.json(item);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/review/:id — edit title/category
router.put("/:id", async (req, res) => {
  try {
    const { title, category } = req.body;
    const result = await pool.query(
      `UPDATE review_items SET title=$1, category=$2
       WHERE id=$3 AND discord_user_id=$4 RETURNING *`,
      [title, category || null, req.params.id, uid()]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: "Not found" });
    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH /api/review/:id/done
router.patch("/:id/done", async (req, res) => {
  try {
    const item = await markReviewDone(uid(), req.params.id);
    if (!item) return res.status(404).json({ error: "Not found or already done" });
    res.json(item);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH /api/review/:id/reopen
router.patch("/:id/reopen", async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE review_items SET status='pending', done_at=NULL
       WHERE id=$1 AND discord_user_id=$2 RETURNING *`,
      [req.params.id, uid()]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: "Not found" });
    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/review/:id
router.delete("/:id", async (req, res) => {
  try {
    const ok = await deleteReviewItem(uid(), req.params.id);
    ok ? res.json({ ok: true }) : res.status(404).json({ error: "Not found" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
