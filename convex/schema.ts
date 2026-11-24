import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export const userStats = v.object({
  logs: v.number(),
  reviews: v.number(),
  beans: v.number(),
  likes: v.number(),
  wishlist: v.number(),
  lists: v.number(),
  followers: v.number(),
  following: v.number(),
});

export const recipe = v.object({
  doseG: v.optional(v.number()),
  yieldG: v.optional(v.number()),
  tempC: v.optional(v.number()),
  grind: v.optional(v.string()),
  time: v.optional(v.string()),
});

export default defineSchema({
  // Usernames and passkeys live in the Convex Auth components.
  users: defineTable({
    name: v.optional(v.string()),
    bio: v.optional(v.string()),
    location: v.optional(v.string()),
    avatarId: v.optional(v.id("_storage")),
    favoriteBeanIds: v.optional(v.array(v.id("beans"))),
    stats: userStats,
  }).index("by_followers", ["stats.followers"]),

  roasters: defineTable({
    name: v.string(),
    slug: v.string(),
    location: v.optional(v.string()),
    website: v.optional(v.string()),
    createdBy: v.optional(v.id("users")),
    beanCount: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_beanCount", ["beanCount"])
    .searchIndex("search_name", { searchField: "name" }),

  beans: defineTable({
    name: v.string(),
    roasterId: v.id("roasters"),
    roasterName: v.string(),
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
    createdBy: v.optional(v.id("users")),
    searchText: v.string(),
    // Aggregates, kept in sync by convex/lib/userBeanState.ts and logs.ts.
    logCount: v.number(),
    brewerCount: v.number(),
    likeCount: v.number(),
    wishlistCount: v.number(),
    ratingCount: v.number(),
    ratingSum: v.number(),
    ratingAvg: v.number(),
    ratingHistogram: v.array(v.number()),
  })
    .index("by_roaster", ["roasterId"])
    .index("by_brewerCount", ["brewerCount"])
    .index("by_ratingAvg", ["ratingAvg"])
    .searchIndex("search_text", {
      searchField: "searchText",
      filterFields: ["origin", "process", "roastLevel"],
    }),

  // One row per (user, bean): the Letterboxd-style "watched / liked /
  // watchlist / rating" state, independent of individual diary entries.
  userBeans: defineTable({
    userId: v.id("users"),
    beanId: v.id("beans"),
    brewed: v.boolean(),
    liked: v.boolean(),
    wishlisted: v.boolean(),
    rating: v.optional(v.number()),
    brewCount: v.number(),
    lastBrewedOn: v.optional(v.string()),
    updatedAt: v.number(),
  })
    .index("by_user_and_bean", ["userId", "beanId"])
    .index("by_user_and_brewed_and_updatedAt", ["userId", "brewed", "updatedAt"])
    .index("by_user_and_liked_and_updatedAt", ["userId", "liked", "updatedAt"])
    .index("by_user_and_wishlisted_and_updatedAt", [
      "userId",
      "wishlisted",
      "updatedAt",
    ]),

  // Diary entries. A log with review text is a review.
  logs: defineTable({
    userId: v.id("users"),
    beanId: v.id("beans"),
    brewedOn: v.string(), // YYYY-MM-DD, in the user's own calendar
    rating: v.optional(v.number()),
    liked: v.boolean(),
    review: v.optional(v.string()),
    hasReview: v.boolean(),
    method: v.optional(v.string()),
    notes: v.array(v.string()),
    rebrew: v.boolean(),
    recipe: v.optional(recipe),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_brewedOn", ["userId", "brewedOn"])
    .index("by_user_and_hasReview", ["userId", "hasReview"])
    .index("by_user_and_bean_and_brewedOn", ["userId", "beanId", "brewedOn"])
    .index("by_bean", ["beanId"])
    .index("by_bean_and_hasReview", ["beanId", "hasReview"])
    .index("by_hasReview", ["hasReview"]),

  follows: defineTable({
    followerId: v.id("users"),
    followeeId: v.id("users"),
  })
    .index("by_follower_and_followee", ["followerId", "followeeId"])
    .index("by_followee", ["followeeId"]),

  lists: defineTable({
    userId: v.id("users"),
    title: v.string(),
    description: v.optional(v.string()),
    ranked: v.boolean(),
    beanCount: v.number(),
    previewBeanIds: v.array(v.id("beans")),
    updatedAt: v.number(),
  })
    .index("by_user_and_updatedAt", ["userId", "updatedAt"])
    .index("by_updatedAt", ["updatedAt"]),

  listItems: defineTable({
    listId: v.id("lists"),
    beanId: v.id("beans"),
    position: v.number(),
    note: v.optional(v.string()),
  })
    .index("by_list_and_position", ["listId", "position"])
    .index("by_list_and_bean", ["listId", "beanId"])
    .index("by_bean", ["beanId"]),
});
