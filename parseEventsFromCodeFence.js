// Utility for n8n Code node: parse an events[] JSON array and map each event to a KitchenSheet.
// For AI nodes that output KitchenSheetPDF format, use parseKitchenSheetPDF.js instead.

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
 * Extracts dietary tags from a title that contains "(gf+df)" style annotations,
 * e.g. "OREGANO ROASTED CHICKEN (gf+df)" → name: "OREGANO ROASTED CHICKEN", dietaryTags: ["gf","df"].
 * If the parenthetical content is not a dietary tag string it is left in the name.
 *
 * @param {string} title
 * @returns {{ name: string, dietaryTags: string[] }}
 */
function extractDietaryTagsFromTitle(title) {
  const match = (title || "").match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  if (match) {
    const rawTags = match[2].trim();
    if (/^[a-z]{1,4}(\+[a-z]{1,4})*$/i.test(rawTags)) {
      return {
        name: match[1].trim(),
        dietaryTags: rawTags
          .split("+")
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean),
      };
    }
  }
  return { name: (title || "").trim(), dietaryTags: [] };
}

/**
 * Maps a single menu item from the sample.json / KitchenSheetPDF sections format to a MenuItem.
 *
 * Input shape:
 * { quantity: 185, title: "OREGANO ROASTED CHICKEN (gf+df)", ingredients: "caramelized lemon, fresh oregano" }
 *
 * @param {{ quantity: number, title: string, ingredients: string }} item
 * @returns {{ name: string, dietaryTags: string[], ingredients: string[], notes: null }}
 */
function mapSampleItemToMenuItem(item) {
  const { name, dietaryTags } = extractDietaryTagsFromTitle(item.title);
  const raw = (item.ingredients || "").trim();
  const ingredients = raw
    ? raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
  return { name, dietaryTags, ingredients, notes: null };
}

/**
 * Maps a single special meal object to camelCase.
 *
 * @param {object} meal
 * @returns {object}
 */
function mapSpecialMeal(meal) {
  return {
    qty: meal.qty,
    type: meal.type,
    recipientName: meal.recipient_name ?? null,
    restrictions: meal.restrictions || [],
    description: meal.description ?? null,
    deliveryTime: meal.delivery_time ?? null,
    deliveredBy: meal.delivered_by ?? null,
    servedHot: meal.served_hot ?? null,
    packaging: meal.packaging ?? null,
  };
}

/**
 * Maps a single event object (sample.json format) to a KitchenSheet.
 *
 * Input shape:
 * {
 *   updated_at:      "2/18/2026 2:01 pm",
 *   document_type:   "KITCHEN SHEET",
 *   event_name:      "DODGERS MAJORS LUNCH",
 *   event_date:      "Sun, Mar 8, 2026",
 *   account:         { account, account_manager, location, phone, booking_contact, booking_phone, site_contact, site_phone },
 *   catering_kitchen:{ date, setup_type, event_type, guests },
 *   operations:      { date, offsite_location, offsite_address, service_start_time, service_end_time, arrival_time, instructions },
 *   menu:            { date, service_start, service_end, lkb_time, sections: [{ qty, name, items: [{ quantity, title, ingredients }] }] },
 *   dietary_requirements: {
 *     portion_sizes: { protein, starch, vegetables },
 *     special_meals: [{ qty, type, recipient_name, restrictions, description, delivery_time, delivered_by, served_hot, packaging }]
 *   }
 * }
 *
 * @param {object} event
 * @returns {object} KitchenSheet-shaped camelCase object
 */
function mapEventToKitchenSheet(event) {
  const sections = (event.menu?.sections || []).map((section) => ({
    qty: section.qty,
    name: section.name,
    items: (section.items || []).map(mapSampleItemToMenuItem),
  }));

  return {
    updatedAt: event.updated_at || "",
    documentType: event.document_type || "KITCHEN SHEET",
    eventName: event.event_name || "",
    eventDate: event.event_date || "",

    account: {
      account: event.account?.account ?? null,
      accountManager: event.account?.account_manager ?? null,
      location: event.account?.location ?? null,
      phone: event.account?.phone ?? null,
      bookingContact: event.account?.booking_contact ?? null,
      bookingPhone: event.account?.booking_phone ?? null,
      siteContact: event.account?.site_contact ?? null,
      sitePhone: event.account?.site_phone ?? null,
    },

    cateringKitchen: {
      date: event.catering_kitchen?.date || "",
      setupType: event.catering_kitchen?.setup_type || "",
      eventType: event.catering_kitchen?.event_type || "",
      guests: event.catering_kitchen?.guests ?? 0,
    },

    operations: {
      date: event.operations?.date || "",
      offsiteLocation: event.operations?.offsite_location ?? null,
      offsiteAddress: event.operations?.offsite_address ?? null,
      serviceStartTime: event.operations?.service_start_time ?? null,
      serviceEndTime: event.operations?.service_end_time ?? null,
      arrivalTime: event.operations?.arrival_time ?? null,
      instructions: event.operations?.instructions ?? null,
    },

    menu: {
      date: event.menu?.date || "",
      serviceStart: event.menu?.service_start ?? null,
      serviceEnd: event.menu?.service_end ?? null,
      lkbTime: event.menu?.lkb_time || "",
      sections,
    },

    dietaryRequirements: {
      portionSizes: {
        protein: event.dietary_requirements?.portion_sizes?.protein ?? null,
        starch: event.dietary_requirements?.portion_sizes?.starch ?? null,
        vegetables:
          event.dietary_requirements?.portion_sizes?.vegetables ?? null,
      },
      specialMeals: (event.dietary_requirements?.special_meals || []).map(
        mapSpecialMeal,
      ),
    },
  };
}

/**
 * n8n Code node entry point.
 *
 * Reads JSON (raw or code-fenced) from:
 *   $input.first().json.output[0].content[0].text
 *
 * Expected LLM output shape — an array of events matching the sample.json format:
 * [
 *   {
 *     "updated_at": "2/18/2026 2:01 pm",
 *     "document_type": "KITCHEN SHEET",
 *     "event_name": "DODGERS MAJORS LUNCH",
 *     "event_date": "Sun, Mar 8, 2026",
 *     "account": { ... },
 *     "catering_kitchen": { "date", "setup_type", "event_type", "guests" },
 *     "operations": { ... },
 *     "menu": { "date", "service_start", "service_end", "lkb_time", "sections": [ ... ] },
 *     "dietary_requirements": { "portion_sizes": { ... }, "special_meals": [ ... ] }
 *   }
 * ]
 *
 * Returns one n8n item per event: { kitchenSheet: KitchenSheet }
 */
function main() {
  const input = $input.all();
  const items = (input || []).map((event) => ({
    json: {
      kitchenSheet: mapEventToKitchenSheet(event.json),
    },
  }));

  return items.length ? items : [{ json: { kitchenSheet: null } }];
}

// In an n8n Code node you would typically just `return main();`
return main();
