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

* **Join the discord server:** https://discord.gg/AR9AxAYudF
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
