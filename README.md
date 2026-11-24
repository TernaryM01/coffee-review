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
| Web framework | [Next.js](https://nextjs.org) 16 (App Router, Server Components, Turbopack) |
| Backend & database | [Convex](https://convex.dev): queries, mutations, file storage, full-text search, realtime |
| Auth | [Convex Auth](https://docs.convex.dev/auth/convex-auth/) (component API), username + passkey, with its Next.js SSR integration (httpOnly cookies) |
| Data fetching | `convex/nextjs` (`preloadQuery`, `fetchQuery`) in Server Components → `usePreloadedQuery` / `usePaginatedQuery` live in the browser |
| Styling | Tailwind CSS v4, Fraunces + Inter via `next/font`, lucide-react icons |
| Hosting | Vercel (site) + Convex Cloud (backend) |
| Runtime & tooling | Bun (package manager, scripts, tests), TypeScript 5 (strict), ESLint (`eslint-config-next` + Convex plugin) |
| Tests | `bun test` + [`convex-test`](https://docs.convex.dev/testing/convex-test) |

## Getting started

```sh
bun install
bun run dev        # Convex + Next.js on http://localhost:3000
bun run seed       # optional: 5 roasters and 12 sample beans (skipped if beans exist)
```

The first `bun run dev` asks you to log in to Convex and create a project, and writes
`NEXT_PUBLIC_CONVEX_URL` to `.env.local`. Passkeys work on `http://localhost:3000`
without any configuration.

| Script | What it does |
| --- | --- |
| `bun run dev` | Convex dev deployment + `next dev` |
| `bun run seed` | Sample catalog (`convex/seed.ts`) |
| `bun run test` | Backend tests in `convex/*.test.ts` |
| `bun run typecheck` | Strict `tsc` over the app and the Convex functions |
| `bun run lint` | ESLint |
| `bun run build` | Production build (`next build`, which also typechecks) |
| `bun run start` | Serve the production build on port 3000 |

There's no Node on the original dev machine: Bun runs everything, including
`next`, `tsc`, and `eslint`.

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
`vercel.json` already sets the framework and commands: `bun install`, then
`bunx convex deploy --cmd 'bun run build' --cmd-url-env-var-name NEXT_PUBLIC_CONVEX_URL`,
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

### Where the code runs

Convex **is** the backend: every read and write is a Convex query or mutation in
`convex/`, with its own auth checks. Next.js renders pages and handles the session
cookies; it has no API routes of its own apart from Convex Auth's.

A request for, say, `/beans/<id>` goes like this:

1. **`src/proxy.ts`** (Next's middleware) refreshes the session if it's about to
   expire, and redirects: signed-out visitors away from protected pages
   (`/settings`, `/activity`, `/beans/new`, `/lists/new`, bean edit) to
   `/signin?redirect=…`, and signed-in visitors away from `/signin`.
2. The page's **Server Component** reads the access token from the auth cookie and
   calls Convex **as that user** (`preloadQuery(…, { token })`, helpers in
   `src/lib/server.ts`). Missing data → `notFound()` → a real **404**.
3. The server renders the full page, **signed-in**: the account menu, your rating,
   "Your brews", friends' ratings. The first page of every paginated list is fetched
   with `firstPage()` and rendered too.
4. In the browser, each page's client component (`*View.tsx`) hydrates and turns the
   preloaded data into **live subscriptions** (`usePreloaded`, `src/lib/hooks.ts`).
   Paginated lists switch from the server's first page to a live `usePaginatedQuery`
   (`usePaginatedWithInitial`, `src/lib/paginated.ts`).

`usePreloaded` keeps the server's value while the browser's Convex client finishes
authenticating, so signed-in data doesn't flash its signed-out version. The signed-in
user is preloaded once in the root layout and shared through `useMe()`.

### Auth

`convex/auth.ts` sets up Convex Auth and the username + passkey method;
`users.createUser` creates the profile row on sign-up. On the web side:

- `src/lib/serverAuth.ts` + `src/app/auth/{signin,refresh,signout}/route.ts`: route
  handlers that proxy sign-in calls to Convex and keep the refresh token in an
  **httpOnly cookie**. Only the functions listed in `signIn` (the passkey "finish"
  steps) can create a session through them.
- `src/lib/convexAuth.tsx`: the proxy builder, the Server Component token reader, and
  `ConvexAuthNextjsServerProvider`, which wraps the app in `src/app/layout.tsx`.
- Server code in `convex/` reads the user with `getAuthUserId(ctx)` and never trusts a
  user id from the client.

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
  proxy.ts                  session refresh + auth redirects
  app/                      routes: page.tsx (server) + *View.tsx (client) per page
    layout.tsx providers.tsx  root layout, preloaded viewer, providers
    auth/                   Convex Auth route handlers
  components/               BeanPoster, LogDialog, BeanForm, Rating, ReviewCard, …
  lib/                      server.ts (preload helpers), hooks.ts, paginated.ts,
                            convexAuth.tsx, serverAuth.ts, pageSizes.ts, format.ts
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

**Rendering**
- Every page is rendered per request (it reads the auth cookie), so nothing is
  statically cached. That's fine at this size; caching public pages for signed-out
  visitors would be the next step if traffic grows.
- Each search keystroke (debounced) and filter change on `/beans` is a round trip to the
  server, because the URL is the state and the server renders the results.
- Paginated lists render their first page on the server; "Load more" works once the
  live query has taken over, a moment after hydration.

**UI**
- List items can hold a note in the database, but the UI doesn't show or edit notes
  yet. Passkeys can be renamed in the backend, but not in the UI.
- Lists can be reordered only with up/down buttons, and hold at most 250 beans.
- Brew dates are plain calendar dates (`YYYY-MM-DD`) in the user's own time zone.

**Tooling**
- `next dev` adds a Next.js block to `AGENTS.md` (and re-adds it if removed). It's meant
  to be committed.
- Vitest doesn't run under Bun here, so backend tests use `bun test`.

## TODO: next up

- [ ] Weighted rating sort (Bayesian average) and a "trending this week" section.
- [ ] Likes and comments on reviews, plus notifications for follows, likes, and comments.
- [ ] Moderation: admin role, report a bean or review, merge duplicate beans, edit roasters.
- [ ] Rate limiting on writes (`@convex-dev/rate-limiter`), especially bean creation and uploads.
- [ ] Clean up orphaned uploads (upload after validating, or a scheduled sweep).
- [ ] Notes on list items, drag-and-drop reordering, renaming passkeys.
- [ ] Member search; account settings for changing username and deleting an account.
- [ ] "Year in coffee" stats page: brews per month, top origins, processes, and roasters, rating spread.
- [ ] Image resizing and thumbnails for uploaded photos.
- [ ] Social previews: Open Graph images for beans and reviews (bag artwork + rating).
- [ ] Commit the passkey end-to-end test (see AGENTS.md §4) as a script and run it in CI.
