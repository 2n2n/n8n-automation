// Utility for n8n Code node: parse a KitchenSheetPDF JSON string and convert to KitchenSheet

/**
 * Extracts and parses JSON from a string that may be wrapped in
 * ```json ... ``` code fences (as returned by some LLM tools).
 * Also handles raw JSON strings with no fences.
 *
 * @param {string} rawText - The raw text containing JSON, possibly fenced.
 * @returns {any} Parsed JSON object.
 */
function parseJsonFromCodeFence(rawText) {
  if (typeof rawText !== "string") {
    throw new Error("Expected rawText to be a string");
  }

  let cleaned = rawText.replace(/^```json\s*/i, "").replace(/^```\s*/i, "");
  cleaned = cleaned.replace(/\s*```$/i, "").trim();

  return JSON.parse(cleaned);
}

/**
 * Parses a PDF item title like "OREGANO ROASTED CHICKEN (gf+df)" into a
 * clean display name and an array of dietary tag codes.
 *
 * @param {string} title
 * @returns {{ name: string, dietaryTags: string[] }}
 */
function parseTitleAndTags(title) {
  const tagMatch = (title || "").match(/\(([^)]+)\)\s*$/);
  const dietaryTags = tagMatch
    ? tagMatch[1].split("+").map((t) => t.trim().toLowerCase()).filter(Boolean)
    : [];
  const name = (title || "").replace(/\([^)]+\)\s*$/, "").trim();
  return { name, dietaryTags };
}

/**
 * Converts a single MenuSectionPDFItem into a MenuItem.
 *
 * Input shape:
 *   { quantity: 2, title: "OREGANO ROASTED CHICKEN (gf+df)", ingredients: "caramelized lemon, fresh oregano" }
 *
 * Output shape:
 *   { name: "OREGANO ROASTED CHICKEN", dietaryTags: ["gf","df"], ingredients: ["caramelized lemon","fresh oregano"], notes: null }
 *
 * @param {{ quantity: number, title: string, ingredients: string }} pdfItem
 * @returns {{ name: string, dietaryTags: string[], ingredients: string[], notes: string|null }}
 */
function mapPDFItemToMenuItem(pdfItem) {
  const { name, dietaryTags } = parseTitleAndTags(pdfItem.title || "");
  const ingredients = (pdfItem.ingredients || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return { name, dietaryTags, ingredients, notes: null };
}

/**
 * Converts a KitchenSheetPDF object into a KitchenSheet by transforming
 * each section's MenuSectionPDFItem[] into structured MenuItem[] objects.
 * All other fields pass through unchanged.
 *
 * @param {object} pdf - A KitchenSheetPDF-shaped object.
 * @returns {object} KitchenSheet-shaped object.
 */
function mapKitchenSheetPDFToKitchenSheet(pdf) {
  const sections = (pdf.menu?.sections || []).map((section) => ({
    qty:   section.qty,
    name:  section.name,
    items: (section.items || []).map(mapPDFItemToMenuItem),
  }));

  return {
    ...pdf,
    menu: {
      ...pdf.menu,
      sections,
    },
  };
}

/**
 * n8n Code node entry point.
 *
 * Reads a KitchenSheetPDF JSON string (raw or code-fenced) from:
 *   $input.first().json.output[0].content[0].text
 *
 * Expected AI output shape:
 * {
 *   "updatedAt": "...",
 *   "documentType": "KITCHEN SHEET",
 *   "eventName": "...",
 *   "eventDate": "...",
 *   "account": { ... },
 *   "cateringKitchen": { ... },
 *   "operations": { ... },
 *   "menu": {
 *     "sections": [
 *       {
 *         "qty": 185,
 *         "name": "DODGERS LUNCH BUFFET",
 *         "items": [
 *           { "quantity": 2, "title": "OREGANO ROASTED CHICKEN (gf+df)", "ingredients": "caramelized lemon, fresh oregano" }
 *         ]
 *       }
 *     ]
 *   },
 *   "dietaryRequirements": { ... }
 * }
 *
 * Returns one n8n item: { filename, kitchenSheet: KitchenSheet }
 */
function main() {
  const inputJson = $input.first().json;
  const filename  = inputJson.filename || "";

  const raw        = inputJson.output[0].content[0].text;
  const pdf        = parseJsonFromCodeFence(raw);
  const kitchenSheet = mapKitchenSheetPDFToKitchenSheet(pdf);

  return [{ json: { filename, kitchenSheet } }];
}

return main();
