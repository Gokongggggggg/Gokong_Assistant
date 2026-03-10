import "dotenv/config";
import { REST, Routes, SlashCommandBuilder } from "discord.js";

const commands = [
  // /standup <text>
  new SlashCommandBuilder()
    .setName("standup")
    .setDescription("Log daily standup dengan free-text. Gunakan header: DONE / TODO / NOTE / BLOCKER / REVISIT")
    .addStringOption((o) =>
      o.setName("log")
        .setDescription("Paste standup lo di sini")
        .setRequired(true)
    ),

  // /log [limit]
  new SlashCommandBuilder()
    .setName("log")
    .setDescription("Liat history standup")
    .addIntegerOption((o) =>
      o.setName("limit").setDescription("Jumlah entries (default 5)").setMinValue(1).setMaxValue(20)
    ),

  // /review — subcommands
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

  // /export
  new SlashCommandBuilder()
    .setName("export")
    .setDescription("Export standup history ke CSV via DM"),

  // /delete (standup)
  new SlashCommandBuilder()
    .setName("delete")
    .setDescription("Hapus standup entry by ID")
    .addIntegerOption((o) => o.setName("id").setDescription("ID entry").setRequired(true)),

].map((c) => c.toJSON());

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

try {
  console.log("Registering slash commands...");
  await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
  console.log("✅ Done!");
} catch (err) {
  console.error(err);
}
