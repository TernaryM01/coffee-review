import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { internalMutation, mutation, type MutationCtx } from "./_generated/server";
import { isAdmin, requireUserId } from "./lib/auth";
import { getUserIdByUsername } from "./lib/hydrate";

async function setRole(ctx: MutationCtx, userId: Id<"users">, admin: boolean) {
  if (!(await ctx.db.get("users", userId))) throw new ConvexError("That account doesn't exist.");
  await ctx.db.patch("users", userId, { isAdmin: admin ? true : undefined });
}

/**
 * Make a user an admin, or take it away, from a terminal (or the Convex
 * dashboard's Functions page). This is how the first admin is made:
 *
 *   bunx convex run admin:setAdmin '{"username": "your_username"}'
 *   bunx convex run admin:setAdmin '{"username": "your_username", "admin": false}'
 *
 * Add --prod for the production deployment. Internal, so the website can't call it.
 */
export const setAdmin = internalMutation({
  args: { username: v.string(), admin: v.optional(v.boolean()) },
  returns: v.string(),
  handler: async (ctx, args) => {
    const username = args.username.trim().replace(/^@/, "");
    const admin = args.admin ?? true;
    const userId = await getUserIdByUsername(ctx, username);
    if (userId === null) throw new ConvexError(`No user is called "@${username}".`);
    await setRole(ctx, userId, admin);
    return admin ? `@${username} is now an admin.` : `@${username} is no longer an admin.`;
  },
});

/**
 * Admins only, from the website: make another account an admin, or take it
 * away. Your own role can't be changed here, so there's always an admin left.
 */
export const setRoleOf = mutation({
  args: { userId: v.id("users"), admin: v.boolean() },
  returns: v.null(),
  handler: async (ctx, { userId, admin }) => {
    await setRoleAs(ctx, await requireUserId(ctx), userId, admin);
    return null;
  },
});

export async function setRoleAs(
  ctx: MutationCtx,
  actorId: Id<"users">,
  userId: Id<"users">,
  admin: boolean,
) {
  if (!(await isAdmin(ctx, actorId))) throw new ConvexError("Only admins can do that.");
  if (userId === actorId) throw new ConvexError("You can't change your own admin role.");
  await setRole(ctx, userId, admin);
}
