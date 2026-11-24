import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { optionalUserId, requireUserId } from "./lib/auth";
import { isValidRating } from "./lib/constants";
import { getUserIdByUsername, Loader } from "./lib/hydrate";
import { getUserBean, updateUserBean } from "./lib/userBeanState";

/** The viewer's own state for one bean (null when signed out). */
export const mine = query({
  args: { beanId: v.id("beans") },
  handler: async (ctx, { beanId }) => {
    const userId = await optionalUserId(ctx);
    if (userId === null) return null;
    const row = await getUserBean(ctx, userId, beanId);
    return {
      brewed: row?.brewed ?? false,
      liked: row?.liked ?? false,
      wishlisted: row?.wishlisted ?? false,
      rating: row?.rating ?? null,
      brewCount: row?.brewCount ?? 0,
      lastBrewedOn: row?.lastBrewedOn ?? null,
    };
  },
});

/** Quick actions from the bean page: brewed / like / wishlist / rate. */
export const set = mutation({
  args: {
    beanId: v.id("beans"),
    brewed: v.optional(v.boolean()),
    liked: v.optional(v.boolean()),
    wishlisted: v.optional(v.boolean()),
    rating: v.optional(v.union(v.number(), v.null())),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    if (typeof args.rating === "number" && !isValidRating(args.rating)) {
      throw new ConvexError("Ratings go from half a star to five stars.");
    }
    await updateUserBean(ctx, userId, args.beanId, (s) => ({
      ...s,
      brewed: args.brewed ?? s.brewed,
      liked: args.liked ?? s.liked,
      wishlisted: args.wishlisted ?? s.wishlisted,
      rating: args.rating === undefined ? s.rating : (args.rating ?? undefined),
    }));
    return null;
  },
});

const kindValidator = v.union(v.literal("brewed"), v.literal("liked"), v.literal("wishlist"));

/** A user's brewed / liked / wishlisted beans, most recent first. */
export const forUser = query({
  args: { username: v.string(), kind: kindValidator, paginationOpts: paginationOptsValidator },
  handler: async (ctx, { username, kind, paginationOpts }) => {
    const userId = await getUserIdByUsername(ctx, username);
    if (userId === null) return { page: [], isDone: true, continueCursor: "" };
    const q =
      kind === "brewed"
        ? ctx.db
            .query("userBeans")
            .withIndex("by_user_and_brewed_and_updatedAt", (q) =>
              q.eq("userId", userId).eq("brewed", true),
            )
        : kind === "liked"
          ? ctx.db
              .query("userBeans")
              .withIndex("by_user_and_liked_and_updatedAt", (q) =>
                q.eq("userId", userId).eq("liked", true),
              )
          : ctx.db
              .query("userBeans")
              .withIndex("by_user_and_wishlisted_and_updatedAt", (q) =>
                q.eq("userId", userId).eq("wishlisted", true),
              );
    const result = await q.order("desc").paginate(paginationOpts);
    const loader = new Loader(ctx);
    const page = await Promise.all(
      result.page.map(async (row) => {
        const bean = await loader.bean(row.beanId);
        return bean && { bean, rating: row.rating ?? null, liked: row.liked };
      }),
    );
    return { ...result, page: page.filter((p) => p !== null) };
  },
});

/** Ratings from people the viewer follows, for the bean page. */
export const friendsForBean = query({
  args: { beanId: v.id("beans") },
  handler: async (ctx, { beanId }) => {
    const userId = await optionalUserId(ctx);
    if (userId === null) return [];
    const follows = await ctx.db
      .query("follows")
      .withIndex("by_follower_and_followee", (q) => q.eq("followerId", userId))
      .take(300);
    const loader = new Loader(ctx);
    const rows = await Promise.all(
      follows.map(async (f) => {
        const row = await getUserBean(ctx, f.followeeId, beanId);
        if (!row || !row.brewed) return null;
        const user = await loader.profile(f.followeeId);
        return user && { user, rating: row.rating ?? null, liked: row.liked };
      }),
    );
    return rows.filter((r) => r !== null);
  },
});
