/// <reference types="bun" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "bun:test";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { deleteBean } from "./beans";
import { createLog } from "./logs";
import { emptyBeanAggregates, emptyStats, updateUserBean } from "./lib/userBeanState";
import schema from "./schema";

// convex-test wants Vite's import.meta.glob map; build the same thing with Bun.
const modules = Object.fromEntries(
  [...new Bun.Glob("**/*.ts").scanSync(import.meta.dir)].map((path) => [
    `./${path.replaceAll("\\", "/")}`,
    () => import(`./${path}`),
  ]),
);

async function addBean(ctx: MutationCtx, roasterId: Id<"roasters">, name: string) {
  return await ctx.db.insert("beans", {
    name,
    roasterId,
    roasterName: "R",
    origin: "Kenya",
    varieties: [],
    process: "Washed",
    roastLevel: "Light",
    roasterNotes: [],
    searchText: name,
    ...emptyBeanAggregates(),
  });
}

describe("deleting a bean", () => {
  test("removes everything that points at it and keeps every counter right", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      const a = await ctx.db.insert("users", { stats: emptyStats() });
      const b = await ctx.db.insert("users", { stats: emptyStats() });
      const roasterId = await ctx.db.insert("roasters", { name: "R", slug: "r", beanCount: 2 });
      const doomed = await addBean(ctx, roasterId, "Doomed");
      const kept = await addBean(ctx, roasterId, "Kept");

      // a brews, rates, likes, and reviews both beans; b wishlists the doomed one.
      const base = { brewedOn: "2026-11-01", liked: true, notes: [], rebrew: false, rating: 4, review: "Nice" };
      await createLog(ctx, a, doomed, base);
      await createLog(ctx, a, doomed, { ...base, brewedOn: "2026-11-02" });
      await createLog(ctx, a, kept, base);
      await updateUserBean(ctx, b, doomed, (s) => ({ ...s, wishlisted: true }));

      // a's list holds both beans, doomed first.
      const listId = await ctx.db.insert("lists", {
        userId: a,
        title: "L",
        ranked: true,
        beanCount: 2,
        previewBeanIds: [doomed, kept],
        updatedAt: 0,
      });
      await ctx.db.insert("listItems", { listId, beanId: doomed, position: 1 });
      await ctx.db.insert("listItems", { listId, beanId: kept, position: 2 });

      await deleteBean(ctx, doomed);

      expect(await ctx.db.get("beans", doomed)).toBeNull();
      const leftovers = await Promise.all([
        ctx.db.query("logs").withIndex("by_bean_and_hasReview", (q) => q.eq("beanId", doomed)).collect(),
        ctx.db.query("userBeans").withIndex("by_bean", (q) => q.eq("beanId", doomed)).collect(),
        ctx.db.query("listItems").withIndex("by_bean", (q) => q.eq("beanId", doomed)).collect(),
      ]);
      expect(leftovers.map((rows) => rows.length)).toEqual([0, 0, 0]);

      // Only the kept bean's activity is left in the counters.
      expect((await ctx.db.get("users", a))!.stats).toEqual({
        ...emptyStats(),
        logs: 1,
        reviews: 1,
        beans: 1,
        likes: 1,
      });
      expect((await ctx.db.get("users", b))!.stats).toEqual(emptyStats());
      expect(await ctx.db.get("lists", listId)).toMatchObject({ beanCount: 1, previewBeanIds: [kept] });
      expect((await ctx.db.get("roasters", roasterId))!.beanCount).toBe(1);
      expect(await ctx.db.get("beans", kept)).toMatchObject({ logCount: 1, brewerCount: 1, ratingCount: 1 });
    });
  });
});
