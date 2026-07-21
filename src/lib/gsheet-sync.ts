import { supabase } from "@/integrations/supabase/client";

// ---------------------------------------------------------------------------
// PULL: Sheet -> App
//
// Reads the sheet as CSV using Google's public export endpoint. This only
// works if the sheet is shared as "Anyone with the link – Viewer" (Google
// Sheets -> Share -> General access). No Google Cloud project needed.
//
// Layout assumed (matches the user's existing sheet):
//   Col A-D: Expenses  -> Date | Amount | Description | Category
//   Col E:   (blank separator)
//   Col F-I: Income    -> Date | Amount | Description | Category
//   Row 1: section headers, Row 2: column headers, data starts row 3.
// ---------------------------------------------------------------------------

export type GSheetRef = { spreadsheetId: string; gid: string };

export function parseSheetUrl(url: string): GSheetRef | null {
  const idMatch = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (!idMatch) return null;
  const gidMatch = url.match(/[?#&]gid=(\d+)/);
  return { spreadsheetId: idMatch[1], gid: gidMatch?.[1] ?? "0" };
}

function csvExportUrl(ref: GSheetRef) {
  return `https://docs.google.com/spreadsheets/d/${ref.spreadsheetId}/export?format=csv&gid=${ref.gid}`;
}

// Minimal CSV parser that handles quoted fields (Google's export quotes any
// field containing a comma, quote, or newline).
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (c === "\r") { /* skip */ }
    else field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

function parseAmount(raw: string): number | null {
  const cleaned = raw.replace(/[₹$,\s]/g, "");
  if (!cleaned || cleaned === "-") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function parseDate(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  // Handles M/D/YYYY (Google Sheets default US format) and already-ISO dates.
  const usMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (usMatch) {
    const [, m, d, y] = usMatch;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  const isoMatch = s.match(/^\d{4}-\d{2}-\d{2}$/);
  if (isoMatch) return s;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

type ParsedRow = {
  occurred_on: string;
  amount: number;
  description: string | null;
  categoryName: string | null;
  kind: "expense" | "income";
};

function extractSection(rows: string[][], cols: [number, number, number, number], kind: "expense" | "income"): ParsedRow[] {
  const [dateCol, amtCol, descCol, catCol] = cols;
  const out: ParsedRow[] = [];
  for (let i = 2; i < rows.length; i++) { // skip 2 header rows
    const r = rows[i];
    if (!r) continue;
    const occurred_on = parseDate(r[dateCol] ?? "");
    const amount = parseAmount(r[amtCol] ?? "");
    if (!occurred_on || amount === null) continue;
    out.push({
      occurred_on,
      amount,
      description: (r[descCol] ?? "").trim() || null,
      categoryName: (r[catCol] ?? "").trim() || null,
      kind,
    });
  }
  return out;
}

async function findOrCreateCategoryId(
  cache: Map<string, string>,
  userId: string,
  name: string,
  kind: "expense" | "income",
): Promise<string | null> {
  const key = `${name.toLowerCase()}|${kind}`;
  if (cache.has(key)) return cache.get(key)!;
  const { data: existing } = await supabase
    .from("categories")
    .select("id")
    .eq("user_id", userId)
    .eq("kind", kind)
    .ilike("name", name)
    .maybeSingle();
  if (existing) { cache.set(key, existing.id); return existing.id; }
  const { data: created, error } = await supabase
    .from("categories")
    .insert({ user_id: userId, name, kind })
    .select("id")
    .single();
  if (error || !created) return null;
  cache.set(key, created.id);
  return created.id;
}

let inFlight: Promise<{ imported: number }> | null = null;

export async function pullFromSheet(sheetUrl: string): Promise<{ imported: number }> {
  if (inFlight) return inFlight; // a sync is already running — piggyback on it instead of starting a duplicate pass
  inFlight = doPullFromSheet(sheetUrl).finally(() => { inFlight = null; });
  return inFlight;
}

async function doPullFromSheet(sheetUrl: string): Promise<{ imported: number }> {
  const ref = parseSheetUrl(sheetUrl);
  if (!ref) throw new Error("That doesn't look like a Google Sheets link.");

  const res = await fetch(csvExportUrl(ref));
  if (!res.ok) throw new Error("Couldn't read the sheet — make sure it's shared as \"Anyone with the link – Viewer\".");
  const csv = await res.text();
  const rows = parseCsv(csv);

  const expenses = extractSection(rows, [0, 1, 2, 3], "expense");
  const income = extractSection(rows, [5, 6, 7, 8], "income");
  const parsed = [...expenses, ...income];
  if (!parsed.length) return { imported: 0 };

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Not signed in");
  const userId = userData.user.id;

  // Only compare against previously-imported rows to keep this cheap and to
  // never touch transactions you entered by hand in the app.
  const { data: existingImports } = await supabase
    .from("transactions")
    .select("occurred_on, amount, description, kind")
    .eq("source", "import");
  const existingKeys = new Set(
    (existingImports ?? []).map((t) => `${t.occurred_on}|${t.amount}|${t.description ?? ""}|${t.kind}`),
  );

  const catCache = new Map<string, string>();
  let imported = 0;
  for (const p of parsed) {
    const key = `${p.occurred_on}|${p.amount}|${p.description ?? ""}|${p.kind}`;
    if (existingKeys.has(key)) continue;
    const category_id = p.categoryName ? await findOrCreateCategoryId(catCache, userId, p.categoryName, p.kind) : null;
    const { error } = await supabase.from("transactions").insert({
      user_id: userId,
      occurred_on: p.occurred_on,
      amount: p.amount,
      kind: p.kind,
      description: p.description,
      category_id,
      source: "import",
    });
    if (!error) { imported++; existingKeys.add(key); }
  }

  await supabase.from("profiles").update({ gsheet_last_synced_at: new Date().toISOString() }).eq("id", userId);

  return { imported };
}

// ---------------------------------------------------------------------------
// PUSH: App -> Sheet
//
// Posts a new row to a small Apps Script web app (deployed by the user from
// inside their sheet — see the setup instructions). Fire-and-forget: if it
// fails, the transaction still exists in the app either way, it just won't
// show up in the sheet yet.
// ---------------------------------------------------------------------------

export async function pushToSheet(
  appsScriptUrl: string,
  txn: { kind: "expense" | "income"; occurred_on: string; amount: number; description: string | null; categoryName: string | null },
) {
  try {
    await fetch(appsScriptUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain" }, // avoids a CORS preflight for Apps Script
      body: JSON.stringify(txn),
    });
  } catch {
    // Silent — the sheet push is best-effort and shouldn't block the app.
  }
}
