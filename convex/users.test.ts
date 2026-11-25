/// <reference types="bun" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { api, components, internal } from "./_generated/api";
import schema from "./schema";
import { changeUsername } from "./users";

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
