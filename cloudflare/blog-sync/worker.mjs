import { refreshShopSnapshot } from '../../lib/shop-cache.mjs';
import { refreshSnapshot } from '../../lib/blog-cache.mjs';
export default {
  async scheduled(_controller, env) {
    // Let failures reach Cloudflare's Cron history; the previous KV value is retained.
    const results = await Promise.allSettled([refreshSnapshot(env.BLOG_CACHE), refreshShopSnapshot(env.BLOG_CACHE)]);
    if (results.some(r => r.status === 'rejected')) throw Error('One or more content caches failed to refresh; last successful snapshots retained');
    console.log('Blog and shop caches refreshed');
  },
  fetch() {
    return new Response('Not found', { status: 404 });
  },
};
