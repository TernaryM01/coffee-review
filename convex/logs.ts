import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx } from "./_generated/server";
import { optionalUserId, requireUserId } from "./lib/auth";
import { BREW_METHODS, isValidRating, LIMITS } from "./lib/constants";
import { getUserIdByUsername, Loader } from "./lib/hydrate";
import { updateUserBean } from "./lib/userBeanState";
import { cleanTags, cleanText, isoDate, oneOf, optionalNumber } from "./lib/validate";
import { recipe } from "./schema";

const logFields = {
  brewedOn: v.string(),
  rating: v.optional(v.number()),
  liked: v.boolean(),
  review: v.optional(v.string()),
  method: v.optional(v.string()),
  notes: v.array(v.string()),
  rebrew: v.boolean(),
  recipe: v.optional(recipe),
};

type LogInput = {
  brewedOn: string;
  rating?: number;
  liked: boolean;
  review?: string;
  method?: string;
  notes: string[];
  rebrew: boolean;
  recipe?: Doc<"logs">["recipe"];
};

function cleanLog(input: LogInput) {
  if (input.rating !== undefined && !isValidRating(input.rating)) {
    throw new ConvexError("Ratings go from half a star to five stars.");
  }
  const review = cleanText(input.review, LIMITS.reviewMax, "Review");
  const r = input.recipe;
  const cleanedRecipe = r && {
    doseG: optionalNumber(r.doseG, 0, 1000, "Dose"),
    yieldG: optionalNumber(r.yieldG, 0, 5000, "Yield"),
    tempC: optionalNumber(r.tempC, 0, 100, "Water temperature"),
    grind: cleanText(r.grind, 40, "Grind"),
    time: cleanText(r.time, 20, "Brew time"),
  };
  const hasRecipe = cleanedRecipe && Object.values(cleanedRecipe).some((x) => x !== undefined);
  return {
    brewedOn: isoDate(input.brewedOn, "Brew date"),
    rating: input.rating,
    liked: input.liked,
    review,
    hasReview: review !== undefined,
    method: input.method ? oneOf(input.method, BREW_METHODS, "brew method") : undefined,
    notes: cleanTags(input.notes, LIMITS.notesMax, LIMITS.noteMax, "tasting note"),
    rebrew: input.rebrew,
    recipe: hasRecipe ? cleanedRecipe : undefined,
  };
}

async function latestBrewDate(
  ctx: MutationCtx,
  userId: Id<"users">,
  beanId: Id<"beans">,
): Promise<string | undefined> {
  const latest = await ctx.db
    .query("logs")
    .withIndex("by_user_and_bean_and_brewedOn", (q) =>
      q.eq("userId", userId).eq("beanId", beanId),
    )
    .order("desc")
    .first();
  return latest?.brewedOn;
}

async function bumpCounters(
  ctx: MutationCtx,
  userId: Id<"users">,
  beanId: Id<"beans">,
  logs: number,
  reviews: number,
) {
  const [user, bean] = await Promise.all([ctx.db.get("users", userId), ctx.db.get("beans", beanId)]);
  if (user) {
    await ctx.db.patch("users", userId, {
      stats: { ...user.stats, logs: user.stats.logs + logs, reviews: user.stats.reviews + reviews },
    });
  }
  if (bean) await ctx.db.patch("beans", beanId, { logCount: bean.logCount + logs });
}

export async function createLog(
  ctx: MutationCtx,
  userId: Id<"users">,
  beanId: Id<"beans">,
  input: LogInput,
): Promise<Id<"logs">> {
  const fields = cleanLog(input);
  const logId = await ctx.db.insert("logs", { userId, beanId, ...fields });
  await updateUserBean(ctx, userId, beanId, (s) => ({
    ...s,
    brewCount: s.brewCount + 1,
    lastBrewedOn:
      s.lastBrewedOn && s.lastBrewedOn > fields.brewedOn ? s.lastBrewedOn : fields.brewedOn,
    rating: fields.rating ?? s.rating,
    liked: s.liked || fields.liked,
    wishlisted: false,
  }));
  await bumpCounters(ctx, userId, beanId, 1, fields.hasReview ? 1 : 0);
  return logId;
}

export async function updateLog(
  ctx: MutationCtx,
  userId: Id<"users">,
  logId: Id<"logs">,
  input: LogInput,
): Promise<void> {
  const log = await ctx.db.get("logs", logId);
  if (!log || log.userId !== userId) throw new ConvexError("That diary entry isn't yours.");
  const fields = cleanLog(input);
  await ctx.db.replace("logs", logId, { userId, beanId: log.beanId, ...fields });
  const lastBrewedOn = await latestBrewDate(ctx, userId, log.beanId);
  await updateUserBean(ctx, userId, log.beanId, (s) => ({
    ...s,
    lastBrewedOn,
    rating: fields.rating ?? s.rating,
    liked: fields.liked !== log.liked ? fields.liked : s.liked,
  }));
  const reviewDelta = Number(fields.hasReview) - Number(log.hasReview);
  if (reviewDelta !== 0) await bumpCounters(ctx, userId, log.beanId, 0, reviewDelta);
}

export async function removeLog(
  ctx: MutationCtx,
  userId: Id<"users">,
  logId: Id<"logs">,
): Promise<void> {
  const log = await ctx.db.get("logs", logId);
  if (!log || log.userId !== userId) throw new ConvexError("That diary entry isn't yours.");
  await ctx.db.delete("logs", logId);
  const lastBrewedOn = await latestBrewDate(ctx, userId, log.beanId);
  // Like Letterboxd, the bean stays "brewed" (and keeps its rating) after
  // its last diary entry is deleted.
  await updateUserBean(ctx, userId, log.beanId, (s) => ({
    ...s,
    brewCount: s.brewCount - 1,
    lastBrewedOn,
  }));
  await bumpCounters(ctx, userId, log.beanId, -1, log.hasReview ? -1 : 0);
}

export const create = mutation({
  args: { beanId: v.id("beans"), ...logFields },
  returns: v.id("logs"),
  handler: async (ctx, { beanId, ...input }) =>
    await createLog(ctx, await requireUserId(ctx), beanId, input),
});

export const update = mutation({
  args: { logId: v.id("logs"), ...logFields },
  returns: v.null(),
  handler: async (ctx, { logId, ...input }) => {
    await updateLog(ctx, await requireUserId(ctx), logId, input);
    return null;
  },
});

export const remove = mutation({
  args: { logId: v.id("logs") },
  returns: v.null(),
  handler: async (ctx, { logId }) => {
    await removeLog(ctx, await requireUserId(ctx), logId);
    return null;
  },
});

export const get = query({
  args: { logId: v.string() },
  handler: async (ctx, args) => {
    const logId = ctx.db.normalizeId("logs", args.logId);
    if (!logId) return null;
    const log = await ctx.db.get("logs", logId);
    if (!log) return null;
    return await new Loader(ctx).log(log);
  },
});

/** A user's diary, newest brew date first. */
export const diary = query({
  args: { username: v.string(), paginationOpts: paginationOptsValidator },
  handler: async (ctx, { username, paginationOpts }) => {
    const userId = await getUserIdByUsername(ctx, username);
    if (userId === null) return { page: [], isDone: true, continueCursor: "" };
    const result = await ctx.db
      .query("logs")
      .withIndex("by_user_and_brewedOn", (q) => q.eq("userId", userId))
      .order("desc")
      .paginate(paginationOpts);
    return { ...result, page: await new Loader(ctx).logs(result.page) };
  },
});

/** The most recent diary entries of one user (profile page). */
export const recentForUser = query({
  args: { username: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { username, limit }) => {
    const userId = await getUserIdByUsername(ctx, username);
    if (userId === null) return [];
    const logs = await ctx.db
      .query("logs")
      .withIndex("by_user_and_brewedOn", (q) => q.eq("userId", userId))
      .order("desc")
      .take(Math.min(limit ?? 8, 40));
    return await new Loader(ctx).logs(logs);
  },
});

export const reviewsForUser = query({
  args: { username: v.string(), paginationOpts: paginationOptsValidator },
  handler: async (ctx, { username, paginationOpts }) => {
    const userId = await getUserIdByUsername(ctx, username);
    if (userId === null) return { page: [], isDone: true, continueCursor: "" };
    const result = await ctx.db
      .query("logs")
      .withIndex("by_user_and_hasReview", (q) => q.eq("userId", userId).eq("hasReview", true))
      .order("desc")
      .paginate(paginationOpts);
    return { ...result, page: await new Loader(ctx).logs(result.page) };
  },
});

export const reviewsForBean = query({
  args: { beanId: v.id("beans"), paginationOpts: paginationOptsValidator },
  handler: async (ctx, { beanId, paginationOpts }) => {
    const result = await ctx.db
      .query("logs")
      .withIndex("by_bean_and_hasReview", (q) => q.eq("beanId", beanId).eq("hasReview", true))
      .order("desc")
      .paginate(paginationOpts);
    return { ...result, page: await new Loader(ctx).logs(result.page) };
  },
});

export const recentReviews = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const logs = await ctx.db
      .query("logs")
      .withIndex("by_hasReview", (q) => q.eq("hasReview", true))
      .order("desc")
      .take(Math.min(limit ?? 6, 30));
    return await new Loader(ctx).logs(logs);
  },
});

/** The viewer's own diary entries for one bean. */
export const mineForBean = query({
  args: { beanId: v.id("beans") },
  handler: async (ctx, { beanId }) => {
    const userId = await optionalUserId(ctx);
    if (userId === null) return [];
    return await ctx.db
      .query("logs")
      .withIndex("by_user_and_bean_and_brewedOn", (q) =>
        q.eq("userId", userId).eq("beanId", beanId),
      )
      .order("desc")
      .take(50);
  },
});

/**
 * Recent diary entries from everyone the viewer follows, merged by time.
 * Bounded: reads the latest few entries of each followed account.
 */
export const friendsActivity = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const userId = await optionalUserId(ctx);
    if (userId === null) return [];
    const max = Math.min(limit ?? 30, 60);
    const follows = await ctx.db
      .query("follows")
      .withIndex("by_follower_and_followee", (q) => q.eq("followerId", userId))
      .take(200);
    const perUser = await Promise.all(
      follows.map((f) =>
        ctx.db
          .query("logs")
          .withIndex("by_user", (q) => q.eq("userId", f.followeeId))
          .order("desc")
          .take(10),
      ),
    );
    const merged = perUser
      .flat()
      .sort((a, b) => b._creationTime - a._creationTime)
      .slice(0, max);
    return await new Loader(ctx).logs(merged);
  },
});
