import { ConvexError } from "convex/values";

/** Trim; return undefined for empty strings; reject overly long input. */
export function cleanText(
  value: string | undefined,
  max: number,
  field: string,
): string | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  if (trimmed.length === 0) return undefined;
  if (trimmed.length > max) {
    throw new ConvexError(`${field} must be at most ${max} characters.`);
  }
  return trimmed;
}

export function requireText(value: string, max: number, field: string): string {
  const cleaned = cleanText(value, max, field);
  if (cleaned === undefined) throw new ConvexError(`${field} is required.`);
  return cleaned;
}

/** Trim, drop empties, de-duplicate case-insensitively, and cap the count. */
export function cleanTags(
  values: string[],
  maxCount: number,
  maxLength: number,
  field: string,
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const tag = raw.trim();
    if (tag.length === 0) continue;
    if (tag.length > maxLength) {
      throw new ConvexError(`Each ${field} entry must be at most ${maxLength} characters.`);
    }
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(tag);
  }
  if (out.length > maxCount) {
    throw new ConvexError(`At most ${maxCount} ${field} entries are allowed.`);
  }
  return out;
}

export function oneOf<T extends string>(
  value: string,
  allowed: readonly T[],
  field: string,
): T {
  if (!(allowed as readonly string[]).includes(value)) {
    throw new ConvexError(`Unknown ${field}: ${value}`);
  }
  return value as T;
}

export function isoDate(value: string, field: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(value))) {
    throw new ConvexError(`${field} must be a date like 2026-01-31.`);
  }
  return value;
}

export function optionalNumber(
  value: number | undefined,
  min: number,
  max: number,
  field: string,
): number | undefined {
  if (value === undefined) return undefined;
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new ConvexError(`${field} must be between ${min} and ${max}.`);
  }
  return value;
}

export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
