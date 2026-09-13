# https://poe.re  ·  https://poe2.re

This is a single monorepo hosting two separate sites:

- **poe.re** — Path of Exile 1 regex tool
- **poe2.re** — Path of Exile 2 regex tool

The `poe/` and `poe2/` directories are independent Vite apps. Reusable
components, utilities, core helpers, styles and types live in `shared/`.
Game-specific generated data stays with its app. Each app builds to its own
output and deploys to its own domain.

## Path of Exile 1  (poe.re)

A tool for generating vendor search strings. With no false positives matches and with query shortening, so you can fit more stuff in to your search!

![preview](poe/public/preview.png)

### Supported pages
- Vendor
- Map mods
- Boat (Lake of Kalandra)
- Items (inc. flasks)
- Expedition
- Heist
- Bestiary
- Scarabs
- Tattoos
- Runegrafts
- Jewels

## Path of Exile 2  (poe2.re)

### Supported pages
- Vendor
- Waystones
- Tablets
- Relics
- Items (rare item crafting)

## Reporting a bug

If you encounter a bug or have a suggestion:
1. Go to the [Issues](https://github.com/veiset/poe.re/issues) tab.
2. Open a "New Issue".
3. Describe the problem and provide steps to reproduce it.

## Contributing

Contributions are always welcome. To keep things organized:

* **Join the discord server:** https://discord.gg/T8BzKnatY6
* **Discuss first:** It's best to discuss ideas or planned changes on discord before starting the work.
* **Check Issues:** Take a look at the [open issues](https://github.com/veiset/poe.re/issues) to see what needs help or to make sure a topic isn't already being worked on.
* **Fork and PR:** Once everything is ready, fork the project and submit a pull request.

## Development Setup

This project uses [pnpm](https://pnpm.io/) and [Vite](https://vitejs.dev/).

```bash
# Clone the repo
git clone git@github.com:veiset/poe.re.git
cd poe.re

# Install dependencies
pnpm install

# Develop poe.re (Path of Exile 1)
pnpm dev

# Develop poe2.re (Path of Exile 2)
pnpm dev:poe2

# Run tests
pnpm test

# Type-check
pnpm typecheck

# Build BOTH apps -> dist/poe and dist/poe2
pnpm build

# Build a single app
pnpm build:poe      # -> dist/poe
pnpm build:poe2     # -> dist/poe2
```

## Cross-domain links

The two apps link to each other externally. Override the target domains with
env vars if you run a staging setup:

```env
VITE_POE1_URL=https://poe.re
VITE_POE2_URL=https://poe2.re
```

## Refreshing trade stat mappings

Trade search buttons rely on stat-ID mappings against the official trade APIs. To refresh them, run:

```bash
pnpm run fetch-trade-stats
```

This updates:
- `poe/src/generated/mapmods/trade/TradeStatIdMatching.json` (PoE1)
- `poe2/public/generated/trade/WaystoneTradeStatIds.json` (PoE2)
- `poe2/public/generated/trade/TabletTradeStatIds.json` (PoE2)

## Deployment (Cloudflare)

The apps deploy through **Cloudflare Pages native Git integration**, one Pages
project per domain. Deployment does not use GitHub Actions. A scheduled
Cloudflare Worker refreshes economy and league data into a public R2 bucket
every hour.

### Cloudflare Pages projects

| Project | Build command | Publish directory | Domain |
|---------|---------------|-------------------|--------|
| poe-re  | `pnpm build:poe`  | `dist/poe`  | poe.re   |
| poe2-re | `pnpm build:poe2` | `dist/poe2` | poe2.re  |

Configure both Pages projects against this repository with the build commands
and publish directories above. Set `VITE_POE1_URL`, `VITE_POE2_URL`, and
`VITE_ECONOMY_URL` in each Pages project's environment when overriding the
defaults.

### Pseudonymous usage events

Both Pages projects deploy `functions/api/usage-event.ts` as the same-origin
`POST /api/usage-event` endpoint. The `_routes.json` emitted by each Vite build
limits Functions invocations to that route, leaving all site and asset requests
static. The endpoint accepts only a small, allow-listed JSON schema from its own
origin and forwards it through the `USAGE_TRACKER` service binding to the
non-public `poe-re-usage-tracker` Worker. Deploy that Worker and configure both
bindings as described in [`workers/usage-tracker/README.md`](workers/usage-tracker/README.md).

The Worker enables persisted Observability logs at full sampling and logs one
flat structured object per event. In its Observability Query Builder, filter on
`logType = "usage_event"`, use
Count as the visualization, and group by `country`, `event`, `game`, or any of
the event fields (`action`, `profileName`, `profileCount`, `favoriteType`,
`favoriteCount`, `ageBucket`, `page`, `language`, `previousLanguage`, `reason`,
`operator`, and `memberCount`). `country` is populated by
Cloudflare from the request metadata; the Function does not store or derive an
IP address. Logs are retained according to the Cloudflare Workers plan's
Workers Logs retention period.

The Pages endpoint is necessarily public because browsers call it; the logging
Worker itself has no public route. Same-origin,
method, content-type, size, and schema validation prevent ordinary cross-site
and log-injection abuse, but headers can be forged by non-browser clients. Add
a Cloudflare rate-limiting rule for `POST /api/usage-event` on both hostnames if
abuse becomes visible; Turnstile is the stronger follow-up if rate limiting is
not sufficient.

### Cloudflare Workers

Deploy the scheduled economy refresher:

```bash
cd workers/economy-fetcher && npm run deploy
```

The worker writes the filtered PoE1 and PoE2 league lists to `leagues.txt` and
`poe2-leagues.txt` in the R2 bucket. The frontend reads those files through
the CDN-backed `VITE_ECONOMY_URL` endpoint.

### Economy storage

The R2 bucket, `economy.poe.re` custom domain, CORS policy, and CDN cache rule
are managed in [`infra/cloudflare/`](infra/cloudflare/README.md).
