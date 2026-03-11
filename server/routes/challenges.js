import { Router } from "express";
import {
  getChallenges, getChallenge, insertChallenge,
  updateChallenge, updateChallengeStatus, deleteChallenge,
  addChallengeNote, linkChallengeToComp, getChallengeStats,
  getFixedCategories, getValidStatuses,
} from "../../src/db.js";

const router = Router();
const uid = () => process.env.DISCORD_USER_ID;

// GET /api/challenges?status=stuck&category=pwn&comp_id=3&limit=50&offset=0
router.get("/", async (req, res) => {
  try {
    const { status, category, comp_id, limit, offset } = req.query;
    const result = await getChallenges(uid(), {
      status: status || undefined,
      category: category || undefined,
      comp_id: comp_id ? parseInt(comp_id) : undefined,
      limit: Math.min(parseInt(limit) || 50, 100),
      offset: parseInt(offset) || 0,
    });
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/challenges/stats
router.get("/stats", async (req, res) => {
  try {
    const stats = await getChallengeStats(uid());
    res.json(stats);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/challenges/meta — fixed categories + valid statuses
router.get("/meta", async (req, res) => {
  res.json({
    categories: getFixedCategories(),
    statuses: getValidStatuses(),
  });
});

// GET /api/challenges/:id
router.get("/:id", async (req, res) => {
  try {
    const item = await getChallenge(uid(), req.params.id);
    if (!item) return res.status(404).json({ error: "Not found" });
    res.json(item);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/challenges
router.post("/", async (req, res) => {
  try {
    const { title, category, link, comp_id, difficulty, notes } = req.body;
    if (!title?.trim()) return res.status(400).json({ error: "Title required" });
    const item = await insertChallenge(uid(), {
      title: title.trim(),
      category: category?.trim() || null,
      link: link?.trim() || null,
      comp_id: comp_id || null,
      difficulty: difficulty?.trim() || null,
      notes: notes?.trim() || null,
    });
    res.json(item);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/challenges/:id — general update
router.put("/:id", async (req, res) => {
  try {
    const item = await updateChallenge(uid(), req.params.id, req.body);
    if (!item) return res.status(404).json({ error: "Not found" });
    res.json(item);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH /api/challenges/:id/status — quick status change
router.patch("/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    const item = await updateChallengeStatus(uid(), req.params.id, status);
    if (!item) return res.status(404).json({ error: "Not found or invalid status" });
    res.json(item);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH /api/challenges/:id/note — append note
router.patch("/:id/note", async (req, res) => {
  try {
    const { note } = req.body;
    if (!note?.trim()) return res.status(400).json({ error: "Note required" });
    const item = await addChallengeNote(uid(), req.params.id, note.trim());
    if (!item) return res.status(404).json({ error: "Not found" });
    res.json(item);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH /api/challenges/:id/link — link to competition
router.patch("/:id/link", async (req, res) => {
  try {
    const { comp_id } = req.body;
    const item = await linkChallengeToComp(uid(), req.params.id, comp_id);
    if (!item) return res.status(404).json({ error: "Challenge or competition not found" });
    res.json(item);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/challenges/:id
router.delete("/:id", async (req, res) => {
  try {
    const ok = await deleteChallenge(uid(), req.params.id);
    ok ? res.json({ ok: true }) : res.status(404).json({ error: "Not found" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
