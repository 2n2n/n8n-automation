/**
 * n8n Code node: builds a Google Sheets API valueRange payload.
 *
 * Reads menu.sections[] from the incoming KitchenSheet JSON and produces a
 * single output item containing the API URL and request body needed to append
 * all section rows to a Google Sheet using the Sheets API directly.
 *
 * Output shape:
 *   $json.url   — full Sheets API endpoint (used in the HTTP Request URL field)
 *   $json.body  — valueRange object        (used in the HTTP Request body field)
 *
 * Column mapping (positional, no header matching required):
 *   values[n][0]  →  column B  (QTY)
 *   values[n][1]  →  column C  (MENU ITEM)
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  HTTP REQUEST NODE CONFIGURATION
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  General
 *  ───────
 *  Method              POST
 *  URL                 ={{ $json.url }}
 *
 *  Authentication
 *  ──────────────
 *  Auth Type           OAuth2
 *  Credential          <your Google OAuth2 credential>
 *
 *  Query Parameters    (add both as separate entries)
 *  ────────────────
 *  Name                valueInputOption
 *  Value               USER_ENTERED
 *
 *  Name                insertDataOption
 *  Value               INSERT_ROWS
 *
 *  Body
 *  ────
 *  Body Content Type   JSON
 *  Specify Body        Using JSON
 *  JSON                ={{ JSON.stringify($json) }}
 *
 *  Notes
 *  ─────
 *  - USER_ENTERED lets Google Sheets interpret values (numbers stay numbers,
 *    dates parse, etc.). Use RAW to disable interpretation.
 *  - INSERT_ROWS pushes existing rows down instead of overwriting them.
 *  - The Sheets API appends after the last row that contains data, so rows
 *    1-4 (template headers) are preserved and data starts at row 5 naturally.
 * ═══════════════════════════════════════════════════════════════════════════
 */

const RANGE = "TEMPLATE!B5"; // starting cell; API appends after last row

function main() {
  const input = $input.first()?.json ?? {};

  // Support both input shapes:
  // - sample.json / parseEventsFromCodeFence: { menu: { sections: [...] } }
  // - parseKitchenSheetPDF output:            { kitchenSheet: { menu: { sections: [...] } } }
  const kitchenSheet = input.kitchenSheet ?? input;
  const sections = kitchenSheet?.menu?.sections ?? [];

  // Build a 2D values array — each inner array is one row, values are positional:
  //   index 0 → column B (QTY)
  //   index 1 → column C (MENU ITEM)
  const values = [];

  sections.forEach((section) => {
    let row = [section?.qty ?? "", section?.name ?? ""];
    values.push(row);

    section.items.forEach((item) => {
      values.push(["", item.name ?? ""]);
      const ingredients = item.ingredients ?? [];
      ingredients.forEach((ingredient) => {
        values.push(["", "- " + (ingredient ?? "")]);
      });
    });
  });

  return [
    {
      json: {
        range: RANGE,
        majorDimension: "ROWS",
        values,
      },
    },
  ];
}

return main();
