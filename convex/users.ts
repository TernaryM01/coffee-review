import { vGoogleProfile, type GoogleProfile } from "@convex-dev/auth/methods/google/server";
import { ConvexError, v } from "convex/values";
import { components } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { internalMutation, mutation, query, type MutationCtx } from "./_generated/server";
import { optionalUserId, requireUserId } from "./lib/auth";
import { HANDLE_PATTERN, LIMITS } from "./lib/constants";
import { getUserIdByUsername, Loader, toProfile } from "./lib/hydrate";
import { emptyStats } from "./lib/userBeanState";
import { cleanText } from "./lib/validate";
import { assertImage } from "./files";
import { followStatus } from "./follows";

/**
 * Called by Convex Auth when someone signs in with Google for the first time.
 * Usernames (the public @handle in profile URLs) are stored in the authUsername
 * component; a new account gets one made from its Google name, which the user
 * can change in Settings.
 */
export const createUser = internalMutation({
  args: {
    method: v.object({ name: v.literal("google"), profile: vGoogleProfile }),
  },
  returns: v.id("users"),
  handler: async (ctx, { method }) => {
    const userId = await ctx.db.insert("users", {
      name: cleanText(method.profile.name?.slice(0, 60), 60, "Display name"),
      stats: emptyStats(),
    });
    await assignUsername(ctx, userId, method.profile);
    return userId;
  },
});

/** "Mauri Ericson" → "mauri_ericson": letters, digits and underscores, 2–20 long. */
function handleBase(profile: GoogleProfile): string {
  for (const source of [profile.name, profile.email?.split("@")[0]]) {
    const base = (source ?? "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "") // strip accents: "José" → "Jose"
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 20)
      .replace(/_+$/, "");
    if (base.length >= 2) return base;
  }
  return "brewer";
}

async function assignUsername(ctx: MutationCtx, userId: Id<"users">, profile: GoogleProfile) {
  const base = handleBase(profile);
  for (let attempt = 0; attempt < 20; attempt++) {
    // The first try is the bare name; later ones add 2, then 3, then 4 random digits.
    const digits = attempt === 0 ? 0 : Math.min(2 + Math.floor(attempt / 5), 4);
    const suffix = digits === 0 ? "" : String(Math.floor(Math.random() * 10 ** digits)).padStart(digits, "0");
    const result = await ctx.runMutation(components.authUsername.public.setUsername, {
      userId,
      username: base + suffix,
    });
    if (result.success) return;
  }
  throw new ConvexError("Couldn't pick a username for your account. Please try again.");
}

/** Change the signed-in user's @handle. Their old profile URL stops working. */
export const setUsername = mutation({
  args: { username: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await changeUsername(ctx, await requireUserId(ctx), args.username);
    return null;
  },
});

export async function changeUsername(ctx: MutationCtx, userId: Id<"users">, raw: string) {
  const username = raw.trim();
  if (!HANDLE_PATTERN.test(username)) {
    throw new ConvexError("Usernames are 2–24 letters, numbers, or underscores.");
  }
  const result = await ctx.runMutation(components.authUsername.public.setUsername, {
    userId,
    username,
  });
  if (!result.success) {
    throw new ConvexError(
      result.userError.error === "USERNAME_TAKEN"
        ? "That username is taken."
        : "Usernames are 2–24 letters, numbers, or underscores.",
    );
  }
}

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
      joinedAt: user._creationTime,
      isAdmin: user.isAdmin === true,
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
      isAdmin: user.isAdmin === true,
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
