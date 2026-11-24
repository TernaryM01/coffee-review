/// <reference types="bun" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "bun:test";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { createLog, removeLog, updateLog } from "./logs";
import { emptyBeanAggregates, emptyStats, getUserBean, updateUserBean } from "./lib/userBeanState";
import schema from "./schema";

// convex-test wants Vite's import.meta.glob map; build the same thing with Bun.
const modules = Object.fromEntries(
  [...new Bun.Glob("**/*.ts").scanSync(import.meta.dir)].map((path) => [
    `./${path.replaceAll("\\", "/")}`,
    () => import(`./${path}`),
  ]),
);

const base = { brewedOn: "2026-11-01", liked: false, notes: [], rebrew: false };

async function setup(ctx: MutationCtx) {
  const a = await ctx.db.insert("users", { stats: emptyStats() });
  const b = await ctx.db.insert("users", { stats: emptyStats() });
  const roasterId = await ctx.db.insert("roasters", { name: "R", slug: "r", beanCount: 1 });
  const beanId = await ctx.db.insert("beans", {
    name: "Test bean",
    roasterId,
    roasterName: "R",
    origin: "Kenya",
    varieties: [],
    process: "Washed",
    roastLevel: "Light",
    roasterNotes: [],
    searchText: "Test bean R Kenya",
    ...emptyBeanAggregates(),
  });
  const bean = async () => (await ctx.db.get("beans", beanId))!;
  const stats = async (id: Id<"users">) => (await ctx.db.get("users", id))!.stats;
  return { a, b, beanId, bean, stats };
}

describe("bean aggregates", () => {
  test("wishlist, logging, ratings, and deletes stay consistent", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      const { a, b, beanId, bean, stats } = await setup(ctx);

      await updateUserBean(ctx, a, beanId, (s) => ({ ...s, wishlisted: true }));
      expect((await bean()).wishlistCount).toBe(1);

      // Logging rates, likes, and takes it off the wishlist.
      const log1 = await createLog(ctx, a, beanId, { ...base, rating: 4, liked: true, review: "Great" });
      let x = await bean();
      expect(x).toMatchObject({ wishlistCount: 0, brewerCount: 1, likeCount: 1, logCount: 1, ratingCount: 1, ratingAvg: 4 });
      expect(x.ratingHistogram[7]).toBe(1);
      expect(await stats(a)).toEqual({ ...emptyStats(), logs: 1, reviews: 1, beans: 1, likes: 1 });

      // Rating without a log still counts as brewed.
      await updateUserBean(ctx, b, beanId, (s) => ({ ...s, rating: 3.5 }));
      x = await bean();
      expect(x).toMatchObject({ brewerCount: 2, ratingCount: 2, ratingAvg: 3.75 });

      // A newer log's rating replaces the user's previous rating.
      const log2 = await createLog(ctx, a, beanId, { ...base, brewedOn: "2026-11-05", rating: 4.5 });
      x = await bean();
      expect(x).toMatchObject({ ratingCount: 2, ratingSum: 8, ratingAvg: 4 });
      expect([x.ratingHistogram[7], x.ratingHistogram[8]]).toEqual([0, 1]);
      expect(await getUserBean(ctx, a, beanId)).toMatchObject({ brewCount: 2, lastBrewedOn: "2026-11-05" });

      await updateLog(ctx, a, log1, { ...base, rating: 4.5, liked: true });
      expect((await stats(a)).reviews).toBe(0);

      // Deleting diary entries keeps the bean brewed and rated.
      await removeLog(ctx, a, log2);
      expect((await getUserBean(ctx, a, beanId))?.lastBrewedOn).toBe("2026-11-01");
      await removeLog(ctx, a, log1);
      expect(await getUserBean(ctx, a, beanId)).toMatchObject({ brewCount: 0, brewed: true, rating: 4.5 });
      expect((await bean()).logCount).toBe(0);

      // Un-brewing clears the rating and like, and removes the empty row.
      await updateUserBean(ctx, a, beanId, (s) => ({ ...s, brewed: false }));
      x = await bean();
      expect(x).toMatchObject({ brewerCount: 1, likeCount: 0, ratingCount: 1, ratingAvg: 3.5 });
      expect(await getUserBean(ctx, a, beanId)).toBeNull();
      expect(x.ratingHistogram.reduce((s, n) => s + n, 0)).toBe(x.ratingCount);
    });
  });

  test("can't un-brew a bean that has diary entries", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      const { a, beanId } = await setup(ctx);
      await createLog(ctx, a, beanId, base);
      await expect(
        updateUserBean(ctx, a, beanId, (s) => ({ ...s, brewed: false })),
      ).rejects.toThrow(/diary entries/);
    });
  });

  test("rejects invalid diary entries", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      const { a, beanId } = await setup(ctx);
      for (const bad of [{ rating: 4.3 }, { rating: 0 }, { brewedOn: "yesterday" }, { method: "Microwave" }]) {
        await expect(createLog(ctx, a, beanId, { ...base, ...bad })).rejects.toThrow();
      }
    });
  });
});
