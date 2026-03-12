// ─── Document Root ────────────────────────────────────────────────────────────

export interface KitchenSheet {
  updatedAt: string;
  documentType: "KITCHEN SHEET";
  eventName: string;
  eventDate: string;

  account: AccountInfo;
  cateringKitchen: CateringKitchenInfo;
  operations: OperationsInfo;
  menu: Menu;
  dietaryRequirements: DietaryRequirements;
}

// ─── Account Info ─────────────────────────────────────────────────────────────

export interface AccountInfo {
  account: string;
  accountManager: string;
  location: string | null;
  phone: string | null;
  bookingContact: string;
  bookingPhone: string;
  siteContact: string | null;
  sitePhone: string | null;
}

// ─── Catering Kitchen Info ────────────────────────────────────────────────────

export type SetupType = "Buffet Style" | "Plated" | "Family Style" | string;
export type EventType = "Lunch" | "Dinner" | "Breakfast" | "Snack" | string;

export interface CateringKitchenInfo {
  date: string;
  setupType: SetupType;
  eventType: EventType;
  guests: number;
}

// ─── Operations & Server Info ─────────────────────────────────────────────────

export interface OperationsInfo {
  date: string;
  offsiteLocation: string;
  offsiteAddress: string;
  serviceStartTime: string;
  serviceEndTime: string;
  arrivalTime: string;
  instructions: string;
}

// ─── Menu ─────────────────────────────────────────────────────────────────────

export interface Menu {
  date: string;
  serviceStart: string;
  serviceEnd: string;
  lkbTime: string;
  sections: MenuSection[];
}

export interface MenuSection {
  qty: number;
  name: string;
  items: MenuItem[];
}

/**
 * Raw ingredient string parsed from the text after the "|" divider in a menu item line.
 * e.g. "OREGANO ROASTED CHICKEN (gf+df) | caramelized lemon, fresh oregano"
 *       → ingredients: ["caramelized lemon", "fresh oregano"]
 */
export type Ingredient = string;

export interface MenuItem {
  name: string;
  dietaryTags: DietaryTag[];
  /** Comma-separated values extracted from the text after the "|" divider. */
  ingredients: Ingredient[];
  notes: string | null;
}

export type DietaryTag = "gf" | "df" | string;

// ─── KitchenSheetPDF ──────────────────────────────────────────────────────────

/**
 * A single menu section as extracted from a PDF.
 * Keeps qty and name as structured fields. Each item has a title line
 * and an ingredients line separated by a newline character:
 *
 *   "ITEM NAME (tag1+tag2)\ningredient one, ingredient two"
 *
 * Example:
 *   {
 *     qty: 185,
 *     name: "DODGERS LUNCH BUFFET",
 *     items: [{ quantity: 2, title: "OREGANO ROASTED CHICKEN (gf+df)", ingredients: "caramelized lemon, fresh oregano" }]
 *   }
 */
export interface MenuSectionPDFItem {
  quantity: number;
  /** Item name with dietary tags, e.g. "OREGANO ROASTED CHICKEN (gf+df)". */
  title: string;
  /** Ingredients line appearing below the title, e.g. "caramelized lemon, fresh oregano". */
  ingredients: string;
}

export interface MenuSectionPDF extends Omit<MenuSection, "items"> {
  items: MenuSectionPDFItem[];
}

/**
 * Variant of Menu used when extracting raw text directly from a PDF.
 * sections is MenuSectionPDF[] — each section has structured qty/name
 * but items is MenuSectionPDFItem[] instead of MenuItem[].
 */
export interface MenuPDF extends Omit<Menu, "sections"> {
  sections: MenuSectionPDF[];
}

/**
 * Represents a Kitchen Sheet as extracted directly from a PDF.
 * Identical to KitchenSheet except menu uses MenuPDF, where each
 * section's items is a raw string rather than structured MenuItem objects.
 */
export interface KitchenSheetPDF extends Omit<KitchenSheet, "menu"> {
  menu: MenuPDF;
}

// ─── Dietary Requirements ─────────────────────────────────────────────────────

export interface DietaryRequirements {
  portionSizes: PortionSizes;
  specialMeals: SpecialMeal[];
}

export interface PortionSizes {
  protein: string;
  starch: string;
  vegetables: string;
}

export type SpecialMealType = "WHOLE 30" | "SPECIALTY" | "CONCIERGE" | string;

export interface SpecialMeal {
  qty: number;
  type: SpecialMealType;
  recipientName: string | null;
  restrictions: string[];
  description: string;
  deliveryTime: string | null;
  deliveredBy: string | null;
  servedHot: boolean;
  packaging: "togo box" | "plate" | null;
}
