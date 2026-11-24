import { ConvexError, v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { optionalUserId, requireUserId } from "./lib/auth";
import { LIMITS } from "./lib/constants";
import { getUserIdByUsername, Loader, toProfile } from "./lib/hydrate";
import { emptyStats } from "./lib/userBeanState";
import { cleanText } from "./lib/validate";
import { assertImage } from "./files";
import { followStatus } from "./follows";

/** Called by Convex Auth when a new account signs up. */
export const createUser = internalMutation({
  args: {
    method: v.object({ name: v.literal("usernamePasskey"), profile: v.object({}) }),
  },
  returns: v.id("users"),
  handler: async (ctx) => {
    return await ctx.db.insert("users", { stats: emptyStats() });
  },
});

/** The signed-in user, or null. */
export const me = query({
  args: {},
  handler: async (ctx) => {
    const userId = await optionalUserId(ctx);
    if (userId === null) return null;
    const user = await ctx.db.get("users", userId);
    if (!user) return null;
    const loader = new Loader(ctx);
    const favorites = await Promise.all(
      (user.favoriteBeanIds ?? []).map((id) => loader.bean(id)),
    );
    return {
      ...(await toProfile(ctx, user)),
      bio: user.bio ?? null,
      location: user.location ?? null,
      stats: user.stats,
      favorites: favorites.filter((b) => b !== null),
    };
  },
});

export const byUsername = query({
  args: { username: v.string() },
  handler: async (ctx, { username }) => {
    const userId = await getUserIdByUsername(ctx, username);
    if (userId === null) return null;
    const user = await ctx.db.get("users", userId);
    if (!user) return null;
    const loader = new Loader(ctx);
    const favorites = await Promise.all(
      (user.favoriteBeanIds ?? []).map((id) => loader.bean(id)),
    );
    return {
      ...(await toProfile(ctx, user)),
      bio: user.bio ?? null,
      location: user.location ?? null,
      stats: user.stats,
      joinedAt: user._creationTime,
      favorites: favorites.filter((b) => b !== null),
    };
  },
});

export const popular = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").withIndex("by_followers").order("desc").take(12);
    const viewer = await optionalUserId(ctx);
    return await Promise.all(
      users.map(async (u) => ({
        ...(await toProfile(ctx, u)),
        stats: u.stats,
        followStatus: await followStatus(ctx, viewer, u._id),
      })),
    );
  },
});

export const updateProfile = mutation({
  args: {
    name: v.optional(v.string()),
    bio: v.optional(v.string()),
    location: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    await ctx.db.patch("users", userId, {
      name: cleanText(args.name, 60, "Display name"),
      bio: cleanText(args.bio, LIMITS.bioMax, "Bio"),
      location: cleanText(args.location, 60, "Location"),
    });
    return null;
  },
});

export const setAvatar = mutation({
  args: { storageId: v.union(v.id("_storage"), v.null()) },
  returns: v.null(),
  handler: async (ctx, { storageId }) => {
    const userId = await requireUserId(ctx);
    const user = await ctx.db.get("users", userId);
    if (!user) throw new ConvexError("Your account wasn't found.");
    if (storageId) await assertImage(ctx, storageId);
    if (user.avatarId && user.avatarId !== storageId) {
      await ctx.storage.delete(user.avatarId);
    }
    await ctx.db.patch("users", userId, { avatarId: storageId ?? undefined });
    return null;
  },
});

export const setFavorites = mutation({
  args: { beanIds: v.array(v.id("beans")) },
  returns: v.null(),
  handler: async (ctx, { beanIds }) => {
    const userId = await requireUserId(ctx);
    const unique = [...new Set(beanIds)];
    if (unique.length > LIMITS.favoritesMax) {
      throw new ConvexError(`Pick at most ${LIMITS.favoritesMax} favorites.`);
    }
    for (const id of unique) {
      if (!(await ctx.db.get("beans", id))) throw new ConvexError("That bean doesn't exist.");
    }
    await ctx.db.patch("users", userId, { favoriteBeanIds: unique });
    return null;
  },
});
