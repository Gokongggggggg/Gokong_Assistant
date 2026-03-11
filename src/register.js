import "dotenv/config";
import { REST, Routes, SlashCommandBuilder } from "discord.js";

const CATEGORY_CHOICES = [
  { name: "pwn",      value: "pwn"      },
  { name: "web",      value: "web"      },
  { name: "rev",      value: "rev"      },
  { name: "crypto",   value: "crypto"   },
  { name: "forensic", value: "forensic" },
  { name: "misc",     value: "misc"     },
];

const commands = [
  // ── /standup ──────────────────────────────────────────────────────────────
  new SlashCommandBuilder()
    .setName("standup")
    .setDescription("Log daily standup dengan free-text. Gunakan header: DONE / TODO / NOTE / BLOCKER / REVISIT")
    .addStringOption((o) =>
      o.setName("log")
        .setDescription("Paste standup lo di sini")
        .setRequired(true)
    ),

  // ── /log ──────────────────────────────────────────────────────────────────
  new SlashCommandBuilder()
    .setName("log")
    .setDescription("Liat history standup")
    .addIntegerOption((o) =>
      o.setName("limit").setDescription("Jumlah entries (default 5)").setMinValue(1).setMaxValue(20)
    ),

  // ── /review (legacy, quick list) ──────────────────────────────────────────
  new SlashCommandBuilder()
    .setName("review")
    .setDescription("Manage review / upsolve list")
    .addSubcommand((s) =>
      s.setName("list").setDescription("Liat semua pending review items")
    )
    .addSubcommand((s) =>
      s.setName("add")
        .setDescription("Tambah item baru ke review list")
        .addStringOption((o) => o.setName("title").setDescription("Nama problem/task").setRequired(true))
        .addStringOption((o) => o.setName("category").setDescription("Kategori, e.g. CTF, thesis, pwn").setRequired(false))
    )
    .addSubcommand((s) =>
      s.setName("done")
        .setDescription("Mark review item sebagai selesai")
        .addIntegerOption((o) => o.setName("id").setDescription("ID item (liat dari /review list)").setRequired(true))
    )
    .addSubcommand((s) =>
      s.setName("delete")
        .setDescription("Hapus review item")
        .addIntegerOption((o) => o.setName("id").setDescription("ID item").setRequired(true))
    )
    .addSubcommand((s) =>
      s.setName("stats").setDescription("Liat streak & review stats lo")
    ),

  // ── /export ───────────────────────────────────────────────────────────────
  new SlashCommandBuilder()
    .setName("export")
    .setDescription("Export standup history ke CSV via DM"),

  // ── /delete (standup) ─────────────────────────────────────────────────────
  new SlashCommandBuilder()
    .setName("delete")
    .setDescription("Hapus standup entry by ID")
    .addIntegerOption((o) => o.setName("id").setDescription("ID entry").setRequired(true)),

  // ── /challenge ────────────────────────────────────────────────────────────
  new SlashCommandBuilder()
    .setName("challenge")
    .setDescription("Track CTF challenges")
    .addSubcommand((s) =>
      s.setName("add")
        .setDescription("Log challenge baru")
        .addStringOption((o) => o.setName("title").setDescription("Nama challenge").setRequired(true))
        .addStringOption((o) =>
          o.setName("category").setDescription("Category")
            .addChoices(...CATEGORY_CHOICES)
            .setRequired(false)
        )
        .addStringOption((o) => o.setName("custom_category").setDescription("Custom category (kalau ga ada di list)").setRequired(false))
        .addStringOption((o) => o.setName("link").setDescription("Link to problem").setRequired(false))
        .addIntegerOption((o) => o.setName("comp_id").setDescription("Competition ID (link ke comp)").setRequired(false))
        .addStringOption((o) => o.setName("difficulty").setDescription("Difficulty (e.g. easy, medium, hard)").setRequired(false))
    )
    .addSubcommand((s) =>
      s.setName("solve")
        .setDescription("Mark challenge as solved")
        .addIntegerOption((o) => o.setName("id").setDescription("Challenge ID").setRequired(true))
    )
    .addSubcommand((s) =>
      s.setName("upsolve")
        .setDescription("Mark challenge as upsolve (solved after comp)")
        .addIntegerOption((o) => o.setName("id").setDescription("Challenge ID").setRequired(true))
    )
    .addSubcommand((s) =>
      s.setName("review")
        .setDescription("Mark challenge as need review")
        .addIntegerOption((o) => o.setName("id").setDescription("Challenge ID").setRequired(true))
    )
    .addSubcommand((s) =>
      s.setName("note")
        .setDescription("Add note to a challenge")
        .addIntegerOption((o) => o.setName("id").setDescription("Challenge ID").setRequired(true))
        .addStringOption((o) => o.setName("text").setDescription("Note content").setRequired(true))
    )
    .addSubcommand((s) =>
      s.setName("list")
        .setDescription("List recent challenges")
        .addStringOption((o) =>
          o.setName("status").setDescription("Filter by status")
            .addChoices(
              { name: "solved",      value: "solved"      },
              { name: "upsolve",     value: "upsolve"     },
              { name: "need_review", value: "need_review" },
              { name: "stuck",       value: "stuck"       },
            )
            .setRequired(false)
        )
    ),

  // ── /comp ─────────────────────────────────────────────────────────────────
  new SlashCommandBuilder()
    .setName("comp")
    .setDescription("Track CTF competitions")
    .addSubcommand((s) =>
      s.setName("add")
        .setDescription("Log competition baru")
        .addStringOption((o) => o.setName("name").setDescription("Nama competition").setRequired(true))
        .addStringOption((o) => o.setName("team").setDescription("Nama team").setRequired(false))
        .addStringOption((o) => o.setName("members").setDescription("Members (comma separated)").setRequired(false))
    )
    .addSubcommand((s) =>
      s.setName("note")
        .setDescription("Add note / writeup link to competition")
        .addIntegerOption((o) => o.setName("id").setDescription("Competition ID").setRequired(true))
        .addStringOption((o) => o.setName("text").setDescription("Note / writeup link").setRequired(true))
    )
    .addSubcommand((s) =>
      s.setName("link")
        .setDescription("Link challenge ke competition")
        .addIntegerOption((o) => o.setName("challenge_id").setDescription("Challenge ID").setRequired(true))
        .addIntegerOption((o) => o.setName("comp_id").setDescription("Competition ID").setRequired(true))
    )
    .addSubcommand((s) =>
      s.setName("list")
        .setDescription("List all competitions")
    ),

  // ── /streak ───────────────────────────────────────────────────────────────
  new SlashCommandBuilder()
    .setName("streak")
    .setDescription("Liat current standup streak lo"),

  // ── /stats ────────────────────────────────────────────────────────────────
  new SlashCommandBuilder()
    .setName("stats")
    .setDescription("Quick summary: streak, challenges, reviews"),

].map((c) => c.toJSON());

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

try {
  console.log("Registering slash commands...");
  await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
  console.log("✅ Done!");
} catch (err) {
  console.error(err);
}
