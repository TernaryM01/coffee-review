/// <reference types="bun" />
/**
 * Headless screenshots + console-error check for the running app, for agents.
 *
 * Why this exists: on this Windows + Bun setup, Playwright hangs (both
 * `launch` and `connectOverCDP`), and `msedge --headless --screenshot` hangs or
 * hands off to the user's open Edge window. Driving Edge over the DevTools
 * protocol with Bun's own WebSocket works. See AGENTS.md.
 *
 * Usage (Git Bash: MSYS_NO_PATHCONV=1 stops "/beans" becoming "C:/Program Files/Git/beans"):
 *   MSYS_NO_PATHCONV=1 bun scripts/shoot.ts [options] name=/path[@width] ...
 *
 * Options:
 *   --port <n>     app port (default 3000)
 *   --out <dir>    where PNGs go (default: <os tmp>/crema-shots)
 *   --wait <ms>    max time to wait for React hydration (default 60000; a cold
 *                  Vite dev server can take >30 s for the first page)
 *   --eval <js>    expression evaluated in each page after hydration; result is printed
 *
 * A 404 page logs "Failed to load resource: … 404": that is the page's own
 * status, not a broken asset.
 *
 * Example:
 *   MSYS_NO_PATHCONV=1 bun scripts/shoot.ts home=/ beans=/beans phone=/beans@390
 */
import { mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const args = process.argv.slice(2)
const opt = (name: string, fallback: string) => {
  const i = args.indexOf(`--${name}`)
  if (i === -1) return fallback
  const value = args[i + 1]
  args.splice(i, 2)
  return value
}
const appPort = Number(opt('port', '3000'))
const outDir = opt('out', join(tmpdir(), 'crema-shots'))
const hydrationWait = Number(opt('wait', '60000'))
const evalExpr = opt('eval', '')
const specs = args
if (specs.length === 0) {
  console.error('Usage: bun scripts/shoot.ts [--port 3000] [--out dir] [--wait ms] [--eval js] name=/path[@width] ...')
  process.exit(1)
}
mkdirSync(outDir, { recursive: true })

const EDGE =
  process.env.BROWSER ?? 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
// A random port, checked to be free: if another browser already listens on
// it, we'd silently drive that browser (with its cookies) instead of ours.
const DEBUG_PORT = 9400 + Math.floor(Math.random() * 500)
const DEVTOOLS = `http://127.0.0.1:${DEBUG_PORT}`
if (await fetch(`${DEVTOOLS}/json/version`).then(() => true, () => false)) {
  throw new Error(`Port ${DEBUG_PORT} is already in use by another DevTools browser; run again.`)
}
// A fresh profile per run keeps this away from any Edge window the user has
// open, and means no leftover localStorage (i.e. no stale signed-in session).
const profile = join(tmpdir(), `crema-cdp-profile-${Date.now()}`)

const browser = Bun.spawn(
  [EDGE, '--headless=new', `--remote-debugging-port=${DEBUG_PORT}`, `--user-data-dir=${profile}`,
    '--no-first-run', '--disable-gpu', 'about:blank'],
  { stdout: 'ignore', stderr: 'ignore' },
)

let browserWs: string | undefined
for (let i = 0; i < 60 && !browserWs; i++) {
  try {
    browserWs = ((await (await fetch(`${DEVTOOLS}/json/version`)).json()) as any).webSocketDebuggerUrl
  } catch {
    await Bun.sleep(500)
  }
}
if (!browserWs) {
  browser.kill()
  throw new Error(`Edge didn't expose DevTools on ${DEVTOOLS}. Is something else using port ${DEBUG_PORT}?`)
}

/** Open a CDP session over Bun's WebSocket. */
async function connect(url: string, onEvent: (method: string, params: any) => void = () => {}) {
  const ws = new WebSocket(url)
  await new Promise((r) => ws.addEventListener('open', r, { once: true }))
  let nextId = 1
  const pending = new Map<number, (v: any) => void>()
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(String(ev.data))
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)!(msg.error ? { __error: msg.error } : msg.result)
      pending.delete(msg.id)
    } else if (msg.method) {
      onEvent(msg.method, msg.params)
    }
  })
  const send = (method: string, params: object = {}) =>
    new Promise<any>((resolve) => {
      const id = nextId++
      pending.set(id, resolve)
      ws.send(JSON.stringify({ id, method, params }))
    })
  return { send, close: () => ws.close() }
}

// Next.js hydrates client components as their code arrives, so the header can
// be interactive while a form in <main> isn't yet. Wait for all of them.
const HYDRATED = `(() => {
  const els = [...document.querySelectorAll('header, main a, main button, main form, main input')]
  return els.length > 0 && els.every((el) => Object.keys(el).some((k) => k.startsWith('__react')))
})()`

async function shoot(name: string, path: string, width: number) {
  const target = (await (await fetch(`${DEVTOOLS}/json/new?about:blank`, { method: 'PUT' })).json()) as any
  const errors: string[] = []
  const page = await connect(target.webSocketDebuggerUrl, (method, p) => {
    if (method === 'Runtime.exceptionThrown') {
      errors.push('exception: ' + (p.exceptionDetails.exception?.description ?? p.exceptionDetails.text))
    } else if (method === 'Runtime.consoleAPICalled' && p.type === 'error') {
      errors.push('console.error: ' + p.args.map((a: any) => a.value ?? a.description ?? '').join(' '))
    } else if (method === 'Log.entryAdded' && p.entry.level === 'error') {
      errors.push('log: ' + p.entry.text)
    }
  })
  const evaluate = async (expression: string) => {
    const r = await page.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
    return r.exceptionDetails ? `THREW ${r.exceptionDetails.exception?.description ?? r.exceptionDetails.text}` : r.result?.value
  }
  const metrics = (height: number) =>
    page.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 600 })

  await page.send('Runtime.enable')
  await page.send('Log.enable')
  await page.send('Page.enable')
  await metrics(900)
  const nav = await page.send('Page.navigate', { url: `http://localhost:${appPort}${path}` })
  if (nav.errorText || nav.__error) {
    console.log(`${name}: navigation failed: ${nav.errorText ?? JSON.stringify(nav.__error)}`)
  }

  // Poll for hydration rather than sleeping a fixed time: the Vite dev server
  // serves ~200 unbundled modules, so hydration can take 10–20 s there.
  const start = Date.now()
  let hydrated = false
  while (Date.now() - start < hydrationWait) {
    if ((hydrated = (await evaluate(HYDRATED)) === true)) break
    await Bun.sleep(250)
  }
  await Bun.sleep(1500) // let client-side Convex queries arrive

  const evalResult = evalExpr ? await evaluate(evalExpr) : undefined
  const { cssContentSize } = await page.send('Page.getLayoutMetrics')
  await metrics(Math.min(Math.ceil(cssContentSize.height), 4000))
  await Bun.sleep(300)
  const shot = await page.send('Page.captureScreenshot', { format: 'png' })
  const file = join(outDir, `${name}.png`)
  await Bun.write(file, Buffer.from(shot.data, 'base64'))

  console.log(`${name}: ${file}`)
  console.log(`  hydrated: ${hydrated ? `yes (${((Date.now() - start) / 1000).toFixed(1)}s incl. settle)` : `NO after ${hydrationWait} ms`}`)
  if (evalExpr) console.log(`  eval: ${JSON.stringify(evalResult)}`)
  console.log(errors.length ? errors.map((e) => `  ERROR ${e.slice(0, 400)}`).join('\n') : '  no console errors')
  page.close()
  await fetch(`${DEVTOOLS}/json/close/${target.id}`)
}

try {
  for (const spec of specs) {
    const [name, rest = '/'] = spec.split('=')
    const [path, width] = rest.split('@')
    await shoot(name, path, Number(width ?? 1300))
  }
} finally {
  const b = await connect(browserWs)
  await Promise.race([b.send('Browser.close'), Bun.sleep(3000)])
  browser.kill()
  await browser.exited
  // Edge's helper processes can hold the profile for a moment; a leftover
  // folder in the temp dir is harmless.
  try {
    rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 })
  } catch {}
}
