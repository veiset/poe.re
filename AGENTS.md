# AGENTS.md

poe.re (Path of Exile 1, `poe/`) and poe2.re (Path of Exile 2, `poe2/`) are two Vite apps in one repo, with shared code in `shared/`, imported as `@shared/*`, `@poe/*` and `@poe2/*`. `workers/` and `infra/` hold the Cloudflare workers and Terraform, each with a README. Setup, commands and deployment are in [README.md](README.md). A new worktree has no `node_modules`: run `pnpm install` first.

## Keep changes small

Solve the problem at hand with the smallest change that does it, and don't refactor or generalize code the fix doesn't need. A minor breaking change, such as an edge case that's no longer handled, is better than new abstractions, options or compatibility code to avoid it. Say in the PR what breaks, so the reviewer can decide.

## Generated data

- The game data (mods, items, gems, maps, waystones, tablets, relics, trade ids) is generated outside this repo, by the private poe-item-gen, and published to https://data.poe.re. The apps load it from there at runtime; see [Generated data](README.md#generated-data) in the README.
- To find a file: https://data.poe.re/current.json names each game's current patch (`current.poe1.patch`, `current.poe2.patch`), and `https://data.poe.re/generated/<game>/<patch>/SHA256SUMS` lists that patch's files, e.g. https://data.poe.re/generated/poe1/3.29.3.3/SHA256SUMS. A file is at `https://data.poe.re/generated/<game>/<patch>/<path>`.
- Every request to https://data.poe.re, from curl, a script or any other tool, must send a User-Agent that names the tool, its version and its URL, so the traffic can be identified when something goes wrong: `<name>/<version> (<url>)`, e.g. `poe.re/1.0 (https://poe.re)` or `mytool/1.4.0 (https://mytool.example.com)`. A tool with no URL says where it runs instead, such as local, terminal or local app. For example:
  - curl in a terminal: `curl -A "mytool/1.0 (terminal)" https://data.poe.re/current.json`, not curl's default `curl/8.5.0`.
  - A Node script, such as `pnpm fetch-typedefs`: `fetch(url, {headers: {"User-Agent": "fetch-typedefs/1.0 (terminal)"}})`.
  - A dev server on your machine: `mytool/1.0 (local)`.
  - A desktop app: `mytool/1.0 (local app)`.
  - A web page: the browser sends its own User-Agent, and it can't be set reliably from `fetch`.
- `<app>/generated` and `<app>/public/generated` are older copies: the local fallback, test fixtures, and read by other projects. Don't edit them by hand, and don't read the JSON in full (`poe/generated` is 124 MB).

## Trade ids

- The trade ids map mod ids to the official trade API's stat ids, e.g. `"-2064669900": "explicit.stat_4150353141"`. They're generated data, in each patch's `trade-ids/`: https://data.poe.re/generated/poe1/3.29.3.3/SHA256SUMS lists `trade-ids/Generated.TradeIds.Map.json`, at https://data.poe.re/generated/poe1/3.29.3.3/trade-ids/Generated.TradeIds.Map.json.
- PoE1 has `Generated.TradeIds.Map.json`, and PoE2 `Generated.TradeIds.Waystone.json` and `Generated.TradeIds.Tablet.json`. The apps load the `.min.json` of each. Their type is `TradeIds` in `shared/typedefs/TradeIds.ts`.

## Typedefs

- The TypeScript types for the generated data are published with it: https://data.poe.re/typedefs/SHA256SUMS lists the files, and each is at `https://data.poe.re/typedefs/<path>`, e.g. https://data.poe.re/typedefs/poe1/MapMods.ts. Each file starts with a comment naming the data files it types.
- `shared/typedefs` is a copy of them, and only changes through `pnpm fetch-typedefs`: it downloads the files in that list and removes the ones no longer in it. Don't edit it by hand, and commit the result with the code that needs it.

## Updating the generated data

- If the data is wrong, e.g. a missing mod, a bad translation or a mod's regex, don't fix or work around it here. Say in the issue or PR which file and entry are wrong, and leave the fix to the generator.
- Never touch `poe/src/generated/`, even when its data is wrong; report it as above.
- Mod ids can change when the data is regenerated, and did in #536 and #549. Code that saves or matches mods by id has to expect that.

## Saved profiles

Profiles and favorites are saved in localStorage and migrated by version at startup. A change to what is already saved needs a migration when losing it would matter to users, such as their selected mods or favorites. Small breaks to settings, such as one that resets to its default, are fine when they avoid a lot of complexity in the migration; say what breaks in the PR. A new setting with a default needs no migration. How to add and verify one: [shared/migration/README.md](shared/migration/README.md).

## Regexes and the in-game search

- The search drops a leading space in a quoted term: `" 24"` matches the same as `"24"`. Use `\s` when a term must start with whitespace (#559).
- The search matches all text on the item, not just the mod. A regex must not match the item's other lines, such as the map's tooltip or the waystone's properties (#555, #556).

## Tests and checks

- `pnpm test` runs every test. `npx vitest run <name>` runs one file; `pnpm test -- <path>` still runs all of them.
- Typecheck with `npx tsc -b --force`. `pnpm typecheck` is incremental and its error count varies between runs. Master has no errors.
- Don't assert global values of the game data, such as the number of mods: a valid data update changes them. Assert properties and specific examples.

## Running the app

- Two dev servers of the same app in one checkout share its Vite cache (`node_modules/.vite/poe` or `poe2`) and break React ("Invalid hook call"). Run one at a time, or restart with `--force`.
- Stopping a background `pnpm dev` can leave Vite running on port 3000, and the next dev server starts on 3001. Kill the old one by its command line.
- Each PR gets a Cloudflare Pages preview, linked in the "Deploying ..." comment on the PR.

## Verifying a change

Besides the tests, compare the change with the live site (poe.re or poe2.re), which runs master. Load the same localStorage into the live site and the local run (or the PR's preview), do the same on each page, and diff the localStorage of the two, and the regex each shows. Only what the change is meant to change should differ. How to copy localStorage between the sites, also headless with playwright-core, is in [Verifying a migration](shared/migration/README.md#verifying-a-migration).

## User reports

Reports can be wrong: a mistyped or partly copied regex, the wrong language, or a misunderstanding of how the in-game search works. Reproduce the problem on the current site before changing anything. If it's a user error, say what went wrong instead of changing the code.

## GitHub

- `gh issue view`, `gh pr edit` and other gh commands that use GraphQL fail here with "Projects (classic) is being deprecated". Use REST: `gh api repos/veiset/poe.re/issues/<n>`, `.../issues/<n>/comments`, and `gh api -X PATCH repos/veiset/poe.re/pulls/<n> -F body=@<file>`. `gh pr create` works.
- Commits use Conventional Commits with a scope, e.g. `fix(poe2): …`, `refactor(poe): …`, `feat(data): …`. PRs are squash-merged, so the PR title becomes the commit and uses the same format.
- A PR description has three sections: `## The problem`, `## The fix` and `## Verification`. Keep it short enough for a person to read at a glance: a few lines or bullets each, without the per-file detail the diff already shows.
