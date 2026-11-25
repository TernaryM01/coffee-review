import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx } from "./_generated/server";
import { optionalUserId, requireUserId } from "./lib/auth";
import { LIMITS } from "./lib/constants";
import { getUserIdByUsername, Loader } from "./lib/hydrate";
import { cleanText, requireText } from "./lib/validate";

async function ownList(ctx: MutationCtx, listId: Id<"lists">) {
  const userId = await requireUserId(ctx);
  const list = await ctx.db.get("lists", listId);
  if (!list || list.userId !== userId) throw new ConvexError("That list isn't yours.");
  return list;
}

async function itemsOf(ctx: MutationCtx, listId: Id<"lists">) {
  return await ctx.db
    .query("listItems")
    .withIndex("by_list_and_position", (q) => q.eq("listId", listId))
    .take(LIMITS.listItemsMax + 1);
}

/** Recompute a list's bean count and preview after its items change. */
export async function refresh(ctx: MutationCtx, listId: Id<"lists">) {
  const items = await itemsOf(ctx, listId);
  await ctx.db.patch("lists", listId, {
    beanCount: items.length,
    previewBeanIds: items.slice(0, 5).map((i) => i.beanId),
    updatedAt: Date.now(),
  });
}

async function withPreview(loader: Loader, list: Doc<"lists">) {
  const [owner, preview] = await Promise.all([
    loader.profile(list.userId),
    Promise.all(list.previewBeanIds.map((id) => loader.bean(id))),
  ]);
  return { ...list, owner, preview: preview.filter((b) => b !== null) };
}

export const create = mutation({
  args: { title: v.string(), description: v.optional(v.string()), ranked: v.boolean() },
  returns: v.id("lists"),
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const user = await ctx.db.get("users", userId);
    if (!user) throw new ConvexError("Your account wasn't found.");
    const listId = await ctx.db.insert("lists", {
      userId,
      title: requireText(args.title, LIMITS.listTitleMax, "Title"),
      description: cleanText(args.description, LIMITS.descriptionMax, "Description"),
      ranked: args.ranked,
      beanCount: 0,
      previewBeanIds: [],
      updatedAt: Date.now(),
    });
    await ctx.db.patch("users", userId, { stats: { ...user.stats, lists: user.stats.lists + 1 } });
    return listId;
  },
});

export const update = mutation({
  args: {
    listId: v.id("lists"),
    title: v.string(),
    description: v.optional(v.string()),
    ranked: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ownList(ctx, args.listId);
    await ctx.db.patch("lists", args.listId, {
      title: requireText(args.title, LIMITS.listTitleMax, "Title"),
      description: cleanText(args.description, LIMITS.descriptionMax, "Description"),
      ranked: args.ranked,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const remove = mutation({
  args: { listId: v.id("lists") },
  returns: v.null(),
  handler: async (ctx, { listId }) => {
    const list = await ownList(ctx, listId);
    for (const item of await itemsOf(ctx, listId)) await ctx.db.delete("listItems", item._id);
    await ctx.db.delete("lists", listId);
    const user = await ctx.db.get("users", list.userId);
    if (user) {
      await ctx.db.patch("users", user._id, {
        stats: { ...user.stats, lists: Math.max(0, user.stats.lists - 1) },
      });
    }
    return null;
  },
});

export const addBean = mutation({
  args: { listId: v.id("lists"), beanId: v.id("beans"), note: v.optional(v.string()) },
  returns: v.null(),
  handler: async (ctx, { listId, beanId, note }) => {
    await ownList(ctx, listId);
    if (!(await ctx.db.get("beans", beanId))) throw new ConvexError("That bean doesn't exist.");
    const existing = await ctx.db
      .query("listItems")
      .withIndex("by_list_and_bean", (q) => q.eq("listId", listId).eq("beanId", beanId))
      .first();
    if (existing) return null;
    const items = await itemsOf(ctx, listId);
    if (items.length >= LIMITS.listItemsMax) {
      throw new ConvexError(`Lists can hold up to ${LIMITS.listItemsMax} beans.`);
    }
    const last = items[items.length - 1];
    await ctx.db.insert("listItems", {
      listId,
      beanId,
      position: last ? last.position + 1 : 0,
      note: cleanText(note, 500, "Note"),
    });
    await refresh(ctx, listId);
    return null;
  },
});

export const removeBean = mutation({
  args: { listId: v.id("lists"), beanId: v.id("beans") },
  returns: v.null(),
  handler: async (ctx, { listId, beanId }) => {
    await ownList(ctx, listId);
    const item = await ctx.db
      .query("listItems")
      .withIndex("by_list_and_bean", (q) => q.eq("listId", listId).eq("beanId", beanId))
      .first();
    if (item) await ctx.db.delete("listItems", item._id);
    await refresh(ctx, listId);
    return null;
  },
});

export const move = mutation({
  args: {
    listId: v.id("lists"),
    beanId: v.id("beans"),
    direction: v.union(v.literal("up"), v.literal("down")),
  },
  returns: v.null(),
  handler: async (ctx, { listId, beanId, direction }) => {
    await ownList(ctx, listId);
    const items = await itemsOf(ctx, listId);
    const i = items.findIndex((it) => it.beanId === beanId);
    const j = direction === "up" ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= items.length) return null;
    await ctx.db.patch("listItems", items[i]._id, { position: items[j].position });
    await ctx.db.patch("listItems", items[j]._id, { position: items[i].position });
    await refresh(ctx, listId);
    return null;
  },
});

export const get = query({
  args: { listId: v.string() },
  handler: async (ctx, args) => {
    const listId = ctx.db.normalizeId("lists", args.listId);
    if (!listId) return null;
    const list = await ctx.db.get("lists", listId);
    if (!list) return null;
    const loader = new Loader(ctx);
    const items = await ctx.db
      .query("listItems")
      .withIndex("by_list_and_position", (q) => q.eq("listId", listId))
      .take(LIMITS.listItemsMax);
    const beans = await Promise.all(
      items.map(async (item) => {
        const bean = await loader.bean(item.beanId);
        return bean && { bean, note: item.note ?? null };
      }),
    );
    return {
      ...list,
      owner: await loader.profile(list.userId),
      items: beans.filter((b) => b !== null),
    };
  },
});

export const forUser = query({
  args: { username: v.string() },
  handler: async (ctx, { username }) => {
    const userId = await getUserIdByUsername(ctx, username);
    if (userId === null) return [];
    const lists = await ctx.db
      .query("lists")
      .withIndex("by_user_and_updatedAt", (q) => q.eq("userId", userId))
      .order("desc")
      .take(60);
    const loader = new Loader(ctx);
    return await Promise.all(lists.map((l) => withPreview(loader, l)));
  },
});

export const recent = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    // Skip empty lists, scanning a bounded number of recent ones.
    const max = Math.min(limit ?? 12, 48);
    const lists: Doc<"lists">[] = [];
    const recent = await ctx.db.query("lists").withIndex("by_updatedAt").order("desc").take(max * 5);
    for (const l of recent) {
      if (l.beanCount > 0) lists.push(l);
      if (lists.length >= max) break;
    }
    const loader = new Loader(ctx);
    return await Promise.all(lists.map((l) => withPreview(loader, l)));
  },
});

export const containingBean = query({
  args: { beanId: v.id("beans") },
  handler: async (ctx, { beanId }) => {
    const items = await ctx.db
      .query("listItems")
      .withIndex("by_bean", (q) => q.eq("beanId", beanId))
      .order("desc")
      .take(6);
    const loader = new Loader(ctx);
    const lists = await Promise.all(items.map((i) => ctx.db.get("lists", i.listId)));
    return await Promise.all(
      lists.filter((l) => l !== null).map((l) => withPreview(loader, l)),
    );
  },
});

/** The viewer's lists, flagged with whether each already holds this bean. */
export const mineWithBean = query({
  args: { beanId: v.id("beans") },
  handler: async (ctx, { beanId }) => {
    const userId = await optionalUserId(ctx);
    if (userId === null) return [];
    const lists = await ctx.db
      .query("lists")
      .withIndex("by_user_and_updatedAt", (q) => q.eq("userId", userId))
      .order("desc")
      .take(100);
    return await Promise.all(
      lists.map(async (l) => ({
        _id: l._id,
        title: l.title,
        beanCount: l.beanCount,
        contains:
          (await ctx.db
            .query("listItems")
            .withIndex("by_list_and_bean", (q) => q.eq("listId", l._id).eq("beanId", beanId))
            .first()) !== null,
      })),
    );
  },
});
