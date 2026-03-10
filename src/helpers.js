import { EmbedBuilder } from "discord.js";

const C_GREEN  = 0x00ff88;
const C_ORANGE = 0xff9900;
const C_RED    = 0xff4444;
const C_BLUE   = 0x5865f2;

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

  // Streak info
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

  // Discord field value max 1024 chars — chunk if needed
  const CHUNK = 15;
  for (let i = 0; i < lines.length; i += CHUNK) {
    embed.addFields({
      name: i === 0 ? "Pending" : "​", // zero-width space for continuation
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

// ── Streak / Stats ─────────────────────────────────────────────────────────

export function statsEmbed(streak, reviewStats, standupTotal) {
  const bar = (n, max, len = 10) => {
    const filled = Math.round((n / (max || 1)) * len);
    return "█".repeat(filled) + "░".repeat(len - filled);
  };

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
