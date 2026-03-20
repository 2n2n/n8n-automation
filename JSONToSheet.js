/**
 * n8n Code node helper: map KitchenSheet.menu.sections -> Google Sheets rows.
 *
 * Mapping (within the output 2D "values" array):
 * - Column A -> menu.sections[].qty
 * - Column B -> blank
 * - Column C -> menu.sections[].name
 *
 * Intended usage:
 * - In the Google Sheets node, set the target range to start at row 5 (e.g. `A5:C`).
 * - Use this node's output JSON to provide the `values` payload.
 */

function main() {
  const input = $input.first()?.json ?? {};

  // Support both shapes:
  // - sample.json style: { menu: { sections: [...] } }
  // - parseKitchenSheetPDF.js style: { kitchenSheet: { menu: { sections: [...] } } }
  const kitchenSheet = input.kitchenSheet ?? input;
  const sections = kitchenSheet?.menu?.sections ?? [];

  const START_ROW = 5; // informational; the Google Sheets node range should start at row 5

  // If your Google Sheets node range is `A5:C`, each row must have 3 columns:
  // [A, B, C] => [qty, '', name]
  const values = sections.map((section) => [
    section?.qty ?? "",
    "",
    section?.name ?? "",
  ]);

  // Most n8n Google Sheets node configurations accept a structure like:
  // { json: { values: [ [..row1..], [..row2..] ] } }
  return [
    {
      json: {
        startRow: START_ROW,
        values,
      },
    },
  ];
}

return main();

