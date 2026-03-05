// Utility for n8n Code node: parse JSON wrapped in ```json code fences

/**
 * Extracts and parses JSON from a string that may be wrapped in
 * ```json ... ``` code fences (as returned by some LLM tools).
 *
 * @param {string} rawText - The raw text containing JSON, possibly fenced.
 * @returns {any} Parsed JSON object.
 */
function parseJsonFromCodeFence(rawText) {
  if (typeof rawText !== "string") {
    throw new Error("Expected rawText to be a string");
  }

  // Remove starting ```json or ``` (case-insensitive), plus any following whitespace/newlines
  let cleaned = rawText.replace(/^```json\s*/i, "").replace(/^```\s*/i, "");

  // Remove a trailing ``` if present (with optional whitespace before it)
  cleaned = cleaned.replace(/\s*```$/i, "").trim();

  return JSON.parse(cleaned);
}

/**
 * Example n8n Code node entry point.
 *
 * This assumes the incoming item has the structure shown in your example:
 * {
 *   "output": [
 *     {
 *       "content": [
 *         {
 *           "text": "```json\n{ \"events\": [ ... ] }\n```"
 *         }
 *       ]
 *     }
 *   ]
 * }
 */
function main() {
  const raw = $input.first().json.output[0].content[0].text;

  const parsed = parseJsonFromCodeFence(raw);
  const allSheets = [];

  for (const event of parsed.events || []) {
    const rows = [];

    // Row 1: Event type + Date
    rows.push({
      A: event.event_type || "",
      B: "",
      C: event.date || "",
      D: "",
      E: "",
      F: "",
    });

    // Row 2: THE HERB BOX CATERING + Event Name + Status
    rows.push({
      A: "THE HERB BOX CATERING",
      B: "",
      C: event.event_name || "",
      D: "",
      E: "STATUS",
      F: event.status || "",
    });

    // Row 3: QUANTITY SERVING + Guest Count + RTG
    rows.push({
      A: "QUANTITY SERVING",
      B: "",
      C: String(event.guest_count ?? ""),
      D: "RTG:",
      E: "",
      F: event.rtg_time || "",
    });

    // Row 4: Column headers
    rows.push({
      A: "PREPARED BY",
      B: "QTY",
      C: "MENU ITEM",
      D: "QTY",
      E: "UNIT",
      F: "NOTES",
    });

    // Rows 5+: Menu items
    for (const item of event.menu_items || []) {
      rows.push({
        A: "",
        B: item.qty_serving != null ? String(item.qty_serving) : "",
        C: item.menu_item || "",
        D: item.qty != null ? String(item.qty) : "",
        E: item.unit || "",
        F: item.notes || "",
      });
    }

    allSheets.push({
      sheetName: `${event.event_name || ""} - ${event.date || ""}`,
      rows,
    });
  }

  // Flatten: emit each row with its sheet name
  const output = [];
  for (const sheet of allSheets) {
    for (const row of sheet.rows) {
      output.push({ json: { ...row, _sheetName: sheet.sheetName } });
    }
  }

  return output;
}

// In n8n workflow wiring:
// - Connect THIS node's output directly to "Google Sheets — Append Rows".
// - Do NOT connect the "sheet list" (spreadsheetId, sheetId, title, ...) to Append Rows,
//   or $json._sheetName will be undefined. Append Rows must receive these row items.

// In an n8n Code node you would typically just `return main();`
return main();
