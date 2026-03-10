/**
 * Flexible standup parser.
 * Handles multiline, inline, and Discord-compressed formats.
 *
 * Supported:
 *   DONE selesain ini          ← inline
 *   DONE\n- task               ← multiline
 *   DONE: task a, task b       ← colon inline
 *   done ngapain aja           ← lowercase
 */

const SECTION_MAP = {
  done:     "done",
  todo:     "todo",
  note:     "notes",
  notes:    "notes",
  blocker:  "blockers",
  blockers: "blockers",
  revisit:  "revisit",
  upsolve:  "revisit",
};

const KEYWORDS = Object.keys(SECTION_MAP).join("|");

export function parseStandup(text) {
  const result = { done: "", todo: "", notes: "", blockers: "", revisit: "" };

  // Normalize line endings
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // Split on section headers — works inline and multiline
  // e.g. "DONE foo TODO bar" or "DONE\nfoo\nTODO\nbar"
  const splitRegex = new RegExp(`(?:^|\\n|\\s{2,})(${KEYWORDS})\\s*[:\\-]?\\s*`, "gi");

  const parts = [];
  let lastIndex = 0;
  let lastKey = null;
  let match;

  splitRegex.lastIndex = 0;

  while ((match = splitRegex.exec(normalized)) !== null) {
    if (lastKey !== null) {
      parts.push({ key: lastKey, text: normalized.slice(lastIndex, match.index) });
    }
    lastKey = SECTION_MAP[match[1].toLowerCase()];
    lastIndex = match.index + match[0].length;
  }

  if (lastKey !== null) {
    parts.push({ key: lastKey, text: normalized.slice(lastIndex) });
  }

  // Fallback: try strict line-by-line
  if (parts.length === 0) {
    return parseLineFallback(normalized);
  }

  for (const { key, text } of parts) {
    const cleaned = text
      .split("\n")
      .map(l => l.trim().replace(/^[-*•]\s*/, ""))
      .filter(Boolean)
      .join("\n");
    if (cleaned) {
      result[key] = result[key] ? result[key] + "\n" + cleaned : cleaned;
    }
  }

  return result;
}

function parseLineFallback(text) {
  const result = { done: "", todo: "", notes: "", blockers: "", revisit: "" };
  const headerRegex = new RegExp(`^(${KEYWORDS})[:\\s]*(.*)$`, "i");
  let current = null;
  const buckets = {};

  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const m = line.match(headerRegex);
    if (m) {
      current = SECTION_MAP[m[1].toLowerCase()];
      if (!buckets[current]) buckets[current] = [];
      // Handle inline content after header: "DONE selesain ini"
      const inline = m[2]?.trim().replace(/^[-*•]\s*/, "");
      if (inline) buckets[current].push(inline);
    } else if (current) {
      buckets[current].push(line.replace(/^[-*•]\s*/, ""));
    }
  }

  for (const [key, lines] of Object.entries(buckets)) {
    result[key] = lines.join("\n");
  }

  return result;
}

export function hasContent(parsed) {
  return Object.values(parsed).some((v) => v.trim().length > 0);
}