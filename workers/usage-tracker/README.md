# Usage tracker

This Worker is the private, centralized log sink for usage events from the
`poe-re` and `poe2-re` Pages projects. It has no route and `workers_dev` is
disabled, so it can only be reached through an explicit Cloudflare service
binding.

Deploy it before deploying the Pages Functions:

```bash
npm install
npm run deploy
```

In both Pages projects, add a service binding in production and preview:

- Variable name: `USAGE_TRACKER`
- Service: `poe-re-usage-tracker`

Repeat the binding for the preview environment if preview analytics should be
accepted. Redeploy both Pages projects after adding the binding.

Events are available under **Workers & Pages → poe-re-usage-tracker →
Observability**. Invocation logs are disabled to avoid storing redundant HTTP
request records; only the allow-listed structured usage object is logged.
