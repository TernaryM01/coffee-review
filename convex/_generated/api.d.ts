/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as beans from "../beans.js";
import type * as files from "../files.js";
import type * as follows from "../follows.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_constants from "../lib/constants.js";
import type * as lib_hydrate from "../lib/hydrate.js";
import type * as lib_userBeanState from "../lib/userBeanState.js";
import type * as lib_validate from "../lib/validate.js";
import type * as lists from "../lists.js";
import type * as logs from "../logs.js";
import type * as roasters from "../roasters.js";
import type * as seed from "../seed.js";
import type * as userBeans from "../userBeans.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  beans: typeof beans;
  files: typeof files;
  follows: typeof follows;
  "lib/auth": typeof lib_auth;
  "lib/constants": typeof lib_constants;
  "lib/hydrate": typeof lib_hydrate;
  "lib/userBeanState": typeof lib_userBeanState;
  "lib/validate": typeof lib_validate;
  lists: typeof lists;
  logs: typeof logs;
  roasters: typeof roasters;
  seed: typeof seed;
  userBeans: typeof userBeans;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  auth: import("@convex-dev/auth/_generated/component.js").ComponentApi<"auth">;
  authGoogle: import("@convex-dev/auth/components/google/_generated/component.js").ComponentApi<"authGoogle">;
  authUsername: import("@convex-dev/auth/components/username/_generated/component.js").ComponentApi<"authUsername">;
};
