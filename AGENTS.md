<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->

# Working on Crema

What the app is and how it's built: [README.md](README.md). This file covers how to
**run it and see it** as an agent. Most of it was learned the hard way; follow it
instead of rediscovering it.

## Ground rules

- **Don't run `git`.** The owner handles version control.
- **Bun only.** There is no Node on this machine: `npx` → `bunx`, `npm run` → `bun run`.
- The shell is **Git Bash on Windows**. Two consequences that bite:
  - Arguments that look like `/paths` get rewritten to `C:/Program Files/Git/...`.
    Prefix commands that take URL paths with `MSYS_NO_PATHCONV=1`.
  - `timeout` doesn't reliably stop hung children. Start anything long-lived (dev
    servers, browsers) as a **background task** and stop it with TaskStop, not
    with `timeout` or by killing processes by name.

## 1. Backend: a local Convex deployment without an account

If `.env.local` **exists**, it points at the owner's real deployment. Don't overwrite
it; use `bunx convex dev` as configured.

If there is **no** `.env.local`, use Convex's anonymous local mode (no login needed):

```sh
CONVEX_AGENT_MODE=anonymous bunx convex dev --once    # push functions + typecheck; writes .env.local
CONVEX_AGENT_MODE=anonymous bunx convex run seed:catalog   # sample data (no-op if beans exist)
```

- Every Convex CLI command needs `CONVEX_AGENT_MODE=anonymous` in this mode.
- The local deployment's data **persists between sessions**: expect test users and
  reviews left over from earlier runs.
- When you're done, **delete the `.env.local` you created**, so the owner's first
  `bun run dev` sets up their own project.

Inspect data while working:

```sh
CONVEX_AGENT_MODE=anonymous bunx convex data users --limit 5
CONVEX_AGENT_MODE=anonymous bunx convex run beans:popular '{"limit":2}'
```

## 2. Run the app

Run Convex and Vite as **two separate background tasks**, each logging to a file:

```sh
CONVEX_AGENT_MODE=anonymous bunx convex dev > <scratchpad>/convex.log 2>&1   # background
bunx vite dev > <scratchpad>/vite.log 2>&1                                    # background
```

Don't use `bun run dev` (`convex dev --start "vite dev"`) as an agent. It hides Vite's
output, and once Vite silently never listened on :3000 with nothing in the log to say why.

Wait for the server with a short poll loop, not `sleep`:

```sh
for i in $(seq 1 60); do [ "$(curl -s -o /dev/null -w '%{http_code}' -m 5 http://localhost:3000/)" = 200 ] && break; sleep 1; done
```

A 200 only means server-side rendering works. Hydration is a separate question (see below).

If the browser reports **`Failed to fetch dynamically imported module`**, Vite's
pre-bundled dependency cache is stale. That usually happens after adding or removing a
package while Vite was running. Stop Vite, run `rm -rf node_modules/.vite`, and restart.

## 3. See the frontend: `scripts/shoot.ts`

```sh
MSYS_NO_PATHCONV=1 bun scripts/shoot.ts home=/ bean=/beans/<id> phone=/beans@390
MSYS_NO_PATHCONV=1 bun scripts/shoot.ts --eval "document.querySelector('header').textContent" home=/
```

For each `name=/path[@width]` it prints the PNG path (open it with the Read tool),
whether React hydrated, and every console error or uncaught exception. `--eval` runs an
expression after hydration and prints the result. Options: `--port`, `--out`, `--wait`.

The script starts its own headless Edge with a fresh profile, so it never touches the
user's browser and starts signed out. It drives Edge over the DevTools protocol with
Bun's WebSocket, and closes the browser when it finishes.

What **doesn't** work here, so don't spend time on it:

| Tried | Result |
| --- | --- |
| Playwright `chromium.launch({ channel: 'msedge' })` under Bun | hangs |
| Playwright `connectOverCDP` under Bun | times out on the WebSocket |
| `msedge --headless --screenshot=…` | hangs, or hands off to the user's open Edge and writes nothing |
| Killing `msedge*.exe` by name | don't: `msedgewebview2.exe` belongs to the user's other apps (VS Code, etc.) |

Timing: on the **Vite dev server**, headless Edge needs **20–30 s** to hydrate the first
page (about 200 unbundled modules). Before hydration the HTML looks finished, but
nothing is interactive and the header shows a grey placeholder instead of "Sign in".
The script waits for hydration (up to 60 s). For fast, production-like screenshots,
build and serve:

```sh
bun run build                                # needs VITE_CONVEX_URL, i.e. .env.local
PORT=3001 bun .output/server/index.mjs       # background; hydrates in ~3 s
MSYS_NO_PATHCONV=1 bun scripts/shoot.ts --port 3001 home=/
```

## 4. Signed-in flows (passkeys) in a headless browser

Sign-in is username + passkey. Chrome DevTools has a virtual authenticator, so the
whole flow can be automated. This was done once with a throwaway script based on
`scripts/shoot.ts`: sign up, log a brew, check the profile, sign out, sign back in.

- Use **http://localhost:3000**: passkeys only accept the configured origin
  (`PASSKEY_ORIGIN`, which defaults to `http://localhost:3000`). Port 3001 fails.
- Before navigating:
  ```js
  send('WebAuthn.enable', { enableUI: false })
  send('WebAuthn.addVirtualAuthenticator', { options: {
    protocol: 'ctap2', transport: 'internal', hasResidentKey: true,
    hasUserVerification: true, isUserVerified: true, automaticPresenceSimulation: true } })
  ```
- Start signed out: use a fresh profile, or call
  `Storage.clearDataForOrigin({ origin: 'http://localhost:3000', storageTypes: 'all' })`
  **before the first page load**. Clearing `localStorage` from inside a page isn't
  enough: a page that's restoring a session writes its tokens back.
- `/signin` hides the form while auth state loads. Wait for `#username` to exist, then
  type and submit. A new username creates an account and lands on `/settings?welcome=true`.
- Typing into React inputs: use the native value setter, then dispatch `input`:
  `Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true }))`.
- Auth-gated buttons (Log, Brew, Like…) **ignore clicks while auth is still loading**.
  After a page load, wait until the account menu (`[aria-label="Account menu"]`) exists.
- Check text with **`textContent`, not `innerText`**: `innerText` applies CSS
  `uppercase`, so the "Your brews" heading reads "YOUR BREWS".
- Scope clicks to the dialog: the page behind a `<dialog>` has buttons with the same
  labels ("Like").
- Confirm results in the database (`convex data logs`), not only in the UI.

## 5. Checks before you hand work back

```sh
bun run typecheck                                 # app + convex (strict tsc)
bun run test                                      # Convex tests via `bun test`
CONVEX_AGENT_MODE=anonymous bunx convex dev --once   # Convex's own typecheck + push
bun run build
```

- Tests use **`bun test`**, not Vitest: Vitest 5 crashes under Bun here, on both the
  forks and threads pools. `convex/aggregates.test.ts` builds convex-test's module map
  with `Bun.Glob` instead of `import.meta.glob`.
- **ESLint crashes** (`ts.versionMajorMinor` is undefined in typescript-eslint) because
  of the template's TypeScript package aliases. It's a known issue; rely on `tsc`.
- Nitro's build preset is auto-detected: `bun` locally, Vercel on Vercel. Don't hardcode it.

## 6. Clean up

Stop every background task you started (Convex, Vite, prod server). Delete the
`.env.local` you created in anonymous mode. Leave the user's own processes alone.
