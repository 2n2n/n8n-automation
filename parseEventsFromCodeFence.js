// Utility for n8n Code node: parse events[] JSON and map to KitchenSheet

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

  // Remove starting ```json or ``` (case-insensitive), plus any following whitespace/newlines
  let cleaned = rawText.replace(/^```json\s*/i, "").replace(/^```\s*/i, "");

  // Remove a trailing ``` if present (with optional whitespace before it)
  cleaned = cleaned.replace(/\s*```$/i, "").trim();

  return JSON.parse(cleaned);
}

/**
 * Returns true if the string looks like dietary tag codes:
 * short alpha segments joined by "+", e.g. "gf+df", "gf", "df+vg+v".
 *
 * @param {string} str
 * @returns {boolean}
 */
function isDietaryTagString(str) {
  return /^[a-z]{1,4}(\+[a-z]{1,4})*$/i.test((str || "").trim());
}

/**
 * Converts a raw menu item (from the events[] format) into a MenuItem.
 *
 * The `notes` field may contain:
 *   - Dietary tags: "gf+df"  → dietaryTags: ["gf","df"], ingredients: [], notes: null
 *   - Ingredients:  "burger, salmon, chicken" → dietaryTags: [], ingredients: ["burger","salmon","chicken"], notes: null
 *   - A plain note: "COOKED" → dietaryTags: [], ingredients: [], notes: "COOKED"
 *
 * @param {{ qty_serving: number, menu_item: string, qty: number, unit: string|null, notes: string|null }} item
 * @returns {{ name: string, dietaryTags: string[], ingredients: string[], notes: string|null }}
 */
function mapEventItemToMenuItem(item) {
  const name  = (item.menu_item || "").trim();
  const raw   = (item.notes     || "").trim();

  let dietaryTags = [];
  let ingredients = [];
  let notes       = null;

  if (!raw) {
    // nothing to parse
  } else if (isDietaryTagString(raw)) {
    dietaryTags = raw.split("+").map((t) => t.trim().toLowerCase()).filter(Boolean);
  } else if (raw.includes(",")) {
    ingredients = raw.split(",").map((s) => s.trim()).filter(Boolean);
  } else {
    notes = raw;
  }

  return { name, dietaryTags, ingredients, notes };
}

/**
 * Groups a flat array of menu items into sections by qty_serving, preserving order.
 * Items that share the same qty_serving belong to the same section.
 *
 * @param {object[]} menuItems
 * @returns {Map<number, object[]>}
 */
function groupBySectionQty(menuItems) {
  const map = new Map();
  for (const item of menuItems) {
    const qty = item.qty_serving ?? 0;
    if (!map.has(qty)) map.set(qty, []);
    map.get(qty).push(item);
  }
  return map;
}

/**
 * Maps a single event object (from the LLM events[] array) to a KitchenSheet.
 *
 * Input shape:
 * {
 *   event_type:  "BUFFET",
 *   event_name:  "DODGERS MAJORS LUNCH",
 *   status:      "DEFINITE",
 *   date:        "03/08/2026",
 *   guest_count: 185,
 *   rtg_time:    "10:30 AM",
 *   prepared_by: "",
 *   menu_items: [
 *     { qty_serving: 185, menu_item: "OREGANO ROASTED CHICKEN", qty: 0, unit: null, notes: "gf+df" },
 *     { qty_serving:  60, menu_item: "GRILL ACTION STATION",    qty: 60, unit: "SERVINGS",
 *       notes: "burger, salmon, chicken, cheese, lettuce, tomato, onion, pickles, buns" }
 *   ]
 * }
 *
 * Section grouping:
 *   - The first (largest) qty_serving group uses the event name as the section name.
 *   - Each subsequent group (different qty_serving) uses the first item's name as the section name
 *     since these typically represent named stations (e.g. "GRILL ACTION STATION").
 *
 * @param {object} event
 * @returns {object} KitchenSheet-shaped camelCase object
 */
function mapEventToKitchenSheet(event) {
  const sectionMap = groupBySectionQty(event.menu_items || []);

  const sections = [];
  for (const [qty, items] of sectionMap) {
    const isFirst    = sections.length === 0;
    const sectionName = isFirst
      ? (event.event_name || "").toUpperCase()
      : (items[0]?.menu_item || "").toUpperCase();

    sections.push({
      qty,
      name:  sectionName,
      items: items.map(mapEventItemToMenuItem),
    });
  }

  return {
    updatedAt:    "",
    documentType: "KITCHEN SHEET",
    eventName:    event.event_name || "",
    eventDate:    event.date       || "",

    account: {
      account:        "",
      accountManager: "",
      location:       null,
      phone:          null,
      bookingContact: "",
      bookingPhone:   "",
      siteContact:    null,
      sitePhone:      null,
    },

    cateringKitchen: {
      date:      event.date       || "",
      setupType: event.event_type || "",
      eventType: "",
      guests:    event.guest_count ?? 0,
    },

    operations: {
      date:             event.date     || "",
      offsiteLocation:  "",
      offsiteAddress:   "",
      serviceStartTime: "",
      serviceEndTime:   "",
      arrivalTime:      event.rtg_time || "",
      instructions:     "",
    },

    menu: {
      date:         event.date     || "",
      serviceStart: "",
      serviceEnd:   "",
      lkbTime:      event.rtg_time || "",
      sections,
    },

    dietaryRequirements: {
      portionSizes: { protein: "", starch: "", vegetables: "" },
      specialMeals: [],
    },
  };
}

/**
 * n8n Code node entry point.
 *
 * Reads JSON (raw or code-fenced) from:
 *   $input.first().json.output[0].content[0].text
 *
 * Expected LLM output shape:
 * {
 *   "events": [
 *     {
 *       "event_type": "BUFFET",
 *       "event_name": "DODGERS MAJORS LUNCH",
 *       "date": "03/08/2026",
 *       "guest_count": 185,
 *       "rtg_time": "10:30 AM",
 *       "menu_items": [ ... ]
 *     }
 *   ]
 * }
 *
 * Returns one n8n item per event: { filename, kitchenSheet: KitchenSheet }
 */
function main() {
  const inputJson = $input.first().json;
  const filename  = inputJson.filename || "";

  const raw    = inputJson.output[0].content[0].text;
  const parsed = parseJsonFromCodeFence(raw);

  const items = (parsed.events || []).map((event) => ({
    json: {
      filename,
      kitchenSheet: mapEventToKitchenSheet(event),
    },
  }));

  return items.length ? items : [{ json: { filename, kitchenSheet: null } }];
}

// In an n8n Code node you would typically just `return main();`
return main();
