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
- **Sign in with Google**: one button handles both sign-up and sign-in. A new account
  gets a username (the `@handle` in profile URLs) made from the Google name, and the
  Google name as its display name. Both can be changed in Settings.

## Tech stack

| Layer | Choice |
| --- | --- |
| Web framework | [Next.js](https://nextjs.org) 16 (App Router, Server Components, Turbopack) |
| Backend & database | [Convex](https://convex.dev): queries, mutations, file storage, full-text search, realtime |
| Auth | [Convex Auth](https://docs.convex.dev/auth/convex-auth/) (component API), Google sign-in, with its Next.js SSR integration (httpOnly cookies) |
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
`NEXT_PUBLIC_CONVEX_URL` to `.env.local`. The backend won't deploy until Google
sign-in is configured on the Convex deployment: see
[Step 3](#step-3-set-up-google-sign-in) below. [`.env.example`](.env.example) lists every environment
variable and where each one is set (`.env.local`, the Convex deployment, or Vercel).

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
without a Convex account and take screenshots on this setup.

## Deploying

The live app has two parts, hosted in two places:

- **The backend** (everything in `convex/`: database, functions, file storage) runs
  on **Convex**.
- **The website** (everything in `src/`) runs on **Vercel**.

You don't deploy them separately. Each time Vercel builds the site, the build first
pushes `convex/` to the Convex deployment named by your deploy key, then builds the
website against it. That's what the `buildCommand` in `vercel.json` does.

Every Convex project has two separate databases, **development** and **production**.
This guide puts the site on Vercel using your **development** database, the same
one you see at `http://localhost:3000`, so friends can try it with the same content.
[Switching to production](#later-switching-to-the-production-database) comes at the end.

### What you need first

- A **GitHub** account with this project pushed to a repository. Vercel deploys from
  a Git repository.
- A **Convex** account (free), with a project created by running `bun run dev` once
  and logging in when asked.
- A **Vercel** account (the free Hobby plan is enough). Signing up with GitHub is
  easiest, because Vercel then sees your repositories.

### Step 1: Get a deploy key for the dev database

1. Open the [Convex dashboard](https://dashboard.convex.dev) and click your project.
2. Use the deployment switcher at the top to pick **Development**.
3. Go to **Settings → Deploy keys** and click **Generate a deploy key**. Copy it.

Treat this key like a password: anyone who has it can replace your backend.

If the catalog is empty, fill it with sample beans:

```sh
bun run seed
```

### Step 2: Put the website on Vercel

1. In Vercel, click **Add New… → Project**, and **Import** your GitHub repository.
2. Leave the detected settings as they are (framework *Next.js*, root directory
   `./`). `vercel.json` already sets the install and build commands.
3. Under **Environment Variables**, add `CONVEX_DEPLOY_KEY` with the key from step 1,
   and set it to apply to **Production only** (untick *Preview* and *Development*).
   Don't add `NEXT_PUBLIC_CONVEX_URL`: the build sets it.
4. Click **Deploy**. The build takes a few minutes, and Vercel then shows your site's
   address, something like `https://crema-abc123.vercel.app`. You'll find it later
   under the project's **Domains**.

The site works at this point, but **signing in doesn't yet**. That's step 3.

### Step 3: Set up Google sign-in

Sign-in uses Google accounts. You register Crema with Google once, then give the
backend the keys Google hands you. Until these are set, the backend **won't deploy**
(`bun run dev` and the Vercel build both stop with an error naming the missing
variables).

**3a. Find your backend's callback address.** In a terminal in this project:

```sh
bunx convex env get CONVEX_SITE_URL
```

It prints something like `https://happy-animal-123.convex.site`. Google will send people
back to that address followed by `/oauth/google/callback`:
`https://happy-animal-123.convex.site/oauth/google/callback`.

**3b. Register the app with Google.** In the
[Google Cloud console](https://console.cloud.google.com/):

1. Create a project (or pick one), then open **Google Auth Platform** at
   `https://console.cloud.google.com/auth/overview?project=<your-project-id>` (or
   **APIs & Services → OAuth consent screen**). The console's Welcome page doesn't
   link to it directly.
2. The first time, click **Get started** and fill in the basics: app name (`Crema`),
   your support email, audience **External**, and a contact email.
3. Under **Branding**, fill in the rest, or **Publish app** stays greyed out:
   - **App logo:** leave empty. A logo makes Google review the app.
   - **Application home page:** your site, e.g. `https://crema-abc123.vercel.app`
   - **Privacy policy link:** `https://crema-abc123.vercel.app/privacy`
   - **Terms of service link:** `https://crema-abc123.vercel.app/terms`
   - **Authorized domains:** the bare domain, e.g. `crema-abc123.vercel.app` (no
     `https://`, no trailing `/`).
   - **Developer contact information** (bottom of the page): your email.

   Click **Save**. Google doesn't open these links for an app like this, so they
   don't need to be live yet.
4. Under **Audience**, click **Publish app**. While the app is in *Testing*, only the
   Google accounts you list as test users can sign in. Crema only asks for name, email,
   and profile picture, so publishing needs no review by Google.
5. Under **Clients**, click **Create client**. Pick **Web application**, and under
   **Authorized redirect URIs** add the callback address from 3a. You don't need any
   *Authorized JavaScript origins*.
6. Create it, and copy the **Client ID** and **Client secret** right away (or click
   **Download JSON**): Google may not show the secret again.

**3c. Give the keys and your site's address to the backend**, using your values from
3b and step 2:

```sh
bunx convex env set AUTH_GOOGLE_CLIENT_ID 1234-abc.apps.googleusercontent.com
bunx convex env set AUTH_GOOGLE_CLIENT_SECRET GOCSPX-your-secret
bunx convex env set SITE_ORIGIN https://crema-abc123.vercel.app,http://localhost:3000
```

- There's no `--prod`, so these go to the development database, which both the Vercel
  site and `localhost:3000` use.
- `SITE_ORIGIN` lists the addresses Google sign-in may return to: the full address
  with `https://` and no trailing `/`, comma-separated. Keeping
  `http://localhost:3000` lets you sign in locally too.
- If you set `PASSKEY_RP_ID` and `PASSKEY_ORIGIN` before, they're no longer used. You
  can remove them with `bunx convex env remove PASSKEY_RP_ID` (and the same for
  `PASSKEY_ORIGIN`).

**3d. Redeploy.** Push your code to the main branch, or click **Redeploy** on the latest
deployment in Vercel.

### Step 4: Try it

Open your site, click **Sign in**, then **Continue with Google**. You land on Settings
with a username made from your Google name; change it there if you like. You should see
the same beans as at `localhost:3000`. Share the address with your friends: anyone
signed in can add beans.

### Step 5: Make yourself an admin

Admins can edit and delete any bean, including the sample beans from `bun run seed`,
which belong to nobody. Once you've signed in, run this with **your** username (shown
in Settings):

```sh
bunx convex run admin:setAdmin '{"username": "your_username"}'
```

Add `--prod` for the production database. To take admin away again, add
`"admin": false`. This command only works from a terminal or the Convex dashboard
(**Functions → admin:setAdmin → Run**), never from the website, so nobody can make
themselves an admin. It's how the first admin is made.

After that, admins manage admins on the website: on anyone else's profile page, an
admin sees **Make admin…** or **Remove admin role…** under the username. Nobody can
change their own role there, so there's always at least one admin left. Admins show an
**Admin** badge on their profile.

As an admin, every bean page shows **Edit bean details**. The edit page has a
**Delete bean** section at the bottom. Deleting a bean also deletes everyone's diary
entries, ratings, likes, wishlist entries, and list entries for it.

### After that: updating the live site

Push to your repository's main branch. Vercel rebuilds, which also deploys any changes
in `convex/` to the dev database. No extra steps.

If a deploy fails, open the deployment in Vercel and read its **Build Logs**. Two
common causes: `CONVEX_DEPLOY_KEY` is missing or wrong (redo steps 1–2), or a
TypeScript error (run `bun run typecheck` and `bun run build` locally first).

### Later: switching to the production database

Production is a separate, empty database with no data and no settings. Nothing in
`vercel.json` changes: you swap the key and set the Google sign-in variables.

1. For a custom domain, add it in Vercel (**Settings → Domains**) first. Unlike
   passkeys, Google accounts aren't tied to the domain, so you can change it later:
   just update `SITE_ORIGIN`.
2. In the Convex dashboard, pick **Production** in the deployment switcher, go to
   **Settings**, and generate a **production deploy key** (it starts with `prod:`).
3. In Vercel, under **Settings → Environment Variables**, replace the value of
   `CONVEX_DEPLOY_KEY` with that key (still **Production only**).
4. Production has its own callback address: run `bunx convex env get CONVEX_SITE_URL --prod`,
   and add `<that address>/oauth/google/callback` as a second **Authorized redirect URI**
   on the same Google client (step 3b). Then set the variables on production:
   ```sh
   bunx convex env set AUTH_GOOGLE_CLIENT_ID 1234-abc.apps.googleusercontent.com --prod
   bunx convex env set AUTH_GOOGLE_CLIENT_SECRET GOCSPX-your-secret --prod
   bunx convex env set SITE_ORIGIN https://your-final-domain --prod
   ```
5. Redeploy in Vercel (or push to main). The build now deploys `convex/` to production
   and builds the site against it.
6. Optional: `bunx convex run seed:catalog --prod` fills the empty catalog with the
   sample beans. Accounts and data from development don't carry over, so everyone
   signs up again.

## How it works

### Data model (`convex/schema.ts`)

| Table | What it holds |
| --- | --- |
| `users` | Profile fields (name, bio, location, avatar, favorite bean ids), an optional `isAdmin` flag, and denormalized `stats` counters. Usernames and linked Google accounts live in Convex Auth's components, not here. |
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

`convex/auth.ts` sets up Convex Auth and the Google method. On a first sign-in,
`users.createUser` creates the profile row and gives it a unique username (stored in
the `authUsername` component, which here is only a handle registry, not a sign-in
method). The sign-in flow:

1. **Continue with Google** (`src/app/signin/SignInForm.tsx`) calls
   `startSignInWithGoogle`, which checks the return address against `SITE_ORIGIN` and
   sends the browser to Google.
2. Google redirects to the backend's `<CONVEX_SITE_URL>/oauth/google/callback`
   (served by the `authGoogle` component), which sends the browser back to
   `/signin?code=…`.
3. The sign-in page redeems the code with `completeSignInWithGoogle` through the
   `/auth/signin` route, which sets the session cookies. New accounts then go to
   `/settings?welcome=1`; others go back where they came from.

On the web side:

- `src/lib/serverAuth.ts` + `src/app/auth/{signin,refresh,signout}/route.ts`: route
  handlers that proxy sign-in calls to Convex and keep the refresh token in an
  **httpOnly cookie**. Only the functions listed in `signIn`
  (`completeSignInWithGoogle`) can create a session through them.
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
  admin.ts                  setAdmin (run from the CLI or dashboard only)
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
- **Google accounts only.** Each Google account is one Crema account. There's no other
  way to sign in, and no way to move an account to a different Google account.
- Accounts created with passkeys (before the switch to Google) still exist, with their
  diaries and profiles, but can no longer be signed in to.
- Usernames are limited to letters, numbers, and underscores (2–24 characters) so they
  work in URLs. Changing your username changes your profile URL; old links stop working.
  There's no way to delete an account yet.

**Catalog**
- Anyone signed in can add beans and roasters. Only the person who added a bean, or an
  admin, can edit it. Only admins can delete beans (see Deploying, step 5). Roasters
  can't be edited, renamed, or deleted, even by admins, and beans can't be merged. A
  roaster left with no beans stays listed.
- Deleting a bean refuses beans with more than 1,000 diary entries, user states, or
  list entries, to stay within one Convex transaction.
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
  yet.
- The Google profile picture isn't used; avatars are uploaded in Settings.
- Lists can be reordered only with up/down buttons, and hold at most 250 beans.
- Brew dates are plain calendar dates (`YYYY-MM-DD`) in the user's own time zone.

**Tooling**
- `next dev` adds a Next.js block to `AGENTS.md` (and re-adds it if removed). It's meant
  to be committed.
- Vitest doesn't run under Bun here, so backend tests use `bun test`.

## TODO: next up

- [ ] Weighted rating sort (Bayesian average) and a "trending this week" section.
- [ ] Likes and comments on reviews, plus notifications for follows, likes, and comments.
- [ ] Moderation: report a bean or review, admins removing reviews, merging duplicate beans, editing roasters.
- [ ] Rate limiting on writes (`@convex-dev/rate-limiter`), especially bean creation and uploads.
- [ ] Clean up orphaned uploads (upload after validating, or a scheduled sweep).
- [ ] Notes on list items, drag-and-drop reordering.
- [ ] Member search; deleting an account.
- [ ] "Year in coffee" stats page: brews per month, top origins, processes, and roasters, rating spread.
- [ ] Image resizing and thumbnails for uploaded photos.
- [ ] Social previews: Open Graph images for beans and reviews (bag artwork + rating).
- [ ] An end-to-end sign-in test (needs a fake Google, or a test-only sign-in method; see AGENTS.md §4).
