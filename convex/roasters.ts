import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { query, type MutationCtx } from "./_generated/server";
import { Loader } from "./lib/hydrate";
import { cleanText, requireText, slugify } from "./lib/validate";

export const list = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, { paginationOpts }) => {
    return await ctx.db
      .query("roasters")
      .withIndex("by_beanCount")
      .order("desc")
      .paginate(paginationOpts);
  },
});

export const bySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const roaster = await ctx.db
      .query("roasters")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (!roaster) return null;
    const beans = await ctx.db
      .query("beans")
      .withIndex("by_roaster", (q) => q.eq("roasterId", roaster._id))
      .order("desc")
      .take(200);
    const cards = await new Loader(ctx).beanCards(beans);
    return { roaster, beans: cards };
  },
});

/** Autocomplete for the "add a bean" form. */
export const search = query({
  args: { q: v.string() },
  handler: async (ctx, { q }) => {
    const term = q.trim();
    if (term.length === 0) {
      return await ctx.db.query("roasters").withIndex("by_beanCount").order("desc").take(8);
    }
    return await ctx.db
      .query("roasters")
      .withSearchIndex("search_name", (s) => s.search("name", term))
      .take(8);
  },
});

/** Find a roaster by exact name, or create it with a unique slug. */
export async function findOrCreateRoaster(
  ctx: MutationCtx,
  input: { name: string; location?: string; website?: string },
  userId: Id<"users">,
): Promise<Id<"roasters">> {
  const name = requireText(input.name, 80, "Roaster name");
  const base = slugify(name);
  if (!base) throw new ConvexError("Roaster name needs some letters or numbers.");

  for (let i = 1; i < 50; i++) {
    const slug = i === 1 ? base : `${base}-${i}`;
    const existing = await ctx.db
      .query("roasters")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (!existing) {
      let website = cleanText(input.website, 200, "Website");
      if (website && !/^https?:\/\//i.test(website)) website = `https://${website}`;
      return await ctx.db.insert("roasters", {
        name,
        slug,
        location: cleanText(input.location, 80, "Roaster location"),
        website,
        createdBy: userId,
        beanCount: 0,
      });
    }
    if (existing.name.toLowerCase() === name.toLowerCase()) return existing._id;
  }
  throw new ConvexError("Couldn't create that roaster. Try a more specific name.");
}
