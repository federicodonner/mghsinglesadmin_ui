---
name: run-mghsingles-admin
description: Build, run and drive the mghsingles admin UI headlessly. Use when asked to start the admin app, screenshot an admin page, test the staff/owner login or the sell or orders flow, or verify a React change in the running admin app.
---

# Run the mghsingles admin UI

Create React App 5 + React 18 + react-router 6 + MUI 7. Spanish-language back office for
`mghsingles_api` (sell cards, orders, storage, pricing, users). Same shape as
the customer UI but **role-gated** — only `staff` or `owner` players get in —
and themed dark blue instead of orange — a fast way to tell the two apps'
screenshots apart.

The agent path is `.claude/skills/run-mghsingles-admin/driver.mjs`: a
headless-Chrome REPL that reads one command per line on stdin, so a whole flow
goes in a single heredoc. It uses `playwright-core` against the **system Google
Chrome**, so no browser is downloaded.

All paths below are relative to `mghsingles_ui/mghsingles_admin/`.

## Prerequisites

- Node (verified on v24.4.1)
- Google Chrome at `/Applications/Google Chrome.app`
- A running `mghsingles_api` with a seeded database — see the
  `run-mghsingles-api` skill in `mghsingles_api/`.
- **A player with `role = 'staff'` or `'owner'`.** There is no `superuser`
  column any more; authorization is the `role` enum on `player`
  (`customer`/`staff`/`owner`), and nothing in this app works for a `customer`.
  Login is by **email**, not username. Check who exists:

  ```bash
  psql -d mghsingles -c "SELECT username, email, role FROM player ORDER BY role, username;"
  ```

  The current dev database has `fede` (owner), `lucia` (staff) and customers
  `ana`/`diego`/`martin`/`sofia`, all `<username>@example.com`. Passwords follow
  `scripts/seedDev.mjs`'s rule `<username>1234` (e.g. `fede@example.com` /
  `fede1234`) — but the passwordless token trick below needs none of them.
  Do NOT reseed or edit this data; it is managed by hand.

## Setup

```bash
npm install
```

```bash
cd .claude/skills/run-mghsingles-admin && npm install
```

## Run (agent path)

Start the dev server. Pick a port that doesn't collide with the customer UI:

```bash
BROWSER=none PORT=3102 REACT_APP_API_URL=http://localhost:3101 npx react-scripts start
```

First compile takes ~40s (a few seconds once CRA's cache is warm). Wait for a
`webpack 5.66.0 compiled ...` line. `compiled with 1 warning` is expected —
unused-vars and `==` in `src/sell/`; it is not an error.

Then drive it:

```bash
UI_URL=http://localhost:3102 node .claude/skills/run-mghsingles-admin/driver.mjs <<'EOF'
goto /login
waitms 1200
fill 'input[placeholder="Email"]' fede@example.com
fill 'input[placeholder="Contraseña"]' fede1234
click button.login
waitms 2000
clicktext Vender
waitms 2500
fill input.MuiAutocomplete-input bolt
waitms 1500
click form.sellSearch button[type=submit]
waitms 2000
shot admin-sell
ls
text
net
EOF
```

Verified output (MUI utility classes elided):

```
> click button.login
clicked button.login -> http://localhost:3102/home

> clicktext Vender
clicked text "Vender" -> http://localhost:3102/sell

> shot admin-sell
wrote .../run-mghsingles-admin/shots/admin-sell.png

> ls
a class="MuiButtonBase-root MuiButton-root ... active" :: Vender
a class="MuiButtonBase-root MuiButton-root ..." :: Pedidos
a class="MuiButtonBase-root MuiButton-root ..." :: Contenedores
a class="MuiButtonBase-root MuiButton-root ..." :: Precios
a class="MuiButtonBase-root MuiButton-root ..." :: Usuarios
a class="MuiButtonBase-root MuiButton-root ..." :: Cuenta
input type=text class="... MuiAutocomplete-input ..." ph="Escribe el nombre de la carta"
button type=submit class="MuiButtonBase-root MuiButton-root ..." :: Buscar
```

Screenshots land in `.claude/skills/run-mghsingles-admin/shots/`
(override with `SHOT_DIR`). **Open them — don't assume they rendered.**

### Driver commands

| Command | Effect |
|---|---|
| `goto <path\|url>` | Navigate (paths resolve against `UI_URL`), then wait 700ms for React to mount |
| `ls` | List every input/button/link/select with usable selectors — **start here** |
| `fill <selector> <value>` | Fill a field. **Quote the selector** if it contains spaces: `fill 'input[placeholder="Email"]' fede@example.com`. The sell search is a MUI Autocomplete — fill it via `fill input.MuiAutocomplete-input bolt` |
| `click <selector>` | Click, then wait 700ms |
| `clicktext <text>` | Click by visible text — the nav links have no stable ids |
| `text [selector]` | innerText of `body` (or a selector) |
| `wait <selector>` / `waitms <n>` | Wait for an element / a duration |
| `shot <name>` | Full-page screenshot to `shots/<name>.png` |
| `eval <js>` | Evaluate in the page, returns JSON |
| `token <value>` | Write `localStorage.mghsinglesAdminToken` — skips the login form |
| `console` | Buffered console + `pageerror` output |
| `net` | Requests that failed or returned ≥400 |
| `quit` | Exit early |

Set `HEADFUL=1` to watch the browser. Lines starting with `#` are comments.
The driver exits non-zero if any command failed.

Skipping the login form — **no password needed**. A token is just a row in the
`login` table, so insert one for the player you want, use it, and delete it at
the end (verified: `admin/me` answers 200 for an owner token minted this way):

```bash
TOK="skilltoken$RANDOM$RANDOM"
psql -d mghsingles -qc "INSERT INTO login (playerid, token, date) \
  SELECT id, '$TOK', now() FROM player WHERE email='fede@example.com';"
UI_URL=http://localhost:3102 node .claude/skills/run-mghsingles-admin/driver.mjs <<EOF
goto /
token $TOK
goto /sell
waitms 2000
shot sell
EOF
psql -d mghsingles -qc "DELETE FROM login WHERE token='$TOK';"
```

With a real password, `POST /oauth` works too — the body field is `email`:

```bash
TOK=$(curl -s -X POST http://localhost:3101/oauth -H 'Content-Type: application/json' \
  -d '{"email":"fede@example.com","password":"fede1234"}' \
  | node -pe 'JSON.parse(require("fs").readFileSync(0,"utf8")).token')
```

## Run (human path)

```bash
npm start
```

Same `react-scripts start` as above with CRA's defaults: opens a real browser at
`http://localhost:3000` and expects the API on `:3101` (from `.env.development`).
Note that **the customer UI defaults to the same port** — run only one of them
without a `PORT` override.

## Gotchas

- **Every interactive element is MUI.** Buttons, text fields, selects,
  checkboxes, radios, chips and the nav bar all come from `@mui/material`, themed
  in `src/theme.js`. Two consequences when driving it:

  - **Class names are MUI's**, e.g. `MuiButton-root MuiButton-contained ...`,
    plus any `className` the component passes through. The only hook still
    passed as `className` is `button.login`; the old `button.search` is gone —
    the sell search submit is `form.sellSearch button[type=submit]`. Anything
    else, run `ls` and read the real classes rather than guessing.
  - **Selectors for the fields.** Login is by email now:
    `input[placeholder="Email"]` and `input[placeholder="Contraseña"]` (note
    the accented `ñ`). The card-name search is a MUI `Autocomplete`
    (`src/elementos/CardNameAutocomplete.js`), so target its input by class:
    `input.MuiAutocomplete-input` — do not rely on the placeholder selector
    for it. Selects are `TextField select` with `SelectProps={{native: true}}`,
    so they are still real `<select>` elements with `<option>` children and
    `fill` works on them.

  Do NOT restyle a button by editing CSS — set the MUI props (`variant`,
  `color`, `size`) or change the theme. The old `.dark` / `.light` / `.orange`
  classes are gone, and the global `button {}` and `input, select {}` rules in
  `App.css` were removed because they fought the components.

- **`/storage` shows every container and the shop's half of the lifecycle.** A
  customer's container carries a state badge (`En venta`, `Retirado por el
  dueño`, `Entregado`, `Lo está trayendo`) and the moves the shop may make from
  it, drawn from the `cando` array the API returns. Only two exist: taking
  delivery of one the customer is bringing in, and handing over one they
  retired — plus cancelling a retirement. A `released` container offers nothing
  at all, not even rename or delete: it is physically in the customer's living
  room, so the API refuses those too.

  "Entregar al dueño" pops an `alert` listing copies that stay behind because
  they are already in a buyer's pick-up bag. Stub `window.alert` before clicking
  it headless, then read the buffer:

  ```
  eval window.__alerts = []; window.alert = (m) => window.__alerts.push(m); window.confirm = () => true; 'ok'
  clicktext Entregar al dueño
  eval window.__alerts
  ```

- **The localStorage key differs from the customer app**: `mghsinglesAdminToken`,
  not `mghsinglesToken` (`.env` → `REACT_APP_LS_LOGIN_TOKEN`). The two apps
  therefore keep independent sessions in one browser profile — but see the
  single-token gotcha below, the *API* does not.

- **A `customer`-role player is bounced silently back to `/login`.**
  `POST /oauth` succeeds for any valid user, then `GET /admin/me` 403s and the
  app returns to the login form with **no error message** — it just looks like
  the click didn't register. The tell is `403 GET /admin/me` in `net` output.
  Check roles with
  `psql -d mghsingles -c "SELECT username,email,role FROM player;"`

  To exercise this path deliberately, mint a token for a customer (e.g.
  `ana@example.com`) with the SQL insert above — verified: `admin/me` answers
  403 for it while `player/me` answers 200.

- **`goto /` while unauthenticated lands on `/login`**, so a bare `goto /` in a
  driver script is a fine way to get to the login form.

- **`ls` before you write selectors.** The login button is `button.login`; the
  sell search submit is `form.sellSearch button[type=submit]`. Inputs have no
  `name` and only MUI's generated `id`s — use the placeholders
  (`input[placeholder="Email"]`, `input[placeholder="Contraseña"]` — note the
  accented `ñ`) or, for the card search, `input.MuiAutocomplete-input`.

- **Login navigates to `/home`, which is not in `Router.js`.** It falls through
  the `*` route to `Home`, the same component as `/`.

- **A `401 GET /player/me` on every page load is normal** — the header probes it
  unauthenticated to decide which menu to render.

- **The menu is Vender / Pedidos / Contenedores / Precios / Usuarios / Cuenta.**
  The old `Pagar` page is gone. Routes: `/sell`, `/orders`, `/storage` (+
  `/storage/:id`), `/pricing`, `/users`, `/account`; everything else falls
  through to `Home`. The sell search suggests names from
  `GET card/names?q=...&stock=1` (stock only) and every admin page probes
  `admin/me`.

- **One bad field blanks the entire page.** There is no error boundary, so a
  render-time `TypeError` in one card unmounts the whole route and you get a
  white screen with no message. Run `console` to see the real cause. The sell
  components read `card.cardsetcode`, not `card.cardset`.

- **Sessions coexist now.** The API used to honour only the newest token per
  player; `middleware/authentication.js` now accepts any token that exists in
  the `login` table, so the admin app, the customer app and an injected psql
  token can all be live as the same player at once.

- **Verified working end to end (2026-09-22):** login by email, `/home`,
  `/sell` (autocomplete fill + `Buscar`), `/account`, and the psql
  token-injection path.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `Error: listen EADDRINUSE :::3000` | `BROWSER=none PORT=3102 npx react-scripts start` |
| Driver: `Chromium distribution 'chrome' is not found` | Install Google Chrome, or set `channel` in `driver.mjs` |
| `Cannot find module 'playwright-core'` | `cd .claude/skills/run-mghsingles-admin && npm install` |
| Login click seems ignored, URL stays `/login` | Player's `role` is `customer` — check `SELECT email,role FROM player;` and log in as `fede@example.com` (owner) or `lucia@example.com` (staff) |
| Blank page, `net` shows `ECONNREFUSED :3101` | API isn't running, or `REACT_APP_API_URL` points at the wrong port |
| Login does nothing, `net` shows `404 POST /oauth` | `REACT_APP_API_URL` unset — CRA bakes it in **at start time**, so restart the dev server after changing it |
| You're looking at an orange page | That's the customer UI on another port; the admin UI is dark blue |
| White page, `text` returns nothing | Render-time error; run `console` to see it (no error boundary) |
