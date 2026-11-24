import { ConvexError } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { ratingBucket } from "./constants";

export type UserBeanState = {
  brewed: boolean;
  liked: boolean;
  wishlisted: boolean;
  rating: number | undefined;
  brewCount: number;
  lastBrewedOn: string | undefined;
};

const EMPTY: UserBeanState = {
  brewed: false,
  liked: false,
  wishlisted: false,
  rating: undefined,
  brewCount: 0,
  lastBrewedOn: undefined,
};

export async function getUserBean(
  ctx: QueryCtx,
  userId: Id<"users">,
  beanId: Id<"beans">,
): Promise<Doc<"userBeans"> | null> {
  return await ctx.db
    .query("userBeans")
    .withIndex("by_user_and_bean", (q) => q.eq("userId", userId).eq("beanId", beanId))
    .unique();
}

function toState(row: Doc<"userBeans"> | null): UserBeanState {
  if (!row) return { ...EMPTY };
  return {
    brewed: row.brewed,
    liked: row.liked,
    wishlisted: row.wishlisted,
    rating: row.rating,
    brewCount: row.brewCount,
    lastBrewedOn: row.lastBrewedOn,
  };
}

/** Enforce the invariants between the flags (mirrors Letterboxd's rules). */
function normalize(prev: UserBeanState, next: UserBeanState): UserBeanState {
  const out = { ...next };
  if (out.brewCount < 0) out.brewCount = 0;
  // Explicitly un-brewing clears what depends on it. Handle this first, so
  // the "rating implies brewed" rule below doesn't undo it.
  if (prev.brewed && !out.brewed) {
    if (out.brewCount > 0) {
      throw new ConvexError(
        "This bean has diary entries. Delete them first to mark it as not brewed.",
      );
    }
    out.rating = undefined;
    out.liked = false;
  }
  // Rating, liking, or logging a bean means you've brewed it.
  if (out.rating !== undefined || out.liked || out.brewCount > 0) out.brewed = true;
  // Brewing something takes it off your wishlist.
  if (!prev.brewed && out.brewed) out.wishlisted = false;
  return out;
}

const n = (b: boolean) => (b ? 1 : 0);

/**
 * The only way to change a user's state for a bean. Keeps the userBeans row,
 * the bean's aggregates, and the user's stats consistent in one transaction.
 */
export async function updateUserBean(
  ctx: MutationCtx,
  userId: Id<"users">,
  beanId: Id<"beans">,
  change: (state: UserBeanState) => UserBeanState,
): Promise<UserBeanState> {
  const [bean, user, row] = await Promise.all([
    ctx.db.get("beans", beanId),
    ctx.db.get("users", userId),
    getUserBean(ctx, userId, beanId),
  ]);
  if (!bean) throw new ConvexError("That bean doesn't exist.");
  if (!user) throw new ConvexError("Your account wasn't found.");

  const prev = toState(row);
  const next = normalize(prev, change({ ...prev }));

  // Row
  const isEmpty =
    !next.brewed && !next.liked && !next.wishlisted && next.rating === undefined && next.brewCount === 0;
  if (row) {
    if (isEmpty) {
      await ctx.db.delete("userBeans", row._id);
    } else {
      await ctx.db.replace("userBeans", row._id, {
        userId,
        beanId,
        ...next,
        updatedAt: Date.now(),
      });
    }
  } else if (!isEmpty) {
    await ctx.db.insert("userBeans", { userId, beanId, ...next, updatedAt: Date.now() });
  }

  // Bean aggregates
  const histogram = [...bean.ratingHistogram];
  let ratingSum = bean.ratingSum;
  let ratingCount = bean.ratingCount;
  if (prev.rating !== next.rating) {
    if (prev.rating !== undefined) {
      histogram[ratingBucket(prev.rating)] -= 1;
      ratingSum -= prev.rating;
      ratingCount -= 1;
    }
    if (next.rating !== undefined) {
      histogram[ratingBucket(next.rating)] += 1;
      ratingSum += next.rating;
      ratingCount += 1;
    }
  }
  await ctx.db.patch("beans", beanId, {
    brewerCount: bean.brewerCount + n(next.brewed) - n(prev.brewed),
    likeCount: bean.likeCount + n(next.liked) - n(prev.liked),
    wishlistCount: bean.wishlistCount + n(next.wishlisted) - n(prev.wishlisted),
    ratingHistogram: histogram,
    ratingSum,
    ratingCount,
    ratingAvg: ratingCount > 0 ? Math.round((ratingSum / ratingCount) * 100) / 100 : 0,
  });

  // User stats
  await ctx.db.patch("users", userId, {
    stats: {
      ...user.stats,
      beans: user.stats.beans + n(next.brewed) - n(prev.brewed),
      likes: user.stats.likes + n(next.liked) - n(prev.liked),
      wishlist: user.stats.wishlist + n(next.wishlisted) - n(prev.wishlisted),
    },
  });

  return next;
}

export function emptyStats(): Doc<"users">["stats"] {
  return {
    logs: 0,
    reviews: 0,
    beans: 0,
    likes: 0,
    wishlist: 0,
    lists: 0,
    followers: 0,
    following: 0,
  };
}

export function emptyBeanAggregates() {
  return {
    logCount: 0,
    brewerCount: 0,
    likeCount: 0,
    wishlistCount: 0,
    ratingCount: 0,
    ratingSum: 0,
    ratingAvg: 0,
    ratingHistogram: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  };
}
