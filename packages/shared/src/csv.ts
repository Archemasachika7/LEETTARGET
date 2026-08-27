import type { CsvTargetRow } from "./types.js";

/** Parses one line of RFC4180-ish CSV (handles quoted fields, "" escapes,
 * and commas inside quotes) into raw string cells. No external dependency
 * so both the extension and the web app can use it without a bundle-size
 * cost. */
export function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      cells.push(cell);
      cell = "";
    } else {
      cell += char;
    }
  }
  cells.push(cell);
  return cells.map((c) => c.trim());
}

/** Splits raw CSV text into lines, respecting quoted newlines. */
function splitCsvRows(text: string): string[] {
  const rows: string[] = [];
  let row = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') inQuotes = !inQuotes;

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (row.length > 0) rows.push(row);
      row = "";
      if (char === "\r" && text[i + 1] === "\n") i++;
    } else {
      row += char;
    }
  }
  if (row.trim().length > 0) rows.push(row);
  return rows;
}

const HYPERLINK_FORMULA = /^=HYPERLINK\(\s*"([^"]*)"\s*(?:,\s*"([^"]*)")?\s*\)$/i;

/** A link cell can be a plain URL, or an Excel/Sheets `=HYPERLINK(url,
 * "label")` formula (common when the sheet was authored in Excel and
 * exported to CSV). Returns the extracted URL, and label if present. */
export function parseLinkCell(raw: string): { url: string; label?: string } {
  const trimmed = raw.trim();
  const formulaMatch = trimmed.match(HYPERLINK_FORMULA);
  if (formulaMatch) {
    return { url: formulaMatch[1], label: formulaMatch[2] || undefined };
  }
  return { url: trimmed };
}

/** Pulls the problem slug out of a `leetcode.com/problems/<slug>/...` URL. */
export function slugFromLeetCodeUrl(url: string): string | undefined {
  const match = url.match(/leetcode\.com\/problems\/([a-z0-9-]+)/i);
  return match ? match[1].toLowerCase() : undefined;
}

const HEADER_ALIASES = {
  title: ["question", "question name", "title", "problem", "name"],
  url: ["link", "url", "hyperlink", "problem link"],
};

function findColumn(header: string[], aliases: string[]): number {
  const normalized = header.map((h) => h.toLowerCase().trim());
  for (const alias of aliases) {
    const idx = normalized.indexOf(alias);
    if (idx !== -1) return idx;
  }
  return -1;
}

export class CsvParseError extends Error {}

/** Parses an uploaded targets CSV (`Question,Link` — link may be a plain
 * URL or an Excel HYPERLINK formula) into rows ready to become targets.
 * Column order/naming is flexible: it looks for a title-ish and a link-ish
 * header, falling back to "first column is title, second is link" if the
 * header doesn't match anything recognized. */
export function parseTargetsCsv(text: string): CsvTargetRow[] {
  const rows = splitCsvRows(text).map(parseCsvLine);
  if (rows.length === 0) {
    throw new CsvParseError("CSV is empty.");
  }

  const [header, ...rest] = rows;
  let titleIdx = findColumn(header, HEADER_ALIASES.title);
  let urlIdx = findColumn(header, HEADER_ALIASES.url);

  let dataRows = rest;
  if (titleIdx === -1 || urlIdx === -1) {
    if (header.length < 2) {
      throw new CsvParseError(
        "Couldn't find a question/title column and a link column."
      );
    }
    // No recognizable header — treat the "header" row as data too.
    titleIdx = 0;
    urlIdx = 1;
    dataRows = rows;
  }

  const targets: CsvTargetRow[] = [];
  for (const row of dataRows) {
    const rawTitle = row[titleIdx];
    const rawLink = row[urlIdx];
    if (!rawTitle && !rawLink) continue;

    const { url, label } = parseLinkCell(rawLink ?? "");
    const title = rawTitle || label || url;
    if (!title || !url) continue;

    targets.push({
      title,
      url,
      slug: slugFromLeetCodeUrl(url),
    });
  }

  return targets;
}

function csvEscape(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** Serializes targets back into the same `Question,Link,Status` shape
 * `parseTargetsCsv` reads — lets a target list round-trip out to a
 * spreadsheet, or into someone else's account ("adopt their target list as
 * my own competition set"), and back in. */
export function exportTargetsCsv(targets: { title: string; url: string; status?: string }[]): string {
  const header = "Question,Link,Status";
  const rows = targets.map((t) => [csvEscape(t.title), csvEscape(t.url), csvEscape(t.status ?? "")].join(","));
  return [header, ...rows].join("\r\n") + "\r\n";
}
