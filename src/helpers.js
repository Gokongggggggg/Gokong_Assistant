import { EmbedBuilder } from "discord.js";

const C_GREEN  = 0x00ff88;
const C_ORANGE = 0xff9900;
const C_RED    = 0xff4444;
const C_BLUE   = 0x5865f2;
const C_YELLOW = 0xffd700;
const C_PURPLE = 0xa78bfa;

function wib(d) {
  return new Date(d).toLocaleDateString("id-ID", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta",
  });
}

function daysSince(date) {
  const ms = Date.now() - new Date(date).getTime();
  return Math.floor(ms / 86400000);
}

function bar(n, max, len = 10) {
  const filled = Math.round((n / (max || 1)) * len);
  return "█".repeat(filled) + "░".repeat(len - filled);
}

const STATUS_ICONS = {
  solved:      "✅",
  upsolve:     "🔄",
  need_review: "📋",
  stuck:       "🔴",
  pending:     "⏳",
  done:        "✅",
};

const STATUS_COLORS = {
  solved:      C_GREEN,
  upsolve:     C_BLUE,
  need_review: C_ORANGE,
  stuck:       C_RED,
};

// ── Standup ──────────────────────────────────────────────────────────────────

export function standupEmbed(entry) {
  const embed = new EmbedBuilder()
    .setColor(C_GREEN)
    .setTitle(`📋 Standup #${entry.id}`)
    .setFooter({ text: wib(entry.created_at) });

  const sections = [
    { key: "done",     icon: "✅", label: "Done" },
    { key: "todo",     icon: "🎯", label: "Todo" },
    { key: "notes",    icon: "📝", label: "Notes" },
    { key: "blockers", icon: "🚧", label: "Blockers" },
    { key: "revisit",  icon: "🔁", label: "Revisit" },
  ];

  for (const { key, icon, label } of sections) {
    if (entry[key]?.trim()) {
      embed.addFields({ name: `${icon} ${label}`, value: entry[key].trim() });
    }
  }

  return embed;
}

// ── Review list ───────────────────────────────────────────────────────────────

export function reviewListEmbed(items, stats, streak) {
  const embed = new EmbedBuilder()
    .setColor(C_ORANGE)
    .setTitle("🔁 Review / Upsolve List");

  const streakLine = streak.current > 0
    ? `🔥 **${streak.current} day streak** (longest: ${streak.longest})`
    : `📅 No active streak (longest: ${streak.longest})`;

  embed.setDescription(
    `${streakLine}\n📊 ${stats.pending} pending · ${stats.done} done · ${stats.total} total`
  );

  if (items.length === 0) {
    embed.addFields({ name: "Status", value: "List kosong — ga ada yang pending 👍" });
    return embed;
  }

  const lines = items.map((item) => {
    const days = daysSince(item.added_at);
    const cat = item.category ? ` \`[${item.category}]\`` : "";
    const age = days === 0 ? "today" : days === 1 ? "1d" : `${days}d`;
    return `\`#${item.id}\` **${item.title}**${cat} · ⏱ ${age}`;
  });

  const CHUNK = 15;
  for (let i = 0; i < lines.length; i += CHUNK) {
    embed.addFields({
      name: i === 0 ? "Pending" : "​",
      value: lines.slice(i, i + CHUNK).join("\n"),
    });
  }

  return embed;
}

export function reviewDoneEmbed(item) {
  const days = daysSince(item.added_at);
  return new EmbedBuilder()
    .setColor(C_GREEN)
    .setTitle("✅ Review item done!")
    .setDescription(`**${item.title}**\nTook **${days === 0 ? "less than a day" : `${days} day(s)`}** from added to done.`);
}

// ── Streak / Stats (legacy) ─────────────────────────────────────────────────

export function statsEmbed(streak, reviewStats, standupTotal) {
  return new EmbedBuilder()
    .setColor(C_BLUE)
    .setTitle("📈 Stats")
    .addFields(
      { name: "🔥 Standup Streak", value: `Current: **${streak.current}** days\nLongest: **${streak.longest}** days\nTotal standups: **${standupTotal}**`, inline: true },
      { name: "🔁 Review Items", value: `Pending: **${reviewStats.pending}**\nDone: **${reviewStats.done}**\nTotal: **${reviewStats.total}**`, inline: true },
      {
        name: "Progress",
        value: `\`${bar(Number(reviewStats.done), Number(reviewStats.total))}\` ${reviewStats.total > 0 ? Math.round(Number(reviewStats.done) / Number(reviewStats.total) * 100) : 0}%`,
      }
    );
}

// ── Challenge embeds ─────────────────────────────────────────────────────────

export function challengeEmbed(item, action = "added") {
  const icon = STATUS_ICONS[item.status] || "⚡";
  const color = STATUS_COLORS[item.status] || C_YELLOW;

  const titles = {
    added:       `⚡ Challenge Added`,
    solved:      `✅ Challenge Solved!`,
    upsolve:     `🔄 Challenge Upsolved`,
    need_review: `📋 Marked for Review`,
  };

  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(titles[action] || `⚡ Challenge #${item.id}`)
    .setDescription(`**${item.title}** \`#${item.id}\``);

  const info = [];
  if (item.category)   info.push(`**Category:** ${item.category}`);
  if (item.difficulty)  info.push(`**Difficulty:** ${item.difficulty}`);
  if (item.link)        info.push(`**Link:** ${item.link}`);
  if (item.comp_id)     info.push(`**Competition:** #${item.comp_id}`);

  info.push(`**Status:** ${icon} ${item.status}`);

  embed.addFields({ name: "Info", value: info.join("\n") });

  if (action === "solved" || action === "upsolve") {
    const days = daysSince(item.created_at);
    embed.setFooter({ text: `Solved in ${days === 0 ? "< 1 day" : `${days} day(s)`}` });
  }

  return embed;
}

export function challengeListEmbed(items, total, statusFilter) {
  const filterLabel = statusFilter ? ` [${statusFilter}]` : "";
  const embed = new EmbedBuilder()
    .setColor(C_YELLOW)
    .setTitle(`⚡ Challenges${filterLabel}`)
    .setDescription(`${total} total`);

  if (items.length === 0) {
    embed.addFields({ name: "Status", value: "Belum ada challenge." });
    return embed;
  }

  const lines = items.map((item) => {
    const icon = STATUS_ICONS[item.status] || "·";
    const cat  = item.category ? ` \`[${item.category}]\`` : "";
    const days = daysSince(item.created_at);
    const age  = days === 0 ? "today" : `${days}d`;
    return `${icon} \`#${item.id}\` **${item.title}**${cat} · ${age}`;
  });

  const CHUNK = 15;
  for (let i = 0; i < lines.length; i += CHUNK) {
    embed.addFields({
      name: i === 0 ? "Recent" : "​",
      value: lines.slice(i, i + CHUNK).join("\n"),
    });
  }

  if (total > items.length) {
    embed.setFooter({ text: `Showing ${items.length} of ${total} — check dashboard for full list` });
  }

  return embed;
}

// ── Competition embeds ───────────────────────────────────────────────────────

export function compEmbed(item, action = "added") {
  const embed = new EmbedBuilder()
    .setColor(C_PURPLE)
    .setTitle(action === "added" ? "🏆 Competition Added" : `🏆 Competition #${item.id}`)
    .setDescription(`**${item.name}** \`#${item.id}\``);

  const info = [];
  if (item.team_name) info.push(`**Team:** ${item.team_name}`);
  if (item.members)   info.push(`**Members:** ${item.members}`);
  if (item.url)       info.push(`**URL:** ${item.url}`);
  if (item.ranking)   info.push(`**Ranking:** ${item.ranking}`);

  if (info.length > 0) {
    embed.addFields({ name: "Info", value: info.join("\n") });
  }

  embed.setFooter({ text: wib(item.created_at) });
  return embed;
}

export function compListEmbed(items) {
  const embed = new EmbedBuilder()
    .setColor(C_PURPLE)
    .setTitle("🏆 Competitions")
    .setDescription(`${items.length} total`);

  if (items.length === 0) {
    embed.addFields({ name: "Status", value: "Belum ada competition." });
    return embed;
  }

  const lines = items.map((item) => {
    const team = item.team_name ? ` · ${item.team_name}` : "";
    const chals = item.challenge_count > 0
      ? ` · ${item.solved_count}/${item.challenge_count} solved`
      : "";
    return `\`#${item.id}\` **${item.name}**${team}${chals}`;
  });

  const CHUNK = 15;
  for (let i = 0; i < lines.length; i += CHUNK) {
    embed.addFields({
      name: i === 0 ? "List" : "​",
      value: lines.slice(i, i + CHUNK).join("\n"),
    });
  }

  return embed;
}

// ── Full stats (for /stats command) ──────────────────────────────────────────

export function fullStatsEmbed(streak, reviewStats, chalStats, standupTotal) {
  const solveRate = Number(chalStats.total) > 0
    ? Math.round((Number(chalStats.solved) + Number(chalStats.upsolve)) / Number(chalStats.total) * 100)
    : 0;

  return new EmbedBuilder()
    .setColor(C_YELLOW)
    .setTitle("📊 Full Stats")
    .addFields(
      {
        name: "🔥 Standup",
        value: [
          `Streak: **${streak.current}** days (best: ${streak.longest})`,
          `Total: **${standupTotal}** standups`,
          `\`${bar(streak.current, streak.longest)}\``,
        ].join("\n"),
        inline: true,
      },
      {
        name: "⚡ Challenges",
        value: [
          `Solved: **${chalStats.solved}** · Upsolve: **${chalStats.upsolve}**`,
          `Review: **${chalStats.need_review}** · Stuck: **${chalStats.stuck}**`,
          `Total: **${chalStats.total}** · Rate: **${solveRate}%**`,
        ].join("\n"),
        inline: true,
      },
      {
        name: "🔁 Review",
        value: [
          `Pending: **${reviewStats.pending}** · Done: **${reviewStats.done}**`,
          `\`${bar(Number(reviewStats.done), Number(reviewStats.total))}\` ${Number(reviewStats.total) > 0 ? Math.round(Number(reviewStats.done) / Number(reviewStats.total) * 100) : 0}%`,
        ].join("\n"),
      }
    );
}

// ── Generic ───────────────────────────────────────────────────────────────────

export function errorEmbed(msg) {
  return new EmbedBuilder().setColor(C_RED).setDescription(`❌ ${msg}`);
}

export function successEmbed(msg) {
  return new EmbedBuilder().setColor(C_GREEN).setDescription(`✅ ${msg}`);
}

export function buildCSV(entries) {
  const headers = ["id", "date", "done", "todo", "notes", "blockers", "revisit"];
  const esc = (v) => `"${(v || "").replace(/"/g, '""')}"`;
  const rows = entries.map((e) =>
    [e.id, wib(e.created_at), e.done, e.todo, e.notes, e.blockers, e.revisit].map(esc).join(",")
  );
  return [headers.join(","), ...rows].join("\n");
}
