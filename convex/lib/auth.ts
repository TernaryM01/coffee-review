import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import type { Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";

export async function optionalUserId(ctx: QueryCtx): Promise<Id<"users"> | null> {
  return await getAuthUserId(ctx);
}

export async function isAdmin(ctx: QueryCtx, userId: Id<"users">): Promise<boolean> {
  return (await ctx.db.get("users", userId))?.isAdmin === true;
}

export async function requireAdmin(ctx: QueryCtx): Promise<Id<"users">> {
  const userId = await requireUserId(ctx);
  if (!(await isAdmin(ctx, userId))) throw new ConvexError("Only admins can do that.");
  return userId;
}

export async function requireUserId(ctx: QueryCtx): Promise<Id<"users">> {
  const userId = await getAuthUserId(ctx);
  if (userId === null) {
    throw new ConvexError("You need to be signed in to do that.");
  }
  return userId;
}
