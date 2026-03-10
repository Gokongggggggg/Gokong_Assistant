import "dotenv/config";
import { Client, GatewayIntentBits, AttachmentBuilder } from "discord.js";
import {
  initDB, insertStandup, getStandups, deleteStandup,
  addReviewItem, listReviewItems, markReviewDone, deleteReviewItem,
  getReviewStats, getStreak,
} from "./db.js";
import {
  standupEmbed, reviewListEmbed, reviewDoneEmbed, statsEmbed,
  errorEmbed, successEmbed, buildCSV,
} from "./helpers.js";
import { parseStandup, hasContent } from "./parser.js";

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

await initDB();

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const userId = interaction.user.id;
  const cmd = interaction.commandName;

  // ── /standup ───────────────────────────────────────────────────────────────
  if (cmd === "standup") {
    await interaction.deferReply({ ephemeral: true });

    const raw = interaction.options.getString("log");
    const parsed = parseStandup(raw);

    if (!hasContent(parsed)) {
      return interaction.editReply({
        embeds: [errorEmbed(
          "Ga bisa parse standup lo.\n\nPastikan ada minimal satu header:\n```\nDONE\n- ngapain aja\n\nTODO\n- rencana besok\n```"
        )],
      });
    }

    const entry = await insertStandup(userId, parsed);
    const streak = await getStreak(userId);

    const streakLine = streak.current > 1
      ? `\n🔥 **${streak.current} day streak!**`
      : streak.current === 1 ? "\n✅ Streak dimulai!" : "";

    return interaction.editReply({
      content: `**Standup tersimpan!**${streakLine}`,
      embeds: [standupEmbed(entry)],
    });
  }

  // ── /log ───────────────────────────────────────────────────────────────────
  if (cmd === "log") {
    await interaction.deferReply({ ephemeral: true });
    const limit = interaction.options.getInteger("limit") ?? 5;
    const entries = await getStandups(userId, limit);

    if (entries.length === 0) {
      return interaction.editReply({
        embeds: [errorEmbed("Belum ada standup. Coba `/standup` dulu!")],
      });
    }

    // Discord max 10 embeds per message
    const embeds = entries.slice(0, 10).map(standupEmbed);
    return interaction.editReply({
      content: `📚 **${entries.length} entry terakhir:**`,
      embeds,
    });
  }

  // ── /delete ────────────────────────────────────────────────────────────────
  if (cmd === "delete") {
    await interaction.deferReply({ ephemeral: true });
    const id = interaction.options.getInteger("id");
    const ok = await deleteStandup(userId, id);
    return interaction.editReply({
      embeds: [ok ? successEmbed(`Entry #${id} dihapus.`) : errorEmbed(`Entry #${id} ga ketemu.`)],
    });
  }

  // ── /export ────────────────────────────────────────────────────────────────
  if (cmd === "export") {
    await interaction.deferReply({ ephemeral: true });
    const entries = await getStandups(userId, 9999);

    if (entries.length === 0) {
      return interaction.editReply({ embeds: [errorEmbed("Belum ada standup.")] });
    }

    const csv = buildCSV(entries);
    const file = new AttachmentBuilder(Buffer.from(csv, "utf-8"), {
      name: `standup-${new Date().toISOString().slice(0, 10)}.csv`,
    });

    try {
      await interaction.user.send({ content: `📊 **${entries.length} standup entries**`, files: [file] });
      return interaction.editReply({ embeds: [successEmbed("CSV dikirim ke DM lo!")] });
    } catch {
      return interaction.editReply({ embeds: [errorEmbed("Gagal kirim DM. Pastiin DM lo terbuka.")] });
    }
  }

  // ── /review ────────────────────────────────────────────────────────────────
  if (cmd === "review") {
    const sub = interaction.options.getSubcommand();
    await interaction.deferReply({ ephemeral: true });

    // /review list
    if (sub === "list") {
      const [items, stats, streak] = await Promise.all([
        listReviewItems(userId, "pending"),
        getReviewStats(userId),
        getStreak(userId),
      ]);
      return interaction.editReply({ embeds: [reviewListEmbed(items, stats, streak)] });
    }

    // /review add
    if (sub === "add") {
      const title    = interaction.options.getString("title");
      const category = interaction.options.getString("category");
      const item = await addReviewItem(userId, title, category);

      const cat = item.category ? ` \`[${item.category}]\`` : "";
      return interaction.editReply({
        embeds: [successEmbed(`Item ditambahkan: **${item.title}**${cat} \`#${item.id}\``)],
      });
    }

    // /review done
    if (sub === "done") {
      const id   = interaction.options.getInteger("id");
      const item = await markReviewDone(userId, id);

      if (!item) {
        return interaction.editReply({
          embeds: [errorEmbed(`Item #${id} ga ketemu atau udah done.`)],
        });
      }
      return interaction.editReply({ embeds: [reviewDoneEmbed(item)] });
    }

    // /review delete
    if (sub === "delete") {
      const id = interaction.options.getInteger("id");
      const ok = await deleteReviewItem(userId, id);
      return interaction.editReply({
        embeds: [ok ? successEmbed(`Item #${id} dihapus.`) : errorEmbed(`Item #${id} ga ketemu.`)],
      });
    }

    // /review stats
    if (sub === "stats") {
      const [streak, reviewStats, standups] = await Promise.all([
        getStreak(userId),
        getReviewStats(userId),
        getStandups(userId, 9999),
      ]);
      return interaction.editReply({ embeds: [statsEmbed(streak, reviewStats, standups.length)] });
    }
  }
});

client.once("ready", () => {
  console.log(`✅ Bot online: ${client.user.tag}`);
});

client.login(process.env.DISCORD_TOKEN);
