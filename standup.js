import { Router } from "express";
import ExcelJS from "exceljs";
import { pool, getStandups, insertStandup, deleteStandup, getStreak } from "../../src/db.js";

const router = Router();

// GET /api/standup?limit=20&offset=0
router.get("/", async (req, res) => {
  try {
    const userId = process.env.DISCORD_USER_ID;
    const limit  = Math.min(parseInt(req.query.limit)  || 20, 100);
    const offset = parseInt(req.query.offset) || 0;

    const data = await pool.query(
      `SELECT * FROM standup_entries
       WHERE discord_user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    const count = await pool.query(
      `SELECT COUNT(*) FROM standup_entries WHERE discord_user_id=$1`,
      [userId]
    );
    res.json({ entries: data.rows, total: parseInt(count.rows[0].count) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/standup/streak
router.get("/streak", async (req, res) => {
  try {
    const streak = await getStreak(process.env.DISCORD_USER_ID);
    res.json(streak);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/standup/:id
router.put("/:id", async (req, res) => {
  try {
    const userId = process.env.DISCORD_USER_ID;
    const { done, todo, notes, blockers, revisit } = req.body;
    const result = await pool.query(
      `UPDATE standup_entries
       SET done=$1, todo=$2, notes=$3, blockers=$4, revisit=$5
       WHERE id=$6 AND discord_user_id=$7
       RETURNING *`,
      [done, todo, notes, blockers, revisit, req.params.id, userId]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: "Not found" });
    res.json(result.rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/standup/:id
router.delete("/:id", async (req, res) => {
  try {
    const ok = await deleteStandup(process.env.DISCORD_USER_ID, req.params.id);
    ok ? res.json({ ok: true }) : res.status(404).json({ error: "Not found" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/standup/export.xlsx
router.get("/export.xlsx", async (req, res) => {
  try {
    const userId  = process.env.DISCORD_USER_ID;
    const entries = (await pool.query(
      `SELECT * FROM standup_entries WHERE discord_user_id=$1 ORDER BY created_at DESC`,
      [userId]
    )).rows;
    const reviews = (await pool.query(
      `SELECT * FROM review_items WHERE discord_user_id=$1 ORDER BY added_at DESC`,
      [userId]
    )).rows;
    const streak = await getStreak(userId);

    const wb = new ExcelJS.Workbook();
    wb.creator = "standup-bot";

    // ── Sheet 1: Standup Log ────────────────────────────────────────────────
    const s1 = wb.addWorksheet("Standup Log");
    s1.columns = [
      { header: "ID",       key: "id",         width: 6  },
      { header: "Date",     key: "date",        width: 22 },
      { header: "Done",     key: "done",        width: 40 },
      { header: "Todo",     key: "todo",        width: 40 },
      { header: "Notes",    key: "notes",       width: 35 },
      { header: "Blockers", key: "blockers",    width: 30 },
      { header: "Revisit",  key: "revisit",     width: 30 },
    ];

    // Header style
    s1.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FF000000" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF00FF88" } };
      cell.alignment = { vertical: "middle", horizontal: "center" };
    });
    s1.getRow(1).height = 22;

    entries.forEach((e, i) => {
      const row = s1.addRow({
        id:       e.id,
        date:     new Date(e.created_at).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }),
        done:     e.done     || "",
        todo:     e.todo     || "",
        notes:    e.notes    || "",
        blockers: e.blockers || "",
        revisit:  e.revisit  || "",
      });
      row.eachCell((cell) => {
        cell.alignment = { wrapText: true, vertical: "top" };
      });
      row.getCell("id").alignment = { horizontal: "center", vertical: "top" };
      if (i % 2 === 1) {
        row.eachCell((cell) => {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF5F5F5" } };
        });
      }
    });

    // Freeze header
    s1.views = [{ state: "frozen", ySplit: 1 }];

    // ── Sheet 2: Review Items ───────────────────────────────────────────────
    const s2 = wb.addWorksheet("Review Items");
    s2.columns = [
      { header: "ID",       key: "id",       width: 6  },
      { header: "Title",    key: "title",    width: 45 },
      { header: "Category", key: "category", width: 15 },
      { header: "Status",   key: "status",   width: 10 },
      { header: "Added",    key: "added",    width: 20 },
      { header: "Done At",  key: "done_at",  width: 20 },
      { header: "Days",     key: "days",     width: 8  },
    ];

    s2.getRow(1).eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFF9900" } };
      cell.alignment = { vertical: "middle", horizontal: "center" };
    });
    s2.getRow(1).height = 22;

    reviews.forEach((r, i) => {
      const addedDate = new Date(r.added_at);
      const endDate   = r.done_at ? new Date(r.done_at) : new Date();
      const days      = Math.floor((endDate - addedDate) / 86400000);

      const row = s2.addRow({
        id:       r.id,
        title:    r.title,
        category: r.category || "",
        status:   r.status,
        added:    addedDate.toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }),
        done_at:  r.done_at ? new Date(r.done_at).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }) : "",
        days,
      });

      const statusCell = row.getCell("status");
      if (r.status === "done") {
        statusCell.font = { color: { argb: "FF00AA55" }, bold: true };
      } else {
        statusCell.font = { color: { argb: "FFCC6600" }, bold: true };
      }

      if (i % 2 === 1) {
        row.eachCell((cell) => {
          if (!cell.font?.color) {
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF8EE" } };
          }
        });
      }
    });

    s2.views = [{ state: "frozen", ySplit: 1 }];

    // ── Sheet 3: Stats ──────────────────────────────────────────────────────
    const s3 = wb.addWorksheet("Stats");
    s3.columns = [{ key: "label", width: 28 }, { key: "value", width: 20 }];

    const statsData = [
      ["STANDUP", ""],
      ["Current Streak (days)", streak.current],
      ["Longest Streak (days)", streak.longest],
      ["Total Standups",        streak.total],
      ["", ""],
      ["REVIEW", ""],
      ["Total Items",   reviews.length],
      ["Pending",       reviews.filter(r => r.status === "pending").length],
      ["Done",          reviews.filter(r => r.status === "done").length],
      ["Solve Rate",    reviews.length ? `${Math.round(reviews.filter(r => r.status === "done").length / reviews.length * 100)}%` : "0%"],
      ["", ""],
      ["Exported At", new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })],
    ];

    statsData.forEach(([label, value]) => {
      const row = s3.addRow({ label, value });
      if (value === "" && label !== "") {
        // Section header
        row.getCell("label").font = { bold: true, size: 12 };
        row.getCell("label").fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1A1A1A" } };
        row.getCell("label").font = { bold: true, color: { argb: "FF00FF88" } };
      } else if (label) {
        row.getCell("label").font = { color: { argb: "FF555555" } };
        row.getCell("value").font = { bold: true };
      }
    });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="standup-${new Date().toISOString().slice(0,10)}.xlsx"`);
    await wb.xlsx.write(res);
    res.end();
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

export default router;
