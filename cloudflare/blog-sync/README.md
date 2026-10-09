# Blog and shop: Cron → KV → Pages Functions

`worker.mjs` reads https://blog.zgatri.com/rss.xml every 12 hours, selects the three newest valid articles, and saves them under `latest-posts:v1` in the `BLOG_CACHE` KV namespace. It uses ETag/Last-Modified to avoid downloading an unchanged feed. A successful 304 advances the checked time. Failures leave the previous value intact, without an expiration.

The main site's `/api/latest-posts` Pages Function reads that namespace. The browser renders native article links in the notebook, with an initial snapshot in `dist/blog-latest.json` for offline or API failure. The browser checks the API again while the notebook is visible; that does **not** fetch RSS for each visitor. API responses cache at the edge for five minutes.

The same scheduled Worker independently reads the shop's public `/api/v1/public/categories` and paginated `/api/v1/public/products` endpoints. It counts listed products (including sold-out listings), omits empty categories, groups AI account/subscription listings separately from digital services, follows descending shop `sort_order` within each group, and saves at most three categories per group (six total) under `shop-categories:v1` in the same namespace. Names use the store's Chinese label; icons are restricted to HTTPS shop category-upload URLs. Missing icons use a neutral line icon. The front end always lays out six slots; shortages show a non-clickable “补货中 / COMING SOON” slot. A successfully empty catalogue replaces the cache with zero categories; failed, partial, or inconsistent fetches retain the previous snapshot. `/api/shop-categories` reads the cache; `dist/shop-categories.json` supplies the initial fallback. No credentials or private shop endpoints are used. Category icon images retain their original shop URL and normal image caching.

## Production setup — after approving publication

1. Create a KV namespace named `zgatri-blog-cache` using `npx wrangler kv namespace create zgatri-blog-cache`. Retain the returned namespace id; it is not a credential.
2. Copy `wrangler.example.toml` to `wrangler.toml` in this directory and insert that id. The local config and its dummy id must never be used for publication.
3. Refresh both initial snapshots with `npm run refresh:blog` and `npm run refresh:shop` from the repository root. Seed the new namespace before publishing the page:
   ```sh
   npx wrangler kv key put latest-posts:v1 --path dist/blog-latest.json --namespace-id YOUR_NAMESPACE_ID --remote
   npx wrangler kv key put shop-categories:v1 --path dist/shop-categories.json --namespace-id YOUR_NAMESPACE_ID --remote
   ```
4. In Pages project **zgatri-www**, add a production KV binding named **BLOG_CACHE**, selecting the same namespace. Set the build environment's Node version to 22 or newer, ensure dependencies are installed from `package-lock.json`, and retain build command `exit 0` and output directory `dist`. Pages Git integration bundles the root `functions/` directory.
5. Deploy the scheduled Worker from the repository root:
   ```sh
   npx wrangler deploy --config cloudflare/blog-sync/wrangler.toml
   ```
   The schedule is 00:00 / 12:00 UTC, or **08:00 / 20:00 Beijing time**. `workers_dev=false`; no public refresh endpoint is exposed.
6. Publish the reviewed main-site changes. Bind preview environments to a separate test namespace if preview data must be isolated.
7. Confirm the Pages deployment succeeded, `/api/latest-posts` returns the real three articles, clicks navigate to the correct pages, and `/api/shop-categories` returns populated categories and the Worker's Cron history records success. New Cron triggers may take up to 15 minutes to propagate. Do not call local emulation evidence a production deployment.

If the project later adopts a root Wrangler production config, download the existing Pages settings first with `wrangler pages download config`; preserve its existing bindings, then add BLOG_CACHE there.

## Local verification

- `npm test`: ordering, validation, deduplication, 304 handling, successful write, retained last-good cache, API response, and scheduled handler failures.
- `npm run dev`: local disk-backed cache under `.cache/`, initial snapshot, 12-hour refresh while the server runs, and the same API handler.
- Worker runtime:
  ```sh
  npx wrangler dev --config cloudflare/blog-sync/wrangler.local.toml --local --test-scheduled --persist-to .wrangler/blog-cache-local
  curl 'http://localhost:8787/cdn-cgi/local/scheduled?format=json'
  ```
- To verify Pages reads the same local KV, temporarily copy `wrangler.pages.local.toml` to the root `wrangler.toml`, then run `wrangler pages dev dist --port 4182 --persist-to .wrangler/blog-cache-local`. Remove this temporary root config afterward. Do not overwrite an existing production config.

References: [Cron](https://developers.cloudflare.com/workers/configuration/cron-triggers/), [Pages bindings](https://developers.cloudflare.com/pages/functions/bindings/), [KV reads](https://developers.cloudflare.com/kv/api/read-key-value-pairs/).

Grouping uses the category brand and public product titles: standalone mobile-verification/SMS/assistance listings go to digital services; AI account listings remain AI subscriptions even when their login uses a verification code. Unknown brands default to digital services. Each group has its own three slots and replenishment placeholders; surplus categories never fill the wrong group. Card links open a new tab.
