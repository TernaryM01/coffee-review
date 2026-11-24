import { defineApp } from "convex/server";
import { v } from "convex/values";
import auth from "@convex-dev/auth/convex.config.js";
import authPasskey from "@convex-dev/auth/components/passkey/convex.config.js";
import authUsername from "@convex-dev/auth/components/username/convex.config.js";

const app = defineApp({
  env: {
    // Bare domain the app is served from, e.g. "crema.vercel.app".
    PASSKEY_RP_ID: v.optional(v.string()),
    // Full origin(s), comma-separated, e.g. "https://crema.vercel.app".
    PASSKEY_ORIGIN: v.optional(v.string()),
  },
});
app.use(auth);
app.use(authPasskey);
app.use(authUsername);
export default app;
