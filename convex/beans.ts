import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx } from "./_generated/server";
import { requireUserId } from "./lib/auth";
import { LIMITS, ORIGINS, PROCESSES, ROAST_LEVELS } from "./lib/constants";
import { Loader } from "./lib/hydrate";
import { emptyBeanAggregates } from "./lib/userBeanState";
import { cleanTags, cleanText, oneOf, optionalNumber, requireText } from "./lib/validate";
import { assertImage } from "./files";
import { findOrCreateRoaster } from "./roasters";

export const get = query({
  args: { beanId: v.string() },
  handler: async (ctx, args) => {
    const beanId = ctx.db.normalizeId("beans", args.beanId);
    if (!beanId) return null;
    const bean = await ctx.db.get("beans", beanId);
    if (!bean) return null;
    const [roaster, imageUrl, creator] = await Promise.all([
      ctx.db.get("roasters", bean.roasterId),
      bean.imageId ? ctx.storage.getUrl(bean.imageId) : null,
      bean.createdBy ? new Loader(ctx).profile(bean.createdBy) : null,
    ]);
    return {
      ...bean,
      imageUrl,
      roaster: roaster && { name: roaster.name, slug: roaster.slug, location: roaster.location },
      creator,
    };
  },
});

const sortValidator = v.union(v.literal("popular"), v.literal("rating"), v.literal("newest"));

export const browse = query({
  args: {
    paginationOpts: paginationOptsValidator,
    sort: sortValidator,
    origin: v.optional(v.string()),
    process: v.optional(v.string()),
    roastLevel: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const base =
      args.sort === "popular"
        ? ctx.db.query("beans").withIndex("by_brewerCount")
        : args.sort === "rating"
          ? ctx.db.query("beans").withIndex("by_ratingAvg")
          : ctx.db.query("beans");
    const result = await base
      .order("desc")
      .filter((q) => {
        const conds = [];
        if (args.origin) conds.push(q.eq(q.field("origin"), args.origin));
        if (args.process) conds.push(q.eq(q.field("process"), args.process));
        if (args.roastLevel) conds.push(q.eq(q.field("roastLevel"), args.roastLevel));
        return conds.length > 0 ? q.and(...conds) : true;
      })
      .paginate(args.paginationOpts);
    return { ...result, page: await new Loader(ctx).beanCards(result.page) };
  },
});

export const search = query({
  args: {
    q: v.string(),
    origin: v.optional(v.string()),
    process: v.optional(v.string()),
    roastLevel: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const term = args.q.trim();
    if (term.length === 0) return [];
    const beans = await ctx.db
      .query("beans")
      .withSearchIndex("search_text", (s) => {
        let q = s.search("searchText", term);
        if (args.origin) q = q.eq("origin", args.origin);
        if (args.process) q = q.eq("process", args.process);
        if (args.roastLevel) q = q.eq("roastLevel", args.roastLevel);
        return q;
      })
      .take(Math.min(args.limit ?? 40, 60));
    return await new Loader(ctx).beanCards(beans);
  },
});

export const popular = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const beans = await ctx.db
      .query("beans")
      .withIndex("by_brewerCount")
      .order("desc")
      .take(Math.min(limit ?? 12, 48));
    return await new Loader(ctx).beanCards(beans);
  },
});

export const recent = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const beans = await ctx.db.query("beans").order("desc").take(Math.min(limit ?? 12, 48));
    return await new Loader(ctx).beanCards(beans);
  },
});

const beanFields = {
  name: v.string(),
  origin: v.string(),
  region: v.optional(v.string()),
  producer: v.optional(v.string()),
  varieties: v.array(v.string()),
  process: v.string(),
  roastLevel: v.string(),
  altitudeMin: v.optional(v.number()),
  altitudeMax: v.optional(v.number()),
  harvest: v.optional(v.string()),
  roasterNotes: v.array(v.string()),
  description: v.optional(v.string()),
  imageId: v.optional(v.id("_storage")),
};

const roasterInput = v.union(
  v.object({ kind: v.literal("existing"), roasterId: v.id("roasters") }),
  v.object({
    kind: v.literal("new"),
    name: v.string(),
    location: v.optional(v.string()),
    website: v.optional(v.string()),
  }),
);

type BeanInput = {
  name: string;
  origin: string;
  region?: string;
  producer?: string;
  varieties: string[];
  process: string;
  roastLevel: string;
  altitudeMin?: number;
  altitudeMax?: number;
  harvest?: string;
  roasterNotes: string[];
  description?: string;
};

function cleanBean(input: BeanInput) {
  const altitudeMin = optionalNumber(input.altitudeMin, 0, 3500, "Altitude");
  const altitudeMax = optionalNumber(input.altitudeMax, 0, 3500, "Altitude");
  if (altitudeMin !== undefined && altitudeMax !== undefined && altitudeMax < altitudeMin) {
    throw new ConvexError("Maximum altitude must be above the minimum.");
  }
  return {
    name: requireText(input.name, LIMITS.nameMax, "Bean name"),
    origin: oneOf(input.origin, ORIGINS, "origin"),
    region: cleanText(input.region, 80, "Region"),
    producer: cleanText(input.producer, 120, "Producer"),
    varieties: cleanTags(input.varieties, LIMITS.varietiesMax, 40, "variety"),
    process: oneOf(input.process, PROCESSES, "process"),
    roastLevel: oneOf(input.roastLevel, ROAST_LEVELS, "roast level"),
    altitudeMin,
    altitudeMax,
    harvest: cleanText(input.harvest, 40, "Harvest"),
    roasterNotes: cleanTags(input.roasterNotes, LIMITS.notesMax, LIMITS.noteMax, "tasting note"),
    description: cleanText(input.description, LIMITS.descriptionMax, "Description"),
  };
}

function searchTextFor(b: ReturnType<typeof cleanBean>, roasterName: string): string {
  return [b.name, roasterName, b.origin, b.region, b.producer, b.process, ...b.varieties]
    .filter(Boolean)
    .join(" ");
}

async function resolveRoaster(
  ctx: MutationCtx,
  input: typeof roasterInput.type,
  userId: Id<"users">,
): Promise<Doc<"roasters">> {
  const roasterId =
    input.kind === "existing" ? input.roasterId : await findOrCreateRoaster(ctx, input, userId);
  const roaster = await ctx.db.get("roasters", roasterId);
  if (!roaster) throw new ConvexError("That roaster doesn't exist.");
  return roaster;
}

async function assertNoDuplicate(
  ctx: MutationCtx,
  roasterId: Id<"roasters">,
  name: string,
  except?: Id<"beans">,
) {
  const lower = name.toLowerCase();
  for await (const bean of ctx.db
    .query("beans")
    .withIndex("by_roaster", (q) => q.eq("roasterId", roasterId))) {
    if (bean._id !== except && bean.name.toLowerCase() === lower) {
      throw new ConvexError(`"${bean.name}" from this roaster is already in Crema.`);
    }
  }
}

export const create = mutation({
  args: { ...beanFields, roaster: roasterInput },
  returns: v.id("beans"),
  handler: async (ctx, { roaster: roasterArg, imageId, ...input }) => {
    const userId = await requireUserId(ctx);
    const fields = cleanBean(input);
    const roaster = await resolveRoaster(ctx, roasterArg, userId);
    await assertNoDuplicate(ctx, roaster._id, fields.name);
    if (imageId) await assertImage(ctx, imageId);
    const beanId = await ctx.db.insert("beans", {
      ...fields,
      roasterId: roaster._id,
      roasterName: roaster.name,
      imageId,
      createdBy: userId,
      searchText: searchTextFor(fields, roaster.name),
      ...emptyBeanAggregates(),
    });
    await ctx.db.patch("roasters", roaster._id, { beanCount: roaster.beanCount + 1 });
    return beanId;
  },
});

export const update = mutation({
  args: {
    beanId: v.id("beans"),
    ...beanFields,
    roaster: roasterInput,
    removeImage: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, { beanId, roaster: roasterArg, imageId, removeImage, ...input }) => {
    const userId = await requireUserId(ctx);
    const bean = await ctx.db.get("beans", beanId);
    if (!bean) throw new ConvexError("That bean doesn't exist.");
    if (bean.createdBy !== userId) {
      throw new ConvexError("Only the person who added this bean can edit it.");
    }
    const fields = cleanBean(input);
    const roaster = await resolveRoaster(ctx, roasterArg, userId);
    await assertNoDuplicate(ctx, roaster._id, fields.name, beanId);

    let nextImage = bean.imageId;
    if (imageId && imageId !== bean.imageId) {
      await assertImage(ctx, imageId);
      nextImage = imageId;
    } else if (removeImage) {
      nextImage = undefined;
    }
    if (bean.imageId && bean.imageId !== nextImage) await ctx.storage.delete(bean.imageId);

    if (roaster._id !== bean.roasterId) {
      const old = await ctx.db.get("roasters", bean.roasterId);
      if (old) await ctx.db.patch("roasters", old._id, { beanCount: Math.max(0, old.beanCount - 1) });
      await ctx.db.patch("roasters", roaster._id, { beanCount: roaster.beanCount + 1 });
    }

    await ctx.db.patch("beans", beanId, {
      ...fields,
      roasterId: roaster._id,
      roasterName: roaster.name,
      imageId: nextImage,
      searchText: searchTextFor(fields, roaster.name),
    });
    return null;
  },
});
