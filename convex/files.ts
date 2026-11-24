import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, type MutationCtx } from "./_generated/server";
import { requireUserId } from "./lib/auth";

export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    await requireUserId(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** Reject non-images and oversized files; deletes the upload if rejected. */
export async function assertImage(ctx: MutationCtx, storageId: Id<"_storage">) {
  const meta = await ctx.db.system.get("_storage", storageId);
  if (!meta) throw new ConvexError("Upload not found. Please try again.");
  const ok = meta.contentType?.startsWith("image/") && meta.size <= MAX_IMAGE_BYTES;
  if (!ok) {
    await ctx.storage.delete(storageId);
    throw new ConvexError("Images must be JPG, PNG, WebP or GIF and under 5 MB.");
  }
}
