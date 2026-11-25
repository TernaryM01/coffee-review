import { defineApp } from "convex/server";
import { v } from "convex/values";
import auth from "@convex-dev/auth/convex.config.js";
import authGoogle from "@convex-dev/auth/components/google/convex.config.js";
import authUsername from "@convex-dev/auth/components/username/convex.config.js";

const app = defineApp({
  env: {
    // The Google OAuth client (Google Cloud console → APIs & Services → Credentials).
    AUTH_GOOGLE_CLIENT_ID: v.string(),
    AUTH_GOOGLE_CLIENT_SECRET: v.string(),
    // Origin(s) of the website, comma-separated, e.g.
    // "https://crema.vercel.app,http://localhost:3000". Google sign-in only
    // returns to these. Defaults to http://localhost:3000.
    SITE_ORIGIN: v.optional(v.string()),
  },
});
app.use(auth);
// Google redirects back to <CONVEX_SITE_URL>/oauth/google/callback.
app.use(authGoogle, {
  httpPrefix: "/oauth/google",
  env: {
    CLIENT_ID: app.env.AUTH_GOOGLE_CLIENT_ID,
    CLIENT_SECRET: app.env.AUTH_GOOGLE_CLIENT_SECRET,
  },
});
// Not a sign-in method here: it stores each user's public @handle (profile URLs).
app.use(authUsername);
export default app;
