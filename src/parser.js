/**
 * Parse free-text standup message into structured sections.
 *
 * Supported headers (case-insensitive, flexible):
 *   DONE, TODO, NOTE/NOTES, BLOCKER/BLOCKERS, REVISIT, UPSOLVE
 *
 * Example input:
 *   DONE
 *   - finish exploit dev
 *   - read paper
 *
 *   TODO
 *   task A
 *   task B
 *
 *   NOTE
 *   remember to check xyz
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

const HEADER_REGEX = new RegExp(
  `^(${Object.keys(SECTION_MAP).join("|")})[:\\s]*$`,
  "i"
);

export function parseStandup(text) {
  const result = { done: "", todo: "", notes: "", blockers: "", revisit: "" };
  let currentSection = null;
  const buckets = {};

  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;

    const match = line.match(HEADER_REGEX);
    if (match) {
      currentSection = SECTION_MAP[match[1].toLowerCase()];
      if (!buckets[currentSection]) buckets[currentSection] = [];
    } else if (currentSection) {
      buckets[currentSection].push(line.replace(/^[-*•]\s*/, ""));
    }
  }

  for (const [key, lines] of Object.entries(buckets)) {
    result[key] = lines.join("\n");
  }

  return result;
}

/** Returns true if at least one section has content */
export function hasContent(parsed) {
  return Object.values(parsed).some((v) => v.trim().length > 0);
}
