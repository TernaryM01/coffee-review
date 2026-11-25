/// <reference types="bun" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { api, components, internal } from "./_generated/api";
import schema from "./schema";
import { changeUsername } from "./users";
import { setRoleAs } from "./admin";

// convex-test wants Vite's import.meta.glob map; build the same thing with Bun.
function globModules(dir: string, prefix: string) {
  return Object.fromEntries(
    [...new Bun.Glob("**/*.ts").scanSync(dir)].map((path) => [
      `${prefix}/${path.replaceAll("\\", "/")}`,
      () => import(join(dir, path)),
    ]),
  );
}

const modules = globModules(import.meta.dir, ".");
const usernameDir = join(import.meta.dir, "../node_modules/@convex-dev/auth/src/components/username");

async function setup() {
  const t = convexTest(schema, modules);
  const { default: usernameSchema } = await import(join(usernameDir, "schema.ts"));
  t.registerComponent("authUsername", usernameSchema, globModules(usernameDir, "./username"));
  return t;
}

const google = (profile: { name?: string; email?: string }) => ({
  method: { name: "google" as const, profile: { id: crypto.randomUUID(), emailVerified: true, ...profile } },
});

describe("Google sign-up", () => {
  test("gets a username from the Google name, unique and URL-safe", async () => {
    const t = await setup();
    const first = await t.mutation(internal.users.createUser, google({ name: "José Müller-Ortiz" }));
    const second = await t.mutation(internal.users.createUser, google({ name: "José Müller-Ortiz" }));
    const fromEmail = await t.mutation(internal.users.createUser, google({ email: "pour.over@example.com" }));
    const nothing = await t.mutation(internal.users.createUser, google({ name: "李" }));

    await t.run(async (ctx) => {
      const username = (userId: string) =>
        ctx.runQuery(components.authUsername.public.getUsername, { userId });
      expect(await username(first)).toBe("jose_muller_ortiz");
      expect(await username(second)).toMatch(/^jose_muller_ortiz\d{2}$/);
      expect(await username(fromEmail)).toBe("pour_over");
      expect(await username(nothing)).toBe("brewer");
      expect((await ctx.db.get("users", first))?.name).toBe("José Müller-Ortiz");
    });
  });

  test("admin:setAdmin grants and revokes admin by username", async () => {
    const t = await setup();
    const a = await t.mutation(internal.users.createUser, google({ name: "Alice" }));
    const isAdmin = () => t.run(async (ctx) => (await ctx.db.get("users", a))?.isAdmin === true);

    expect(await t.mutation(internal.admin.setAdmin, { username: "@Alice" })).toBe("@Alice is now an admin.");
    expect(await isAdmin()).toBe(true);
    await t.mutation(internal.admin.setAdmin, { username: "alice", admin: false });
    expect(await isAdmin()).toBe(false);
    await expect(t.mutation(internal.admin.setAdmin, { username: "nobody" })).rejects.toThrow("No user");
  });

  test("admins can grant and remove admin for others, but not change their own role", async () => {
    const t = await setup();
    const boss = await t.mutation(internal.users.createUser, google({ name: "Boss" }));
    const b = await t.mutation(internal.users.createUser, google({ name: "Bea" }));
    const c = await t.mutation(internal.users.createUser, google({ name: "Cal" }));
    await t.mutation(internal.admin.setAdmin, { username: "boss" });
    const admins = () =>
      t.run(async (ctx) =>
        (await Promise.all([boss, b, c].map((id) => ctx.db.get("users", id)))).map((u) => u?.isAdmin === true),
      );

    await t.run(async (ctx) => {
      // A non-admin can't grant anything.
      await expect(setRoleAs(ctx, b, c, true)).rejects.toThrow("Only admins");
      await setRoleAs(ctx, boss, b, true);
      // The new admin can manage others, including the first admin...
      await setRoleAs(ctx, b, c, true);
      await setRoleAs(ctx, b, c, false);
      // ...but nobody can change their own role.
      await expect(setRoleAs(ctx, b, b, false)).rejects.toThrow("your own");
    });
    expect(await admins()).toEqual([true, true, false]);

    await t.run((ctx) => setRoleAs(ctx, b, boss, false));
    expect(await admins()).toEqual([false, true, false]);
  });

  test("users can change their username, but not to a taken or invalid one", async () => {
    const t = await setup();
    const a = await t.mutation(internal.users.createUser, google({ name: "Alice" }));
    await t.mutation(internal.users.createUser, google({ name: "Bob" }));

    await t.run(async (ctx) => {
      await expect(changeUsername(ctx, a, "BOB")).rejects.toThrow("taken");
      await expect(changeUsername(ctx, a, "no spaces")).rejects.toThrow("letters");
      await changeUsername(ctx, a, " alice_brews ");
    });
    expect((await t.query(api.users.byUsername, { username: "alice_brews" }))?._id).toBe(a);
    expect(await t.query(api.users.byUsername, { username: "alice" })).toBeNull();
  });
});
