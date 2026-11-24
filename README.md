# Crema

**A diary for the coffee you brew.** Crema is to coffee beans what
[Letterboxd](https://letterboxd.com) is to films: log every bag you brew, rate and
review beans, keep a wishlist, pick your four favorites, make lists, and follow
friends to see what they're drinking.

It started as a one-line idea from a coffee-loving non-programmer: *"make tracking,
journaling, review apps like letterboxd, but instead of movie, i want to review coffee
beans."*

## Features

**Beans and roasters**
- A shared, community-built catalog. Any signed-in member can add a bean: roaster,
  origin and region, producer, varieties, process, roast level, altitude, harvest, the
  tasting notes printed on the bag, a description, and an optional photo.
- Beans without a photo get **generated bag artwork**: a colorway picked from the
  roaster and bean name, plus a roast-level indicator, a degassing valve, and a crimped seal.
- Browse sorted by *most brewed*, *highest rated*, or *newest*, and filter by origin,
  process, and roast. Full-text search covers name, roaster, origin, region, producer,
  process, and varieties.
- Roaster pages list every bean from that roaster.

**Your relationship with a bean** (the Letterboxd "watched / like / watchlist / rating" panel)
- **Brew**, **Like**, and **Wishlist** toggles, and a **half-star rating** (½ to 5★).
- **Diary entries**: each brew gets a date, brew method (V60, espresso, AeroPress…),
  optional recipe (dose, yield, temperature, grind, time), tasting notes, a "brewed
  before" flag, a like, a rating, and an optional **review**.
- You can edit or delete your entries from the bean page or the entry's own page.

**Bean pages**
- Average rating and ratings histogram, counts of brewers, likes, and wishlists.
- Your own brews, ratings from people you follow, all reviews, and the lists the bean
  appears in.

**People**
- Profiles: avatar, display name, bio, location, stats (brews, beans, lists,
  following, followers), and **four favorite beans**.
- Profile tabs: Diary (grouped by month), Reviews, Beans, Likes, Wishlist, Lists, Network.
- Follow people. The **Activity** feed and the home page show what they've brewed.
- Members page with the most-followed members.

**Lists**
- Named collections of beans, optionally ranked, with a description. Reorder with
  up/down buttons; add beans from the bean page or the list itself.

**Accounts**
- Sign in with a **username and a passkey**: no password, no email. One field handles
  both sign-up (new username) and sign-in (existing username). Passkeys can be added and
  removed in Settings.

## Tech stack

| Layer | Choice |
| --- | --- |
| Web framework | [TanStack Start](https://tanstack.com/start) (React 19, file-based routing with TanStack Router, SSR) |
| Backend & database | [Convex](https://convex.dev): queries, mutations, file storage, full-text search, realtime |
| Auth | [Convex Auth](https://docs.convex.dev/auth/convex-auth/) (component API), username + passkey method |
| Data fetching | `@convex-dev/react-query` + TanStack Query for server-rendered data; `convex/react` hooks for live, per-user data |
| Styling | Tailwind CSS v4, Fraunces + Inter (Google Fonts), lucide-react icons |
| Server build | Nitro (Bun preset locally, Vercel preset on Vercel) |
| Hosting | Vercel (site) + Convex Cloud (backend) |
| Runtime & tooling | Bun (package manager, scripts, tests), TypeScript (strict) |
| Tests | `bun test` + [`convex-test`](https://docs.convex.dev/testing/convex-test) |

## Getting started

```sh
bun install
bun run dev        # Convex + Vite on http://localhost:3000
bun run seed       # optional: 5 roasters and 12 sample beans (skipped if beans exist)
```

The first `bun run dev` asks you to log in to Convex and create a project, and writes
`VITE_CONVEX_URL` to `.env.local`. Passkeys work on `http://localhost:3000` without
any configuration.

| Script | What it does |
| --- | --- |
| `bun run dev` | Convex dev deployment + Vite dev server |
| `bun run seed` | Sample catalog (`convex/seed.ts`) |
| `bun run test` | Backend tests in `convex/*.test.ts` |
| `bun run typecheck` | Strict `tsc` over the app and the Convex functions |
| `bun run build` | Typecheck, then production build into `.output/` |
| `bun run start` | Serve the production build locally |

AI coding agents: read [AGENTS.md](AGENTS.md). It explains how to run the app
without a Convex account, take screenshots, and test passkey sign-in headlessly on this setup.

## Deploying

**1. Convex.** In the [Convex dashboard](https://dashboard.convex.dev), open the
project's *Production* deployment and set:

| Variable | Example |
| --- | --- |
| `PASSKEY_RP_ID` | `crema.vercel.app` (domain only, no scheme) |
| `PASSKEY_ORIGIN` | `https://crema.vercel.app` (comma-separate several origins) |

Set these **before anyone signs up**. A passkey is bound to its domain, so changing
`PASSKEY_RP_ID` later locks every existing user out. Then create a *production deploy
key* (Settings → Deploy keys).

**2. Vercel.** Import the project and add the environment variable `CONVEX_DEPLOY_KEY`.
`vercel.json` already sets the commands: `bun install`, then
`bunx convex deploy --cmd 'bun run build' --cmd-url-env-var-name VITE_CONVEX_URL`,
which deploys the Convex functions and builds the site against the production URL.

Optionally seed production once: `bunx convex run seed:catalog --prod`.

## How it works

### Data model (`convex/schema.ts`)

| Table | What it holds |
| --- | --- |
| `users` | Profile fields (name, bio, location, avatar, favorite bean ids) and denormalized `stats` counters. Usernames and passkeys live in Convex Auth's components, not here. |
| `roasters` | Name, URL slug, location, website, `beanCount`. |
| `beans` | Catalog fields, `roasterName` (denormalized), a `searchText` field for full-text search, and aggregates: `logCount`, `brewerCount`, `likeCount`, `wishlistCount`, `ratingCount`/`ratingSum`/`ratingAvg`, `ratingHistogram` (10 half-star buckets). |
| `userBeans` | One row per (user, bean): `brewed`, `liked`, `wishlisted`, `rating`, `brewCount`, `lastBrewedOn`. This is the Letterboxd "relationship with a film". |
| `logs` | Diary entries; a log with review text is a review (`hasReview`). |
| `follows` | follower → followee. |
| `lists`, `listItems` | Lists, with up to 5 preview bean ids stored on the list; items carry a `position`. |

### The rules for brewed, liked, wishlisted, and rating

Every change to a `userBeans` row goes through **`updateUserBean`** in
`convex/lib/userBeanState.ts`. It applies the rules below, then updates the bean's
aggregates and the user's stats **in the same transaction**, so the counts can't drift:

- Rating or liking a bean, or logging a brew, marks it **brewed**.
- A bean becoming brewed is **removed from the wishlist**.
- Un-brewing clears the rating and like, and is **refused** while diary entries exist.
- A new diary entry's rating **replaces** your rating for the bean; logging with a like
  likes the bean.
- Deleting diary entries keeps the bean brewed and rated (as Letterboxd does).
- A row that ends up all-empty is deleted.

`convex/aggregates.test.ts` covers these rules and checks that the histogram always
matches the rating count.

### Auth

`convex/auth.ts` sets up Convex Auth and the username + passkey method.
`users.createUser` runs on sign-up and creates the profile row. Server code reads the
signed-in user with `getAuthUserId(ctx)` (`convex/lib/auth.ts`), and never trusts a user
id from the client. Profiles are looked up by username through the auth username
component (case-insensitive). On the client, `ConvexAuthProvider` wraps the app in
`src/router.tsx`, and `useMe()` (`src/lib/hooks.ts`) returns the signed-in user.

### Loading data

- **Public data** (bean pages, profiles, lists, home page sections) is loaded in route
  `loader`s with `convexQuery` and rendered on the server. After hydration the same
  queries become live subscriptions.
- **Viewer-specific data** (your rating for a bean, follow state, your lists, the
  activity feed) and **paginated lists** load on the client with `convex/react`. Auth
  tokens live in the browser, so the server render is always signed-out; these parts
  fill in after hydration.

### Files and images

Bean photos and avatars are uploaded straight from the browser to Convex storage
(`files.generateUploadUrl`). The mutation that attaches a file checks that it's an
image under 5 MB and deletes the image it replaces.

### Layout

```
convex/
  schema.ts                 tables and indexes
  auth.ts, auth.config.ts   Convex Auth setup
  convex.config.ts          mounts the auth components and declares env vars
  beans.ts roasters.ts      catalog, browse, search, create/edit
  userBeans.ts              brew/like/wishlist/rate, per-user grids, friends' ratings
  logs.ts                   diary entries, reviews, activity feed
  lists.ts follows.ts users.ts files.ts seed.ts
  lib/                      constants (shared with the UI), validation, hydration, userBeanState
src/
  router.tsx                router + Convex/React Query + auth provider
  routes/                   pages (file-based routes)
  components/               BeanPoster, LogDialog, BeanForm, Rating, ReviewCard, …
  lib/                      formatting, hooks (useMe, useRequireAuth, uploads)
scripts/shoot.ts            headless screenshot/console-error helper (see AGENTS.md)
```

## Quirks and limitations

**Accounts**
- **Passkeys only.** Nobody needs a password, but a user must keep a passkey on some
  device. A passkey syncs through Apple, Google, or Microsoft accounts; across ecosystems
  (say, an Android phone and an iPhone), users should add a second passkey in Settings.
  There's no recovery path if every passkey is lost.
- Usernames are limited to letters, numbers, and underscores (2–24 characters) so they
  work in URLs. Convex Auth itself allows more, but the sign-in page enforces this. There's
  no way to change a username or delete an account yet.
- `PASSKEY_RP_ID` can't change after launch (see Deploying).

**Catalog**
- Anyone signed in can add beans and roasters. Only the person who added a bean can
  edit it. Roasters can't be edited or renamed, and nothing can be deleted or merged.
  There's no moderation or admin role.
- Duplicate detection only catches the same bean name from the same roaster
  (case-insensitive). "Guji Hambela" and "Guji – Hambela" are two beans.
- Each bean stores a copy of its roaster's name (`roasterName`). Renaming a roaster
  would need a migration.
- If adding a bean fails after its photo has uploaded (for example, it's a duplicate),
  the photo stays in storage, orphaned.

**Ratings and ranking**
- "Highest rated" sorts by plain average, so one 5★ rating outranks fifty 4.5★ ratings.
- "Popular" means most brewers of all time; there's no "this week" trending.
- Your rating for a bean is the latest one you gave. Older diary entries keep their
  own ratings, but those don't count in the average.

**Scale**: everything is sized for a group of friends, not thousands of users.
- The activity feed reads the latest 10 entries from each of up to 200 people you
  follow. Friends' ratings on a bean page check up to 300 follows. The network tab shows
  200 followers and 200 following.
- Browse filters run after the index scan, so a page can come back short when
  filters are strict. Search results aren't paginated (top 40), and the sort option
  is ignored while searching.
- The Members page only shows the 12 most-followed members, and there's no member search.
- Counters (user stats, bean aggregates) are stored on single documents, which is
  fine until many people write to the same bean at once.

**UI**
- Missing beans, users, and lists show a "not found" page but return HTTP 200, not 404.
- List items can hold a note in the database, but the UI doesn't show or edit notes
  yet. Passkeys can be renamed in the backend, but not in the UI.
- Lists can be reordered only with up/down buttons, and hold at most 250 beans.
- The server render is always signed-out, so personal bits (your rating, the account
  menu) appear a moment after the page loads.
- Brew dates are plain calendar dates (`YYYY-MM-DD`) in the user's own time zone.

**Tooling**
- ESLint crashes with the template's TypeScript setup; `bun run typecheck` is the
  source of truth.
- Vitest doesn't run under Bun here, so backend tests use `bun test`.

## TODO: next up

- [ ] Return real 404s (`throw notFound()` in route loaders).
- [ ] Weighted rating sort (Bayesian average) and a "trending this week" section.
- [ ] Likes and comments on reviews, plus notifications for follows, likes, and comments.
- [ ] Moderation: admin role, report a bean or review, merge duplicate beans, edit roasters.
- [ ] Rate limiting on writes (`@convex-dev/rate-limiter`), especially bean creation and uploads.
- [ ] Clean up orphaned uploads (upload after validating, or a scheduled sweep).
- [ ] Notes on list items, drag-and-drop reordering, renaming passkeys.
- [ ] Member search; account settings for changing username and deleting an account.
- [ ] "Year in coffee" stats page: brews per month, top origins, processes, and roasters, rating spread.
- [ ] Image resizing and thumbnails for uploaded photos.
- [ ] Commit the passkey end-to-end test (see AGENTS.md §4) as a script and run it in CI.
- [ ] Fix the ESLint setup.
