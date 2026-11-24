import { components } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";

export type Profile = {
  _id: Id<"users">;
  username: string;
  name: string | null;
  avatarUrl: string | null;
};

export type BeanCard = {
  _id: Id<"beans">;
  name: string;
  roasterId: Id<"roasters">;
  roasterName: string;
  origin: string;
  process: string;
  roastLevel: string;
  imageUrl: string | null;
  ratingAvg: number;
  ratingCount: number;
  brewerCount: number;
};

export async function getUsername(ctx: QueryCtx, userId: Id<"users">): Promise<string> {
  const username = await ctx.runQuery(components.authUsername.public.getUsername, {
    userId,
  });
  return username ?? "unknown";
}

export async function getUserIdByUsername(
  ctx: QueryCtx,
  username: string,
): Promise<Id<"users"> | null> {
  const raw = await ctx.runQuery(components.authUsername.public.getUserIdByUsername, {
    username,
  });
  return raw === null ? null : ctx.db.normalizeId("users", raw);
}

export async function toProfile(ctx: QueryCtx, user: Doc<"users">): Promise<Profile> {
  return {
    _id: user._id,
    username: await getUsername(ctx, user._id),
    name: user.name ?? null,
    avatarUrl: user.avatarId ? await ctx.storage.getUrl(user.avatarId) : null,
  };
}

export function toBeanCard(bean: Doc<"beans">, imageUrl: string | null): BeanCard {
  return {
    _id: bean._id,
    name: bean.name,
    roasterId: bean.roasterId,
    roasterName: bean.roasterName,
    origin: bean.origin,
    process: bean.process,
    roastLevel: bean.roastLevel,
    imageUrl,
    ratingAvg: bean.ratingAvg,
    ratingCount: bean.ratingCount,
    brewerCount: bean.brewerCount,
  };
}

/**
 * Memoizing loader for one query invocation, so pages that show the same
 * user or bean many times only look each one up once.
 */
export class Loader {
  private profiles = new Map<Id<"users">, Promise<Profile | null>>();
  private beans = new Map<Id<"beans">, Promise<BeanCard | null>>();

  constructor(private ctx: QueryCtx) {}

  profile(userId: Id<"users">): Promise<Profile | null> {
    let p = this.profiles.get(userId);
    if (!p) {
      p = (async () => {
        const user = await this.ctx.db.get("users", userId);
        return user ? await toProfile(this.ctx, user) : null;
      })();
      this.profiles.set(userId, p);
    }
    return p;
  }

  bean(beanId: Id<"beans">): Promise<BeanCard | null> {
    let p = this.beans.get(beanId);
    if (!p) {
      p = (async () => {
        const bean = await this.ctx.db.get("beans", beanId);
        if (!bean) return null;
        const url = bean.imageId ? await this.ctx.storage.getUrl(bean.imageId) : null;
        return toBeanCard(bean, url);
      })();
      this.beans.set(beanId, p);
    }
    return p;
  }

  async beanCards(beans: Doc<"beans">[]): Promise<BeanCard[]> {
    return await Promise.all(
      beans.map(async (bean) => {
        const url = bean.imageId ? await this.ctx.storage.getUrl(bean.imageId) : null;
        return toBeanCard(bean, url);
      }),
    );
  }

  /** Hydrate a diary entry with its author and bean. */
  async log(log: Doc<"logs">) {
    const [user, bean] = await Promise.all([this.profile(log.userId), this.bean(log.beanId)]);
    if (!user || !bean) return null;
    return { ...log, user, bean };
  }

  async logs(logs: Doc<"logs">[]) {
    const out = await Promise.all(logs.map((l) => this.log(l)));
    return out.filter((l): l is NonNullable<typeof l> => l !== null);
  }
}

export type HydratedLog = NonNullable<Awaited<ReturnType<Loader["log"]>>>;
