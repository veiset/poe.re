# Economy fetcher

Scheduled Cloudflare Worker that gets every PoE1 and PoE2 league from the Trade
APIs and writes them to `leagues.txt` and `poe2-leagues.txt` in the
`poe-economy` R2 bucket. It also writes poe.ninja Expedition, beast, tattoo,
runegraft, scarab, and divination card data. Each economy object key includes its league,
preventing one league refresh from replacing another.

The hourly schedule and R2 binding are configured in `wrangler.toml`.

```bash
cd workers/economy-fetcher
npm install
npm run deploy
```
