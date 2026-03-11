import "dotenv/config";
import { Client, GatewayIntentBits, AttachmentBuilder } from "discord.js";
import {
  initDB, insertStandup, getStandups, deleteStandup,
  addReviewItem, listReviewItems, markReviewDone, deleteReviewItem,
  getReviewStats, getStreak,
  // Competitions
  insertCompetition, getCompetitions, getCompetition,
  addCompNote, linkChallengeToComp,
  // Challenges
  insertChallenge, getChallenges, getChallenge,
  updateChallengeStatus, addChallengeNote, getChallengeStats,
} from "./db.js";
import {
  standupEmbed, reviewListEmbed, reviewDoneEmbed, statsEmbed,
  errorEmbed, successEmbed, buildCSV,
  // New embeds
  challengeEmbed, challengeListEmbed, compEmbed, compListEmbed, fullStatsEmbed,
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

    if (sub === "list") {
      const [items, stats, streak] = await Promise.all([
        listReviewItems(userId, "pending"),
        getReviewStats(userId),
        getStreak(userId),
      ]);
      return interaction.editReply({ embeds: [reviewListEmbed(items, stats, streak)] });
    }

    if (sub === "add") {
      const title    = interaction.options.getString("title");
      const category = interaction.options.getString("category");
      const item = await addReviewItem(userId, title, category);

      const cat = item.category ? ` \`[${item.category}]\`` : "";
      return interaction.editReply({
        embeds: [successEmbed(`Item ditambahkan: **${item.title}**${cat} \`#${item.id}\``)],
      });
    }

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

    if (sub === "delete") {
      const id = interaction.options.getInteger("id");
      const ok = await deleteReviewItem(userId, id);
      return interaction.editReply({
        embeds: [ok ? successEmbed(`Item #${id} dihapus.`) : errorEmbed(`Item #${id} ga ketemu.`)],
      });
    }

    if (sub === "stats") {
      const [streak, reviewStats, standups] = await Promise.all([
        getStreak(userId),
        getReviewStats(userId),
        getStandups(userId, 9999),
      ]);
      return interaction.editReply({ embeds: [statsEmbed(streak, reviewStats, standups.length)] });
    }
  }

  // ── /challenge ─────────────────────────────────────────────────────────────
  if (cmd === "challenge") {
    const sub = interaction.options.getSubcommand();
    await interaction.deferReply({ ephemeral: true });

    // /challenge add
    if (sub === "add") {
      const title    = interaction.options.getString("title");
      const category = interaction.options.getString("category") || interaction.options.getString("custom_category") || null;
      const link     = interaction.options.getString("link");
      const comp_id  = interaction.options.getInteger("comp_id");
      const difficulty = interaction.options.getString("difficulty");

      // Validate comp_id if provided
      if (comp_id) {
        const comp = await getCompetition(userId, comp_id);
        if (!comp) {
          return interaction.editReply({
            embeds: [errorEmbed(`Competition #${comp_id} ga ketemu. Cek pake \`/comp list\`.`)],
          });
        }
      }

      const item = await insertChallenge(userId, { title, category, link, comp_id, difficulty });
      return interaction.editReply({ embeds: [challengeEmbed(item, "added")] });
    }

    // /challenge solve
    if (sub === "solve") {
      const id = interaction.options.getInteger("id");
      const item = await updateChallengeStatus(userId, id, "solved");
      if (!item) return interaction.editReply({ embeds: [errorEmbed(`Challenge #${id} ga ketemu.`)] });
      return interaction.editReply({ embeds: [challengeEmbed(item, "solved")] });
    }

    // /challenge upsolve
    if (sub === "upsolve") {
      const id = interaction.options.getInteger("id");
      const item = await updateChallengeStatus(userId, id, "upsolve");
      if (!item) return interaction.editReply({ embeds: [errorEmbed(`Challenge #${id} ga ketemu.`)] });
      return interaction.editReply({ embeds: [challengeEmbed(item, "upsolve")] });
    }

    // /challenge review
    if (sub === "review") {
      const id = interaction.options.getInteger("id");
      const item = await updateChallengeStatus(userId, id, "need_review");
      if (!item) return interaction.editReply({ embeds: [errorEmbed(`Challenge #${id} ga ketemu.`)] });
      return interaction.editReply({ embeds: [challengeEmbed(item, "need_review")] });
    }

    // /challenge note
    if (sub === "note") {
      const id   = interaction.options.getInteger("id");
      const text = interaction.options.getString("text");
      const item = await addChallengeNote(userId, id, text);
      if (!item) return interaction.editReply({ embeds: [errorEmbed(`Challenge #${id} ga ketemu.`)] });
      return interaction.editReply({
        embeds: [successEmbed(`Note ditambahkan ke challenge **${item.title}** \`#${item.id}\``)],
      });
    }

    // /challenge list
    if (sub === "list") {
      const status = interaction.options.getString("status") || undefined;
      const { items, total } = await getChallenges(userId, { status, limit: 15 });
      return interaction.editReply({ embeds: [challengeListEmbed(items, total, status)] });
    }
  }

  // ── /comp ──────────────────────────────────────────────────────────────────
  if (cmd === "comp") {
    const sub = interaction.options.getSubcommand();
    await interaction.deferReply({ ephemeral: true });

    // /comp add
    if (sub === "add") {
      const name    = interaction.options.getString("name");
      const team_name = interaction.options.getString("team");
      const members = interaction.options.getString("members");

      const item = await insertCompetition(userId, { name, team_name, members });
      return interaction.editReply({ embeds: [compEmbed(item, "added")] });
    }

    // /comp note
    if (sub === "note") {
      const id   = interaction.options.getInteger("id");
      const text = interaction.options.getString("text");
      const item = await addCompNote(userId, id, text);
      if (!item) return interaction.editReply({ embeds: [errorEmbed(`Competition #${id} ga ketemu.`)] });
      return interaction.editReply({
        embeds: [successEmbed(`Note ditambahkan ke comp **${item.name}** \`#${item.id}\``)],
      });
    }

    // /comp link
    if (sub === "link") {
      const challengeId = interaction.options.getInteger("challenge_id");
      const compId      = interaction.options.getInteger("comp_id");
      const item = await linkChallengeToComp(userId, challengeId, compId);
      if (!item) {
        return interaction.editReply({
          embeds: [errorEmbed("Challenge atau competition ga ketemu. Cek ID-nya.")],
        });
      }
      return interaction.editReply({
        embeds: [successEmbed(`Challenge **${item.title}** \`#${item.id}\` linked ke competition \`#${compId}\``)],
      });
    }

    // /comp list
    if (sub === "list") {
      const items = await getCompetitions(userId);
      return interaction.editReply({ embeds: [compListEmbed(items)] });
    }
  }

  // ── /streak ────────────────────────────────────────────────────────────────
  if (cmd === "streak") {
    await interaction.deferReply({ ephemeral: true });
    const streak = await getStreak(userId);

    const bar = (n, max, len = 12) => {
      const filled = Math.round((n / (max || 1)) * len);
      return "█".repeat(filled) + "░".repeat(len - filled);
    };

    const msg = [
      `🔥 **Current streak:** ${streak.current} days`,
      `🏆 **Longest streak:** ${streak.longest} days`,
      `📅 **Total standups:** ${streak.total}`,
      `\`${bar(streak.current, streak.longest)}\` ${streak.longest > 0 ? Math.round(streak.current / streak.longest * 100) : 0}%`,
    ].join("\n");

    return interaction.editReply({ embeds: [successEmbed(msg)] });
  }

  // ── /stats ─────────────────────────────────────────────────────────────────
  if (cmd === "stats") {
    await interaction.deferReply({ ephemeral: true });
    const [streak, reviewStats, chalStats, standups] = await Promise.all([
      getStreak(userId),
      getReviewStats(userId),
      getChallengeStats(userId),
      getStandups(userId, 9999),
    ]);
    return interaction.editReply({
      embeds: [fullStatsEmbed(streak, reviewStats, chalStats, standups.length)],
    });
  }
});

client.once("ready", () => {
  console.log(`✅ Bot online: ${client.user.tag}`);
});

client.login(process.env.DISCORD_TOKEN);
