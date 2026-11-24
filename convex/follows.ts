import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query, type QueryCtx } from "./_generated/server";
import { optionalUserId, requireUserId } from "./lib/auth";
import { getUserIdByUsername, Loader } from "./lib/hydrate";

async function findFollow(ctx: QueryCtx, followerId: Id<"users">, followeeId: Id<"users">) {
  return await ctx.db
    .query("follows")
    .withIndex("by_follower_and_followee", (q) =>
      q.eq("followerId", followerId).eq("followeeId", followeeId),
    )
    .unique();
}

/** Whether the viewer follows this user. */
export const status = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const viewer = await optionalUserId(ctx);
    if (viewer === null) return { signedIn: false, self: false, following: false };
    if (viewer === userId) return { signedIn: true, self: true, following: false };
    return { signedIn: true, self: false, following: (await findFollow(ctx, viewer, userId)) !== null };
  },
});

export const setFollowing = mutation({
  args: { userId: v.id("users"), following: v.boolean() },
  returns: v.null(),
  handler: async (ctx, { userId, following }) => {
    const viewer = await requireUserId(ctx);
    if (viewer === userId) throw new ConvexError("You can't follow yourself.");
    const [me, them, existing] = await Promise.all([
      ctx.db.get("users", viewer),
      ctx.db.get("users", userId),
      findFollow(ctx, viewer, userId),
    ]);
    if (!me || !them) throw new ConvexError("That account doesn't exist.");
    if (following === (existing !== null)) return null;
    const delta = following ? 1 : -1;
    if (following) {
      await ctx.db.insert("follows", { followerId: viewer, followeeId: userId });
    } else if (existing) {
      await ctx.db.delete("follows", existing._id);
    }
    await ctx.db.patch("users", viewer, {
      stats: { ...me.stats, following: me.stats.following + delta },
    });
    await ctx.db.patch("users", userId, {
      stats: { ...them.stats, followers: them.stats.followers + delta },
    });
    return null;
  },
});

export const network = query({
  args: { username: v.string() },
  handler: async (ctx, { username }) => {
    const userId = await getUserIdByUsername(ctx, username);
    if (userId === null) return null;
    const [following, followers] = await Promise.all([
      ctx.db
        .query("follows")
        .withIndex("by_follower_and_followee", (q) => q.eq("followerId", userId))
        .order("desc")
        .take(200),
      ctx.db
        .query("follows")
        .withIndex("by_followee", (q) => q.eq("followeeId", userId))
        .order("desc")
        .take(200),
    ]);
    const loader = new Loader(ctx);
    const load = async (ids: Id<"users">[]) =>
      (await Promise.all(ids.map((id) => loader.profile(id)))).filter((p) => p !== null);
    return {
      following: await load(following.map((f) => f.followeeId)),
      followers: await load(followers.map((f) => f.followerId)),
    };
  },
});
