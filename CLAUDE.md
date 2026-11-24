<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->

## Project notes

How to run the app, see the frontend, and test signed-in flows as an agent (read this
before starting a dev server or a browser):

@AGENTS.md

- Don't run `git`; the owner handles version control.
- All changes to a user's brewed/liked/wishlisted/rating state must go through `updateUserBean` in `convex/lib/userBeanState.ts`, which keeps bean aggregates and user stats in sync.
- Auth is Convex Auth (new component API) with username + passkey. `PASSKEY_RP_ID` / `PASSKEY_ORIGIN` must be set on production.
