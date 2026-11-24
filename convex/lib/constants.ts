// Shared between the Convex backend and the web app.

export const PROCESSES = [
  "Washed",
  "Natural",
  "Honey",
  "Anaerobic",
  "Carbonic maceration",
  "Wet-hulled",
  "Experimental",
  "Unknown",
] as const;

export const ROAST_LEVELS = [
  "Light",
  "Medium-light",
  "Medium",
  "Medium-dark",
  "Dark",
] as const;

export const BREW_METHODS = [
  "V60",
  "Kalita Wave",
  "Chemex",
  "AeroPress",
  "French press",
  "Clever dripper",
  "Espresso",
  "Moka pot",
  "Cold brew",
  "Siphon",
  "Drip machine",
  "Vietnamese phin",
  "Turkish",
  "Other",
] as const;

export const ORIGINS = [
  "Blend",
  "Bolivia",
  "Brazil",
  "Burundi",
  "China",
  "Colombia",
  "Costa Rica",
  "DR Congo",
  "Dominican Republic",
  "Ecuador",
  "El Salvador",
  "Ethiopia",
  "Guatemala",
  "Haiti",
  "Hawaii",
  "Honduras",
  "India",
  "Indonesia",
  "Jamaica",
  "Kenya",
  "Laos",
  "Malawi",
  "Mexico",
  "Myanmar",
  "Nicaragua",
  "Panama",
  "Papua New Guinea",
  "Peru",
  "Philippines",
  "Rwanda",
  "Tanzania",
  "Thailand",
  "Timor-Leste",
  "Uganda",
  "Vietnam",
  "Yemen",
  "Zambia",
  "Other",
] as const;

/** Suggestions for tasting-note chips, loosely following the SCA flavor wheel. */
export const FLAVOR_SUGGESTIONS = [
  "Jasmine",
  "Bergamot",
  "Lemon",
  "Orange",
  "Grapefruit",
  "Blueberry",
  "Strawberry",
  "Blackcurrant",
  "Cherry",
  "Peach",
  "Apricot",
  "Mango",
  "Pineapple",
  "Passion fruit",
  "Red apple",
  "Grape",
  "Honey",
  "Caramel",
  "Brown sugar",
  "Maple",
  "Milk chocolate",
  "Dark chocolate",
  "Cocoa",
  "Hazelnut",
  "Almond",
  "Cinnamon",
  "Clove",
  "Black tea",
  "Tobacco",
  "Cedar",
  "Earthy",
  "Wine",
] as const;

export const LIMITS = {
  nameMax: 120,
  bioMax: 400,
  reviewMax: 5000,
  descriptionMax: 2000,
  notesMax: 12,
  noteMax: 32,
  varietiesMax: 8,
  listTitleMax: 120,
  listItemsMax: 250,
  favoritesMax: 4,
} as const;

/** Ratings are half-star steps from 0.5 to 5. */
export function isValidRating(rating: number): boolean {
  return rating >= 0.5 && rating <= 5 && Number.isInteger(rating * 2);
}

/** Index 0 holds 0.5-star ratings, index 9 holds 5-star ratings. */
export function ratingBucket(rating: number): number {
  return Math.round(rating * 2) - 1;
}

/** URL-safe handles: what we ask users to pick at sign-up. */
export const HANDLE_PATTERN = /^[a-zA-Z0-9_]{2,24}$/;
